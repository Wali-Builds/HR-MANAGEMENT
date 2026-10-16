import {
  checkDatabaseConnection,
  closeDatabasePool
} from "./pool.js";

async function testConnection(): Promise<void> {
  try {
    const result = await checkDatabaseConnection();

    console.log("MariaDB connection successful.");
    console.log(`Database: ${result.databaseName}`);
    console.log(`MariaDB version: ${result.databaseVersion}`);
    console.log(`Database time: ${String(result.currentTime)}`);
  } catch (error) {
    console.error("MariaDB connection failed.");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  } finally {
    await closeDatabasePool().catch((error: unknown) => {
      console.error("Could not close the database pool:", error);
    });
  }
}

void testConnection();