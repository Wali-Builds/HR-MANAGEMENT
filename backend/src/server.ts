import type { Server } from "node:http";

import { app } from "./app.js";
import { env } from "./config/env.js";

import {
  checkDatabaseConnection,
  closeDatabasePool
} from "./database/pool.js";

let httpServer: Server | undefined;
let shuttingDown = false;

async function startServer(): Promise<void> {
  try {
    const databaseHealth = await checkDatabaseConnection();

    console.log(
      `MariaDB connected: ${databaseHealth.databaseName}`
    );

    console.log(
      `MariaDB version: ${databaseHealth.databaseVersion}`
    );

    httpServer = app.listen(env.PORT, () => {
      console.log(
        `HR API running at http://localhost:${env.PORT}`
      );

      console.log(
        `Health: http://localhost:${env.PORT}/api/v1/health`
      );

      console.log(
        `Database health: http://localhost:${env.PORT}/api/v1/health/database`
      );
    });
  } catch (error) {
    console.error("Backend startup failed:", error);

    await closeDatabasePool().catch(() => undefined);

    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log(`${signal} received. Shutting down...`);

  if (!httpServer) {
    await closeDatabasePool();
    process.exit(0);
  }

  httpServer.close(async (serverError) => {
    try {
      await closeDatabasePool();

      if (serverError) {
        console.error("HTTP server shutdown failed:", serverError);
        process.exit(1);
      }

      console.log("Backend stopped successfully.");
      process.exit(0);
    } catch (databaseError) {
      console.error(
        "Database pool shutdown failed:",
        databaseError
      );

      process.exit(1);
    }
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  void shutdown("UNCAUGHT_EXCEPTION");
});

void startServer();