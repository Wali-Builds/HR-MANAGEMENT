// edited by wali: Manage the subscription plan catalog and persist plan features through the admin APIs.
import { AlertTriangle, LoaderCircle, Plus, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import { usePermissions } from "../../../hooks/usePermissions";
import { SubscriptionPlanFormDialog } from "../components/SubscriptionPlanFormDialog";
import { SubscriptionPlanTable } from "../components/SubscriptionPlanTable";
import {
  useCreateSubscriptionPlan,
  useReplaceSubscriptionPlanFeatures,
  useSubscriptionFeatureFlags,
  useSubscriptionPlan,
  useSubscriptionPlans,
  useUpdateSubscriptionPlan,
} from "../hooks/useSubscriptionPlans";
import type { SubscriptionPlanInput } from "../types/subscription-plan.types";

function featureConfiguration(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function SubscriptionPlansPage() {
  const { isPlatformAdmin } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const plansQuery = useSubscriptionPlans();
  const featureFlagsQuery = useSubscriptionFeatureFlags();
  const planDetailsQuery = useSubscriptionPlan(editingPlanId);
  const createPlan = useCreateSubscriptionPlan();
  const updatePlan = useUpdateSubscriptionPlan();
  const replaceFeatures = useReplaceSubscriptionPlanFeatures();

  // edited by wali: Open the create-plan dialog directly from the Platform Admin quick-create menu.
  useEffect(() => {
    if (!isPlatformAdmin || searchParams.get("create") !== "1") return;
    setEditingPlanId(null);
    setDialogOpen(true);
    const cleanParams = new URLSearchParams(searchParams.toString());
    cleanParams.delete("create");
    setSearchParams(cleanParams, { replace: true });
  }, [isPlatformAdmin, searchParams, setSearchParams]);

  const visiblePlans = useMemo(() => {
    const term = search.trim().toLowerCase();
    const plans = plansQuery.data?.plans ?? [];
    return term
      ? plans.filter((plan) => [plan.planName, plan.planCode, plan.description ?? ""].some((value) => value.toLowerCase().includes(term)))
      : plans;
  }, [plansQuery.data?.plans, search]);

  const isSaving = createPlan.isPending || updatePlan.isPending || replaceFeatures.isPending;

  if (!isPlatformAdmin) {
    return <section className="subscription-admin page-stack"><div className="subscription-admin__alert"><AlertTriangle size={17} /> Only a Platform Administrator can manage subscription plans.</div></section>;
  }

  const plansError = plansQuery.isError ? normalizeApiError(plansQuery.error) : null;
  const flagsError = featureFlagsQuery.isError ? normalizeApiError(featureFlagsQuery.error) : null;
  const detailError = planDetailsQuery.isError ? normalizeApiError(planDetailsQuery.error) : null;

  function openCreate() {
    setEditingPlanId(null);
    setDialogOpen(true);
  }

  function openEdit(planId: string) {
    setEditingPlanId(planId);
    setDialogOpen(true);
  }

  function closeDialog() {
    if (isSaving) return;
    setDialogOpen(false);
    setEditingPlanId(null);
  }

  async function savePlan(planId: string | null, input: SubscriptionPlanInput, enabledFeatureCodes: string[]) {
    const saved = planId
      ? await updatePlan.mutateAsync({ planId, input })
      : await createPlan.mutateAsync(input);

    // edited by wali: Preserve any saved feature configuration while replacing plan entitlements.
    const currentFeatureSettings = new Map(
      (planDetailsQuery.data?.features ?? []).map((feature) => [
        feature.featureCode,
        feature.configuration,
      ]),
    );
    if (!planId) setEditingPlanId(saved.planId);

    try {
      await replaceFeatures.mutateAsync({
        planId: saved.planId,
        input: {
          features: (featureFlagsQuery.data ?? []).map((flag) => ({
            featureCode: flag.featureCode,
            isEnabled: enabledFeatureCodes.includes(flag.featureCode),
            configuration: featureConfiguration(currentFeatureSettings.get(flag.featureCode)),
          })),
        },
      });
    } catch (error) {
      await plansQuery.refetch();
      if (!planId) {
        setEditingPlanId(saved.planId);
        setDialogOpen(false);
        toast.error(`Plan created, but feature settings failed. Edit the plan to retry: ${normalizeApiError(error).message}`);
        return;
      }
      throw new Error(`Plan details were saved, but feature settings failed: ${normalizeApiError(error).message}`);
    }

    toast.success(planId ? "Subscription plan updated" : "Subscription plan created");
    setDialogOpen(false);
    setEditingPlanId(null);
    await plansQuery.refetch();
  }

  return (
    <section className="subscription-admin page-stack">
      <header className="subscription-admin__header">
        <div>
          <span className="subscription-admin__eyebrow">Platform administration</span>
          <h1>Subscription plans</h1>
          <p>Define the pricing, capacity and features available to companies.</p>
        </div>
        <button type="button" className="subscription-admin__button subscription-admin__button--primary" onClick={openCreate} disabled={featureFlagsQuery.isLoading || Boolean(flagsError)}>
          <Plus size={16} /> Create plan
        </button>
      </header>

      <section className="subscription-admin__surface">
        <div className="subscription-admin__toolbar">
          <label className="subscription-admin__search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search plans by name or code" /></label>
          <span>{plansQuery.data?.pagination.total ?? "?"} plans</span>
          <button type="button" className="subscription-admin__icon-button" onClick={() => void plansQuery.refetch()} title="Refresh plans" aria-label="Refresh plans"><RefreshCw className={plansQuery.isFetching ? "spin" : ""} size={16} /></button>
        </div>
        {plansQuery.isLoading || featureFlagsQuery.isLoading ? (
          <div className="subscription-admin__loading"><LoaderCircle className="spin" size={22} /> Loading subscription plans</div>
        ) : plansError || flagsError ? (
          <div className="subscription-admin__error"><AlertTriangle size={21} /><div><h2>Plans could not be loaded</h2><p>{plansError?.message ?? flagsError?.message}</p></div><button type="button" className="subscription-admin__button subscription-admin__button--quiet" onClick={() => { void plansQuery.refetch(); void featureFlagsQuery.refetch(); }}>Try again</button></div>
        ) : (
          <SubscriptionPlanTable plans={visiblePlans} onEdit={(plan) => openEdit(plan.planId)} />
        )}
      </section>

      <SubscriptionPlanFormDialog
        open={dialogOpen}
        plan={editingPlanId ? planDetailsQuery.data ?? null : null}
        featureFlags={featureFlagsQuery.data ?? []}
        isLoadingPlan={Boolean(editingPlanId) && planDetailsQuery.isLoading}
        isSaving={isSaving}
        error={detailError?.message ?? null}
        onClose={closeDialog}
        onSave={savePlan}
      />
    </section>
  );
}
