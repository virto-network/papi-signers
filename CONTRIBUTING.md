# Contributing to Virto Signer

Welcome! We appreciate your interest in contributing to the Virto Signer project.

## Directory Structure

This is a monorepo managed by npm workspaces:

- `signer`: The core signer logic.
- `authenticators/*`: Authenticator implementations (WebAuthn, Substrate).
- `e2e-tests`: End-to-end integration tests (private).

## Development Workflow

### Prerequisites

- Node.js v20+
- npm v10+

### Setup

```bash
npm install
```

### Building

Build all workspaces:

```bash
npm run build
```

### Testing

Run tests across all workspaces:

```bash
npm test
```

## Code Style

We use [Biome](https://biomejs.dev/) for formatting and linting.

### Check Code

To check for linting errors and formatting issues:

```bash
npm run check
```

### Fix Code

To automatically format code and fix safe lint errors:

```bash
npm run format
```

## Release Workflow (Versioning)

We use [Changesets](https://github.com/changesets/changesets) to manage versioning and releases.

### 1. Register a Change

If your PR contains changes that affect the published packages, you **must** include a changeset.

1. Run the interactive command:

    ```bash
    npx changeset
    ```

2. Select the affected packages.
3. Choose the semantic version bump:
    - **Patch**: Bug fixes, internal changes.
    - **Minor**: New features (backward compatible).
    - **Major**: Breaking changes.
4. Write a summary of the change.
5. **Commit** the generated `.md` file in the `.changeset` directory.

### 2. Release Process

The release process is automated via GitHub Actions:

1. When changes are pushed to `main`, a "Version Packages" PR is created/updated.
2. Merging that PR triggers the release:
    - Versions are bumped in `package.json`.
    - Changelogs are updated.
    - Packages are published to npm.
    - GitHub Releases are created.
