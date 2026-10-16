import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  FileWarning,
  RefreshCw,
  TrendingUp,
  UserPlus,
  UsersRound
} from "lucide-react";

import {
  useMemo,
  useState
} from "react";

import {
  normalizeApiError
} from "../../../api/api-error";

import {
  useAuthStore
} from "../../../app/store/auth.store";

import {
  useCompanies
} from "../../companies/hooks/useCompanies";

import {
  useWorkforceReport
} from "../hooks/useWorkforceReport";

import type {
  WorkforceDistributionItem
} from "../types/workforce-report.types";

import "../workforce-reports.css";

function formatDate(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle:
        "medium"
    }
  ).format(
    new Date(
      `${value}T00:00:00`
    )
  );
}

function DistributionCard({
  title,
  items
}: {
  title: string;
  items:
    WorkforceDistributionItem[];
}) {
  const maximum =
    Math.max(
      ...items.map(
        (
          item
        ) =>
          item.count
      ),
      1
    );

  return (
    <article className="wf-report-card">
      <header>
        <div>
          <h2>
            {title}
          </h2>

          <span>
            {
              items.reduce(
                (
                  total,
                  item
                ) =>
                  total +
                  item.count,
                0
              )
            } employees
          </span>
        </div>
      </header>

      <div className="wf-distribution-list">
        {items.length ===
        0 ? (
          <p className="wf-muted">
            No data available.
          </p>
        ) : items
          .slice(
            0,
            8
          )
          .map(
            (
              item
            ) => (
              <div
                key={
                  item.key
                }
                className="wf-distribution-item"
              >
                <div>
                  <strong>
                    {
                      item.label
                    }
                  </strong>

                  <span>
                    {
                      item.count
                    } · {
                      item.percentage
                    }%
                  </span>
                </div>

                <div className="wf-bar">
                  <span
                    style={{
                      width:
                        `${
                          (
                            item.count /
                            maximum
                          ) *
                          100
                        }%`
                    }}
                  />
                </div>
              </div>
            )
          )}
      </div>
    </article>
  );
}

export function WorkforceReportsPage() {
  const authUser =
    useAuthStore(
      (
        state
      ) =>
        state.user
    );

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

  const [
    months,
    setMonths
  ] =
    useState(12);

  const [
    upcomingDays,
    setUpcomingDays
  ] =
    useState(30);

  const companyId =
    isPlatformAdmin
      ? platformCompanyId
      : (
          authUser
            ?.companyId ??
          ""
        );

  const reportQuery =
    useWorkforceReport(
      {
        ...(companyId
          ? {
              companyId
            }
          : {}),

        months,
        upcomingDays
      },
      Boolean(companyId)
    );

  const report =
    reportQuery.data;

  const trendMaximum =
    useMemo(
      () =>
        Math.max(
          ...(
            report
              ?.joiningTrend ??
            []
          ).map(
            (
              item
            ) =>
              item.count
          ),
          1
        ),
      [
        report
      ]
    );

  return (
    <main className="wf-page">
      <section className="wf-page-header">
        <div>
          <span className="wf-eyebrow">
            Workforce intelligence
          </span>

          <h1>
            Workforce reports
          </h1>

          <p>
            Monitor headcount, organisation distribution, employee access readiness and upcoming contract events.
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

          <select
            className="wf-select"
            value={
              months
            }
            onChange={
              (
                event
              ) =>
                setMonths(
                  Number(
                    event.target.value
                  )
                )
            }
          >
            <option value={6}>
              6-month trend
            </option>

            <option value={12}>
              12-month trend
            </option>

            <option value={18}>
              18-month trend
            </option>

            <option value={24}>
              24-month trend
            </option>
          </select>

          <select
            className="wf-select"
            value={
              upcomingDays
            }
            onChange={
              (
                event
              ) =>
                setUpcomingDays(
                  Number(
                    event.target.value
                  )
                )
            }
          >
            <option value={30}>
              Next 30 days
            </option>

            <option value={60}>
              Next 60 days
            </option>

            <option value={90}>
              Next 90 days
            </option>
          </select>

          <button
            type="button"
            className="wf-secondary-button"
            onClick={
              () =>
                void reportQuery.refetch()
            }
          >
            <RefreshCw
              size={16}
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
            Platform Administrators must select a company to view workforce reports.
          </p>
        </section>
      ) : reportQuery.isLoading ? (
        <section className="wf-panel wf-empty-state">
          <RefreshCw
            size={30}
            className="is-spinning"
          />

          <h2>
            Preparing workforce report
          </h2>
        </section>
      ) : reportQuery.isError ? (
        <section className="wf-panel wf-empty-state wf-empty-state--error">
          <AlertTriangle
            size={34}
          />

          <h2>
            Workforce report could not be loaded
          </h2>

          <p>
            {
              normalizeApiError(
                reportQuery.error
              ).message
            }
          </p>
        </section>
      ) : report ? (
        <>
          <section className="wf-stat-grid wf-stat-grid--reports">
            <article className="wf-stat-card">
              <UsersRound
                size={20}
              />

              <div>
                <strong>
                  {
                    report.overview.totalEmployees
                  }
                </strong>

                <span>
                  Total employees
                </span>
              </div>
            </article>

            <article className="wf-stat-card">
              <BriefcaseBusiness
                size={20}
              />

              <div>
                <strong>
                  {
                    report.overview.activeEmployees
                  }
                </strong>

                <span>
                  Active employees
                </span>
              </div>
            </article>

            <article className="wf-stat-card">
              <UserPlus
                size={20}
              />

              <div>
                <strong>
                  {
                    report.overview.newHiresThisMonth
                  }
                </strong>

                <span>
                  New this month
                </span>
              </div>
            </article>

            <article className="wf-stat-card">
              <FileWarning
                size={20}
              />

              <div>
                <strong>
                  {
                    report.overview.employeesWithoutAccounts
                  }
                </strong>

                <span>
                  Without access
                </span>
              </div>
            </article>

            <article className="wf-stat-card">
              <CalendarDays
                size={20}
              />

              <div>
                <strong>
                  {
                    report.overview.expiringContracts
                  }
                </strong>

                <span>
                  Contracts expiring
                </span>
              </div>
            </article>

            <article className="wf-stat-card">
              <TrendingUp
                size={20}
              />

              <div>
                <strong>
                  {
                    report.capacity.employeeLimit ===
                    null
                      ? "∞"
                      : report.capacity.remainingEmployees
                  }
                </strong>

                <span>
                  Seats remaining
                </span>
              </div>
            </article>
          </section>

          <section className="wf-report-grid">
            <article className="wf-report-card wf-report-card--wide">
              <header>
                <div>
                  <h2>
                    Joining trend
                  </h2>

                  <span>
                    {
                      report.parameters.months
                    } months
                  </span>
                </div>

                <span className="wf-badge wf-badge--success">
                  {
                    report.company.companyName
                  }
                </span>
              </header>

              <div className="wf-trend-chart">
                {report.joiningTrend.length ===
                0 ? (
                  <p className="wf-muted">
                    No joining activity in this period.
                  </p>
                ) : report.joiningTrend.map(
                  (
                    item
                  ) => (
                    <div
                      key={
                        item.period
                      }
                      className="wf-trend-column"
                    >
                      <span>
                        {
                          item.count
                        }
                      </span>

                      <div>
                        <i
                          style={{
                            height:
                              `${
                                Math.max(
                                  (
                                    item.count /
                                    trendMaximum
                                  ) *
                                  100,
                                  7
                                )
                              }%`
                          }}
                        />
                      </div>

                      <small>
                        {
                          item.label
                        }
                      </small>
                    </div>
                  )
                )}
              </div>
            </article>

            <article className="wf-report-card">
              <header>
                <div>
                  <h2>
                    Subscription capacity
                  </h2>

                  <span>
                    {
                      report.capacity.planName ??
                      "No plan"
                    }
                  </span>
                </div>
              </header>

              <div className="wf-capacity">
                <strong>
                  {
                    report.capacity.usagePercentage ??
                    0
                  }%
                </strong>

                <span>
                  {
                    report.overview.activeEmployees
                  } of {
                    report.capacity.employeeLimit ??
                    "unlimited"
                  } active employee seats
                </span>

                <div className="wf-capacity__track">
                  <i
                    style={{
                      width:
                        `${
                          Math.min(
                            report.capacity.usagePercentage ??
                            0,
                            100
                          )
                        }%`
                    }}
                  />
                </div>
              </div>
            </article>
          </section>

          <section className="wf-report-grid wf-report-grid--three">
            <DistributionCard
              title="By branch"
              items={
                report.distributions.branches
              }
            />

            <DistributionCard
              title="By department"
              items={
                report.distributions.departments
              }
            />

            <DistributionCard
              title="By designation"
              items={
                report.distributions.designations
              }
            />

            <DistributionCard
              title="By employment type"
              items={
                report.distributions.employmentTypes
              }
            />

            <DistributionCard
              title="By employee status"
              items={
                report.distributions.employeeStatuses
              }
            />

            <DistributionCard
              title="By gender"
              items={
                report.distributions.genders
              }
            />
          </section>

          <section className="wf-report-grid">
            <article className="wf-report-card">
              <header>
                <div>
                  <h2>
                    Recent hires
                  </h2>

                  <span>
                    Latest employees
                  </span>
                </div>
              </header>

              <div className="wf-mini-list">
                {report.recentHires.map(
                  (
                    employee
                  ) => (
                    <a
                      key={
                        employee.employeeId
                      }
                      href={
                        `/employees/${employee.employeeId}`
                      }
                    >
                      <div>
                        <strong>
                          {
                            employee.employeeName
                          }
                        </strong>

                        <span>
                          {
                            employee.employeeCode
                          } · {
                            employee.departmentName ??
                            "Unassigned"
                          }
                        </span>
                      </div>

                      <time>
                        {
                          formatDate(
                            employee.joiningDate
                          )
                        }
                      </time>
                    </a>
                  )
                )}
              </div>
            </article>

            <article className="wf-report-card">
              <header>
                <div>
                  <h2>
                    Expiring contracts
                  </h2>

                  <span>
                    Next {
                      report.parameters.upcomingDays
                    } days
                  </span>
                </div>
              </header>

              <div className="wf-mini-list">
                {report.expiringContracts.length ===
                0 ? (
                  <p className="wf-muted">
                    No contracts expire in this period.
                  </p>
                ) : report.expiringContracts.map(
                  (
                    employee
                  ) => (
                    <a
                      key={
                        employee.employeeId
                      }
                      href={
                        `/employees/${employee.employeeId}`
                      }
                    >
                      <div>
                        <strong>
                          {
                            employee.employeeName
                          }
                        </strong>

                        <span>
                          {
                            employee.designationName ??
                            "No designation"
                          }
                        </span>
                      </div>

                      <time>
                        {
                          formatDate(
                            employee.contractEndDate
                          )
                        }
                      </time>
                    </a>
                  )
                )}
              </div>
            </article>
          </section>
        </>
      ) : null}
    </main>
  );
}
