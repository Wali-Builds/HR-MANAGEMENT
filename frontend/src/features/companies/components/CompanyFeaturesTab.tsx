import {
  AlertTriangle,
  CheckCircle2,
  Layers3,
  LoaderCircle,
  RefreshCw,
  Settings2,
  XCircle,
} from "lucide-react";

import { normalizeApiError } from "../../../api/api-error";
import { useCompanyFeatures } from "../hooks/useCompanySubscription";
import type { EffectiveCompanyFeature } from "../types/company-subscription.types";

function groupFeatures(features: EffectiveCompanyFeature[]) {
  const groups = new Map<string, EffectiveCompanyFeature[]>();

  for (const feature of features) {
    const group = feature.moduleName?.trim() || "General";
    groups.set(group, [...(groups.get(group) ?? []), feature]);
  }

  return Array.from(groups.entries()).sort(([left], [right]) =>
    left.localeCompare(right),
  );
}

function sourceLabel(source: EffectiveCompanyFeature["source"]): string {
  if (source === "COMPANY_OVERRIDE") {
    return "Company override";
  }

  if (source === "PLAN") {
    return "Subscription plan";
  }

  return "System default";
}

export function CompanyFeaturesTab({ companyId }: { companyId: string }) {
  const featuresQuery = useCompanyFeatures(companyId);

  if (featuresQuery.isLoading) {
    return (
      <div className="org-tab-loading">
        <LoaderCircle className="spin" size={24} />
        <span>Loading enabled modules…</span>
      </div>
    );
  }

  if (featuresQuery.isError) {
    const error = normalizeApiError(featuresQuery.error);

    return (
      <div className="org-tab-error">
        <AlertTriangle size={24} />
        <div>
          <h3>Module entitlements could not be loaded</h3>
          <p>{error.message}</p>
          <button
            type="button"
            className="org-secondary-action"
            onClick={() => void featuresQuery.refetch()}
          >
            <RefreshCw className={featuresQuery.isFetching ? "spin" : ""} size={15} /> Try again
          </button>
        </div>
      </div>
    );
  }

  const features = featuresQuery.data ?? [];
  const enabledCount = features.filter((feature) => feature.isEnabled).length;
  const groups = groupFeatures(features);

  return (
    <div className="org-feature-workspace">
      <header className="org-feature-summary">
        <div>
          <span className="org-feature-summary__icon"><Layers3 size={22} /></span>
          <div>
            <span className="org-section-kicker">Effective tenant access</span>
            <h3>Modules and capabilities</h3>
            <p>
              Final access is resolved from the subscription plan, company
              overrides and safe system defaults.
            </p>
          </div>
        </div>
        <div className="org-feature-summary__counts">
          <strong>{enabledCount}</strong>
          <span>enabled of {features.length}</span>
        </div>
      </header>

      {groups.length === 0 ? (
        <section className="org-onboarding-state org-onboarding-state--compact">
          <Settings2 size={26} />
          <h3>No feature flags are configured</h3>
          <p>Create system feature flags and map them to subscription plans.</p>
        </section>
      ) : (
        <div className="org-feature-groups">
          {groups.map(([moduleName, moduleFeatures]) => (
            <section className="org-feature-group" key={moduleName}>
              <header>
                <div>
                  <h3>{moduleName}</h3>
                  <p>
                    {moduleFeatures.filter((feature) => feature.isEnabled).length}
                    {" enabled of "}
                    {moduleFeatures.length}
                  </p>
                </div>
              </header>

              <div className="org-feature-list">
                {moduleFeatures.map((feature) => (
                  <article
                    className={[
                      "org-feature-item",
                      feature.isEnabled ? "is-enabled" : "is-disabled",
                    ].join(" ")}
                    key={feature.featureFlagId}
                  >
                    <span className="org-feature-item__state">
                      {feature.isEnabled ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <XCircle size={17} />
                      )}
                    </span>
                    <div>
                      <strong>{feature.featureName}</strong>
                      <small>{feature.featureCode}</small>
                      <p>{feature.description || "No description provided."}</p>
                    </div>
                    <span
                      className={`org-feature-source org-feature-source--${feature.source.toLowerCase()}`}
                    >
                      {sourceLabel(feature.source)}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
