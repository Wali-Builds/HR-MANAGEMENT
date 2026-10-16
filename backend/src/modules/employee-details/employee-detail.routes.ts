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
  createEmergencyContactController,
  createEmployeeAddressController,
  deleteEmergencyContactController,
  deleteEmployeeAddressController,
  listEmergencyContactsController,
  listEmployeeAddressesController,
  updateEmergencyContactController,
  updateEmployeeAddressController
} from "./employee-detail.controller.js";

import {
  createEmergencyContactRequestSchema,
  createEmployeeAddressRequestSchema,
  deleteEmergencyContactRequestSchema,
  deleteEmployeeAddressRequestSchema,
  listEmergencyContactsRequestSchema,
  listEmployeeAddressesRequestSchema,
  updateEmergencyContactRequestSchema,
  updateEmployeeAddressRequestSchema
} from "./employee-detail.schema.js";

export const employeeDetailRouter =
  Router();

employeeDetailRouter.use(
  authenticate,
  requireCompletedPasswordChange
);

/*
 * Employee addresses
 */

employeeDetailRouter.get(
  "/:employeeId/addresses",
  validateRequest(
    listEmployeeAddressesRequestSchema
  ),
  asyncHandler(
    listEmployeeAddressesController
  )
);

employeeDetailRouter.post(
  "/:employeeId/addresses",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    createEmployeeAddressRequestSchema
  ),
  asyncHandler(
    createEmployeeAddressController
  )
);

employeeDetailRouter.patch(
  "/:employeeId/addresses/:addressId",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    updateEmployeeAddressRequestSchema
  ),
  asyncHandler(
    updateEmployeeAddressController
  )
);

employeeDetailRouter.delete(
  "/:employeeId/addresses/:addressId",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    deleteEmployeeAddressRequestSchema
  ),
  asyncHandler(
    deleteEmployeeAddressController
  )
);

/*
 * Emergency contacts
 */

employeeDetailRouter.get(
  "/:employeeId/emergency-contacts",
  validateRequest(
    listEmergencyContactsRequestSchema
  ),
  asyncHandler(
    listEmergencyContactsController
  )
);

employeeDetailRouter.post(
  "/:employeeId/emergency-contacts",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    createEmergencyContactRequestSchema
  ),
  asyncHandler(
    createEmergencyContactController
  )
);

employeeDetailRouter.patch(
  "/:employeeId/emergency-contacts/:contactId",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    updateEmergencyContactRequestSchema
  ),
  asyncHandler(
    updateEmergencyContactController
  )
);

employeeDetailRouter.delete(
  "/:employeeId/emergency-contacts/:contactId",
  requirePermission(
    "employee.update"
  ),
  validateRequest(
    deleteEmergencyContactRequestSchema
  ),
  asyncHandler(
    deleteEmergencyContactController
  )
);