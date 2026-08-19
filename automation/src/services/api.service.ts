import { environment } from "../config/environment.js";

export type ApiResult<T = unknown> = {
  status: number;
  body: T | null;
};

export class ApiService {
  async get(path: string): Promise<ApiResult> {
    return this.request(path);
  }

  async submitScore(matchId: string, score: unknown): Promise<ApiResult> {
    return this.request(`/matches/${matchId}/score`, {
      method: "POST",
      body: JSON.stringify({ score }),
    });
  }

  private async request(path: string, options: RequestInit = {}): Promise<ApiResult> {
    const response = await fetch(`${environment.apiUrl}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    return {
      status: response.status,
      body: await response.json().catch(() => null),
    };
  }
}
