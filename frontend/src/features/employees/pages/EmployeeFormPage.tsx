import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Copy,
  X,
  LoaderCircle,
  Save,
  UserRoundPlus,
  Network,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import { useAuthStore } from "../../../app/store/auth.store";
import { usePermissions } from "../../../hooks/usePermissions";
import { useCompanies, useCompany } from "../../companies/hooks/useCompanies";
import { createEmployeeBankAccountRequest, listActiveProjectReferencesRequest } from "../api/employee.api";
import { EmployeeFormSections } from "../components/EmployeeFormSections";
import {
  useCreateEmployee,
  useEmployee,
  useEmployeeLookups,
  useEmployeeReferenceData,
  useUpdateEmployee,
} from "../hooks/useEmployees";
import {
  employeeHiringFormSchema,
  employeeProfileEditFormSchema,
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
  const [newAccessDetails, setNewAccessDetails] = useState<{
    employeeId: string;
    employeeName: string;
    username: string;
    email: string | null;
    temporaryPassword: string;
    note: string | null;
  } | null>(null);
  const [accessDetailsCopied, setAccessDetailsCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors, isDirty },
  } = useForm<EmployeeFormInputValues, unknown, EmployeeFormValues>({
    resolver: zodResolver(isEditing ? employeeProfileEditFormSchema : employeeHiringFormSchema),
    defaultValues: {
      ...employeeDefaultValues,
      companyId: searchParams.get("companyId") ?? user?.companyId ?? "",
    },
  });

  const watchedCompanyId = watch("companyId");
  const scopeCompanyId = isPlatformAdmin
    ? watchedCompanyId || undefined
    : user?.companyId ?? employeeQuery.data?.companyId;
  const companyNumberingQuery = useCompany(!isEditing ? scopeCompanyId ?? null : null);
  const employeeIdSequenceStart = companyNumberingQuery.data
    ? `${companyNumberingQuery.data.employeeCodePrefix ?? "EMP"}${String(companyNumberingQuery.data.employeeCodeStartNumber).padStart(companyNumberingQuery.data.employeeCodeLength, "0")}`
    : null;
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

  useEffect(() => {
    if (isEditing || !lookupsQuery.data) return;

    if (!getValues("employmentTypeId")) {
      const employmentType = lookupsQuery.data.employmentTypes.find((item) => /FULL.?TIME|PERMANENT/i.test(item.typeCode))
        ?? lookupsQuery.data.employmentTypes[0];
      if (employmentType) setValue("employmentTypeId", employmentType.employmentTypeId, { shouldValidate: true });
    }

    if (!getValues("employeeStatusId")) {
      const employeeStatus = lookupsQuery.data.employeeStatuses.find((item) => item.statusCode === "ACTIVE")
        ?? lookupsQuery.data.employeeStatuses.find((item) => item.isActiveEmployment)
        ?? lookupsQuery.data.employeeStatuses[0];
      if (employeeStatus) setValue("employeeStatusId", employeeStatus.employeeStatusId, { shouldValidate: true });
    }
  }, [getValues, isEditing, lookupsQuery.data, setValue]);

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
      const created = isEditing ? null : await createMutation.mutateAsync(input);
      const employee = isEditing && employeeId
        ? await updateMutation.mutateAsync({ employeeId, input })
        : created!.employee;
      let bankDetailsWarning: string | null = null;

      const hasBankDetails = [values.bankName, values.bankBranchName, values.bankAccountTitle, values.bankAccountNumber, values.bankIban]
        .some((value) => value.trim().length > 0);
      if (!isEditing && hasBankDetails) {
        try {
          await createEmployeeBankAccountRequest(employee.employeeId, {
            bankName: values.bankName,
            ...(values.bankBranchName ? { branchName: values.bankBranchName } : {}),
            accountTitle: values.bankAccountTitle,
            accountNumber: values.bankAccountNumber,
            ...(values.bankIban ? { iban: values.bankIban } : {}),
            accountType: "CURRENT",
            currencyCode: "PKR",
            paymentPriority: 1,
            isPrimary: true,
            isActive: true,
          });
        } catch (bankError) {
          bankDetailsWarning = `Bank details were not saved: ${normalizeApiError(bankError).message}`;
        }
      }

      if (!isEditing && created?.accessAccount) {
        setNewAccessDetails({
          employeeId: employee.employeeId,
          employeeName: employee.fullName,
          ...created.accessAccount,
          note: bankDetailsWarning,
        });
        return;
      }

      if (!isEditing && created?.accessAccountError) {
        toast.warning(`Employee created successfully. ${created.accessAccountError} You can retry later from Workforce Access.`);
      } else {
        toast.success(isEditing ? "Employee updated successfully" : "Employee created successfully");
      }
      if (bankDetailsWarning) toast.error(bankDetailsWarning);
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

  // edited by wali: Tell the user when required values are missing before the form can save.
  function showValidationMessage(validationErrors: FieldErrors<EmployeeFormInputValues>) {
    const message = Object.values(validationErrors)
      .map((fieldError) => fieldError?.message)
      .find((fieldMessage): fieldMessage is string => typeof fieldMessage === "string" && fieldMessage.length > 0);
    toast.error(message ?? "Please complete the required fields before saving.");
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

  const closeAccessDetails = () => {
    if (newAccessDetails) navigate(`/employees/${newAccessDetails.employeeId}`, { replace: true });
    setNewAccessDetails(null);
  };

  return (
    <>
    <form className="emp-form-page emp-form-page--access-ui" onSubmit={handleSubmit(submit, showValidationMessage)} noValidate>
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
          <button type="submit" className="emp-primary-action" disabled={isSaving || (!isEditing && lookupsQuery.isLoading)}>
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
            <span><Check size={15} /> Contact and compliance</span>
            <span><Check size={15} /> {isEditing ? "Employment and reporting line" : "Assignment can be added later"}</span>
            {isEditing ? <span><Check size={15} /> Contract timeline</span> : null}
          </div>
        </aside>

        <div className="emp-form-structure-wrap">
          {isEditing && (references.branches.length === 0 || references.departments.length === 0) ? (
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
          employeeIdSequenceStart={employeeIdSequenceStart}
          currentEmployeeId={employeeId}
        />
        </div>
      </div>
    </form>
    {newAccessDetails ? (
      <div className="emp-access-created-backdrop" role="presentation">
        <section className="emp-access-created-dialog" role="dialog" aria-modal="true" aria-labelledby="emp-access-created-title">
          <button type="button" className="emp-access-created-close" aria-label="Close" onClick={closeAccessDetails}><X size={18} /></button>
          <span className="emp-access-created-kicker">Workforce access created</span>
          <h2 id="emp-access-created-title">Login is ready for {newAccessDetails.employeeName}</h2>
          <p>The employee has the EMPLOYEE role and must change this temporary password at first sign-in. Copy these details now; the password will not be shown again.</p>
          <div className="emp-access-created-fields">
            <div><span>Username</span><strong>{newAccessDetails.username}</strong></div>
            {newAccessDetails.email ? <div><span>Email</span><strong>{newAccessDetails.email}</strong></div> : null}
            <div><span>Temporary password</span><strong className="emp-access-created-password">{newAccessDetails.temporaryPassword}</strong></div>
          </div>
          {newAccessDetails.note ? <p className="emp-access-created-warning">{newAccessDetails.note}</p> : null}
          <footer>
            <button type="button" className="emp-secondary-action" onClick={() => {
              void navigator.clipboard.writeText(`Username: ${newAccessDetails.username}\nTemporary password: ${newAccessDetails.temporaryPassword}`);
              setAccessDetailsCopied(true);
              toast.success("Login details copied");
            }}>{accessDetailsCopied ? <Check size={16} /> : <Copy size={16} />}{accessDetailsCopied ? "Copied" : "Copy login details"}</button>
            <button type="button" className="emp-primary-action" onClick={closeAccessDetails}>Continue to employee</button>
          </footer>
        </section>
      </div>
    ) : null}
    </>
  );
}
