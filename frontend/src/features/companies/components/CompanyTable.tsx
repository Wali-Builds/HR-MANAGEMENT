import {
  ArrowUpRight,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Company } from "../types/company.types";
import { CompanyAvatar } from "./CompanyAvatar";
import { CompanyStatusBadge } from "./CompanyStatusBadge";

interface CompanyTableProps {
  companies: Company[];
  canEdit: boolean;
  canDelete: boolean;
  onOpen: (company: Company) => void;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
}

export function CompanyTable({
  companies,
  canEdit,
  canDelete,
  onOpen,
  onEdit,
  onDelete,
}: CompanyTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!tableRef.current?.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  return (
    <div className="company-table-wrap" ref={tableRef}>
      <table className="company-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Industry</th>
            <th>Location</th>
            <th>Contact</th>
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
                  className="company-table__identity"
                  onClick={() => onOpen(company)}
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
              <td>{company.industry || <span className="company-muted">Not set</span>}</td>
              <td>
                {[company.city, company.province, company.countryCode]
                  .filter(Boolean)
                  .join(", ") || <span className="company-muted">Not set</span>}
              </td>
              <td>
                <div className="company-table__contact">
                  <span>{company.officialEmail || "—"}</span>
                  <small>{company.officialPhone || "—"}</small>
                </div>
              </td>
              <td><CompanyStatusBadge isActive={company.isActive} /></td>
              <td>
                <div className="company-table__actions">
                  <button
                    type="button"
                    className="company-icon-action"
                    onClick={() => onOpen(company)}
                    title="Open company"
                  >
                    <ArrowUpRight size={17} />
                  </button>
                  {(canEdit || canDelete) ? (
                    <div className="company-table__menu-anchor">
                      <button
                        type="button"
                        className="company-icon-action"
                        onClick={() =>
                          setOpenMenuId((id) =>
                            id === company.companyId ? null : company.companyId,
                          )
                        }
                        aria-label="Company actions"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {openMenuId === company.companyId ? (
                        <div className="company-action-menu company-action-menu--table">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                onEdit(company);
                              }}
                            >
                              <Pencil size={15} /> Edit company
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              className="company-action-menu__danger"
                              onClick={() => {
                                setOpenMenuId(null);
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
