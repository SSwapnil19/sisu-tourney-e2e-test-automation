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
}
