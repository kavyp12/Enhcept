import HeroStage from "./hero/HeroStage";
import StageRail from "./hero/StageRail";

const TOOLS = ["Revit", "AutoCAD", "Navisworks", "Civil 3D", "Tekla Structures", "Advance Steel", "Archicad", "MicroStation", "Rhino", "SketchUp", "ACC / BIM 360", "ReCap", "Lumion", "Enscape", "Twinmotion"];

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <HeroStage />
      <div className="hero-copy wrap">
        <p className="kicker">
          <span className="sq" aria-hidden="true" />
          ENHC <span className="x">×</span> ConceptDrafter
        </p>
        <h1 id="hero-title">
          Drafting tomorrow&rsquo;s concepts, <em>enhanced&nbsp;by&nbsp;AI.</em>
        </h1>
        <p className="lede">
          ConceptDrafter&rsquo;s BIM and engineering teams, accelerated by ENHC&rsquo;s AI and software. One partner for architecture, structure, MEP and civil, from first concept to as&#8209;built.
        </p>
        <div className="cta-row">
          <a className="btn btn-red" href="#contact">
            Start a project <span className="sq" aria-hidden="true" />
          </a>
          <a className="btn btn-ghost" href="#ai">See AI in the model</a>
        </div>
        <StageRail />
      </div>
      <div className="marquee">
        <p className="marquee-label">Working inside the tools your team already uses</p>
        <div className="marquee-view">
          <ul className="marquee-track" aria-label="Software we work in">
            {TOOLS.map((t) => <li key={t}>{t}</li>)}
            {TOOLS.map((t) => <li key={t + "-2"} aria-hidden="true">{t}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
