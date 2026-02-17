import { combineBlocks, extractSnippets } from "../src/extract.js";

import assert from "node:assert";
import test from "node:test";

const FIXTURE_CONTENT = `
// #docregion advanced
function test() {
  // #remove
  console.log("hidden block");
  // #endremove
  console.log("visible");
  
  console.log("hidden single"); // #remove

  // #uncomment
  // console.log("uncommented block");
  // #enduncomment
  
  // console.log("uncommented single"); // #uncomment  
}
// #enddocregion advanced
`;

test("extractSnippets handles #remove and #uncomment", () => {
  const regions = extractSnippets(FIXTURE_CONTENT);
  const advancedRegion = regions.find(r => r.name === "advanced");
  assert.ok(advancedRegion, "Region 'advanced' not found");
  
  const content = combineBlocks(advancedRegion.blocks);
  const lines = content.split("\n").map(l => l.trim());
  
  assert.ok(!lines.includes('console.log("hidden block");'), "Hidden block line should be removed");
  assert.ok(!lines.includes('console.log("hidden single");'), "Hidden single line should be removed");
  assert.ok(lines.includes('console.log("visible");'), "Visible line should be present");
  assert.ok(lines.includes('console.log("uncommented block");'), "Uncommented block line should be present");
  assert.ok(lines.includes('console.log("uncommented single");'), "Uncommented single line should be present");
});
