import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type { Position, PositionInput, PositionListParams, PositionListResult } from "../types/position.types";

// edited by wali: Keep position HTTP requests in the Positions feature.
export async function listPositionsRequest(params: PositionListParams): Promise<PositionListResult> {
  const response = await apiClient.get<ApiSuccessResponse<PositionListResult>>("/positions", { params });
  return response.data.data;
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
