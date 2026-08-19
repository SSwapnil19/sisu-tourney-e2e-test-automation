const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.error || `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return body;
}

export const api = {
  listTournaments: () => request("/tournaments"),
  getTournament: (id) => request(`/tournaments/${id}`),
  listSports: () => request("/sports"),
  submitScore: (matchId, score) =>
    request(`/matches/${matchId}/score`, {
      method: "POST",
      body: JSON.stringify({ score }),
    }),
  createMatch: (tournamentId, contestantAId, contestantBId) =>
    request(`/tournaments/${tournamentId}/matches`, {
      method: "POST",
      body: JSON.stringify({ contestant_a_id: contestantAId, contestant_b_id: contestantBId }),
    }),
};
