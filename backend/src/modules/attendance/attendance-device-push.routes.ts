import { Router, type Request, type Response } from "express";
import { AppError } from "../../common/errors/app-error.js";
import { receiveAttendanceDevicePush, recordAttendanceDeviceHeartbeat } from "./attendance.service.js";

export const attendanceDevicePushRouter = Router();

// added by wali: Print device heartbeats in the backend terminal for live connection visibility.
function logDeviceHeartbeat(request: Request): void {
  const serialNumber = String(request.query.SN ?? "unknown").trim();
  // added by wali: Show server heartbeat time in Pakistan local time for console readability.
  const pakistanTime = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  console.log(
    `[DEVICE HEARTBEAT] SN: ${serialNumber} | ${pakistanTime} PKT`,
  );
}

// added by wali: Update last sync for a registered device while always acknowledging ADMS polling.
async function acknowledgeDeviceHeartbeat(request: Request, response: Response, responseBody: string): Promise<void> {
  logDeviceHeartbeat(request);
  const serialNumber = String(request.query.SN ?? "").trim();
  try {
    const matched = await recordAttendanceDeviceHeartbeat(serialNumber);
    if (!matched) {
      console.warn(`[DEVICE HEARTBEAT] Unregistered or missing SN: ${serialNumber || "unknown"}`);
    }
  } catch (error) {
    console.error("Could not update attendance device heartbeat:", error);
  }
  response.type("text/plain").send(responseBody);
}

function sendPushError(response: Response, error: unknown): void {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  if (!(error instanceof AppError) || statusCode >= 500) {
    console.error("Attendance device push failed:", error);
  }
  response.status(statusCode).type("text/plain").send("ERROR\n");
}

// added by wali: Respond to the device's ADMS registration check without proxying it to ZKBioTime.
attendanceDevicePushRouter.get("/registry", (_request: Request, response: Response) => {
  response.type("text/plain").send("RegistryCode=OK\n");
});

attendanceDevicePushRouter.get("/ping", async (request: Request, response: Response) => {
  await acknowledgeDeviceHeartbeat(request, response, "OK\n");
});

attendanceDevicePushRouter.get("/getrequest", async (request: Request, response: Response) => {
  await acknowledgeDeviceHeartbeat(request, response, "\n");
});

attendanceDevicePushRouter.get("/cdata", (_request: Request, response: Response) => {
  response.type("text/plain").send("OK\n");
});

// added by wali: Ingest plain-text ATTLOG rows directly into the HR attendance pipeline.
attendanceDevicePushRouter.post("/cdata", async (request: Request, response: Response) => {
  const table = String(request.query.table ?? "").trim().toUpperCase();
  if (table !== "ATTLOG") {
    response.type("text/plain").send("OK: 0\n");
    return;
  }

  const serialNumber = String(request.query.SN ?? "").trim();
  const rawBody = typeof request.body === "string" ? request.body : "";

  try {
    // added by wali: Print each raw device punch exactly as it arrived before parsing or processing.
    console.log(`[RAW ATTLOG] SN: ${serialNumber}\n${rawBody}`);
    const result = await receiveAttendanceDevicePush(serialNumber, rawBody);
    console.log(
      `[ATTLOG PUSH] SN: ${serialNumber} | rows: ${result.acceptedCount + result.duplicateCount} | accepted: ${result.acceptedCount} | duplicates: ${result.duplicateCount} | processed: ${result.processedCount} | discarded punches: ${result.discardedCount} | failed: ${result.failedCount}`,
    );
    if (result.failureReasons.length > 0) {
      console.warn(`[ATTLOG PROCESSING ERRORS] ${[...new Set(result.failureReasons)].join(", ")}`);
    }
    response.type("text/plain").send("OK: 0\n");
  } catch (error) {
    sendPushError(response, error);
  }
});
