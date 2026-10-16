import {
  ArrowUpRight,
  CircleOff,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Company } from "../types/company.types";
import { CompanyAvatar } from "./CompanyAvatar";
import { CompanyStatusBadge } from "./CompanyStatusBadge";

interface CompanyListViewProps {
  companies: Company[];
  canEdit: boolean;
  canDelete: boolean;
  onOpen: (company: Company) => void;
  onEdit: (company: Company) => void;
  onDeactivate: (company: Company) => void;
  onDelete: (company: Company) => void;
}

// edited by wali: Deleted records stay visible but cannot open or expose live-company actions.
export function CompanyListView({
  companies,
  canEdit,
  canDelete,
  onOpen,
  onEdit,
  onDeactivate,
  onDelete,
}: CompanyListViewProps) {
  const [menuCompanyId, setMenuCompanyId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setMenuCompanyId(null);
      }
    }

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  return (
    <div className="org-list-wrap" ref={wrapRef}>
      <table className="org-list-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Industry</th>
            <th>Location</th>
            <th>Contact</th>
            <th>Regional settings</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.companyId}>
              <td>
                <button
                  type="button"
                  className="org-list-table__identity"
                  onClick={() => onOpen(company)}
                  disabled={Boolean(company.deletedAt)}
                >
                  <CompanyAvatar
                    name={company.displayName}
                    logoPath={company.logoPath}
                    size="small"
                  />
                  <span>
                    <strong>{company.displayName}</strong>
                    <small>{company.companyCode} · {company.legalName}</small>
                  </span>
                </button>
              </td>
              <td>{company.industry || <span className="org-muted">Not set</span>}</td>
              <td>
                {[company.city, company.province, company.countryCode]
                  .filter(Boolean)
                  .join(", ") || <span className="org-muted">Not set</span>}
              </td>
              <td>
                <span className="org-table-stack">
                  <strong>{company.officialEmail || "—"}</strong>
                  <small>{company.officialPhone || "—"}</small>
                </span>
              </td>
              <td>
                <span className="org-table-stack">
                  <strong>{company.currencyCode}</strong>
                  <small>{company.timezone}</small>
                </span>
              </td>
              <td><CompanyStatusBadge isActive={company.isActive} isDeleted={Boolean(company.deletedAt)} /></td>
              <td>
                <div className="org-row-actions">
                  <button
                    type="button"
                    className="org-icon-button org-icon-button--plain"
                    onClick={() => onOpen(company)}
                    disabled={Boolean(company.deletedAt)}
                    title="Open company"
                  >
                    <ArrowUpRight size={16} />
                  </button>

                  {!company.deletedAt && (canEdit || canDelete) ? (
                    <div className="org-action-anchor">
                      <button
                        type="button"
                        className="org-icon-button org-icon-button--plain"
                        onClick={() =>
                          setMenuCompanyId((current) =>
                            current === company.companyId ? null : company.companyId,
                          )
                        }
                        aria-label="Company actions"
                      >
                        <MoreHorizontal size={17} />
                      </button>

                      {menuCompanyId === company.companyId ? (
                        <div className="org-action-menu org-action-menu--table">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuCompanyId(null);
                                onEdit(company);
                              }}
                            >
                              <Pencil size={15} /> Edit company
                            </button>
                          ) : null}
                          {canEdit && company.isActive ? (
                            <button
                              type="button"
                              className="is-danger"
                              onClick={() => {
                                setMenuCompanyId(null);
                                onDeactivate(company);
                              }}
                            >
                              <CircleOff size={15} /> Deactivate company
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              className="is-danger"
                              onClick={() => {
                                setMenuCompanyId(null);
                                onDelete(company);
                              }}
                            >
                              <Trash2 size={15} /> Delete company
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
