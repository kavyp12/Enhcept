"use client";

// Enquiries admin. Every value from the database is rendered as React text, never as HTML.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Label, Logo, Status } from "@/components/ui";
import { SERVICES, type Row } from "@/lib/enquiry";
import s from "./admin.module.css";

const ref = (id: number) => "ENQ-" + String(id).padStart(4, "0");
const servicesOf = (r: Row) => r.services.split(", ");
const when = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString("en-GB", opts);

// Monday 00:00 local time, for the "this week" count.
function weekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

// JSON back from every call; a network failure comes back as status 0.
async function call(path: string, init?: RequestInit) {
  try {
    const r = await fetch(path, { cache: "no-store", ...init });
    return { status: r.status, data: await r.json().catch(() => ({})) };
  } catch {
    return { status: 0, data: { error: "Couldn't reach the server." } };
  }
}

export default function Admin() {
  const [view, setView] = useState<"loading" | "login" | "ready">("loading");
  const [rows, setRows] = useState<Row[]>([]);
  const [since, setSince] = useState(0);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [service, setService] = useState("");
  const [open, setOpen] = useState<Row | null>(null);

  // The list, or the login card when there is no session (401) or the call failed.
  const show = useCallback(({ status, data }: Awaited<ReturnType<typeof call>>) => {
    if (status === 200) {
      setRows(data.enquiries);
      setSince(weekStart());
      setNotice("");
      setView("ready");
    } else {
      setNotice(status === 401 ? "" : data.error || "Couldn't load the enquiries.");
      setView("login");
    }
  }, []);

  useEffect(() => {
    call("/api/admin/enquiries").then(show);
  }, [show]);

  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const { status, data } = await call("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: new FormData(e.currentTarget).get("password") }),
    });
    setBusy(false);
    if (status === 200) return show(await call("/api/admin/enquiries"));
    setNotice(data.error || "Sign-in failed.");
  }

  async function signOut() {
    await call("/api/admin/logout", { method: "POST" });
    setRows([]);
    setOpen(null);
    setView("login");
  }

  async function remove(row: Row) {
    if (!confirm(`Delete ${ref(row.id)} from ${row.name}? This can't be undone.`)) return;
    const { status, data } = await call(`/api/admin/enquiries/${row.id}`, { method: "DELETE" });
    if (status === 401) return setView("login");
    if (status !== 200) return alert(data.error || "Couldn't delete it. Try again.");
    setRows((all) => all.filter((r) => r.id !== row.id));
    setOpen(null);
  }

  if (view === "loading") {
    return (
      <main className={s.center}>
        <Status dev>Loading</Status>
      </main>
    );
  }

  if (view === "login") {
    return (
      <main className={s.center}>
        <form className={`card card-white ${s.login}`} onSubmit={signIn}>
          <span className="accent" aria-hidden="true" />
          <Logo className={s.logo} />
          <div>
            <Label>Admin</Label>
            <h1 className={s.title}>
              Sign in to see <em>enquiries.</em>
            </h1>
          </div>
          <label className={s.field}>
            <span className="label">Password</span>
            <input className="input" type="password" name="password" autoComplete="current-password" required autoFocus />
          </label>
          {notice && (
            <p className={s.error} role="alert">
              {notice}
            </p>
          )}
          <button className="btn btn-red" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"} <span className="sq" aria-hidden="true" />
          </button>
        </form>
        <p className={s.foot}>Enhcept · contact form enquiries</p>
      </main>
    );
  }

  const q = query.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (!service || servicesOf(r).includes(service)) &&
      (!q || [ref(r.id), r.name, r.company, r.email, r.phone, r.region, r.size, r.services, r.timeline, r.message].join(" ").toLowerCase().includes(q)),
  );
  const thisWeek = rows.filter((r) => Date.parse(r.created_at) >= since).length;
  const counts = new Map<string, number>();
  for (const r of rows) for (const name of servicesOf(r)) counts.set(name, (counts.get(name) ?? 0) + 1);
  const [top, topCount] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? ["None yet", 0];

  return (
    <div className={s.page}>
      <header className={`wrap ${s.bar}`}>
        <div className={s.brand}>
          <Logo className={s.logo} />
          <span className={s.tag}>Admin</span>
        </div>
        <div className={s.actions}>
          <a className="btn btn-ghost btn-sm" href="/api/admin/export.csv" download>
            Export CSV
          </a>
          <button className="btn btn-navy btn-sm" onClick={signOut}>
            Log out
          </button>
        </div>
      </header>

      <main className="wrap">
        <div className={s.head}>
          <Label>Contact form</Label>
          <h1 className={s.heading}>
            Project <em>enquiries</em>
          </h1>
        </div>

        <section className={s.stats} aria-label="Summary">
          <div className="card card-white">
            <span className="accent" aria-hidden="true" />
            <p className="label">Total</p>
            <p className={s.num}>{rows.length}</p>
          </div>
          <div className="card">
            <p className="label">This week</p>
            <p className={s.num}>{thisWeek}</p>
          </div>
          <div className={`card ${s.topCard}`}>
            <p className="label">Top service</p>
            <p className={s.topName}>{top}</p>
            <p className={s.sub}>
              {topCount} {topCount === 1 ? "enquiry" : "enquiries"}
            </p>
          </div>
        </section>

        <div className={s.tools}>
          <input
            className={`input ${s.search}`}
            type="search"
            placeholder="Search name, company, email, message…"
            aria-label="Search enquiries"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className={`input ${s.select}`} aria-label="Filter by service" value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">All services</option>
            {SERVICES.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <p className={s.count} aria-live="polite">
            {shown.length} of {rows.length}
          </p>
        </div>

        <div className={`card card-white ${s.tableCard}`}>
          {shown.length ? (
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Received</th>
                  <th>Contact</th>
                  <th>Services</th>
                  <th className={s.wideOnly}>Region</th>
                  <th className={s.wideOnly}>Timeline</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} onClick={() => setOpen(r)}>
                    <td className={s.ref}>{ref(r.id)}</td>
                    <td className={s.date}>
                      {when(r.created_at, { day: "numeric", month: "short" })}
                      <span>{when(r.created_at, { hour: "2-digit", minute: "2-digit" })}</span>
                    </td>
                    <td className={s.who}>
                      <button type="button" onClick={() => setOpen(r)}>
                        {r.name}
                      </button>
                      <span>{r.company}</span>
                    </td>
                    <td className={s.services}>
                      <ul className="chips">
                        {servicesOf(r).map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                      </ul>
                    </td>
                    <td className={s.wideOnly}>{r.region}</td>
                    <td className={s.wideOnly}>{r.timeline || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={s.empty}>{rows.length ? "No enquiries match that search." : "No enquiries yet. They appear here as the contact form brings them in."}</p>
          )}
        </div>
      </main>

      {open && <Drawer row={open} onClose={() => setOpen(null)} onDelete={() => remove(open)} />}
    </div>
  );
}

// Native modal <dialog>: Esc, focus trap and focus return come free.
function Drawer({ row, onClose, onDelete }: { row: Row; onClose: () => void; onDelete: () => void }) {
  const mail = `mailto:${encodeURIComponent(row.email)}`;
  return (
    <dialog
      className={s.drawer}
      aria-labelledby="enquiry-name"
      ref={(d) => {
        if (d && !d.open) d.showModal();
      }}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <div className={s.drawerBody}>
        <div className={s.drawerTop}>
          <Label>
            {ref(row.id)} · {when(row.created_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </Label>
          <form method="dialog">
            <button className={s.close} aria-label="Close">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </form>
        </div>

        <div>
          <h2 id="enquiry-name" className={s.drawerTitle}>
            {row.name}
          </h2>
          <p className={s.company}>{row.company}</p>
        </div>

        <dl className={s.facts}>
          <div className={s.wide}>
            <dt className="label">Email</dt>
            <dd>
              <a href={mail}>{row.email}</a>
            </dd>
          </div>
          <div>
            <dt className="label">Phone</dt>
            <dd>{row.phone ? <a href={`tel:${row.phone.replace(/[^\d+]/g, "")}`}>{row.phone}</a> : "—"}</dd>
          </div>
          <div>
            <dt className="label">Region</dt>
            <dd>{row.region}</dd>
          </div>
          <div>
            <dt className="label">Firm size</dt>
            <dd>{row.size}</dd>
          </div>
          <div>
            <dt className="label">Timeline</dt>
            <dd>{row.timeline || "—"}</dd>
          </div>
          <div className={s.wide}>
            <dt className="label">Services</dt>
            <dd>
              <ul className="chips">
                {servicesOf(row).map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>

        <div className={s.message}>
          <p className="label">Message</p>
          <p>{row.message || "No message."}</p>
        </div>

        <div className={s.drawerActions}>
          <a className="btn btn-red" href={`${mail}?subject=${encodeURIComponent(`Re: your Enhcept enquiry (${ref(row.id)})`)}`}>
            Reply by email <span className="sq" aria-hidden="true" />
          </a>
          <button type="button" className="btn btn-ghost" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </dialog>
  );
}
