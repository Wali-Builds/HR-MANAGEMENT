import { SearchX } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="state-page state-page--full">
      <div className="state-page__icon"><SearchX size={28} /></div>
      <span className="eyebrow">404</span>
      <h1>The page you requested was not found.</h1>
      <p>Check the address or return to your dashboard.</p>
      <Link className="button button--primary" to="/dashboard">
        Go to dashboard
      </Link>
    </div>
  );
}
