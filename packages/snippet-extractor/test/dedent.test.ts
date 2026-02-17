import assert from "node:assert";
import test from "node:test";
import { combineBlocks, dedentBlock } from "../src/extract.js";

test("dedentBlock removes common indentation", () => {
  const input = ["  function foo() {", "    return 1;", "  }"];
  const expected = ["function foo() {", "  return 1;", "}"];
  assert.deepStrictEqual(dedentBlock(input), expected);
});

test("combineBlocks joins and dedents disjoint blocks", () => {
  const blocks = [
    ["  function first() {", "    return 1;", "  }"],
    ["    second() {", "      return 2;", "    }"],
  ];

  // Each block should be dedented individually
  const expected = `function first() {
  return 1;
}
second() {
  return 2;
}`;

  assert.strictEqual(combineBlocks(blocks), expected);
});
