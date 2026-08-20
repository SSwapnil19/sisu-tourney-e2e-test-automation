import { expect, type Page } from "@playwright/test";
import {
  GOLF_HOLE_COUNT,
  GOLF_SCORES,
  TENNIS_SCORES,
  type TennisSet,
} from "../data/test-values.js";

export class MatchEntryPage {
  constructor(private readonly page: Page, private readonly baseUrl: string) {}

  async open(): Promise<void> {
    await this.page.goto(this.baseUrl);
    await this.page.locator(".lang-switcher select").selectOption("en");
    await expect(this.page.getByRole("heading", { name: "Match Entry" })).toBeVisible();
  }

  async selectTournament(name: string): Promise<void> {
    await this.selectField("Select tournament").selectOption({ label: name });
    await expect(this.matchSelect()).toBeVisible();
  }

  async scoreFirstPendingTennisMatch(): Promise<string> {
    const matchId = await this.selectFirstPendingMatch();
    await this.fillTennisScore(TENNIS_SCORES.playerAWins);
    await this.submitScore(matchId);
    return matchId;
  }

  async scoreFirstPendingGolfMatch(): Promise<string> {
    const matchId = await this.selectFirstPendingMatch();
    await expect(this.scoreInputs()).toHaveCount(GOLF_HOLE_COUNT * 2);
    await this.fillGolfScore(GOLF_SCORES.playerA, GOLF_SCORES.playerB);
    await this.submitScore(matchId);
    return matchId;
  }

  async enterInvalidTennisScore(): Promise<string> {
    const matchId = await this.selectFirstPendingMatch();
    await this.fillTennisScore(TENNIS_SCORES.belowMinimum);
    await this.page.getByRole("button", { name: "Submit score" }).click();
    return matchId;
  }

  async firstScoreInputIsInvalid(): Promise<boolean> {
    return this.scoreInputs().first().evaluate((input: HTMLInputElement) => !input.checkValidity());
  }

  async firstScoreInputBounds(): Promise<{ min: string | null; max: string | null }> {
    const input = this.scoreInputs().first();
    return {
      min: await input.getAttribute("min"),
      max: await input.getAttribute("max"),
    };
  }

  standingsRow(name: string) {
    return this.page.locator("table.standings tbody tr").filter({ hasText: name });
  }

  async choosePlayers(playerA: string, playerB: string): Promise<void> {
    await this.playerSelect("Player A").selectOption({ label: playerA });
    await this.playerSelect("Player B").selectOption({ label: playerB });
  }

  createMatchButton() {
    return this.page.getByRole("button", { name: "Create match" });
  }

  samePlayerMessage() {
    return this.page.getByText("Select two different players.", { exact: true });
  }

  private matchSelect() {
    return this.selectField("Select match");
  }

  private async selectFirstPendingMatch(): Promise<string> {
    const select = this.matchSelect();
    await expect.poll(async () => select.locator("option:not([disabled])").count()).toBeGreaterThan(1);
    const matchId = await select.locator("option:not([disabled])").nth(1).getAttribute("value");
    if (!matchId) throw new Error("No pending match is available");
    await select.selectOption(matchId);
    await expect(this.page.locator("form.panel table.scoreboard")).toBeVisible();
    return matchId;
  }

  private scoreInputs() {
    return this.page.locator("form.panel table.scoreboard tbody input");
  }

  private async fillTennisScore(sets: readonly TennisSet[]): Promise<void> {
    const inputs = this.scoreInputs();
    for (const [setIndex, [scoreA, scoreB]] of sets.entries()) {
      await inputs.nth(setIndex * 2).fill(String(scoreA));
      await inputs.nth(setIndex * 2 + 1).fill(String(scoreB));
    }
  }

  private async fillGolfScore(scoreA: number, scoreB: number): Promise<void> {
    const inputs = this.scoreInputs();
    for (let hole = 0; hole < GOLF_HOLE_COUNT; hole += 1) {
      await inputs.nth(hole * 2).fill(String(scoreA));
      await inputs.nth(hole * 2 + 1).fill(String(scoreB));
    }
  }

  private async submitScore(matchId: string): Promise<void> {
    const scoreResponse = this.page.waitForResponse((response) =>
      response.request().method() === "POST"
      && response.url().includes(`/matches/${matchId}/score`),
    );
    await this.page.getByRole("button", { name: "Submit score" }).click();
    const response = await scoreResponse;
    if (!response.ok()) {
      throw new Error(`Score submission for ${matchId} failed: HTTP ${response.status()} ${await response.text()}`);
    }
  }

  private playerSelect(label: string) {
    return this.selectField(label, "form.panel .field");
  }

  private selectField(label: string, container = ".panel .field") {
    return this.page.locator(container).filter({ hasText: label }).locator("select");
  }
}
