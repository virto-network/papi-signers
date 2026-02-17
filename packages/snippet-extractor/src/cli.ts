#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { extractSnippetsFromFile, combineBlocks } from "./extract.js";
import { formatSnippet } from "./format.js";
import fg from "fast-glob";
import path from "node:path";
import fs from "node:fs/promises";

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
      const regions = await extractSnippetsFromFile(file);

      for (const region of regions) {
        const rawContent = combineBlocks(region.blocks);
        // Assuming TS for now, but could be inferred or configured
        const formattedContent = await formatSnippet(
          rawContent,
          "snippet.ts",
          config.prettierOptions,
        );

        const outputPath = path.join(config.outputDir, `${region.name}.ts`);
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });

        await fs.writeFile(outputPath, formattedContent);
        console.log(`Extracted: ${region.name} -> ${outputPath}`);
        count++;
      }
    }
    console.log(
      `\nSuccessfully extracted ${count} snippets to ${config.outputDir}`,
    );
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
