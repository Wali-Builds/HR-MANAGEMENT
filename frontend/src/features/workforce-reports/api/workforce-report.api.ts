import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type { WorkforceReport } from "../types/workforce-report.types";

export async function getWorkforceReportRequest(
  params: {
    companyId?: string;
    months: number;
    upcomingDays: number;
  }
): Promise<WorkforceReport> {
  const response = await apiClient.get<
    ApiSuccessResponse<{ report: WorkforceReport }>
  >("/workforce/reports/summary", { params });

  return response.data.data.report;
}
