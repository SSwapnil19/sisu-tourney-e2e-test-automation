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
    await expect(this.page.getByRole("heading", { name: "New match" })).toBeVisible();
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

  private playerSelect(label: string) {
    return this.page.locator("form.panel .field").filter({ hasText: label }).locator("select");
  }
}

