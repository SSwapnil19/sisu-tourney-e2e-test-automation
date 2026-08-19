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

  async cleanupTournament(name: string): Promise<void> {
    const tournament = await this.findTournament(name);
    if (!tournament || !name.startsWith("SDET-")) return;

    const connection = await this.connection().getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute("DELETE FROM matches WHERE tournament_id = ?", [tournament.id]);
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
