# Sailfish OS SDK for VS Code

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85.0-007ACC.svg)](https://code.visualstudio.com/)

Build, deploy, and manage [Sailfish OS](https://sailfishos.org/) applications directly from VS Code using the [sfdk](https://docs.sailfishos.org/Tools/Platform_SDK/) CLI tool.

![Sailfish SDK Explorer](https://img.shields.io/badge/status-beta-orange)

## Features

- **Build & Deploy** — Build your app with `sfdk build` and deploy to devices or emulators in one click
- **Device Management** — Browse connected devices and emulators in a dedicated sidebar
- **Build Targets** — Switch between architectures (aarch64, armv7hl, i486) from the sidebar
- **Build Engine Control** — Start, stop, and monitor the build engine from the status bar
- **Emulator Control** — Start and stop emulators from the device tree context menu
- **RPM Packaging** — Create RPM packages and run quality checks
- **Project Init** — Generate `.clangd` and `.vscode/settings.json` for C++ IntelliSense
- **QML Live** — Toggle QML Live mode and run apps with live-reload on device
- **Task Integration** — Use sfdk commands as VS Code tasks in `tasks.json`
- **Terminal Output** — All command output streams to a dedicated "Sailfish SDK" terminal

## Prerequisites

- [Sailfish SDK](https://docs.sailfishos.org/Tools/Sailfish_SDK/) installed with the `sfdk` CLI available in your PATH
- VS Code 1.85.0 or later

## Installation

### From VSIX (manual)

1. Download the latest `.vsix` from [Releases](https://github.com/erwanlpfr/sfdk-vscode/releases)
2. In VS Code, run **Extensions: Install from VSIX...** from the Command Palette
3. Select the downloaded file

### From source

```bash
git clone https://github.com/erwanlpfr/sfdk-vscode.git
cd sfdk-vscode
bun install
bun run compile
```

Then press `F5` in VS Code to launch the Extension Development Host.

## Usage

The extension activates automatically when your workspace contains a `.sfdk/` directory or `.pro` files (Qt project files).

### Sidebar

Open the **Sailfish SDK** panel in the Activity Bar to see:

- **Devices** — Lists emulators and hardware devices with their connection details
- **Build Targets** — Lists available build targets with architecture info

Right-click items for context actions like deploy, set active device/target, or start/stop emulators.

### Status Bar

Five status bar items appear on the left:

| Icon | Purpose |
| ---- | ------- |
| `$(play)` | Trigger a build |
| `$(vm)` | Build engine status (click to toggle) |
| `$(package)` | Active build target (click to change) |
| `$(device-mobile)` | Active device (click to change) |
| `$(zap)` / `$(circle-slash)` | QML Live toggle (click to enable/disable) |

Items turn yellow when attention is needed (engine stopped, no target/device selected).

### Commands

Open the Command Palette (`Ctrl+Shift+P`) and type `SFDK` to see all available commands:

| Command | Description |
| ------- | ----------- |
| `SFDK: Build` | Run `sfdk build` |
| `SFDK: Deploy to Device` | Deploy to the selected device |
| `SFDK: Run qmake` | Run the qmake step |
| `SFDK: Run make` | Run the make step |
| `SFDK: Create RPM Package` | Package the project as RPM |
| `SFDK: Check RPM Quality` | Run RPM quality checks |
| `SFDK: Set Build Target` | Pick a build target |
| `SFDK: Set Device` | Pick a device |
| `SFDK: Start Build Engine` | Start the build engine |
| `SFDK: Stop Build Engine` | Stop the build engine |
| `SFDK: Start/Stop Build Engine` | Toggle the build engine |
| `SFDK: Start Emulator` | Start an emulator |
| `SFDK: Stop Emulator` | Stop an emulator |
| `SFDK: Initialize Project` | Generate `.clangd` and `.vscode/settings.json` |
| `SFDK: Toggle QML Live` | Enable/disable QML Live mode |
| `SFDK: Run with QML Live` | Launch app on device with QML Live |

### Initialize Project

Run `SFDK: Initialize Project` from the Command Palette to generate editor configuration for C++ IntelliSense in your Sailfish OS project:

- **`.clangd`** — clangd compile flags targeting the active build target's sysroot, with GCC and Qt 5 include paths auto-discovered
- **`.vscode/settings.json`** — file associations (`.qml`, `.pro`, `.spec`) and exclusions for generated files (`moc_*.cpp`, `*.o`)

The command reads the active build target from `.sfdk/target` (or prompts you to pick one) and scans the SDK sysroot at `~/SailfishOS/mersdk/targets/`.

### QML Live

[QML Live](https://docs.sailfishos.org/Develop/Apps/Tutorials/QML_Live_Coding_With_Qt_QmlLive/) lets you see QML changes on the device in real-time without rebuilding.

1. Set `sfdk.qmlLive.appBinary` to the path of your app binary on the device (e.g. `/usr/bin/harbour-myapp`)
2. Optionally set `sfdk.qmlLive.workspacePath` to limit live-reload to a subdirectory (e.g. `qml`)
3. Click the **QML Live** status bar item to enable the toggle
4. Run `SFDK: Run with QML Live` to launch the app wrapped with `qmlliveruntime-sailfish`

### Tasks

You can use sfdk commands as VS Code tasks. Add to your `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "sfdk",
      "command": "build",
      "label": "sfdk: build",
      "group": "build"
    },
    {
      "type": "sfdk",
      "command": "deploy",
      "args": ["--rsync"],
      "label": "sfdk: deploy (rsync)"
    }
  ]
}
```

## Configuration

| Setting | Default | Description |
| ------- | ------- | ----------- |
| `sfdk.path` | `""` | Absolute path to the `sfdk` binary. Leave empty to auto-detect from PATH. |
| `sfdk.deployMethod` | `--sdk` | Default deployment method (`--sdk`, `--pkcon`, `--rsync`, `--zypper`, `--manual`) |
| `sfdk.autoBuildBeforeDeploy` | `true` | Automatically run build before deploying |
| `sfdk.qmlLive.appBinary` | `""` | Path to the app binary on the device (e.g. `/usr/bin/harbour-myapp`) |
| `sfdk.qmlLive.workspacePath` | `""` | Restrict QML Live to a subdirectory (e.g. `qml`) |

## Project Structure

```text
src/
├── core/                  # Pure business logic (no VS Code dependency)
│   ├── types.ts           # TypeScript interfaces
│   ├── client.ts          # sfdk CLI process wrapper
│   ├── constants.ts       # Shared constants
│   ├── parsers.ts         # Output parsers for device/target lists
│   ├── templates.ts       # .clangd and .vscode/settings.json generators
│   └── commands/          # Command implementations
├── vscode/                # VS Code integration layer
│   ├── extension.ts       # Activation & setup
│   ├── commandAdapter.ts  # Command registration
│   ├── deviceTree.ts      # Device tree view provider
│   ├── targetTree.ts      # Target tree view provider
│   ├── statusBar.ts       # Status bar items
│   ├── taskProvider.ts    # Task provider
│   └── initProject.ts    # Initialize Project command
└── test/                  # Unit tests
```

The `core/` layer has zero VS Code dependencies, making it easy to test and reuse.

## Development

```bash
# Install dependencies
bun install

# Compile
bun run compile

# Watch mode
bun run watch

# Run tests
bun test

# Lint
bun run lint

# Package as VSIX
bunx @vscode/vsce package --no-dependencies
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.

## License

[GPL-3.0](LICENSE)
