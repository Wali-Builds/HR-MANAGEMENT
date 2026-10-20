import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  Save,
  UserRoundPlus,
  Network,
} from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import { useAuthStore } from "../../../app/store/auth.store";
import { usePermissions } from "../../../hooks/usePermissions";
import { useCompanies } from "../../companies/hooks/useCompanies";
import { listActiveProjectReferencesRequest } from "../api/employee.api";
import { EmployeeFormSections } from "../components/EmployeeFormSections";
import {
  useCreateEmployee,
  useEmployee,
  useEmployeeLookups,
  useEmployeeReferenceData,
  useUpdateEmployee,
} from "../hooks/useEmployees";
import {
  employeeFormSchema,
  employeeHiringFormSchema,
  type EmployeeFormInputValues,
  type EmployeeFormValues,
} from "../schemas/employee.schema";
import {
  employeeDefaultValues,
  employeeToFormValues,
  toEmployeeMutationInput,
} from "../utils/employee-form";

interface Props {
  mode: "create" | "edit";
}

export function EmployeeFormPage({ mode }: Props) {
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId: string }>();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const { hasPermission, isPlatformAdmin } = usePermissions();
  const isEditing = mode === "edit";
  const canUseForm = isEditing ? hasPermission("employee.update") : hasPermission("employee.create");

  const employeeQuery = useEmployee(isEditing ? employeeId ?? null : null);
  const lookupsQuery = useEmployeeLookups();
  // edited by wali: Load the platform company directory only for Platform Admins.
  const companiesQuery = useCompanies({
    page: 1,
    limit: 100,
    sortBy: "display_name",
    sortOrder: "ASC",
    isActive: true,
  }, isPlatformAdmin);
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<EmployeeFormInputValues, unknown, EmployeeFormValues>({
    resolver: zodResolver(isEditing ? employeeFormSchema : employeeHiringFormSchema),
    defaultValues: {
      ...employeeDefaultValues,
      companyId: searchParams.get("companyId") ?? user?.companyId ?? "",
    },
  });

  const watchedCompanyId = watch("companyId");
  const scopeCompanyId = isPlatformAdmin
    ? watchedCompanyId || undefined
    : user?.companyId ?? employeeQuery.data?.companyId;
  const references = useEmployeeReferenceData(
    scopeCompanyId,
    !isPlatformAdmin || Boolean(scopeCompanyId),
  );
  const selectedDepartmentId = watch("departmentId");
  const projectsQuery = useQuery({
    queryKey: ["projects", "active-assignment-options", scopeCompanyId, selectedDepartmentId],
    queryFn: () => listActiveProjectReferencesRequest(selectedDepartmentId),
    enabled: Boolean(selectedDepartmentId) && (!isPlatformAdmin || Boolean(scopeCompanyId)),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!canUseForm) {
      navigate("/unauthorized", { replace: true });
    }
  }, [canUseForm, navigate]);

  useEffect(() => {
    if (!isEditing) {
      reset({
        ...employeeDefaultValues,
        companyId: searchParams.get("companyId") ?? user?.companyId ?? "",
      });
      return;
    }

    if (employeeQuery.data) {
      reset(employeeToFormValues(employeeQuery.data));
    }
  }, [employeeQuery.data, isEditing, reset, searchParams, user?.companyId]);

  function discard() {
    if (isDirty && !window.confirm("Discard unsaved employee changes?")) {
      return;
    }

    if (isEditing && employeeId) {
      navigate(`/employees/${employeeId}`);
      return;
    }

    navigate("/employees");
  }

  async function submit(values: EmployeeFormValues) {
    if (isPlatformAdmin && !values.companyId) {
      toast.error("Select a company before creating the employee.");
      return;
    }

    const input = toEmployeeMutationInput(values, employeeQuery.data);

    try {
      const employee = isEditing && employeeId
        ? await updateMutation.mutateAsync({ employeeId, input })
        : await createMutation.mutateAsync(input);

      toast.success(isEditing ? "Employee updated successfully" : "Employee created successfully");
      navigate(`/employees/${employee.employeeId}`, { replace: true });
    } catch (error) {
      const apiError = normalizeApiError(error);
      if (apiError.code === "EMPLOYEE_LIMIT_REACHED") {
        toast.error("The company has reached the active employee limit for its subscription plan.");
      } else {
        toast.error(apiError.message);
      }
    }
  }

  if (!canUseForm) return null;

  if (isEditing && employeeQuery.isLoading) {
    return <div className="emp-full-page-state"><LoaderCircle className="spin" size={26} /><p>Loading employee record…</p></div>;
  }

  if (isEditing && employeeQuery.isError) {
    const error = normalizeApiError(employeeQuery.error);
    return (
      <div className="emp-full-page-state">
        <UserRoundPlus size={30} />
        <h1>Employee could not be loaded</h1>
        <p>{error.message}</p>
        <button type="button" className="emp-secondary-action" onClick={() => navigate("/employees")}><ArrowLeft size={16} /> Return to employees</button>
      </div>
    );
  }

  return (
    <form className="emp-form-page emp-form-page--access-ui" onSubmit={handleSubmit(submit)} noValidate>
      <header className="emp-record-toolbar">
        <div className="emp-record-toolbar__left">
          <button type="button" className="emp-back-button" onClick={discard}><ArrowLeft size={17} /></button>
          <div>
            <span>Employees / {isEditing ? employeeQuery.data?.fullName ?? "Edit" : "New"}</span>
            <h1>{isEditing ? "Edit employee" : "Create employee"}</h1>
          </div>
        </div>
        <div className="emp-record-toolbar__actions">
          <button type="button" className="emp-secondary-action" onClick={discard} disabled={isSaving}>Discard</button>
          <button type="submit" className="emp-primary-action" disabled={isSaving}>
            {isSaving ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
            {isSaving ? "Saving…" : "Save employee"}
          </button>
        </div>
      </header>

      <div className="emp-form-page__body">
        <aside className="emp-form-guide">
          <div className="emp-form-guide__icon"><UserRoundPlus size={23} /></div>
          <span>{isEditing ? "Employee profile" : "New team member"}</span>
          <h2>{isEditing ? employeeQuery.data?.fullName : "Create a complete employee record"}</h2>
          <p>This profile becomes the operational source for assignments, attendance, leave, compensation, documents and employee self-service.</p>
          <div className="emp-form-guide__checklist">
            <span><Check size={15} /> Personal identity</span>
            <span><Check size={15} /> Employment and reporting line</span>
            <span><Check size={15} /> Contact and compliance</span>
            <span><Check size={15} /> Contract timeline</span>
          </div>
        </aside>

        <div className="emp-form-structure-wrap">
          {references.branches.length === 0 || references.departments.length === 0 ? (
            <div className="emp-structure-notice">
              <span><Network size={19} /></span>
              <div>
                <strong>Complete the organisation structure first</strong>
                <p>Create branches and departments before assigning this employee. Designations and positions can also be configured in the same workspace.</p>
              </div>
              <button type="button" onClick={() => navigate("/employees/organisation/branches")}>Open organisation</button>
            </div>
          ) : null}

        <EmployeeFormSections
          register={register}
          watch={watch}
          setValue={setValue}
          errors={errors}
          isHiring={!isEditing}
          lookups={lookupsQuery.data}
          references={{ ...references, projects: projectsQuery.data ?? [] }}
          companies={isPlatformAdmin ? companiesQuery.data?.companies ?? [] : []}
          isPlatformAdmin={isPlatformAdmin}
          currentEmployeeId={employeeId}
        />
        </div>
      </div>
    </form>
  );
}
