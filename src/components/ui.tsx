// Small shared pieces used across sections.

export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1833 338" role="img" aria-label="Enhcept">
      <use href="/img/logo.svg#logo" />
    </svg>
  );
}

export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`label ${className}`}>
      <span className="sq" aria-hidden="true" />
      {children}
    </p>
  );
}

export function SecHead({ label, id, title, sub }: { label: string; id: string; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <header className="sec-head">
      <Label>{label}</Label>
      <h2 id={id}>{title}</h2>
      {sub && <p className="sec-sub">{sub}</p>}
    </header>
  );
}

export function Status({ dev = false, children }: { dev?: boolean; children: React.ReactNode }) {
  return (
    <span className="status">
      <i className={dev ? "spin" : "live"} aria-hidden="true" />
      {children}
    </span>
  );
}
