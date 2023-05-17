// Copyright 2020 The Go Authors. All rights reserved.
// Licensed under the MIT License.
// See LICENSE in the project root for license information.

package goplssetting

import (
	"bytes"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestRun(t *testing.T) {
	if _, err := exec.LookPath("gopls"); err != nil {
		t.Skipf("gopls is not found (%v), skipping...", err)
	}
	if _, err := exec.LookPath("jq"); err != nil {
		t.Skipf("jq is not found (%v), skipping...", err)
	}
	testfile := filepath.Join("..", "..", "package.json")
	got, err := Generate(testfile, false)
	if err != nil {
		t.Fatalf("run failed: %v", err)
	}
	t.Logf("%s", got)
}

func TestWriteAsVSCodeSettings(t *testing.T) {
	if _, err := exec.LookPath("jq"); err != nil {
		t.Skipf("jq is not found (%v), skipping...", err)
	}
	testCases := []struct {
		name string
		in   *OptionJSON
		out  string
	}{
		{
			name: "boolean",
			in: &OptionJSON{
				Name:    "verboseOutput",
				Type:    "bool",
				Doc:     "verboseOutput enables additional debug logging.\n",
				Default: "false",
			},
			out: `"verboseOutput": {
					"type": "boolean",
					"markdownDescription": "verboseOutput enables additional debug logging.\n",
					"default": false,
					"scope": "resource"
				}`,
		},
		{
			name: "time",
			in: &OptionJSON{
				Name:    "completionBudget",
				Type:    "time.Duration",
				Default: "\"100ms\"",
			},
			out: `"completionBudget": {
					"type": "string",
					"default": "100ms",
					"scope": "resource"
				}`,
		},
		{
			name: "map",
			in: &OptionJSON{
				Name:    "analyses",
				Type:    "map[string]bool",
				Default: "{}",
			},
			out: `"analyses":{
					"type": "object",
					"scope": "resource"
				}`,
		},
		{
			name: "enum",
			in: &OptionJSON{
				Name: "matcher",
				Type: "enum",
				EnumValues: []EnumValue{
					{
						Value: "\"CaseInsensitive\"",
						Doc:   "",
					},
					{
						Value: "\"CaseSensitive\"",
						Doc:   "",
					},
					{
						Value: "\"Fuzzy\"",
						Doc:   "",
					},
				},
				Default: "\"Fuzzy\"",
			},
			out: `"matcher": {
 					"type": "string",
					"enum": [ "CaseInsensitive", "CaseSensitive", "Fuzzy" ],
					"markdownEnumDescriptions": [ "","","" ],
					"default": "Fuzzy",
					"scope": "resource"
				}`,
		},
		{
			name: "array",
			in: &OptionJSON{
				Name:    "directoryFilters",
				Type:    "[]string",
				Default: "[\"-node_modules\", \"-vendor\"]",
			},
			out: `"directoryFilters": {
					"type": "array",
					"default": ["-node_modules", "-vendor"],
					"scope": "resource"
				}`,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			options := []*OptionJSON{tc.in}
			b, err := asVSCodeSettings(options)
			if err != nil {
				t.Fatal(err)
			}
			if got, want := normalize(t, string(b)), normalize(t, `
			{
				"gopls": {
					"type": "object",
					"markdownDescription": "Configure the default Go language server ('gopls'). In most cases, configuring this section is unnecessary. See [the documentation](https://github.com/golang/tools/blob/master/gopls/doc/settings.md) for all available settings.",
					"scope": "resource",
					"properties": {
				       `+tc.out+`
					}
				}
			}`); got != want {
				t.Errorf("writeAsVSCodeSettings = %v, want %v", got, want)
			}
		})
	}
}

func normalize(t *testing.T, in string) string {
	t.Helper()
	cmd := exec.Command("jq")
	cmd.Stdin = strings.NewReader(in)
	stderr := new(bytes.Buffer)
	cmd.Stderr = stderr

	out, err := cmd.Output()
	if err != nil {
		t.Fatalf("%s\n%s\nfailed to run jq: %v", in, stderr, err)
	}
	return string(out)
}
