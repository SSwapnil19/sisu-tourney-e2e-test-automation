import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import type { TournamentTestData } from "../data/tournament-data.js";
import type { ConfigurationPage } from "../pages/configuration.page.js";
import type { MatchEntryPage } from "../pages/match-entry.page.js";
import type { DatabaseService } from "../services/database.service.js";

export class TournamentVerifier {
  constructor(
    private readonly database: DatabaseService,
    private readonly configuration: ConfigurationPage,
    private readonly matchEntry: MatchEntryPage,
  ) {}

  async appearsInConfiguration(name: string): Promise<void> {
    await expect(this.configuration.tournamentRow(name)).toBeVisible();
  }

  async tableTournamentIsPersisted(data: TournamentTestData): Promise<string> {
    const tournament = await this.database.findTournament(data.name);
    assert.ok(tournament, `Tournament ${data.name} was not stored`);
    assert.equal(tournament.format.toLowerCase(), "table");
    assert.deepEqual(
      [Number(tournament.points_win), Number(tournament.points_draw), Number(tournament.points_loss)],
      [3, 1, 0],
    );
    assert.deepEqual(
      await this.database.contestantNames(tournament.id),
      [...data.contestants].sort(),
    );
    return tournament.id;
  }

  async matchesExist(tournamentId: string): Promise<void> {
    assert.ok(await this.database.matchCount(tournamentId), "No table matches were generated");
  }

  async noTournamentExists(name: string): Promise<void> {
    assert.equal(await this.database.findTournament(name), undefined);
  }

  async samePlayerIsPrevented(): Promise<void> {
    await expect(this.matchEntry.samePlayerMessage()).toBeVisible();
    await expect(this.matchEntry.createMatchButton()).toBeDisabled();
  }

  async tableScoreUpdatedOnce(tournamentId: string, matchId: string): Promise<void> {
    const match = await this.database.match(matchId);
    assert.ok(match, `Scored match ${matchId} was not stored`);
    assert.equal(match.outcome.toUpperCase(), "A", `Expected contestant A to win match ${matchId}`);
    assert.ok(match.score_json, `Expected match ${matchId} to contain score JSON`);

    const standings = await this.database.standings(tournamentId);
    const winner = standings.find((row) => row.won === 1);
    const loser = standings.find((row) => row.lost === 1);
    assert.ok(winner, "No table winner was recorded in standings");
    assert.ok(loser, "No table loser was recorded in standings");
    assert.deepEqual(
      [winner.played, winner.won, winner.points],
      [1, 1, 3],
      `Incorrect winner standings for ${winner.name}`,
    );
    assert.deepEqual(
      [loser.played, loser.lost, loser.points],
      [1, 1, 0],
      `Incorrect loser standings for ${loser.name}`,
    );
    await expect(this.matchEntry.standingsRow(winner.name)).toContainText("3");
  }

  async matchRemainsPending(matchId: string): Promise<void> {
    const match = await this.database.match(matchId);
    assert.ok(match, `Match ${matchId} does not exist`);
    assert.equal(match.outcome, "pending", `Invalid score unexpectedly decided match ${matchId}`);
    assert.equal(match.score_json, null, `Invalid score unexpectedly persisted for match ${matchId}`);
  }

  async knockoutFinalContainsRoundOneWinners(tournamentId: string): Promise<void> {
    const semifinals = await this.database.matchesInRound(tournamentId, 1);
    const final = await this.database.matchesInRound(tournamentId, 2);
    assert.equal(semifinals.length, 2, "Expected two knockout semifinals");
    assert.equal(final.length, 1, "Expected one final after both semifinals were decided");
    const winnerIds = semifinals.map((match) => {
      const outcome = match.outcome.toUpperCase();
      assert.ok(["A", "B"].includes(outcome), `Semifinal ${match.id} is not decided (outcome: ${match.outcome})`);
      return outcome === "A" ? match.contestant_a_id : match.contestant_b_id;
    }).sort();
    assert.deepEqual(
      [final[0]!.contestant_a_id, final[0]!.contestant_b_id].sort(),
      winnerIds,
      "The knockout final does not contain both semifinal winners",
    );
  }
}
