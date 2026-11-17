import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Hash, Save } from "lucide-react";
import { toast } from "sonner";

import { normalizeApiError } from "../../../api/api-error";
import { useCompany, useUpdateCompany } from "../../companies/hooks/useCompanies";

interface Props {
  companyId: string;
}

export function EmployeeNumberingPanel({ companyId }: Props) {
  const companyQuery = useCompany(companyId);
  const updateCompany = useUpdateCompany();
  const [startingCode, setStartingCode] = useState("EMP00001");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!companyQuery.data) return;
    const prefix = companyQuery.data.employeeCodePrefix ?? "EMP";
    const startNumber = companyQuery.data.employeeCodeStartNumber;
    const digitCount = companyQuery.data.employeeCodeLength;
    setStartingCode(`${prefix}${String(startNumber).padStart(digitCount, "0")}`);
  }, [companyQuery.data]);

  const normalizedStartingCode = startingCode.trim().toUpperCase();
  const parsedStartingCode = normalizedStartingCode.match(/^([A-Z0-9_-]*?)(\d+)$/);
  const prefix = parsedStartingCode?.[1] ?? "";
  const numberPart = parsedStartingCode?.[2] ?? "";
  const startNumber = Number(numberPart);
  const digitCount = numberPart.length;
  const hasValidStartingCode = Boolean(
    parsedStartingCode &&
      prefix.length > 0 &&
      prefix.length <= 20 &&
      normalizedStartingCode.length <= 50 &&
      Number.isSafeInteger(startNumber) &&
      startNumber >= 1 &&
      digitCount <= 20,
  );
  const savedStartingCode = companyQuery.data
    ? `${(companyQuery.data.employeeCodePrefix ?? "EMP").trim().toUpperCase()}${String(companyQuery.data.employeeCodeStartNumber).padStart(companyQuery.data.employeeCodeLength, "0")}`
    : "";
  const isDirty = Boolean(companyQuery.data) && normalizedStartingCode !== savedStartingCode;

  async function saveNumbering() {
    if (!hasValidStartingCode || !isDirty) return;

    try {
      await updateCompany.mutateAsync({
        companyId,
        input: {
          employeeCodePrefix: prefix,
          employeeCodeStartNumber: startNumber,
          employeeCodeLength: digitCount,
        },
      });
      toast.success("Employee ID numbering updated");
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  }

  if (companyQuery.isLoading) return null;

  return (
    <section className={`emp-numbering-panel${isOpen ? " is-open" : ""}`} aria-labelledby="emp-numbering-title">
      <header className="emp-numbering-panel__header">
        <span className="emp-numbering-panel__icon"><Hash size={18} /></span>
        <div className="emp-numbering-panel__summary">
          <h2 id="emp-numbering-title">Employee ID</h2>
          <p>Starting at {savedStartingCode || "..."}</p>
        </div>
        <button
          type="button"
          className="emp-secondary-action emp-numbering-panel__toggle"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {isOpen ? "Close" : "Customise ID"}
        </button>
      </header>

      {isOpen ? (
        companyQuery.isError ? (
          <p className="emp-numbering-panel__error">{normalizeApiError(companyQuery.error).message}</p>
        ) : (
          <div id="emp-numbering-controls" className="emp-numbering-panel__editor">
            <label className="emp-numbering-panel__field">
              <span>Starting employee ID</span>
              <input
                value={startingCode}
                maxLength={50}
                onChange={(event) => setStartingCode(event.target.value.toUpperCase())}
                placeholder="TS-101"
              />
            </label>
            <div className="emp-numbering-panel__preview">
              <span>Next IDs</span>
              <strong>
                {hasValidStartingCode
                  ? `${normalizedStartingCode} → ${prefix}${String(startNumber + 1).padStart(digitCount, "0")}`
                  : "Enter an ID ending in a number"}
              </strong>
            </div>
            <button
              type="button"
              className="emp-primary-action emp-numbering-panel__save"
              disabled={updateCompany.isPending || !hasValidStartingCode || !isDirty || companyQuery.isError}
              onClick={() => void saveNumbering()}
            >
              <Save size={16} />
              {updateCompany.isPending ? "Saving..." : "Save ID format"}
            </button>
          </div>
        )
      ) : null}
    </section>
  );
}
