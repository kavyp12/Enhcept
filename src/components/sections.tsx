import type { CSSProperties } from "react";
import Image from "next/image";
import { Clocks, Year } from "./Clocks";
import ContactForm from "./ContactForm";
import { IsoIcon, IsoPrims } from "./iso";
import { Label, Logo, SecHead, Status } from "./ui";

const v = (vars: Record<string, number>) => vars as CSSProperties;

/* ---------- 01 Partnership ---------- */

const MANIFESTO =
  "Not a software vendor. Not an outsourcing shop. An engineering company that builds technology, and a technology company that understands engineering.";

const FACTS = [
  ["2018", "Live BIM delivery since"],
  ["LOD 100–500", "Concept to as-built"],
  ["15+", "AEC platforms"],
  ["7", "Divisions, one partner"],
];

export function Partnership() {
  const words = MANIFESTO.split(" ");
  return (
    <section className="section" id="partners" aria-labelledby="partners-title">
      <div className="wrap">
        <Label>01 · The partnership</Label>
        <h2 id="partners-title" className="manifesto" style={v({ "--n": words.length })}>
          {words.map((w, i) => (
            <span key={i} style={v({ "--i": i })}>{w} </span>
          ))}
        </h2>

        <div className="partners">
          <article className="card partner" data-reveal>
            <span className="accent" aria-hidden="true" />
            <Image className="partner-logo" src="/img/partners/conceptdrafter.webp" width={48} height={88} alt="ConceptDrafter logo" />
            <Status>Live projects since 2018</Status>
            <h3>ConceptDrafter</h3>
            <p className="role">BIM &amp; engineering delivery</p>
            <p>Architectural, structural and MEP BIM from LOD 100 to 500, coordination and clash detection, scan-to-BIM, CAD, steel detailing and BIM training.</p>
            <ul className="chips">
              {["Revit", "Navisworks", "AutoCAD", "Civil 3D", "ReCap", "ACC"].map((c) => <li key={c}>{c}</li>)}
            </ul>
          </article>
          <div className="partner-x" aria-hidden="true">×</div>
          <article className="card partner" data-reveal>
            <span className="accent" aria-hidden="true" />
            <Image className="partner-logo" src="/img/partners/enhc.webp" width={128} height={42} alt="ENHC logo" />
            <Status>Building since 2022</Status>
            <h3>ENHC</h3>
            <p className="role">AI &amp; software engineering</p>
            <p>Machine learning, computer vision, LLM integration and automation, plus the CRM, ERP, web and mobile products that put them to work.</p>
            <ul className="chips">
              {["PyTorch", "TensorFlow", "LLMs & agents", "Cloud", "Web & mobile"].map((c) => <li key={c}>{c}</li>)}
            </ul>
          </article>
        </div>

        <div className="equals" data-reveal>
          <span className="equals-sign" aria-hidden="true">=</span>
          <Logo className="equals-logo" />
          <p>One partner for drawings, models, data, software and AI, across every platform you already use.</p>
        </div>

        <dl className="facts" data-reveal>
          {FACTS.map(([n, t]) => (
            <div key={n}>
              <dt>{n}</dt>
              <dd>{t}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ---------- 02 Divisions ---------- */

export const DIVISIONS = [
  { name: "BIM & Engineering", icon: "bim", status: "Live", led: "Led by ConceptDrafter",
    text: "Models, drawings and documentation across every discipline, under your design lead.",
    caps: ["Architectural, structural & MEPF BIM, LOD 100–500", "Coordination, federation & clash detection", "Shop, steel & rebar detailing", "Quantity take-off (5D) & 4D sequencing"] },
  { name: "3D & Mapping", icon: "map", status: "Live · Expanding", led: "ConceptDrafter with ENHC",
    text: "Capturing the real world and showing the designed one.",
    caps: ["Scan-to-BIM & point clouds", "Drone surveys, photogrammetry & GIS", "Digital twins linked to asset data", "Photo-real renders, walkthroughs & VR"] },
  { name: "Plugins & Tools", icon: "plug", status: "Live · Expanding", led: "ENHC builds, ConceptDrafter tests",
    text: "Productised automation for the software your team already uses.",
    caps: ["CDP plugin for Revit", "Auto-dimensioning, tagging & sheet packing", "Model health & QA/QC checkers", "Add-ins for Revit, AutoCAD, Tekla, Rhino & more"] },
  { name: "Software", icon: "app", status: "Live", led: "Led by ENHC",
    text: "Custom technical software that fills the gaps between AEC tools.",
    caps: ["Estimating, costing & BOQ", "Document control, RFIs & submittals", "Site progress, inspection & snag apps", "Dashboards & data pipelines"] },
  { name: "CRM & ERP", icon: "erp", status: "Live", led: "Led by ENHC",
    text: "Business systems shaped around how AEC firms really work.",
    caps: ["Bids, tenders & proposals", "Project accounting & billing", "Resource planning & timesheets", "Procurement & fabrication ERP"] },
  { name: "AI", icon: "ai", status: "In development", dev: true, led: "ENHC with ConceptDrafter",
    text: "AI built on real AEC project knowledge, delivered inside your tools.",
    caps: ["Drawing & model QA", "Auto-detailing & dimensioning", "Building-code pre-checks", "Document AI & agents across CAD and BIM"] },
  { name: "Consulting & Academy", icon: "academy", status: "Live", led: "Both partners",
    text: "Helping firms adopt BIM, standards and AI, and training the people they need.",
    caps: ["BIM implementation roadmaps", "ISO 19650: BEP, EIR & OIR", "CDE set-up on ACC, Trimble & ProjectWise", "Courses from Revit to AI for AEC"] },
];

const ROADMAP = ["Sustainability", "Twin & Operations", "Construction Tech", "Prefab & DfMA", "Marketplace", "Talent Cloud", "Smart Cities & GIS", "Labs & Ventures"];

export function Divisions() {
  return (
    <section className="section band" id="divisions" aria-labelledby="divisions-title">
      <div className="wrap">
        <SecHead label="02 · Divisions" id="divisions-title" title={<>Seven divisions.<br />One <em>partner.</em></>}
          sub="Buy one service or the full stack. Every division shares the same engineers, project data and AI." />
        <div className="div-grid">
          {DIVISIONS.map((d) => (
            <article key={d.name} className={`card div-card${d.dev ? " is-ai" : ""}`} data-reveal>
              <Status dev={d.dev}>{d.status}</Status>
              <IsoIcon name={d.icon} className="div-art" />
              <h3>{d.name}</h3>
              <p>{d.text}</p>
              <ul className="caps">{d.caps.map((c) => <li key={c}>{c}</li>)}</ul>
              <p className="led">{d.led}</p>
            </article>
          ))}
          <article className="card div-card div-roadmap" data-reveal>
            <Status dev>Years 2–10</Status>
            <IsoIcon name="roadmap" className="div-art" />
            <h3>On the roadmap</h3>
            <ul className="chips">{ROADMAP.map((r) => <li key={r}>{r}</li>)}</ul>
            <p className="led">Each opens only when the one before it has paying clients.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ---------- 05 How we work ---------- */

const VALUES = [
  ["Precision in every model", "QA/QC checks against your standards before anything is issued."],
  ["Honest timelines", "Clear scope and realistic dates. No surprises at handover."],
  ["Client data protected", "NDAs and access controls as standard. Your project data never trains AI without written permission."],
  ["Automate every repeat task", "Anything we do twice becomes a script, a plugin or an agent."],
];

export function HowWeWork() {
  return (
    <section className="section" id="principles" aria-labelledby="principles-title">
      <div className="wrap">
        <div className="statement" data-reveal>
          <div className="statement-head">
            <Label>05 · How we work</Label>
            <h2 id="principles-title">Wide vision.<br /><em>Narrow execution.</em></h2>
          </div>
          <ol className="values">
            {VALUES.map(([t, p], i) => (
              <li key={t}>
                <b>{String(i + 1).padStart(2, "0")}</b>
                <span>{t}</span>
                <p>{p}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------- 06 Stack ---------- */

// Bottom layer first, matching the slabs from the ground up.
const LAYERS = [
  ["Data capture", "Survey, laser scanning, drones, GIS, site photos", "3D & Mapping"],
  ["Authoring", "BIM, CAD, civil, detailing, visualisation", "BIM & Engineering · Plugins"],
  ["Coordination & analysis", "Clash detection, structural, energy and code analysis, take-off", "BIM & Engineering"],
  ["Collaboration & CDE", "Common data environment, document control, model sharing", "Consulting · Software"],
  ["Construction management", "Scheduling, field apps, cost, quality, safety, RFIs", "Software"],
  ["Operations", "Facility and asset management, CMMS, IoT, digital twins", "Software · 3D & Mapping"],
  ["Business systems", "CRM, ERP, project accounting, HR, bids and proposals", "CRM & ERP · Software"],
];

// Seven slabs, with the AI spine drawn over them x-ray style (the slabs would hide a real one).
function StackArt() {
  const S = 120, T = 5, STEP = 26, top = (LAYERS.length - 1) * STEP + T;
  return (
    <svg className="iso stack-art" viewBox="-110 -168 258 298" aria-hidden="true">
      {LAYERS.map((_, i) => (
        <g key={i} className={`slab slab-${i}`}>
          <IsoPrims prims={[{ box: [0, 0, i * STEP, S, S, T] }]} />
          <text x={116} y={62 - i * STEP}>{String(i + 1).padStart(2, "0")}</text>
        </g>
      ))}
      <line className="spine" x1={0} y1={S - T / 2} x2={0} y2={S / 2 - top} />
      {LAYERS.map((_, i) => <rect key={i} className="node" x={-3.5} y={S - T / 2 - 3.5 - i * STEP} width={7} height={7} />)}
      <IsoPrims prims={[{ box: [S / 2 - 7, S / 2 - 7, top, 14, 14, 22], t: "red" }]} />
      <text className="ai-tag" x={0} y={S / 2 - top - 40} textAnchor="middle">AI</text>
    </svg>
  );
}

export function Stack() {
  return (
    <section className="section" id="stack" aria-labelledby="stack-title">
      <div className="wrap">
        <SecHead label="06 · The stack" id="stack-title" title={<>Every layer of AEC.<br /><em>Connected.</em></>}
          sub="Most firms run each layer in a separate tool, with manual work between them. Enhcept works at every layer and connects them, with AI across all of them." />
        <div className="stack" data-reveal>
          <StackArt />
          <ol className="stack-list">
            {LAYERS.map(([t, p, who], i) => (
              <li key={t} data-layer={i}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <div><b>{t}</b><p>{p}</p></div>
                <em>{who}</em>
              </li>
            )).reverse()}
          </ol>
        </div>
        <p className="stack-ai" data-reveal><span className="sq" aria-hidden="true" />AI and automation across every layer</p>
      </div>
    </section>
  );
}

/* ---------- 07 Who we serve ---------- */

const CLIENTS = [
  ["Small", "1–10 people", "Freelancers, small architects, homebuilders, small contractors", "Drafting and permit sets, renders, plugins, CRM lite, training", "Per drawing or project, monthly plans"],
  ["Mid-size", "10–250 people", "Design firms, MEP and structural consultants, contractors, fabricators", "Dedicated teams, coordination, detailing, custom automation, ERP", "Monthly retainers, annual licences"],
  ["Enterprise", "250+ people", "Large contractors, global consultancies, developers, manufacturers", "Framework agreements, enterprise licences, AI platform, digital twins", "Multi-year contracts with service levels"],
  ["Owners", "& public sector", "Developers, facility owners, utilities, government bodies", "Scan-to-BIM, GIS, digital twins, FM data, standards", "Tenders, frameworks, annual contracts"],
  ["Education", "", "Colleges, universities, students, working engineers", "Courses, college programmes, internships, certification", "Per student, per batch, yearly partnership"],
];
const SECTORS = ["Residential & high-rise", "Offices", "Retail & mixed use", "Hospitality", "Healthcare", "Education", "Labs", "Data centres", "Industrial & logistics", "Roads, rail & bridges", "Airports & ports", "Water & energy", "Government", "Heritage"];

export function Clients() {
  const heads = ["Typical clients", "What they buy", "How"];
  return (
    <section className="section band" id="clients" aria-labelledby="clients-title">
      <div className="wrap">
        <SecHead label="07 · Who we serve" id="clients-title" title={<>From one-person studios<br />to <em>global contractors.</em></>} />
        <table className="schedule" data-reveal>
          <thead>
            <tr><th scope="col">Firm size</th>{heads.map((h) => <th key={h} scope="col">{h}</th>)}</tr>
          </thead>
          <tbody>
            {CLIENTS.map(([size, sub, ...cells]) => (
              <tr key={size}>
                <th scope="row">{size} {sub && <small>{sub}</small>}</th>
                {cells.map((c, i) => <td key={i} data-th={heads[i]}>{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="sectors" data-reveal>
          <p className="label">Sectors</p>
          <ul className="chips">{SECTORS.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- 08 FAQ ---------- */

const FAQ = [
  ["Can we start with just one service?", "Yes. You can buy one service or the full stack. Most firms start with one division, like BIM production or a single plugin, and add more as the work grows."],
  ["Which software do you work in?", "Revit, AutoCAD, Navisworks, Civil 3D, Tekla Structures, Advance Steel, Archicad, MicroStation, Rhino, SketchUp, ACC / BIM 360, ReCap, Lumion, Enscape and Twinmotion, plus other AEC tools on request."],
  ["Who carries design responsibility?", "Work that needs a licensed engineer's or architect's stamp in your country is delivered under your design lead, or with a local licensed partner."],
  ["Do you train AI on our project data?", "No, not without your written permission. Client data is covered by NDA and access controls by default."],
  ["Where are you based, and who do you work with?", "We are based in Ahmedabad, India, and work with teams in the US, UK, Europe, Canada, Australia and the GCC."],
  ["Which standards do you follow?", "ISO 19650 information management, with BEP, EIR and OIR documents, plus your own office templates and standards."],
  ["Can you train our team?", "Yes. Enhcept Academy runs courses in Revit, Navisworks, AutoCAD, Civil 3D, Tekla, Dynamo and Python, BIM management and AI for AEC, plus corporate and college programmes."],
  ["What happens after I send an enquiry?", "A lead from the right division reads your brief and replies to you directly, usually with questions or a short call to scope the work."],
];

export function Faq() {
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="wrap faq-wrap">
        <div className="faq-head">
          <Label>08 · FAQ</Label>
          <h2 id="faq-title">What you <em>need</em> to know</h2>
          <p>Something else on your mind? Ask it in the project brief and the right lead will answer.</p>
          <a className="btn btn-navy" href="#contact">Ask us directly <span className="sq" aria-hidden="true" /></a>
        </div>
        <div className="faq">
          {FAQ.map(([q, a]) => (
            <details key={q} name="faq">
              <summary>{q}<i aria-hidden="true" /></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 09 Contact ---------- */

export function Contact() {
  return (
    <section className="section" id="contact" aria-labelledby="contact-title">
      <div className="wrap">
        <div className="contact">
          <div className="contact-head">
            <Label>09 · Start a project</Label>
            <h2 id="contact-title">Tell us what<br />you&rsquo;re <em>building.</em></h2>
            <p>Share a few details. The right lead from ConceptDrafter or ENHC will reply to you directly.</p>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-meta">
            <p>Enhcept</p>
            <p>A joint venture of Enhc Tech LLP and ConceptDrafter Solutions LLP</p>
            <p>Ahmedabad, Gujarat, India</p>
            <Clocks />
          </div>
          <div>
            <p className="foot-h">Divisions</p>
            <ul className="foot-list">
              {DIVISIONS.map((d) => (
                <li key={d.name}><a href="#divisions">{d.name}</a>{d.dev && <Status dev>In development</Status>}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="foot-h">Partners</p>
            <ul className="foot-list">
              {/* The ENHC wordmark is the link's name; the ConceptDrafter mark sits beside its name, so it is decorative. */}
              <li><a href="https://enhc.tech" target="_blank" rel="noopener"><Image className="foot-plogo" src="/img/partners/enhc.webp" width={55} height={18} alt="ENHC" />↗</a></li>
              <li><a href="https://conceptdrafter.com" target="_blank" rel="noopener"><Image className="foot-plogo" src="/img/partners/conceptdrafter-mark.webp" width={16} height={22} alt="" />ConceptDrafter ↗</a></li>
            </ul>
            <p className="foot-h">Get in touch</p>
            <a className="btn btn-red" href="#contact">Start a project <span className="sq" aria-hidden="true" /></a>
          </div>
        </div>
        <Logo className="foot-logo" />
        <div className="foot-legal">
          <p>© <Year /> Enhcept. All rights reserved.</p>
          <p>Software names are trademarks of their respective owners. Listing them does not imply a partnership.</p>
        </div>
      </div>
    </footer>
  );
}
