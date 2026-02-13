import { strict as assert } from "node:assert";
import { it } from "node:test";
import { withChopsticks } from "../utils/chopsticks.ts";

withChopsticks("Chopsticks Setup", (context) => {
  it("should have a client and chain", async () => {
    assert.ok(context.client, "Client should be initialized");
    assert.ok(context.chain, "Chain should be initialized");

    // Simple block number check
    const header = await context.client.getFinalizedBlock();
    assert.ok(header.number >= 0, "Block number should be >= 0");
    console.log("Current block number:", header.number);
  });
});
