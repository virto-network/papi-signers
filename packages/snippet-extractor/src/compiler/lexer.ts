
import { Token, TokenType } from "./types.js";

const REGION_START = /\/\/ #docregion (.+)/;
const REGION_END = /\/\/ #enddocregion (.+)/;

export function tokenize(content: string): Token[] {
  const lines = content.split("\n");
  const tokens: Token[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "// #remove") {
      tokens.push({ type: "RemoveStart", content: line });
      continue;
    }
    if (trimmed === "// #endremove") {
      tokens.push({ type: "RemoveEnd", content: line });
      continue;
    }
    if (trimmed === "// #uncomment") {
      tokens.push({ type: "UncommentStart", content: line });
      continue;
    }
    if (trimmed === "// #enduncomment") {
      tokens.push({ type: "UncommentEnd", content: line });
      continue;
    }

    if (line.includes("// #remove")) {
      // Single line remove is treated as a RemoveStart and RemoveEnd wrapping the line?
      // Or we can pre-process it to be a "Skip" token?
      // Let's treat it as a special case in the lexer: just don't emit it?
      // No, let's allow the parser to decide.
      // Actually, for single line remove, we can just NOT emit a token for it at all?
      // If we don't emit it, it's gone. That's effectively what #remove does.
      // BUT, we need to respect the parser state (e.g. if we are inside a #remove block, this line would be removed anyway).
      // If we drop it here, we lose the context if we ever wanted to debug.
      // Let's emit it as a specialized token or just drop it.
      // Dropping it here simplifies the parser.
      continue; 
    }

    const startMatch = line.match(REGION_START);
    if (startMatch) {
      tokens.push({
        type: "RegionStart",
        content: line,
        args: startMatch[1].split(",").map((s) => s.trim()),
      });
      continue;
    }

    const endMatch = line.match(REGION_END);
    if (endMatch) {
      tokens.push({
        type: "RegionEnd",
        content: line,
        args: endMatch[1].split(",").map((s) => s.trim()),
      });
      continue;
    }

    // Default code line
    // Check for inline uncomment
    // e.g. "  // code // #uncomment"
    let tokenContent = line;
    if (line.includes("// #uncomment")) {
        // This is a single-line uncomment.
        // We can treat this as: UncommentStart, Code, UncommentEnd
        // But the lexer works line-by-line.
        // We can emit a sequence of tokens for this single line.
        tokens.push({ type: "UncommentStart", content: "// #uncomment-inline" });
        
        // Strip the marker
        const markerIndex = line.indexOf("// #uncomment");
        if (markerIndex !== -1) {
            tokenContent = line.substring(0, markerIndex).trimEnd();
        }
        
        tokens.push({ type: "Code", content: tokenContent });
        tokens.push({ type: "UncommentEnd", content: "// #enduncomment-inline" });
        continue;
    }

    tokens.push({ type: "Code", content: tokenContent });
  }

  return tokens;
}
