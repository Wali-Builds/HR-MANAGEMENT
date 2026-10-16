import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import cookieParser from "cookie-parser";
import { authRouter } from "./modules/auth/auth.routes.js";

import {
  errorHandler,
  notFoundHandler
} from "./common/middleware/error.middleware.js";

import { globalRateLimiter } from "./common/middleware/rate-limit.middleware.js";
import { requestIdMiddleware } from "./common/middleware/request-id.middleware.js";
import { sendSuccess } from "./common/utils/api-response.js";
import { env } from "./config/env.js";
import { healthRouter } from "./modules/health/health.routes.js";
import {
  companyRouter
} from "./modules/companies/company.routes.js";
import {
  branchRouter
} from "./modules/branches/branch.routes.js";
import {
  departmentRouter
} from "./modules/departments/department.routes.js";
import {
  designationRouter
} from "./modules/designations/designation.routes.js";
import {
  positionRouter
} from "./modules/positions/position.routes.js";
import {
  projectRouter
} from "./modules/projects/project.routes.js";
import {
  employeeRouter
} from "./modules/employees/employee.routes.js";
export const app = express();
import {
  userRouter
} from "./modules/users/user.routes.js";
import {
  roleRouter
} from "./modules/roles/role.routes.js";
import {
  employeeDetailRouter
} from "./modules/employee-details/employee-detail.routes.js";
import {
  employeeCareerRouter
} from "./modules/employee-career/employee-career.routes.js";
import {
  employeeCompetencyRouter
} from "./modules/employee-competency/employee-competency.routes.js";
import {
  employeeDocumentRouter
} from "./modules/employee-documents/employee-document.routes.js";
import {
  employeeFinanceRouter
} from "./modules/employee-finance/employee-finance.routes.js";
import {
  employeeCompensationRouter
} from "./modules/employee-compensation/employee-compensation.routes.js";
import {
  attendanceRouter,
  employeeAttendanceRouter
} from "./modules/attendance/attendance.routes.js";
import {
  attendanceAdjustmentRouter,
  employeeAttendanceAdjustmentRouter
} from "./modules/attendance/attendance-adjustment.routes.js";
import {
  attendanceOvertimeRouter,
  employeeOvertimeRouter
} from "./modules/attendance/attendance-overtime.routes.js";
import {
  attendanceSchedulingRouter,
  employeeSchedulingRouter
} from "./modules/attendance/attendance-scheduling.routes.js";
import {
  attendancePolicyRouter,
  employeeAttendancePolicyRouter
} from "./modules/attendance/attendance-policy.routes.js";
import {
  attendanceHolidayRouter,
  employeeAttendanceHolidayRouter
} from "./modules/attendance/attendance-holiday.routes.js";
import {
  employeeLeavePolicyRouter,
  leavePolicyRouter
} from "./modules/leave/leave-policy.routes.js";
import {
  employeeLeaveBalanceRouter,
  leaveBalanceRouter
} from "./modules/leave/leave-balance.routes.js";
import {
  employeeLeaveRequestRouter,
  leaveRequestRouter
} from "./modules/leave/leave-request.routes.js";
import {
  leaveGovernanceRouter
} from "./modules/leave/leave-governance.routes.js";
import {
  employeeLeaveEncashmentRouter,
  leaveEncashmentRouter
} from "./modules/leave/leave-encashment.routes.js";
import {
  companySubscriptionRouter,
  subscriptionRouter
} from "./modules/subscriptions/subscription.routes.js";
import {
  workforceReportRouter
} from "./modules/workforce-reports/workforce-report.routes.js";
app.disable("x-powered-by");



app.use(
  pinoHttp({
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers['set-cookie']"
      ],
      censor: "[REDACTED]"
    }
  })
);

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS"
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID"
    ],
    exposedHeaders: [
      "X-Request-ID",
      "RateLimit",
      "RateLimit-Policy"
    ]
  })
);

app.use(compression());

app.use(globalRateLimiter);

app.use(
  express.json({
    limit: "1mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb"
  })
);
app.use(cookieParser());
app.get("/", (_request, response) => {
  sendSuccess(response, {
    message:
      "Welcome to the HR Management API",
    data: {
      version: "1.0.0",
      environment: env.NODE_ENV
    }
  });
});
app.use(
  "/api/v1/auth",
  authRouter
);
app.use(
  "/api/v1/companies",
  companyRouter
);
app.use(
  "/api/v1/branches",
  branchRouter
);
app.use(
  "/api/v1/departments",
  departmentRouter
);
app.use(
  "/api/v1/designations",
  designationRouter
);
app.use(
  "/api/v1/positions",
  positionRouter
);
app.use(
  "/api/v1/projects",
  projectRouter
);
app.use(
  "/api/v1/employees",
  employeeRouter
);
app.use(
  "/api/v1/users",
  userRouter
);
app.use(
  "/api/v1/roles",
  roleRouter
);
app.use(
  "/api/v1/employees",
  employeeDetailRouter
);
app.use(
  "/api/v1/employees",
  employeeCareerRouter
);
app.use(
  "/api/v1/employees",
  employeeCompetencyRouter
);
app.use(
  "/api/v1/employees",
  employeeDocumentRouter
);
app.use(
  "/api/v1/employees",
  employeeFinanceRouter
);
app.use(
  "/api/v1/employees",
  employeeCompensationRouter
);
app.use(
  "/api/v1/attendance",
  attendanceRouter
);

app.use(
  "/api/v1/employees",
  employeeAttendanceRouter
);
app.use(
  "/api/v1/employees",
  employeeAttendanceAdjustmentRouter
);
app.use(
  "/api/v1/employees",
  employeeOvertimeRouter
);
app.use(
  "/api/v1/attendance",
  attendanceSchedulingRouter
);

app.use(
  "/api/v1/employees",
  employeeSchedulingRouter
);
app.use(
  "/api/v1/attendance",
  attendancePolicyRouter
);

app.use(
  "/api/v1/employees",
  employeeAttendancePolicyRouter
  
);
app.use(
  "/api/v1/attendance",
  attendanceHolidayRouter
);

app.use(
  "/api/v1/employees",
  employeeAttendanceHolidayRouter
);
app.use(
  "/api/v1/leave",
  leavePolicyRouter
);

app.use(
  "/api/v1/employees",
  employeeLeavePolicyRouter
);
app.use(
  "/api/v1/leave",
  leaveBalanceRouter
);

app.use(
  "/api/v1/employees",
  employeeLeaveBalanceRouter
);
app.use(
  "/api/v1/leave",
  leaveRequestRouter
);

app.use(
  "/api/v1/employees",
  employeeLeaveRequestRouter
);
app.use(
  "/api/v1/leave",
  leaveGovernanceRouter
);
app.use(
  "/api/v1/leave",
  leaveEncashmentRouter
);

app.use(
  "/api/v1/employees",
  employeeLeaveEncashmentRouter
);
app.use(
  "/api/v1/workforce",
  workforceReportRouter
);

app.use(
  "/api/v1/subscriptions",
  subscriptionRouter
);

app.use(
  "/api/v1/companies",
  companySubscriptionRouter
);
app.use(
  "/api/v1/health",
  healthRouter
);


app.use(notFoundHandler);
app.use(errorHandler);
