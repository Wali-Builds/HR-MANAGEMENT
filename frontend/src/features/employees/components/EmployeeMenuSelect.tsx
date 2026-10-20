import { Check, ChevronDown, Search } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import "./EmployeeMenuSelect.css";

export interface EmployeeSelectOption {
  value: string;
  label: string;
  // edited by wali: Allow organisation dropdown options to show contextual icons such as Head Office.
  icon?: ReactNode;
}

interface Props {
  value: string;
  options: EmployeeSelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  ariaLabel?: string;
  className?: string;
  allowClear?: boolean;
  allowCustomValue?: boolean;
  customValueMaxLength?: number;
}

export function EmployeeMenuSelect({ value, options, placeholder, onChange, disabled, searchable, searchPlaceholder = "Search options", ariaLabel, className, allowClear = true, allowCustomValue = false, customValueMaxLength }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const selected = options.find((option) => option.value === value) ?? (value ? { value, label: value } : undefined);
  const customValue = query.trim();
  const matchesExistingOption = options.some((option) =>
    option.value.toLocaleLowerCase() === customValue.toLocaleLowerCase()
    || option.label.toLocaleLowerCase() === customValue.toLocaleLowerCase(),
  );
  const canAddCustomValue = allowCustomValue && Boolean(customValue) && !matchesExistingOption;
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const menuOptions = allowClear ? [{ value: "", label: placeholder }, ...options] : options;
    return normalizedQuery
      ? menuOptions.filter((option) => option.value && option.label.toLocaleLowerCase().includes(normalizedQuery))
      : menuOptions;
  }, [allowClear, options, placeholder, query]);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    searchRef.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPosition(null);
      return;
    }
    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) setMenuPosition({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div className={`emp-menu-select${className ? ` ${className}` : ""}${isOpen ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="emp-menu-select__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => { setQuery(""); setIsOpen((current) => !current); }}
      >
        <span className="emp-menu-select__trigger-label">
          <span className={selected ? "" : "is-placeholder"}>{selected?.label ?? placeholder}</span>
          {/* edited by wali: Place contextual markers after the selected option name. */}
          {selected?.icon}
        </span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {isOpen && menuPosition ? createPortal(
        <div
          className="emp-menu-select__menu"
          ref={menuRef}
          style={{ position: "fixed", inset: "auto", top: menuPosition.top, left: menuPosition.left, width: menuPosition.width, zIndex: 2000 }}
        >
          {searchable || allowCustomValue ? <div className="emp-menu-select__search"><Search size={14} /><input ref={searchRef} value={query} maxLength={customValueMaxLength} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} /></div> : null}
          <div className="emp-menu-select__options" role="listbox">
            {visibleOptions.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={value === option.value}
                className="emp-menu-select__option"
                key={option.value}
                onClick={() => { onChange(option.value); setIsOpen(false); setQuery(""); }}
              >
                <span className="emp-menu-select__option-label">{option.label}{option.icon}</span>{value === option.value ? <Check size={15} /> : null}
              </button>
            ))}
            {canAddCustomValue ? (
              <button
                type="button"
                role="option"
                aria-selected={value === customValue}
                className="emp-menu-select__option"
                onClick={() => { onChange(customValue); setIsOpen(false); setQuery(""); }}
              >
                <span>Use “{customValue}”</span>{value === customValue ? <Check size={15} /> : null}
              </button>
            ) : null}
            {visibleOptions.length === 0 && !canAddCustomValue ? <span className="emp-menu-select__empty">No matching options</span> : null}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
