// Enhcept hero film: our house from a single-line concept to the full coordinated model (content in film.ts).
// Everything on screen is a pure function of film time t, so `?t=<s>` freezes any exact frame.
import {
  BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, InstancedBufferAttribute, InstancedMesh,
  LineSegments, Matrix4, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, Vector3, Vector4,
  WebGLRenderer,
} from "three";
import css from "./hero.module.css";
import * as F from "./film";
import { LINE_FS, LINE_VS, MARK_FS, MARK_VS, MODEL_FS, MODEL_VS } from "./shaders";
import { LOOP, STAGES, setActive, setSeeker, stageAt } from "./stages";

type V3 = F.V3;

/* ---------- instancing ---------- */
// Orientation so local Y = run direction (columns: images of local X, Y, Z).
const AXES: Record<F.Dir, [V3, V3, V3]> = {
  "+x": [[0, -1, 0], [1, 0, 0], [0, 0, 1]],  // rotZ(-90°): scale (h, L, w)
  "-x": [[0, 1, 0], [-1, 0, 0], [0, 0, 1]],  // rotZ(+90°)
  "+z": [[1, 0, 0], [0, 0, 1], [0, -1, 0]],  // rotX(+90°): scale (w, L, h)
  "-z": [[1, 0, 0], [0, 0, -1], [0, 1, 0]],  // rotX(-90°)
  "+y": [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  "-y": [[-1, 0, 0], [0, -1, 0], [0, 0, 1]], // rotZ(180°)
};
function instanced(geo: BufferGeometry, list: F.El[], mat: ShaderMaterial) {
  const n = list.length, mesh = new InstancedMesh(geo, mat, n), m = new Matrix4();
  const col = new Float32Array(n * 4), edge = new Float32Array(n * 4), time = new Float32Array(n * 3);
  list.forEach((e, i) => {
    const size = e.a.map((v, k) => Math.abs(e.b[k] - v)), [X, Y, Z] = AXES[e.dir], c = F.lerp3(e.a, e.b, 0.5);
    const along = (v: V3) => Math.abs(v[0]) * size[0] + Math.abs(v[1]) * size[1] + Math.abs(v[2]) * size[2];
    const sx = along(X), sy = along(Y), sz = along(Z);
    m.set(X[0] * sx, Y[0] * sy, Z[0] * sz, c[0], X[1] * sx, Y[1] * sy, Z[1] * sz, c[1], X[2] * sx, Y[2] * sy, Z[2] * sz, c[2], 0, 0, 0, 1);
    mesh.setMatrixAt(i, m);
    col.set([...F.rgb(e.fill), e.alpha], i * 4);
    edge.set([...F.rgb(e.edge), e.ai], i * 4);
    time.set([e.born, e.dur, e.layer], i * 3);
  });
  geo.setAttribute("aColor", new InstancedBufferAttribute(col, 4));
  geo.setAttribute("aEdge", new InstancedBufferAttribute(edge, 4));
  geo.setAttribute("aTime", new InstancedBufferAttribute(time, 3));
  mesh.frustumCulled = false;
  return mesh;
}
// Draw order inside the box mesh: solid kit first, ghostable shells (plinth, walls) last, so their faint edges
// blend over what is behind them instead of punching holes in it.
const RANK = [4, 0, 0, 5, 1, 2, 3]; // by layer: site, frame, slab, arch, mep, int, floor
const ORDER = F.boxes.map((_, i) => i).sort((a, b) => RANK[F.boxes[a].layer] - RANK[F.boxes[b].layer] || a - b);

/* ---------- mount ---------- */
/** Mounts the film into host; returns its cleanup, or null when WebGL2 is unavailable. */
export function mount(host: HTMLElement): (() => void) | null {
  const params = new URLSearchParams(location.search), q = params.get("t");
  const fixedT = q !== null && q.trim() !== "" && Number.isFinite(+q) ? Math.max(0, +q) : null;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, frozen = fixedT !== null || reduce;
  // ?rec=1: recording framing (tools/record-hero.mjs). Model centred in the full viewport, tags/markers/ink ×K.
  const rec = params.has("rec"), K = rec ? 1.4 : 1;

  // Create the context ourselves: no WebGL2 → quiet null (three would log errors before throwing).
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", { antialias: true, alpha: true, stencil: false });
  if (!context) return null;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, context, antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  canvas.className = css.canvas;
  host.appendChild(canvas);
  const hero = host.parentElement;

  const scene = new Scene(), cam = new OrthographicCamera(-1, 1, 1, -1, 1, 400);
  const TARGET = new Vector3(0, 3, 0), view = new Vector3(), basis = new Matrix4();
  const col3 = (h: number) => new Vector3(...F.rgb(h));
  const red = col3(F.RED);
  const shared = {
    uTime: { value: 0 }, uLine: { value: 1 }, uFix: { value: 1 }, uPage: { value: col3(F.PAGE) }, uRed: { value: red },
    uNavy: { value: col3(F.NAVY) }, uTint: { value: col3(F.STRUCT) }, uTintEdge: { value: col3(F.STRUCT_EDGE) },
    uFog: { value: new Vector2(96, 118) }, uView: { value: view },
    uL: { value: Array.from({ length: F.LAYERS }, () => new Vector4()) },
    uOff: { value: Array.from({ length: F.LAYERS }, () => new Vector3()) },
    uCut: { value: new Vector2(1e4, 1e4) },
  };
  const model = (cyl: boolean, clash = -1, beam = -1) => new ShaderMaterial({
    vertexShader: MODEL_VS, fragmentShader: MODEL_FS, transparent: true, defines: cyl ? { CYL: 1 } : {},
    uniforms: { ...shared, uClash: { value: new Vector4(clash, 0, 0, 0) }, uBeam: { value: beam } },
  });
  const boxMat = model(false, ORDER.indexOf(F.CLASH_ID), ORDER.indexOf(F.BEAM_ID));
  const boxMesh = instanced(new BoxGeometry(1, 1, 1), ORDER.map((i) => F.boxes[i]), boxMat);
  const cylMesh = instanced(new CylinderGeometry(0.5, 0.5, 1, 14, 1), F.cyls, model(true));
  const slabMesh = instanced(new BoxGeometry(1, 1, 1), F.slabs, model(false)); // last: their glass blends over all

  const lineGeo = new BufferGeometry();
  lineGeo.setAttribute("position", new Float32BufferAttribute(F.LP, 3));
  lineGeo.setAttribute("aColor", new Float32BufferAttribute(F.LC, 4));
  lineGeo.setAttribute("aLine", new Float32BufferAttribute(F.LD, 4));
  lineGeo.setAttribute("aAI", new Float32BufferAttribute(F.LA, 1));
  const lineMat = new ShaderMaterial({
    vertexShader: LINE_VS, fragmentShader: LINE_FS, transparent: true, depthWrite: false,
    uniforms: {
      uTime: shared.uTime, uRed: shared.uRed, uFade: { value: new Vector2(13, 21) }, uCut: { value: new Vector4(0, 1, 1e5, 2e5) },
      uGA: { value: new Array(F.LINE_GROUPS).fill(0) }, uGOff: { value: Array.from({ length: F.LINE_GROUPS }, () => new Vector3()) },
    },
  });
  const lines = new LineSegments(lineGeo, lineMat);
  lines.frustumCulled = false;

  const markGeo = new PlaneGeometry(1, 1);
  const marker = (kind: number, size: number, r: number) => {
    const mat = new ShaderMaterial({
      vertexShader: MARK_VS, fragmentShader: MARK_FS, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uPos: { value: new Vector3() }, uSize: { value: size }, uRes: { value: new Vector2(1, 1) }, uRed: { value: red }, uA: { value: 0 }, uKind: { value: kind }, uR: { value: r } },
    });
    const mesh = new Mesh(markGeo, mat);
    mesh.frustumCulled = false;
    return mesh;
  };
  const agent = marker(0, 64 * K, 4.5 * K), ring = marker(1, 96 * K, 13 * K);
  const drawn = [cylMesh, boxMesh, lines, slabMesh, ring, agent];
  drawn.forEach((o, i) => { o.renderOrder = i; scene.add(o); });

  /* HTML layer: labels (rooms, dimensions, grid bubbles), callout tags, and in recording mode the stage title */
  const overlay = document.createElement("div");
  overlay.className = css.overlay;
  overlay.style.setProperty("--k", String(K));
  host.appendChild(overlay);
  const el = (cls: string, html = "") => {
    const e = document.createElement("div");
    e.className = cls;
    e.innerHTML = html;
    overlay.appendChild(e);
    return e;
  };
  const labels = F.LABELS.map((l) => {
    const e = el(`${css.lab} ${css[l.kind]}`);
    e.textContent = l.text;
    return e;
  });
  const tags = F.TAGS.map((g) => {
    const e = el([css.tag, g.side > 0 ? css.r : g.side === 0 ? css.c : "", g.ai ? css.ai : ""].join(" "), `<i class="${css.dot}"></i><i class="${css.lead}"></i><span class="${css.label}"></span>`);
    return { e, label: e.lastElementChild as HTMLElement, shown: "" };
  });
  const title = rec ? el(css.title, `<p class="${css.titleKick}"><i></i><span></span></p><p class="${css.titleLine}"></p>`) : null;

  /* framing: fit the model into the band between the hero copy (and its stage rail) and the marquee */
  let W = 1, H = 1, oy = 0, tall = false, dpr = 1;
  const band = { l: 0, r: 1, t: 0, b: 1 }, bld = { l: 0, r: 0 };
  const placeCam = (az: number, elev: number) => {
    const ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(elev), se = Math.sin(elev);
    const back = new Vector3(sa * ce, se, ca * ce), right = new Vector3(ca, 0, -sa), up = new Vector3().crossVectors(back, right);
    cam.position.copy(TARGET).addScaledVector(back, 100);
    cam.quaternion.setFromRotationMatrix(basis.makeBasis(right, up, back));
    cam.updateMatrixWorld();
    view.copy(back);
  };
  function resize() {
    const r = host.getBoundingClientRect(), hh = Math.max(1, r.height);
    const copy = hero?.querySelector(".hero-copy")?.getBoundingClientRect();
    const marq = hero?.querySelector(".marquee")?.getBoundingClientRect();
    W = Math.max(1, r.width);
    let top = (copy ? copy.bottom - r.top : hh * 0.55) + 14, bottom = (marq ? marq.top - r.top : hh * 0.92) - 10;
    if (rec) { top = hh * 0.2; bottom = hh * 0.9; }
    oy = Math.max(0, top - 70); // nothing is drawn above the band: skipping those rows saves fill on DPR 2
    H = Math.max(1, hh - oy);
    canvas.style.top = `${oy}px`;
    canvas.style.height = `${H}px`;
    dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    const side = rec ? 160 : W >= 900 ? 90 : 14;
    Object.assign(band, { l: side, r: W - side, t: top - oy, b: bottom - oy });
    tall = (band.r - band.l) / Math.max(1, band.b - band.t) < 1.4;
    shared.uLine.value = (0.3 * dpr + 0.1) * K;
    const cut = rec ? 1e4 : band.b + 10, ct = rec ? -1e4 : band.t - 14; // ground lines fade out above the marquee and below the copy
    lineMat.uniforms.uCut.value.set((H - cut - 30) * dpr, (H - cut + 24) * dpr, (H - ct - 34) * dpr, (H - ct + 18) * dpr);
    agent.material.uniforms.uRes.value.set(W, H);
    ring.material.uniforms.uRes.value.set(W, H);
  }

  /* one frame of the film at time t */
  const par = { x: 0, y: 0 }, ptr = { x: 0, y: 0 }, v = new Vector3();
  const off = Array.from({ length: 5 }, () => [0, 0, 0] as V3);
  const toPx = (p: V3, o: V3 = [0, 0, 0]): [number, number] => { v.set(p[0] + o[0], p[1] + o[1], p[2] + o[2]).project(cam); return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H + oy]; };
  let stage = -1, shownP = -1;
  function frame(time: number) {
    const t = ((time % LOOP) + LOOP) % LOOP, st = F.state(t);
    for (let g = 0; g < 5; g++) off[g] = F.explodeOffset(g, st.explode, tall);
    placeCam((st.az + 2.5 * par.x) * F.DEG, Math.min(90, st.el - 1.2 * par.y) * F.DEG);

    // fit: project every layer's box (with its explode offset) and scale it into the band
    const box = [Infinity, -Infinity, Infinity, -Infinity], m = st.margin;
    bld.l = Infinity; bld.r = -Infinity;
    F.GROUP_BOX.forEach(([a, b], g) => {
      for (const x of [a[0] - m, b[0] + m]) for (const y of [Math.max(a[1], st.yLo), Math.min(b[1], st.yHi)]) for (const z of [a[2] - m, b[2] + m]) {
        v.set(x + off[g][0], y + off[g][1], z + off[g][2]).applyMatrix4(cam.matrixWorldInverse);
        box[0] = Math.min(box[0], v.x); box[1] = Math.max(box[1], v.x); box[2] = Math.min(box[2], v.y); box[3] = Math.max(box[3], v.y);
        if (g === 2) { bld.l = Math.min(bld.l, v.x); bld.r = Math.max(bld.r, v.x); }
      }
    });
    const bt = band.t + 44 * K * st.explode; // room for the layer tags above the fan
    const s = Math.min((band.r - band.l) / (box[1] - box[0]), Math.max(60, band.b - bt - 24 * K) / (box[3] - box[2]));
    const mx = (box[0] + box[1]) / 2, my = (box[2] + box[3]) / 2, cx = (band.l + band.r) / 2, cy = (bt + band.b) / 2;
    cam.left = mx - cx / s; cam.right = cam.left + W / s;
    cam.top = my + cy / s; cam.bottom = cam.top - H / s;
    cam.updateProjectionMatrix();
    bld.l = cx + (bld.l - mx) * s; bld.r = cx + (bld.r - mx) * s;

    shared.uTime.value = t;
    shared.uFix.value = st.fix;
    shared.uCut.value.set(st.cutY, st.cutZ);
    for (let i = 0; i < F.LAYERS; i++) {
      shared.uL.value[i].fromArray(st.layers, i * 4);
      shared.uOff.value[i].set(...off[F.GROUP[i]]);
    }
    boxMat.uniforms.uClash.value.set(boxMat.uniforms.uClash.value.x, st.flash, F.T_CUT, F.T_CUT + 0.22);
    lineMat.uniforms.uGA.value = st.lines;
    lineMat.uniforms.uGOff.value.forEach((o: Vector3, i: number) => o.set(...off[F.LINE_TO_GROUP[i]]));
    agent.material.uniforms.uPos.value.set(...st.agent);
    agent.material.uniforms.uA.value = st.agentA;
    ring.material.uniforms.uPos.value.set(F.CLASH_P[0] + off[3][0], F.CLASH_P[1] + off[3][1], F.CLASH_P[2] + off[3][2]);
    ring.material.uniforms.uA.value = st.ringA;
    ring.material.uniforms.uR.value = K * st.ringR;
    renderer.render(scene, cam);

    F.LABELS.forEach((l, i) => {
      const [x, y] = toPx(l.at), a = F.smooth(l.t0, l.t1, t) * (1 - F.smooth(l.t2, l.t3, t));
      labels[i].style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${K})`;
      labels[i].style.opacity = a.toFixed(3);
    });
    F.TAGS.forEach((g, i) => {
      const tag = tags[i], [x, y] = toPx(g.at, off[g.group]), k = F.clamp01((t - g.t) / 0.45);
      const text = g.text.slice(0, Math.round(k * g.text.length)) + (g.then && g.t2 !== undefined && t >= g.t2 ? g.then.slice(0, Math.round(F.clamp01((t - g.t2) / 0.3) * g.then.length)) : "");
      if (text !== tag.shown) tag.label.textContent = tag.shown = text;
      const len = g.side === 0 ? 16 * K : Math.max(24, g.side < 0 ? x - (bld.l - 26) : bld.r + 26 - x);
      const w = ((g.text.length + (g.then?.length ?? 0)) * 7.14 + 24) * K; // mono label width (10.5px, 0.08em tracking)
      const fits = g.side === 0 ? x - w / 2 > 8 && x + w / 2 < W - 8 : g.side < 0 ? x - len - w > 8 : x + len + w < W - 8;
      tag.e.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      tag.e.style.setProperty("--len", `${len.toFixed(1)}px`);
      tag.e.style.opacity = fits ? (F.smooth(g.t - 0.05, g.t + 0.25, t) * (1 - F.smooth(g.out[0], g.out[1], t))).toFixed(3) : "0";
    });

    const i = stageAt(t), S = STAGES[i];
    if (i !== stage) {
      stage = i;
      setActive(i);
      if (title) {
        (title.querySelector("span") as HTMLElement).textContent = `${S.n} · ${S.name.toUpperCase()}`;
        (title.lastElementChild as HTMLElement).textContent = S.line;
      }
    }
    const p = reduce ? 1 : F.clamp01((t - S.start) / (S.end - S.start));
    if (Math.abs(p - shownP) > 0.004) hero?.style.setProperty("--hero-p", (shownP = p).toFixed(3));
  }

  /* clock: live film (a rail click jumps and holds), or frozen at ?t= / the reduced-motion still */
  let clock = 0, last = 0, raf = 0, running = false, inView = true, holdAt = -1, holdUntil = 0;
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    clock += dt;
    if (holdAt >= 0) { if (now < holdUntil) clock = Math.min(clock, holdAt); else holdAt = -1; }
    const k = 1 - Math.exp(-dt * 2.5);
    par.x += (ptr.x - par.x) * k;
    par.y += (ptr.y - par.y) * k;
    frame(clock);
  };
  const sync = () => {
    const live = !frozen && inView && !document.hidden;
    if (live && !running) { running = true; last = 0; raf = requestAnimationFrame(tick); }
    else if (!live && running) { running = false; cancelAnimationFrame(raf); }
  };
  let still = F.STILL;
  const redraw = () => { resize(); frame(frozen ? fixedT ?? still : clock); };
  const onPtr = (e: PointerEvent) => { ptr.x = (e.clientX / innerWidth) * 2 - 1; ptr.y = (e.clientY / innerHeight) * 2 - 1; };
  setSeeker((i) => {
    if (fixedT !== null) return;                       // ?t= frames are driven by __heroSeek only
    if (reduce) { still = F.STILLS[i]; frame(still); return; } // reduced motion: that stage's still
    clock = STAGES[i].start; holdAt = F.HOLDS[i]; holdUntil = performance.now() + 8000;
    if (!running) frame(clock);
  });

  const ro = new ResizeObserver(redraw);
  ro.observe(host);
  const copyEl = hero?.querySelector(".hero-copy");
  if (copyEl) ro.observe(copyEl);
  const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); });
  io.observe(host);
  document.addEventListener("visibilitychange", sync);
  if (!frozen) addEventListener("pointermove", onPtr, { passive: true });
  // Recording hook: in ?t= mode, step the film without reloading the page.
  const hook = window as unknown as { __heroSeek?: (t: number) => void };
  if (fixedT !== null) hook.__heroSeek = (s: number) => frame(s);
  redraw();
  sync();

  return () => {
    setSeeker(null);
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    document.removeEventListener("visibilitychange", sync);
    removeEventListener("pointermove", onPtr);
    delete hook.__heroSeek;
    hero?.style.removeProperty("--hero-p");
    for (const o of drawn) {
      if (o instanceof InstancedMesh) o.dispose();
      o.geometry.dispose();
      (o.material as ShaderMaterial).dispose();
    }
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    overlay.remove();
  };
}
