import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type { Position, PositionInput, PositionListParams, PositionListResult } from "../types/position.types";

// edited by wali: Keep position HTTP requests in the Positions feature.
export async function listPositionsRequest(params: PositionListParams): Promise<PositionListResult> {
  const response = await apiClient.get<ApiSuccessResponse<PositionListResult>>("/positions", { params });
  return response.data.data;
}

// edited by wali: Fetch every page when checking whether a designation already has a position.
export async function listAllPositionsRequest(params: Omit<PositionListParams, "page" | "limit">): Promise<Position[]> {
  const firstPage = await listPositionsRequest({ ...params, page: 1, limit: 100 });
  if (firstPage.pagination.totalPages <= 1) return firstPage.positions;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.pagination.totalPages - 1 }, (_, index) =>
      listPositionsRequest({ ...params, page: index + 2, limit: 100 }),
    ),
  );
  return [...firstPage.positions, ...remainingPages.flatMap((result) => result.positions)];
}

export async function createPositionRequest(input: PositionInput): Promise<Position> {
  const response = await apiClient.post<ApiSuccessResponse<{ position: Position }>>("/positions", input);
  return response.data.data.position;
}
export async function updatePositionRequest(positionId: string, input: Partial<PositionInput>): Promise<Position> {
  const response = await apiClient.patch<ApiSuccessResponse<{ position: Position }>>("/positions/" + positionId, input);
  return response.data.data.position;
}
export async function closePositionRequest(positionId: string): Promise<void> {
  await apiClient.delete("/positions/" + positionId);
}
