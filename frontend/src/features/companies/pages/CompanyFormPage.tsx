import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Building2,
  Check,
  LoaderCircle,
  Save,
} from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import { usePermissions } from "../../../hooks/usePermissions";
import { CompanyFormSections } from "../components/CompanyFormSections";
import {
  useCompany,
  useCreateCompany,
  useUpdateCompany,
} from "../hooks/useCompanies";
import {
  companyFormSchema,
  type CompanyFormValues,
} from "../schemas/company.schema";
import {
  companyDefaultValues,
  companyToFormValues,
  toCompanyMutationInput,
} from "../utils/company-form";

interface CompanyFormPageProps {
  mode: "create" | "edit";
}

export function CompanyFormPage({ mode }: CompanyFormPageProps) {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const { hasPermission, isPlatformAdmin } = usePermissions();
  const isEditing = mode === "edit";
  const canUseForm = isEditing
    ? isPlatformAdmin || hasPermission("company.manage")
    : isPlatformAdmin;

  const companyQuery = useCompany(isEditing ? companyId ?? null : null);
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: companyDefaultValues,
  });

  useEffect(() => {
    if (!canUseForm) {
      navigate("/unauthorized", { replace: true });
    }
  }, [canUseForm, navigate]);

  useEffect(() => {
    if (!isEditing) {
      reset(companyDefaultValues);
      return;
    }

    if (companyQuery.data) {
      reset(companyToFormValues(companyQuery.data));
    }
  }, [companyQuery.data, isEditing, reset]);

  function discard() {
    if (isDirty && !window.confirm("Discard unsaved company changes?")) {
      return;
    }

    if (isEditing && companyId) {
      navigate(`/companies/${companyId}`);
      return;
    }

    navigate("/companies");
  }

  async function submit(values: CompanyFormValues) {
    const input = toCompanyMutationInput(values);

    try {
      const company = isEditing && companyId
        ? await updateMutation.mutateAsync({ companyId, input })
        : await createMutation.mutateAsync(input);

      toast.success(isEditing ? "Company updated successfully" : "Company created successfully");
      navigate(`/companies/${company.companyId}`, { replace: true });
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  if (!canUseForm) {
    return null;
  }

  if (isEditing && companyQuery.isLoading) {
    return (
      <div className="org-full-page-state">
        <LoaderCircle className="spin" size={26} />
        <p>Loading company record…</p>
      </div>
    );
  }

  if (isEditing && companyQuery.isError) {
    const error = normalizeApiError(companyQuery.error);
    return (
      <div className="org-full-page-state">
        <Building2 size={30} />
        <h1>Company could not be loaded</h1>
        <p>{error.message}</p>
        <button type="button" className="org-secondary-action" onClick={() => navigate("/companies")}>
          <ArrowLeft size={16} /> Return to companies
        </button>
      </div>
    );
  }

  return (
    <form className="org-form-page" onSubmit={handleSubmit(submit)} noValidate>
      <header className="org-record-toolbar">
        <div className="org-record-toolbar__left">
          <button type="button" className="org-back-button" onClick={discard}>
            <ArrowLeft size={17} />
          </button>
          <div>
            <span>Companies / {isEditing ? companyQuery.data?.displayName ?? "Edit" : "New"}</span>
            <h1>{isEditing ? "Edit company" : "Create company"}</h1>
          </div>
        </div>

        <div className="org-record-toolbar__actions">
          <button type="button" className="org-secondary-action" onClick={discard} disabled={isSaving}>
            Discard
          </button>
          <button type="submit" className="org-primary-action" disabled={isSaving}>
            {isSaving ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
            {isSaving ? "Saving…" : "Save company"}
          </button>
        </div>
      </header>

      <div className="org-form-page__body">
        <aside className="org-form-guide">
          <div className="org-form-guide__icon"><Building2 size={22} /></div>
          <span>{isEditing ? "Company profile" : "New organisation"}</span>
          <h2>{isEditing ? companyQuery.data?.displayName : "Create a reliable organisation record"}</h2>
          <p>
            This profile becomes the foundation for branches, departments,
            employees, regional defaults and company-scoped security.
          </p>

          <div className="org-form-guide__checklist">
            <span><Check size={15} /> Identity and legal details</span>
            <span><Check size={15} /> Contact and address</span>
            <span><Check size={15} /> Regional defaults</span>
            <span><Check size={15} /> Employee numbering</span>
          </div>
        </aside>

        <CompanyFormSections register={register} errors={errors} />
      </div>
    </form>
  );
}
