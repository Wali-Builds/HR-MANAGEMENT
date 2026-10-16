import type { ReactNode } from "react";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function UsageMeter({
  icon,
  label,
  used,
  limit,
  helper,
}: {
  icon: ReactNode;
  label: string;
  used: number;
  limit: number | null;
  helper: string;
}) {
  const percentage =
    limit === null || limit <= 0
      ? 0
      : clamp((used / limit) * 100);
  const nearingLimit = limit !== null && percentage >= 80;
  const atLimit = limit !== null && used >= limit;

  return (
    <article
      className={[
        "org-usage-meter",
        nearingLimit ? "org-usage-meter--warning" : "",
        atLimit ? "org-usage-meter--limit" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="org-usage-meter__top">
        <span className="org-usage-meter__icon">{icon}</span>
        <div>
          <small>{label}</small>
          <strong>
            {used.toLocaleString("en-GB")}
            <span>
              {limit === null
                ? " / Unlimited"
                : ` / ${limit.toLocaleString("en-GB")}`}
            </span>
          </strong>
        </div>
      </div>

      <div className="org-usage-meter__track" aria-hidden="true">
        <span style={{ width: `${percentage}%` }} />
      </div>

      <footer>
        <span>{helper}</span>
        <strong>
          {limit === null
            ? "Unlimited"
            : `${Math.max(0, limit - used).toLocaleString("en-GB")} remaining`}
        </strong>
      </footer>
    </article>
  );
}
