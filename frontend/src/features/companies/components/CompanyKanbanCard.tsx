import {
  ArrowUpRight,
  CircleOff,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Company } from "../types/company.types";
import { CompanyAvatar } from "./CompanyAvatar";
import { CompanyStatusBadge } from "./CompanyStatusBadge";

interface CompanyKanbanCardProps {
  company: Company;
  canEdit: boolean;
  canDelete: boolean;
  onOpen: (company: Company) => void;
  onEdit: (company: Company) => void;
  onDeactivate: (company: Company) => void;
  onDelete: (company: Company) => void;
}

// edited by wali: Deleted records stay visible but cannot open or expose live-company actions.
export function CompanyKanbanCard({
  company,
  canEdit,
  canDelete,
  onOpen,
  onEdit,
  onDeactivate,
  onDelete,
}: CompanyKanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  return (
    <article className="org-kanban-card">
      <header className="org-kanban-card__header">
        <button
          type="button"
          className="org-kanban-card__identity"
          onClick={() => onOpen(company)}
          disabled={Boolean(company.deletedAt)}
        >
          <CompanyAvatar
            name={company.displayName}
            logoPath={company.logoPath}
            size="medium"
          />
          <span>
            <strong>{company.displayName}</strong>
            <small>{company.companyCode}</small>
          </span>
        </button>

        <div className="org-row-actions" ref={menuRef}>
          <CompanyStatusBadge isActive={company.isActive} isDeleted={Boolean(company.deletedAt)} />
          {!company.deletedAt && (canEdit || canDelete) ? (
            <button
              type="button"
              className="org-icon-button org-icon-button--plain"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label="Company actions"
            >
              <MoreHorizontal size={18} />
            </button>
          ) : null}

          {menuOpen ? (
            <div className="org-action-menu">
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
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
                    setMenuOpen(false);
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
                    setMenuOpen(false);
                    onDelete(company);
                  }}
                >
                  <Trash2 size={15} /> Delete company
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <button
        type="button"
        className="org-kanban-card__content"
        onClick={() => onOpen(company)}
        disabled={Boolean(company.deletedAt)}
      >
        <span className="org-kanban-card__legal-name">{company.legalName}</span>
        <span><MapPin size={14} /> {[company.city, company.countryCode].filter(Boolean).join(", ") || "Location not configured"}</span>
        <span><Mail size={14} /> {company.officialEmail || "Email not configured"}</span>
        <span><Phone size={14} /> {company.officialPhone || "Phone not configured"}</span>
      </button>

      <footer className="org-kanban-card__footer">
        <div>
          <span>Industry</span>
          <strong>{company.industry || "Not specified"}</strong>
        </div>
        <div>
          <span>Currency</span>
          <strong>{company.currencyCode}</strong>
        </div>
        {!company.deletedAt ? (
          <button type="button" onClick={() => onOpen(company)}>
            Open <ArrowUpRight size={15} />
          </button>
        ) : <span className="org-muted">Deleted record</span>}
      </footer>
    </article>
  );
}
