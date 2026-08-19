import { After, Before, Status, setDefaultTimeout } from "@cucumber/cucumber";
import { chromium, firefox, webkit, type BrowserType } from "@playwright/test";
import { environment } from "../config/environment.js";
import { ConfigurationPage } from "../pages/configuration.page.js";
import { MatchEntryPage } from "../pages/match-entry.page.js";
import { ApplicationService } from "../services/application.service.js";
import { DatabaseService } from "../services/database.service.js";
import { TournamentVerifier } from "../verification/tournament.verifier.js";
import { TournamentWorkflow } from "../workflows/tournament.workflow.js";
import type { TestWorld } from "./world.js";

setDefaultTimeout(environment.timeoutMs);

const browsers: Record<string, BrowserType> = { chromium, firefox, webkit };

Before(async function (this: TestWorld) {
  this.application = new ApplicationService(
    environment.apiUrl,
    environment.configUiUrl,
    environment.userUiUrl,
  );
  await this.application.assertReady();

  const browserType = browsers[environment.browser];
  if (!browserType) throw new Error(`Unsupported BROWSER: ${environment.browser}`);

  const browser = await browserType.launch({ headless: environment.headless });
  this.context = await browser.newContext();
  this.page = await this.context.newPage();
  this.page.setDefaultTimeout(environment.timeoutMs);

  this.database = new DatabaseService();
  await this.database.connect();
  this.configuration = new ConfigurationPage(this.page, environment.configUiUrl);
  this.matchEntry = new MatchEntryPage(this.page, environment.userUiUrl);
  this.workflow = new TournamentWorkflow(this.configuration, this.matchEntry);
  this.verifier = new TournamentVerifier(this.database, this.configuration, this.matchEntry);
});

After(async function (this: TestWorld, scenario) {
  if (scenario.result?.status === Status.FAILED && this.page) {
    await this.attach(await this.page.screenshot({ fullPage: true }), "image/png");
  }

  if (this.data) await this.database.cleanupTournament(this.data.name);
  await this.database?.disconnect();
  await this.context?.browser()?.close();
});
