# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add automated UI tests on ./loama
- Add Github action to run UI tests on PR to default branch

## [0.1.0] - 2025-02-20

### Added

- Introduced select component which can create new permission subjects
- Added a toaster component to loama for better ux when an error occurs
- Add confirm dialog when granting control permission
- Adds a switch will remove the access of a user. It preserves the given permissions in the index & will prevent remote from overwriting these when an item is disabled
- Add button to remove access from resource for subject
- Add pinia store for external state management in loama
- Add default image for logged in user

### Fixed

### Changed

- Works for Node 20 LTS
- General API cleanup
- Separated into more targeted modules
- Reworded some labels to make loama fit better in the solid ecosystem vocabulary
- Clone index item permission array to remove references
- Replace seperate npm lock files with yarn workspaces
- Add [nx](nx.dev) as monorepo tool to run multipe jobs at once
- Removed /loama prefix in url
- Rewritten the controller package to make the store & permission management logic modulair
- Try to refresh existing sessions (0-click refresh)
- Load index eagerly when requesting info about container resources
- Change components so everything uses typescript
- Apps can run in a configurable, non-empty base path ([issue #41](https://github.com/SolidLabResearch/loama/issues/41))

### Deleted

- Removed pnpm dependency

[0.1.0]: https://github.com/SolidLabResearch/loama/releases/tag/v0.1.0
[Unreleased]: https://github.com/SolidLabResearch/loama/compare/v0.1.0...HEAD
