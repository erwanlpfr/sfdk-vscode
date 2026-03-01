# Contributing to sfdk-vscode

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/erwanlpfr/sfdk-vscode.git
   cd sfdk-vscode
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Open in VS Code:

   ```bash
   code .
   ```

4. Press `F5` to launch the Extension Development Host with the extension loaded.

## Project Structure

- **`src/core/`** — Pure business logic with no VS Code dependency. This is where command implementations, the sfdk client wrapper, and output parsers live.
- **`src/vscode/`** — VS Code integration layer (tree views, status bar, command registration).
- **`src/test/`** — Unit tests using Bun's built-in test runner.

The separation between `core/` and `vscode/` is intentional — keep VS Code imports out of `core/` so it remains easy to test.

## Common Tasks

```bash
# Compile the extension
bun run compile

# Watch for changes
bun run watch

# Run tests
bun test

# Package as VSIX
bunx @vscode/vsce package --no-dependencies
```

## Making Changes

1. Create a branch from `main`.
2. Make your changes.
3. Add or update tests if applicable.
4. Run `bun test` to make sure everything passes.
5. Open a pull request.

## Guidelines

- Keep PRs focused on a single change.
- Follow the existing code style and patterns.
- Add tests for new commands or parsers in `src/test/`.
- Business logic goes in `src/core/`, VS Code glue goes in `src/vscode/`.

## Reporting Bugs

Use the [Bug Report](https://github.com/erwanlpfr/sfdk-vscode/issues/new?template=bug_report.yml) template on GitHub. Include your VS Code version, extension version, and sfdk version.

## License

By contributing, you agree that your contributions will be licensed under the [GPL-3.0](LICENSE) license.
