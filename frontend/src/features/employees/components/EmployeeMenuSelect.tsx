import { Check, ChevronDown, Search } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
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
  searchInField?: boolean;
  searchPlaceholder?: string;
  ariaLabel?: string;
  className?: string;
  allowClear?: boolean;
  allowCustomValue?: boolean;
  customValueMaxLength?: number;
}

export function EmployeeMenuSelect({ value, options, placeholder, onChange, disabled, searchable, searchInField, searchPlaceholder = "Search options", ariaLabel, className, allowClear = true, allowCustomValue = false, customValueMaxLength }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const fieldSearchRef = useRef<HTMLInputElement>(null);
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
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" || event.key === "Tab") {
        setIsOpen(false);
        setQuery("");
      }
    }
    function handleFocusIn(event: FocusEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    if (!searchInField) searchRef.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [isOpen, searchInField]);

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!visibleOptions.length) return;
      event.preventDefault();
      if (!isOpen) setIsOpen(true);
      setActiveIndex((current) => {
        if (current < 0) {
          const selectedIndex = visibleOptions.findIndex((option) => option.value === value);
          const startIndex = selectedIndex >= 0
            ? selectedIndex
            : event.key === "ArrowDown" ? -1 : 0;
          return event.key === "ArrowDown"
            ? (startIndex + 1) % visibleOptions.length
            : (startIndex - 1 + visibleOptions.length) % visibleOptions.length;
        }
        return event.key === "ArrowDown"
          ? (current + 1) % visibleOptions.length
          : (current - 1 + visibleOptions.length) % visibleOptions.length;
      });
      return;
    }
    if (event.key !== "Enter" || !isOpen) return;
    event.preventDefault();
    if (activeIndex >= 0 && visibleOptions[activeIndex]) {
      onChange(visibleOptions[activeIndex].value);
      setIsOpen(false);
      setQuery("");
      setActiveIndex(-1);
      return;
    }
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return;
    const exactMatch = visibleOptions.find((option) =>
      option.label.toLocaleLowerCase() === normalizedQuery ||
      option.value.toLocaleLowerCase() === normalizedQuery,
    );
    const match = exactMatch ?? (visibleOptions.length === 1 ? visibleOptions[0] : undefined);
    if (!match) return;
    onChange(match.value);
    setIsOpen(false);
    setQuery("");
    setActiveIndex(-1);
  }

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    menuRef.current?.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

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
      {searchable && searchInField ? (
        <div className="emp-menu-select__trigger emp-menu-select__input-trigger">
          <Search size={14} aria-hidden="true" />
          <input
            ref={fieldSearchRef}
            role="combobox"
            aria-label={ariaLabel ?? placeholder}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            autoComplete="off"
            value={isOpen ? query : selected?.label ?? ""}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={() => { setQuery(""); setActiveIndex(visibleOptions.findIndex((option) => option.value === value)); setIsOpen(true); }}
            onChange={(event) => {
              const nextQuery = event.target.value;
              const normalizedQuery = nextQuery.trim().toLocaleLowerCase();
              const nextOptions = (allowClear ? [{ value: "", label: placeholder }, ...options] : options)
                .filter((option) => !normalizedQuery || (option.value && option.label.toLocaleLowerCase().includes(normalizedQuery)));
              const selectedIndex = nextOptions.findIndex((option) => option.value === value);
              setQuery(nextQuery);
              setActiveIndex(selectedIndex >= 0 ? selectedIndex : nextOptions.length ? 0 : -1);
              setIsOpen(true);
            }}
            onKeyDown={handleMenuKeyDown}
          />
          <ChevronDown size={15} aria-hidden="true" />
        </div>
      ) : (
        <button
          type="button"
          className="emp-menu-select__trigger"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          disabled={disabled}
          onClick={() => {
            setQuery("");
            setIsOpen((current) => {
              if (current) {
                setActiveIndex(-1);
                return false;
              }
              setActiveIndex(visibleOptions.findIndex((option) => option.value === value));
              return true;
            });
          }}
          onKeyDown={handleMenuKeyDown}
        >
          <span className="emp-menu-select__trigger-label">
            <span className={selected ? "" : "is-placeholder"}>{selected?.label ?? placeholder}</span>
            {/* edited by wali: Place contextual markers after the selected option name. */}
            {selected?.icon}
          </span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>
      )}
      {isOpen && menuPosition ? createPortal(
        <div
          className="emp-menu-select__menu"
          ref={menuRef}
          style={{ position: "fixed", inset: "auto", top: menuPosition.top, left: menuPosition.left, width: menuPosition.width, zIndex: 2000 }}
        >
          {((searchable && !searchInField) || allowCustomValue) ? <div className="emp-menu-select__search"><Search size={14} /><input
            ref={searchRef}
            value={query}
            maxLength={customValueMaxLength}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleMenuKeyDown}
            placeholder={searchPlaceholder}
          /></div> : null}
          <div className="emp-menu-select__options" role="listbox">
            {visibleOptions.map((option, index) => (
              <button
                type="button"
                role="option"
                aria-selected={value === option.value}
                className={`emp-menu-select__option${activeIndex === index ? " is-active" : ""}`}
                data-option-index={index}
                tabIndex={-1}
                key={option.value}
                onClick={() => { onChange(option.value); setIsOpen(false); setQuery(""); setActiveIndex(-1); }}
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
