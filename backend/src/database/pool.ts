import mariadb, {
  type Pool,
  type PoolConnection
} from "mariadb";

import { env } from "../config/env.js";

export interface DatabaseHealthResult {
  databaseName: string;
  databaseVersion: string;
  currentTime: Date | string;
}

export const databasePool: Pool = mariadb.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,

  allowPublicKeyRetrieval: true,

  connectionLimit: env.DB_CONNECTION_LIMIT,
  acquireTimeout: 10_000,
  connectTimeout: 10_000,
  idleTimeout: 60,

  charset: "utf8mb4",

  bigIntAsNumber: false,
  insertIdAsNumber: false
});

export async function checkDatabaseConnection(): Promise<DatabaseHealthResult> {
  let connection: PoolConnection | undefined;

  try {
    connection = await databasePool.getConnection();

    const rows = await connection.query(`
      SELECT
        DATABASE() AS databaseName,
        VERSION() AS databaseVersion,
        NOW() AS currentTime
    `);

    const firstRow = rows[0] as
      | {
          databaseName?: string;
          databaseVersion?: string;
          currentTime?: Date | string;
        }
      | undefined;

    if (!firstRow?.databaseName || !firstRow.databaseVersion) {
      throw new Error("MariaDB returned an invalid health-check response");
    }

    return {
      databaseName: firstRow.databaseName,
      databaseVersion: firstRow.databaseVersion,
      currentTime: firstRow.currentTime ?? new Date()
    };
  } finally {
    connection?.release();
  }
}

export async function closeDatabasePool(): Promise<void> {
  await databasePool.end();
}