import { Construction } from "lucide-react";

interface ModulePlaceholderPageProps {
  title: string;
  description: string;
}

export function ModulePlaceholderPage({
  title,
  description,
}: ModulePlaceholderPageProps) {
  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Module workspace</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>

      <div className="empty-panel">
        <div className="empty-panel__icon"><Construction size={26} /></div>
        <h2>{title} frontend is next</h2>
        <p>The authentication foundation and access controls are ready for this module.</p>
      </div>
    </section>
  );
}
