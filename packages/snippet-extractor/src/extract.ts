import fs from "node:fs/promises";

interface RegionData {
  name: string;
  blocks: string[][];
}

const REGION_START = /\/\/ #docregion (.+)/;
const REGION_END = /\/\/ #enddocregion (.+)/;

export async function extractSnippetsFromFile(
  filePath: string,
): Promise<RegionData[]> {
  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const regions: Record<string, RegionData> = {};
  const activeRegions = new Set<string>();

  for (const line of lines) {
    const startMatch = line.match(REGION_START);
    if (startMatch) {
      const regionNames = startMatch[1].split(",").map((s) => s.trim());
      for (const name of regionNames) {
        if (!regions[name]) {
          regions[name] = { name, blocks: [] };
        }
        // Start a new block for this region
        regions[name].blocks.push([]);
        activeRegions.add(name);
      }
      continue;
    }

    const endMatch = line.match(REGION_END);
    if (endMatch) {
      const regionNames = endMatch[1].split(",").map((s) => s.trim());
      for (const name of regionNames) {
        activeRegions.delete(name);
      }
      continue;
    }

    if (activeRegions.size > 0) {
      for (const name of activeRegions) {
        // Should always be defined if active
        const region = regions[name];
        if (region.blocks.length === 0) {
          // Fallback if regions started without explicit block (should not happen with logic above)
          region.blocks.push([]);
        }
        region.blocks[region.blocks.length - 1].push(line);
      }
    }
  }

  return Object.values(regions);
}

export function dedentBlock(lines: string[]): string[] {
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    const indent = line.search(/\S|$/);
    if (indent < minIndent) minIndent = indent;
  }
  if (minIndent === Infinity) return lines;

  return lines.map((line) =>
    line.length >= minIndent ? line.slice(minIndent) : line,
  );
}

export function combineBlocks(blocks: string[][]): string {
  return blocks.map((block) => dedentBlock(block).join("\n")).join("\n");
}
