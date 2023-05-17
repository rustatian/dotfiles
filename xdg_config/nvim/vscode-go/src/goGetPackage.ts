/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

'use strict';

import cp = require('child_process');
import vscode = require('vscode');
import { CommandFactory } from './commands';
import { buildCode } from './goBuild';
import { outputChannel } from './goStatus';
import { getBinPath, getCurrentGoPath, getImportPath } from './util';
import { getEnvPath, getCurrentGoRoot } from './utils/pathUtils';

export const goGetPackage: CommandFactory = (ctx, goCtx) => () => {
	const editor = vscode.window.activeTextEditor;
	const selection = editor?.selection;
	const selectedText = editor?.document.lineAt(selection?.active.line ?? 0).text ?? '';
	const importPath = getImportPath(selectedText);
	if (importPath === '') {
		vscode.window.showErrorMessage('No import path to get');
		return;
	}

	const goRuntimePath = getBinPath('go');
	if (!goRuntimePath) {
		return vscode.window.showErrorMessage(
			`Failed to run "go get" to get package as the "go" binary cannot be found in either GOROOT(${getCurrentGoRoot()}) or PATH(${getEnvPath()})`
		);
	}

	const env = Object.assign({}, process.env, { GOPATH: getCurrentGoPath() });

	cp.execFile(goRuntimePath, ['get', '-v', importPath], { env }, (err, stdout, stderr) => {
		// go get -v uses stderr to write output regardless of success or failure
		if (stderr !== '') {
			outputChannel.show();
			outputChannel.clear();
			outputChannel.appendLine(stderr);
			buildCode(false)(ctx, goCtx)();
			return;
		}

		// go get -v doesn't write anything when the package already exists
		vscode.window.showInformationMessage(`Package already exists: ${importPath}`);
	});
};
