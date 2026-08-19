import { mkdir, unlink } from "node:fs/promises";
import {
  After,
  AfterStep,
  Before,
  BeforeStep,
  Status,
  setDefaultTimeout,
} from "@cucumber/cucumber";
import { chromium, firefox, webkit, type BrowserType } from "@playwright/test";
import { environment } from "../config/environment.js";
import { ConfigurationPage } from "../pages/configuration.page.js";
import { MatchEntryPage } from "../pages/match-entry.page.js";
import { ApplicationService } from "../services/application.service.js";
import { ApiService } from "../services/api.service.js";
import { DatabaseService } from "../services/database.service.js";
import { TournamentVerifier } from "../verification/tournament.verifier.js";
import { TournamentWorkflow } from "../workflows/tournament.workflow.js";
import type { TestWorld } from "./world.js";

setDefaultTimeout(environment.timeoutMs);

const browsers: Record<string, BrowserType> = { chromium, firefox, webkit };

Before(async function (this: TestWorld, scenario) {
  console.log(`\n[SCENARIO START] ${scenario.pickle.name}`);
  const scenarioSlug = scenario.pickle.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  await mkdir("reports/network", { recursive: true });
  await mkdir("reports/videos", { recursive: true });
  this.networkPath = `reports/network/${scenarioSlug}.har`;

  this.application = new ApplicationService(
    environment.apiUrl,
    environment.configUiUrl,
    environment.userUiUrl,
  );
  await this.application.assertReady();

  const browserType = browsers[environment.browser];
  if (!browserType) throw new Error(`Unsupported BROWSER: ${environment.browser}`);

  const browser = await browserType.launch({ headless: environment.headless });
  this.context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordHar: {
      path: this.networkPath,
      mode: "full",
      content: "embed",
    },
    recordVideo: {
      dir: "reports/videos",
      size: { width: 1280, height: 720 },
    },
  });
  await this.context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  this.page = await this.context.newPage();
  this.page.setDefaultTimeout(environment.timeoutMs);

  this.database = new DatabaseService();
  this.api = new ApiService();
  await this.database.connect();
  this.configuration = new ConfigurationPage(this.page, environment.configUiUrl);
  this.matchEntry = new MatchEntryPage(this.page, environment.userUiUrl);
  this.workflow = new TournamentWorkflow(this.configuration, this.matchEntry);
  this.verifier = new TournamentVerifier(this.database, this.configuration, this.matchEntry);
});

BeforeStep(function (this: TestWorld, { pickleStep }) {
  this.stepStartedAt = Date.now();
  console.log(`[STEP START] ${pickleStep.text}`);
});

AfterStep(function (this: TestWorld, { pickleStep, result }) {
  const durationMs = this.stepStartedAt ? Date.now() - this.stepStartedAt : 0;
  const status = result?.status ?? Status.UNKNOWN;
  console.log(`[STEP ${status}] ${pickleStep.text} (${durationMs} ms)`);

  if (status === Status.FAILED && result?.message) {
    console.error(`[STEP ERROR] ${result.message.split("\n", 1)[0]}`);
  }
});

After(async function (this: TestWorld, scenario) {
  const scenarioSlug = scenario.pickle.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const capturesEvidence = scenario.pickle.tags.some(({ name }) => name === "@evidence");
  const failed = scenario.result?.status === Status.FAILED;
  const video = this.page?.video();
  const browser = this.context?.browser();

  if (failed && this.page) {
    await this.attach(await this.page.screenshot({ fullPage: true }), "image/png");
    await mkdir("reports/traces", { recursive: true });
    const tracePath = `reports/traces/${scenarioSlug}.zip`;
    await this.context.tracing.stop({ path: tracePath });
    await this.attach(`Playwright trace: ${tracePath}`, "text/plain");
  } else if (this.context) {
    if (capturesEvidence && this.page) {
      await mkdir("docs/evidence", { recursive: true });
      const evidencePath = `docs/evidence/${scenarioSlug}.png`;
      const screenshot = await this.page.screenshot({ path: evidencePath, fullPage: true });
      await this.attach(screenshot, "image/png");
    }
    await this.context.tracing.stop();
  }

  try {
    if (this.data) await this.database?.cleanupTournament(this.data.name);
    await this.database?.disconnect();
  } finally {
    await this.context?.close();

    if (video) {
      if (failed) {
        await this.attach(`Playwright video: ${await video.path()}`, "text/plain");
      } else {
        await video.delete();
      }
    }

    if (this.networkPath) {
      if (failed) {
        await this.attach(`Network HAR: ${this.networkPath}`, "text/plain");
      } else {
        await unlink(this.networkPath).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") throw error;
        });
      }
    }

    await browser?.close();
  }
  console.log(`[SCENARIO ${scenario.result?.status ?? Status.UNKNOWN}] ${scenario.pickle.name}`);
});
