import { expect, type Page } from "@playwright/test";

export class MatchEntryPage {
  constructor(private readonly page: Page, private readonly baseUrl: string) {}

  async open(): Promise<void> {
    await this.page.goto(this.baseUrl);
    await this.page.locator(".lang-switcher select").selectOption("en");
    await expect(this.page.getByRole("heading", { name: "Match Entry" })).toBeVisible();
  }

  async selectTournament(name: string): Promise<void> {
    await this.page.locator(".panel .field").filter({ hasText: "Select tournament" })
      .locator("select").selectOption({ label: name });
    await expect(this.matchSelect()).toBeVisible();
  }

  async scoreFirstPendingTennisMatch(): Promise<string> {
    const matchId = await this.selectFirstPendingMatch();
    await this.fillTennisScore([[6, 0], [6, 0]]);
    const scoreResponse = this.page.waitForResponse((response) =>
      response.request().method() === "POST"
      && response.url().includes(`/matches/${matchId}/score`),
    );
    await this.page.getByRole("button", { name: "Submit score" }).click();
    const response = await scoreResponse;
    if (!response.ok()) {
      throw new Error(`Score submission for ${matchId} failed: HTTP ${response.status()} ${await response.text()}`);
    }
    return matchId;
  }

  async enterInvalidTennisScore(): Promise<string> {
    const matchId = await this.selectFirstPendingMatch();
    await this.fillTennisScore([[-1, 0], [6, 0]]);
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
    return this.page.locator(".panel .field").filter({ hasText: "Select match" }).locator("select");
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

  private async fillTennisScore(sets: Array<[number, number]>): Promise<void> {
    const inputs = this.scoreInputs();
    for (const [setIndex, [scoreA, scoreB]] of sets.entries()) {
      await inputs.nth(setIndex * 2).fill(String(scoreA));
      await inputs.nth(setIndex * 2 + 1).fill(String(scoreB));
    }
  }

  private playerSelect(label: string) {
    return this.page.locator("form.panel .field").filter({ hasText: label }).locator("select");
  }
}
