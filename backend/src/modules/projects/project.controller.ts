import type { Request, Response } from "express";
import { AppError } from "../../common/errors/app-error.js";
import { sendSuccess } from "../../common/utils/api-response.js";
import type { AuthContext } from "../auth/auth.types.js";
import type { CreateProjectInput, ProjectListQuery, UpdateProjectInput } from "./project.schema.js";
import { createProject, getProject, listProjects, updateProject } from "./project.service.js";

function auth(response: Response): AuthContext {
  const context = response.locals.auth as AuthContext | undefined;
  if (!context) throw new AppError({ message: "Authentication is required", statusCode: 401, code: "AUTHENTICATION_REQUIRED" });
  return context;
}

export async function listProjectsController(_request: Request, response: Response): Promise<void> {
  const validated = response.locals.validated as { query: ProjectListQuery };
  sendSuccess(response, { message: "Projects retrieved successfully", data: { projects: await listProjects(validated.query, auth(response)) } });
}

export async function getProjectController(_request: Request, response: Response): Promise<void> {
  const validated = response.locals.validated as { params: { projectId: string } };
  sendSuccess(response, { message: "Project retrieved successfully", data: { project: await getProject(validated.params.projectId, auth(response)) } });
}

export async function createProjectController(_request: Request, response: Response): Promise<void> {
  const validated = response.locals.validated as { body: CreateProjectInput };
  const project = await createProject(validated.body, auth(response));
  response.status(201);
  sendSuccess(response, { message: "Project created successfully", data: { project } });
}

export async function updateProjectController(_request: Request, response: Response): Promise<void> {
  const validated = response.locals.validated as { params: { projectId: string }; body: UpdateProjectInput };
  sendSuccess(response, { message: "Project updated successfully", data: { project: await updateProject(validated.params.projectId, validated.body, auth(response)) } });
}
