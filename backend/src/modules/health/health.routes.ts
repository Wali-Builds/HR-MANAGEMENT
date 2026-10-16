import { Router } from "express";

import { asyncHandler } from "../../common/utils/async-handler.js";
import { sendSuccess } from "../../common/utils/api-response.js";
import { env } from "../../config/env.js";
import { checkDatabaseConnection } from "../../database/pool.js";

export const healthRouter = Router();

healthRouter.get(
  "/",
  (_request, response) => {
    sendSuccess(response, {
      message:
        "HR Management API is running",
      data: {
        environment: env.NODE_ENV,
        uptimeSeconds:
          Math.floor(process.uptime()),
        timestamp:
          new Date().toISOString()
      }
    });
  }
);

healthRouter.get(
  "/database",
  asyncHandler(
    async (_request, response) => {
      const databaseHealth =
        await checkDatabaseConnection();

      sendSuccess(response, {
        message:
          "MariaDB connection is healthy",
        data: {
          connected: true,
          database:
            databaseHealth.databaseName,
          version:
            databaseHealth.databaseVersion,
          databaseTime:
            databaseHealth.currentTime,
          timestamp:
            new Date().toISOString()
        }
      });
    }
  )
);