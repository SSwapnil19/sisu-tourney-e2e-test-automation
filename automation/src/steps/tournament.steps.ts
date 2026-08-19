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

Given("a table tournament exists with 4 contestants", async function (this: TestWorld) {
  assert.ok(this.data);
  await this.workflow.create(this.data, "table");
  const tournament = await this.database.findTournament(this.data.name);
  assert.ok(tournament, `Table tournament ${this.data.name} was not created`);
  this.tournamentId = tournament.id;
});

Given("a table match has already been scored", async function (this: TestWorld) {
  assert.ok(this.data);
  await this.workflow.create(this.data, "table");
  const tournament = await this.database.findTournament(this.data.name);
  assert.ok(tournament, `Table tournament ${this.data.name} was not created`);
  this.tournamentId = tournament.id;
  this.matchId = await this.workflow.scoreFirstMatch(this.data);
  this.standingsBefore = await this.database.standings(tournament.id);
});

Given("a knockout tournament exists with 4 contestants", async function (this: TestWorld) {
  assert.ok(this.data);
  await this.workflow.create(this.data, "knockout");
  const tournament = await this.database.findTournament(this.data.name);
  assert.ok(tournament, `Knockout tournament ${this.data.name} was not created`);
  this.tournamentId = tournament.id;
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

When("I submit a valid winning score for the first pending match", async function (this: TestWorld) {
  assert.ok(this.data);
  this.matchId = await this.workflow.scoreFirstMatch(this.data);
});

When("I submit a second score for the decided match through the API", async function (this: TestWorld) {
  assert.ok(this.matchId);
  this.apiResult = await this.api.submitScore(this.matchId, {
    sets: [{ A: 0, B: 6 }, { A: 0, B: 6 }],
  });
});

When("I score both semifinal matches", async function (this: TestWorld) {
  assert.ok(this.data);
  await this.workflow.scoreFirstMatch(this.data);
  await this.workflow.scoreFirstMatch(this.data);
});

When("I enter a tennis score below the minimum value", async function (this: TestWorld) {
  assert.ok(this.data);
  this.matchId = await this.workflow.submitInvalidScore(this.data);
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

Then("the score and winner are stored correctly", async function (this: TestWorld) {
  assert.ok(this.matchId);
  const match = await this.database.match(this.matchId);
  assert.ok(match?.score_json, `Score JSON was not stored for match ${this.matchId}`);
  assert.equal(match.outcome.toUpperCase(), "A", `Expected contestant A to win match ${this.matchId}`);
});

Then("the table standings are updated exactly once in the UI and database", async function (this: TestWorld) {
  assert.ok(this.tournamentId && this.matchId);
  await this.verifier.tableScoreUpdatedOnce(this.tournamentId, this.matchId);
});

Then("the API rejects the duplicate score with conflict status", function (this: TestWorld) {
  assert.equal(this.apiResult?.status, 409, `Expected 409 but received ${this.apiResult?.status}`);
});

Then("the original result and standings remain unchanged", async function (this: TestWorld) {
  assert.ok(this.tournamentId && this.matchId && this.standingsBefore);
  const match = await this.database.match(this.matchId);
  assert.equal(match?.outcome.toUpperCase(), "A", "Duplicate submission changed the original winner");
  assert.deepEqual(await this.database.standings(this.tournamentId), this.standingsBefore);
});

Then("the final contains exactly the two semifinal winners", async function (this: TestWorld) {
  assert.ok(this.tournamentId);
  await this.verifier.knockoutFinalContainsRoundOneWinners(this.tournamentId);
});

Then("browser schema validation prevents score submission", async function (this: TestWorld) {
  assert.equal(await this.matchEntry.firstScoreInputIsInvalid(), true);
});

Then(
  "the score input exposes the Tennis schema boundaries {int} and {int}",
  async function (this: TestWorld, min: number, max: number) {
    assert.deepEqual(await this.matchEntry.firstScoreInputBounds(), {
      min: String(min),
      max: String(max),
    });
  },
);

Then("the selected match remains pending without a stored score", async function (this: TestWorld) {
  assert.ok(this.matchId);
  await this.verifier.matchRemainsPending(this.matchId);
});
