import type { TournamentTestData } from "../data/tournament-data.js";
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
    points = { win: 3, draw: 1, loss: 0 },
  ): Promise<void> {
    await this.configuration.open();
    await this.configuration.createTournament({
      name: data.name,
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
}

