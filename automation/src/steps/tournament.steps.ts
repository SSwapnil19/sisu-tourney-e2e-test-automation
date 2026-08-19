import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { buildTournamentData } from "../data/tournament-data.js";
import type { TestWorld } from "../support/world.js";

Given("I have unique tournament test data", function (this: TestWorld) {
  this.data = buildTournamentData();
});

Given("a rating tournament exists with 4 contestants", async function (this: TestWorld) {
  assert.ok(this.data);
  await this.workflow.create(this.data, "rating");
  const tournament = await this.database.findTournament(this.data.name);
  assert.ok(tournament);
  this.initialMatchCount = await this.database.matchCount(tournament.id);
});

When(
  "I create a table tournament with 4 contestants and points {int}, {int}, {int}",
  async function (this: TestWorld, win: number, draw: number, loss: number) {
    assert.ok(this.data);
    await this.workflow.create(this.data, "table", { win, draw, loss });
  },
);

When("I try to create a table tournament without a name", async function (this: TestWorld) {
  assert.ok(this.data);
  await this.configuration.open();
  await this.configuration.createTournament({
    format: "table",
    contestants: this.data.contestants,
    points: { win: 3, draw: 1, loss: 0 },
  });
});

When("I choose the same contestant as both players", async function (this: TestWorld) {
  assert.ok(this.data);
  await this.workflow.selectSameRatingPlayer(this.data);
});

Then("the tournament is shown in the configuration application", async function (this: TestWorld) {
  assert.ok(this.data);
  await this.verifier.appearsInConfiguration(this.data.name);
});

Then("the tournament and its 4 contestants are stored correctly", async function (this: TestWorld) {
  assert.ok(this.data);
  this.tournamentId = await this.verifier.tableTournamentIsPersisted(this.data);
});

Then("table matches are generated for the tournament", async function (this: TestWorld) {
  assert.ok(this.tournamentId);
  await this.verifier.matchesExist(this.tournamentId);
});

Then("the browser prevents the tournament submission", async function (this: TestWorld) {
  assert.equal(await this.configuration.requiredNameIsInvalid(), true);
});

Then("no tournament is stored for the test data", async function (this: TestWorld) {
  assert.ok(this.data);
  await this.verifier.noTournamentExists(this.data.name);
});

Then("match creation is disabled with a clear explanation", async function (this: TestWorld) {
  await this.verifier.samePlayerIsPrevented();
});

Then("no new rating match is stored", async function (this: TestWorld) {
  assert.ok(this.data);
  const tournament = await this.database.findTournament(this.data.name);
  assert.ok(tournament);
  assert.equal(await this.database.matchCount(tournament.id), this.initialMatchCount);
});

