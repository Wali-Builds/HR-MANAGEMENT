import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createProjectRequest, listProjectsRequest, updateProjectRequest, type ProjectListParams } from "../api/project.api";
import type { ProjectInput } from "../types/project.types";

export const projectQueryKeys = {
  all: ["projects"] as const,
  list: (params?: ProjectListParams) => [...projectQueryKeys.all, params] as const,
};

export function useProjects(params?: ProjectListParams, enabled = true) {
  return useQuery({ queryKey: projectQueryKeys.list(params), queryFn: () => listProjectsRequest(params), enabled });
}

function useInvalidateProjects() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: projectQueryKeys.all });
}

export function useCreateProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({ mutationFn: createProjectRequest, onSuccess: invalidate });
}

export function useUpdateProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: Partial<ProjectInput> }) => updateProjectRequest(projectId, input),
    onSuccess: invalidate,
  });
}
