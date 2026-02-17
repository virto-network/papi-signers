import prettier from "prettier";

export async function formatSnippet(
  content: string,
  filepath: string,
  options?: prettier.Options,
): Promise<string> {
  // Infer parser from filepath extension
  // Use a default parser if inference fails, or fallback to typescript
  const parser = filepath.endsWith(".json") ? "json" : "typescript";

  try {
    return await prettier.format(content, {
      parser,
      ...options,
    });
  } catch (error) {
    // Partial code snippets often fail parsing, which is expected.
    // We strictly return the dedented content in that case.
    return content;
  }
}
