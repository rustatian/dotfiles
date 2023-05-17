/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable eqeqeq */
/* eslint-disable node/no-unpublished-import */
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

import assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { getGoConfig, getGoplsConfig } from '../../src/config';
import { FilePatch, getEdits, getEditsFromUnifiedDiffStr } from '../../src/diffUtils';
import { check } from '../../src/goCheck';
import { GoDefinitionProvider } from '../../src/language/legacy/goDeclaration';
import { GoHoverProvider } from '../../src/language/legacy/goExtraInfo';
import { runFillStruct } from '../../src/goFillStruct';
import {
	generateTestCurrentFile,
	generateTestCurrentFunction,
	generateTestCurrentPackage
} from '../../src/goGenerateTests';
import { getTextEditForAddImport, listPackages } from '../../src/goImport';
import { updateGoVarsFromConfig } from '../../src/goInstallTools';
import { buildLanguageServerConfig } from '../../src/language/goLanguageServer';
import { goLint } from '../../src/goLint';
import { documentSymbols, GoOutlineImportsOptions } from '../../src/language/legacy/goOutline';
import { GoDocumentSymbolProvider } from '../../src/goDocumentSymbols';
import { goPlay } from '../../src/goPlayground';
import { GoSignatureHelpProvider } from '../../src/language/legacy/goSignature';
import { GoCompletionItemProvider } from '../../src/language/legacy/goSuggest';
import { getWorkspaceSymbols } from '../../src/language/legacy/goSymbol';
import { testCurrentFile } from '../../src/commands';
import {
	getBinPath,
	getCurrentGoPath,
	getGoVersion,
	getImportPath,
	GoVersion,
	handleDiagnosticErrors,
	ICheckResult
} from '../../src/util';
import cp = require('child_process');
import os = require('os');
import { MockExtensionContext } from '../mocks/MockContext';
import { affectedByIssue832 } from './testutils';

const testAll = (isModuleMode: boolean) => {
	const dummyCancellationSource = new vscode.CancellationTokenSource();

	// suiteSetup will initialize the following vars.
	let gopath: string;
	let repoPath: string;
	let fixturePath: string;
	let fixtureSourcePath: string;
	let generateTestsSourcePath: string;
	let generateFunctionTestSourcePath: string;
	let generatePackageTestSourcePath: string;
	let previousEnv: any;
	let goVersion: GoVersion;

	suiteSetup(async () => {
		previousEnv = Object.assign({}, process.env);
		process.env.GO111MODULE = isModuleMode ? 'on' : 'off';

		await updateGoVarsFromConfig({});

		gopath = getCurrentGoPath();
		if (!gopath) {
			assert.ok(gopath, 'Cannot run tests if GOPATH is not set as environment variable');
			return;
		}
		goVersion = await getGoVersion();

		console.log(`Using GOPATH: ${gopath}`);

		repoPath = isModuleMode ? fs.mkdtempSync(path.join(os.tmpdir(), 'legacy')) : path.join(gopath, 'src', 'test');
		fixturePath = path.join(repoPath, 'testfixture');
		fixtureSourcePath = path.join(__dirname, '..', '..', '..', 'test', 'testdata');
		generateTestsSourcePath = path.join(repoPath, 'generatetests');
		generateFunctionTestSourcePath = path.join(repoPath, 'generatefunctiontest');
		generatePackageTestSourcePath = path.join(repoPath, 'generatePackagetest');

		fs.removeSync(repoPath);
		fs.copySync(fixtureSourcePath, fixturePath, {
			recursive: true
			// TODO(hyangah): should we enable GOPATH mode
		});
		fs.copySync(
			path.join(fixtureSourcePath, 'generatetests', 'generatetests.go'),
			path.join(generateTestsSourcePath, 'generatetests.go')
		);
		fs.copySync(
			path.join(fixtureSourcePath, 'generatetests', 'generatetests.go'),
			path.join(generateFunctionTestSourcePath, 'generatetests.go')
		);
		fs.copySync(
			path.join(fixtureSourcePath, 'generatetests', 'generatetests.go'),
			path.join(generatePackageTestSourcePath, 'generatetests.go')
		);
		fs.copySync(
			path.join(fixtureSourcePath, 'diffTestData', 'file1.go'),
			path.join(fixturePath, 'diffTest1Data', 'file1.go')
		);
		fs.copySync(
			path.join(fixtureSourcePath, 'diffTestData', 'file2.go'),
			path.join(fixturePath, 'diffTest1Data', 'file2.go')
		);
		fs.copySync(
			path.join(fixtureSourcePath, 'diffTestData', 'file1.go'),
			path.join(fixturePath, 'diffTest2Data', 'file1.go')
		);
		fs.copySync(
			path.join(fixtureSourcePath, 'diffTestData', 'file2.go'),
			path.join(fixturePath, 'diffTest2Data', 'file2.go')
		);
	});

	suiteTeardown(() => {
		fs.removeSync(repoPath);
		process.env = previousEnv;
	});

	teardown(() => {
		sinon.restore();
	});

	async function testDefinitionProvider(goConfig: vscode.WorkspaceConfiguration): Promise<any> {
		const provider = new GoDefinitionProvider(goConfig);
		const uri = vscode.Uri.file(path.join(fixturePath, 'baseTest', 'test.go'));
		const position = new vscode.Position(10, 3);
		const textDocument = await vscode.workspace.openTextDocument(uri);
		const definitionInfo = await provider.provideDefinition(textDocument, position, dummyCancellationSource.token);

		assert.equal(
			definitionInfo?.uri.path.toLowerCase(),
			uri.path.toLowerCase(),
			`${definitionInfo?.uri.path} is not the same as ${uri.path}`
		);
		assert.equal(definitionInfo?.range.start.line, 6);
		assert.equal(definitionInfo?.range.start.character, 5);
	}

	async function testSignatureHelpProvider(
		goConfig: vscode.WorkspaceConfiguration,
		testCases: [vscode.Position, string, string, string[]][]
	): Promise<any> {
		const provider = new GoSignatureHelpProvider(goConfig);
		const uri = vscode.Uri.file(path.join(fixturePath, 'gogetdocTestData', 'test.go'));
		const textDocument = await vscode.workspace.openTextDocument(uri);

		const promises = testCases.map(([position, expected, expectedDocPrefix, expectedParams]) =>
			provider.provideSignatureHelp(textDocument, position, dummyCancellationSource.token).then((sigHelp) => {
				assert.ok(
					sigHelp,
					`No signature for gogetdocTestData/test.go:${position.line + 1}:${position.character + 1}`
				);
				assert.equal(sigHelp.signatures.length, 1, 'unexpected number of overloads');
				assert.equal(sigHelp.signatures[0].label, expected);
				assert(
					sigHelp.signatures[0].documentation?.toString().startsWith(expectedDocPrefix),
					`expected doc starting with ${expectedDocPrefix}, got ${JSON.stringify(sigHelp.signatures[0])}`
				);
				assert.equal(sigHelp.signatures[0].parameters.length, expectedParams.length);
				for (let i = 0; i < expectedParams.length; i++) {
					assert.equal(sigHelp.signatures[0].parameters[i].label, expectedParams[i]);
				}
			})
		);
		return Promise.all(promises);
	}

	async function testHoverProvider(
		goConfig: vscode.WorkspaceConfiguration,
		testCases: [vscode.Position, string | null, string | null][]
	): Promise<any> {
		const provider = new GoHoverProvider(goConfig);
		const uri = vscode.Uri.file(path.join(fixturePath, 'gogetdocTestData', 'test.go'));
		const textDocument = await vscode.workspace.openTextDocument(uri);

		const promises = testCases.map(([position, expectedSignature, expectedDocumentation]) =>
			provider.provideHover(textDocument, position, dummyCancellationSource.token).then((res) => {
				if (expectedSignature === null && expectedDocumentation === null) {
					assert.equal(res, null);
					return;
				}
				let expectedHover = '\n```go\n' + expectedSignature + '\n```\n';
				if (expectedDocumentation != null) {
					expectedHover += expectedDocumentation;
				}
				assert(res);
				assert.equal(res.contents.length, 1);
				assert(
					(<vscode.MarkdownString>res.contents[0]).value.startsWith(expectedHover),
					`expected hover starting with ${expectedHover}, got ${JSON.stringify(res.contents[0])}`
				);
			})
		);
		return Promise.all(promises);
	}

	test('Test Definition Provider using godoc', async function () {
		if (isModuleMode) {
			this.skip();
		} // not working in module mode.

		const config = Object.create(getGoConfig(), {
			docsTool: { value: 'godoc' }
		});
		await testDefinitionProvider(config);
	});

	test('Test Definition Provider using gogetdoc', async function () {
		if (isModuleMode) {
			this.skip();
		} // not working in module mode.
		const gogetdocPath = getBinPath('gogetdoc');
		if (gogetdocPath === 'gogetdoc') {
			// gogetdoc is not installed, so skip the test
			return;
		}
		const config = Object.create(getGoConfig(), {
			docsTool: { value: 'gogetdoc' }
		});
		await testDefinitionProvider(config);
	});

	test('Test SignatureHelp Provider using godoc', async function () {
		if (isModuleMode) {
			this.skip();
		} // not working in module mode

		const printlnDocPrefix = 'Println formats using the default formats for its operands and writes';
		const printlnSig = goVersion.lt('1.18')
			? 'Println(a ...interface{}) (n int, err error)'
			: 'Println(a ...any) (n int, err error)';

		const testCases: [vscode.Position, string, string, string[]][] = [
			[
				new vscode.Position(19, 13),
				printlnSig,
				printlnDocPrefix,
				[goVersion.lt('1.18') ? 'a ...interface{}' : 'a ...any']
			],
			[
				new vscode.Position(23, 7),
				'print(txt string)',
				"This is an unexported function so couldn't get this comment on hover :( Not\nanymore!!\n",
				['txt string']
			],
			[
				new vscode.Position(41, 19),
				'Hello(s string, exclaim bool) string',
				'Hello is a method on the struct ABC. Will signature help understand this\ncorrectly\n',
				['s string', 'exclaim bool']
			],
			[
				new vscode.Position(41, 47),
				'EmptyLine(s string) string',
				'EmptyLine has docs\n\nwith a blank line in the middle\n',
				['s string']
			]
		];
		const config = Object.create(getGoConfig(), {
			docsTool: { value: 'godoc' }
		});
		await testSignatureHelpProvider(config, testCases);
	});

	test('Test SignatureHelp Provider using gogetdoc', async function () {
		if (isModuleMode) {
			this.skip();
		} // not working in module mode.
		const gogetdocPath = getBinPath('gogetdoc');
		if (gogetdocPath === 'gogetdoc') {
			// gogetdoc is not installed, so skip the test
			return;
		}

		const printlnDocPrefix = 'Println formats using the default formats for its operands and writes';
		const printlnSig = goVersion.lt('1.18')
			? 'Println(a ...interface{}) (n int, err error)'
			: 'Println(a ...any) (n int, err error)';

		const testCases: [vscode.Position, string, string, string[]][] = [
			[
				new vscode.Position(19, 13),
				printlnSig,
				printlnDocPrefix,
				[goVersion.lt('1.18') ? 'a ...interface{}' : 'a ...any']
			],
			[
				new vscode.Position(23, 7),
				'print(txt string)',
				"This is an unexported function so couldn't get this comment on hover :(\nNot anymore!!\n",
				['txt string']
			],
			[
				new vscode.Position(41, 19),
				'Hello(s string, exclaim bool) string',
				'Hello is a method on the struct ABC. Will signature help understand this correctly\n',
				['s string', 'exclaim bool']
			],
			[
				new vscode.Position(41, 47),
				'EmptyLine(s string) string',
				'EmptyLine has docs\n\nwith a blank line in the middle\n',
				['s string']
			]
		];
		const config = Object.create(getGoConfig(), {
			docsTool: { value: 'gogetdoc' }
		});
		await testSignatureHelpProvider(config, testCases);
	});

	test('Test Hover Provider using godoc', async function () {
		if (isModuleMode) {
			this.skip();
		} // not working in module mode

		const printlnDocPrefix = 'Println formats using the default formats for its operands and writes';
		const printlnSig = goVersion.lt('1.18')
			? 'Println func(a ...interface{}) (n int, err error)'
			: 'Println func(a ...any) (n int, err error)';

		const testCases: [vscode.Position, string | null, string | null][] = [
			// [new vscode.Position(3,3), '/usr/local/go/src/fmt'],
			[new vscode.Position(0, 3), null, null], // keyword
			[new vscode.Position(23, 14), null, null], // inside a string
			[new vscode.Position(20, 0), null, null], // just a }
			[new vscode.Position(28, 16), null, null], // inside a number
			[new vscode.Position(22, 5), 'main func()', '\n'],
			[new vscode.Position(40, 23), 'import (math "math")', null],
			[new vscode.Position(19, 6), printlnSig, printlnDocPrefix],
			[
				new vscode.Position(23, 4),
				'print func(txt string)',
				"This is an unexported function so couldn't get this comment on hover :( Not\nanymore!!\n"
			]
		];
		const config = Object.create(getGoConfig(), {
			docsTool: { value: 'godoc' }
		});
		await testHoverProvider(config, testCases);
	});

	test('Test Hover Provider using gogetdoc', async function () {
		if (isModuleMode) {
			this.skip();
		} // not working in module mode.

		const gogetdocPath = getBinPath('gogetdoc');
		if (gogetdocPath === 'gogetdoc') {
			// gogetdoc is not installed, so skip the test
			return;
		}

		const printlnDocPrefix = 'Println formats using the default formats for its operands and writes';
		const printlnSig = goVersion.lt('1.18')
			? 'func Println(a ...interface{}) (n int, err error)'
			: 'func Println(a ...any) (n int, err error)';

		const testCases: [vscode.Position, string | null, string | null][] = [
			[new vscode.Position(0, 3), null, null], // keyword
			[new vscode.Position(23, 11), null, null], // inside a string
			[new vscode.Position(20, 0), null, null], // just a }
			[new vscode.Position(28, 16), null, null], // inside a number
			[new vscode.Position(22, 5), 'func main()', ''],
			[
				new vscode.Position(23, 4),
				'func print(txt string)',
				"This is an unexported function so couldn't get this comment on hover :(\nNot anymore!!\n"
			],
			[
				new vscode.Position(40, 23),
				'package math',
				'Package math provides basic constants and mathematical functions.\n\nThis package does not guarantee bit-identical results across architectures.\n'
			],
			[new vscode.Position(19, 6), printlnSig, printlnDocPrefix],
			[
				new vscode.Position(27, 14),
				'type ABC struct {\n    a int\n    b int\n    c int\n}',
				"ABC is a struct, you coudn't use Goto Definition or Hover info on this before\nNow you can due to gogetdoc and go doc\n"
			],
			[
				new vscode.Position(28, 6),
				'func IPv4Mask(a, b, c, d byte) IPMask',
				'IPv4Mask returns the IP mask (in 4-byte form) of the\nIPv4 mask a.b.c.d.\n'
			]
		];
		const config = Object.create(getGoConfig(), {
			docsTool: { value: 'gogetdoc' }
		});
		await testHoverProvider(config, testCases);
	});

	test('Linting - concurrent process cancelation', async () => {
		const util = require('../../src/util');
		const processutil = require('../../src/utils/processUtils');
		sinon.spy(util, 'runTool');
		sinon.spy(processutil, 'killProcessTree');

		const config = Object.create(getGoConfig(), {
			vetOnSave: { value: 'package' },
			vetFlags: { value: ['-all'] },
			buildOnSave: { value: 'package' },
			lintOnSave: { value: 'package' },
			// simulate a long running lint process by sleeping for a couple seconds
			lintTool: { value: process.platform !== 'win32' ? 'sleep' : 'timeout' },
			lintFlags: { value: process.platform !== 'win32' ? ['2'] : ['/t', '2'] }
		});
		const goplsConfig = Object.create(getGoplsConfig(), {});

		const results = await Promise.all([
			goLint(vscode.Uri.file(path.join(fixturePath, 'linterTest', 'linter_1.go')), config, goplsConfig),
			goLint(vscode.Uri.file(path.join(fixturePath, 'linterTest', 'linter_2.go')), config, goplsConfig)
		]);
		assert.equal(util.runTool.callCount, 2, 'should have launched 2 lint jobs');
		assert.equal(
			processutil.killProcessTree.callCount,
			1,
			'should have killed 1 lint job before launching the next'
		);
	});

	test('Linting - lint errors with multiple open files', async () => {
		try {
			// handleDiagnosticErrors may adjust the lint errors' ranges to make the error more visible.
			// This adjustment applies only to the text documents known to vscode. This test checks
			// the adjustment is made consistently across multiple open text documents.
			const file1 = await vscode.workspace.openTextDocument(
				vscode.Uri.file(path.join(fixturePath, 'linterTest', 'linter_1.go'))
			);
			const file2 = await vscode.workspace.openTextDocument(
				vscode.Uri.file(path.join(fixturePath, 'linterTest', 'linter_2.go'))
			);
			console.log('start linting');
			const warnings = await goLint(
				file2.uri,
				Object.create(getGoConfig(), {
					lintTool: { value: 'staticcheck' },
					lintFlags: { value: ['-checks', 'all,-ST1000,-ST1016'] }
					// staticcheck skips debatable checks such as ST1003 by default,
					// but this test depends on ST1003 (MixedCaps package name) presented in both files
					// in the same package. So, enable that.
				}),
				Object.create(getGoplsConfig(), {}),
				'package'
			);

			const diagnosticCollection = vscode.languages.createDiagnosticCollection('linttest');
			handleDiagnosticErrors({}, file2, warnings, diagnosticCollection);

			// The first diagnostic message for each file should be about the use of MixedCaps in package name.
			// Both files belong to the same package name, and we want them to be identical.
			const file1Diagnostics = diagnosticCollection.get(file1.uri);
			const file2Diagnostics = diagnosticCollection.get(file2.uri);
			assert(file1Diagnostics);
			assert(file2Diagnostics);
			assert(file1Diagnostics.length > 0);
			assert(file2Diagnostics.length > 0);
			assert.deepStrictEqual(file1Diagnostics[0], file2Diagnostics[0]);
		} catch (e) {
			assert.fail(`failed to lint: ${e}`);
		}
	});

	test('Error checking', async () => {
		const config = Object.create(getGoConfig(), {
			vetOnSave: { value: 'package' },
			vetFlags: { value: ['-all'] },
			lintOnSave: { value: 'package' },
			lintTool: { value: 'staticcheck' },
			lintFlags: { value: [] },
			buildOnSave: { value: 'package' }
		});
		const expectedLintErrors = [
			// Unlike golint, staticcheck will report only those compile errors,
			// but not lint errors when the program is broken.
			{
				line: 11,
				severity: 'warning',
				// From v0.4.0, staticcheck uses 'undefined:' as the prefix of this error.
				msg: /(?:undeclared name|undefined): prin \(compile\)/
			}
		];
		// If a user has enabled diagnostics via a language server,
		// then we disable running build or vet to avoid duplicate errors and warnings.
		const lspConfig = buildLanguageServerConfig(getGoConfig());
		const expectedBuildVetErrors = lspConfig.enabled
			? []
			: [{ line: 11, severity: 'error', msg: 'undefined: prin' }];

		// `check` itself doesn't run deDupeDiagnostics, so we expect all vet/lint errors.
		const expected = [...expectedLintErrors, ...expectedBuildVetErrors];
		const diagnostics = await check(
			{
				buildDiagnosticCollection: vscode.languages.createDiagnosticCollection('buildtest'),
				lintDiagnosticCollection: vscode.languages.createDiagnosticCollection('linttest'),
				vetDiagnosticCollection: vscode.languages.createDiagnosticCollection('vettest')
			},
			vscode.Uri.file(path.join(fixturePath, 'errorsTest', 'errors.go')),
			config
		);
		const sortedDiagnostics = ([] as ICheckResult[]).concat
			.apply(
				[],
				diagnostics.map((x) => x.errors)
			)
			.sort((a: any, b: any) => a.line - b.line);
		assert.equal(sortedDiagnostics.length > 0, true, 'Failed to get linter results');

		const matchCount = expected.filter((expectedItem) => {
			return sortedDiagnostics.some((diag: any) => {
				return (
					expectedItem.line === diag.line &&
					expectedItem.severity === diag.severity &&
					diag.msg.match(expectedItem.msg)
				);
			});
		});
		assert.equal(
			matchCount.length >= expected.length,
			true,
			`Failed to match expected errors \n${JSON.stringify(sortedDiagnostics)} \n VS\n ${JSON.stringify(expected)}`
		);
	});

	test('Test Generate unit tests skeleton for file', async function () {
		const gotestsPath = getBinPath('gotests');
		if (gotestsPath === 'gotests') {
			// gotests is not installed, so skip the test
			this.skip();
		}

		const uri = vscode.Uri.file(path.join(generateTestsSourcePath, 'generatetests.go'));
		const document = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(document);
		const ctx = new MockExtensionContext() as any;
		await generateTestCurrentFile(ctx, {})();

		const testFileGenerated = fs.existsSync(path.join(generateTestsSourcePath, 'generatetests_test.go'));
		assert.equal(testFileGenerated, true, 'Test file not generated.');
	});

	test('Test Generate unit tests skeleton for a function', async function () {
		const gotestsPath = getBinPath('gotests');
		if (gotestsPath === 'gotests') {
			// gotests is not installed, so skip the test
			this.skip();
		}

		const uri = vscode.Uri.file(path.join(generateFunctionTestSourcePath, 'generatetests.go'));
		const document = await vscode.workspace.openTextDocument(uri);
		const editor = await vscode.window.showTextDocument(document);
		editor.selection = new vscode.Selection(5, 0, 6, 0);
		const ctx = new MockExtensionContext() as any;
		await generateTestCurrentFunction(ctx, {})();

		const testFileGenerated = fs.existsSync(path.join(generateTestsSourcePath, 'generatetests_test.go'));
		assert.equal(testFileGenerated, true, 'Test file not generated.');
	});

	test('Test Generate unit tests skeleton for package', async function () {
		const gotestsPath = getBinPath('gotests');
		if (gotestsPath === 'gotests') {
			// gotests is not installed, so skip the test
			this.skip();
		}

		const uri = vscode.Uri.file(path.join(generatePackageTestSourcePath, 'generatetests.go'));
		const document = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(document);
		const ctx = new MockExtensionContext() as any;
		await generateTestCurrentPackage(ctx, {})();

		const testFileGenerated = fs.existsSync(path.join(generateTestsSourcePath, 'generatetests_test.go'));
		assert.equal(testFileGenerated, true, 'Test file not generated.');
	});

	test('Test diffUtils.getEditsFromUnifiedDiffStr', async function () {
		// Run this test only in module mode.
		if (!isModuleMode) {
			this.skip();
		}

		if (process.platform === 'win32') {
			// This test requires diff tool that's not available on windows
			this.skip();
		}

		const file1path = path.join(fixturePath, 'diffTest1Data', 'file1.go');
		const file2path = path.join(fixturePath, 'diffTest1Data', 'file2.go');
		const file1uri = vscode.Uri.file(file1path);
		const file2contents = fs.readFileSync(file2path, 'utf8');

		const fileEditPatches: any | FilePatch[] = await new Promise((resolve) => {
			cp.exec(`diff -u ${file1path} ${file2path}`, (err, stdout, stderr) => {
				const filePatches: FilePatch[] = getEditsFromUnifiedDiffStr(stdout);

				if (!filePatches || filePatches.length !== 1) {
					assert.fail(null, null, 'Failed to get patches for the test file', '');
				}

				if (!filePatches[0].fileName) {
					assert.fail(null, null, 'Failed to parse the file path from the diff output', '');
				}

				if (!filePatches[0].edits) {
					assert.fail(null, null, 'Failed to parse edits from the diff output', '');
				}
				resolve(filePatches);
			});
		});

		const textDocument = await vscode.workspace.openTextDocument(file1uri);
		const editor = await vscode.window.showTextDocument(textDocument);
		await editor.edit((editBuilder) => {
			fileEditPatches[0].edits.forEach((edit: any) => {
				edit.applyUsingTextEditorEdit(editBuilder);
			});
		});
		assert.equal(editor.document.getText(), file2contents);
	});

	test('Test diffUtils.getEdits', async function () {
		if (!isModuleMode) {
			this.skip();
		} // Run this test only in module mode.

		const file1path = path.join(fixturePath, 'diffTest2Data', 'file1.go');
		const file2path = path.join(fixturePath, 'diffTest2Data', 'file2.go');
		const file1uri = vscode.Uri.file(file1path);
		const file1contents = fs.readFileSync(file1path, 'utf8');
		const file2contents = fs.readFileSync(file2path, 'utf8');

		const fileEdits = getEdits(file1path, file1contents, file2contents);

		if (!fileEdits) {
			assert.fail(null, null, 'Failed to get patches for the test file', '');
		}

		if (!fileEdits.fileName) {
			assert.fail(null, null, 'Failed to parse the file path from the diff output', '');
		}

		if (!fileEdits.edits) {
			assert.fail(null, null, 'Failed to parse edits from the diff output', '');
		}

		const textDocument = await vscode.workspace.openTextDocument(file1uri);
		const editor = await vscode.window.showTextDocument(textDocument);
		await editor.edit((editBuilder) => {
			fileEdits.edits.forEach((edit) => {
				edit.applyUsingTextEditorEdit(editBuilder);
			});
		});
		assert.equal(editor.document.getText(), file2contents);
	});

	test('Test Env Variables are passed to Tests', async () => {
		const config = Object.create(getGoConfig(), {
			testEnvVars: { value: { dummyEnvVar: 'dummyEnvValue', dummyNonString: 1 } }
		});
		const uri = vscode.Uri.file(path.join(fixturePath, 'baseTest', 'sample_test.go'));
		const document = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(document);
		const ctx = new MockExtensionContext() as any;
		const result = await testCurrentFile(false, () => config)(ctx, {})([]);
		assert.equal(result, true);
	});

	test('Test Outline', async () => {
		const uri = vscode.Uri.file(path.join(fixturePath, 'outlineTest', 'test.go'));
		const document = await vscode.workspace.openTextDocument(uri);
		const options = {
			document,
			fileName: document.fileName,
			importsOption: GoOutlineImportsOptions.Include
		};

		const outlines = await documentSymbols(options, dummyCancellationSource.token);
		const packageSymbols = outlines.filter((x: any) => x.kind === vscode.SymbolKind.Package);
		const imports = outlines[0].children.filter((x: any) => x.kind === vscode.SymbolKind.Namespace);
		const functions = outlines[0].children.filter((x: any) => x.kind === vscode.SymbolKind.Function);

		assert.equal(packageSymbols.length, 1);
		assert.equal(packageSymbols[0].name, 'main');
		assert.equal(imports.length, 1);
		assert.equal(imports[0].name, '"fmt"');
		assert.equal(functions.length, 2);
		assert.equal(functions[0].name, 'print');
		assert.equal(functions[1].name, 'main');
	});

	test('Test Outline imports only', async () => {
		const uri = vscode.Uri.file(path.join(fixturePath, 'outlineTest', 'test.go'));
		const document = await vscode.workspace.openTextDocument(uri);
		const options = {
			document,
			fileName: document.fileName,
			importsOption: GoOutlineImportsOptions.Only
		};

		const outlines = await documentSymbols(options, dummyCancellationSource.token);
		const packageSymbols = outlines.filter((x) => x.kind === vscode.SymbolKind.Package);
		const imports = outlines[0].children.filter((x: any) => x.kind === vscode.SymbolKind.Namespace);
		const functions = outlines[0].children.filter((x: any) => x.kind === vscode.SymbolKind.Function);

		assert.equal(packageSymbols.length, 1);
		assert.equal(packageSymbols[0].name, 'main');
		assert.equal(imports.length, 1);
		assert.equal(imports[0].name, '"fmt"');
		assert.equal(functions.length, 0);
	});

	test('Test Outline document symbols', async () => {
		const uri = vscode.Uri.file(path.join(fixturePath, 'outlineTest', 'test.go'));
		const document = await vscode.workspace.openTextDocument(uri);
		const symbolProvider = GoDocumentSymbolProvider({});

		const outlines = await symbolProvider.provideDocumentSymbols(document, dummyCancellationSource.token);
		const packages = outlines.filter((x) => x.kind === vscode.SymbolKind.Package);
		const variables = outlines[0].children.filter((x: any) => x.kind === vscode.SymbolKind.Variable);
		const functions = outlines[0].children.filter((x: any) => x.kind === vscode.SymbolKind.Function);
		const structs = outlines[0].children.filter((x: any) => x.kind === vscode.SymbolKind.Struct);
		const interfaces = outlines[0].children.filter((x: any) => x.kind === vscode.SymbolKind.Interface);

		assert.equal(packages[0].name, 'main');
		assert.equal(variables.length, 0);
		assert.equal(functions[0].name, 'print');
		assert.equal(functions[1].name, 'main');
		assert.equal(structs.length, 1);
		assert.equal(structs[0].name, 'foo');
		assert.equal(interfaces.length, 1);
		assert.equal(interfaces[0].name, 'circle');
	});

	test('Test listPackages', async function () {
		if (affectedByIssue832()) {
			this.skip(); // timeout on windows
		}
		const uri = vscode.Uri.file(path.join(fixturePath, 'baseTest', 'test.go'));
		const document = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(document);

		const includeImportedPkgs = await listPackages(false);
		const excludeImportedPkgs = await listPackages(true);
		assert.equal(includeImportedPkgs.indexOf('fmt') > -1, true, 'want to include imported package');
		assert.equal(excludeImportedPkgs.indexOf('fmt') > -1, false, 'want to exclude imported package');
	});

	test('Replace vendor packages with relative path', async function () {
		if (isModuleMode) {
			this.skip();
		} // not working in module mode.
		const filePath = path.join(fixturePath, 'vendoring', 'main.go');
		const vendorPkgsFullPath = ['test/testfixture/vendoring/vendor/example/vendorpls'];
		const vendorPkgsRelativePath = ['example/vendorpls'];

		vscode.workspace.openTextDocument(vscode.Uri.file(filePath)).then(async (document) => {
			await vscode.window.showTextDocument(document);
			const pkgs = await listPackages();
			vendorPkgsRelativePath.forEach((pkg) => {
				assert.equal(pkgs.indexOf(pkg) > -1, true, `Relative path for vendor package ${pkg} not found`);
			});
			vendorPkgsFullPath.forEach((pkg) => {
				assert.equal(
					pkgs.indexOf(pkg),
					-1,
					`Full path for vendor package ${pkg} should be shown by listPackages method`
				);
			});
			return pkgs;
		});
	});

	test('Vendor pkgs from other projects should not be allowed to import', async function () {
		if (isModuleMode) {
			this.skip();
		} // not working in module mode.
		const filePath = path.join(fixturePath, 'baseTest', 'test.go');
		const vendorPkgs = ['test/testfixture/vendoring/vendor/example/vendorpls'];

		vscode.workspace.openTextDocument(vscode.Uri.file(filePath)).then(async (document) => {
			await vscode.window.showTextDocument(document);
			const pkgs = await listPackages();
			vendorPkgs.forEach((pkg) => {
				assert.equal(pkgs.indexOf(pkg), -1, `Vendor package ${pkg} should not be shown by listPackages method`);
			});
		});
	});

	test('Workspace Symbols', function () {
		if (affectedByIssue832()) {
			this.skip(); // frequent timeout on windows
		}
		const workspacePath = path.join(fixturePath, 'vendoring');
		const configWithoutIgnoringFolders = Object.create(getGoConfig(), {
			gotoSymbol: {
				value: {
					ignoreFolders: []
				}
			}
		});
		const configWithIgnoringFolders = Object.create(getGoConfig(), {
			gotoSymbol: {
				value: {
					ignoreFolders: ['vendor']
				}
			}
		});
		const configWithIncludeGoroot = Object.create(getGoConfig(), {
			gotoSymbol: {
				value: {
					includeGoroot: true
				}
			}
		});
		const configWithoutIncludeGoroot = Object.create(getGoConfig(), {
			gotoSymbol: {
				value: {
					includeGoroot: false
				}
			}
		});

		const withoutIgnoringFolders = getWorkspaceSymbols(
			workspacePath,
			'SomethingStr',
			dummyCancellationSource.token,
			configWithoutIgnoringFolders
		).then((results) => {
			assert.equal(results[0].name, 'SomethingStrange');
			assert.equal(results[0].path, path.join(workspacePath, 'vendor/example/vendorpls/lib.go'));
		});
		const withIgnoringFolders = getWorkspaceSymbols(
			workspacePath,
			'SomethingStr',
			dummyCancellationSource.token,
			configWithIgnoringFolders
		).then((results) => {
			assert.equal(results.length, 0);
		});
		const withoutIncludingGoroot = getWorkspaceSymbols(
			workspacePath,
			'Mutex',
			dummyCancellationSource.token,
			configWithoutIncludeGoroot
		).then((results) => {
			assert.equal(results.length, 0);
		});
		const withIncludingGoroot = getWorkspaceSymbols(
			workspacePath,
			'Mutex',
			dummyCancellationSource.token,
			configWithIncludeGoroot
		).then((results) => {
			assert(results.some((result) => result.name === 'Mutex'));
		});

		return Promise.all([withIgnoringFolders, withoutIgnoringFolders, withIncludingGoroot, withoutIncludingGoroot]);
	});

	test('Test Completion', async function () {
		if (affectedByIssue832()) {
			this.skip(); // timeout on windows
		}

		const printlnDocPrefix = 'Println formats using the default formats for its operands';
		const printlnSig = goVersion.lt('1.18')
			? 'func(a ...interface{}) (n int, err error)'
			: 'func(a ...any) (n int, err error)';

		const provider = new GoCompletionItemProvider();
		const testCases: [vscode.Position, string, string | null, string | null][] = [
			[new vscode.Position(7, 4), 'fmt', 'fmt', null],
			[new vscode.Position(7, 6), 'Println', printlnSig, printlnDocPrefix]
		];
		const uri = vscode.Uri.file(path.join(fixturePath, 'baseTest', 'test.go'));
		const textDocument = await vscode.workspace.openTextDocument(uri);
		const editor = await vscode.window.showTextDocument(textDocument);

		const promises = testCases.map(([position, expectedLabel, expectedDetail, expectedDoc]) =>
			provider
				.provideCompletionItems(editor.document, position, dummyCancellationSource.token)
				.then(async (items) => {
					const item = items.items.find((x) => x.label === expectedLabel);
					if (!item) {
						assert.fail('missing expected item in completion list');
					}
					assert.equal(item.detail, expectedDetail);
					const resolvedItemResult: vscode.ProviderResult<vscode.CompletionItem> = provider.resolveCompletionItem(
						item,
						dummyCancellationSource.token
					);
					if (!resolvedItemResult) {
						return;
					}
					const resolvedItem =
						resolvedItemResult instanceof vscode.CompletionItem
							? resolvedItemResult
							: await resolvedItemResult;
					if (resolvedItem?.documentation) {
						const got = (<vscode.MarkdownString>resolvedItem.documentation).value;
						if (expectedDoc) {
							assert(
								got.startsWith(expectedDoc),
								`expected doc starting with ${expectedDoc}, got ${got}`
							);
						} else {
							assert.equal(got, expectedDoc);
						}
					}
				})
		);
		await Promise.all(promises);
	});

	test('Test Completion Snippets For Functions', async function () {
		if (affectedByIssue832()) {
			this.skip(); // timeout on windows
		}
		const provider = new GoCompletionItemProvider();
		const uri = vscode.Uri.file(path.join(fixturePath, 'completions', 'snippets.go'));
		const baseConfig = getGoConfig();
		const textDocument = await vscode.workspace.openTextDocument(uri);
		const editor = await vscode.window.showTextDocument(textDocument);

		const noFunctionSnippet = provider
			.provideCompletionItemsInternal(
				editor.document,
				new vscode.Position(9, 6),
				dummyCancellationSource.token,
				Object.create(baseConfig, {
					useCodeSnippetsOnFunctionSuggest: { value: false }
				})
			)
			.then((items) => {
				items = items instanceof vscode.CompletionList ? items.items : items;
				const item = items.find((x) => x.label === 'Print');
				if (!item) {
					assert.fail('Suggestion with label "Print" not found in test case noFunctionSnippet.');
				}
				assert.equal(!item.insertText, true);
			});
		const withFunctionSnippet = provider
			.provideCompletionItemsInternal(
				editor.document,
				new vscode.Position(9, 6),
				dummyCancellationSource.token,
				Object.create(baseConfig, {
					useCodeSnippetsOnFunctionSuggest: { value: true }
				})
			)
			.then((items1) => {
				items1 = items1 instanceof vscode.CompletionList ? items1.items : items1;
				const item1 = items1.find((x) => x.label === 'Print');
				if (!item1) {
					assert.fail('Suggestion with label "Print" not found in test case withFunctionSnippet.');
				}
				assert.equal(
					(<vscode.SnippetString>item1.insertText).value,
					goVersion.lt('1.18') ? 'Print(${1:a ...interface{\\}})' : 'Print(${1:a ...any})'
				);
			});
		const withFunctionSnippetNotype = provider
			.provideCompletionItemsInternal(
				editor.document,
				new vscode.Position(9, 6),
				dummyCancellationSource.token,
				Object.create(baseConfig, {
					useCodeSnippetsOnFunctionSuggestWithoutType: { value: true }
				})
			)
			.then((items2) => {
				items2 = items2 instanceof vscode.CompletionList ? items2.items : items2;
				const item2 = items2.find((x) => x.label === 'Print');
				if (!item2) {
					assert.fail('Suggestion with label "Print" not found in test case withFunctionSnippetNotype.');
				}
				assert.equal((<vscode.SnippetString>item2.insertText).value, 'Print(${1:a})');
			});
		const noFunctionAsVarSnippet = provider
			.provideCompletionItemsInternal(
				editor.document,
				new vscode.Position(11, 3),
				dummyCancellationSource.token,
				Object.create(baseConfig, {
					useCodeSnippetsOnFunctionSuggest: { value: false }
				})
			)
			.then((items3) => {
				items3 = items3 instanceof vscode.CompletionList ? items3.items : items3;
				const item3 = items3.find((x) => x.label === 'funcAsVariable');
				if (!item3) {
					assert.fail('Suggestion with label "Print" not found in test case noFunctionAsVarSnippet.');
				}
				assert.equal(!item3.insertText, true);
			});
		const withFunctionAsVarSnippet = provider
			.provideCompletionItemsInternal(
				editor.document,
				new vscode.Position(11, 3),
				dummyCancellationSource.token,
				Object.create(baseConfig, {
					useCodeSnippetsOnFunctionSuggest: { value: true }
				})
			)
			.then((items4) => {
				items4 = items4 instanceof vscode.CompletionList ? items4.items : items4;
				const item4 = items4.find((x) => x.label === 'funcAsVariable');
				if (!item4) {
					assert.fail('Suggestion with label "Print" not found in test case withFunctionAsVarSnippet.');
				}
				assert.equal((<vscode.SnippetString>item4.insertText).value, 'funcAsVariable(${1:k string})');
			});
		const withFunctionAsVarSnippetNoType = provider
			.provideCompletionItemsInternal(
				editor.document,
				new vscode.Position(11, 3),
				dummyCancellationSource.token,
				Object.create(baseConfig, {
					useCodeSnippetsOnFunctionSuggestWithoutType: { value: true }
				})
			)
			.then((items5) => {
				items5 = items5 instanceof vscode.CompletionList ? items5.items : items5;
				const item5 = items5.find((x) => x.label === 'funcAsVariable');
				if (!item5) {
					assert.fail('Suggestion with label "Print" not found in test case withFunctionAsVarSnippetNoType.');
				}
				assert.equal((<vscode.SnippetString>item5.insertText).value, 'funcAsVariable(${1:k})');
			});
		const noFunctionAsTypeSnippet = provider
			.provideCompletionItemsInternal(
				editor.document,
				new vscode.Position(14, 0),
				dummyCancellationSource.token,
				Object.create(baseConfig, {
					useCodeSnippetsOnFunctionSuggest: { value: false }
				})
			)
			.then((items6) => {
				items6 = items6 instanceof vscode.CompletionList ? items6.items : items6;
				const item1 = items6.find((x) => x.label === 'HandlerFunc');
				const item2 = items6.find((x) => x.label === 'HandlerFuncWithArgNames');
				const item3 = items6.find((x) => x.label === 'HandlerFuncNoReturnType');
				if (!item1) {
					assert.fail('Suggestion with label "HandlerFunc" not found in test case noFunctionAsTypeSnippet.');
				}
				assert.equal(!item1.insertText, true);
				if (!item2) {
					assert.fail(
						'Suggestion with label "HandlerFuncWithArgNames" not found in test case noFunctionAsTypeSnippet.'
					);
				}
				assert.equal(!item2.insertText, true);
				if (!item3) {
					assert.fail(
						'Suggestion with label "HandlerFuncNoReturnType" not found in test case noFunctionAsTypeSnippet.'
					);
				}
				assert.equal(!item3.insertText, true);
			});
		const withFunctionAsTypeSnippet = provider
			.provideCompletionItemsInternal(
				editor.document,
				new vscode.Position(14, 0),
				dummyCancellationSource.token,
				Object.create(baseConfig, {
					useCodeSnippetsOnFunctionSuggest: { value: true }
				})
			)
			.then((items7) => {
				items7 = items7 instanceof vscode.CompletionList ? items7.items : items7;
				const item11 = items7.find((x) => x.label === 'HandlerFunc');
				const item21 = items7.find((x) => x.label === 'HandlerFuncWithArgNames');
				const item31 = items7.find((x) => x.label === 'HandlerFuncNoReturnType');
				if (!item11) {
					assert.fail(
						'Suggestion with label "HandlerFunc" not found in test case withFunctionAsTypeSnippet.'
					);
				}
				assert.equal(
					(<vscode.SnippetString>item11.insertText).value,
					'HandlerFunc(func(${1:arg1} string, ${2:arg2} string) {\n\t$3\n}) (string, string)'
				);
				if (!item21) {
					assert.fail(
						'Suggestion with label "HandlerFuncWithArgNames" not found in test case withFunctionAsTypeSnippet.'
					);
				}
				assert.equal(
					(<vscode.SnippetString>item21.insertText).value,
					'HandlerFuncWithArgNames(func(${1:w} string, ${2:r} string) {\n\t$3\n}) int'
				);
				if (!item31) {
					assert.fail(
						'Suggestion with label "HandlerFuncNoReturnType" not found in test case withFunctionAsTypeSnippet.'
					);
				}
				assert.equal(
					(<vscode.SnippetString>item31.insertText).value,
					'HandlerFuncNoReturnType(func(${1:arg1} string, ${2:arg2} string) {\n\t$3\n})'
				);
			});
		await Promise.all([
			noFunctionSnippet,
			withFunctionSnippet,
			withFunctionSnippetNotype,
			noFunctionAsVarSnippet,
			withFunctionAsVarSnippet,
			withFunctionAsVarSnippetNoType,
			noFunctionAsTypeSnippet,
			withFunctionAsTypeSnippet
		]);
	});

	test('Test No Completion Snippets For Functions', async () => {
		if (affectedByIssue832()) {
			return;
		}
		const provider = new GoCompletionItemProvider();
		const uri = vscode.Uri.file(path.join(fixturePath, 'completions', 'nosnippets.go'));
		const baseConfig = getGoConfig();
		const textDocument = await vscode.workspace.openTextDocument(uri);
		const editor = await vscode.window.showTextDocument(textDocument);

		const symbolFollowedByBrackets = provider
			.provideCompletionItemsInternal(
				editor.document,
				new vscode.Position(5, 10),
				dummyCancellationSource.token,
				Object.create(baseConfig, {
					useCodeSnippetsOnFunctionSuggest: { value: true }
				})
			)
			.then((items) => {
				items = items instanceof vscode.CompletionList ? items.items : items;
				const item = items.find((x) => x.label === 'Print');
				if (!item) {
					assert.fail('Suggestion with label "Print" not found in test case symbolFollowedByBrackets.');
				}
				assert.equal(!item.insertText, true, 'Unexpected snippet when symbol is followed by ().');
			});
		const symbolAsLastParameter = provider
			.provideCompletionItemsInternal(
				editor.document,
				new vscode.Position(7, 13),
				dummyCancellationSource.token,
				Object.create(baseConfig, {
					useCodeSnippetsOnFunctionSuggest: { value: true }
				})
			)
			.then((items1) => {
				items1 = items1 instanceof vscode.CompletionList ? items1.items : items1;
				const item1 = items1.find((x) => x.label === 'funcAsVariable');
				if (!item1) {
					assert.fail('Suggestion with label "funcAsVariable" not found in test case symbolAsLastParameter.');
				}
				assert.equal(!item1.insertText, true, 'Unexpected snippet when symbol is a parameter inside func call');
			});
		const symbolsAsNonLastParameter = provider
			.provideCompletionItemsInternal(
				editor.document,
				new vscode.Position(8, 11),
				dummyCancellationSource.token,
				Object.create(baseConfig, {
					useCodeSnippetsOnFunctionSuggest: { value: true }
				})
			)
			.then((items2) => {
				items2 = items2 instanceof vscode.CompletionList ? items2.items : items2;
				const item2 = items2.find((x) => x.label === 'funcAsVariable');
				if (!item2) {
					assert.fail(
						'Suggestion with label "funcAsVariable" not found in test case symbolsAsNonLastParameter.'
					);
				}
				assert.equal(
					!item2.insertText,
					true,
					'Unexpected snippet when symbol is one of the parameters inside func call.'
				);
			});
		await Promise.all([symbolFollowedByBrackets, symbolAsLastParameter, symbolsAsNonLastParameter]);
	});

	test('Test Completion on unimported packages', async function () {
		if (isModuleMode || affectedByIssue832()) {
			this.skip();
		}
		// gocode-gomod does not handle unimported package completion.
		// Skip if we run in module mode.

		const config = Object.create(getGoConfig(), {
			autocompleteUnimportedPackages: { value: true }
		});
		const provider = new GoCompletionItemProvider();
		const testCases: [vscode.Position, string[]][] = [
			[new vscode.Position(10, 3), ['bytes']],
			[new vscode.Position(11, 6), ['Abs', 'Acos', 'Asin']]
		];
		const uri = vscode.Uri.file(path.join(fixturePath, 'completions', 'unimportedPkgs.go'));
		const textDocument = await vscode.workspace.openTextDocument(uri);
		const editor = await vscode.window.showTextDocument(textDocument);

		const promises = testCases.map(([position, expected]) =>
			provider
				.provideCompletionItemsInternal(editor.document, position, dummyCancellationSource.token, config)
				.then((items) => {
					items = items instanceof vscode.CompletionList ? items.items : items;
					const labels = items.map((x) => x.label);
					for (const entry of expected) {
						assert.equal(
							labels.indexOf(entry) > -1,
							true,
							`missing expected item in completion list: ${entry} Actual: ${labels}`
						);
					}
				})
		);
		await Promise.all(promises);
	});

	test('Test Completion on unimported packages (multiple)', async function () {
		if (affectedByIssue832()) {
			this.skip();
		}
		const config = Object.create(getGoConfig(), {
			gocodeFlags: { value: ['-builtin'] }
		});
		const provider = new GoCompletionItemProvider();
		const position = new vscode.Position(3, 14);
		const expectedItems = [
			{
				label: 'template (html/template)',
				import: '\nimport (\n\t"html/template"\n)\n'
			},
			{
				label: 'template (text/template)',
				import: '\nimport (\n\t"text/template"\n)\n'
			}
		];
		const uri = vscode.Uri.file(path.join(fixturePath, 'completions', 'unimportedMultiplePkgs.go'));
		const textDocument = await vscode.workspace.openTextDocument(uri);
		const editor = await vscode.window.showTextDocument(textDocument);

		const completionResult = await provider.provideCompletionItemsInternal(
			editor.document,
			position,
			dummyCancellationSource.token,
			config
		);
		const items = completionResult instanceof vscode.CompletionList ? completionResult.items : completionResult;
		const labels = items.map((x) => x.label);
		expectedItems.forEach((expectedItem) => {
			const actualItem: vscode.CompletionItem = items.filter((item) => item.label === expectedItem.label)[0];
			if (!actualItem) {
				assert.fail(
					actualItem,
					expectedItem,
					`Missing expected item in completion list: ${expectedItem.label} Actual: ${labels}`
				);
			}
			if (!actualItem.additionalTextEdits) {
				assert.fail(`Missing additionalTextEdits on suggestion for ${actualItem}`);
			}
			assert.equal(actualItem.additionalTextEdits.length, 1);
			assert.equal(actualItem.additionalTextEdits[0].newText, expectedItem.import);
		});
	});

	test('Test Completion on Comments for Exported Members', async () => {
		const provider = new GoCompletionItemProvider();
		const testCases: [vscode.Position, string[]][] = [
			[new vscode.Position(6, 4), ['Language']],
			[new vscode.Position(9, 4), ['GreetingText']],
			// checking for comment completions with begining of comment without space
			[new vscode.Position(12, 2), []],
			// cursor between /$/ this should not trigger any completion
			[new vscode.Position(12, 1), []],
			[new vscode.Position(12, 4), ['SayHello']],
			[new vscode.Position(17, 5), ['HelloParams']],
			[new vscode.Position(26, 5), ['Abs']]
		];
		const uri = vscode.Uri.file(path.join(fixturePath, 'completions', 'exportedMemberDocs.go'));

		const textDocument = await vscode.workspace.openTextDocument(uri);
		const editor = await vscode.window.showTextDocument(textDocument);

		const promises = testCases.map(([position, expected]) =>
			provider.provideCompletionItems(editor.document, position, dummyCancellationSource.token).then((items) => {
				const labels = items.items.map((x) => x.label);
				assert.equal(
					expected.length,
					labels.length,
					`expected number of completions: ${expected.length} Actual: ${labels.length} at position(${
						position.line + 1
					},${position.character + 1}) ${labels}`
				);
				expected.forEach((entry, index) => {
					assert.equal(
						entry,
						labels[index],
						`mismatch in comment completion list Expected: ${entry} Actual: ${labels[index]}`
					);
				});
			})
		);
		await Promise.all(promises);
	});

	test('getImportPath()', () => {
		const testCases: [string, string][] = [
			['import "github.com/sirupsen/logrus"', 'github.com/sirupsen/logrus'],
			['import "net/http"', 'net/http'],
			['"github.com/sirupsen/logrus"', 'github.com/sirupsen/logrus'],
			['', ''],
			['func foo(bar int) (int, error) {', ''],
			['// This is a comment, complete with punctuation.', '']
		];

		testCases.forEach((run) => {
			assert.equal(run[1], getImportPath(run[0]));
		});
	});

	test('goPlay - success run', async () => {
		const goplayPath = getBinPath('goplay');
		if (goplayPath === 'goplay') {
			// goplay is not installed, so skip the test
			return;
		}

		const validCode = `
			package main
			import (
				"fmt"
			)
			func main() {
				for i := 1; i < 4; i++ {
					fmt.Printf("%v ", i)
				}
				fmt.Print("Go!")
			}`;
		const goConfig = Object.create(getGoConfig(), {
			playground: { value: { run: true, openbrowser: false, share: false } }
		});

		await goPlay(validCode, goConfig['playground']).then(
			(result) => {
				assert(result.includes('1 2 3 Go!'));
			},
			(e) => {
				assert.ifError(e);
			}
		);
	});

	test('goPlay - success run & share', async () => {
		const goplayPath = getBinPath('goplay');
		if (goplayPath === 'goplay') {
			// goplay is not installed, so skip the test
			return;
		}

		const validCode = `
			package main
			import (
				"fmt"
			)
			func main() {
				for i := 1; i < 4; i++ {
					fmt.Printf("%v ", i)
				}
				fmt.Print("Go!")
			}`;
		const goConfig = Object.create(getGoConfig(), {
			playground: { value: { run: true, openbrowser: false, share: true } }
		});

		await goPlay(validCode, goConfig['playground']).then(
			(result) => {
				assert(result.includes('1 2 3 Go!'));
				assert(result.includes('https://play.golang.org/'));
			},
			(e) => {
				assert.ifError(e);
			}
		);
	});

	test('goPlay - fail', async () => {
		const goplayPath = getBinPath('goplay');
		if (goplayPath === 'goplay') {
			// goplay is not installed, so skip the test
			return;
		}

		const invalidCode = `
			package main
			import (
				"fmt"
			)
			func fantasy() {
				fmt.Print("not a main package, sorry")
			}`;
		const goConfig = Object.create(getGoConfig(), {
			playground: { value: { run: true, openbrowser: false, share: false } }
		});

		await goPlay(invalidCode, goConfig['playground']).then(
			(result) => {
				assert.ifError(result);
			},
			(e) => {
				assert.ok(e);
			}
		);
	});

	test('Build Tags checking', async () => {
		const goplsConfig = buildLanguageServerConfig(getGoConfig());
		if (goplsConfig.enabled) {
			// Skip this test if gopls is enabled. Build/Vet checks this test depend on are
			// disabled when the language server is enabled, and gopls is not handling tags yet.
			return;
		}
		// Note: The following checks can't be parallelized because the underlying go build command
		// runner (goBuild) will cancel any outstanding go build commands.

		const checkWithTags = async (tags: string) => {
			const fileUri = vscode.Uri.file(path.join(fixturePath, 'buildTags', 'hello.go'));
			const defaultGoCfg = getGoConfig(fileUri);
			const cfg = Object.create(defaultGoCfg, {
				vetOnSave: { value: 'off' },
				lintOnSave: { value: 'off' },
				buildOnSave: { value: 'package' },
				buildTags: { value: tags }
			}) as vscode.WorkspaceConfiguration;

			const diagnostics = await check({}, fileUri, cfg);
			return ([] as string[]).concat(
				...diagnostics.map<string[]>((d) => {
					return d.errors.map((e) => e.msg) as string[];
				})
			);
		};

		const errors1 = await checkWithTags('randomtag');
		assert.deepEqual(
			errors1,
			['undefined: fmt.Prinln'],
			'check with buildtag "randomtag" failed. Unexpected errors found.'
		);

		// TODO(hyangah): after go1.13, -tags expects a comma-separated tag list.
		// For backwards compatibility, space-separated tag lists are still recognized,
		// but change to a space-separated list once we stop testing with go1.12.
		const errors2 = await checkWithTags('randomtag other');
		assert.deepEqual(
			errors2,
			['undefined: fmt.Prinln'],
			'check with multiple buildtags "randomtag,other" failed. Unexpected errors found.'
		);

		const errors3 = await checkWithTags('');
		assert.equal(
			errors3.length,
			1,
			'check without buildtag failed. Unexpected number of errors found' + JSON.stringify(errors3)
		);
		const errMsg = errors3[0];
		assert.ok(
			errMsg.includes("can't load package: package test/testfixture/buildTags") ||
				errMsg.includes('build constraints exclude all Go files'),
			`check without buildtags failed. Go files not excluded. ${errMsg}`
		);
	});

	test('Test Tags checking', async () => {
		const config1 = Object.create(getGoConfig(), {
			vetOnSave: { value: 'off' },
			lintOnSave: { value: 'off' },
			buildOnSave: { value: 'package' },
			testTags: { value: null },
			buildTags: { value: 'randomtag' }
		});

		const config2 = Object.create(getGoConfig(), {
			vetOnSave: { value: 'off' },
			lintOnSave: { value: 'off' },
			buildOnSave: { value: 'package' },
			testTags: { value: 'randomtag' }
		});

		const config3 = Object.create(getGoConfig(), {
			vetOnSave: { value: 'off' },
			lintOnSave: { value: 'off' },
			buildOnSave: { value: 'package' },
			testTags: { value: 'randomtag othertag' }
		});

		const config4 = Object.create(getGoConfig(), {
			vetOnSave: { value: 'off' },
			lintOnSave: { value: 'off' },
			buildOnSave: { value: 'package' },
			testTags: { value: '' }
		});

		const uri = vscode.Uri.file(path.join(fixturePath, 'testTags', 'hello_test.go'));
		const document = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(document);
		const ctx = new MockExtensionContext() as any;

		const result1 = await testCurrentFile(false, () => config1)(ctx, {})([]);
		assert.equal(result1, true);

		const result2 = await testCurrentFile(false, () => config2)(ctx, {})([]);
		assert.equal(result2, true);

		const result3 = await testCurrentFile(false, () => config3)(ctx, {})([]);
		assert.equal(result3, true);

		const result4 = await testCurrentFile(false, () => config4)(ctx, {})([]);
		assert.equal(result4, false);
	});

	function fixEOL(eol: vscode.EndOfLine, strWithLF: string): string {
		if (eol === vscode.EndOfLine.LF) {
			return strWithLF;
		}
		return strWithLF.split('\n').join('\r\n'); // replaceAll.
	}

	test('Add imports when no imports', async () => {
		const uri = vscode.Uri.file(path.join(fixturePath, 'importTest', 'noimports.go'));
		const document = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(document);

		const expectedText = document.getText() + fixEOL(document.eol, '\n' + 'import (\n\t"bytes"\n)\n');
		const edits = getTextEditForAddImport('bytes');
		const edit = new vscode.WorkspaceEdit();
		assert(edits);
		edit.set(document.uri, edits);
		return vscode.workspace.applyEdit(edit).then(() => {
			assert.equal(
				vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.getText(),
				expectedText
			);
			return Promise.resolve();
		});
	});

	test('Add imports to an import block', async () => {
		const uri = vscode.Uri.file(path.join(fixturePath, 'importTest', 'groupImports.go'));
		const document = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(document);
		const eol = document.eol;

		const expectedText = document
			.getText()
			.replace(fixEOL(eol, '\t"fmt"\n\t"math"'), fixEOL(eol, '\t"bytes"\n\t"fmt"\n\t"math"'));
		const edits = getTextEditForAddImport('bytes');
		const edit = new vscode.WorkspaceEdit();
		assert(edits);
		edit.set(document.uri, edits);
		await vscode.workspace.applyEdit(edit);
		assert.equal(vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.getText(), expectedText);
	});

	test('Add imports and collapse single imports to an import block', async () => {
		const uri = vscode.Uri.file(path.join(fixturePath, 'importTest', 'singleImports.go'));
		const document = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(document);
		const eol = document.eol;

		const expectedText = document
			.getText()
			.replace(
				fixEOL(eol, 'import "fmt"\nimport . "math" // comment'),
				fixEOL(eol, 'import (\n\t"bytes"\n\t"fmt"\n\t. "math" // comment\n)')
			);
		const edits = getTextEditForAddImport('bytes');
		const edit = new vscode.WorkspaceEdit();
		assert(edits);
		edit.set(document.uri, edits);
		await vscode.workspace.applyEdit(edit);
		assert.equal(vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.getText(), expectedText);
	});

	test('Add imports and avoid pseudo package imports for cgo', async () => {
		const uri = vscode.Uri.file(path.join(fixturePath, 'importTest', 'cgoImports.go'));
		const document = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(document);
		const eol = document.eol;

		const expectedText = document
			.getText()
			.replace(fixEOL(eol, 'import "math"'), fixEOL(eol, 'import (\n\t"bytes"\n\t"math"\n)'));
		const edits = getTextEditForAddImport('bytes');
		const edit = new vscode.WorkspaceEdit();
		assert(edits);
		edit.set(document.uri, edits);
		await vscode.workspace.applyEdit(edit);
		assert.equal(vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.getText(), expectedText);
	});

	test('Fill struct', async () => {
		const uri = vscode.Uri.file(path.join(fixturePath, 'fillStruct', 'input_1.go'));
		const golden = fs.readFileSync(path.join(fixturePath, 'fillStruct', 'golden_1.go'), 'utf-8');

		const textDocument = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(textDocument);

		const editor = await vscode.window.showTextDocument(textDocument);
		const selection = new vscode.Selection(12, 15, 12, 15);
		editor.selection = selection;
		const ctx = new MockExtensionContext() as any;
		await runFillStruct(ctx, {})(editor);
		assert.equal(vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.getText(), golden);
	});

	test('Fill struct - select line', async () => {
		const uri = vscode.Uri.file(path.join(fixturePath, 'fillStruct', 'input_2.go'));
		const golden = fs.readFileSync(path.join(fixturePath, 'fillStruct', 'golden_2.go'), 'utf-8');

		const textDocument = await vscode.workspace.openTextDocument(uri);
		const editor = await vscode.window.showTextDocument(textDocument);

		const selection = new vscode.Selection(7, 0, 7, 10);
		editor.selection = selection;
		const ctx = new MockExtensionContext() as any;
		await runFillStruct(ctx, {})(editor);
		assert.equal(vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.getText(), golden);
	});
};

suite('Go Extension Tests (GOPATH mode)', function () {
	this.timeout(20000);
	testAll(false);
});

suite('Go Extension Tests (Module mode)', function () {
	this.timeout(20000);
	testAll(true);
});
