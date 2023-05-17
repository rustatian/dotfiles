/* eslint-disable @typescript-eslint/no-explicit-any */
/*---------------------------------------------------------
 * Copyright 2021 The Go Authors. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

import { ChildProcess, ChildProcessWithoutNullStreams, spawn } from 'child_process';
import stream = require('stream');
import vscode = require('vscode');
import { OutputEvent, TerminatedEvent } from 'vscode-debugadapter';
import getPort = require('get-port');
import path = require('path');
import * as fs from 'fs';
import * as net from 'net';
import { Logger, logVerbose, TimestampedLogger } from './goLogging';
import { DebugProtocol } from 'vscode-debugprotocol';
import { getWorkspaceFolderPath } from './util';
import { getEnvPath, getBinPathFromEnvVar } from './utils/pathUtils';

export function activate(ctx: vscode.ExtensionContext) {
	const debugOutputChannel = vscode.window.createOutputChannel('Go Debug');
	ctx.subscriptions.push(debugOutputChannel);

	const factory = new GoDebugAdapterDescriptorFactory(debugOutputChannel);
	ctx.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('go', factory));
	if ('dispose' in factory) {
		ctx.subscriptions.push(factory);
	}

	const tracker = new GoDebugAdapterTrackerFactory(debugOutputChannel);
	ctx.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory('go', tracker));
	if ('dispose' in tracker) {
		ctx.subscriptions.push(tracker);
	}
}

class GoDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
	constructor(private outputChannel?: vscode.OutputChannel) {}

	public createDebugAdapterDescriptor(
		session: vscode.DebugSession,
		executable: vscode.DebugAdapterExecutable | undefined
	): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		if (session.configuration.debugAdapter === 'dlv-dap') {
			return this.createDebugAdapterDescriptorDlvDap(session.configuration);
		}
		return executable;
	}

	public async dispose() {
		console.log('GoDebugAdapterDescriptorFactory.dispose');
	}

	private async createDebugAdapterDescriptorDlvDap(
		configuration: vscode.DebugConfiguration
	): Promise<vscode.ProviderResult<vscode.DebugAdapterDescriptor>> {
		const logger = new TimestampedLogger(configuration.trace, this.outputChannel);
		logger.debug(`Config: ${JSON.stringify(configuration)}\n`);
		if (configuration.port) {
			const host = configuration.host ?? '127.0.0.1';
			logger.info(`Connecting to DAP server at ${host}:${configuration.port}\n`);
			return new vscode.DebugAdapterServer(configuration.port, host);
		}
		const d = new DelveDAPOutputAdapter(configuration, logger);
		return new vscode.DebugAdapterInlineImplementation(d);
	}
}

class GoDebugAdapterTrackerFactory implements vscode.DebugAdapterTrackerFactory {
	constructor(private outputChannel: vscode.OutputChannel) {}

	createDebugAdapterTracker(session: vscode.DebugSession) {
		const level = session.configuration?.trace;
		if (!level || level === 'off') {
			return null;
		}
		const logger = new TimestampedLogger(session.configuration?.trace || 'off', this.outputChannel);
		let requestsSent = 0;
		let responsesReceived = 0;
		return {
			onWillStartSession: () =>
				logger.debug(`session ${session.id} will start with ${JSON.stringify(session.configuration)}\n`),
			onWillReceiveMessage: (message: any) => {
				logger.trace(`client -> ${JSON.stringify(message)}\n`);
				requestsSent++;
			},
			onDidSendMessage: (message: any) => {
				logger.trace(`client  <- ${JSON.stringify(message)}\n`);
				responsesReceived++;
			},
			onError: (error: Error) => logger.error(`error: ${error}\n`),
			onWillStopSession: () => {
				if (
					session.configuration.debugAdapter === 'dlv-dap' &&
					session.configuration.mode === 'remote' &&
					requestsSent > 0 &&
					responsesReceived === 0 // happens when the rpc server doesn't understand DAP
				) {
					const err =
						'Expected to connect to external `dlv --headless` server @ v1.7.3 or later via DAP. Older versions fail with "error layer=rpc rpc:invalid character \'C\' looking for beginning of value" logged to the terminal.\n';
					logger.warn(err);
					vscode.window.showErrorMessage(err);
				}
				logger.debug(`session ${session.id} will stop\n`);
			},
			onExit: (code: number | undefined, signal: string | undefined) =>
				logger.info(`debug adapter exited: (code: ${code}, signal: ${signal})\n`)
		};
	}

	dispose() {}
}

const TWO_CRLF = '\r\n\r\n';

// Proxies DebugProtocolMessage exchanges between VSCode and a remote
// process or server connected through a duplex stream, after its
// start method is called.
export class ProxyDebugAdapter implements vscode.DebugAdapter {
	private messageEmitter = new vscode.EventEmitter<vscode.DebugProtocolMessage>();
	// connection from/to server (= dlv dap)
	private readable?: stream.Readable;
	private writable?: stream.Writable;
	protected logger?: Logger;
	private terminated = false;

	constructor(logger: Logger) {
		this.logger = logger;
		this.onDidSendMessage = this.messageEmitter.event;
	}

	// Implement vscode.DebugAdapter (VSCodeDebugAdapter) interface.
	// Client will call handleMessage to send messages, and
	// listen on onDidSendMessage to receive messages.
	onDidSendMessage: vscode.Event<vscode.DebugProtocolMessage>;
	async handleMessage(message: vscode.DebugProtocolMessage): Promise<void> {
		await this.sendMessageToServer(message);
	}

	// Methods for proxying.
	protected sendMessageToClient(msg: vscode.DebugProtocolMessage) {
		this.messageEmitter.fire(msg);
	}
	protected sendMessageToServer(message: vscode.DebugProtocolMessage): void {
		const json = JSON.stringify(message) ?? '';
		if (this.writable) {
			this.writable.write(
				`Content-Length: ${Buffer.byteLength(json, 'utf8')}${TWO_CRLF}${json}`,
				'utf8',
				(err) => {
					if (err) {
						this.logger?.error(`error sending message: ${err}`);
						this.sendMessageToClient(new TerminatedEvent());
					}
				}
			);
		} else {
			this.logger?.error(`stream is closed; dropping ${json}`);
		}
	}

	public async start(readable: stream.Readable, writable: stream.Writable) {
		if (this.readable || this.writable) {
			throw new Error('start was called more than once');
		}
		this.readable = readable;
		this.writable = writable;
		this.readable.on('data', (data: Buffer) => {
			this.handleDataFromServer(data);
		});
		this.readable.once('close', () => {
			this.readable = undefined;
		});
		this.readable.on('error', (err) => {
			if (this.terminated) {
				return;
			}
			this.terminated = true;

			if (err) {
				this.logger?.error(`connection error: ${err}`);
				this.sendMessageToClient(new OutputEvent(`connection error: ${err}\n`, 'console'));
			}
			this.sendMessageToClient(new TerminatedEvent());
		});
	}

	async dispose() {
		this.writable?.end(); // no more write.
	}

	private rawData = Buffer.alloc(0);
	private contentLength = -1;
	// Implements parsing of the DAP protocol. We cannot use ProtocolClient
	// from the vscode-debugadapter package, because it's not exported and
	// is not meant for external usage.
	// See https://github.com/microsoft/vscode-debugadapter-node/issues/232
	private handleDataFromServer(data: Buffer): void {
		this.rawData = Buffer.concat([this.rawData, data]);

		// eslint-disable-next-line no-constant-condition
		while (true) {
			if (this.contentLength >= 0) {
				if (this.rawData.length >= this.contentLength) {
					const message = this.rawData.toString('utf8', 0, this.contentLength);
					this.rawData = this.rawData.slice(this.contentLength);
					this.contentLength = -1;
					if (message.length > 0) {
						const rawMessage = JSON.parse(message);
						this.sendMessageToClient(rawMessage);
					}
					continue; // there may be more complete messages to process
				}
			} else {
				const idx = this.rawData.indexOf(TWO_CRLF);
				if (idx !== -1) {
					const header = this.rawData.toString('utf8', 0, idx);
					const lines = header.split('\r\n');
					for (const line of lines) {
						const pair = line.split(/: +/);
						if (pair[0] === 'Content-Length') {
							this.contentLength = +pair[1];
						}
					}
					this.rawData = this.rawData.slice(idx + TWO_CRLF.length);
					continue;
				}
			}
			break;
		}
	}
}

// DelveDAPOutputAdapter is a ProxyDebugAdapter that proxies between
// VSCode and a dlv dap process spawned and managed by this adapter.
// It turns the process's stdout/stderrr into OutputEvent.
export class DelveDAPOutputAdapter extends ProxyDebugAdapter {
	constructor(private configuration: vscode.DebugConfiguration, logger: Logger) {
		super(logger);
	}

	private connected?: Promise<{ connected: boolean; reason?: any }>;
	private dlvDapServer?: ChildProcess;
	private socket?: net.Socket;
	private terminatedOnError = false;

	protected sendMessageToClient(message: vscode.DebugProtocolMessage) {
		const m = message as any;
		if (m.type === 'request') {
			logVerbose(`do not forward reverse request: dropping ${JSON.stringify(m)}`);
			return;
		}

		super.sendMessageToClient(message);
	}

	protected async sendMessageToServer(message: vscode.DebugProtocolMessage): Promise<void> {
		const m = message as any;
		if (m.type === 'response') {
			logVerbose(`do not forward reverse request response: dropping ${JSON.stringify(m)}`);
			return;
		}

		if (!this.connected) {
			if (m.type === 'request' && m.command === 'initialize') {
				this.connected = this.launchDelveDAP();
			} else {
				this.connected = Promise.resolve({
					connected: false,
					reason: `the first message must be an initialize request, got ${JSON.stringify(m)}`
				});
			}
		}
		const { connected, reason } = await this.connected;
		if (connected) {
			super.sendMessageToServer(message);
			return;
		}
		const errMsg = `Couldn't start dlv dap:\n${reason}`;
		if (this.terminatedOnError) {
			this.terminatedOnError = true;
			this.outputEvent('stderr', errMsg);
			this.sendMessageToClient(new TerminatedEvent());
		}
		if (m.type === 'request') {
			const req = message as DebugProtocol.Request;
			this.sendMessageToClient({
				seq: 0,
				type: 'response',
				request_seq: req.seq,
				success: false,
				command: req.command,
				message: errMsg
			});
		}
	}

	async dispose(timeoutMS?: number) {
		// NOTE: OutputEvents from here may not show up in DEBUG CONSOLE
		// because the debug session is terminating.
		await super.dispose();
		if (!this.dlvDapServer) {
			return;
		}
		if (this.connected === undefined) {
			return;
		}
		this.connected = undefined;

		const dlvDapServer = this.dlvDapServer;
		this.dlvDapServer = undefined;
		if (!dlvDapServer) {
			return;
		}
		if (dlvDapServer.exitCode !== null) {
			this.logger?.info(
				`dlv dap process(${dlvDapServer.pid}) already exited (exit code: ${dlvDapServer.exitCode})`
			);
			return;
		}
		await new Promise<void>((resolve) => {
			if (timeoutMS === undefined || timeoutMS < 0) {
				timeoutMS = 1_000;
			}
			const exitTimeoutToken = setTimeout(() => {
				this.logger?.error(`dlv dap process (${dlvDapServer.pid}) isn't responding. Killing...`);
				dlvDapServer.kill('SIGINT'); // Don't use treekill but let dlv handle cleaning up the child processes.
			}, timeoutMS);
			dlvDapServer.on('exit', (code, signal) => {
				clearTimeout(exitTimeoutToken);
				if (code || signal) {
					this.logger?.error(
						`dlv dap process(${dlvDapServer.pid}) exited (exit code: ${code} signal: ${signal})`
					);
				}
				resolve();
			});
		});
	}

	private async launchDelveDAP() {
		try {
			const { dlvDapServer, socket } = await this.startDapServer(this.configuration);

			this.dlvDapServer = dlvDapServer;
			this.socket = socket;
			this.start(this.socket, this.socket);
		} catch (err) {
			return { connected: false, reason: err };
		}
		this.logger?.debug(`Running dlv dap server: pid=${this.dlvDapServer?.pid}\n`);
		return { connected: true };
	}

	protected outputEvent(dest: string, output: string, data?: any) {
		this.sendMessageToClient(new OutputEvent(output, dest, data));
	}

	async startDapServer(
		configuration: vscode.DebugConfiguration
	): Promise<{ dlvDapServer?: ChildProcess; socket: net.Socket }> {
		const log = (msg: string) => this.outputEvent('stdout', msg);
		const logErr = (msg: string) => this.outputEvent('stderr', msg);
		const logConsole = (msg: string) => {
			this.outputEvent('console', msg);
			// Some log messages generated after vscode stops the debug session
			// may not appear in the DEBUG CONSOLE. For easier debugging, log
			// the messages through the logger that prints to Go Debug output
			// channel.
			this.logger?.info(msg);
		};

		// If a port has been specified, assume there is an already
		// running dap server to connect to. Otherwise, we start the dlv dap server.
		const dlvExternallyLaunched = !!configuration.port;

		if (
			!dlvExternallyLaunched &&
			(configuration.console === 'integratedTerminal' || configuration.console === 'externalTerminal')
		) {
			return this.startDAPServerWithClientAddrFlag(configuration, logErr);
		}
		const host = configuration.host || '127.0.0.1';
		const port = configuration.port || (await getPort());

		const dlvDapServer = dlvExternallyLaunched
			? undefined
			: await spawnDlvDapServerProcess(configuration, host, port, log, logErr, logConsole);

		const socket = await new Promise<net.Socket>((resolve, reject) => {
			// eslint-disable-next-line prefer-const
			let timer: NodeJS.Timeout;
			const s = net.createConnection(port, host, () => {
				clearTimeout(timer);
				resolve(s);
			});
			timer = setTimeout(() => {
				reject('connection timeout');
				s?.destroy();
			}, 1000);
		});

		return { dlvDapServer, socket };
	}

	async startDAPServerWithClientAddrFlag(
		launchAttachArgs: vscode.DebugConfiguration,
		logErr: (msg: string) => void
	): Promise<{ dlvDapServer?: ChildProcessWithoutNullStreams; socket: net.Socket }> {
		// This is called only when launchAttachArgs.console === 'integratedTerminal' | 'externalTerminal' currently.
		const console = (launchAttachArgs as any).console === 'externalTerminal' ? 'external' : 'integrated';

		const { dlvArgs, dlvPath, dir, env } = getSpawnConfig(launchAttachArgs, logErr);

		// logDest - unlike startDAPServer that relies on piping log messages to a file descriptor
		// using --log-dest, we can pass the user-specified logDest directly to the flag.
		const logDest = launchAttachArgs.logDest;
		if (logDest) {
			dlvArgs.push(`--log-dest=${logDest}`);
		}

		dlvArgs.unshift(dlvPath);

		if (launchAttachArgs.asRoot === true && process.platform !== 'win32') {
			const sudo = getSudo();
			if (sudo) {
				dlvArgs.unshift(sudo);
			} else {
				throw new Error('Failed to find "sudo" utility');
			}
		}

		try {
			const port = await getPort();
			const rendezvousServerPromise = waitForDAPServer(port, 30_000);

			dlvArgs.push(`--client-addr=:${port}`);

			super.sendMessageToClient({
				seq: 0,
				type: 'request',
				command: 'runInTerminal',
				arguments: {
					kind: console,
					title: `Go Debug Terminal (${launchAttachArgs.name})`,
					cwd: dir,
					args: dlvArgs,
					env: env
				}
			});
			const socket = await rendezvousServerPromise;
			return { socket };
		} catch (err) {
			logErr(`Failed to launch dlv: ${err}`);
			throw new Error('cannot launch dlv dap. See DEBUG CONSOLE');
		}
	}
}

let sudoPath: string | null | undefined = undefined;
function getSudo(): string | null {
	if (sudoPath === undefined) {
		sudoPath = getBinPathFromEnvVar('sudo', getEnvPath(), false);
	}
	return sudoPath;
}

function waitForDAPServer(port: number, timeoutMs: number): Promise<net.Socket> {
	return new Promise((resolve, reject) => {
		// eslint-disable-next-line prefer-const
		let s: net.Server | undefined;
		const timeoutToken = setTimeout(() => {
			if (s?.listening) {
				s.close();
			}
			reject(new Error('timed out while waiting for DAP in reverse mode to connect'));
		}, timeoutMs);

		s = net.createServer({ pauseOnConnect: true }, (socket) => {
			logVerbose(
				`connected: ${port} (remote: ${socket.remoteAddress}:${socket.remotePort} local: ${socket.localAddress}:${socket.localPort})`
			);
			clearTimeout(timeoutToken);
			s?.close(); // accept no more connection
			socket.resume();
			resolve(socket);
		});
		s.on('error', (err) => {
			logVerbose(`connection error ${err}`);
			reject(err);
		});
		s.maxConnections = 1;
		s.listen(port);
	});
}

function spawnDlvDapServerProcess(
	launchAttachArgs: vscode.DebugConfiguration,
	host: string,
	port: number,
	log: (msg: string) => void,
	logErr: (msg: string) => void,
	logConsole: (msg: string) => void
): Promise<ChildProcess> {
	const { dlvArgs, dlvPath, dir, env } = getSpawnConfig(launchAttachArgs, logErr);
	// env does not include process.env. Construct the new env for process spawning
	// by combining process.env.
	const envForSpawn = env ? Object.assign({}, process.env, env) : undefined;

	dlvArgs.push(`--listen=${host}:${port}`);

	const onWindows = process.platform === 'win32';

	if (!onWindows) {
		dlvArgs.push('--log-dest=3');
	}

	const logDest = launchAttachArgs.logDest;
	if (typeof logDest === 'number') {
		logErr(`Using a file descriptor for 'logDest' (${logDest}) is not allowed.\n`);
		throw new Error('Using a file descriptor for `logDest` is not allowed.');
	}
	if (logDest && !path.isAbsolute(logDest)) {
		logErr(
			`Using a relative path for 'logDest' (${logDest}) is not allowed.\nSee https://code.visualstudio.com/docs/editor/variables-reference if you want workspace-relative path.\n`
		);
		throw new Error('Using a relative path for `logDest` is not allowed');
	}
	if (logDest && onWindows) {
		logErr(
			'Using `logDest` or `--log-dest` is not supported on windows yet. See https://github.com/golang/vscode-go/issues/1472.'
		);
		throw new Error('Using `logDest` on windows is not allowed');
	}

	const logDestStream = logDest ? fs.createWriteStream(logDest) : undefined;

	logConsole(`Starting: ${dlvPath} ${dlvArgs.join(' ')} from ${dir}\n`);

	// TODO(hyangah): In module-module workspace mode, the program should be build in the super module directory
	// where go.work (gopls.mod) file is present. Where dlv runs determines the build directory currently. Two options:
	//  1) launch dlv in the super-module module directory and adjust launchArgs.cwd (--wd).
	//  2) introduce a new buildDir launch attribute.
	return new Promise<ChildProcess>((resolve, reject) => {
		const p = spawn(dlvPath, dlvArgs, {
			cwd: dir,
			env: envForSpawn,
			stdio: onWindows ? ['pipe', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe', 'pipe'] // --log-dest=3 if !onWindows.
		});
		let started = false;
		const timeoutToken: NodeJS.Timer = setTimeout(() => {
			logConsole(`Delve DAP server (PID: ${p.pid}) is not responding`);
			reject(new Error('timed out while waiting for DAP server to start'));
		}, 30_000);

		const stopWaitingForServerToStart = () => {
			clearTimeout(timeoutToken);
			started = true;
			resolve(p);
		};

		p.stdout.on('data', (chunk) => {
			const msg = chunk.toString();
			if (!started && msg.startsWith('DAP server listening at:')) {
				stopWaitingForServerToStart();
			}
			log(msg);
		});
		p.stderr.on('data', (chunk) => {
			logErr(chunk.toString());
		});
		p.stdio[3]?.on('data', (chunk) => {
			const msg = chunk.toString();
			if (!started && msg.startsWith('DAP server listening at:')) {
				stopWaitingForServerToStart();
			}
			if (logDestStream) {
				// always false on windows.
				// write to the specified file.
				logDestStream?.write(chunk, (err) => {
					if (err) {
						logConsole(`Error writing to ${logDest}: ${err}, log may be incomplete.`);
					}
				});
			} else {
				logConsole(msg);
			}
		});
		p.stdio[3]?.on('close', () => {
			// always false on windows.
			logDestStream?.end();
		});

		p.on('close', (code, signal) => {
			// TODO: should we watch 'exit' instead?

			// NOTE: log messages here may not appear in DEBUG CONSOLE if the termination of
			// the process was triggered by debug adapter's dispose when dlv dap doesn't
			// respond to disconnect on time. In that case, it's possible that the session
			// is in the middle of teardown and DEBUG CONSOLE isn't accessible. Check
			// Go Debug output channel.
			if (typeof code === 'number') {
				// The process exited on its own.
				logConsole(`dlv dap (${p.pid}) exited with code: ${code}\n`);
			} else if (code === null && signal) {
				logConsole(`dlv dap (${p.pid}) was killed by signal: ${signal}\n`);
			} else {
				logConsole(`dlv dap (${p.pid}) terminated with code: ${code} signal: ${signal}\n`);
			}
		});
		p.on('error', (err) => {
			if (err) {
				logConsole(`Error: ${err}\n`);
			}
		});
	});
}

// getSpawnConfig returns the dlv args, directory, and dlv path necessary to spawn the dlv command.
// It also returns `env` that is the additional environment variables users want to run the dlv
// and the debuggee (i.e., go.toolsEnvVars, launch configuration's env and envFile) with.
function getSpawnConfig(launchAttachArgs: vscode.DebugConfiguration, logErr: (msg: string) => void) {
	// launchArgsEnv is user-requested env vars (envFiles + env + toolsEnvVars).
	const env = launchAttachArgs.env;
	const dlvPath = launchAttachArgs.dlvToolPath ?? 'dlv';

	if (!fs.existsSync(dlvPath)) {
		const envPath = getEnvPath();
		logErr(
			`Couldn't find ${dlvPath} at the Go tools path, ${process.env['GOPATH']}${
				env['GOPATH'] ? ', ' + env['GOPATH'] : ''
			} or ${envPath}\n` +
				'Follow the setup instruction in https://github.com/golang/vscode-go/blob/master/docs/debugging.md#getting-started.\n'
		);
		throw new Error('Cannot find Delve debugger (dlv dap)');
	}
	let dir = getWorkspaceFolderPath();
	if (launchAttachArgs.request === 'launch' && launchAttachArgs['__buildDir']) {
		// __buildDir is the directory determined during resolving debug config
		dir = launchAttachArgs['__buildDir'];
	}

	const dlvArgs = new Array<string>();
	dlvArgs.push('dap');

	// When duplicate flags are specified,
	// dlv doesn't mind but accepts the last flag value.
	if (launchAttachArgs.dlvFlags && launchAttachArgs.dlvFlags.length > 0) {
		dlvArgs.push(...launchAttachArgs.dlvFlags);
	}
	if (launchAttachArgs.showLog) {
		dlvArgs.push('--log=' + launchAttachArgs.showLog.toString());
		// Only add the log output flag if we have already added the log flag.
		// Otherwise, delve complains.
		if (launchAttachArgs.logOutput) {
			dlvArgs.push('--log-output=' + launchAttachArgs.logOutput);
		}
	}
	return { dlvArgs, dlvPath, dir, env };
}
