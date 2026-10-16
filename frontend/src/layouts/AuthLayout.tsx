import { ShieldCheck } from "lucide-react";
import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <main className="auth-layout">
      <section className="auth-layout__brand">
        <div className="auth-brand">
          <div className="auth-brand__mark">HR</div>
          <div>
            <strong>HR Management</strong>
            <span>Secure workforce operations</span>
          </div>
        </div>

        <div className="auth-layout__message">
          <span className="eyebrow">One connected workspace</span>
          <h1>People operations, built for clarity.</h1>
          <p>
            Manage employees, attendance, leave, payroll and
            organizational workflows from one secure platform.
          </p>
        </div>

        <div className="security-note">
          <ShieldCheck size={20} />
          <span>
            Protected sessions, role-based access and auditable actions.
          </span>
        </div>
      </section>

      <section className="auth-layout__content">
        <Outlet />
      </section>
    </main>
  );
}
