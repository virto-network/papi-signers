#!/usr/bin/env node

import { combineBlocks, extractSnippets } from "./extract.js";

import fg from "fast-glob";
import { formatSnippet } from "./format.js";
import fs from "node:fs/promises";
import { loadConfig } from "./config.js";
import path from "node:path";

async function main() {
  try {
    const config = await loadConfig();
    console.log(`Loaded config: searching in ${config.include.join(", ")}`);

    const files = await fg(config.include, {
      ignore: config.exclude,
      absolute: true,
    });

    console.log(`Found ${files.length} files to process.`);

    await fs.mkdir(config.outputDir, { recursive: true });

    let count = 0;
    for (const file of files) {
      const content = await fs.readFile(file, "utf-8");
      const regions = extractSnippets(content);
      
      for (const region of regions) {
        const rawContent = combineBlocks(region.blocks);
        const formattedContent = await formatSnippet(rawContent, "snippet.ts", config.prettierOptions);
        
        const outputPath = path.join(config.outputDir, `${region.name}.ts`);
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });
        
        await fs.writeFile(outputPath, formattedContent);
        console.log(`Extracted: ${region.name} -> ${outputPath}`);
        count++;
      }
    }
    console.log(`\nSuccessfully extracted ${count} snippets to ${config.outputDir}`);

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
