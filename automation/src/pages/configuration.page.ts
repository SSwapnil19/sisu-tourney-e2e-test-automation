import { expect, type Page } from "@playwright/test";
import type { TablePoints } from "../data/test-values.js";

export type TournamentFormat = "table" | "rating" | "knockout";

export class ConfigurationPage {
  constructor(private readonly page: Page, private readonly baseUrl: string) {}

  async open(): Promise<void> {
    await this.page.goto(this.baseUrl);
    await this.page.locator(".lang-switcher select").selectOption("en");
    await expect(this.page.getByRole("heading", { name: "Tournament Setup" })).toBeVisible();
  }

  async createTournament(input: {
    name?: string;
    sport?: string;
    format: TournamentFormat;
    contestants: string[];
    points?: TablePoints;
  }): Promise<void> {
    if (input.name !== undefined) {
      await this.field("Tournament name").locator("input").fill(input.name);
    }
    if (input.sport) {
      await this.field("Sport").locator("select").selectOption({ label: input.sport });
    }
    await this.field("Format").locator("select").selectOption(input.format);

    if (input.format === "table" && input.points) {
      await this.numberField("Points for a win").fill(String(input.points.win));
      await this.numberField("Points for a draw").fill(String(input.points.draw));
      await this.numberField("Points for a loss").fill(String(input.points.loss));
    }

    const contestantInputs = this.page.getByPlaceholder("Contestant name");
    while ((await contestantInputs.count()) < input.contestants.length) {
      await this.page.getByRole("button", { name: "Add contestant" }).click();
    }
    for (const [index, contestant] of input.contestants.entries()) {
      await contestantInputs.nth(index).fill(contestant);
    }
    await this.page.getByRole("button", { name: "Create", exact: true }).click();
    if (input.name) {
      await expect(this.tournamentRow(input.name)).toBeVisible();
    }
  }

  tournamentRow(name: string) {
    return this.page.locator(".tournament-row").filter({ hasText: name });
  }

  async requiredNameIsInvalid(): Promise<boolean> {
    return this.field("Tournament name").locator("input").evaluate(
      (element: HTMLInputElement) => !element.checkValidity(),
    );
  }

  private field(label: string) {
    return this.page.locator(".field").filter({ has: this.page.locator("label", { hasText: label }) });
  }

  private numberField(label: string) {
    return this.field(label).locator('input[type="number"]');
  }
}
