import {
  Check,
  Copy,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UsersRound,
  UserX,
  X
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import {
  toast
} from "sonner";

import {
  normalizeApiError
} from "../../../api/api-error";

import {
  useAuthStore
} from "../../../app/store/auth.store";

import {
  useCompanies
} from "../../companies/hooks/useCompanies";
import { EmployeeMenuSelect } from "../../employees/components/EmployeeMenuSelect";

import {
  useAccessLookups,
  useAccessUsers,
  useCreateAccessUser,
  useRemoveAccessUser,
  useReplaceAccessRoles,
  useResetAccessPassword,
  useUpdateAccessUser
} from "../hooks/useWorkforceAccess";

import type {
  AccessLookups,
  AccessRoleInput,
  AccessUser,
  CreateAccessUserInput
} from "../types/workforce-access.types";

import "../workforce-access.css";
import { OrganisationDialogMotionProvider, useOrganisationDialogAnimation, useRequiredOrganisationDialogMotion } from "../../organisation/components/OrganisationDialogMotion";

type DialogState =
  | {
      type: "create";
    }
  | {
      type: "roles";
      user: AccessUser;
    }
  | {
      type: "password";
      user: AccessUser;
    }
  | null;

function generatePassword(): string {
  const upper =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";

  const lower =
    "abcdefghijkmnopqrstuvwxyz";

  const digits =
    "23456789";

  const symbols =
    "!@#$%^&*";

  const all =
    upper +
    lower +
    digits +
    symbols;

  const values =
    new Uint32Array(16);

  crypto.getRandomValues(
    values
  );

  const randomCharacter =
    (
      characters: string,
      index: number
    ) =>
      characters[
        values[index]! %
        characters.length
      ]!;

  return [
    randomCharacter(
      upper,
      0
    ),
    randomCharacter(
      lower,
      1
    ),
    randomCharacter(
      digits,
      2
    ),
    randomCharacter(
      symbols,
      3
    ),
    ...Array.from(
      {
        length: 10
      },
      (
        _item,
        index
      ) =>
        randomCharacter(
          all,
          index + 4
        )
    )
  ].join("");
}

function formatDateTime(
  value: string | null
): string {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short"
    }
  ).format(
    new Date(value)
  );
}

function isLocked(
  user: AccessUser
): boolean {
  return Boolean(
    user.lockedUntil &&
    new Date(
      user.lockedUntil
    ).getTime() >
      Date.now()
  );
}

function Modal({
  title,
  subtitle,
  children,
  onClose
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  // edited by wali: Animate access dialogs from the action that opens them.
  const animation = useOrganisationDialogAnimation(true);
  return (
    <div
      className={`wf-modal-backdrop ${animation.backdropMotionClassName}`}
      role="presentation"
      onMouseDown={
        (
          event
        ) => {
          if (!animation.closing &&
            event.target ===
            event.currentTarget
          ) {
            onClose();
          }
        }
      }
    >
      <section
        ref={animation.dialogRef}
        className={`wf-modal ${animation.dialogMotionClassName}`}
        role="dialog"
        aria-modal="true"
      >
        <header className="wf-modal__header">
          <div>
            <span className="wf-eyebrow">
              Employee access
            </span>

            <h2>
              {title}
            </h2>

            <p>
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            className="wf-icon-button"
            onClick={
              onClose
            }
            aria-label="Close"
          >
            <X
              size={18}
            />
          </button>
        </header>

        {children}
      </section>
    </div>
  );
}

function AccountStatus({
  user
}: {
  user: AccessUser;
}) {
  if (
    isLocked(user)
  ) {
    return (
      <span className="wf-badge wf-badge--danger">
        Locked
      </span>
    );
  }

  if (!user.isActive) {
    return (
      <span className="wf-badge">
        Inactive
      </span>
    );
  }

  if (
    user.mustChangePassword
  ) {
    return (
      <span className="wf-badge wf-badge--warning">
        Password change
      </span>
    );
  }

  return (
    <span className="wf-badge wf-badge--success">
      Active
    </span>
  );
}

function WorkforceAccessPageContent() {
  const dialogMotion = useRequiredOrganisationDialogMotion();
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

  const companyId =
    isPlatformAdmin
      ? platformCompanyId
      : (
          authUser
            ?.companyId ??
          ""
        );

  const [
    search,
    setSearch
  ] =
    useState("");

  const [
    status,
    setStatus
  ] =
    useState<
      "ALL" |
      "ACTIVE" |
      "INACTIVE" |
      "LOCKED"
    >(
      "ALL"
    );

  const [
    page,
    setPage
  ] =
    useState(1);

  const [
    dialog,
    setDialog
  ] =
    useState<
      DialogState
    >(
      null
    );

  // edited by wali: Use the shared close timing for workforce access dialogs.
  function closeDialog() { dialogMotion.close(() => setDialog(null)); }

  const usersQuery =
    useAccessUsers({
      page,
      limit: 20,
      sortBy:
        "updated_at",
      sortOrder:
        "DESC",

      ...(companyId
        ? {
            companyId
          }
        : {}),

      ...(search.trim()
        ? {
            search:
              search.trim()
          }
        : {}),

      ...(status ===
      "ACTIVE"
        ? {
            isActive: true
          }
        : {}),

      ...(status ===
      "INACTIVE"
        ? {
            isActive: false
          }
        : {}),

      ...(status ===
      "LOCKED"
        ? {
            isLocked: true
          }
        : {})
    },
    Boolean(companyId)
  );

  const lookupsQuery =
    useAccessLookups(
      companyId ||
      undefined
    );

  const createMutation =
    useCreateAccessUser();

  const updateMutation =
    useUpdateAccessUser();

  const rolesMutation =
    useReplaceAccessRoles();

  const passwordMutation =
    useResetAccessPassword();

  const removeMutation =
    useRemoveAccessUser();

  const users =
    usersQuery.data
      ?.users ??
    [];

  const stats =
    useMemo(
      () => ({
        total:
          usersQuery.data
            ?.pagination.total ??
          0,

        activeOnPage:
          users.filter(
            (
              user
            ) =>
              user.isActive
          ).length,

        lockedOnPage:
          users.filter(
            isLocked
          ).length,

        availableEmployees:
          lookupsQuery.data
            ?.employees.length ??
          0
      }),
      [
        users,
        usersQuery.data,
        lookupsQuery.data
      ]
    );

  async function updateUser(
    user: AccessUser,
    input:
      Parameters<
        typeof updateMutation.mutateAsync
      >[0]["input"],
    message: string
  ) {
    try {
      await updateMutation.mutateAsync({
        userId:
          user.userId,

        input
      });

      toast.success(
        message
      );
    } catch (error) {
      toast.error(
        normalizeApiError(
          error
        ).message
      );
    }
  }

  async function removeUser(
    user: AccessUser
  ) {
    if (
      !window.confirm(
        `Remove login access for ${user.username}?`
      )
    ) {
      return;
    }

    try {
      await removeMutation.mutateAsync(
        user.userId
      );

      toast.success(
        "Employee access removed"
      );
    } catch (error) {
      toast.error(
        normalizeApiError(
          error
        ).message
      );
    }
  }

  return (
    <main className="wf-page wf-access-page">
      <section className="wf-page-header wf-access-hero">
        <div className="wf-access-hero__identity">
          <span className="wf-access-hero__title-icon"><ShieldCheck size={19} /></span>
          <div className="wf-access-hero__copy">
            <span className="wf-eyebrow">Workforce administration</span>
            <h1>Employee access</h1>
            <p>Create individual login accounts, assign scoped roles and manage account security.</p>
          </div>
        </div>

        <div className="wf-access-hero__actions">
          {isPlatformAdmin ? (
            <EmployeeMenuSelect className="wf-select" value={companyId} placeholder="Select company" options={(companiesQuery.data?.companies ?? []).map((company) => ({ value: company.companyId, label: company.displayName }))} onChange={(value) => { setPlatformCompanyId(value); setPage(1); }} />
          ) : null}
          <button
            type="button"
            className="wf-primary-button wf-access-hero__create-button"
            disabled={!companyId}
            onClick={(event) => { dialogMotion.capture(event); setDialog({ type: "create" }); }}
          >
            <UserPlus size={17} />
            Create access
          </button>
        </div>
      </section>

      <section className="wf-stat-grid">
        <article className="wf-stat-card">
          <UsersRound
            size={20}
          />

          <div>
            <strong>
              {stats.total}
            </strong>

            <span>
              User accounts
            </span>
          </div>
        </article>

        <article className="wf-stat-card">
          <UserCheck
            size={20}
          />

          <div>
            <strong>
              {
                stats.activeOnPage
              }
            </strong>

            <span>
              Active on page
            </span>
          </div>
        </article>

        <article className="wf-stat-card">
          <LockKeyhole
            size={20}
          />

          <div>
            <strong>
              {
                stats.lockedOnPage
              }
            </strong>

            <span>
              Locked on page
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
                stats.availableEmployees
              }
            </strong>

            <span>
              Employees without access
            </span>
          </div>
        </article>
      </section>

      <section className="wf-panel">
        <header className="wf-toolbar">
          <label className="wf-search">
            <Search
              size={17}
            />

            <input
              value={
                search
              }
              onChange={
                (
                  event
                ) => {
                  setSearch(
                    event.target.value
                  );

                  setPage(1);
                }
              }
              placeholder="Search username, employee, email or company"
            />
          </label>

          <EmployeeMenuSelect className="wf-select" value={status} placeholder="Account status" options={[{ value: "ALL", label: "All accounts" }, { value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }, { value: "LOCKED", label: "Locked" }]} onChange={(value) => { setStatus(value as typeof status); setPage(1); }} />

          <button
            type="button"
            className="wf-secondary-button"
            onClick={
              () =>
                void usersQuery.refetch()
            }
          >
            <RefreshCw
              size={16}
            />

            Refresh
          </button>
        </header>

        {!companyId ? (
          <div className="wf-empty-state">
            <ShieldCheck
              size={32}
            />

            <h2>
              Select a company
            </h2>

            <p>
              Platform Administrators must choose a company before managing its employee access.
            </p>
          </div>
        ) : usersQuery.isLoading ? (
          <div className="wf-empty-state">
            <RefreshCw
              size={28}
              className="is-spinning"
            />

            <h2>
              Loading employee access
            </h2>
          </div>
        ) : usersQuery.isError ? (
          <div className="wf-empty-state wf-empty-state--error">
            <UserX
              size={32}
            />

            <h2>
              Employee access could not be loaded
            </h2>

            <p>
              {
                normalizeApiError(
                  usersQuery.error
                ).message
              }
            </p>
          </div>
        ) : users.length ===
        0 ? (
          <div className="wf-empty-state">
            <UsersRound
              size={32}
            />

            <h2>
              No access accounts found
            </h2>

            <p>
              Create a login account or adjust the filters.
            </p>
          </div>
        ) : (
          <div className="wf-table-wrap">
            <table className="wf-table">
              <thead>
                <tr>
                  <th>
                    Employee
                  </th>

                  <th>
                    Account
                  </th>

                  <th>
                    Roles
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Last login
                  </th>

                  <th className="wf-table__actions">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.map(
                  (
                    user
                  ) => (
                    <tr
                      key={
                        user.userId
                      }
                    >
                      <td>
                        <div className="wf-person-cell">
                          <span className="wf-avatar">
                            {
                              (
                                user.employeeName ??
                                user.username
                              )
                                .slice(
                                  0,
                                  2
                                )
                                .toUpperCase()
                            }
                          </span>

                          <div>
                            <strong>
                              {
                                user.employeeName ??
                                "Administrative account"
                              }
                            </strong>

                            <span>
                              {
                                user.employeeCode ??
                                user.companyName ??
                                "Global"
                              }
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong>
                          {
                            user.username
                          }
                        </strong>

                        <span className="wf-subtext">
                          {
                            user.email ??
                            "No email"
                          }
                        </span>
                      </td>

                      <td>
                        <div className="wf-chip-row">
                          {user.roles
                            .slice(
                              0,
                              3
                            )
                            .map(
                              (
                                role
                              ) => (
                                <span
                                  key={
                                    role.userRoleId
                                  }
                                  className="wf-chip"
                                >
                                  {
                                    role.roleName
                                  }
                                </span>
                              )
                            )}

                          {user.roles.length >
                          3 ? (
                            <span className="wf-chip">
                              +
                              {
                                user.roles.length -
                                3
                              }
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <AccountStatus
                          user={
                            user
                          }
                        />
                      </td>

                      <td>
                        {
                          formatDateTime(
                            user.lastLoginAt
                          )
                        }
                      </td>

                      <td className="wf-table__actions">
                        <div className="wf-action-row">
                          <button
                            type="button"
                            className="wf-icon-button"
                            title="Manage role"
                            onClick={
                              (event) => {
                                dialogMotion.capture(event);
                                setDialog({
                                  type:
                                    "roles",

                                  user
                                });
                              }
                            }
                          >
                            <ShieldCheck
                              size={17}
                            />
                          </button>

                          <button
                            type="button"
                            className="wf-icon-button"
                            title="Reset password"
                            onClick={
                              (event) => {
                                dialogMotion.capture(event);
                                setDialog({
                                  type:
                                    "password",

                                  user
                                });
                              }
                            }
                          >
                            <KeyRound
                              size={17}
                            />
                          </button>

                          {isLocked(
                            user
                          ) ? (
                            <button
                              type="button"
                              className="wf-icon-button"
                              title="Unlock"
                              onClick={
                                () =>
                                  void updateUser(
                                    user,
                                    {
                                      clearAccountLock:
                                        true
                                    },
                                    "Account unlocked"
                                  )
                              }
                            >
                              <LockKeyhole
                                size={17}
                              />
                            </button>
                          ) : null}

                          {/* edited by wali: Archived employee accounts cannot be reactivated. */}
                          <button
                            type="button"
                            className="wf-icon-button"
                            disabled={
                              !user.isActive &&
                              user.isEmployeeArchived
                            }
                            title={
                              !user.isActive &&
                              user.isEmployeeArchived
                                ? "Archived employee account cannot be activated"
                                : user.isActive
                                  ? "Deactivate"
                                  : "Activate"
                            }
                            onClick={
                              () =>
                                void updateUser(
                                  user,
                                  {
                                    isActive:
                                      !user.isActive
                                  },
                                  user.isActive
                                    ? "Account deactivated"
                                    : "Account activated"
                                )
                            }
                          >
                            {
                              user.isActive
                                ? (
                                    <UserX
                                      size={17}
                                    />
                                  )
                                : (
                                    <UserCheck
                                      size={17}
                                    />
                                  )
                            }
                          </button>

                          <button
                            type="button"
                            className="wf-icon-button wf-icon-button--danger"
                            title="Remove access"
                            onClick={
                              () =>
                                void removeUser(
                                  user
                                )
                            }
                          >
                            <X
                              size={17}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        <footer className="wf-pager">
          <span>
            Page {
              usersQuery.data
                ?.pagination.page ??
              page
            } of {
              Math.max(
                usersQuery.data
                  ?.pagination.totalPages ??
                1,
                1
              )
            }
          </span>

          <div>
            <button
              type="button"
              className="wf-secondary-button"
              disabled={
                page <= 1
              }
              onClick={
                () =>
                  setPage(
                    (
                      value
                    ) =>
                      Math.max(
                        value -
                        1,
                        1
                      )
                  )
              }
            >
              Previous
            </button>

            <button
              type="button"
              className="wf-secondary-button"
              disabled={
                page >=
                (
                  usersQuery.data
                    ?.pagination.totalPages ??
                  1
                )
              }
              onClick={
                () =>
                  setPage(
                    (
                      value
                    ) =>
                      value +
                      1
                  )
              }
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      {dialog?.type ===
      "create" ? (
        <CreateAccessDialog
          companyId={
            companyId
          }
          lookups={
            lookupsQuery.data
          }
          isLoading={
            createMutation.isPending
          }
          onClose={closeDialog}
          onSubmit={
            async (
              input
            ) => {
              try {
                await createMutation.mutateAsync(
                  input
                );

                toast.success(
                  "Employee access created"
                );

                closeDialog();
              } catch (error) {
                toast.error(
                  normalizeApiError(
                    error
                  ).message
                );
              }
            }
          }
        />
      ) : null}

      {dialog?.type ===
      "roles" ? (
        <RoleDialog
          companyId={
            companyId
          }
          user={
            dialog.user
          }
          lookups={
            lookupsQuery.data
          }
          isLoading={
            rolesMutation.isPending
          }
          onClose={closeDialog}
          onSubmit={
            async (
              roles
            ) => {
              try {
                await rolesMutation.mutateAsync({
                  userId:
                    dialog.user.userId,

                  roles
                });

                toast.success(
                  "Role assignment updated"
                );

                closeDialog();
              } catch (error) {
                toast.error(
                  normalizeApiError(
                    error
                  ).message
                );
              }
            }
          }
        />
      ) : null}

      {dialog?.type ===
      "password" ? (
        <PasswordDialog
          user={
            dialog.user
          }
          isLoading={
            passwordMutation.isPending
          }
          onClose={closeDialog}
          onSubmit={
            async (
              password
            ) => {
              try {
                await passwordMutation.mutateAsync({
                  userId:
                    dialog.user.userId,

                  input: {
                    newPassword:
                      password,

                    confirmPassword:
                      password,

                    mustChangePassword:
                      true,

                    revokeAllSessions:
                      true
                  }
                });

                toast.success(
                  "Temporary password set"
                );

                closeDialog();
              } catch (error) {
                toast.error(
                  normalizeApiError(
                    error
                  ).message
                );
              }
            }
          }
        />
      ) : null}
    </main>
  );
}

// edited by wali: Provide shared trigger-origin motion to workforce access forms.
export function WorkforceAccessPage() {
  return <OrganisationDialogMotionProvider><WorkforceAccessPageContent /></OrganisationDialogMotionProvider>;
}

function CreateAccessDialog({
  companyId,
  lookups,
  isLoading,
  onClose,
  onSubmit
}: {
  companyId: string;
  lookups:
    AccessLookups |
    undefined;
  isLoading: boolean;
  onClose: () => void;
  onSubmit:
    (
      input:
        CreateAccessUserInput
    ) => Promise<void>;
}) {
  const [
    employeeId,
    setEmployeeId
  ] =
    useState("");

  const [roleCode, setRoleCode] = useState("");

  // edited by wali: Default employee access to the company's EMPLOYEE role when one exists.
  useEffect(() => {
    const roles = lookups?.roles ?? [];
    if (!roles.length) {
      setRoleCode("");
      return;
    }
    setRoleCode((current) =>
      roles.some((role) => role.roleCode === current)
        ? current
        : roles.find((role) => role.roleCode === "EMPLOYEE")?.roleCode ?? roles[0]!.roleCode,
    );
  }, [lookups?.roles]);

  const [
    username,
    setUsername
  ] =
    useState("");

  const [
    email,
    setEmail
  ] =
    useState("");

  const [
    password,
    setPassword
  ] =
    useState(
      generatePassword()
    );

  function chooseEmployee(
    value: string
  ) {
    setEmployeeId(
      value
    );

    const employee =
      lookups
        ?.employees.find(
          (
            item
          ) =>
            item.employeeId ===
            value
        );

    if (!employee) {
      return;
    }

    setEmail(
      employee.officialEmail ??
      ""
    );

    setUsername(
      (
        employee.officialEmail
          ?.split("@")[0] ??
        employee.employeeCode
      )
        .toLowerCase()
        .replace(
          /[^a-z0-9._-]/g,
          "."
        )
    );
  }

  return (
    <Modal
      title="Create employee access"
      subtitle="Issue a login account linked to an existing employee."
      onClose={
        onClose
      }
    >
      <form
        className="wf-form"
        onSubmit={
          (
            event
          ) => {
            event.preventDefault();

            if (
              !employeeId ||
              !roleCode ||
              !username ||
              password.length <
                12
            ) {
              toast.error(
                "Employee, username and a 12-character password are required"
              );

              return;
            }

            void onSubmit({
              companyId,
              employeeId,
              username,
              email:
                email.trim() ||
                null,

              temporaryPassword:
                password,

              confirmTemporaryPassword:
                password,

              isPlatformAdmin:
                false,

              isActive:
                true,

              isEmailVerified:
                false,

              mustChangePassword:
                true,

              roles: [
                {
                  // edited by wali: Assign the selected company-owned role to the employee login.
                  roleCode,
                  companyId,
                  branchId: null,
                  departmentId: null,

                  expiresAt:
                    null,

                  isActive:
                    true
                }
              ]
            });
          }
        }
      >
        <div className="wf-form-grid">
          <label className="wf-field wf-field--wide">
            <span>
              Employee
            </span>

            <EmployeeMenuSelect value={employeeId} placeholder="Select employee without access" options={(lookups?.employees ?? []).map((employee) => ({ value: employee.employeeId, label: "" + employee.employeeCode + " — " + employee.employeeName }))} onChange={chooseEmployee} />
          </label>

          <label className="wf-field">
            <span>
              Username
            </span>

            <input
              value={
                username
              }
              onChange={
                (
                  event
                ) =>
                  setUsername(
                    event.target.value
                  )
              }
            />
          </label>

          <label className="wf-field">
            <span>
              Email
            </span>

            <input
              type="email"
              value={
                email
              }
              onChange={
                (
                  event
                ) =>
                  setEmail(
                    event.target.value
                  )
              }
            />
          </label>

          <label className="wf-field">
            <span>Role</span>
            <EmployeeMenuSelect value={roleCode} placeholder="Select a company role" options={(lookups?.roles ?? []).map((role) => ({ value: role.roleCode, label: role.roleName }))} onChange={setRoleCode} />
            <small>{lookups?.roles.length ? "The selected role determines this employee's access." : "Create an employee role in Access Control before issuing login access."}</small>
          </label>

          <label className="wf-field wf-field--wide">
            <span>
              Temporary password
            </span>

            <div className="wf-password-row">
              <input
                value={
                  password
                }
                onChange={
                  (
                    event
                  ) =>
                    setPassword(
                      event.target.value
                    )
                }
              />

              <button
                type="button"
                className="wf-secondary-button"
                onClick={
                  () =>
                    setPassword(
                      generatePassword()
                    )
                }
              >
                Generate
              </button>

              <button
                type="button"
                className="wf-icon-button"
                title="Copy password"
                onClick={
                  () => {
                    void navigator.clipboard.writeText(
                      password
                    );

                    toast.success(
                      "Password copied"
                    );
                  }
                }
              >
                <Copy
                  size={17}
                />
              </button>
            </div>

            <small>
              The employee will change this password at first login.
            </small>
          </label>
        </div>

        <footer className="wf-modal__footer">
          <button
            type="button"
            className="wf-secondary-button"
            onClick={
              onClose
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="wf-primary-button"
            disabled={isLoading || !roleCode}
          >
            <Check
              size={17}
            />

            {
              isLoading
                ? "Creating…"
                : "Create access"
            }
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function RoleDialog({
  companyId,
  user,
  lookups,
  isLoading,
  onClose,
  onSubmit
}: {
  companyId: string;
  user: AccessUser;
  lookups:
    AccessLookups |
    undefined;
  isLoading: boolean;
  onClose: () => void;
  onSubmit:
    (
      roles:
        AccessRoleInput[]
    ) => Promise<void>;
}) {
  const primaryRole =
    user.roles[0];

  const [
    roleCode,
    setRoleCode
  ] =
    useState(
      primaryRole
        ?.roleCode ??
      "EMPLOYEE"
    );

  return (
    <Modal
      title={`Role for ${user.username}`}
      subtitle="Assign a role created for this company."
      onClose={
        onClose
      }
    >
      <form
        className="wf-form"
        onSubmit={
          (
            event
          ) => {
            event.preventDefault();

            void onSubmit([
              {
                roleCode,
                companyId,
                branchId: null,
                departmentId: null,

                expiresAt:
                  null,

                isActive:
                  true
              }
            ]);
          }
        }
      >
        {/* edited by wali: Company roles apply across the tenant; branch and department scopes are not requested. */}
        <div className="wf-form-grid">
          <label className="wf-field wf-field--wide">
            <span>
              Role
            </span>

            <EmployeeMenuSelect value={roleCode} placeholder="Select a role" options={(lookups?.roles ?? []).map((role) => ({ value: role.roleCode, label: role.roleName }))} onChange={setRoleCode} />
          </label>
        </div>

        <footer className="wf-modal__footer">
          <button
            type="button"
            className="wf-secondary-button"
            onClick={
              onClose
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="wf-primary-button"
            disabled={
              isLoading
            }
          >
            <ShieldCheck
              size={17}
            />

            Save role
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function PasswordDialog({
  user,
  isLoading,
  onClose,
  onSubmit
}: {
  user: AccessUser;
  isLoading: boolean;
  onClose: () => void;
  onSubmit:
    (
      password: string
    ) => Promise<void>;
}) {
  const [
    password,
    setPassword
  ] =
    useState(
      generatePassword()
    );

  return (
    <Modal
      title={`Reset password for ${user.username}`}
      subtitle="All current sessions will be revoked and the user must change this temporary password."
      onClose={
        onClose
      }
    >
      <form
        className="wf-form"
        onSubmit={
          (
            event
          ) => {
            event.preventDefault();

            if (
              password.length <
              12
            ) {
              toast.error(
                "Password must contain at least 12 characters"
              );

              return;
            }

            void onSubmit(
              password
            );
          }
        }
      >
        <label className="wf-field">
          <span>
            Temporary password
          </span>

          <div className="wf-password-row">
            <input
              value={
                password
              }
              onChange={
                (
                  event
                ) =>
                  setPassword(
                    event.target.value
                  )
              }
            />

            <button
              type="button"
              className="wf-secondary-button"
              onClick={
                () =>
                  setPassword(
                    generatePassword()
                  )
              }
            >
              Generate
            </button>

            <button
              type="button"
              className="wf-icon-button"
              onClick={
                () => {
                  void navigator.clipboard.writeText(
                    password
                  );

                  toast.success(
                    "Password copied"
                  );
                }
              }
            >
              <Copy
                size={17}
              />
            </button>
          </div>
        </label>

        <footer className="wf-modal__footer">
          <button
            type="button"
            className="wf-secondary-button"
            onClick={
              onClose
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="wf-primary-button"
            disabled={
              isLoading
            }
          >
            <KeyRound
              size={17}
            />

            Reset password
          </button>
        </footer>
      </form>
    </Modal>
  );
}
