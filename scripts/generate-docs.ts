import fs from "node:fs/promises";
import path from "node:path";

interface Region {
  name: string;
  content: string[];
}

const REGION_START = /\/\/ #docregion (.+)/;
const REGION_END = /\/\/ #enddocregion (.+)/;

async function extractRegions(filePath: string): Promise<Region[]> {
  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const regions: Record<string, string[]> = {};
  const activeRegions = new Set<string>();

  for (const line of lines) {
    const startMatch = line.match(REGION_START);
    if (startMatch) {
      const regionName = startMatch[1].trim();
      activeRegions.add(regionName);
      if (!regions[regionName]) regions[regionName] = [];
      continue;
    }

    const endMatch = line.match(REGION_END);
    if (endMatch) {
      activeRegions.delete(endMatch[1].trim());
      continue;
    }

    if (activeRegions.size > 0) {
      // Assertion stripping removed as per instruction
      for (const region of activeRegions) {
        regions[region].push(line);
      }
    }
  }

  return Object.entries(regions).map(([name, lines]) => {
    // Determine minimum indentation (ignoring empty lines)
    let minIndent = Infinity;
    for (const line of lines) {
      if (line.trim().length === 0) continue;
      const indent = line.search(/\S|$/);
      if (indent < minIndent) minIndent = indent;
    }
    if (minIndent === Infinity) minIndent = 0;

    const dedentedLines = lines.map((line) =>
      line.length >= minIndent ? line.slice(minIndent) : line
    );

    return { name, content: dedentedLines };
  });
}

async function getFiles(dir: string): Promise<string[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    })
  );
  return Array.prototype.concat(...files);
}

async function main() {
  const rootDir = process.cwd();
  const testDirs = [
    path.resolve(rootDir, "e2e-tests"),
    path.resolve(rootDir, "signer/test"),
    path.resolve(rootDir, "authenticators/webauthn/test"),
  ];
  const docsDir = path.resolve(rootDir, "docs");
  const guideDir = path.join(docsDir, "guide");
  const snippetsDir = path.join(guideDir, "snippets");

  await fs.mkdir(snippetsDir, { recursive: true });

  const files: string[] = [];
  for (const dir of testDirs) {
    try {
      const dirFiles = await getFiles(dir);
      files.push(...dirFiles);
    } catch (e) {
      console.warn(`Could not read directory ${dir}:`, e);
    }
  }

  for (const filePath of files) {
    if (!filePath.endsWith(".ts")) continue;

    console.log(`Processing ${filePath}...`);
    const regions = await extractRegions(filePath);

    for (const region of regions) {
      // name can be "substrate/register", so we need to ensure directory exists
      const snippetPath = path.join(snippetsDir, `${region.name}.ts`);
      const snippetDir = path.dirname(snippetPath);

      await fs.mkdir(snippetDir, { recursive: true });
      await fs.writeFile(snippetPath, region.content.join("\n"));
      console.log(`Extracted region: ${region.name} to ${snippetPath}`);
    }
  }

  console.log("Documentation generation complete.");
}

main().catch(console.error);
