import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { environment } from "../config/environment.js";

export type TournamentRecord = RowDataPacket & {
  id: string;
  name: string;
  format: string;
  points_win: number;
  points_draw: number;
  points_loss: number;
};

export type MatchRecord = RowDataPacket & {
  id: string;
  round: number;
  contestant_a_id: string;
  contestant_b_id: string;
  outcome: string;
  score_json: unknown;
};

export type StandingRecord = RowDataPacket & {
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
};

export class DatabaseService {
  private pool?: Pool;

  async connect(): Promise<void> {
    this.pool = mysql.createPool({
      ...environment.database,
      waitForConnections: true,
      connectionLimit: 3,
    });
    await this.pool.query("SELECT 1");
  }

  async disconnect(): Promise<void> {
    await this.pool?.end();
    this.pool = undefined;
  }

  async findTournament(name: string): Promise<TournamentRecord | undefined> {
    const [rows] = await this.connection().execute<TournamentRecord[]>(
      `SELECT id, name, format, points_win, points_draw, points_loss
         FROM tournaments
        WHERE name = ?`,
      [name],
    );
    return rows[0];
  }

  async contestantNames(tournamentId: string): Promise<string[]> {
    const [rows] = await this.connection().execute<(RowDataPacket & { name: string })[]>(
      "SELECT name FROM contestants WHERE tournament_id = ? ORDER BY name",
      [tournamentId],
    );
    return rows.map(({ name }) => name);
  }

  async matchCount(tournamentId: string): Promise<number> {
    const [rows] = await this.connection().execute<(RowDataPacket & { count: number })[]>(
      "SELECT COUNT(*) AS count FROM matches WHERE tournament_id = ?",
      [tournamentId],
    );
    return Number(rows[0]?.count ?? 0);
  }

  async match(matchId: string): Promise<MatchRecord | undefined> {
    const [rows] = await this.connection().execute<MatchRecord[]>(
      `SELECT id, round, contestant_a_id, contestant_b_id, outcome, score_json
         FROM matches WHERE id = ?`,
      [matchId],
    );
    return rows[0];
  }

  async matchesInRound(tournamentId: string, round: number): Promise<MatchRecord[]> {
    const [rows] = await this.connection().execute<MatchRecord[]>(
      `SELECT id, round, contestant_a_id, contestant_b_id, outcome, score_json
         FROM matches WHERE tournament_id = ? AND round = ? ORDER BY id`,
      [tournamentId, round],
    );
    return rows;
  }

  async standings(tournamentId: string): Promise<StandingRecord[]> {
    const [rows] = await this.connection().execute<StandingRecord[]>(
      `SELECT c.name, s.played, s.won, s.drawn, s.lost, s.points
         FROM standings s
         JOIN contestants c ON c.id = s.contestant_id
        WHERE s.tournament_id = ?
        ORDER BY c.name`,
      [tournamentId],
    );
    return rows;
  }

  async cleanupTournament(name: string): Promise<void> {
    const tournament = await this.findTournament(name);
    if (!tournament || !name.startsWith("SDET-")) return;

    const connection = await this.connection().getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute("DELETE FROM matches WHERE tournament_id = ?", [tournament.id]);
      await connection.execute("DELETE FROM standings WHERE tournament_id = ?", [tournament.id]);
      await connection.execute("DELETE FROM contestants WHERE tournament_id = ?", [tournament.id]);
      await connection.execute("DELETE FROM tournaments WHERE id = ?", [tournament.id]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private connection(): Pool {
    if (!this.pool) throw new Error("DatabaseService.connect() must be called first");
    return this.pool;
  }
}
