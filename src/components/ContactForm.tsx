"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "./ui";

// Values must match the allowed lists in the API.
const REGIONS = [["India", "India"], ["United States", "USA"], ["United Kingdom", "UK"], ["Europe", "Europe"], ["Canada", "Canada"], ["Australia", "Australia"], ["GCC", "GCC"], ["Other", "Other"]];
const SIZES = [["1-10 people", "1–10"], ["10-250 people", "10–250"], ["250+ people", "250+"], ["Owner / public body", "Owner / public body"], ["Education", "Education"]];
const SERVICES = ["BIM & Engineering", "3D & Mapping", "Plugins & Tools", "Software", "CRM & ERP", "AI", "Consulting & Academy", "Not sure yet"];
const TIMELINES = [["As soon as possible", "As soon as possible"], ["1-3 months", "1–3 months"], ["3-6 months", "3–6 months"], ["Just exploring", "Just exploring"]];

type Brief = Record<"company" | "name" | "region" | "size" | "services" | "timeline" | "date", string>;
const EMPTY: Brief = { company: "", name: "", region: "", size: "", services: "", timeline: "", date: "" };

function Field({ id, label, note, error, ...input }: { id: string; label: string; note?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label htmlFor={`f-${id}`}>{label} {note && <small>{note}</small>}</label>
      <input id={`f-${id}`} name={id} className="input" aria-invalid={!!error} aria-describedby={error ? `e-${id}` : undefined} {...input} />
      {error && <p className="err" id={`e-${id}`}>{error}</p>}
    </div>
  );
}

function Choices({ name, legend, note, type = "radio", options, error }: { name: string; legend: string; note?: string; type?: "radio" | "checkbox"; options: string[][]; error?: string }) {
  return (
    <fieldset className="field wide" aria-describedby={error ? `e-${name}` : undefined}>
      <legend>{legend} {note && <small>{note}</small>}</legend>
      <div className="choices">
        {options.map(([value, text]) => (
          <label key={value}><input type={type} name={name} value={value} /><span>{text}</span></label>
        ))}
      </div>
      {error && <p className="err" id={`e-${name}`}>{error}</p>}
    </fieldset>
  );
}

export default function ContactForm() {
  const started = useRef(0);
  const [brief, setBrief] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"draft" | "sending" | "sent" | "failed">("draft");
  const [note, setNote] = useState("");
  const [ref, setRef] = useState("");

  useEffect(() => { started.current = Date.now(); }, []);

  function onInput(e: React.FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    setBrief({ company: get("company"), name: get("name"), region: get("region"), size: get("size"), services: fd.getAll("services").join(", "), timeline: get("timeline"), date: today });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = { ...Object.fromEntries(fd), services: fd.getAll("services"), elapsed: Date.now() - started.current };
    setStatus("sending");
    setErrors({});
    setNote("");
    try {
      const res = await fetch("/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setRef(data.ref);
        setStatus("sent");
        return;
      }
      setErrors(data.fields ?? {});
      setNote(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setNote("We couldn't reach the server. Check your connection and try again.");
    }
    setStatus("failed");
  }

  function reset(form: HTMLFormElement | null) {
    form?.reset();
    setBrief(EMPTY);
    setStatus("draft");
    setRef("");
    started.current = Date.now();
  }

  const sent = status === "sent";
  const tb = (v: string) => v || "—";

  return (
    <>
      <form className="brief card-white" noValidate onInput={onInput} onSubmit={onSubmit} aria-labelledby="contact-title">
        <fieldset className="brief-fields" disabled={sent || status === "sending"}>
          <Field id="name" label="Your name" autoComplete="name" maxLength={120} required placeholder="Full name" error={errors.name} />
          <Field id="company" label="Company" autoComplete="organization" maxLength={160} required placeholder="Studio or firm" error={errors.company} />
          <Field id="email" label="Work email" type="email" autoComplete="email" maxLength={254} required placeholder="you@company.com" error={errors.email} />
          <Field id="phone" label="Phone" note="optional" type="tel" autoComplete="tel" maxLength={40} placeholder="+91 …" error={errors.phone} />
          <Choices name="region" legend="Where is the project?" options={REGIONS} error={errors.region} />
          <Choices name="size" legend="Firm size" options={SIZES} error={errors.size} />
          <Choices name="services" legend="What do you need?" note="pick any" type="checkbox" options={SERVICES.map((s) => [s, s])} error={errors.services} />
          <Choices name="timeline" legend="Timeline" note="optional" options={TIMELINES} error={errors.timeline} />
          <div className="field wide">
            <label htmlFor="f-message">Project brief <small>optional</small></label>
            <textarea id="f-message" name="message" className="input" rows={4} maxLength={4000} placeholder="Building type, size, software, deadlines, anything that helps." />
            {errors.message && <p className="err">{errors.message}</p>}
          </div>
          {/* Honeypot: people never see or fill this. */}
          <div className="hp" aria-hidden="true">
            <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
        </fieldset>

        {sent ? (
          <div className="sent" role="status">
            <p><strong>Thank you{brief.name ? `, ${brief.name.split(" ")[0]}` : ""}.</strong> Your brief is in as <b>{ref}</b>. A lead from the right division will reply to you directly.</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => reset(e.currentTarget.form)}>Send another brief</button>
          </div>
        ) : (
          <div className="submit-row">
            <button className="btn btn-red" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Send enquiry"} <span className="sq" aria-hidden="true" />
            </button>
            <p className="form-note">We only use these details to reply to you.</p>
            <p className="form-error" role="alert">{note}</p>
          </div>
        )}
      </form>

      <aside className={`titleblock${sent ? " is-sent" : ""}`} aria-hidden="true">
        <div className="tb-head"><Logo /><span>Project brief</span></div>
        <dl>
          <div><dt>Client</dt><dd>{tb(brief.company)}</dd></div>
          <div><dt>Contact</dt><dd>{tb(brief.name)}</dd></div>
          <div><dt>Location</dt><dd>{tb(brief.region)}</dd></div>
          <div><dt>Firm size</dt><dd>{tb(brief.size)}</dd></div>
          <div className="tb-wide"><dt>Scope</dt><dd>{tb(brief.services)}</dd></div>
          <div><dt>Timeline</dt><dd>{tb(brief.timeline)}</dd></div>
          <div><dt>Date</dt><dd>{tb(brief.date)}</dd></div>
          <div><dt>Sheet</dt><dd>A-09 · Rev P01</dd></div>
          <div><dt>Status</dt><dd>{sent ? "Received" : status === "sending" ? "Issuing…" : "Draft"}</dd></div>
        </dl>
        <div className="stamp"><span>Received</span><b>{ref || "ENQ-0000"}</b></div>
      </aside>
    </>
  );
}
