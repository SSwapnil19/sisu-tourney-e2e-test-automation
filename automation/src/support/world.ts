import { setWorldConstructor, World, type IWorldOptions } from "@cucumber/cucumber";
import type { BrowserContext, Page } from "@playwright/test";
import type { TournamentTestData } from "../data/tournament-data.js";
import type { ConfigurationPage } from "../pages/configuration.page.js";
import type { MatchEntryPage } from "../pages/match-entry.page.js";
import type { ApplicationService } from "../services/application.service.js";
import type { DatabaseService } from "../services/database.service.js";
import type { TournamentVerifier } from "../verification/tournament.verifier.js";
import type { TournamentWorkflow } from "../workflows/tournament.workflow.js";

export class TestWorld extends World {
  context!: BrowserContext;
  page!: Page;
  database!: DatabaseService;
  application!: ApplicationService;
  configuration!: ConfigurationPage;
  matchEntry!: MatchEntryPage;
  workflow!: TournamentWorkflow;
  verifier!: TournamentVerifier;
  data?: TournamentTestData;
  tournamentId?: string;
  initialMatchCount?: number;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(TestWorld);
