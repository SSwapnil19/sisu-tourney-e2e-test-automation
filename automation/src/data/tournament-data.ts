export type TournamentTestData = {
  name: string;
  contestants: string[];
};

export function buildTournamentData(): TournamentTestData {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `SDET-${suffix}`,
    contestants: [
      "Amelia Hart",
      "Benjamin Carter",
      "Chloe Bennett",
      "Daniel Foster",
    ],
  };
}
