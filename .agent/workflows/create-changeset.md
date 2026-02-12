---
description: How to create a changeset for the release workflow
---

# Create Changeset Workflow

This workflow instructs AI agents on how to properly version changes in this monorepo using Changesets.

## When to Trigger

- Run this workflow whenever you make a change to the source code of a package (`signer`, `authenticators/*`) that warrants a release.
- Do NOT run this for internal refactors, tests, or documentation changes unless explicitly requested.

## Semantic Versioning Rules (Inferring Bump Type)

Analyze the changes to determine the version bump type:

1. **Major** (`major`):
    - Breaking changes to the public API.
    - Removing or renaming exported functions/classes.
    - Changing function signatures in a backward-incompatible way.
    - *Action*: Ask the user for confirmation before applying a major bump.

2. **Minor** (`minor`):
    - New features that are backward-compatible.
    - Adding new exported functions/classes.
    - Adding new optional parameters to existing functions.

3. **Patch** (`patch`):
    - Bug fixes.
    - internal performance improvements.
    - Non-breaking refactors.

## Steps

1. **Identify Affected Packages**: Determine which workspaces have been modified.
2. **Run Changeset CLI**:

    ```bash
    npx changeset
    ```

3. **Interactive Selection**:
    - Select the changed packages.
    - Choose the bump type based on the rules above.
    - Enter a concise summary of the change.
4. **Verification**: Ensure a new markdown file is created in `.changeset/`.

## Automated Option (for Agent)

If you cannot run interactive commands, you can creating the changeset file manually:

1. Generate a random file name (e.g., `.changeset/silly-bananas-dance.md`).
2. Content format:

   ```markdown
   ---
   "@virtonetwork/signer": patch
   "@virtonetwork/authenticators-webauthn": minor
   ---

   concise description of the change
   ```
