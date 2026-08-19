export type TablePoints = {
  win: number;
  draw: number;
  loss: number;
};

export type TennisSet = readonly [scoreA: number, scoreB: number];

export const TEST_DATA_PREFIX = "SDET-";
export const TENNIS_SPORT = "Tennis";
export const DEFAULT_TABLE_POINTS: TablePoints = { win: 3, draw: 1, loss: 0 };

export const TENNIS_SCORES = {
  playerAWins: [[6, 0], [6, 0]],
  playerBWins: [[0, 6], [0, 6]],
  belowMinimum: [[-1, 0], [6, 0]],
} as const satisfies Record<string, readonly TennisSet[]>;

export function tennisScorePayload(sets: readonly TennisSet[]) {
  return { sets: sets.map(([A, B]) => ({ A, B })) };
}
