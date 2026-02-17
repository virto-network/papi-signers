
export type TokenType =
  | "RegionStart"
  | "RegionEnd"
  | "RemoveStart"
  | "RemoveEnd"
  | "UncommentStart"
  | "UncommentEnd"
  | "Code";

export interface Token {
  type: TokenType;
  content: string;
  args?: string[];
}
