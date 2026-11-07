// edited by wali: Manage the subscription plan catalog and persist plan features through the admin APIs.
import { AlertTriangle, CheckCircle2, CircleOff, CreditCard, Filter, LoaderCircle, Plus, RefreshCw, Search, SlidersHorizontal, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import { usePermissions } from "../../../hooks/usePermissions";
import { SubscriptionPlanFormDialog } from "../components/SubscriptionPlanFormDialog";
import { SubscriptionPlanCards } from "../components/SubscriptionPlanCards";
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
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [filtersOpen, setFiltersOpen] = useState(true);
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
    return plans.filter((plan) => {
      const matchesSearch = !term || [plan.planName, plan.planCode, plan.description ?? ""].some((value) => value.toLowerCase().includes(term));
      const matchesStatus = status === "all" || plan.isActive === (status === "active");
      return matchesSearch && matchesStatus;
    });
  }, [plansQuery.data?.plans, search, status]);
  const plans = plansQuery.data?.plans ?? [];
  const activeCount = plans.filter((plan) => plan.isActive).length;
  const inactiveCount = plans.length - activeCount;
  const activeFilterCount = status === "all" ? 0 : 1;

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
    <section className="emp-workspace emp-workspace--access-ui subscription-admin subscription-admin--workforce-ui">
      <header className="emp-control-panel">
        <div className="emp-control-panel__primary">
          <div className="emp-control-panel__identity">
            <span className="emp-control-panel__icon"><CreditCard size={20} /></span>
            <div>
              <span>Platform administration</span>
              <h1>Subscription plans</h1>
              <p>Manage pricing, capacity and features for companies.</p>
            </div>
          </div>
          <div className="emp-control-panel__meta">
            <button type="button" className="emp-primary-action" onClick={openCreate} disabled={featureFlagsQuery.isLoading || Boolean(flagsError)}>
              <Plus size={16} /> Create plan
            </button>
            <span className="emp-record-counter">{plansQuery.data?.pagination.total ?? "?"} plans</span>
            <button type="button" className="emp-icon-button" onClick={() => void plansQuery.refetch()} aria-label="Refresh plans">
              <RefreshCw className={plansQuery.isFetching ? "spin" : ""} size={15} />
            </button>
          </div>
        </div>

        <div className="emp-control-panel__secondary">
          <div className="emp-search-box">
            <Search size={15} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search plans by name, code or description" />
            {search ? <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button> : null}
          </div>
          <div className="emp-toolbar-controls">
            <button type="button" className={`emp-filter-button ${filtersOpen ? "is-active" : ""}`} onClick={() => setFiltersOpen((value) => !value)}>
              <SlidersHorizontal size={15} /> Filters {activeFilterCount > 0 ? <span>{activeFilterCount}</span> : null}
            </button>
            {activeFilterCount > 0 ? <button type="button" className="emp-clear-button" onClick={() => setStatus("all")}>Clear</button> : null}
          </div>
        </div>
      </header>

      <div className={`emp-workspace__body ${filtersOpen ? "has-filters" : ""}`}>
        {filtersOpen ? (
          <aside className="emp-filter-panel" aria-label="Subscription plan filters">
            <div className="emp-filter-panel__heading">
              <span><Filter size={15} /></span>
              <div><strong>Refine plans</strong><small>Filter the subscription catalog</small></div>
            </div>
            <div className="emp-filter-section">
              <label>Plan status</label>
              <div className="emp-filter-segments subscription-plan-status-filter">
                <button type="button" className={status === "all" ? "is-active" : ""} onClick={() => setStatus("all")}><UsersRound size={14} /> All <small>{plans.length}</small></button>
                <button type="button" className={status === "active" ? "is-active" : ""} onClick={() => setStatus("active")}><CheckCircle2 size={14} /> Active <small>{activeCount}</small></button>
                <button type="button" className={status === "inactive" ? "is-active" : ""} onClick={() => setStatus("inactive")}><CircleOff size={14} /> Inactive <small>{inactiveCount}</small></button>
              </div>
            </div>
          </aside>
        ) : null}

        <main className="emp-record-area">
          <div className="emp-record-area__context">
            <div><strong>{visiblePlans.length} plan{visiblePlans.length === 1 ? "" : "s"}</strong><span>{status === "all" ? "All subscription plans" : `${status === "active" ? "Active" : "Inactive"} subscription plans`}</span></div>
            {plansQuery.isFetching && !plansQuery.isLoading ? <span><RefreshCw className="spin" size={13} /> Updating</span> : null}
          </div>
          {plansQuery.isLoading || featureFlagsQuery.isLoading ? (
            <div className="subscription-admin__loading"><LoaderCircle className="spin" size={22} /> Loading subscription plans</div>
          ) : plansError || flagsError ? (
            <div className="subscription-admin__error"><AlertTriangle size={21} /><div><h2>Plans could not be loaded</h2><p>{plansError?.message ?? flagsError?.message}</p></div><button type="button" className="subscription-admin__button subscription-admin__button--quiet" onClick={() => { void plansQuery.refetch(); void featureFlagsQuery.refetch(); }}>Try again</button></div>
          ) : (
            <SubscriptionPlanCards
              plans={visiblePlans}
              onEdit={(plan) => openEdit(plan.planId)}
              onCreate={openCreate}
              hasFilters={Boolean(search.trim()) || status !== "all"}
              onClearFilters={() => { setSearch(""); setStatus("all"); }}
            />
          )}
        </main>
      </div>

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
