import { Building2 } from "lucide-react";
import { useState } from "react";

interface CompanyAvatarProps {
  name: string;
  logoPath: string | null;
  size?: "small" | "medium" | "large";
}

function resolveLogoUrl(logoPath: string): string {
  if (/^(https?:|data:|blob:)/i.test(logoPath)) {
    return logoPath;
  }

  const origin = import.meta.env.VITE_BACKEND_ORIGIN ?? "";
  const normalisedPath = logoPath.startsWith("/")
    ? logoPath
    : `/${logoPath}`;

  return `${origin}${normalisedPath}`;
}

export function CompanyAvatar({
  name,
  logoPath,
  size = "medium",
}: CompanyAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return (
    <div className={`company-avatar company-avatar--${size}`}>
      {logoPath && !imageFailed ? (
        <img
          src={resolveLogoUrl(logoPath)}
          alt={`${name} logo`}
          onError={() => setImageFailed(true)}
        />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <Building2 size={22} />
      )}
    </div>
  );
}
