/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable node/no-unpublished-import */
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/
import glob from 'glob';
import Mocha from 'mocha';
import * as path from 'path';
export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		grep: process.env.MOCHA_GREP,
		ui: 'tdd'
	});

	// @types/mocha is outdated
	(mocha as any).color(true);

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((c, e) => {
		glob('gopls/**.test.js', { cwd: testsRoot }, (err, files) => {
			if (err) {
				return e(err);
			}

			// Add files to the test suite
			files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				// Run the mocha test
				mocha.run((failures) => {
					if (failures > 0) {
						e(new Error(`${failures} tests failed.`));
					} else {
						c();
					}
				});
			} catch (err) {
				e(err);
			}
		});
	});
}
