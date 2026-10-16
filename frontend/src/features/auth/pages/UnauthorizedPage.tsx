import { ShieldX } from "lucide-react";
import { Link } from "react-router-dom";

export function UnauthorizedPage() {
  return (
    <div className="state-page">
      <div className="state-page__icon"><ShieldX size={28} /></div>
      <span className="eyebrow">Access denied</span>
      <h1>You do not have permission to view this page.</h1>
      <p>Contact your administrator when this access is required for your role.</p>
      <Link className="button button--primary" to="/dashboard">
        Return to dashboard
      </Link>
    </div>
  );
}
