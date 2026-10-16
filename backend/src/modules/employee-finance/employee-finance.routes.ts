import {
  Router
} from "express";

import {
  authenticate
} from "../../common/middleware/authenticate.middleware.js";

import {
  requirePermission
} from "../../common/middleware/authorization.middleware.js";

import {
  requireCompletedPasswordChange
} from "../../common/middleware/password-change.middleware.js";

import {
  validateRequest
} from "../../common/middleware/validate.middleware.js";

import {
  asyncHandler
} from "../../common/utils/async-handler.js";

import {
  closeEmployeeTaxProfileController,
  createEmployeeBankAccountController,
  createEmployeeTaxProfileController,
  deleteEmployeeBankAccountController,
  getEmployeeBankAccountController,
  getEmployeeFinanceLookupsController,
  getEmployeeTaxProfileController,
  listEmployeeBankAccountsController,
  listEmployeeTaxProfilesController,
  updateEmployeeBankAccountController,
  updateEmployeeTaxProfileController
} from "./employee-finance.controller.js";

import {
  closeEmployeeTaxProfileRequestSchema,
  createEmployeeBankAccountRequestSchema,
  createEmployeeTaxProfileRequestSchema,
  deleteEmployeeBankAccountRequestSchema,
  getEmployeeBankAccountRequestSchema,
  getEmployeeFinanceLookupsRequestSchema,
  getEmployeeTaxProfileRequestSchema,
  listEmployeeBankAccountsRequestSchema,
  listEmployeeTaxProfilesRequestSchema,
  updateEmployeeBankAccountRequestSchema,
  updateEmployeeTaxProfileRequestSchema
} from "./employee-finance.schema.js";

export const employeeFinanceRouter =
  Router();

employeeFinanceRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * Lookups
 */

employeeFinanceRouter.get(
  "/:employeeId/finance-lookups",
  validateRequest(
    getEmployeeFinanceLookupsRequestSchema
  ),
  asyncHandler(
    getEmployeeFinanceLookupsController
  )
);

/*
 * Bank accounts
 */

employeeFinanceRouter.get(
  "/:employeeId/bank-accounts",
  validateRequest(
    listEmployeeBankAccountsRequestSchema
  ),
  asyncHandler(
    listEmployeeBankAccountsController
  )
);

employeeFinanceRouter.get(
  "/:employeeId/bank-accounts/:bankAccountId",
  validateRequest(
    getEmployeeBankAccountRequestSchema
  ),
  asyncHandler(
    getEmployeeBankAccountController
  )
);

employeeFinanceRouter.post(
  "/:employeeId/bank-accounts",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    createEmployeeBankAccountRequestSchema
  ),
  asyncHandler(
    createEmployeeBankAccountController
  )
);

employeeFinanceRouter.patch(
  "/:employeeId/bank-accounts/:bankAccountId",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    updateEmployeeBankAccountRequestSchema
  ),
  asyncHandler(
    updateEmployeeBankAccountController
  )
);

employeeFinanceRouter.delete(
  "/:employeeId/bank-accounts/:bankAccountId",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    deleteEmployeeBankAccountRequestSchema
  ),
  asyncHandler(
    deleteEmployeeBankAccountController
  )
);

/*
 * Tax profiles
 */

employeeFinanceRouter.get(
  "/:employeeId/tax-profiles",
  validateRequest(
    listEmployeeTaxProfilesRequestSchema
  ),
  asyncHandler(
    listEmployeeTaxProfilesController
  )
);

employeeFinanceRouter.get(
  "/:employeeId/tax-profiles/:taxProfileId",
  validateRequest(
    getEmployeeTaxProfileRequestSchema
  ),
  asyncHandler(
    getEmployeeTaxProfileController
  )
);

employeeFinanceRouter.post(
  "/:employeeId/tax-profiles",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    createEmployeeTaxProfileRequestSchema
  ),
  asyncHandler(
    createEmployeeTaxProfileController
  )
);

employeeFinanceRouter.patch(
  "/:employeeId/tax-profiles/:taxProfileId",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    updateEmployeeTaxProfileRequestSchema
  ),
  asyncHandler(
    updateEmployeeTaxProfileController
  )
);

employeeFinanceRouter.post(
  "/:employeeId/tax-profiles/:taxProfileId/close",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    closeEmployeeTaxProfileRequestSchema
  ),
  asyncHandler(
    closeEmployeeTaxProfileController
  )
);