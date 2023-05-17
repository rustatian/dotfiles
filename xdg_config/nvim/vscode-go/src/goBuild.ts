/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

import path = require('path');
import vscode = require('vscode');
import { CommandFactory } from './commands';
import { getGoConfig } from './config';
import { toolExecutionEnvironment } from './goEnv';
import { isModSupported } from './goModules';
import { getNonVendorPackages } from './goPackages';
import { diagnosticsStatusBarItem, outputChannel } from './goStatus';
import { getTestFlags } from './testUtils';
import {
	getCurrentGoPath,
	getModuleCache,
	getTempFilePath,
	getWorkspaceFolderPath,
	handleDiagnosticErrors,
	ICheckResult,
	runTool
} from './util';
import { getCurrentGoWorkspaceFromGOPATH } from './utils/pathUtils';

/**
 * Builds current package or workspace.
 */
export function buildCode(buildWorkspace?: boolean): CommandFactory {
	return (ctx, goCtx) => () => {
		const editor = vscode.window.activeTextEditor;
		if (!buildWorkspace) {
			if (!editor) {
				vscode.window.showInformationMessage('No editor is active, cannot find current package to build');
				return;
			}
			if (editor.document.languageId !== 'go') {
				vscode.window.showInformationMessage(
					'File in the active editor is not a Go file, cannot find current package to build'
				);
				return;
			}
		}

		const documentUri = editor?.document.uri;
		const goConfig = getGoConfig(documentUri);

		outputChannel.clear(); // Ensures stale output from build on save is cleared
		diagnosticsStatusBarItem.show();
		diagnosticsStatusBarItem.text = 'Building...';

		isModSupported(documentUri).then((isMod) => {
			goBuild(documentUri, isMod, goConfig, buildWorkspace)
				.then((errors) => {
					handleDiagnosticErrors(goCtx, editor?.document, errors, goCtx.buildDiagnosticCollection);
					diagnosticsStatusBarItem.hide();
				})
				.catch((err) => {
					vscode.window.showInformationMessage('Error: ' + err);
					diagnosticsStatusBarItem.text = 'Build Failed';
				});
		});
	};
}

/**
 * Runs go build -i or go test -i and presents the output in the 'Go' channel and in the diagnostic collections.
 *
 * @param fileUri Document uri.
 * @param isMod Boolean denoting if modules are being used.
 * @param goConfig Configuration for the Go extension.
 * @param buildWorkspace If true builds code in all workspace.
 */
export async function goBuild(
	fileUri: vscode.Uri | undefined,
	isMod: boolean,
	goConfig: vscode.WorkspaceConfiguration,
	buildWorkspace?: boolean
): Promise<ICheckResult[]> {
	epoch++;
	const closureEpoch = epoch;
	if (tokenSource) {
		if (running) {
			tokenSource.cancel();
		}
		tokenSource.dispose();
	}
	tokenSource = new vscode.CancellationTokenSource();
	const updateRunning = () => {
		if (closureEpoch === epoch) {
			running = false;
		}
	};

	const currentWorkspace = getWorkspaceFolderPath(fileUri);
	const cwd = buildWorkspace && currentWorkspace ? currentWorkspace : path.dirname(fileUri?.fsPath ?? '');
	if (!path.isAbsolute(cwd)) {
		return Promise.resolve([]);
	}

	// Skip building if cwd is in the module cache
	const cache = getModuleCache();
	if (isMod && cache && cwd.startsWith(cache)) {
		return [];
	}

	const buildEnv = toolExecutionEnvironment();
	const tmpPath = getTempFilePath('go-code-check');
	const isTestFile = fileUri && fileUri.fsPath.endsWith('_test.go');
	const buildFlags: string[] = isTestFile
		? getTestFlags(goConfig)
		: Array.isArray(goConfig['buildFlags'])
		? [...goConfig['buildFlags']]
		: [];
	const buildArgs: string[] = isTestFile ? ['test', '-c'] : ['build'];

	if (goConfig['installDependenciesWhenBuilding'] === true && !isMod) {
		buildArgs.push('-i');
		// Remove the -i flag from user as we add it anyway
		if (buildFlags.indexOf('-i') > -1) {
			buildFlags.splice(buildFlags.indexOf('-i'), 1);
		}
	}
	buildArgs.push(...buildFlags);
	if (goConfig['buildTags'] && buildFlags.indexOf('-tags') === -1) {
		buildArgs.push('-tags');
		buildArgs.push(goConfig['buildTags']);
	}

	if (buildWorkspace && currentWorkspace && !isTestFile) {
		outputChannel.appendLine(`Starting building the current workspace at ${currentWorkspace}`);
		return getNonVendorPackages(currentWorkspace).then((pkgs) => {
			running = true;
			return runTool(
				buildArgs.concat(Array.from(pkgs.keys())),
				currentWorkspace,
				'error',
				true,
				'',
				buildEnv,
				true,
				tokenSource.token
			).then((v) => {
				updateRunning();
				return v;
			});
		});
	}

	outputChannel.appendLine(`Starting building the current package at ${cwd}`);

	const currentGoWorkspace = getCurrentGoWorkspaceFromGOPATH(getCurrentGoPath(), cwd);
	let importPath = '.';
	if (!isMod) {
		// Find the right importPath instead of directly using `.`. Fixes https://github.com/Microsoft/vscode-go/issues/846
		if (currentGoWorkspace && !isMod) {
			importPath = cwd.substr(currentGoWorkspace.length + 1);
		} else {
			outputChannel.appendLine(
				`Not able to determine import path of current package by using cwd: ${cwd} and Go workspace: ${currentGoWorkspace}`
			);
		}
	}

	running = true;
	return runTool(
		buildArgs.concat('-o', tmpPath, importPath),
		cwd ?? '',
		'error',
		true,
		'',
		buildEnv,
		true,
		tokenSource.token
	).then((v) => {
		updateRunning();
		return v;
	});
}

let epoch = 0;
let tokenSource: vscode.CancellationTokenSource;
let running = false;
