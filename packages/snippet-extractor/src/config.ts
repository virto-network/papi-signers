import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const ConfigSchema = z.object({
  include: z.array(z.string()),
  exclude: z.array(z.string()).optional(),
  outputDir: z.string(),
  prettierOptions: z.record(z.string(), z.any()).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export async function loadConfig(
  configFile = "snippet.config.json"
): Promise<Config> {
  const configPath = path.resolve(process.cwd(), configFile);
  try {
    const rawConfig = await fs.readFile(configPath, "utf-8");
    const json = JSON.parse(rawConfig);
    return ConfigSchema.parse(json);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "ENOENT"
    ) {
      throw new Error(`Config file not found at ${configPath}`);
    }
    throw error;
  }
}
