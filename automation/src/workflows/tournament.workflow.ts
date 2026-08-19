import type { TournamentTestData } from "../data/tournament-data.js";
import { DEFAULT_TABLE_POINTS, TENNIS_SPORT, type TablePoints } from "../data/test-values.js";
import type { ConfigurationPage, TournamentFormat } from "../pages/configuration.page.js";
import type { MatchEntryPage } from "../pages/match-entry.page.js";

export class TournamentWorkflow {
  constructor(
    private readonly configuration: ConfigurationPage,
    private readonly matchEntry: MatchEntryPage,
  ) {}

  async create(
    data: TournamentTestData,
    format: TournamentFormat,
    points: TablePoints = DEFAULT_TABLE_POINTS,
  ): Promise<void> {
    await this.configuration.open();
    await this.configuration.createTournament({
      name: data.name,
      sport: TENNIS_SPORT,
      format,
      contestants: data.contestants,
      points,
    });
  }

  async selectSameRatingPlayer(data: TournamentTestData): Promise<void> {
    await this.matchEntry.open();
    await this.matchEntry.selectTournament(data.name);
    await this.matchEntry.choosePlayers(data.contestants[0]!, data.contestants[0]!);
  }

  async scoreFirstMatch(data: TournamentTestData): Promise<string> {
    await this.openMatchEntry(data.name);
    return this.matchEntry.scoreFirstPendingTennisMatch();
  }

  async submitInvalidScore(data: TournamentTestData): Promise<string> {
    await this.openMatchEntry(data.name);
    return this.matchEntry.enterInvalidTennisScore();
  }

  private async openMatchEntry(tournamentName: string): Promise<void> {
    await this.matchEntry.open();
    await this.matchEntry.selectTournament(tournamentName);
  }
}
