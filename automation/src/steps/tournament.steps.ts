import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { buildTournamentData } from "../data/tournament-data.js";
import {
  DEFAULT_TABLE_POINTS,
  GOLF_SPORT,
  TENNIS_SCORES,
  tennisScorePayload,
  type TablePoints,
} from "../data/test-values.js";
import type { TournamentFormat } from "../pages/configuration.page.js";
import type { TournamentRecord } from "../services/database.service.js";
import type { TestWorld } from "../support/world.js";

async function createTournament(
  world: TestWorld,
  format: TournamentFormat,
  points: TablePoints = DEFAULT_TABLE_POINTS,
  sport?: string,
): Promise<TournamentRecord> {
  assert.ok(world.data, "Tournament test data was not initialized");
  await world.workflow.create(world.data, format, points, sport);
  const tournament = await world.database.findTournament(world.data.name);
  assert.ok(tournament, `${format} tournament ${world.data.name} was not created`);
  world.tournamentId = tournament.id;
  if (format === "table") world.tablePoints = points;
  return tournament;
}

Given("I have unique tournament test data", function (this: TestWorld) {
  this.data = buildTournamentData();
});

Given("a rating tournament exists with 4 contestants", async function (this: TestWorld) {
  const tournament = await createTournament(this, "rating");
  this.initialMatchCount = await this.database.matchCount(tournament.id);
});

Given("a table tournament exists with 4 contestants", async function (this: TestWorld) {
  await createTournament(this, "table");
});

Given("a Golf table tournament exists with 4 contestants", async function (this: TestWorld) {
  await createTournament(this, "table", DEFAULT_TABLE_POINTS, GOLF_SPORT);
});

Given("a table match has already been scored", async function (this: TestWorld) {
  const tournament = await createTournament(this, "table");
  assert.ok(this.data);
  this.matchId = await this.workflow.scoreFirstMatch(this.data);
  this.standingsBefore = await this.database.standings(tournament.id);
});

Given("a knockout tournament exists with 4 contestants", async function (this: TestWorld) {
  await createTournament(this, "knockout");
});

When(
  "I create a table tournament with 4 contestants and points {int}, {int}, {int}",
  async function (this: TestWorld, win: number, draw: number, loss: number) {
    assert.ok(this.data);
    this.tablePoints = { win, draw, loss };
    await this.workflow.create(this.data, "table", this.tablePoints);
  },
);

When("I try to create a table tournament without a name", async function (this: TestWorld) {
  assert.ok(this.data);
  await this.configuration.open();
  await this.configuration.createTournament({
    format: "table",
    contestants: this.data.contestants,
    points: DEFAULT_TABLE_POINTS,
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

When("I submit a valid 18-hole Golf score", async function (this: TestWorld) {
  assert.ok(this.data);
  this.matchId = await this.workflow.scoreFirstGolfMatch(this.data);
});

When("I submit a second score for the decided match through the API", async function (this: TestWorld) {
  assert.ok(this.matchId);
  this.apiResult = await this.api.submitScore(
    this.matchId,
    tennisScorePayload(TENNIS_SCORES.playerBWins),
  );
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
  assert.ok(this.tablePoints);
  this.tournamentId = await this.verifier.tableTournamentIsPersisted(this.data, this.tablePoints);
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
  await this.verifier.scoreAndWinnerAreStored(this.matchId);
});

Then("the table standings are updated exactly once in the UI and database", async function (this: TestWorld) {
  assert.ok(this.tournamentId && this.tablePoints);
  await this.verifier.tableStandingsUpdatedOnce(this.tournamentId, this.tablePoints);
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
