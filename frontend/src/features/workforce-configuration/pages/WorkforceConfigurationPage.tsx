import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Hash,
  Network,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck
} from "lucide-react";

import {
  useEffect,
  useState
} from "react";

import {
  useQuery,
  useQueryClient
} from "@tanstack/react-query";

import {
  toast
} from "sonner";

import {
  apiClient
} from "../../../api/api-client";

import {
  normalizeApiError
} from "../../../api/api-error";

import {
  useAuthStore
} from "../../../app/store/auth.store";

import type {
  ApiSuccessResponse
} from "../../../types/api.types";

import {
  getCompanyRequest
} from "../../companies/api/company.api";

import {
  useCompanies
} from "../../companies/hooks/useCompanies";

import type {
  Company
} from "../../companies/types/company.types";

import {
  getEmployeeLookupsRequest
} from "../../employees/api/employee.api";

import { listDepartmentsRequest } from "../../organisation/api/organisation.api";
// edited by wali: Read branch setup from the dedicated Branches feature.
import { listBranchesRequest } from "../../branches/api/branch.api";

// edited by wali: Read designation and position setup counts from their feature APIs.
import { listDesignationsRequest } from "../../designations/api/designation.api";
import { listPositionsRequest } from "../../positions/api/position.api";

import "../workforce-configuration.css";

interface SetupCounts {
  branches: number;
  departments: number;
  designations: number;
  positions: number;
}

async function getSetupCounts(
  companyId: string
): Promise<SetupCounts> {
  const [
    branches,
    departments,
    designations,
    positions
  ] =
    await Promise.all([
      listBranchesRequest({
        page: 1,
        limit: 1,
        companyId,
        sortBy:
          "branch_name",
        sortOrder:
          "ASC"
      }),

      listDepartmentsRequest({
        page: 1,
        limit: 1,
        companyId,
        sortBy:
          "department_name",
        sortOrder:
          "ASC"
      }),

      listDesignationsRequest({
        page: 1,
        limit: 1,
        companyId,
        sortBy:
          "designation_name",
        sortOrder:
          "ASC"
      }),

      listPositionsRequest({
        page: 1,
        limit: 1,
        companyId,
        sortBy:
          "position_title",
        sortOrder:
          "ASC"
      })
    ]);

  return {
    branches:
      branches.pagination.total,

    departments:
      departments.pagination.total,

    designations:
      designations.pagination.total,

    positions:
      positions.pagination.total
  };
}

export function WorkforceConfigurationPage() {
  const authUser =
    useAuthStore(
      (
        state
      ) =>
        state.user
    );

  const queryClient =
    useQueryClient();

  const isPlatformAdmin =
    authUser
      ?.isPlatformAdmin ??
    false;
  // edited by wali: Load the platform company directory only for Platform Admins.
  const companiesQuery =
    useCompanies({
      page: 1,
      limit: 100,
      isActive: true,
      sortBy:
        "display_name",
      sortOrder:
        "ASC"
    }, isPlatformAdmin);

  const [
    platformCompanyId,
    setPlatformCompanyId
  ] =
    useState("");

  const companyId =
    isPlatformAdmin
      ? platformCompanyId
      : (
          authUser
            ?.companyId ??
          ""
        );

  const companyQuery =
    useQuery({
      queryKey: [
        "workforce-configuration",
        "company",
        companyId
      ],

      queryFn: () =>
        getCompanyRequest(
          companyId
        ),

      enabled:
        Boolean(companyId)
    });

  const lookupsQuery =
    useQuery({
      queryKey: [
        "workforce-configuration",
        "employee-lookups"
      ],

      queryFn:
        getEmployeeLookupsRequest,

      enabled:
        Boolean(companyId),

      staleTime:
        600000
    });

  const countsQuery =
    useQuery({
      queryKey: [
        "workforce-configuration",
        "organisation-counts",
        companyId
      ],

      queryFn: () =>
        getSetupCounts(
          companyId
        ),

      enabled:
        Boolean(companyId)
    });

  const [
    prefix,
    setPrefix
  ] =
    useState("");

  const [
    codeLength,
    setCodeLength
  ] =
    useState(5);

  const [
    saving,
    setSaving
  ] =
    useState(false);

  useEffect(
    () => {
      if (
        companyQuery.data
      ) {
        setPrefix(
          companyQuery.data
            .employeeCodePrefix ??
          ""
        );

        setCodeLength(
          companyQuery.data
            .employeeCodeLength
        );
      }
    },
    [
      companyQuery.data
    ]
  );

  async function saveNumbering() {
    if (!companyId) {
      return;
    }

    try {
      setSaving(
        true
      );

      const response =
        await apiClient.patch<
          ApiSuccessResponse<{
            company: Company;
          }>
        >(
          `/companies/${companyId}`,
          {
            employeeCodePrefix:
              prefix.trim() ||
              null,

            employeeCodeLength:
              codeLength
          }
        );

      queryClient.setQueryData(
        [
          "workforce-configuration",
          "company",
          companyId
        ],
        response.data.data.company
      );

      toast.success(
        "Employee numbering updated"
      );
    } catch (error) {
      toast.error(
        normalizeApiError(
          error
        ).message
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  const counts =
    countsQuery.data;

  const setupItems = [
    {
      label:
        "Branches",
      count:
        counts
          ?.branches ??
        0,
      to:
        "/employees/organisation/branches"
    },
    {
      label:
        "Departments",
      count:
        counts
          ?.departments ??
        0,
      to:
        "/employees/organisation/departments"
    },
    {
      label:
        "Designations",
      count:
        counts
          ?.designations ??
        0,
      to:
        "/employees/organisation/designations"
    },
    {
      label:
        "Positions",
      count:
        counts
          ?.positions ??
        0,
      to:
        "/employees/organisation/positions"
    }
  ];

  return (
    <main className="wf-page">
      <section className="wf-page-header">
        <div>
          <span className="wf-eyebrow">
            Workforce foundations
          </span>

          <h1>
            Workforce configuration
          </h1>

          <p>
            Review employee numbering, workforce reference values and organisation readiness.
          </p>
        </div>

        <div className="wf-page-header__actions">
          {isPlatformAdmin ? (
            <select
              className="wf-select"
              value={
                companyId
              }
              onChange={
                (
                  event
                ) =>
                  setPlatformCompanyId(
                    event.target.value
                  )
              }
            >
              <option value="">
                Select company
              </option>

              {(
                companiesQuery.data
                  ?.companies ??
                []
              ).map(
                (
                  company
                ) => (
                  <option
                    key={
                      company.companyId
                    }
                    value={
                      company.companyId
                    }
                  >
                    {
                      company.displayName
                    }
                  </option>
                )
              )}
            </select>
          ) : null}

          <button
            type="button"
            className="wf-secondary-button"
            onClick={
              () => {
                void companyQuery.refetch();
                void lookupsQuery.refetch();
                void countsQuery.refetch();
              }
            }
          >
            <RefreshCw
              size={16}
              className={companyQuery.isFetching || lookupsQuery.isFetching || countsQuery.isFetching ? "spin" : ""}
            />

            Refresh
          </button>
        </div>
      </section>

      {!companyId ? (
        <section className="wf-panel wf-empty-state">
          <Building2
            size={34}
          />

          <h2>
            Select a company
          </h2>

          <p>
            Platform Administrators must select a company before reviewing workforce configuration.
          </p>
        </section>
      ) : (
        <>
          <section className="wf-config-grid">
            <article className="wf-panel wf-config-card">
              <header>
                <div className="wf-config-icon">
                  <Hash
                    size={20}
                  />
                </div>

                <div>
                  <h2>
                    Employee numbering
                  </h2>

                  <p>
                    Configure automatically generated employee codes.
                  </p>
                </div>
              </header>

              {companyQuery.isError ? (
                <p className="wf-error-text">
                  {
                    normalizeApiError(
                      companyQuery.error
                    ).message
                  }
                </p>
              ) : (
                <div className="wf-config-form">
                  <label className="wf-field">
                    <span>
                      Employee code prefix
                    </span>

                    <input
                      value={
                        prefix
                      }
                      maxLength={20}
                      onChange={
                        (
                          event
                        ) =>
                          setPrefix(
                            event.target.value
                              .toUpperCase()
                          )
                      }
                      placeholder="EMP"
                    />
                  </label>

                  <label className="wf-field">
                    <span>
                      Numeric length
                    </span>

                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={
                        codeLength
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setCodeLength(
                            Number(
                              event.target.value
                            )
                          )
                      }
                    />
                  </label>

                  <div className="wf-code-preview">
                    <span>
                      Preview
                    </span>

                    <strong>
                      {
                        prefix ||
                        "EMP"
                      }-
                      {
                        "1".padStart(
                          Math.max(
                            codeLength,
                            1
                          ),
                          "0"
                        )
                      }
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="wf-primary-button"
                    disabled={
                      saving
                    }
                    onClick={
                      () =>
                        void saveNumbering()
                    }
                  >
                    <Save
                      size={17}
                    />

                    {
                      saving
                        ? "Savingâ€¦"
                        : "Save numbering"
                    }
                  </button>
                </div>
              )}
            </article>

            <article className="wf-panel wf-config-card">
              <header>
                <div className="wf-config-icon">
                  <Network
                    size={20}
                  />
                </div>

                <div>
                  <h2>
                    Organisation readiness
                  </h2>

                  <p>
                    Complete these foundations before onboarding employees at scale.
                  </p>
                </div>
              </header>

              <div className="wf-setup-list">
                {setupItems.map(
                  (
                    item
                  ) => (
                    <a
                      key={
                        item.label
                      }
                      href={
                        item.to
                      }
                    >
                      <div>
                        {
                          item.count >
                          0
                            ? (
                                <CheckCircle2
                                  size={18}
                                />
                              )
                            : (
                                <Settings2
                                  size={18}
                                />
                              )
                        }

                        <span>
                          {
                            item.label
                          }
                        </span>
                      </div>

                      <strong>
                        {
                          item.count
                        }
                      </strong>
                    </a>
                  )
                )}
              </div>
            </article>
          </section>

          <section className="wf-config-grid">
            <article className="wf-panel wf-config-card">
              <header>
                <div className="wf-config-icon">
                  <BadgeCheck
                    size={20}
                  />
                </div>

                <div>
                  <h2>
                    Employment types
                  </h2>

                  <p>
                    System employment categories available to employee records.
                  </p>
                </div>
              </header>

              <div className="wf-reference-grid">
                {(
                  lookupsQuery.data
                    ?.employmentTypes ??
                  []
                ).map(
                  (
                    item
                  ) => (
                    <article
                      key={
                        item.employmentTypeId
                      }
                    >
                      <strong>
                        {
                          item.typeName
                        }
                      </strong>

                      <span>
                        {
                          item.typeCode
                        }
                      </span>
                    </article>
                  )
                )}
              </div>

              <p className="wf-config-note">
                These values are currently system-wide. Company-specific employment type customisation would require a future multi-tenant database migration.
              </p>
            </article>

            <article className="wf-panel wf-config-card">
              <header>
                <div className="wf-config-icon">
                  <ShieldCheck
                    size={20}
                  />
                </div>

                <div>
                  <h2>
                    Employee statuses
                  </h2>

                  <p>
                    Statuses determine active employment and reporting behaviour.
                  </p>
                </div>
              </header>

              <div className="wf-reference-grid">
                {(
                  lookupsQuery.data
                    ?.employeeStatuses ??
                  []
                ).map(
                  (
                    item
                  ) => (
                    <article
                      key={
                        item.employeeStatusId
                      }
                    >
                      <strong>
                        {
                          item.statusName
                        }
                      </strong>

                      <span>
                        {
                          item.statusCode
                        } Â· {
                          item.isActiveEmployment
                            ? "Active employment"
                            : "Historical status"
                        }
                      </span>
                    </article>
                  )
                )}
              </div>

              <p className="wf-config-note">
                Statuses remain centrally governed so subscription headcount and reports remain consistent.
              </p>
            </article>
          </section>
        </>
      )}
    </main>
  );
}
