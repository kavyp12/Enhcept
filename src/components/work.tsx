import LazyVideo from "./LazyVideo";
import PluginDemo from "./PluginDemo";
import { SecHead, Status } from "./ui";

/* ---------- 03 AI in the model ---------- */

function Mock({ tag, title, text, children }: { tag: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <article className="card mock" data-reveal>
      <div className="mock-view">{children}</div>
      <div className="mock-copy">
        <p className="mock-tag">{tag}</p>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

function Log({ items }: { items: string[] }) {
  return (
    <p className="mock-log">
      <span className="sq" aria-hidden="true" />
      {items.map((t, i) => <span key={t} className={`log-${i}`}>{t}</span>)}
    </p>
  );
}

function ClashMock() {
  return (
    <>
      <svg className="m-svg m-clash" viewBox="0 0 520 250" aria-hidden="true">
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0V8" className="hatch-line" />
          </pattern>
        </defs>
        <g className="slab"><rect x="30" y="34" width="460" height="22" /><rect x="30" y="34" width="460" height="22" fill="url(#hatch)" /></g>
        <g className="beam"><rect x="226" y="56" width="68" height="78" /><text x="302" y="84">B-3 · 300×700</text></g>
        <g className="duct-old"><rect x="30" y="102" width="460" height="40" /><text x="44" y="126">SA-02 · 1200×400</text></g>
        <rect className="clash-zone" x="226" y="102" width="68" height="32" />
        <path className="duct-new" pathLength={1} d="M30 102H186L204 156H316L334 102H490V142H334L316 196H204L186 142H30Z" />
        <g className="drop-dim"><path d="M398 142V196M392 146L404 138M392 192L404 200M394 196H420" /><text x="408" y="174">−540</text></g>
        <g className="marker"><rect x="248" y="106" width="24" height="24" /><text x="260" y="123">!</text></g>
        <g className="tick"><circle cx="260" cy="80" r="13" /><path d="M253 80L258 85L267 75" /></g>
      </svg>
      <ul className="clash-list">
        <li><b>CL-014</b><span>Duct SA-02 × Beam B-3</span><em className="st st-flip"><i className="st-open">Open</i><i className="st-done">Resolved</i></em></li>
        <li><b>CL-015</b><span>CHW pipe × Cable tray</span><em className="st">Resolved</em></li>
        <li><b>CL-016</b><span>Sprinkler × Duct RA-01</span><em className="st">Resolved</em></li>
      </ul>
    </>
  );
}

function CivilMock() {
  return (
    <svg className="m-svg m-civil" viewBox="0 0 520 330" aria-hidden="true">
      <g className="contours">
        {[
          "M-10 52C70 30 150 70 240 54S410 26 530 50",
          "M-10 84C80 62 160 104 250 88S420 58 530 84",
          "M-10 116C90 96 170 140 262 122S430 92 530 118",
          "M-10 150C96 132 180 176 272 158S440 128 530 154",
          "M-10 186C100 170 188 214 282 196S448 166 530 192",
        ].map((d, i) => <path key={d} className={`draw k${i + 1}`} pathLength={1} d={d} />)}
        <g className="levels">
          <text x="456" y="46">104.0</text><text x="456" y="80">103.5</text><text x="456" y="113">103.0</text><text x="456" y="148">102.5</text><text x="456" y="184">102.0</text>
        </g>
      </g>
      <g className="cutfill"><path className="cut" d="M300 70h112v70H300z" /><path className="fill" d="M300 140h112v34H300z" /></g>
      <g className="pad"><rect x="312" y="84" width="88" height="70" /><text x="356" y="124">FFL 104.50</text></g>
      <g className="road">
        <path className="draw edge e1" pathLength={1} d="M-10 262C110 246 200 214 300 222S440 262 530 246" />
        <path className="draw edge e2" pathLength={1} d="M-10 298C110 282 200 250 300 258S440 298 530 282" />
        <path className="draw cl" pathLength={1} d="M-10 280C110 264 200 232 300 240S440 280 530 264" />
      </g>
      <g className="chain"><path d="M80 260V280M180 240V258M290 228V246M400 250V268" /><text x="80" y="316">CH 0+050</text><text x="180" y="296">0+100</text><text x="290" y="284">0+150</text><text x="400" y="306">0+200</text></g>
      <g className="utils"><path className="draw w" pathLength={1} d="M330 154V236" /><path className="draw s" pathLength={1} d="M380 154V250" /><text x="336" y="200">W</text><text x="386" y="214">S</text></g>
    </svg>
  );
}

export function AiModel() {
  return (
    <section className="section white" id="ai" aria-labelledby="ai-title">
      <div className="wrap">
        <SecHead label="03 · AI in the model" id="ai-title" title={<>Engineers set the standard.<br /><em>AI does the repetition.</em></>}
          sub="Architecture, structure, MEP and civil in one workflow. The AI reads the inputs, Revit builds the model by itself, and an engineer checks every result before it leaves the building." />

        <article className="card plugin" data-reveal>
          <div className="plugin-copy">
            <div>
              <p className="mock-tag">Revit · Enhcept plugin</p>
              <h3>One click, and the model <em>documents itself.</em></h3>
            </div>
            <div>
              <Status>Live · Expanding</Status>
              <p>Dimensions, tags, grids and marks on the plan, then elevations, sections and sheets, all from the model. Our own add-ins already place dimensions, tags, elevations and sheets on real jobs, built to cut modelling time by up to 40%. An engineer checks every sheet before it is issued.</p>
            </div>
          </div>
          <PluginDemo />
          <p className="plugin-cap">How the Enhcept Revit plugin documents a model. Illustration.</p>
        </article>

        <article className="card feature" data-reveal>
          <div className="feature-copy">
            <Status>Real work · sample house</Status>
            <h3>From a 2D plan to a Revit model, <em>built by itself.</em></h3>
            <p>Our pipeline reads plans and phone LiDAR scans. Our Revit add-in builds the walls, doors, windows, rooms, tags, dimensions and sheets. Then an engineer checks every dimension against the site.</p>
            <ol className="steps">
              {["Collect plans, photos or a LiDAR scan", "AI reads and aligns the inputs", "Revit builds the model by itself", "An engineer checks and issues it"].map((s, i) => (
                <li key={s}><b>0{i + 1}</b>{s}</li>
              ))}
            </ol>
          </div>
          <div className="feature-media">
            <LazyVideo src="/media/plan-to-model.mp4" poster="/media/plan-to-model.jpg" label="A 2D floor plan turning into a 3D Revit model of a sample house" />
            <span className="media-tag">Sample house · Revit</span>
          </div>
        </article>

        <div className="mocks">
          <Mock tag="AI · MEP × Structure" title="Clash detection & re-routing" text="Federated models checked for clashes, with fixes proposed and tracked as BCF issues your team can accept or reject.">
            <ClashMock />
          </Mock>
          <Mock tag="Civil 3D · Survey · GIS" title="Civil & site models" text="Topography, grading, roads and utilities modelled from survey, drone and GIS data, linked to the building model.">
            <CivilMock />
            <Log items={["Contours 0.5 m", "Cut / fill", "Alignment"]} />
          </Mock>
        </div>
      </div>
    </section>
  );
}

/* ---------- 04 Real work (LODM500, cleared by the client in writing) ---------- */

function Triptych({ name, title, text, labels }: { name: string; title: string; text: string; labels: string[] }) {
  return (
    <figure className="card trip" data-reveal>
      <div className="trip-media">
        <LazyVideo src={`/media/${name}.mp4`} poster={`/media/${name}.jpg`} label={`${title}: ${labels.join(", ")}`} />
        <div className="trip-labels" aria-hidden="true">{labels.map((l) => <span key={l}>{l}</span>)}</div>
      </div>
      <figcaption><h3>{title}</h3><p>{text}</p></figcaption>
    </figure>
  );
}

const CASE_STATS = [
  ["9", "real wall layers: brick, plaster, putty, primer and paint as separate materials"],
  ["97", "Revit families made from scratch"],
  ["626", "elements, each with its own ID"],
  ["33", "drawing sheets"],
];

export function RealWork() {
  return (
    <section className="section" id="work" aria-labelledby="work-title">
      <div className="wrap">
        <SecHead label="04 · Real work" id="work-title" title={<>One PDF in.<br /><em>A LOD 450 model out.</em></>}
          sub="A client sent a single PDF of 2D plans for a house. The AI read it and built a full, editable Revit model, then our team checked it." />

        <article className="card case" data-reveal>
          <div className="case-media">
            <LazyVideo src="/media/case-reel.mp4" poster="/media/case-reel.jpg" label="The house model: structure building up, plumbing x-ray, wall layers, x-ray view and a 360° orbit" />
            <span className="media-tag">Real project · Revit</span>
          </div>
          <div className="case-copy">
            <Status>Real project · private house</Status>
            <h3 className="case-title">1 PDF <span aria-label="to">→</span> LOD 450 BIM model</h3>
            <dl className="case-stats">
              {CASE_STATS.map(([n, t]) => <div key={n}><dt>{n}</dt><dd>{t}</dd></div>)}
            </dl>
            <ul className="case-list">
              <li>Market-size doors and windows with frame, shutter, glass, hardware, IS code, price range and supplier data</li>
              <li>Linked structure and plumbing models, clash check and IFC export</li>
            </ul>
            <p className="case-note">LOD 450 is our own label: geometry at LOD 400, with information well beyond it. It is not LOD 500, which means a verified as-built.</p>
          </div>
        </article>

        <div className="trips">
          <Triptych name="lod-ladder" title="The LOD ladder" text="Massing, then a detailed white model, then materials and colour." labels={["Mass", "White model", "Colour"]} />
          <Triptych name="xray" title="X-ray views" text="See through the walls to the frame and the services inside." labels={["Realistic", "Walls as glass", "Structure only"]} />
        </div>
      </div>
    </section>
  );
}
