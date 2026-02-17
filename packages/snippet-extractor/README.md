# Snippet Extractor

A CLI tool to extract code snippets from source files for documentation, with support for region tags, content removal, and uncommenting.

## Installation

This package is intended to be used as a development dependency or run via `npx`.

```bash
npm install -D @virtonetwork/snippet-extractor
```

## Usage

### 1. Configuration

Create a `snippet.config.json` file in your project root:

```json
{
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"],
  "outputDir": "docs/snippets",
  "prettierOptions": {
    "parser": "typescript"
  }
}
```

- **include**: Array of glob patterns to search for files.
- **exclude**: (Optional) Array of glob patterns to exclude.
- **outputDir**: Directory where extracted snippets will be saved.
- **prettierOptions**: (Optional) Prettier options for formatting the extracted snippets.

### 2. Add Regions to Source Code

Use special comments to mark regions in your source code.

#### Basic Region

Wraps the code you want to extract.

```typescript
// #docregion my-snippet
const x = 1;
console.log(x);
// #enddocregion my-snippet
```

This will create a file `outputDir/my-snippet.ts` with the content:

```typescript
const x = 1;
console.log(x);
```

#### Removing Content

Use `#remove` to exclude lines from the snippet while keeping them in the source.

```typescript
// #docregion secret-logic
const visible = true;
// #remove
const secret = "hidden";
// #endremove
return visible;
// #enddocregion secret-logic
```

Output:

```typescript
const visible = true;
return visible;
```

#### Uncommenting

Use `#uncomment` to show code in the snippet that is commented out in the source (e.g., to hide compilation errors in incomplete examples or invalid code for demonstration).

```typescript
// #docregion uncomment-example
// #uncomment
// const x: number = "string"; // This would error in real code
// #enduncomment
// #enddocregion uncomment-example
```

Output:

```typescript
const x: number = "string"; // This would error in real code
```

Single-line uncomment is also supported:

```typescript
// const x = 1; // #uncomment
```

### 3. Run the Extractor

```bash
npx snippet-extractor
```

Or add it to your `package.json` scripts:

```json
"scripts": {
  "extract-snippets": "snippet-extractor"
}
```
