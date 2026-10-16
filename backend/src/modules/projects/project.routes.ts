import {
    Router
}
    from "express";
import {
    authenticate
}
    from "../../common/middleware/authenticate.middleware.js";
import {
    requireRole
}
    from "../../common/middleware/authorization.middleware.js";
import {
    requireCompletedPasswordChange
}
    from "../../common/middleware/password-change.middleware.js";
import {
    validateRequest
}
    from "../../common/middleware/validate.middleware.js";
import {
    asyncHandler
}
    from "../../common/utils/async-handler.js";
import {
    createProjectController, getProjectController, listProjectsController, updateProjectController
}
    from "./project.controller.js";
import {
    createProjectRequestSchema, getProjectRequestSchema, listProjectsRequestSchema, updateProjectRequestSchema
}
    from "./project.schema.js";

export const projectRouter = Router();
projectRouter
    .use(
        authenticate,
        requireCompletedPasswordChange,
        requireRole("COMPANY_ADMIN"));
projectRouter
    .get(
        "/",
        validateRequest(listProjectsRequestSchema),
        asyncHandler(listProjectsController));
projectRouter
    .get(
        "/:projectId",
        validateRequest(getProjectRequestSchema),
        asyncHandler(getProjectController));
projectRouter
    .post(
        "/",
        validateRequest(createProjectRequestSchema),
        asyncHandler(createProjectController));
projectRouter
    .patch(
        "/:projectId",
        validateRequest(updateProjectRequestSchema),
        asyncHandler(updateProjectController));
