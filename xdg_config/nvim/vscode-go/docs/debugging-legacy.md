# Debugging with Legacy Debug Adapter

The Go extension historically used a small adapter program to work with the Go debugger, [Delve].
The extension transitioned to communicate with [Delve] directly but there are still cases you may
need to use the legacy debug adapter (e.g. remote debugging). This document explains how to use the
***legacy*** debug adapter.


* [Set up](#set-up)
  * [Installation](#installation)
  * [Configuration](#configuration)
* [Launch Configurations](#launch-configurations)
  * [Specifying build tags](#specifying-build-tags)
  * [Specifying other build flags](#specifying-other-build-flags)
  * [Using VS Code Variables](#using-vs-code-variables)
  * [Snippets](#snippets)
* [Debugging on Windows Subsystem for Linux (WSL)](#debugging-on-windows-subsystem-for-linux-wsl)
* [Remote Debugging](#remote-debugging)
* [Troubleshooting](#troubleshooting)
  * [Read documentation and common issues](#read-documentation-and-common-issues)
  * [Update Delve](#update-delve)
  * [Check for multiple versions of Delve](#check-for-multiple-versions-of-delve)
  * [Check your launch configuration](#check-your-launch-configuration)
  * [Check your GOPATH](#check-your-gopath)
  * [Enable logging](#enable-logging)
  * [Optional: Debug the debugger](#optional-debug-the-debugger)
  * [Ask for help](#ask-for-help)
* [Common issues](#common-issues)

## Set up

[Delve] (`dlv`) should be installed by default when you install this extension.
You may need to update `dlv` to the latest version to support the latest version
of Go. To install or update `dlv`, open the [Command Palette][]
(Windows/Linux: Ctrl+Shift+P; OSX: Shift+Command+P), select [`Go: Install/Update Tools`](settings.md#go-installupdate-tools), and select [`dlv`](tools.md#dlv).

## Selecting `legacy` debug adapter

To opt in to use the legacy debug adapter (`legacy`) by default, add the following in your VSCode settings.json.

```
    "go.delveConfig": {
        "debugAdapter": "legacy",
    }
```

If you want to use the legacy mode for only a subset of your launch configurations, you can use [the `debugAdapter` attribute](#launchjson-attributes) to switch between `"dlv-dap"` and `"legacy"` mode.
For [Remote Debugging](#remote-debugging) (launch configuration with `"mode": "remote"` attribute),
the extension will use the `"legacy"` mode by default, so setting this attribute won't be necessary.

Throughout this document, we assume that you opted in to use the legacy debug adapter.
For debugging using the new debug adapter (default, `"dlv-dap"` mode), please see the documentation about [Debugging](https://github.com/golang/vscode-go/tree/master/docs/debugging-legacy.md).

### Configuration

You may not need to configure any settings to start debugging your programs, but you should be aware that the debugger looks at the following settings.

* Related to [`GOPATH`](gopath.md):
  * [`go.gopath`](settings.md#go.gopath)
  * [`go.inferGopath`](settings.md#go.inferGopath)
* [`go.delveConfig`](settings.md#go.delveConfig)
  * `apiVersion`: Controls the version of the Delve API used (default: `2`).
  * `dlvLoadConfig`: The configuration passed to Delve, which controls how variables are shown in the Debug pane. Not applicable when `apiVersion` is 1.
    * `maxStringLen`: Maximum number of bytes read from a string (default: `64`).
    * `maxArrayValues`: Maximum number of elements read from an array, slice, or map (default: `64`).
    * `maxStructFields`: Maximum number of fields read from a struct. A setting of `-1` indicates that all fields should be read (default: `-1`).
    * `maxVariableRecurse`: How far to recurse when evaluating nested types (default: `1`).
    * `followPointers`: Automatically dereference pointers (default: `true`).
  * `showGlobalVariables`: Show global variables in the Debug view (default: `false`).
  * `debugAdapter`: Controls which debug adapter to use (default: `legacy`).
  * `substitutePath`: Path mappings to apply to get from a path in the editor to a path in the compiled program (default: `[]`).

There are some common cases when you might want to tweak the Delve configurations.

* To change the default cap of 64 on string and array length when inspecting variables in the Debug view, set `maxStringLen`. (See a related known issue: [golang/vscode-go#126](https://github.com/golang/vscode-go/issues/126)).
* To evaluate nested variables in the Run view, set `maxVariableRecurse`.

## Launch Configurations

To get started debugging, run the command `Debug: Open launch.json`. If you did not already have a `launch.json` file for your project, this will create one for you. It will contain this default configuration, which can be used to debug the current package. With mode `auto`, the file that is currently open will determine whether to debug the program as a test. If `program` is instead set to a Go file, that file will determine which mode to run in.

```json5
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch",
            "type": "go",
            "request": "launch",
            "mode": "auto",
            "program": "${fileDirname}",
            "debugAdapter": "legacy",
            "env": {},
            "args": []
        }
    ]
}
```

There are some more properties that you can adjust in the debug configuration:

Property   | Description
--------   | -----------
name       | The name for your configuration as it appears in the drop-down in the Run view.
type       | Always leave this set to `"go"`. VS Code uses this setting to determine which extension should be used for debugging.
request    | One of `launch` or `attach`. Use `attach` when you want to attach to a running process.
mode       | For `launch` requests, one of `auto`, `debug`, `remote`, `test`, or `exec`. For `attach` requests, use `local` or `remote`.
program    | In `test` or `debug` mode, this refers to the absolute path to the package or file to debug. In `exec` mode, this is the existing binary file to debug. Not applicable to `attach` requests.
env        | Environment variables to use when debugging. Use the format: `{ "NAME": "VALUE" }`. Not applicable to `attach` requests.
envFile    | Absolute path to a file containing environment variable definitions. The environment variables passed in via the `env` property override the ones in this file.
args       | Array of command-line arguments to pass to the program being debugged.
showLog    | If `true` and `logDest` is not set, Delve logs will be printed in the Debug Console panel. If `true` and `logDest` is set, logs will be written to the `logDest` file. This corresponds to `dlv`'s `--log` flag.
logOutput  | Comma-separated list of Delve components (`debugger`, `gdbwire`, `lldbout`, `debuglineerr`, `rpc`) that should produce debug output when `showLog` is `true`. This corresponds to `dlv`'s `--log-output` flag.
logDest    | Absolute path to the delve log output file. This corresponds to `dlv`'s `--log-dest` flag, but number (used for file descriptor) is disallowed. Supported only in dlv-dap mode on Linux and Mac.
buildFlags | Build flags to pass to the Go compiler. This corresponds to `dlv`'s `--build-flags` flag.
dlvFlags   | Extra flags passed to `dlv`. See `dlv help` for the full list of supported flags. This is useful when users need to pass less commonly used or new flags such as `--only-same-user`, `--check-go-version`. Note that some flags such as `--log-output`, `--log`, `--log-dest`, `--api-version` already have corresponding properties in the debug configuration, and flags such as `--listen` and `--headless` are used internally. If they are specified in `dlvFlags`, they may be ignored or cause an error.
remotePath | If remote debugging (`mode`: `remote`), this should be the absolute path to the package being debugged on the remote machine. See the section on [Remote Debugging](#remote-debugging) for further details. [golang/vscode-go#45](https://github.com/golang/vscode-go/issues/45) is also relevant. Becomes the first mapping in substitutePath.
substitutePath | An array of mappings from an absolute local path to an absolute remote path that is used by the debuggee. The debug adapter will replace the local path with the remote path in all of the calls. The mappings are applied in order, and the first matching mapping is used. This can be used to map files that have moved since the program was built, different remote paths, and symlinked files or directories. This is intended to be equivalent to the [substitute-path](https://github.com/go-delve/delve/tree/master/Documentation/cli#config) configuration, and will eventually configure substitute-path in Delve directly.
cwd | The working directory to be used in running the program. If remote debugging (`mode`: `remote`), this should be the absolute path to the working directory being debugged on the local machine. The extension defaults to the workspace folder, or the workspace folder of the open file in multi root workspaces. See the section on [Remote Debugging](#remote-debugging) for further details. [golang/vscode-go#45](https://github.com/golang/vscode-go/issues/45) is also relevant.
processId  | This is the process ID of the executable you want to debug. Applicable only when using the `attach` request in `local` mode. By setting this to the command name of the process, `${command:pickProcess}`, or`${command:pickGoProcess}` a quick pick menu will show a list of processes to choose from.

### Specifying [build tags](https://golang.org/pkg/go/build/#hdr-Build_Constraints)

If your program contains [build tags](https://golang.org/pkg/go/build/#hdr-Build_Constraints), you can use the `buildFlags` property. For example, if you build your code with:

```bash
go build -tags=whatever
```

Then, set:

```json5
"buildFlags": "-tags=whatever"
```

in your launch configuration. This property supports multiple tags, which you can set by using single quotes. For example:

```json5
"buildFlags": "-tags='first,second,third'"
```

<!--TODO(rstambler): Confirm that the extension works with a comma (not space) separated list.-->

### Specifying other build flags

The flags specified in `buildFlags` and `env.GOFLAGS` are passed to the Go compiler when building your program for debugging. Delve adds `-gcflags=all="-N -l"` to the list of build flags to disable optimizations. User specified buildFlags conflict with this setting, so the extension removes them ([Issue #117](https://github.com/golang/vscode-go/issues/117)). If you wish to debug a program using custom `-gcflags`, build the program using `go build` and launch using `exec` mode:

```json
{
    "name": "Launch executable",
    "type": "go",
    "request": "launch",
    "mode": "exec",
    "program": "/absolute/path/to/executable"
}
```

Note that it is not recommended to debug optimized executables as Delve may not have the information necessary to properly debug your program.

### Using [VS Code variables]

Any property in the launch configuration that requires a file path can be specified in terms of [VS Code variables]. Here are some useful ones to know:

* `${workspaceFolder}` refers to the root of the workspace opened in VS Code. If using a multi root workspace, you must specify the folder name `${workspaceFolder:folderName}`
* `${fileWorkspaceFolder}` refers to the the current opened file's workspace folder.
* `${file}` refers to the currently opened file.
* `${fileDirname}` refers to the directory containing the currently opened file. This is typically also the name of the Go package containing this file, and as such, can be used to debug the currently opened package.

### Snippets

In addition to [VS Code variables], you can make use of [snippets] when editing the launch configuration in `launch.json`.

When you type `go` in the `launch.json` file, you will see snippet suggestions for debugging the current file or package or a given test function.

Below are the available sample configurations:

#### Debug the current file (`Go: Launch file`)

Recall that `${file}` refers to the currently opened file (see [Using VS Code Variables](#using-vs-code-variables)). For debugging a package that consists with multiple files, use `${fileDirname}` instead.

```json5
{
    "name": "Launch file",
    "type": "go",
    "request": "launch",
    "mode": "auto",
    "program": "${file}"
}
```

#### Debug a single test function (`Go: Launch test function`)

Recall that `${workspaceFolder}` refers to the current workspace (see [Using VS Code Variables](#using-vs-code-variables)). You will need to manually specify the function name instead of `"MyTestFunction"`.

```json5
{
    "name": "Launch test function",
    "type": "go",
    "request": "launch",
    "mode": "test",
    "program": "${workspaceFolder}",
    "args": [
        "-test.run",
        "MyTestFunction"
    ]
}
```

#### Debug all tests in the given package (`Go: Launch test package`)

A package is a collection of source files in the same directory that are compiled together.
Recall that `${fileDirname}` refers to the directory of the open file (see [Using VS Code Variables](#using-vs-code-variables)).

```json5
{
    "name": "Launch test package",
    "type": "go",
    "request": "launch",
    "mode": "test",
    "program": "${workspaceFolder}"
}
```

#### Attach to a running local process via its process ID (`Go: Attach to local process`)

Substitute `processName` with the name of the local process.

```json5
{
    "name": "Attach to local process",
    "type": "go",
    "request": "attach",
    "mode": "local",
    "processId": "processName"
}
```

#### Attach to a running server (`Go: Connect to Server`)

```json5
{
    "name": "Connect to server",
    "type": "go",
    "request": "attach",
    "mode": "remote",
    "remotePath": "${workspaceFolder}",
    "port": 2345,
    "host": "127.0.0.1"
}
```

#### Debug an existing binary

There is no snippet suggestion for this configuration.

```json
{
    "name": "Launch executable",
    "type": "go",
    "request": "launch",
    "mode": "exec",
    "program": "/absolute/path/to/executable"
}
```

If passing arguments to or calling subcommands and flags from a binary, the `args` property can be used.

```json
{
    "name": "Launch executable",
    "type": "go",
    "request": "launch",
    "mode": "exec",
    "program": "/absolute/path/to/executable",
    "args": ["subcommand", "arg", "--flag"],
}
```

## Debugging on [Windows Subsystem for Linux (WSL)](https://docs.microsoft.com/en-us/windows/wsl/)

If you are using using WSL, you will need the WSL 2 Linux kernel.  See [WSL 2 Installation](https://docs.microsoft.com/en-us/windows/wsl/wsl2-install) and note the Window 10 build version requirements.

## Remote Debugging

<!--TODO(quoctruong): We use "remote" and "target", as well as "local" here. We should define these terms more clearly and be consistent about which we use.-->

To debug on a remote machine, you must first run a headless Delve server on the target machine. The examples below assume that you are in the same folder as the package you want to debug. If not, please refer to the [`dlv debug` documentation](https://github.com/go-delve/delve/blob/master/Documentation/usage/dlv_debug.md).

To start the headless Delve server:

```bash
dlv debug --headless --listen=:2345 --log --api-version=2
```

Any arguments that you want to pass to the program you are debugging must also be passed to this Delve server. For example:

```bash
dlv debug --headless --listen=:2345 --log -- -myArg=123
```

Then, create a remote debug configuration in your `launch.json`.

```json5
{
    "name": "Launch remote",
    "type": "go",
    "request": "attach",
    "mode": "remote",
    "remotePath": "/absolute/path/dir/on/remote/machine",
    "port": 2345,
    "host": "127.0.0.1",
    "cwd": "/absolute/path/dir/on/local/machine",
}
```

In the example, the VS Code debugger will run on the same machine as the headless `dlv` server. Make sure to update the `port` and `host` settings to point to your remote machine.

`remotePath` should point to the absolute path of the program being debugged in the remote machine. `cwd` should point to the absolute path of the working directory of the program being debugged on your local machine. This should be the counterpart of the folder in `remotePath`. See [golang/vscode-go#45](https://github.com/golang/vscode-go/issues/45) for updates regarding `remotePath` and `cwd`. You can also use the equivalent `substitutePath` configuration.

```json5
{
    "name": "Launch remote",
    "type": "go",
    "request": "attach",
    "mode": "remote",
    "substitutePath": [
		{
			"from": "/absolute/path/dir/on/local/machine",
			"to": "/absolute/path/dir/on/remote/machine",
		},
	],
    "port": 2345,
    "host": "127.0.0.1",
    "cwd": "/absolute/path/dir/on/local/machine",
}
```

If you do not set, `remotePath` or `substitutePath`, then the debug adapter will attempt to infer the path mappings. See [golang/vscode-go#45](https://github.com/golang/vscode-go/issues/45) for more information.

When you run the `Launch remote` target, VS Code will send debugging commands to the `dlv` server you started, instead of launching it's own `dlv` instance against your program.

For further examples, see [this launch configuration for a process running in a Docker host](https://github.com/lukehoban/webapp-go/tree/debugging).

## Troubleshooting

Debugging is one of the most complex features offered by this extension. The features are not complete, and a new implementation is currently being developed (see [golang/vscode-go#23](https://github.com/golang/vscode-go/issues/23)).

The suggestions below are intended to help you troubleshoot any problems you encounter. If you are unable to resolve the issue, please take a look at the [current known debugging issues](https://github.com/golang/vscode-go/issues?q=is%3Aissue+is%3Aopen+label%3Adebug) or [file a new issue](https://github.com/golang/vscode-go/issues/new/choose).

### Read documentation and [common issues](#common-issues)

Start by taking a quick glance at the [common issues](#common-issues) described below. You can also check the [Delve FAQ](https://github.com/go-delve/delve/blob/master/Documentation/faq.md) in case the problem is mentioned there.

### Update Delve

If the problem persists, it's time to start troubleshooting. A good first step is to make sure that you are working with the latest version of Delve. You can do this by running the [`Go: Install/Update Tools`](settings.md#go-installupdate-tools) command and selecting [`dlv`](tools.md#dlv).

### Check your [launch configuration](#launch-configurations)

Next, confirm that your [launch configuration](#launch-configurations) is correct.

One common error is `could not launch process: stat ***/debug.test: no such file or directory`. You may see this while running in the `test` mode. This happens when the `program` attribute points to a folder with no test files, so ensure that the `program` attribute points to a directory containing the test files you wish to debug.

Also, check the version of the Delve API used in your [launch configuration](#launch-configurations). This is handled by the `–api-version` flag, `2` is the default. If you are debugging on a remote machine, this is particularly important, as the versions on the local and remote machines much match. You can change the API version by editing the [`launch.json` file](#launch-configurations).

### Check for multiple versions of Delve

You might have multiple different versions of [`dlv`](tools.md#dlv) installed, and VS Code Go could be using a wrong or old version. Run the [`Go: Locate Configured Go Tools`](settings.md#go-locate-configured-go-tools) command and see where VS Code Go has found `dlv` on your machine. You can try running `which dlv` to see which version of `dlv` you are using on the [command-line](https://github.com/go-delve/delve/tree/master/Documentation/cli).

To fix the issue, simply delete the version of `dlv` used by the Go extension. Note that the extension first searches for binaries in your `$GOPATH/bin` and then looks on your `$PATH`.

If you see the error message `Failed to continue: "Error: spawn EACCES"`, the issue is probably multiple versions of `dlv`.

### Try building your binary **without** compiler optimizations

If you notice `Unverified breakpoints` or missing variables, ensure that your binary was built **without** compiler optimizations. Try building the binary with `-gcflags="all=-N -l"`.

### Check your `GOPATH`

Make sure that the debugger is using the right [`GOPATH`](gopath.md). This is probably the issue if you see `Cannot find package ".." in any of ...` errors. Read more about configuring your [GOPATH](gopath.md) or [file an issue report](https://github.com/golang/vscode-go/issues/new/choose).

**As a work-around**, add the correct `GOPATH` as an environment variable in the `env` property in the `launch.json` file.

### Enable logging

Next, check the logs produced by Delve. These will need to be manually enabled. Follow these steps:

* Set `"showLog": true` in your launch configuration. This will show Delve logs in the Debug Console pane (Ctrl+Shift+Y).
* Set `"trace": "log"` in your launch configuration. Again, you will see logs in the Debug Console pane (Ctrl+Shift+Y). These logs will also be saved to a file and the path to this file will be printed at the top of the Debug Console.
* Set `"logOutput": "rpc"` in your launch configuration. You will see logs of the RPC messages going between VS Code and Delve. Note that for this to work, you must also have set `"showLog": true`.
  * The `logOutput` attribute corresponds to the `--log-output` flag used by Delve. It is a comma-separated list of components that should produce debug output.

See [common issues](#common-issues) below to decipher error messages you may find in your logs.

With `"trace": "log"`, you will see the actual call being made to `dlv`. To aid in your investigation, you can copy that and run it in your terminal.

### **Optional**: Debug the debugger

This is not a required step, but if you want to continue digging deeper, you can, in fact, debug the debugger. The code for the debugger can be found in the [debug adapter module](../src/debugAdapter). See our [contribution guide](contributing.md) to learn how to [run](contributing.md#run) and [sideload](contributing.md#sideload) the Go extension.

### Ask for help

At this point, it's time to look at the [common issues](#common-issues) below or the [existing debugging issues](https://github.com/golang/vscode-go/issues?q=is%3Aissue+is%3Aopen+label%3Adebug) on the [issue tracker](https://github.com/golang/vscode-go/issues). If that still doesn't solve your problem, [file a new issue](https://github.com/golang/vscode-go/issues/new/choose).

## Common Issues

### delve/launch hangs with no messages on WSL

Try running ```delve debug ./main``` in the WSL command line and see if you get a prompt.

**_Solution_**: Ensure you are running the WSL 2 Kernel, which (as of 4/15/2020) requires an early release of the Windows 10 OS. This is available to anyone via the Windows Insider program. See [Debugging on WSL](#debugging-on-windows-subsystem-for-linux-wsl).

### could not launch process: could not fork/exec

The solution this issue differs based on your OS.

#### OSX

This usually happens on OSX due to signing issues. See the discussions in [Microsoft/vscode-go#717](https://github.com/Microsoft/vscode-go/issues/717), [Microsoft/vscode-go#269](https://github.com/Microsoft/vscode-go/issues/269) and [go-delve/delve#357](https://github.com/go-delve/delve/issues/357).

**_Solution_**: You may have to uninstall dlv and install it manually as described in the [Delve instructions](https://github.com/go-delve/delve/blob/master/Documentation/installation/osx/install.md#manual-install).

#### Linux/Docker

Docker has security settings preventing `ptrace(2)` operations by default within the container.

**_Solution_**: To run your container insecurely, pass `--security-opt=seccomp:unconfined` to `docker run`. See [go-delve/delve#515](https://github.com/go-delve/delve/issues/515) for references.

#### could not launch process: exec: "lldb-server": executable file not found in $PATH

This error can show up for Mac users using Delve versions 0.12.2 and above. `xcode-select --install` has solved the problem for a number of users.

### Debugging symlink directories

Since the debugger and go compiler use the actual filenames, extra configuration is required to debug symlinked directories. Use the `substitutePath` property to tell the debugAdapter how to properly translate the paths. For example, if your project lives in `/path/to/actual/helloWorld`, but the project is open in vscode under the linked folder `/path/to/hello`, you can add the following to your config to set breakpoints in the files in `/path/to/hello`:

```json5
{
    "name": "Launch remote",
    "type": "go",
    "request": "launch",
    "mode": "debug",
    "program": "/path/to/hello",
    "substitutePath": [
		{
			"from": "/path/to/hello",
			"to": "/path/to/actual/helloWorld",
		},
	],
}
```

This extension does not provide general support for debugging projects containing symlinks. If `substitutePath` does not meet your needs, please consider commenting on this issue that contains updates to symlink support reference [golang/vscode-go#622](https://github.com/golang/vscode-go/issues/622).

[Delve]: https://github.com/go-delve/delve
[VS Code variables]: https://code.visualstudio.com/docs/editor/variables-reference
[snippets]: https://code.visualstudio.com/docs/editor/userdefinedsnippets
[Command Palette]: https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette
