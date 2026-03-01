# Changelog

## [0.3.0]

### Added
- Layered architecture: `src/core/` (pure logic) and `src/vscode/` (integration)
- QML Live toggle and "Run with QML Live" command
- "Initialize Project" command — generates `.clangd` and `.vscode/settings.json`
- Test suite (70 tests covering parsers, client, and commands)
- Biome linter configuration
- Open-source documentation (README, CONTRIBUTING, LICENSE, GitHub templates)

### Changed
- Commands deduplicated with factory patterns
- Accessibility info added to tree view items
- Status bar engine tooltip is now dynamic

## [0.2.0]

### Added
- Initial release with build, deploy, device/target management, and emulator control
