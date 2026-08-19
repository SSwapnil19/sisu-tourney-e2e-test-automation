import assert from "node:assert/strict";
import { Then, When } from "@cucumber/cucumber";
import type { TestWorld } from "../support/world.js";

const UNKNOWN_ID = "00000000-0000-0000-0000-000000000000";

When("I request an unknown tournament through the API", async function (this: TestWorld) {
  this.apiResult = await this.api.get(`/tournaments/${UNKNOWN_ID}`);
});

When("I submit a score for an unknown match through the API", async function (this: TestWorld) {
  this.apiResult = await this.api.submitScore(UNKNOWN_ID, {
    sets: [{ A: 6, B: 0 }, { A: 6, B: 0 }],
  });
});

Then("the API response status is {int}", function (this: TestWorld, expectedStatus: number) {
  assert.equal(
    this.apiResult?.status,
    expectedStatus,
    `Expected API status ${expectedStatus}, received ${this.apiResult?.status}`,
  );
});
