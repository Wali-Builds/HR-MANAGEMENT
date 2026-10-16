import { apiClient } from "../../../api/api-client";
import type { ApiSuccessResponse } from "../../../types/api.types";
import type { CompanyLeaveRequestsResult } from "../types/leave-requests.types";

// edited by wali: Load tenant-scoped submitted leave requests for Company Admin review.
export async function getCompanyLeaveRequests(pendingOnly: boolean, page: number): Promise<CompanyLeaveRequestsResult> {
  const response = await apiClient.get<ApiSuccessResponse<CompanyLeaveRequestsResult>>(
    "/leave/requests",
    { params: { page, pageSize: 50, includeDetails: true, ...(pendingOnly ? { requestStatus: "PENDING" } : {}) } },
  );
  return response.data.data;
}

// edited by wali: Submit the selected current approval decision through the existing leave workflow.
export async function approveCompanyLeaveRequest(leaveRequestId: string, leaveApprovalId: string, comments?: string): Promise<void> {
  await apiClient.post(
    `/leave/requests/${leaveRequestId}/approvals/${leaveApprovalId}/approve`,
    comments ? { comments } : {},
  );
}

// edited by wali: Send the Company Admin's required rejection reason to the backend approval workflow.
export async function rejectCompanyLeaveRequest(leaveRequestId: string, leaveApprovalId: string, comments: string): Promise<void> {
  await apiClient.post(
    `/leave/requests/${leaveRequestId}/approvals/${leaveApprovalId}/reject`,
    { comments },
  );
}
