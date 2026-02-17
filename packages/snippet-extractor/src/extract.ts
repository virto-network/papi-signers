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
  let removing = false;
  let uncommenting = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Block Start/End Logic (Strict check)
    if (trimmed === "// #remove") {
      removing = true;
      continue;
    }
    if (trimmed === "// #endremove") {
      removing = false;
      continue;
    }
    if (trimmed === "// #uncomment") {
      uncommenting = true;
      continue;
    }
    if (trimmed === "// #enduncomment") {
      uncommenting = false;
      continue;
    }

    // Single-Line Remove Logic
    // If not a block marker (checked above), but contains the tag...
    if (line.includes("// #remove")) {
      // Check if it's the specific single-line usage (at the end)
      // Actually, if it contains it and wasn't the strict block marker, 
      // it MUST be a single line remove (or a comment about it). 
      // We'll treat it as a line to skip.
      continue;
    }

    // Standard Region Logic
    const startMatch = line.match(REGION_START);
    if (startMatch) {
      if (removing) continue;
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
      if (removing) continue;
      const regionNames = endMatch[1].split(",").map((s) => s.trim());
      for (const name of regionNames) {
        activeRegions.delete(name);
      }
      continue;
    }

    if (removing) continue;

    if (activeRegions.size > 0) {
      // Process uncomment logic
      let processedLine = line;
      let shouldUncomment = uncommenting;

      // Check for single-line uncomment
      if (line.includes("// #uncomment")) {
         shouldUncomment = true;
         // Strip the marker from the line for processing?
         // Example: // code // #uncomment -> we want "code"
         // If we just uncomment, we get " code // #uncomment"
         // Valid point. Usually you'd want to remove the marker too.
         const markerIndex = processedLine.indexOf("// #uncomment");
         if (markerIndex !== -1) {
            processedLine = processedLine.substring(0, markerIndex).trimEnd();
         }
      }

      if (shouldUncomment) {
        const uncommentMatch = processedLine.match(/^\s*\/\/ ?(.*)/);
        if (uncommentMatch) {
          const indentIndex = processedLine.indexOf("//");
          if (indentIndex !== -1) {
             const indent = processedLine.substring(0, indentIndex);
             processedLine = indent + uncommentMatch[1];
          }
        }
      }

      for (const name of activeRegions) {
        const region = regions[name];
        if (region.blocks.length === 0) {
          region.blocks.push([]);
        }
        region.blocks[region.blocks.length - 1].push(processedLine);
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
