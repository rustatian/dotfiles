/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-case-declarations */
/* eslint-disable eqeqeq */
/* eslint-disable no-useless-escape */
/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/no-explicit-any */
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

import { ChildProcess, execFile, spawn, spawnSync } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import { existsSync, lstatSync } from 'fs';
import * as glob from 'glob';
import { Client, RPCConnection } from 'json-rpc2';
import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import {
	ContinuedEvent,
	DebugSession,
	ErrorDestination,
	Handles,
	InitializedEvent,
	logger,
	Logger,
	LoggingDebugSession,
	OutputEvent,
	Scope,
	Source,
	StackFrame,
	StoppedEvent,
	TerminatedEvent,
	Thread
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { parseEnvFiles } from '../utils/envUtils';
import {
	correctBinname,
	getEnvPath,
	expandFilePathInOutput,
	fixDriveCasingInWindows,
	getBinPathWithPreferredGopathGoroot,
	getCurrentGoWorkspaceFromGOPATH,
	getInferredGopath
} from '../utils/pathUtils';
import { killProcessTree } from '../utils/processUtils';

const fsAccess = util.promisify(fs.access);
const fsUnlink = util.promisify(fs.unlink);

// This enum should stay in sync with https://golang.org/pkg/reflect/#Kind

enum GoReflectKind {
	Invalid = 0,
	Bool,
	Int,
	Int8,
	Int16,
	Int32,
	Int64,
	Uint,
	Uint8,
	Uint16,
	Uint32,
	Uint64,
	Uintptr,
	Float32,
	Float64,
	Complex64,
	Complex128,
	Array,
	Chan,
	Func,
	Interface,
	Map,
	Ptr,
	Slice,
	String,
	Struct,
	UnsafePointer
}

// These types should stay in sync with:
// https://github.com/go-delve/delve/blob/master/service/api/types.go

interface CommandOut {
	State: DebuggerState;
}

interface DebuggerState {
	exited: boolean;
	exitStatus: number;
	currentThread: DebugThread;
	currentGoroutine: DebugGoroutine;
	Running: boolean;
	Threads: DebugThread[];
	NextInProgress: boolean;
}

export interface PackageBuildInfo {
	ImportPath: string;
	DirectoryPath: string;
	Files: string[];
}

export interface ListPackagesBuildInfoOut {
	List: PackageBuildInfo[];
}

export interface ListSourcesOut {
	Sources: string[];
}

interface CreateBreakpointOut {
	Breakpoint: DebugBreakpoint;
}

interface GetVersionOut {
	DelveVersion: string;
	APIVersion: number;
}

interface DebugBreakpoint {
	addr: number;
	continue: boolean;
	file: string;
	functionName?: string;
	goroutine: boolean;
	id: number;
	name: string;
	line: number;
	stacktrace: number;
	variables?: DebugVariable[];
	loadArgs?: LoadConfig;
	loadLocals?: LoadConfig;
	cond?: string;
}

interface LoadConfig {
	// FollowPointers requests pointers to be automatically dereferenced.
	followPointers: boolean;
	// MaxVariableRecurse is how far to recurse when evaluating nested types.
	maxVariableRecurse: number;
	// MaxStringLen is the maximum number of bytes read from a string
	maxStringLen: number;
	// MaxArrayValues is the maximum number of elements read from an array, a slice or a map.
	maxArrayValues: number;
	// MaxStructFields is the maximum number of fields read from a struct, -1 will read all fields.
	maxStructFields: number;
}

interface DebugThread {
	file: string;
	id: number;
	line: number;
	pc: number;
	goroutineID: number;
	breakPoint: DebugBreakpoint;
	breakPointInfo: {};
	function?: DebugFunction;
	ReturnValues: DebugVariable[];
}

interface StacktraceOut {
	Locations: DebugLocation[];
}

interface DebugLocation {
	pc: number;
	file: string;
	line: number;
	function: DebugFunction;
}

interface DebugFunction {
	name: string;
	value: number;
	type: number;
	goType: number;
	args: DebugVariable[];
	locals: DebugVariable[];
	optimized: boolean;
}

interface ListVarsOut {
	Variables: DebugVariable[];
}

interface ListFunctionArgsOut {
	Args: DebugVariable[];
}

interface EvalOut {
	Variable: DebugVariable;
}

enum GoVariableFlags {
	VariableEscaped = 1,
	VariableShadowed = 2,
	VariableConstant = 4,
	VariableArgument = 8,
	VariableReturnArgument = 16,
	VariableFakeAddress = 32
}

interface DebugVariable {
	// DebugVariable corresponds to api.Variable in Delve API.
	// https://github.com/go-delve/delve/blob/328cf87808822693dc611591519689dcd42696a3/service/api/types.go#L239-L284
	name: string;
	addr: number;
	type: string;
	realType: string;
	kind: GoReflectKind;
	flags: GoVariableFlags;
	onlyAddr: boolean;
	DeclLine: number;
	value: string;
	len: number;
	cap: number;
	children: DebugVariable[];
	unreadable: string;
	fullyQualifiedName: string;
	base: number;
}

interface ListGoroutinesOut {
	Goroutines: DebugGoroutine[];
}

interface DebugGoroutine {
	id: number;
	currentLoc: DebugLocation;
	userCurrentLoc: DebugLocation;
	goStatementLoc: DebugLocation;
}

interface DebuggerCommand {
	name: string;
	threadID?: number;
	goroutineID?: number;
}

interface ListBreakpointsOut {
	Breakpoints: DebugBreakpoint[];
}

interface RestartOut {
	DiscardedBreakpoints: DiscardedBreakpoint[];
}

interface DiscardedBreakpoint {
	breakpoint: DebugBreakpoint;
	reason: string;
}

// Unrecovered panic and fatal throw breakpoint IDs taken from delve:
// https://github.com/go-delve/delve/blob/f90134eb4db1c423e24fddfbc6eff41b288e6297/pkg/proc/breakpoints.go#L11-L21
// UnrecoveredPanic is the name given to the unrecovered panic breakpoint.
const unrecoveredPanicID = -1;
// FatalThrow is the name given to the breakpoint triggered when the target
// process dies because of a fatal runtime error.
const fatalThrowID = -2;

// This interface should always match the schema found in `package.json`.
interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	request: 'launch';
	[key: string]: any;
	program: string;
	stopOnEntry?: boolean;
	dlvFlags?: string[];
	args?: string[];
	showLog?: boolean;
	logOutput?: string;
	cwd?: string;
	env?: { [key: string]: string };
	mode?: 'auto' | 'debug' | 'remote' | 'test' | 'exec';
	remotePath?: string;
	port?: number;
	host?: string;
	buildFlags?: string;
	init?: string;
	// trace, info, warn are to match goLogging.
	// In practice, this adapter handles only verbose, log, and error
	//  verbose === trace,
	//  log === info === warn,
	//  error
	trace?: 'verbose' | 'trace' | 'info' | 'log' | 'warn' | 'error';
	backend?: string;
	output?: string;
	substitutePath?: { from: string; to: string }[];
	/** Delve LoadConfig parameters */
	dlvLoadConfig?: LoadConfig;
	dlvToolPath: string;
	/** Delve Version */
	apiVersion: number;
	/** Delve maximum stack trace depth */
	stackTraceDepth: number;

	showGlobalVariables?: boolean;
	packagePathToGoModPathMap: { [key: string]: string };

	/** Optional path to .env file. */
	// TODO: deprecate .env file processing from DA.
	// We expect the extension processes .env files
	// and send the information to DA using the 'env' property.
	envFile?: string | string[];
}

interface AttachRequestArguments extends DebugProtocol.AttachRequestArguments {
	request: 'attach';
	processId?: number;
	stopOnEntry?: boolean;
	dlvFlags?: string[];
	showLog?: boolean;
	logOutput?: string;
	cwd?: string;
	mode?: 'local' | 'remote';
	remotePath?: string;
	port?: number;
	host?: string;
	trace?: 'verbose' | 'trace' | 'info' | 'log' | 'warn' | 'error';
	backend?: string;
	substitutePath?: { from: string; to: string }[];
	/** Delve LoadConfig parameters */
	dlvLoadConfig?: LoadConfig;
	dlvToolPath: string;
	/** Delve Version */
	apiVersion: number;
	/** Delve maximum stack trace depth */
	stackTraceDepth: number;

	showGlobalVariables?: boolean;
}

process.on('uncaughtException', (err: any) => {
	const errMessage = err && (err.stack || err.message);
	logger.error(`Unhandled error in debug adapter: ${errMessage}`);
	throw err;
});

function logArgsToString(args: any[]): string {
	return args
		.map((arg) => {
			return typeof arg === 'string' ? arg : JSON.stringify(arg);
		})
		.join(' ');
}

function log(...args: any[]) {
	logger.warn(logArgsToString(args));
}

function logError(...args: any[]) {
	logger.error(logArgsToString(args));
}

export function findPathSeparator(filePath: string | undefined) {
	return filePath && filePath.includes('\\') ? '\\' : '/';
}

// Comparing two different file paths while ignoring any different path separators.
function compareFilePathIgnoreSeparator(firstFilePath: string, secondFilePath: string): boolean {
	const firstSeparator = findPathSeparator(firstFilePath);
	const secondSeparator = findPathSeparator(secondFilePath);
	if (firstSeparator === secondSeparator) {
		return firstFilePath === secondFilePath;
	}
	return firstFilePath === secondFilePath.split(secondSeparator).join(firstSeparator);
}

export function escapeGoModPath(filePath: string) {
	return filePath.replace(/[A-Z]/g, (match: string) => `!${match.toLocaleLowerCase()}`);
}

function normalizePath(filePath: string) {
	if (process.platform === 'win32') {
		const pathSeparator = findPathSeparator(filePath);
		filePath = path.normalize(filePath);
		// Normalize will replace everything with backslash on Windows.
		filePath = filePath.replace(/\\/g, pathSeparator);
		return fixDriveCasingInWindows(filePath);
	}
	return filePath;
}

// normalizeSeparators will prepare the filepath for comparison in mapping from
// local to debugger path and from debugger path to local path. All separators are
// replaced with '/', and the drive name is capitalized for windows paths.
// Exported for testing
export function normalizeSeparators(filePath: string): string {
	// Although the current machine may not be running windows,
	// the remote machine may be and we need to fix the drive
	// casing.
	// This is a workaround for issue in https://github.com/Microsoft/vscode/issues/9448#issuecomment-244804026
	if (filePath.indexOf(':') === 1) {
		filePath = filePath.substr(0, 1).toUpperCase() + filePath.substr(1);
	}
	return filePath.replace(/\/|\\/g, '/');
}

function getBaseName(filePath: string) {
	return filePath.includes('/') ? path.basename(filePath) : path.win32.basename(filePath);
}

export class Delve {
	public program: string;
	public remotePath?: string;
	public loadConfig?: LoadConfig;
	public connection: Promise<RPCConnection | null>; // null if connection isn't necessary (e.g. noDebug mode)
	public onstdout?: (str: string) => void;
	public onstderr?: (str: string) => void;
	public onclose?: (code: number) => void;
	public noDebug?: boolean;
	public isApiV1: boolean;
	public dlvEnv: any;
	public stackTraceDepth: number;
	public isRemoteDebugging?: boolean;
	public goroot?: string;
	public delveConnectionClosed = false;
	private localDebugeePath: string | undefined;
	private debugProcess?: ChildProcess;
	private request: 'attach' | 'launch';

	constructor(launchArgs: LaunchRequestArguments | AttachRequestArguments, program: string) {
		this.request = launchArgs.request;
		this.program = normalizePath(program);
		this.remotePath = launchArgs.remotePath;
		this.isApiV1 = false;
		if (typeof launchArgs.apiVersion === 'number') {
			this.isApiV1 = launchArgs.apiVersion === 1;
		}
		this.stackTraceDepth = typeof launchArgs.stackTraceDepth === 'number' ? launchArgs.stackTraceDepth : 50;
		this.connection = new Promise(async (resolve, reject) => {
			const mode = launchArgs.mode;
			let dlvCwd = path.dirname(program);
			let serverRunning = false;
			const dlvArgs = new Array<string>();

			// Get default LoadConfig values according to delve API:
			// https://github.com/go-delve/delve/blob/c5c41f635244a22d93771def1c31cf1e0e9a2e63/service/rpc1/server.go#L13
			// https://github.com/go-delve/delve/blob/c5c41f635244a22d93771def1c31cf1e0e9a2e63/service/rpc2/server.go#L423
			this.loadConfig = launchArgs.dlvLoadConfig || {
				followPointers: true,
				maxVariableRecurse: 1,
				maxStringLen: 64,
				maxArrayValues: 64,
				maxStructFields: -1
			};

			if (mode === 'remote') {
				log(`Start remote debugging: connecting ${launchArgs.host}:${launchArgs.port}`);
				this.debugProcess = undefined;
				this.isRemoteDebugging = true;
				this.goroot = await queryGOROOT(dlvCwd, process.env);
				serverRunning = true; // assume server is running when in remote mode
				if (!launchArgs.port || !launchArgs.host) {
					return reject('Unable to connect, missing host or port from launchArgs.');
				}
				connectClient(launchArgs.port, launchArgs.host, this.onclose);
				return;
			}
			this.isRemoteDebugging = false;
			let env: NodeJS.ProcessEnv | undefined;
			if (launchArgs.request === 'launch') {
				let isProgramDirectory = false;
				// Validations on the program
				if (!program) {
					return reject('The program attribute is missing in the debug configuration in launch.json');
				}
				try {
					const pstats = lstatSync(program);
					if (pstats.isDirectory()) {
						if (mode === 'exec') {
							logError(`The program "${program}" must not be a directory in exec mode`);
							return reject('The program attribute must be an executable in exec mode');
						}
						dlvCwd = program;
						isProgramDirectory = true;
					} else if (mode !== 'exec' && path.extname(program) !== '.go') {
						logError(`The program "${program}" must be a valid go file in debug mode`);
						return reject('The program attribute must be a directory or .go file in debug mode');
					}
				} catch (e) {
					logError(`The program "${program}" does not exist: ${e}`);
					return reject('The program attribute must point to valid directory, .go file or executable.');
				}

				// read env from disk and merge into env variables
				try {
					const fileEnvs = parseEnvFiles(launchArgs.envFile);
					const launchArgsEnv = launchArgs.env || {};
					env = Object.assign({}, process.env, fileEnvs, launchArgsEnv);
				} catch (e) {
					return reject(`failed to process 'envFile' and 'env' settings: ${e}`);
				}

				const dirname = isProgramDirectory ? program : path.dirname(program);
				if (!env['GOPATH'] && (mode === 'debug' || mode === 'test')) {
					// If no GOPATH is set, then infer it from the file/package path
					// Not applicable to exec mode in which case `program` need not point to source code under GOPATH
					env['GOPATH'] = getInferredGopath(dirname) || env['GOPATH'];
				}
				this.dlvEnv = env;
				this.goroot = await queryGOROOT(dlvCwd, env);

				log(`Using GOPATH: ${env['GOPATH']}`);
				log(`Using GOROOT: ${this.goroot}`);
				log(`Using PATH: ${env['PATH']}`);
				if (launchArgs.noDebug) {
					if (mode === 'debug') {
						this.noDebug = true;
						const build = ['build'];
						const output = path.join(os.tmpdir(), correctBinname('out'));
						build.push(`-o=${output}`);

						const buildOptions: { [key: string]: any } = { cwd: dirname, env };
						if (launchArgs.buildFlags) {
							build.push(launchArgs.buildFlags);
						}

						if (isProgramDirectory) {
							build.push('.');
						} else {
							build.push(program);
						}

						const goExe = getBinPathWithPreferredGopathGoroot('go', []);
						log(`Current working directory: ${dirname}`);
						log(`Building: ${goExe} ${build.join(' ')}`);

						// Use spawnSync to ensure that the binary exists before running it.
						const buffer = spawnSync(goExe, build, buildOptions);
						if (buffer.stderr && buffer.stderr.length > 0) {
							const str = buffer.stderr.toString();
							if (this.onstderr) {
								this.onstderr(str);
							}
						}
						if (buffer.stdout && buffer.stdout.length > 0) {
							const str = buffer.stdout.toString();
							if (this.onstdout) {
								this.onstdout(str);
							}
						}
						if (buffer.status) {
							logError(`Build process exiting with code: ${buffer.status} signal: ${buffer.signal}`);
							if (this.onclose) {
								this.onclose(buffer.status);
							}
						} else {
							log(`Build process exiting normally ${buffer.signal}`);
						}
						if (buffer.error) {
							reject(buffer.error);
						}

						// Run the built binary
						let wd = dirname;
						if (launchArgs.cwd) {
							wd = launchArgs.cwd;
						}
						const runOptions: { [key: string]: any } = { cwd: wd, env };

						const run = [];
						if (launchArgs.args) {
							run.push(...launchArgs.args);
						}

						log(`Current working directory: ${wd}`);
						log(`Running: ${output} ${run.join(' ')}`);

						this.debugProcess = spawn(output, run, runOptions);
						this.debugProcess.stderr?.on('data', (chunk) => {
							const str = chunk.toString();
							if (this.onstderr) {
								this.onstderr(str);
							}
						});
						this.debugProcess.stdout?.on('data', (chunk) => {
							const str = chunk.toString();
							if (this.onstdout) {
								this.onstdout(str);
							}
						});
						this.debugProcess.on('close', (code) => {
							if (code) {
								logError(`Process exiting with code: ${code} signal: ${this.debugProcess?.killed}`);
							} else {
								log(`Process exiting normally ${this.debugProcess?.killed}`);
							}
							if (this.onclose) {
								this.onclose(code);
							}
						});
						this.debugProcess.on('error', (err) => {
							reject(err);
						});

						resolve(null);
						return;
					}
				}
				this.noDebug = false;

				if (!existsSync(launchArgs.dlvToolPath)) {
					log(
						`Couldn't find dlv at the Go tools path, ${process.env['GOPATH']}${
							env['GOPATH'] ? ', ' + env['GOPATH'] : ''
						} or ${getEnvPath()}`
					);
					return reject(
						'Cannot find Delve debugger. Install from https://github.com/go-delve/delve & ensure it is in your Go tools path, "GOPATH/bin" or "PATH".'
					);
				}

				const currentGOWorkspace = getCurrentGoWorkspaceFromGOPATH(env['GOPATH'], dirname);
				if (!launchArgs.packagePathToGoModPathMap) {
					launchArgs.packagePathToGoModPathMap = {};
				}
				dlvArgs.push(mode || 'debug');
				if (mode === 'exec' || (mode === 'debug' && !isProgramDirectory)) {
					dlvArgs.push(program);
				} else if (currentGOWorkspace && !launchArgs.packagePathToGoModPathMap[dirname]) {
					dlvArgs.push(dirname.substr(currentGOWorkspace.length + 1));
				}
				// add user-specified dlv flags first. When duplicate flags are specified,
				// dlv doesn't mind but accepts the last flag value.
				if (launchArgs.dlvFlags && launchArgs.dlvFlags.length > 0) {
					dlvArgs.push(...launchArgs.dlvFlags);
				}
				dlvArgs.push('--headless=true', `--listen=${launchArgs.host}:${launchArgs.port}`);
				if (!this.isApiV1) {
					dlvArgs.push('--api-version=2');
				}

				if (launchArgs.showLog) {
					dlvArgs.push('--log=' + launchArgs.showLog.toString());
					// Only add the log output flag if we have already added the log flag.
					// Otherwise, delve complains.
					if (launchArgs.logOutput) {
						dlvArgs.push('--log-output=' + launchArgs.logOutput);
					}
				}
				if (launchArgs.cwd) {
					dlvArgs.push('--wd=' + launchArgs.cwd);
				}
				if (launchArgs.buildFlags) {
					dlvArgs.push('--build-flags=' + launchArgs.buildFlags);
				}
				if (launchArgs.backend) {
					dlvArgs.push('--backend=' + launchArgs.backend);
				}
				if (launchArgs.output && (mode === 'debug' || mode === 'test')) {
					dlvArgs.push('--output=' + launchArgs.output);
				}
				if (launchArgs.args && launchArgs.args.length > 0) {
					dlvArgs.push('--', ...launchArgs.args);
				}
				this.localDebugeePath = this.getLocalDebugeePath(launchArgs.output);
			} else if (launchArgs.request === 'attach') {
				if (!launchArgs.processId) {
					return reject('Missing process ID');
				}

				if (!existsSync(launchArgs.dlvToolPath)) {
					return reject(
						'Cannot find Delve debugger. Install from https://github.com/go-delve/delve & ensure it is in your Go tools path, "GOPATH/bin" or "PATH".'
					);
				}

				dlvArgs.push('attach', `${launchArgs.processId}`);
				// add user-specified dlv flags first. When duplicate flags are specified,
				// dlv doesn't mind but accepts the last flag value.
				if (launchArgs.dlvFlags && launchArgs.dlvFlags.length > 0) {
					dlvArgs.push(...launchArgs.dlvFlags);
				}
				dlvArgs.push('--headless=true', '--listen=' + launchArgs.host + ':' + launchArgs.port?.toString());
				if (!this.isApiV1) {
					dlvArgs.push('--api-version=2');
				}

				if (launchArgs.showLog) {
					dlvArgs.push('--log=' + launchArgs.showLog.toString());
				}
				if (launchArgs.logOutput) {
					dlvArgs.push('--log-output=' + launchArgs.logOutput);
				}
				if (launchArgs.cwd) {
					dlvArgs.push('--wd=' + launchArgs.cwd);
				}
				if (launchArgs.backend) {
					dlvArgs.push('--backend=' + launchArgs.backend);
				}
			}

			log(`Current working directory: ${dlvCwd}`);
			log(`Running: ${launchArgs.dlvToolPath} ${dlvArgs.join(' ')}`);

			this.debugProcess = spawn(launchArgs.dlvToolPath, dlvArgs, {
				cwd: dlvCwd,
				env
			});

			function connectClient(port: number, host: string, onClose?: Delve['onclose']) {
				// Add a slight delay to avoid issues on Linux with
				// Delve failing calls made shortly after connection.
				setTimeout(() => {
					const conn = Client.$create(port, host).connectSocket();

					conn.on('connect', () => resolve(conn))
						.on('error', reject)
						.on('close', (hadError) => {
							logError('Socket connection to remote was closed');
							onClose?.(hadError ? 1 : 0);
						});
				}, 200);
			}

			this.debugProcess.stderr?.on('data', (chunk) => {
				const str = chunk.toString();
				if (this.onstderr) {
					this.onstderr(str);
				}
			});
			this.debugProcess.stdout?.on('data', (chunk) => {
				const str = chunk.toString();
				if (this.onstdout) {
					this.onstdout(str);
				}
				if (!serverRunning) {
					serverRunning = true;
					if (!launchArgs.port || !launchArgs.host) {
						return reject('Unable to connect, missing host or port from launchArgs.');
					}
					connectClient(launchArgs.port, launchArgs.host, this.onclose);
				}
			});
			this.debugProcess.on('close', (code) => {
				// TODO: Report `dlv` crash to user.
				logError('Process exiting with code: ' + code);
				if (this.onclose) {
					this.onclose(code);
				}
			});
			this.debugProcess.on('error', (err) => {
				reject(err);
			});
		});
	}

	public call<T>(command: string, args: any[], callback: (err: Error, results?: T) => void) {
		this.connection.then(
			(conn) => {
				conn?.call('RPCServer.' + command, args, callback);
			},
			(err) => {
				callback(err);
			}
		);
	}

	public callPromise<T>(command: string, args: any[]): Thenable<T> {
		return new Promise<T>((resolve, reject) => {
			this.connection.then(
				(conn) => {
					conn?.call<T>(`RPCServer.${command}`, args, (err, res) => {
						return err ? reject(err) : resolve(res);
					});
				},
				(err) => {
					reject(err);
				}
			);
		});
	}

	/**
	 * Returns the current state of the delve debugger.
	 * This method does not block delve and should return immediately.
	 */
	public async getDebugState(): Promise<DebuggerState> {
		// If a program is launched with --continue, the program is running
		// before we can run attach. So we would need to check the state.
		// We use NonBlocking so the call would return immediately.
		const callResult = await this.callPromise<DebuggerState | CommandOut>('State', [{ NonBlocking: true }]);
		return this.isApiV1 ? <DebuggerState>callResult : (<CommandOut>callResult).State;
	}

	/**
	 * Closing a debugging session follows different approaches for launch vs attach debugging.
	 *
	 * For launch without debugging, we kill the process since the extension started the `go run` process.
	 *
	 * For launch debugging, since the extension starts the delve process, the extension should close it as well.
	 * To gracefully clean up the assets created by delve, we send the Detach request with kill option set to true.
	 *
	 * For attach debugging there are two scenarios; attaching to a local process by ID or connecting to a
	 * remote delve server.  For attach-local we start the delve process so will also terminate it however we
	 * detach from the debugee without killing it.  For attach-remote we only close the client connection,
	 * but do not terminate the remote server.
	 *
	 * For local debugging, the only way to detach from delve when it is running a program is to send a Halt request first.
	 * Since the Halt request might sometimes take too long to complete, we have a timer in place to forcefully kill
	 * the debug process and clean up the assets in case of local debugging
	 */
	public async close(): Promise<void> {
		const forceCleanup = async () => {
			log(`killing debugee (pid: ${this.debugProcess?.pid})...`);
			if (this.debugProcess) {
				await killProcessTree(this.debugProcess, log);
			}
			if (this.localDebugeePath) {
				await removeFile(this.localDebugeePath);
			}
		};

		if (this.noDebug) {
			// delve isn't running so no need to halt
			await forceCleanup();
			return Promise.resolve();
		}
		const isLocalDebugging: boolean = this.request === 'launch' && !!this.debugProcess;

		return new Promise(async (resolve) => {
			this.delveConnectionClosed = true;

			// For remote debugging, we want to leave the remote dlv server running,
			// so instead of killing it via halt+detach, we just close the network connection.
			// See https://www.github.com/go-delve/delve/issues/1587
			if (this.isRemoteDebugging) {
				log('Remote Debugging: close dlv connection.');
				const rpcConnection = await this.connection;
				// tslint:disable-next-line no-any
				(rpcConnection as any)['conn']['end']();
				return resolve();
			}
			const timeoutToken =
				isLocalDebugging &&
				setTimeout(async () => {
					log('Killing debug process manually as we could not halt delve in time');
					await forceCleanup();
					resolve();
				}, 1000);

			let haltErrMsg: string | undefined;
			try {
				log('HaltRequest');
				await this.callPromise('Command', [{ name: 'halt' }]);
			} catch (err) {
				log('HaltResponse');
				log(`Failed to halt - ${err}`);
			}
			if (timeoutToken) {
				clearTimeout(timeoutToken);
			}

			const targetHasExited = !!haltErrMsg && haltErrMsg.endsWith('has exited with status 0');
			const shouldDetach = !haltErrMsg || targetHasExited;
			let shouldForceClean = !shouldDetach && isLocalDebugging;
			if (shouldDetach) {
				log('DetachRequest');
				try {
					await this.callPromise('Detach', [this.isApiV1 ? true : { Kill: isLocalDebugging }]);
				} catch (err) {
					log('DetachResponse');
					logError(`Failed to detach - ${err}`);
					shouldForceClean = isLocalDebugging;
				}
			}
			if (shouldForceClean) {
				await forceCleanup();
			}
			return resolve();
		});
	}

	private getLocalDebugeePath(output: string | undefined): string {
		const configOutput = output || 'debug';
		return path.isAbsolute(configOutput) ? configOutput : path.resolve(this.program, configOutput);
	}
}

export class GoDebugSession extends LoggingDebugSession {
	private variableHandles: Handles<DebugVariable>;
	private breakpoints: Map<string, DebugBreakpoint[]>;
	// Editing breakpoints requires halting delve, skip sending Stop Event to VS Code in such cases
	private skipStopEventOnce: boolean;
	private overrideStopReason: string;
	private debugState?: DebuggerState;
	private delve?: Delve;
	private localPathSeparator?: string;
	private remotePathSeparator?: string;
	private stackFrameHandles: Handles<[number, number]>;
	private packageInfo = new Map<string, string>();
	private stopOnEntry: boolean;
	private logLevel: Logger.LogLevel = Logger.LogLevel.Error;
	private readonly initdone = 'initdone·';
	private remoteSourcesAndPackages = new RemoteSourcesAndPackages();
	private localToRemotePathMapping = new Map<string, string>();
	private remoteToLocalPathMapping = new Map<string, string>();

	// TODO(suzmue): Use delve's implementation of substitute-path.
	private substitutePath?: { from: string; to: string }[];

	private showGlobalVariables = false;

	private continueEpoch = 0;
	private continueRequestRunning = false;
	private nextEpoch = 0;
	private nextRequestRunning = false;
	public constructor(debuggerLinesStartAt1: boolean, isServer = false, readonly fileSystem = fs) {
		super('', debuggerLinesStartAt1, isServer);
		this.variableHandles = new Handles<DebugVariable>();
		this.skipStopEventOnce = false;
		this.overrideStopReason = '';
		this.stopOnEntry = false;
		this.breakpoints = new Map<string, DebugBreakpoint[]>();
		this.stackFrameHandles = new Handles<[number, number]>();
	}

	protected initializeRequest(
		response: DebugProtocol.InitializeResponse,
		args: DebugProtocol.InitializeRequestArguments
	): void {
		log('InitializeRequest');
		// Set the capabilities that this debug adapter supports.
		response.body = response.body ?? {};
		response.body.supportsConditionalBreakpoints = true;
		response.body.supportsConfigurationDoneRequest = true;
		response.body.supportsSetVariable = true;
		this.sendResponse(response);
		log('InitializeResponse');
	}

	protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
		log('LaunchRequest');
		if (!args.program) {
			this.sendErrorResponse(
				response,
				3000,
				'Failed to continue: The program attribute is missing in the debug configuration in launch.json'
			);
			return;
		}
		this.initLaunchAttachRequest(response, args);
	}

	protected attachRequest(response: DebugProtocol.AttachResponse, args: AttachRequestArguments): void {
		log('AttachRequest');
		if (args.mode === 'local' && !args.processId) {
			this.sendErrorResponse(
				response,
				3000,
				'Failed to continue: the processId attribute is missing in the debug configuration in launch.json'
			);
		} else if (args.mode === 'remote' && !args.port) {
			this.sendErrorResponse(
				response,
				3000,
				'Failed to continue: the port attribute is missing in the debug configuration in launch.json'
			);
		}
		this.initLaunchAttachRequest(response, args);
	}

	protected async disconnectRequest(
		response: DebugProtocol.DisconnectResponse,
		args: DebugProtocol.DisconnectArguments
	): Promise<void> {
		log('DisconnectRequest');
		if (this.delve) {
			// Since users want to reset when they issue a disconnect request,
			// we should have a timeout in case disconnectRequestHelper hangs.
			await Promise.race([
				this.disconnectRequestHelper(response, args),
				new Promise<void>((resolve) =>
					setTimeout(() => {
						log('DisconnectRequestHelper timed out after 5s.');
						resolve();
					}, 5_000)
				)
			]);
		}

		this.shutdownProtocolServer(response, args);
		log('DisconnectResponse');
	}

	protected async disconnectRequestHelper(
		response: DebugProtocol.DisconnectResponse,
		args: DebugProtocol.DisconnectArguments
	): Promise<void> {
		// There is a chance that a second disconnectRequest can come through
		// if users click detach multiple times. In that case, we want to
		// guard against talking to the closed Delve connection.
		// Note: this does not completely guard against users attempting to
		// disconnect multiple times when a disconnect request is still running.
		// The order of the execution may results in strange states that don't allow
		// the delve connection to fully disconnect.
		if (this.delve?.delveConnectionClosed) {
			log("Skip disconnectRequestHelper as Delve's connection is already closed.");
			return;
		}

		// For remote process, we have to issue a continue request
		// before disconnecting.
		if (this.delve?.isRemoteDebugging) {
			if (!(await this.isDebuggeeRunning())) {
				log("Issuing a continue command before closing Delve's connection as the debuggee is not running.");
				this.continue();
			}
		}
		log('Closing Delve.');
		await this.delve?.close();
	}

	protected async configurationDoneRequest(
		response: DebugProtocol.ConfigurationDoneResponse,
		args: DebugProtocol.ConfigurationDoneArguments
	): Promise<void> {
		log('ConfigurationDoneRequest');
		if (this.stopOnEntry) {
			this.sendEvent(new StoppedEvent('entry', 1));
			log('StoppedEvent("entry")');
		} else if (!(await this.isDebuggeeRunning())) {
			log('Changing DebugState from Halted to Running');
			this.continue();
		}
		this.sendResponse(response);
		log('ConfigurationDoneResponse', response);
	}

	/**
	 * Given a potential list of paths in potentialPaths array, we will
	 * find the path that has the longest suffix matching filePath.
	 * For example, if filePath is /usr/local/foo/bar/main.go
	 * and potentialPaths are abc/xyz/main.go, bar/main.go
	 * then bar/main.go will be the result.
	 * NOTE: This function assumes that potentialPaths array only contains
	 * files with the same base names as filePath.
	 */
	protected findPathWithBestMatchingSuffix(filePath: string, potentialPaths: string[]): string | undefined {
		if (!potentialPaths?.length) {
			return;
		}

		if (potentialPaths.length === 1) {
			return potentialPaths[0];
		}

		const filePathSegments = filePath.split(/\/|\\/).reverse();
		let bestPathSoFar = potentialPaths[0];
		let bestSegmentsCount = 0;
		for (const potentialPath of potentialPaths) {
			const potentialPathSegments = potentialPath.split(/\/|\\/).reverse();
			let i = 0;
			for (
				;
				i < filePathSegments.length &&
				i < potentialPathSegments.length &&
				filePathSegments[i] === potentialPathSegments[i];
				i++
			) {
				if (i > bestSegmentsCount) {
					bestSegmentsCount = i;
					bestPathSoFar = potentialPath;
				}
			}
		}
		return bestPathSoFar;
	}

	/**
	 * Given a local path, try to find matching file in the remote machine
	 * using remote sources and remote packages info that we get from Delve.
	 * The result would be cached in localToRemotePathMapping.
	 */
	protected inferRemotePathFromLocalPath(localPath: string): string | undefined {
		if (this.localToRemotePathMapping.has(localPath)) {
			return this.localToRemotePathMapping.get(localPath);
		}

		const fileName = getBaseName(localPath);
		const potentialMatchingRemoteFiles =
			this.remoteSourcesAndPackages.remoteSourceFilesNameGrouping.get(fileName) ?? [];
		const bestMatchingRemoteFile = this.findPathWithBestMatchingSuffix(localPath, potentialMatchingRemoteFiles);
		if (!bestMatchingRemoteFile) {
			return;
		}

		this.localToRemotePathMapping.set(localPath, bestMatchingRemoteFile);
		return bestMatchingRemoteFile;
	}

	protected async toDebuggerPath(filePath: string): Promise<string> {
		if (this.substitutePath?.length === 0) {
			if (this.delve?.isRemoteDebugging) {
				// The user trusts us to infer the remote path mapping!
				await this.initializeRemotePackagesAndSources();
				const matchedRemoteFile = this.inferRemotePathFromLocalPath(filePath);
				if (matchedRemoteFile) {
					return matchedRemoteFile;
				}
			}

			return this.convertClientPathToDebugger(filePath);
		}

		// The filePath may have a different path separator than the localPath
		// So, update it to use the same separator for ease in path replacement.
		filePath = normalizeSeparators(filePath);
		let substitutedPath = filePath;
		let substituteRule: { from: string; to: string };
		this.substitutePath?.forEach((value) => {
			if (filePath.startsWith(value.from)) {
				if (substituteRule) {
					log(
						`Substitutition rule ${value.from}:${value.to} applies to local path ${filePath} but it was already mapped to debugger path using rule ${substituteRule.from}:${substituteRule.to}`
					);
					return;
				}
				substitutedPath = filePath.replace(value.from, value.to);
				substituteRule = { from: value.from, to: value.to };
			}
		});
		filePath = substitutedPath;

		return (filePath = filePath.replace(/\/|\\/g, this.remotePathSeparator ?? ''));
	}

	/**
	 * Given a remote path, try to infer the matching local path.
	 * We attempt to find the path in local Go packages as well as workspaceFolder.
	 * Cache the result in remoteToLocalPathMapping.
	 */
	protected inferLocalPathFromRemotePath(remotePath: string): string | undefined {
		// Don't try to infer a path for a file that does not exist
		if (remotePath === '') {
			return remotePath;
		}

		if (this.remoteToLocalPathMapping.has(remotePath)) {
			return this.remoteToLocalPathMapping.get(remotePath);
		}

		const convertedLocalPackageFile = this.inferLocalPathFromRemoteGoPackage(remotePath);
		if (convertedLocalPackageFile) {
			this.remoteToLocalPathMapping.set(remotePath, convertedLocalPackageFile);
			return convertedLocalPackageFile;
		}

		// If we cannot find the path in packages, most likely it will be in the current directory.
		const fileName = getBaseName(remotePath);
		const globSync = glob.sync(fileName, {
			matchBase: true,
			cwd: this.delve?.program
		});
		const bestMatchingLocalPath = this.findPathWithBestMatchingSuffix(remotePath, globSync);
		if (bestMatchingLocalPath) {
			const fullLocalPath = path.join(this.delve?.program ?? '', bestMatchingLocalPath);
			this.remoteToLocalPathMapping.set(remotePath, fullLocalPath);
			return fullLocalPath;
		}
	}

	/**
	 * Given a remote path, we attempt to infer the local path by first checking
	 * if it is in any remote packages. If so, then we attempt to find the matching
	 * local package and find the local path from there.
	 */
	protected inferLocalPathFromRemoteGoPackage(remotePath: string): string | undefined {
		const remotePackage = this.remoteSourcesAndPackages.remotePackagesBuildInfo.find((buildInfo) =>
			remotePath.startsWith(buildInfo.DirectoryPath)
		);
		// Since we know pathToConvert exists in a remote package, we can try to find
		// that same package in the local client. We can use import path to search for the package.
		if (!remotePackage) {
			return;
		}

		if (!this.remotePathSeparator) {
			this.remotePathSeparator = findPathSeparator(remotePackage.DirectoryPath);
		}

		// Escaping package path.
		// It seems like sometimes Delve don't escape the path properly
		// so we should do it.
		remotePath = escapeGoModPath(remotePath);
		const escapedImportPath = escapeGoModPath(remotePackage.ImportPath);

		// The remotePackage.DirectoryPath should be something like
		// <gopath|goroot|source>/<import-path>/xyz...
		// Directory Path can be like "/go/pkg/mod/github.com/google/go-cmp@v0.4.0/cmp"
		// and Import Path can be like "github.com/google/go-cmp/cmp"
		// and Remote Path "/go/pkg/mod/github.com/google/go-cmp@v0.4.0/cmp/blah.go"
		const importPathIndex = remotePath.replace(/@v\d+\.\d+\.\d+[^\/]*/, '').indexOf(escapedImportPath);
		if (importPathIndex < 0) {
			return;
		}

		const relativeRemotePath = remotePath
			.substr(importPathIndex)
			.split(this.remotePathSeparator)
			.join(this.localPathSeparator);
		const pathToConvertWithLocalSeparator = remotePath
			.split(this.remotePathSeparator)
			.join(this.localPathSeparator);

		// Scenario 1: The package is inside the current working directory.
		const localWorkspacePath = path.join(this.delve?.program ?? '', relativeRemotePath);
		if (this.fileSystem.existsSync(localWorkspacePath)) {
			return localWorkspacePath;
		}

		// Scenario 2: The package is inside GOPATH.
		const localGoPathImportPath = this.inferLocalPathInGoPathFromRemoteGoPackage(
			pathToConvertWithLocalSeparator,
			relativeRemotePath
		);
		if (localGoPathImportPath) {
			return localGoPathImportPath;
		}

		// Scenario 3: The package is inside GOROOT.
		return this.inferLocalPathInGoRootFromRemoteGoPackage(pathToConvertWithLocalSeparator, relativeRemotePath);
	}

	/**
	 * Given a remotePath, check whether the file path exists in $GOROOT/src.
	 * Return the path if it exists.
	 * We are assuming that remotePath is of the form <prefix>/src/<suffix>.
	 */
	protected inferLocalPathInGoRootFromRemoteGoPackage(
		remotePathWithLocalSeparator: string,
		relativeRemotePath: string
	): string | undefined {
		const srcIndex = remotePathWithLocalSeparator.indexOf(
			`${this.localPathSeparator}src${this.localPathSeparator}`
		);
		const goroot = this.getGOROOT();
		const localGoRootImportPath = path.join(
			goroot,
			srcIndex >= 0 ? remotePathWithLocalSeparator.substr(srcIndex) : path.join('src', relativeRemotePath)
		);
		if (this.fileSystem.existsSync(localGoRootImportPath)) {
			return localGoRootImportPath;
		}
	}

	/**
	 * Given a remotePath, check whether the file path exists in $GOPATH.
	 * This can be either in $GOPATH/pkg/mod or $GOPATH/src. If so, return that path.
	 * remotePath can be something like /usr/local/gopath/src/hello-world/main.go
	 * and relativeRemotePath should be hello-world/main.go. In other words,
	 * relativeRemotePath is a relative version of remotePath starting
	 * from the import path of the module.
	 */
	protected inferLocalPathInGoPathFromRemoteGoPackage(
		remotePathWithLocalSeparator: string,
		relativeRemotePath: string
	): string | undefined {
		// Scenario 1: The package is inside $GOPATH/pkg/mod.
		const gopath = (process.env['GOPATH'] || '').split(path.delimiter)[0];

		const indexGoModCache = remotePathWithLocalSeparator.indexOf(
			`${this.localPathSeparator}pkg${this.localPathSeparator}mod${this.localPathSeparator}`
		);
		const localGoPathImportPath = path.join(
			gopath,
			indexGoModCache >= 0
				? remotePathWithLocalSeparator.substr(indexGoModCache)
				: path.join('pkg', 'mod', relativeRemotePath)
		);
		if (this.fileSystem.existsSync(localGoPathImportPath)) {
			return localGoPathImportPath;
		}

		// Scenario 2: The file is in a package in $GOPATH/src.
		const localGoPathSrcPath = path.join(
			gopath,
			'src',
			relativeRemotePath.split(this.remotePathSeparator ?? '').join(this.localPathSeparator)
		);
		if (this.fileSystem.existsSync(localGoPathSrcPath)) {
			return localGoPathSrcPath;
		}
	}

	/**
	 * This functions assumes that remote packages and paths information
	 * have been initialized.
	 */
	protected toLocalPath(pathToConvert: string): string {
		if (this.substitutePath?.length === 0) {
			// User trusts use to infer the path
			if (this.delve?.isRemoteDebugging) {
				const inferredPath = this.inferLocalPathFromRemotePath(pathToConvert);
				if (inferredPath) {
					return inferredPath;
				}
			}

			return this.convertDebuggerPathToClient(pathToConvert);
		}

		// If there is a substitutePath mapping, then we replace the path.
		pathToConvert = normalizeSeparators(pathToConvert);
		let substitutedPath = pathToConvert;
		let substituteRule: { from: string; to: string } | undefined;
		this.substitutePath?.forEach((value) => {
			if (pathToConvert.startsWith(value.to)) {
				if (substituteRule) {
					log(
						`Substitutition rule ${value.from}:${value.to} applies to debugger path ${pathToConvert} but it was already mapped to local path using rule ${substituteRule.from}:${substituteRule.to}`
					);
					return;
				}
				substitutedPath = pathToConvert.replace(value.to, value.from);
				substituteRule = { from: value.from, to: value.to };
			}
		});
		pathToConvert = substitutedPath;

		// When the pathToConvert is under GOROOT or Go module cache, replace path appropriately
		if (!substituteRule) {
			// Fix for https://github.com/Microsoft/vscode-go/issues/1178
			const index = pathToConvert.indexOf(`${this.remotePathSeparator}src${this.remotePathSeparator}`);
			const goroot = this.getGOROOT();
			if (goroot && index > 0) {
				return path.join(goroot, pathToConvert.substr(index));
			}

			const indexGoModCache = pathToConvert.indexOf(
				`${this.remotePathSeparator}pkg${this.remotePathSeparator}mod${this.remotePathSeparator}`
			);
			const gopath = (process.env['GOPATH'] || '').split(path.delimiter)[0];

			if (gopath && indexGoModCache > 0) {
				return path.join(
					gopath,
					pathToConvert
						.substr(indexGoModCache)
						.split(this.remotePathSeparator ?? '')
						.join(this.localPathSeparator)
				);
			}
		}
		return pathToConvert.split(this.remotePathSeparator ?? '').join(this.localPathSeparator);
	}

	protected async setBreakPointsRequest(
		response: DebugProtocol.SetBreakpointsResponse,
		args: DebugProtocol.SetBreakpointsArguments
	): Promise<void> {
		log('SetBreakPointsRequest');
		if (!(await this.isDebuggeeRunning())) {
			log('Debuggee is not running. Setting breakpoints without halting.');
			await this.setBreakPoints(response, args);
		} else {
			// Skip stop event if a continue request is running.
			this.skipStopEventOnce = this.continueRequestRunning;
			const haltedDuringNext = this.nextRequestRunning;
			if (haltedDuringNext) {
				this.overrideStopReason = 'next cancelled';
			}

			log(`Halting before setting breakpoints. SkipStopEventOnce is ${this.skipStopEventOnce}.`);
			this.delve?.callPromise('Command', [{ name: 'halt' }]).then(
				() => {
					return this.setBreakPoints(response, args).then(() => {
						// We do not want to continue if it was running a next request, since the
						// request was automatically cancelled.
						if (haltedDuringNext) {
							// Send an output event containing a warning that next was cancelled.
							const warning =
								"Setting breakpoints during 'next', 'step in' or 'step out' halted delve and cancelled the next request";
							this.sendEvent(new OutputEvent(warning, 'stderr'));
							return;
						}
						return this.continue(true).then(undefined, (err) => {
							this.logDelveError(err, 'Failed to continue delve after halting it to set breakpoints');
						});
					});
				},
				(err) => {
					this.skipStopEventOnce = false;
					this.logDelveError(err, 'Failed to halt delve before attempting to set breakpoint');
					return this.sendErrorResponse(
						response,
						2008,
						'Failed to halt delve before attempting to set breakpoint: "{e}"',
						{ e: err.toString() }
					);
				}
			);
		}
	}

	protected async threadsRequest(response: DebugProtocol.ThreadsResponse): Promise<void> {
		if (await this.isDebuggeeRunning()) {
			// Thread request to delve is synchronous and will block if a previous async continue request didn't return
			response.body = { threads: [new Thread(1, 'Dummy')] };
			return this.sendResponse(response);
		} else if (this.debugState && this.debugState.exited) {
			// If the program exits very quickly, the initial threadsRequest will complete after it has exited.
			// A TerminatedEvent has already been sent. d
			response.body = { threads: [] };
			return this.sendResponse(response);
		}
		log('ThreadsRequest');
		this.delve?.call<DebugGoroutine[] | ListGoroutinesOut>('ListGoroutines', [], (err, out) => {
			if (this.debugState && this.debugState.exited) {
				// If the program exits very quickly, the initial threadsRequest will complete after it has exited.
				// A TerminatedEvent has already been sent. Ignore the err returned in this case.
				response.body = { threads: [] };
				return this.sendResponse(response);
			}

			if (err) {
				this.logDelveError(err, 'Failed to get threads');
				return this.sendErrorResponse(response, 2003, 'Unable to display threads: "{e}"', {
					e: err.toString()
				});
			}
			const goroutines = this.delve?.isApiV1 ? <DebugGoroutine[]>out : (<ListGoroutinesOut>out).Goroutines;
			log('goroutines', goroutines);
			const threads = goroutines.map(
				(goroutine) =>
					new Thread(
						goroutine.id,
						goroutine.userCurrentLoc.function
							? goroutine.userCurrentLoc.function.name
							: goroutine.userCurrentLoc.file + '@' + goroutine.userCurrentLoc.line
					)
			);
			if (threads.length === 0) {
				threads.push(new Thread(1, 'Dummy'));
			}
			response.body = { threads };
			this.sendResponse(response);
			log('ThreadsResponse', threads);
		});
	}

	protected async stackTraceRequest(
		response: DebugProtocol.StackTraceResponse,
		args: DebugProtocol.StackTraceArguments
	): Promise<void> {
		log('StackTraceRequest');
		// For normal VSCode, this request doesn't get invoked when we send a Dummy thread
		// in the scenario where the debuggee is running.
		// For Theia, however, this does get invoked and so we should just send an error
		// response that we cannot get the stack trace at this point since the debugggee is running.
		if (await this.isDebuggeeRunning()) {
			this.sendErrorResponse(response, 2004, 'Unable to produce stack trace as the debugger is running');
			return;
		}

		// delve does not support frame paging, so we ask for a large depth
		const goroutineId = args.threadId;
		const stackTraceIn = { id: goroutineId, depth: this.delve?.stackTraceDepth };
		if (!this.delve?.isApiV1) {
			Object.assign(stackTraceIn, { full: false, cfg: this.delve?.loadConfig });
		}
		this.delve?.call<DebugLocation[] | StacktraceOut>(
			this.delve?.isApiV1 ? 'StacktraceGoroutine' : 'Stacktrace',
			[stackTraceIn],
			async (err, out) => {
				if (err) {
					this.logDelveError(err, 'Failed to produce stacktrace');
					return this.sendErrorResponse(
						response,
						2004,
						'Unable to produce stack trace: "{e}"',
						{ e: err.toString() },
						// Disable showUser pop-up since errors already show up under the CALL STACK pane
						undefined
					);
				}
				const locations = this.delve?.isApiV1 ? <DebugLocation[]>out : (<StacktraceOut>out).Locations;
				log('locations', locations);

				if (this.delve?.isRemoteDebugging) {
					await this.initializeRemotePackagesAndSources();
				}

				let stackFrames = locations.map((location, frameId) => {
					const uniqueStackFrameId = this.stackFrameHandles.create([goroutineId, frameId]);
					return new StackFrame(
						uniqueStackFrameId,
						location.function ? location.function.name : '<unknown>',
						location.file === '<autogenerated>'
							? undefined
							: new Source(path.basename(location.file), this.toLocalPath(location.file)),
						location.line,
						0
					);
				});
				const { startFrame = 0, levels = 0 } = args;
				if (startFrame > 0) {
					stackFrames = stackFrames.slice(startFrame);
				}
				if (levels > 0) {
					stackFrames = stackFrames.slice(0, levels);
				}
				response.body = { stackFrames, totalFrames: locations.length };
				this.sendResponse(response);
				log('StackTraceResponse');
			}
		);
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		log('ScopesRequest');
		// TODO(polinasok): this.stackFrameHandles.get should succeed as long as DA
		// clients behaves well. Find the documentation around stack frame management
		// and in case of a failure caused by misbehavior, consider to indicate it
		// in the error response.
		const [goroutineId, frameId] = this.stackFrameHandles.get(args.frameId);
		const listLocalVarsIn = { goroutineID: goroutineId, frame: frameId };
		this.delve?.call<DebugVariable[] | ListVarsOut>(
			'ListLocalVars',
			this.delve?.isApiV1 ? [listLocalVarsIn] : [{ scope: listLocalVarsIn, cfg: this.delve?.loadConfig }],
			(err, out) => {
				if (err) {
					this.logDelveError(err, 'Failed to get list local variables');
					return this.sendErrorResponse(response, 2005, 'Unable to list locals: "{e}"', {
						e: err.toString()
					});
				}
				const locals = this.delve?.isApiV1 ? <DebugVariable[]>out : (<ListVarsOut>out).Variables;
				log('locals', locals);
				this.addFullyQualifiedName(locals);
				const listLocalFunctionArgsIn = { goroutineID: goroutineId, frame: frameId };
				this.delve?.call<DebugVariable[] | ListFunctionArgsOut>(
					'ListFunctionArgs',
					this.delve?.isApiV1
						? [listLocalFunctionArgsIn]
						: [{ scope: listLocalFunctionArgsIn, cfg: this.delve?.loadConfig }],
					(listFunctionErr, outArgs) => {
						if (listFunctionErr) {
							this.logDelveError(listFunctionErr, 'Failed to list function args');
							return this.sendErrorResponse(response, 2006, 'Unable to list args: "{e}"', {
								e: listFunctionErr.toString()
							});
						}
						const vars = this.delve?.isApiV1
							? <DebugVariable[]>outArgs
							: (<ListFunctionArgsOut>outArgs).Args;
						log('functionArgs', vars);
						this.addFullyQualifiedName(vars);
						vars.push(...locals);
						// annotate shadowed variables in parentheses
						const shadowedVars = new Map<string, Array<number>>();
						for (let i = 0; i < vars.length; ++i) {
							if ((vars[i].flags & GoVariableFlags.VariableShadowed) === 0) {
								continue;
							}
							const varName = vars[i].name;
							if (!shadowedVars.has(varName)) {
								const indices = new Array<number>();
								indices.push(i);
								shadowedVars.set(varName, indices);
							} else {
								shadowedVars.get(varName)?.push(i);
							}
						}
						for (const svIndices of shadowedVars.values()) {
							// sort by declared line number in descending order
							svIndices.sort((lhs: number, rhs: number) => {
								return vars[rhs].DeclLine - vars[lhs].DeclLine;
							});
							// enclose in parentheses, one pair per scope
							for (let scope = 0; scope < svIndices.length; ++scope) {
								const svIndex = svIndices[scope];
								// start at -1 so scope of 0 has one pair of parens
								for (let count = -1; count < scope; ++count) {
									vars[svIndex].name = `(${vars[svIndex].name})`;
								}
							}
						}
						const scopes = new Array<Scope>();
						const localVariables: DebugVariable = {
							name: 'Local',
							addr: 0,
							type: '',
							realType: '',
							kind: 0,
							flags: 0,
							onlyAddr: false,
							DeclLine: 0,
							value: '',
							len: 0,
							cap: 0,
							children: vars,
							unreadable: '',
							fullyQualifiedName: '',
							base: 0
						};

						scopes.push(new Scope('Local', this.variableHandles.create(localVariables), false));
						response.body = { scopes };

						if (!this.showGlobalVariables) {
							this.sendResponse(response);
							log('ScopesResponse');
							return;
						}

						this.getPackageInfo(this.debugState).then((packageName) => {
							if (!packageName) {
								this.sendResponse(response);
								log('ScopesResponse');
								return;
							}
							const filter = `^${packageName}\\.`;
							this.delve?.call<DebugVariable[] | ListVarsOut>(
								'ListPackageVars',
								this.delve?.isApiV1 ? [filter] : [{ filter, cfg: this.delve?.loadConfig }],
								(listPkgVarsErr, listPkgVarsOut) => {
									if (listPkgVarsErr) {
										this.logDelveError(listPkgVarsErr, 'Failed to list global vars');
										return this.sendErrorResponse(
											response,
											2007,
											'Unable to list global vars: "{e}"',
											{ e: listPkgVarsErr.toString() }
										);
									}
									const globals = this.delve?.isApiV1
										? <DebugVariable[]>listPkgVarsOut
										: (<ListVarsOut>listPkgVarsOut).Variables;
									let initdoneIndex = -1;
									for (let i = 0; i < globals.length; i++) {
										globals[i].name = globals[i].name.substr(packageName.length + 1);
										if (initdoneIndex === -1 && globals[i].name === this.initdone) {
											initdoneIndex = i;
										}
									}
									if (initdoneIndex > -1) {
										globals.splice(initdoneIndex, 1);
									}
									log('global vars', globals);

									const globalVariables: DebugVariable = {
										name: 'Global',
										addr: 0,
										type: '',
										realType: '',
										kind: 0,
										flags: 0,
										onlyAddr: false,
										DeclLine: 0,
										value: '',
										len: 0,
										cap: 0,
										children: globals,
										unreadable: '',
										fullyQualifiedName: '',
										base: 0
									};
									scopes.push(
										new Scope('Global', this.variableHandles.create(globalVariables), false)
									);
									this.sendResponse(response);
									log('ScopesResponse');
								}
							);
						});
					}
				);
			}
		);
	}

	protected variablesRequest(
		response: DebugProtocol.VariablesResponse,
		args: DebugProtocol.VariablesArguments
	): void {
		log('VariablesRequest');
		const vari = this.variableHandles.get(args.variablesReference);
		let variablesPromise: Promise<DebugProtocol.Variable[]> | undefined;
		const loadChildren = async (exp: string, v: DebugVariable) => {
			// from https://github.com/go-delve/delve/blob/master/Documentation/api/ClientHowto.md#looking-into-variables
			if (
				(v.kind === GoReflectKind.Struct && v.len > v.children.length) ||
				(v.kind === GoReflectKind.Interface && v.children.length > 0 && v.children[0].onlyAddr === true)
			) {
				await this.evaluateRequestImpl({ expression: exp }).then(
					(result) => {
						const variable = this.delve?.isApiV1 ? <DebugVariable>result : (<EvalOut>result).Variable;
						v.children = variable.children;
					},
					(err) => this.logDelveError(err, 'Failed to evaluate expression')
				);
			}
		};
		// expressions passed to loadChildren defined per
		// https://github.com/go-delve/delve/blob/master/Documentation/api/ClientHowto.md#loading-more-of-a-variable
		if (vari.kind === GoReflectKind.Array || vari.kind === GoReflectKind.Slice) {
			variablesPromise = Promise.all(
				vari.children.map((v, i) => {
					return loadChildren(`*(*"${v.type}")(${v.addr})`, v).then(
						(): DebugProtocol.Variable => {
							const { result, variablesReference } = this.convertDebugVariableToProtocolVariable(v);
							return {
								name: '[' + i + ']',
								value: result,
								evaluateName: vari.fullyQualifiedName + '[' + i + ']',
								variablesReference
							};
						}
					);
				})
			);
		} else if (vari.kind === GoReflectKind.Map) {
			variablesPromise = Promise.all(
				vari.children
					.map((_, i) => {
						// even indices are map keys, odd indices are values
						if (i % 2 === 0 && i + 1 < vari.children.length) {
							const mapKey = this.convertDebugVariableToProtocolVariable(vari.children[i]);
							return loadChildren(
								`${vari.fullyQualifiedName}.${vari.name}[${mapKey.result}]`,
								vari.children[i + 1]
							).then(() => {
								const mapValue = this.convertDebugVariableToProtocolVariable(vari.children[i + 1]);
								return {
									name: mapKey.result,
									value: mapValue.result,
									evaluateName: vari.fullyQualifiedName + '[' + mapKey.result + ']',
									variablesReference: mapValue.variablesReference
								} as DebugProtocol.Variable;
							});
						}
					})
					.filter((v): v is Promise<DebugProtocol.Variable> => !!v) // remove the null values created by combining keys and values
			);
		} else {
			variablesPromise = Promise.all(
				vari.children.map((v) => {
					return loadChildren(`*(*"${v.type}")(${v.addr})`, v).then(
						(): DebugProtocol.Variable => {
							const { result, variablesReference } = this.convertDebugVariableToProtocolVariable(v);

							return {
								name: v.name,
								value: result,
								evaluateName: v.fullyQualifiedName,
								variablesReference
							};
						}
					);
				})
			);
		}
		variablesPromise.then((variables) => {
			response.body = { variables };
			this.sendResponse(response);
			log('VariablesResponse', JSON.stringify(variables, null, ' '));
		});
	}

	protected continueRequest(response: DebugProtocol.ContinueResponse): void {
		log('ContinueRequest');
		this.continue();
		this.sendResponse(response);
		log('ContinueResponse');
	}

	protected nextRequest(response: DebugProtocol.NextResponse): void {
		this.nextEpoch++;
		const closureEpoch = this.nextEpoch;
		this.nextRequestRunning = true;

		log('NextRequest');
		this.delve?.call<DebuggerState | CommandOut>('Command', [{ name: 'next' }], (err, out) => {
			if (closureEpoch === this.continueEpoch) {
				this.nextRequestRunning = false;
			}

			if (err) {
				this.logDelveError(err, 'Failed to next');
			}
			const state = this.delve?.isApiV1 ? <DebuggerState>out : (<CommandOut>out).State;
			log('next state', state);
			this.debugState = state;
			this.handleReenterDebug('step');
		});
		// All threads are resumed on a next request
		this.sendEvent(new ContinuedEvent(1, true));
		this.sendResponse(response);
		log('NextResponse');
	}

	protected stepInRequest(response: DebugProtocol.StepInResponse): void {
		this.nextEpoch++;
		const closureEpoch = this.nextEpoch;
		this.nextRequestRunning = true;

		log('StepInRequest');
		this.delve?.call<DebuggerState | CommandOut>('Command', [{ name: 'step' }], (err, out) => {
			if (closureEpoch === this.continueEpoch) {
				this.nextRequestRunning = false;
			}

			if (err) {
				this.logDelveError(err, 'Failed to step in');
			}
			const state = this.delve?.isApiV1 ? <DebuggerState>out : (<CommandOut>out).State;
			log('stop state', state);
			this.debugState = state;
			this.handleReenterDebug('step');
		});
		// All threads are resumed on a step in request
		this.sendEvent(new ContinuedEvent(1, true));
		this.sendResponse(response);
		log('StepInResponse');
	}

	protected stepOutRequest(response: DebugProtocol.StepOutResponse): void {
		this.nextEpoch++;
		const closureEpoch = this.nextEpoch;
		this.nextRequestRunning = true;

		log('StepOutRequest');
		this.delve?.call<DebuggerState | CommandOut>('Command', [{ name: 'stepOut' }], (err, out) => {
			if (closureEpoch === this.continueEpoch) {
				this.nextRequestRunning = false;
			}

			if (err) {
				this.logDelveError(err, 'Failed to step out');
			}
			const state = this.delve?.isApiV1 ? <DebuggerState>out : (<CommandOut>out).State;
			log('stepout state', state);
			this.debugState = state;
			this.handleReenterDebug('step');
		});
		// All threads are resumed on a step out request
		this.sendEvent(new ContinuedEvent(1, true));
		this.sendResponse(response);
		log('StepOutResponse');
	}

	protected pauseRequest(response: DebugProtocol.PauseResponse): void {
		log('PauseRequest');
		this.delve?.call<DebuggerState | CommandOut>('Command', [{ name: 'halt' }], (err, out) => {
			if (err) {
				this.logDelveError(err, 'Failed to halt');
				return this.sendErrorResponse(response, 2010, 'Unable to halt execution: "{e}"', {
					e: err.toString()
				});
			}
			const state = this.delve?.isApiV1 ? <DebuggerState>out : (<CommandOut>out).State;
			log('pause state', state);
			this.debugState = state;
			this.handleReenterDebug('pause');
		});
		this.sendResponse(response);
		log('PauseResponse');
	}

	// evaluateRequest is used both for the traditional expression evaluation
	// (https://github.com/go-delve/delve/blob/master/Documentation/cli/expr.md) and
	// for the 'call' command support.
	// If the args.expression starts with the 'call' keyword followed by an expression that looks
	// like a function call, the request is interpreted as a 'call' command request,
	// and otherwise, interpreted as `print` command equivalent with RPCServer.Eval.
	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
		log('EvaluateRequest');
		// Captures pattern that looks like the expression that starts with `call<space>`
		// command call. This is supported only with APIv2.
		const isCallCommand = args.expression.match(/^\s*call\s+\S+/);
		if (!this.delve?.isApiV1 && isCallCommand) {
			this.evaluateCallImpl(args).then(
				(out) => {
					const state = (<CommandOut>out).State;
					const returnValues = state?.currentThread?.ReturnValues ?? [];
					switch (returnValues.length) {
						case 0:
							response.body = { result: '', variablesReference: 0 };
							break;
						case 1:
							response.body = this.convertDebugVariableToProtocolVariable(returnValues[0]);
							break;
						default:
							// Go function can return multiple return values while
							// DAP EvaluateResponse assumes a single result with possibly
							// multiple children. So, create a fake DebugVariable
							// that has all the results as children.
							const returnResults = this.wrapReturnVars(returnValues);
							response.body = this.convertDebugVariableToProtocolVariable(returnResults);
							break;
					}
					this.sendResponse(response);
					log('EvaluateCallResponse');
				},
				(err) => {
					this.sendErrorResponse(
						response,
						2009,
						'Unable to complete call: "{e}"',
						{
							e: err.toString()
						},
						args.context === 'watch' ? undefined : ErrorDestination.User
					);
				}
			);
			return;
		}
		// Now handle it as a conventional evaluateRequest.
		this.evaluateRequestImpl(args).then(
			(out) => {
				const variable = this.delve?.isApiV1 ? <DebugVariable>out : (<EvalOut>out).Variable;
				// #2326: Set the fully qualified name for variable mapping
				variable.fullyQualifiedName = variable.name;
				response.body = this.convertDebugVariableToProtocolVariable(variable);
				this.sendResponse(response);
				log('EvaluateResponse');
			},
			(err) => {
				// No need to repeatedly show the error pop-up when expressions
				// are continuously reevaluated in the Watch panel, which
				// already displays errors.
				this.sendErrorResponse(
					response,
					2009,
					'Unable to eval expression: "{e}"',
					{
						e: err.toString()
					},
					args.context === 'watch' ? undefined : ErrorDestination.User
				);
			}
		);
	}

	protected setVariableRequest(
		response: DebugProtocol.SetVariableResponse,
		args: DebugProtocol.SetVariableArguments
	): void {
		log('SetVariableRequest');
		const scope = {
			goroutineID: this.debugState?.currentGoroutine.id
		};
		const setSymbolArgs = {
			Scope: scope,
			Symbol: args.name,
			Value: args.value
		};
		this.delve?.call(this.delve?.isApiV1 ? 'SetSymbol' : 'Set', [setSymbolArgs], (err) => {
			if (err) {
				const errMessage = `Failed to set variable: ${err.toString()}`;
				this.logDelveError(err, 'Failed to set variable');
				return this.sendErrorResponse(response, 2010, errMessage);
			}
			response.body = { value: args.value };
			this.sendResponse(response);
			log('SetVariableResponse');
		});
	}

	private getGOROOT(): string {
		if (this.delve && this.delve?.goroot) {
			return this.delve?.goroot;
		}
		return process.env['GOROOT'] || '';
		// this is a workaround to keep the tests in integration/goDebug.test.ts running.
		// The tests synthesize a bogus Delve instance.
	}

	// contains common code for launch and attach debugging initialization
	private initLaunchAttachRequest(
		response: DebugProtocol.LaunchResponse,
		args: LaunchRequestArguments | AttachRequestArguments
	) {
		this.logLevel =
			args.trace === 'verbose' || args.trace === 'trace'
				? Logger.LogLevel.Verbose
				: args.trace === 'log' || args.trace === 'info' || args.trace === 'warn'
				? Logger.LogLevel.Log
				: Logger.LogLevel.Error;
		const logPath =
			this.logLevel !== Logger.LogLevel.Error ? path.join(os.tmpdir(), 'vscode-go-debug.txt') : undefined;
		logger.setup(this.logLevel, logPath);

		if (typeof args.showGlobalVariables === 'boolean') {
			this.showGlobalVariables = args.showGlobalVariables;
		}
		if (args.stopOnEntry) {
			this.stopOnEntry = args.stopOnEntry;
		}
		if (!args.port) {
			args.port = random(2000, 50000);
		}
		if (!args.host) {
			args.host = '127.0.0.1';
		}

		let localPath = '';
		if (args.request === 'attach') {
			localPath = args.cwd ?? '';
		} else if (args.request === 'launch') {
			localPath = args.program;
		}
		if (!args.remotePath) {
			// too much code relies on remotePath never being null
			args.remotePath = '';
		}

		this.localPathSeparator = findPathSeparator(localPath);
		this.substitutePath = [];
		if (args.remotePath.length > 0) {
			this.remotePathSeparator = findPathSeparator(args.remotePath);

			const llist = localPath?.split(/\/|\\/).reverse();
			const rlist = args.remotePath.split(/\/|\\/).reverse();
			let i = 0;
			for (; llist && i < llist.length; i++) {
				if (llist[i] !== rlist[i] || llist[i] === 'src') {
					break;
				}
			}

			if (i) {
				localPath = llist?.reverse().slice(0, -i).join(this.localPathSeparator) + this.localPathSeparator;
				args.remotePath =
					rlist.reverse().slice(0, -i).join(this.remotePathSeparator) + this.remotePathSeparator;
			} else if (
				args.remotePath.length > 1 &&
				(args.remotePath.endsWith('\\') || args.remotePath.endsWith('/'))
			) {
				args.remotePath = args.remotePath.substring(0, args.remotePath.length - 1);
			}

			// Make the remotePath mapping the first one in substitutePath
			// so that it will take precedence over the other mappings.
			this.substitutePath.push({
				from: normalizeSeparators(localPath),
				to: normalizeSeparators(args.remotePath)
			});
		}

		if (args.substitutePath) {
			args.substitutePath.forEach((value) => {
				if (!this.remotePathSeparator) {
					this.remotePathSeparator = findPathSeparator(value.to);
				}
				this.substitutePath?.push({
					from: normalizeSeparators(value.from),
					to: normalizeSeparators(value.to)
				});
			});
		}

		// Launch the Delve debugger on the program
		this.delve = new Delve(args, localPath);
		this.delve.onstdout = (str: string) => {
			this.sendEvent(new OutputEvent(str, 'stdout'));
		};
		this.delve.onstderr = (str: string) => {
			if (localPath.length > 0) {
				str = expandFilePathInOutput(str, localPath);
			}
			this.sendEvent(new OutputEvent(str, 'stderr'));
		};
		this.delve.onclose = (code) => {
			if (code !== 0) {
				this.sendErrorResponse(response, 3000, 'Failed to continue: Check the debug console for details.');
			}
			log('Sending TerminatedEvent as delve is closed');
			this.sendEvent(new TerminatedEvent());
		};

		this.delve?.connection.then(
			() => {
				if (!this.delve?.noDebug) {
					this.delve?.call<GetVersionOut>('GetVersion', [], (err, out) => {
						if (err) {
							logError(err);
							return this.sendErrorResponse(
								response,
								2001,
								'Failed to get remote server version: "{e}"',
								{ e: err.toString() }
							);
						}
						const clientVersion = this.delve?.isApiV1 ? 1 : 2;
						if (out?.APIVersion !== clientVersion) {
							const errorMessage = `The remote server is running on delve v${out?.APIVersion} API and the client is running v${clientVersion} API. Change the version used on the client by using the property "apiVersion" in your launch.json file.`;
							logError(errorMessage);
							return this.sendErrorResponse(response, 3000, errorMessage);
						}
					});

					this.sendEvent(new InitializedEvent());
					log('InitializeEvent');
				}
				this.sendResponse(response);
			},
			(err) => {
				this.sendErrorResponse(response, 3000, 'Failed to continue: "{e}"', {
					e: err.toString()
				});
				log('ContinueResponse');
			}
		);
	}

	/**
	 * Initializing remote packages and sources.
	 * We use event model to prevent race conditions.
	 */
	private async initializeRemotePackagesAndSources(): Promise<void> {
		if (this.remoteSourcesAndPackages.initializedRemoteSourceFiles) {
			return;
		}

		if (!this.remoteSourcesAndPackages.initializingRemoteSourceFiles) {
			if (!this.delve) {
				return;
			}
			try {
				await this.remoteSourcesAndPackages.initializeRemotePackagesAndSources(this.delve);
			} catch (error) {
				log(`Failing to initialize remote sources: ${error}`);
			}
			return;
		}

		if (this.remoteSourcesAndPackages.initializingRemoteSourceFiles) {
			try {
				await new Promise<void>((resolve) => {
					this.remoteSourcesAndPackages.on(RemoteSourcesAndPackages.INITIALIZED, () => {
						resolve();
					});
				});
			} catch (error) {
				log(`Failing to initialize remote sources: ${error}`);
			}
		}
	}

	private async setBreakPoints(
		response: DebugProtocol.SetBreakpointsResponse,
		args: DebugProtocol.SetBreakpointsArguments
	): Promise<void> {
		const file = normalizePath(args.source.path ?? '');
		if (!this.breakpoints.get(file)) {
			this.breakpoints.set(file, []);
		}
		const remoteFile = await this.toDebuggerPath(file);

		return Promise.all(
			this.breakpoints.get(file)?.map((existingBP) => {
				log('Clearing: ' + existingBP.id);
				return this.delve?.callPromise('ClearBreakpoint', [
					this.delve?.isApiV1 ? existingBP.id : { Id: existingBP.id }
				]);
			}) ?? []
		)
			.then(() => {
				log('All cleared');
				let existingBreakpoints: DebugBreakpoint[] | undefined;
				return Promise.all(
					args.breakpoints?.map((breakpoint) => {
						if (this.delve?.remotePath?.length === 0) {
							log('Creating on: ' + file + ':' + breakpoint.line);
						} else {
							log('Creating on: ' + file + ' (' + remoteFile + ') :' + breakpoint.line);
						}
						const breakpointIn = <DebugBreakpoint>{};
						breakpointIn.file = remoteFile;
						breakpointIn.line = breakpoint.line;
						breakpointIn.loadArgs = this.delve?.loadConfig;
						breakpointIn.loadLocals = this.delve?.loadConfig;
						breakpointIn.cond = breakpoint.condition;
						return this.delve
							?.callPromise('CreateBreakpoint', [
								this.delve?.isApiV1 ? breakpointIn : { Breakpoint: breakpointIn }
							])
							.then(undefined, async (err) => {
								// Delve does not seem to support error code at this time.
								// TODO(quoct): Follow up with delve team.
								if (err.toString().startsWith('Breakpoint exists at')) {
									log('Encounter existing breakpoint: ' + breakpointIn);
									// We need to call listbreakpoints to find the ID.
									// Otherwise, we would not be able to clear the breakpoints.
									if (!existingBreakpoints) {
										try {
											const listBreakpointsResponse = await this.delve?.callPromise<
												ListBreakpointsOut | DebugBreakpoint[]
											>('ListBreakpoints', this.delve?.isApiV1 ? [] : [{}]);
											existingBreakpoints = this.delve?.isApiV1
												? (listBreakpointsResponse as DebugBreakpoint[])
												: (listBreakpointsResponse as ListBreakpointsOut).Breakpoints;
										} catch (error) {
											log('Error listing breakpoints: ' + error);
											return null;
										}
									}

									// Make sure that we compare the file names with the same separators.
									const matchedBreakpoint = existingBreakpoints.find(
										(existingBreakpoint) =>
											existingBreakpoint.line === breakpointIn.line &&
											compareFilePathIgnoreSeparator(existingBreakpoint.file, breakpointIn.file)
									);

									if (!matchedBreakpoint) {
										log(`Cannot match breakpoint ${breakpointIn} with existing breakpoints.`);
										return null;
									}
									return this.delve?.isApiV1 ? matchedBreakpoint : { Breakpoint: matchedBreakpoint };
								}
								log('Error on CreateBreakpoint: ' + err.toString());
								return null;
							});
					}) ?? []
				);
			})
			.then((newBreakpoints) => {
				let convertedBreakpoints: (DebugBreakpoint | null)[];
				if (!this.delve?.isApiV1) {
					// Unwrap breakpoints from v2 apicall
					convertedBreakpoints = newBreakpoints.map((bp, i) => {
						return bp ? (bp as CreateBreakpointOut).Breakpoint : null;
					});
				} else {
					convertedBreakpoints = newBreakpoints as DebugBreakpoint[];
				}

				log('All set:' + JSON.stringify(newBreakpoints));
				const breakpoints = convertedBreakpoints.map((bp, i) => {
					if (bp) {
						return { verified: true, line: bp.line };
					} else {
						return { verified: false, line: args.lines?.[i] };
					}
				});
				this.breakpoints.set(
					file,
					convertedBreakpoints.filter((x): x is DebugBreakpoint => !!x)
				);
				return breakpoints;
			})
			.then(
				(breakpoints) => {
					response.body = { breakpoints };
					this.sendResponse(response);
					log('SetBreakPointsResponse');
				},
				(err) => {
					this.sendErrorResponse(response, 2002, 'Failed to set breakpoint: "{e}"', {
						e: err.toString()
					});
					logError(err);
				}
			);
	}

	private async getPackageInfo(debugState: DebuggerState | undefined): Promise<string | void> {
		if (!debugState || !debugState.currentThread || !debugState.currentThread.file) {
			return Promise.resolve();
		}
		if (this.delve?.isRemoteDebugging) {
			await this.initializeRemotePackagesAndSources();
		}
		const dir = path.dirname(
			this.delve?.remotePath?.length || this.delve?.isRemoteDebugging
				? this.toLocalPath(debugState.currentThread.file)
				: debugState.currentThread.file
		);
		if (this.packageInfo.has(dir)) {
			return Promise.resolve(this.packageInfo.get(dir));
		}
		return new Promise((resolve) => {
			execFile(
				getBinPathWithPreferredGopathGoroot('go', []),
				['list', '-f', '{{.Name}} {{.ImportPath}}'],
				{ cwd: dir, env: this.delve?.dlvEnv },
				(err, stdout, stderr) => {
					if (err || stderr || !stdout) {
						logError(`go list failed on ${dir}: ${stderr || err}`);
						return resolve();
					}
					if (stdout.split('\n').length !== 2) {
						logError(`Cannot determine package for ${dir}`);
						return resolve();
					}
					const spaceIndex = stdout.indexOf(' ');
					const result = stdout.substr(0, spaceIndex) === 'main' ? 'main' : stdout.substr(spaceIndex).trim();
					this.packageInfo.set(dir, result);
					resolve(result);
				}
			);
		});
	}

	// Go might return more than one result while DAP and VS Code do not support
	// such scenario but assume one single result. So, wrap all return variables
	// in one made-up, nameless, invalid variable. This is similar to how scopes
	// are represented. This assumes the vars are the ordered list of return
	// values from a function call.
	private wrapReturnVars(vars: DebugVariable[]): DebugVariable {
		// VS Code uses the value property of the DebugVariable
		// when displaying it. So let's formulate it in a user friendly way
		// as if they look like a list of multiple values.
		// Note: we use only convertDebugVariableToProtocolVariable's result,
		// which means we will leak the variable references until the handle
		// map is cleared. Assuming the number of return parameters is handful,
		// this waste shouldn't be significant.
		const values = vars.map((v) => this.convertDebugVariableToProtocolVariable(v).result) || [];
		return {
			value: values.join(', '),
			kind: GoReflectKind.Invalid,
			flags: GoVariableFlags.VariableFakeAddress | GoVariableFlags.VariableReturnArgument,
			children: vars,

			// DebugVariable requires the following fields.
			name: '',
			addr: 0,
			type: '',
			realType: '',
			onlyAddr: false,
			DeclLine: 0,
			len: 0,
			cap: 0,
			unreadable: '',
			base: 0,
			fullyQualifiedName: ''
		};
	}

	private convertDebugVariableToProtocolVariable(v: DebugVariable): { result: string; variablesReference: number } {
		if (v.kind === GoReflectKind.UnsafePointer) {
			return {
				result: `unsafe.Pointer(0x${v.children[0].addr.toString(16)})`,
				variablesReference: 0
			};
		} else if (v.kind === GoReflectKind.Ptr) {
			if (!v.children[0]) {
				return {
					result: 'unknown <' + v.type + '>',
					variablesReference: 0
				};
			} else if (v.children[0].addr === 0) {
				return {
					result: 'nil <' + v.type + '>',
					variablesReference: 0
				};
			} else if (v.children[0].type === 'void') {
				return {
					result: 'void',
					variablesReference: 0
				};
			} else {
				if (v.children[0].children.length > 0) {
					// Generate correct fullyQualified names for variable expressions
					v.children[0].fullyQualifiedName = v.fullyQualifiedName;
					v.children[0].children.forEach((child) => {
						child.fullyQualifiedName = v.fullyQualifiedName + '.' + child.name;
					});
				}
				return {
					result: `<${v.type}>(0x${v.children[0].addr.toString(16)})`,
					variablesReference: v.children.length > 0 ? this.variableHandles.create(v) : 0
				};
			}
		} else if (v.kind === GoReflectKind.Slice) {
			if (v.base === 0) {
				return {
					result: 'nil <' + v.type + '>',
					variablesReference: 0
				};
			}
			return {
				result: '<' + v.type + '> (length: ' + v.len + ', cap: ' + v.cap + ')',
				variablesReference: this.variableHandles.create(v)
			};
		} else if (v.kind === GoReflectKind.Map) {
			if (v.base === 0) {
				return {
					result: 'nil <' + v.type + '>',
					variablesReference: 0
				};
			}
			return {
				result: '<' + v.type + '> (length: ' + v.len + ')',
				variablesReference: this.variableHandles.create(v)
			};
		} else if (v.kind === GoReflectKind.Array) {
			return {
				result: '<' + v.type + '>',
				variablesReference: this.variableHandles.create(v)
			};
		} else if (v.kind === GoReflectKind.String) {
			let val = v.value;
			const byteLength = Buffer.byteLength(val || '');
			if (v.value && byteLength < v.len) {
				val += `...+${v.len - byteLength} more`;
			}
			return {
				result: v.unreadable ? '<' + v.unreadable + '>' : '"' + val + '"',
				variablesReference: 0
			};
		} else if (v.kind === GoReflectKind.Interface) {
			if (v.addr === 0) {
				// an escaped interface variable that points to nil, this shouldn't
				// happen in normal code but can happen if the variable is out of scope.
				return {
					result: 'nil',
					variablesReference: 0
				};
			}

			if (v.children.length === 0) {
				// Shouldn't happen, but to be safe.
				return {
					result: 'nil',
					variablesReference: 0
				};
			}
			const child = v.children[0];
			if (child.kind === GoReflectKind.Invalid && child.addr === 0) {
				return {
					result: `nil <${v.type}>`,
					variablesReference: 0
				};
			}
			return {
				// TODO(hyangah): v.value will be useless. consider displaying more info from the child.
				// https://github.com/go-delve/delve/blob/930fa3b/service/api/prettyprint.go#L106-L124
				result: v.value || `<${v.type}(${child.type})>)`,
				variablesReference: v.children?.length > 0 ? this.variableHandles.create(v) : 0
			};
		} else {
			// Default case - structs
			if (v.children.length > 0) {
				// Generate correct fullyQualified names for variable expressions
				v.children.forEach((child) => {
					child.fullyQualifiedName = v.fullyQualifiedName + '.' + child.name;
				});
			}
			return {
				result: v.value || '<' + v.type + '>',
				variablesReference: v.children.length > 0 ? this.variableHandles.create(v) : 0
			};
		}
	}

	private cleanupHandles(): void {
		this.variableHandles.reset();
		this.stackFrameHandles.reset();
	}

	private handleReenterDebug(reason: string): void {
		log(`handleReenterDebug(${reason}).`);
		this.cleanupHandles();

		if (this.debugState?.exited) {
			this.sendEvent(new TerminatedEvent());
			log('TerminatedEvent');
		} else {
			// Delve blocks on continue and does not support events, so there is no way to
			// refresh the list of goroutines while the program is running. And when the program is
			// stopped, the development tool will issue a threads request and update the list of
			// threads in the UI even without the optional thread events. Therefore, instead of
			// analyzing all goroutines here, only retrieve the current one.
			// TODO(polina): validate the assumption in this code that the first goroutine
			// is the current one. So far it appears to me that this is always the main goroutine
			// with id 1.
			this.delve?.call<DebugGoroutine[] | ListGoroutinesOut>('ListGoroutines', [{ count: 1 }], (err, out) => {
				if (err) {
					this.logDelveError(err, 'Failed to get threads');
				}
				const goroutines = this.delve?.isApiV1 ? <DebugGoroutine[]>out : (<ListGoroutinesOut>out).Goroutines;
				if (this.debugState && !this.debugState?.currentGoroutine && goroutines.length > 0) {
					this.debugState.currentGoroutine = goroutines[0];
				}

				if (this.skipStopEventOnce) {
					log(
						`Skipping stop event for ${reason}. The current Go routines is ${this.debugState?.currentGoroutine}.`
					);
					this.skipStopEventOnce = false;
					return;
				}

				if (this.overrideStopReason?.length > 0) {
					reason = this.overrideStopReason;
					this.overrideStopReason = '';
				}

				const stoppedEvent = new StoppedEvent(reason, this.debugState?.currentGoroutine.id);
				(<any>stoppedEvent.body).allThreadsStopped = true;
				this.sendEvent(stoppedEvent);
				log('StoppedEvent("' + reason + '")');
			});
		}
	}

	// Returns true if the debuggee is running.
	// The call getDebugState is non-blocking so it should return
	// almost instantaneously. However, if we run into some errors,
	// we will fall back to the internal tracking of the debug state.
	// TODO: If Delve is not in multi-client state, we can simply
	// track the running state with continueRequestRunning internally
	// instead of issuing a getDebugState call to Delve. Perhaps we want to
	// do that to improve performance in the future.
	private async isDebuggeeRunning(): Promise<boolean> {
		if (this.debugState && this.debugState.exited) {
			return false;
		}
		try {
			this.debugState = await this.delve?.getDebugState();
			return !!this.debugState?.Running;
		} catch (error) {
			this.logDelveError(error, 'Failed to get state');
			// Fall back to the internal tracking.
			return this.continueRequestRunning || this.nextRequestRunning;
		}
	}

	private shutdownProtocolServer(
		response: DebugProtocol.DisconnectResponse,
		args: DebugProtocol.DisconnectArguments
	): void {
		log('DisconnectRequest to parent to shut down protocol server.');
		super.disconnectRequest(response, args);
	}

	private continue(calledWhenSettingBreakpoint?: boolean): Thenable<void> {
		this.continueEpoch++;
		const closureEpoch = this.continueEpoch;
		this.continueRequestRunning = true;

		const callback = (out: any) => {
			if (closureEpoch === this.continueEpoch) {
				this.continueRequestRunning = false;
			}
			const state = this.delve?.isApiV1 ? <DebuggerState>out : (<CommandOut>out).State;
			log('continue state', state);
			this.debugState = state;

			let reason = 'breakpoint';
			// Check if the current thread was stopped on 'panic' or 'fatal error'.
			if (!!state.currentThread && !!state.currentThread.breakPoint) {
				const bp = state.currentThread.breakPoint;
				if (bp.id === unrecoveredPanicID) {
					// If the breakpoint is actually caused by a panic,
					// we want to return on "panic".
					reason = 'panic';
				} else if (bp.id === fatalThrowID) {
					// If the breakpoint is actually caused by a fatal throw,
					// we want to return on "fatal error".
					reason = 'fatal error';
				}
			}
			this.handleReenterDebug(reason);
		};

		// If called when setting breakpoint internally, we want the error to bubble up.
		let errorCallback = (_: unknown): any => void 0;
		if (!calledWhenSettingBreakpoint) {
			errorCallback = (err: any) => {
				if (err) {
					this.logDelveError(err, 'Failed to continue');
				}
				this.handleReenterDebug('breakpoint');
				throw err;
			};
		}

		if (this.delve) {
			return this.delve.callPromise('Command', [{ name: 'continue' }]).then(callback, errorCallback);
		}
		return Promise.resolve();
	}

	// evaluateCallImpl expects args.expression starts with the 'call ' command.
	private evaluateCallImpl(args: DebugProtocol.EvaluateArguments): Thenable<DebuggerState | CommandOut | void> {
		const callExpr = args.expression.trimLeft().slice('call '.length);
		// if args.frameID is 'not specified', expression is evaluated in the global scope, according to DAP.
		// default to the topmost stack frame of the current goroutine
		let goroutineId = -1;
		let frameId = 0;
		if (args.frameId) {
			[goroutineId, frameId] = this.stackFrameHandles.get(args.frameId, [goroutineId, frameId]);
		}
		// See https://github.com/go-delve/delve/blob/328cf87808822693dc611591519689dcd42696a3/service/api/types.go#L321-L350
		// for the command args for function call.
		const returnValue = this.delve
			?.callPromise<DebuggerState | CommandOut>('Command', [
				{
					name: 'call',
					goroutineID: goroutineId,
					returnInfoLoadConfig: this.delve?.loadConfig,
					expr: callExpr,
					unsafe: false
				}
			])
			.then(
				(val) => val,
				(err) => {
					logError(
						'Failed to call function: ',
						JSON.stringify(callExpr, null, ' '),
						'\n\rCall error:',
						err.toString()
					);
					return Promise.reject(err);
				}
			);
		return returnValue ?? Promise.resolve();
	}

	private evaluateRequestImpl(args: DebugProtocol.EvaluateArguments): Thenable<EvalOut | DebugVariable | void> {
		// default to the topmost stack frame of the current goroutine
		let goroutineId = -1;
		let frameId = 0;
		// args.frameId won't be specified when evaluating global vars
		if (args.frameId) {
			[goroutineId, frameId] = this.stackFrameHandles.get(args.frameId, [goroutineId, frameId]);
		}
		const scope = {
			goroutineID: goroutineId,
			frame: frameId
		};
		const apiV1Args = {
			symbol: args.expression,
			scope
		};
		const apiV2Args = {
			Expr: args.expression,
			Scope: scope,
			Cfg: this.delve?.loadConfig
		};
		const evalSymbolArgs = this.delve?.isApiV1 ? apiV1Args : apiV2Args;
		const returnValue = this.delve
			?.callPromise<EvalOut | DebugVariable>(this.delve?.isApiV1 ? 'EvalSymbol' : 'Eval', [evalSymbolArgs])
			.then(
				(val) => val,
				(err) => {
					log(
						'Failed to eval expression: ',
						JSON.stringify(evalSymbolArgs, null, ' '),
						'\n\rEval error:',
						err.toString()
					);
					return Promise.reject(err);
				}
			);
		return returnValue ?? Promise.resolve();
	}

	private addFullyQualifiedName(variables: DebugVariable[]) {
		variables.forEach((local) => {
			local.fullyQualifiedName = local.name;
			local.children.forEach((child) => {
				child.fullyQualifiedName = local.name;
			});
		});
	}

	private logDelveError(err: any, message: string) {
		if (err === undefined) {
			return;
		}

		let errorMessage = err.toString();
		// Use a more user friendly message for an unpropagated SIGSEGV (EXC_BAD_ACCESS)
		// signal that delve is unable to send back to the target process to be
		// handled as a panic.
		// https://github.com/microsoft/vscode-go/issues/1903#issuecomment-460126884
		// https://github.com/go-delve/delve/issues/852
		// This affects macOS only although we're agnostic of the OS at this stage.
		if (errorMessage === 'bad access') {
			// Reuse the panic message from the Go runtime.
			errorMessage =
				'runtime error: invalid memory address or nil pointer dereference [signal SIGSEGV: segmentation violation]\nUnable to propagate EXC_BAD_ACCESS signal to target process and panic (see https://github.com/go-delve/delve/issues/852)';
		}

		logError(message + ' - ' + errorMessage);
		this.dumpStacktrace();
	}

	private async dumpStacktrace() {
		// Get current goroutine
		// Debugger may be stopped at this point but we still can (and need) to obtain state and stacktrace
		let goroutineId = 0;
		try {
			this.debugState = await this.delve?.getDebugState();
			// In some fault scenarios there may not be a currentGoroutine available from the debugger state
			// Use the current thread
			if (!this.debugState?.currentGoroutine) {
				goroutineId = this.debugState?.currentThread.goroutineID ?? 0;
			} else {
				goroutineId = this.debugState?.currentGoroutine.id ?? 0;
			}
		} catch (error) {
			logError('dumpStacktrace - Failed to get debugger state ' + error);
		}

		// Get goroutine stacktrace
		const stackTraceIn = { id: goroutineId, depth: this.delve?.stackTraceDepth };
		if (!this.delve?.isApiV1) {
			Object.assign(stackTraceIn, { full: false, cfg: this.delve?.loadConfig });
		}
		this.delve?.call<DebugLocation[] | StacktraceOut>(
			this.delve?.isApiV1 ? 'StacktraceGoroutine' : 'Stacktrace',
			[stackTraceIn],
			(err, out) => {
				if (err) {
					logError('dumpStacktrace: Failed to produce stack trace' + err);
					return;
				}
				const locations = this.delve?.isApiV1 ? <DebugLocation[]>out : (<StacktraceOut>out).Locations;
				log('locations', locations);
				const stackFrames = locations.map((location, frameId) => {
					const uniqueStackFrameId = this.stackFrameHandles.create([goroutineId, frameId]);
					return new StackFrame(
						uniqueStackFrameId,
						location.function ? location.function.name : '<unknown>',
						location.file === '<autogenerated>'
							? undefined
							: new Source(path.basename(location.file), this.toLocalPath(location.file)),
						location.line,
						0
					);
				});

				// Dump stacktrace into error logger
				logError(`Last known immediate stacktrace (goroutine id ${goroutineId}):`);
				let output = '';
				stackFrames.forEach((stackFrame) => {
					output = output.concat(`\t${stackFrame.source.path}:${stackFrame.line}\n`);
					if (stackFrame.name) {
						output = output.concat(`\t\t${stackFrame.name}\n`);
					}
				});
				logError(output);
			}
		);
	}
}

// Class for fetching remote sources and packages
// in the remote program using Delve.
// tslint:disable-next-line:max-classes-per-file
export class RemoteSourcesAndPackages extends EventEmitter {
	public static readonly INITIALIZED = 'INITIALIZED';

	public initializingRemoteSourceFiles = false;
	public initializedRemoteSourceFiles = false;

	public remotePackagesBuildInfo: PackageBuildInfo[] = [];
	public remoteSourceFiles: string[] = [];
	public remoteSourceFilesNameGrouping = new Map<string, string[]>();

	/**
	 * Initialize and fill out remote packages build info and remote source files.
	 * Emits the INITIALIZED event once initialization is complete.
	 */
	public async initializeRemotePackagesAndSources(delve: Delve): Promise<void> {
		this.initializingRemoteSourceFiles = true;

		try {
			// ListPackagesBuildInfo is not available on V1.
			if (!delve.isApiV1 && this.remotePackagesBuildInfo.length === 0) {
				const packagesBuildInfoResponse: ListPackagesBuildInfoOut = await delve.callPromise(
					'ListPackagesBuildInfo',
					[{ IncludeFiles: true }]
				);
				if (packagesBuildInfoResponse && packagesBuildInfoResponse.List) {
					this.remotePackagesBuildInfo = packagesBuildInfoResponse.List;
				}
			}

			// List sources will return all the source files used by Delve.
			if (delve.isApiV1) {
				this.remoteSourceFiles = await delve.callPromise('ListSources', []);
			} else {
				const listSourcesResponse: ListSourcesOut = await delve.callPromise('ListSources', [{}]);
				if (listSourcesResponse && listSourcesResponse.Sources) {
					this.remoteSourceFiles = listSourcesResponse.Sources;
				}
			}

			// Group the source files by name for easy searching later.
			this.remoteSourceFiles = this.remoteSourceFiles.filter((sourceFile) => !sourceFile.startsWith('<'));
			this.remoteSourceFiles.forEach((sourceFile) => {
				const fileName = getBaseName(sourceFile);
				if (!this.remoteSourceFilesNameGrouping.has(fileName)) {
					this.remoteSourceFilesNameGrouping.set(fileName, []);
				}
				this.remoteSourceFilesNameGrouping.get(fileName)?.push(sourceFile);
			});
		} catch (error) {
			logError(`Failed to initialize remote sources and packages: ${(error as Error).message}`);
		} finally {
			this.emit(RemoteSourcesAndPackages.INITIALIZED);
			this.initializedRemoteSourceFiles = true;
		}
	}
}

function random(low: number, high: number): number {
	return Math.floor(Math.random() * (high - low) + low);
}

async function removeFile(filePath: string): Promise<void> {
	try {
		const fileExists = await fsAccess(filePath)
			.then(() => true)
			.catch(() => false);
		if (filePath && fileExists) {
			await fsUnlink(filePath);
		}
	} catch (e) {
		logError(`Potentially failed remove file: ${filePath} - ${e}`);
	}
}

// queryGOROOT returns `go env GOROOT`.
function queryGOROOT(cwd: any, env: any): Promise<string> {
	return new Promise<string>((resolve) => {
		execFile(
			getBinPathWithPreferredGopathGoroot('go', []),
			['env', 'GOROOT'],
			{ cwd, env },
			(err, stdout, stderr) => {
				if (err) {
					return resolve('');
				}
				return resolve(stdout.trim());
			}
		);
	});
}

DebugSession.run(GoDebugSession);
