import type { Token } from "./types.js";

export interface RegionData {
  name: string;
  blocks: string[][];
}

export function parse(tokens: Token[]): RegionData[] {
  const regions: Record<string, RegionData> = {};
  const activeRegions = new Set<string>();
  let removing = false;
  let uncommenting = false;

  for (const token of tokens) {
    switch (token.type) {
      case "RemoveStart":
        removing = true;
        break;
      case "RemoveEnd":
        removing = false;
        break;
      case "RegionStart":
        if (removing) continue;
        if (token.args) {
          for (const name of token.args) {
            if (!regions[name]) {
              regions[name] = { name, blocks: [] };
            }
            regions[name].blocks.push([]);
            activeRegions.add(name);
          }
        }
        break;
      case "RegionEnd":
        if (removing) continue;
        if (token.args) {
          for (const name of token.args) {
            activeRegions.delete(name);
          }
        }
        break;
      case "UncommentStart":
        uncommenting = true;
        break;
      case "UncommentEnd":
        uncommenting = false;
        break;
      case "Code":
        if (removing) continue;
        if (activeRegions.size > 0) {
          let content = token.content;

          if (uncommenting) {
            const uncommentMatch = content.match(/^\s*\/\/ ?(.*)/);
            if (uncommentMatch) {
              const indentIndex = content.indexOf("//");
              if (indentIndex !== -1) {
                const indent = content.substring(0, indentIndex);
                content = indent + uncommentMatch[1];
              }
            }
          }

          for (const name of activeRegions) {
            const region = regions[name];
            if (region.blocks.length === 0) {
              region.blocks.push([]);
            }
            region.blocks[region.blocks.length - 1].push(content);
          }
        }
        break;
    }
  }

  return Object.values(regions);
}
