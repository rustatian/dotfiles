/* eslint-disable quotes */
/*---------------------------------------------------------
 * Copyright 2023 The Go Authors. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------*/

import assert from 'assert';
import { parseArgsString } from '../../src/utils/argsUtil';

suite('util tests', () => {
	test('parseArgsString Tests', () => {
		const tt = [
			{
				test: 'Normal',
				args: ['value1 value2', '  value1  value2  ', '   value1   value2   '],
				want: ['value1', 'value2']
			},
			{
				test: 'Quoted',
				args: [`'value 1' "value 2" "value3" 'value4'`],
				want: ['value 1', 'value 2', 'value3', 'value4']
			},
			{
				test: 'SingleSurroundingDoubleQuotes',
				args: [`' "text" '`],
				want: [' "text" ']
			},
			{
				test: 'DoubleSurroundingSingleQuotes',
				args: [`" 'text' "`],
				want: [` 'text' `]
			},
			{
				test: 'EscapedQuotes',
				args: [`\\'a \\'b \\"c \\"d`],
				want: [`'a`, `'b`, '"c', '"d']
			},
			{
				test: 'EscapedQuotesInsideQuotes',
				args: [`'a\\' b\\"'  "\\'c \\"d"`],
				want: [`a' b"`, `'c "d`]
			},
			{
				test: 'Null',
				args: [`''`, '""'],
				want: ['']
			},
			{
				test: 'Empty',
				args: ['', ' ', '  '],
				want: [] as string[]
			},
			{
				test: 'NullAppendedToNull',
				args: [`''`, `''""`, '""""', `''''`],
				want: ['']
			},
			{
				test: 'NullAppendedToNonNull',
				args: [`-e'' word""`, `''-e ""word`, `''-e'' ""word""`, `''""-e ""''word`],
				want: ['-e', 'word']
			},
			{
				test: 'UnmatchedSingleQuotes',
				args: [`something '`, `' something`],
				want: `args has unmatched single quotes (')`
			},
			{
				test: 'UnmatchedDoubleQuotes',
				args: ['something "', '" something'],
				want: 'args has unmatched double quotes (")'
			}
		];

		for (const tc of tt) {
			for (const arg of tc.args) {
				const got = parseArgsString(arg);

				if (typeof tc.want === 'string') {
					// error case
					if (typeof got !== 'string') {
						assert.fail(`${tc.test}: expected error, but got: ` + JSON.stringify(got));
					}

					const errorMatched = got.includes(tc.want);
					if (!errorMatched) {
						assert.fail(
							`${tc.test}: unmatched error, got: ${JSON.stringify(
								got
							)}, want error message include: ${JSON.stringify(tc.want)}`
						);
					}
				} else {
					assert.deepStrictEqual(
						got,
						tc.want,
						`${tc.test}: parseArgsString(${JSON.stringify(arg)}), got: ${JSON.stringify(
							got
						)}, want: ${JSON.stringify(tc.want)}`
					);
				}
			}
		}
	});
});
