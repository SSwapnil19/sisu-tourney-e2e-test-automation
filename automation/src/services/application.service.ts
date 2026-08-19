export class ApplicationService {
  constructor(
    private readonly apiUrl: string,
    private readonly configUiUrl: string,
    private readonly userUiUrl: string,
  ) {}

  async assertReady(): Promise<void> {
    await Promise.all([
      this.expectOk(`${this.apiUrl}/health`, "API"),
      this.expectOk(this.configUiUrl, "configuration UI"),
      this.expectOk(this.userUiUrl, "match-entry UI"),
    ]);
  }

  private async expectOk(url: string, service: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      throw new Error(
        `${service} is not ready at ${url}. Start the supplied Docker environment first.`,
        { cause: error },
      );
    }
  }
}

