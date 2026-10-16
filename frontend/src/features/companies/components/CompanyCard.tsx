import {
  ArrowUpRight,
  Globe2,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Company } from "../types/company.types";
import { CompanyAvatar } from "./CompanyAvatar";
import { CompanyStatusBadge } from "./CompanyStatusBadge";

interface CompanyCardProps {
  company: Company;
  canEdit: boolean;
  canDelete: boolean;
  onOpen: (company: Company) => void;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
}

export function CompanyCard({
  company,
  canEdit,
  canDelete,
  onOpen,
  onEdit,
  onDelete,
}: CompanyCardProps) {
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
    <article className="company-card" onDoubleClick={() => onOpen(company)}>
      <div className="company-card__accent" />
      <header className="company-card__header">
        <CompanyAvatar
          name={company.displayName}
          logoPath={company.logoPath}
          size="large"
        />
        <div className="company-card__actions" ref={menuRef}>
          <CompanyStatusBadge isActive={company.isActive} />
          {(canEdit || canDelete) ? (
            <button
              type="button"
              className="company-icon-action"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Company actions"
            >
              <MoreHorizontal size={18} />
            </button>
          ) : null}
          {menuOpen ? (
            <div className="company-action-menu">
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
              {canDelete ? (
                <button
                  type="button"
                  className="company-action-menu__danger"
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
        className="company-card__body"
        onClick={() => onOpen(company)}
      >
        <span className="company-card__code">{company.companyCode}</span>
        <h2>{company.displayName}</h2>
        <p>{company.legalName}</p>
      </button>

      <div className="company-card__meta">
        <span>
          <MapPin size={15} />
          {[company.city, company.countryCode].filter(Boolean).join(", ") || "Location not set"}
        </span>
        <span>
          <Mail size={15} />
          {company.officialEmail || "Email not set"}
        </span>
        <span>
          <Globe2 size={15} />
          {company.industry || "Industry not set"}
        </span>
      </div>

      <footer className="company-card__footer">
        <div>
          <span>Currency</span>
          <strong>{company.currencyCode}</strong>
        </div>
        <div>
          <span>Timezone</span>
          <strong>{company.timezone}</strong>
        </div>
        <button type="button" onClick={() => onOpen(company)}>
          Open <ArrowUpRight size={16} />
        </button>
      </footer>
    </article>
  );
}
