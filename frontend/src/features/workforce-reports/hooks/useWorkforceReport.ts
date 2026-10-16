import { useQuery } from "@tanstack/react-query";
import { getWorkforceReportRequest } from "../api/workforce-report.api";

export function useWorkforceReport(
  params: {
    companyId?: string;
    months: number;
    upcomingDays: number;
  },
  enabled: boolean
) {
  return useQuery({
    queryKey: ["workforce-report", params],
    queryFn: () => getWorkforceReportRequest(params),
    enabled,
    staleTime: 60000
  });
}
