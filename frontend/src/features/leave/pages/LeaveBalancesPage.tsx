import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, CheckCircle2, LoaderCircle, Plus, Search, UsersRound, WalletCards, X } from "lucide-react";
import { normalizeApiError } from "../../../api/api-error";
import { listEmployeesRequest } from "../../employees/api/employee.api";
import type { Employee } from "../../employees/types/employee.types";
import { getCompanyLeaveBalances, initializeEmployeeLeaveBalance } from "../api/leave-balance.api";
import type { CompanyLeaveBalance, InitializeEmployeeLeaveBalanceInput } from "../types/leave-balance.types";
import { getLeavePeriods, getLeaveTypes, getMyEffectiveLeavePolicy } from "../api/leave-setup.api";
import type { LeaveType } from "../types/leave-setup.types";
import "../leave-setup.css";

const PAGE_SIZE = 100;

function todayLocal(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

// edited by wali: Fetch all tenant employees so staff without a balance record remain visible.
async function getAllCompanyEmployees(): Promise<Employee[]> {
  const firstPage = await listEmployeesRequest({ page: 1, limit: PAGE_SIZE, sortBy: "employee_code", sortOrder: "ASC" });
  const employees = [...firstPage.employees];
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const result = await listEmployeesRequest({ page, limit: PAGE_SIZE, sortBy: "employee_code", sortOrder: "ASC" });
    employees.push(...result.employees);
  }
  return employees;
}

// edited by wali: Fetch all pages from the existing tenant-scoped leave-balance endpoint.
async function getAllCompanyBalances(): Promise<CompanyLeaveBalance[]> {
  const firstPage = await getCompanyLeaveBalances(1, PAGE_SIZE);
  const balances = [...firstPage.balances];
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const result = await getCompanyLeaveBalances(page, PAGE_SIZE);
    balances.push(...result.balances);
  }
  return balances;
}

// edited by wali: Give Company Admins a searchable, read-only overview of every employee's leave balances.
export function LeaveBalancesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  // edited by wali: Keep balance initialization in the Balances workspace and open it from its action button.
  const [isInitializeFormOpen, setIsInitializeFormOpen] = useState(false);
  const [balanceEmployeeId, setBalanceEmployeeId] = useState("");
  const [balanceLeaveTypeId, setBalanceLeaveTypeId] = useState("");
  const [balancePeriodId, setBalancePeriodId] = useState("");
  const [balanceOpening, setBalanceOpening] = useState("0");
  const [balanceAccrued, setBalanceAccrued] = useState("0");
  const [balanceCarryForward, setBalanceCarryForward] = useState("0");
  const [balanceRemarks, setBalanceRemarks] = useState("");
  const [notice, setNotice] = useState("");
  const balancesQuery = useQuery({
    queryKey: ["leave-balances", "company-overview"],
    queryFn: async () => {
      const [employees, balances] = await Promise.all([getAllCompanyEmployees(), getAllCompanyBalances()]);
      return { employees, balances };
    },
  });
  const typesQuery = useQuery({ queryKey: ["leave-setup", "types"], queryFn: getLeaveTypes });
  const periodsQuery = useQuery({ queryKey: ["leave-setup", "periods"], queryFn: getLeavePeriods });

  const employees = balancesQuery.data?.employees ?? [];
  const balances = balancesQuery.data?.balances ?? [];
  const periods = periodsQuery.data?.leavePeriods ?? [];
  const leaveTypes = typesQuery.data?.leaveTypes ?? [];
  const activeEmployees = employees.filter((employee) => employee.isActive);
  const activeTypes = leaveTypes.filter((type) => type.isActive);
  const openPeriods = periods.filter((period) => period.isOpen);
  const balancePolicyQuery = useQuery({
    queryKey: ["leave-balances", "employee-policy", balanceEmployeeId],
    queryFn: () => getMyEffectiveLeavePolicy(balanceEmployeeId),
    enabled: Boolean(balanceEmployeeId),
  });
  const employeePolicyRules = (balancePolicyQuery.data?.rules ?? []).filter((rule) => rule.isActive);
  const balanceTypes = activeTypes.filter((type) => employeePolicyRules.some((rule) => rule.leaveTypeId === type.leaveTypeId));
  const selectedBalanceRule = employeePolicyRules.find((rule) => rule.leaveTypeId === balanceLeaveTypeId);
  const matchingBalance = balances.find((balance) => balance.employeeId === balanceEmployeeId && balance.leaveTypeId === balanceLeaveTypeId && balance.leavePeriodId === balancePeriodId);
  const initialBalanceTotal = Number(balanceOpening || 0) + Number(balanceAccrued || 0) + Number(balanceCarryForward || 0);
  const balanceMutation = useMutation({
    mutationFn: ({ employeeId, input }: { employeeId: string; input: InitializeEmployeeLeaveBalanceInput }) =>
      initializeEmployeeLeaveBalance(employeeId, input),
    onSuccess: async (_result, variables) => {
      setNotice("Employee balance initialized.");
      setBalanceOpening("0"); setBalanceAccrued("0"); setBalanceCarryForward("0"); setBalanceRemarks("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leave-balances", "company-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["leave-balances", variables.employeeId] }),
      ]);
    },
  });
  // edited by wali: Select the currently effective open period by default in the moved initializer form.
  useEffect(() => {
    if (!balancePeriodId && openPeriods.length) {
      const today = todayLocal();
      const current = openPeriods.find((period) => period.startDate <= today && period.endDate >= today);
      setBalancePeriodId((current ?? openPeriods[0]).leavePeriodId);
    }
  }, [balancePeriodId, openPeriods]);
  const filteredEmployees = employees.filter((employee) => {
    const query = search.trim().toLowerCase();
    return !query || [employee.fullName, employee.employeeCode, employee.assignment.departmentName ?? ""].some((value) => value.toLowerCase().includes(query));
  });
  const currentDate = todayLocal();
  const hasBalance = new Set(balances.map((balance) => balance.employeeId));
  const employeesWithBalance = employees.filter((employee) => hasBalance.has(employee.employeeId)).length;
  const employeesWithoutBalances = employees.length - employeesWithBalance;
  const error = balancesQuery.error ?? typesQuery.error ?? periodsQuery.error ?? balancePolicyQuery.error ?? balanceMutation.error;
  const isPageLoading = balancesQuery.isLoading || typesQuery.isLoading || periodsQuery.isLoading;

  // edited by wali: Initialize a ledger-backed balance from this Company Admin workspace.
  const submitBalance = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setNotice("");
    if (!balanceEmployeeId || !balanceLeaveTypeId || !balancePeriodId || matchingBalance) return;
    balanceMutation.mutate({
      employeeId: balanceEmployeeId,
      input: {
        leaveTypeId: balanceLeaveTypeId,
        leavePeriodId: balancePeriodId,
        openingBalance: Number(balanceOpening || 0),
        accruedUnits: Number(balanceAccrued || 0),
        carriedForwardUnits: Number(balanceCarryForward || 0),
        adjustedUnits: 0,
        remarks: balanceRemarks.trim() || undefined,
      },
    });
  };

  return <main className="page-stack leave-setup leave-balances">
    <header className="leave-setup__header">
      <div><span className="eyebrow">Company Admin / Leave</span><h1>Employee Leave Balances</h1><p>View leave balances by employee, leave type, and period.</p></div>
      <button className="leave-setup__button leave-setup__button--primary" type="button" aria-expanded={isInitializeFormOpen} onClick={() => { setIsInitializeFormOpen((open) => !open); setNotice(""); }}>{isInitializeFormOpen ? <X size={17} /> : <Plus size={17} />}{isInitializeFormOpen ? "Close initializer" : "Initialize balances"}</button>
    </header>

    {notice && <div className="leave-setup__notice leave-setup__notice--success"><Check size={17} />{notice}</div>}
    {error && <div className="leave-setup__notice leave-setup__notice--error"><AlertCircle size={17} />{normalizeApiError(error).message}</div>}

    {isInitializeFormOpen && <section className="leave-setup__step leave-balances__initializer">
      <div className="leave-setup__step-heading"><span><WalletCards size={17} /></span><div><h2>Initialize employee balance</h2><p>Create one balance for an employee, leave type, and open period.</p></div></div>
      <div className="leave-setup__hint"><AlertCircle size={16} />Enter amounts from your HR records. Opening balance, accrued units, and carried-forward units are added to create the starting available balance.</div>
      {!periodsQuery.isLoading && openPeriods.length === 0 && <div className="leave-setup__hint"><AlertCircle size={16} />Create an open leave period in Configuration before initializing balances.</div>}
      <form className="leave-setup__form leave-setup__form--balance" onSubmit={submitBalance}>
        <label><span>Employee</span><select required value={balanceEmployeeId} onChange={(event) => { setBalanceEmployeeId(event.target.value); setBalanceLeaveTypeId(""); }}><option value="">Select an employee</option>{activeEmployees.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.fullName} ({employee.employeeCode})</option>)}</select></label>
        <label><span>Leave type</span><select required disabled={!balanceEmployeeId || balancePolicyQuery.isLoading || !balanceTypes.length} value={balanceLeaveTypeId} onChange={(event) => setBalanceLeaveTypeId(event.target.value)}><option value="">{balancePolicyQuery.isLoading ? "Loading policy types..." : "Select an entitled type"}</option>{balanceTypes.map((type: LeaveType) => <option key={type.leaveTypeId} value={type.leaveTypeId}>{type.leaveTypeName} ({type.unitType.toLowerCase()})</option>)}</select></label>
        <label><span>Open period</span><select required disabled={!openPeriods.length} value={balancePeriodId} onChange={(event) => setBalancePeriodId(event.target.value)}><option value="">Select a period</option>{openPeriods.map((period) => <option key={period.leavePeriodId} value={period.leavePeriodId}>{period.periodName} ({period.startDate} to {period.endDate})</option>)}</select></label>
        <label><span>Opening balance ({selectedBalanceRule?.unitType.toLowerCase() ?? "units"})</span><input type="number" min="0" step="0.01" required value={balanceOpening} onChange={(event) => setBalanceOpening(event.target.value)} /></label>
        <label><span>Accrued units ({selectedBalanceRule?.unitType.toLowerCase() ?? "units"})</span><input type="number" min="0" step="0.01" required value={balanceAccrued} onChange={(event) => setBalanceAccrued(event.target.value)} /></label>
        <label><span>Carried forward ({selectedBalanceRule?.unitType.toLowerCase() ?? "units"})</span><input type="number" min="0" step="0.01" required value={balanceCarryForward} onChange={(event) => setBalanceCarryForward(event.target.value)} /></label>
        <label className="leave-setup__balance-remarks"><span>Notes <small>(optional)</small></span><input maxLength={1000} value={balanceRemarks} onChange={(event) => setBalanceRemarks(event.target.value)} placeholder="For example, balance brought forward from HR records" /></label>
        <button className="leave-setup__button leave-setup__button--primary" type="submit" disabled={!balanceEmployeeId || !balanceLeaveTypeId || !balancePeriodId || Boolean(matchingBalance) || balanceMutation.isPending || isPageLoading || !openPeriods.length}><Plus size={16} />{balanceMutation.isPending ? "Initializing..." : "Initialize balance"}</button>
      </form>
      {balanceEmployeeId && !balancePolicyQuery.isLoading && balanceTypes.length === 0 && <p className="leave-setup__empty">This employee has no active leave types in their effective policy. Assign a policy with active entitlements first.</p>}
      {matchingBalance && <div className="leave-setup__hint leave-setup__hint--success"><Check size={16} />This balance already exists for the selected period. Available: {matchingBalance.availableBalance} {matchingBalance.unitType.toLowerCase()}.</div>}
      {balanceEmployeeId && balanceLeaveTypeId && balancePeriodId && !matchingBalance && <p className="leave-setup__balance-preview">Initial available balance: <strong>{initialBalanceTotal} {selectedBalanceRule?.unitType.toLowerCase() ?? "units"}</strong> (opening + accrued + carried forward).</p>}
    </section>}

    {isPageLoading ? <section className="leave-setup__step"><div className="leave-setup__loading"><LoaderCircle size={17} />Loading company employees and balances...</div></section> : <>
      <section className="leave-balances__summary" aria-label="Balance summary">
        <SummaryCard icon={<UsersRound size={19} />} label="Employees" value={employees.length} />
        <SummaryCard icon={<CheckCircle2 size={19} />} label="With balances" value={employeesWithBalance} />
        <SummaryCard icon={<WalletCards size={19} />} label="Setup needed" value={employeesWithoutBalances} />
      </section>

      <section className="leave-setup__step leave-balances__toolbar">
        <label className="leave-balances__search"><span>Search employees</span><div><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, employee code, or department" /></div></label>
        {/* edited by wali: Populate filters from the leave setup API's actual response fields. */}
        <label><span>Period</span><select value={periodId} onChange={(event) => setPeriodId(event.target.value)}><option value="">All periods</option>{periods.map((period) => <option key={period.leavePeriodId} value={period.leavePeriodId}>{period.periodName}</option>)}</select></label>
        <label><span>Leave type</span><select value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)}><option value="">All leave types</option>{leaveTypes.map((type) => <option key={type.leaveTypeId} value={type.leaveTypeId}>{type.leaveTypeName}</option>)}</select></label>
      </section>

      {filteredEmployees.length === 0 ? <section className="leave-setup__step leave-balances__empty"><UsersRound size={24} /><strong>No employees found</strong><p>Try changing your search.</p></section> : <div className="leave-balances__employees">
        {filteredEmployees.map((employee) => {
          const employeeBalances = balances.filter((balance) => balance.employeeId === employee.employeeId && (!periodId || balance.leavePeriodId === periodId) && (!leaveTypeId || balance.leaveTypeId === leaveTypeId));
          // edited by wali: Sum only balances active today, so historical periods are not double-counted.
          const currentBalances = balances.filter((balance) => balance.employeeId === employee.employeeId && balance.periodStartDate <= currentDate && balance.periodEndDate >= currentDate);
          const hasAnyBalance = hasBalance.has(employee.employeeId);
          return <EmployeeBalanceCard key={employee.employeeId} employee={employee} balances={employeeBalances} combinedAvailable={sumAvailableByUnit(currentBalances)} hasAnyBalance={hasAnyBalance} />;
        })}
      </div>}
      <p className="leave-balances__count">Showing {filteredEmployees.length} of {employees.length} employees</p>
    </>}
  </main>;
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <article className="leave-balances__summary-card"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>;
}

function EmployeeBalanceCard({ employee, balances, combinedAvailable, hasAnyBalance }: { employee: Employee; balances: CompanyLeaveBalance[]; combinedAvailable: Array<{ unit: string; amount: number }>; hasAnyBalance: boolean }) {
  const emptyMessage = hasAnyBalance ? "No balance matches the selected period and leave type." : "No leave balances have been initialized for this employee.";
  return <section className="leave-balances__employee">
    <header><div><strong>{employee.fullName}</strong><span>{employee.employeeCode}{employee.assignment.departmentName ? ` A· ${employee.assignment.departmentName}` : ""}</span></div><span className={`leave-balances__status ${balances.length ? "is-ready" : "is-missing"}`}>{balances.length ? `${balances.length} balance${balances.length === 1 ? "" : "s"}` : hasAnyBalance ? "No matching balances" : "Setup needed"}</span></header>
    {balances.length === 0 ? <p className="leave-balances__no-balance">{emptyMessage}</p> : <div className="leave-balances__table-wrap"><table className="leave-balances__table"><thead><tr><th>Leave type / period</th><th>Opening</th><th>Accrued</th><th>Carried forward</th><th>Used</th><th>Pending</th><th>Available</th></tr></thead><tbody>
      {/* edited by wali: Show the configured days or hours beside every balance component. */}
      {balances.map((balance) => <tr key={balance.leaveBalanceId}><td><strong>{balance.leaveTypeName}</strong><small>{balance.periodName} · {balance.periodStartDate} to {balance.periodEndDate}</small>{!balance.isConsistent && <small className="leave-balances__warning">Balance needs review</small>}</td><td>{formatUnits(balance.openingBalance)} {balance.unitType.toLowerCase()}</td><td>{formatUnits(balance.accruedUnits)} {balance.unitType.toLowerCase()}</td><td>{formatUnits(balance.carriedForwardUnits)} {balance.unitType.toLowerCase()}</td><td>{formatUnits(balance.usedUnits)} {balance.unitType.toLowerCase()}</td><td>{formatUnits(balance.pendingUnits)} {balance.unitType.toLowerCase()}</td><td><strong>{formatUnits(balance.availableBalance)} {balance.unitType.toLowerCase()}</strong></td></tr>)}
    </tbody></table></div>}
    {/* edited by wali: Put one combined current-period total after the detailed balance breakdown. */}
    <p className="leave-balances__combined">Combined available: <strong>{formatCombinedAvailable(combinedAvailable) || "No current balance"}</strong></p>
  </section>;
}

function formatUnits(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

// edited by wali: Keep day and hour totals separate when combining available balances.
function sumAvailableByUnit(balances: CompanyLeaveBalance[]): Array<{ unit: string; amount: number }> {
  const totals = new Map<string, number>();
  balances.forEach((balance) => totals.set(balance.unitType, (totals.get(balance.unitType) ?? 0) + balance.availableBalance));
  return Array.from(totals, ([unit, amount]) => ({ unit: unit.toLowerCase(), amount }));
}

function formatCombinedAvailable(totals: Array<{ unit: string; amount: number }>): string {
  return totals.map(({ unit, amount }) => `${formatUnits(amount)} ${unit}`).join(" · ");
}
