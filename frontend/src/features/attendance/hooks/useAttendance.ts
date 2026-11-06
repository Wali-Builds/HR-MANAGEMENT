import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { checkInAttendanceRequest, checkOutAttendanceRequest, createAttendanceDeviceRequest, createAttendanceShiftRequest, getAttendanceDailySummaryRequest, listAttendanceDevicesRequest, listAttendanceRecordsRequest, listAttendanceShiftDefinitionsRequest, listAttendanceShiftsRequest, listAttendanceStatusesRequest, listEmployeeAttendanceRequest, updateAttendanceDeviceRequest, updateAttendanceShiftRequest } from "../api/attendance.api";
import type { AttendanceDeviceInput, AttendanceListParams, AttendanceShiftInput } from "../types/attendance.types";

export const attendanceQueryKeys = {
  all: ["attendance"] as const,
  records: (params: AttendanceListParams, employeeId?: string) => ["attendance", "records", employeeId ?? "company", params] as const,
  statuses: ["attendance", "statuses"] as const,
};

export function useAttendanceRecords(params: AttendanceListParams, employeeId?: string, enabled = true) {
  return useQuery({
    queryKey: attendanceQueryKeys.records(params, employeeId),
    queryFn: () => employeeId ? listEmployeeAttendanceRequest(employeeId, params) : listAttendanceRecordsRequest(params),
    enabled,
  });
}

export function useAttendanceDailySummary(params: AttendanceListParams, employeeId?: string, enabled = true) {
  const filters = Object.fromEntries(
    Object.entries(params).filter(([key]) => key !== "page" && key !== "pageSize"),
  ) as Omit<AttendanceListParams, "page" | "pageSize">;
  return useQuery({
    queryKey: [...attendanceQueryKeys.all, "daily-summary", employeeId ?? "company", filters],
    queryFn: () => getAttendanceDailySummaryRequest(filters, employeeId),
    enabled,
  });
}

export function useAttendanceStatuses(enabled = true) {
  return useQuery({ queryKey: attendanceQueryKeys.statuses, queryFn: listAttendanceStatusesRequest, enabled });
}

export function useAttendanceShifts(enabled = true) {
  return useQuery({ queryKey: [...attendanceQueryKeys.all, "shifts"], queryFn: listAttendanceShiftsRequest, enabled });
}

// added by wali: Provide query and mutation hooks for the Shifts management page.
export function useAttendanceShiftDefinitions(search = "", enabled = true, filters: { branchId?: string; departmentId?: string } = {}) {
  return useQuery({
    queryKey: [...attendanceQueryKeys.all, "shift-definitions", search, filters.branchId ?? "ALL", filters.departmentId ?? "ALL"],
    queryFn: () => listAttendanceShiftDefinitionsRequest(search.trim() || undefined, filters),
    enabled,
  });
}

function useInvalidateAttendanceShifts() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: attendanceQueryKeys.all });
}

export function useCreateAttendanceShift() {
  const invalidate = useInvalidateAttendanceShifts();
  return useMutation({ mutationFn: createAttendanceShiftRequest, onSuccess: invalidate });
}

export function useUpdateAttendanceShift() {
  const invalidate = useInvalidateAttendanceShifts();
  return useMutation({
    mutationFn: ({ shiftId, input }: { shiftId: string; input: Partial<AttendanceShiftInput> }) => updateAttendanceShiftRequest(shiftId, input),
    onSuccess: invalidate,
  });
}

export function useAttendanceDevices(search = "", enabled = true) {
  return useQuery({
    queryKey: [...attendanceQueryKeys.all, "devices", search],
    queryFn: () => listAttendanceDevicesRequest(search.trim() || undefined),
    enabled,
    // added by wali: Refresh device presence so the UI reflects the five-minute offline threshold automatically.
    refetchInterval: 30_000,
  });
}

function useInvalidateAttendanceDevices() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: [...attendanceQueryKeys.all, "devices"] });
}

export function useCreateAttendanceDevice() {
  const invalidate = useInvalidateAttendanceDevices();
  return useMutation({ mutationFn: createAttendanceDeviceRequest, onSuccess: invalidate });
}

export function useUpdateAttendanceDevice() {
  const invalidate = useInvalidateAttendanceDevices();
  return useMutation({
    mutationFn: ({ deviceId, input }: { deviceId: string; input: Partial<AttendanceDeviceInput> }) => updateAttendanceDeviceRequest(deviceId, input),
    onSuccess: invalidate,
  });
}

function useInvalidateAttendance() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: attendanceQueryKeys.all });
}

export function useCheckInAttendance() {
  const invalidate = useInvalidateAttendance();
  return useMutation({ mutationFn: checkInAttendanceRequest, onSuccess: invalidate });
}

export function useCheckOutAttendance() {
  const invalidate = useInvalidateAttendance();
  return useMutation({ mutationFn: checkOutAttendanceRequest, onSuccess: invalidate });
}
