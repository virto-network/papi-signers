import { tokenize } from "./compiler/lexer.js";
import { parse } from "./compiler/parser.js";

// Re-export RegionData from parser or types if needed,
// but existing code expects it here or we need to align types.
// Ideally move RegionData to central types file.
// For now, let's keep the export here compatible.
export interface RegionData {
  name: string;
  blocks: string[][];
}

export function extractSnippets(content: string): RegionData[] {
  const tokens = tokenize(content);
  return parse(tokens);
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
    line.length >= minIndent ? line.slice(minIndent) : line
  );
}

export function combineBlocks(blocks: string[][]): string {
  return blocks.map((block) => dedentBlock(block).join("\n")).join("\n");
}
