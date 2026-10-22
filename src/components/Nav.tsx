"use client";

import { Logo } from "./ui";

const LINKS = [
  ["#partners", "Partnership"],
  ["#divisions", "Divisions"],
  ["#ai", "AI in the model"],
  ["#work", "Real work"],
  ["#faq", "FAQ"],
];

export default function Nav() {
  return (
    <header className="nav">
      <a className="nav-pill nav-logo" href="#top" aria-label="Enhcept, back to top">
        <Logo />
      </a>
      <nav className="nav-pill nav-links" aria-label="Sections">
        {LINKS.map(([href, text]) => (
          <a key={href} href={href}>{text}</a>
        ))}
      </nav>
      <div className="nav-end">
        <a className="btn btn-red nav-cta" href="#contact">
          Start a project <span className="sq" aria-hidden="true" />
        </a>
        <details className="nav-menu">
          <summary className="nav-pill">Menu</summary>
          {/* Close the menu once a link is picked. */}
          <nav aria-label="Sections" onClick={(e) => ((e.currentTarget.parentElement as HTMLDetailsElement).open = false)}>
            {LINKS.map(([href, text]) => (
              <a key={href} href={href}>{text}</a>
            ))}
            <a className="btn btn-red" href="#contact">
              Start a project <span className="sq" aria-hidden="true" />
            </a>
          </nav>
        </details>
      </div>
    </header>
  );
}
