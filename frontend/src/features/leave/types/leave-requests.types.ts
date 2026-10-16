// edited by wali: Match company leave request list details and approval rows returned by the backend.
export interface CompanyLeaveRequest {
  leaveRequestId: string;
  requestNumber: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  leaveTypeName: string;
  leaveTypeUnitType: string;
  startDate: string;
  endDate: string;
  requestedUnits: number;
  chargeableUnits: number;
  reason: string;
  requestStatus: string;
  submittedAt: string | null;
  finalRemarks: string | null;
}

export interface CompanyLeaveApproval {
  leaveApprovalId: string;
  approvalLevel: number;
  approverUsername: string;
  approverEmployeeName: string | null;
  decision: string;
  comments: string | null;
  isFinalLevel: boolean;
}

export interface CompanyLeaveRequestDetails {
  request: CompanyLeaveRequest;
  approvals: CompanyLeaveApproval[];
}

export interface CompanyLeaveRequestsResult {
  requests: CompanyLeaveRequestDetails[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
}
