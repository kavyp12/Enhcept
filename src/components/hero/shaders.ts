// GLSL for the hero film (scene.ts). WebGL2; three.js adds the version header and in/out mapping.

/* Instanced unit boxes / cylinders that grow along local Y from -0.5. Per instance: fill, edge + AI flag, and
   (born, duration, layer). Per layer: fill alpha, edge alpha, structure tint, cut mode, and an explode offset. */
export const MODEL_VS = /* glsl */ `
attribute vec4 aColor;
attribute vec4 aEdge;
attribute vec3 aTime;
uniform float uTime;
uniform vec4 uClash;   // duct id, hot, retract start, retract end
uniform float uBeam;   // the beam it clashes with
uniform vec4 uL[7];    // per layer: fill alpha, edge alpha, tint, cut (0 off, 0.5 cut, 1 cut + poche)
uniform vec3 uOff[7];  // per layer: explode offset
uniform vec2 uCut;     // horizontal cut height, section cut (max world z)
varying vec2 vUv;
varying vec3 vN;
varying vec4 vColor;
varying vec4 vEdge;
varying vec4 vLay;
varying float vPass;
varying float vDepth;
varying float vHot;
varying float vSide;
varying float vPoche;
void main() {
  int L = int(aTime.z + 0.5);
  vLay = uL[L];
  float g = clamp((uTime - aTime.x) / aTime.y, 0.0, 1.0);
  if (aEdge.w < 0.5) g = 1.0 - (1.0 - g) * (1.0 - g) * (1.0 - g);
  bool clash = gl_InstanceID == int(uClash.x + 0.5);
  if (clash) g *= 1.0 - smoothstep(uClash.z, uClash.w, uTime);
  float f = (position.y + 0.5) * g;              // grow along local Y from -0.5
  vec4 w = modelMatrix * instanceMatrix * vec4(position.x, f - 0.5, position.z, 1.0);
  // Cut planes: an instance wholly past a plane is hidden; one that straddles it is clamped to a flat cut face.
  vec3 c = instanceMatrix[3].xyz;
  vec3 hx = 0.5 * (abs(instanceMatrix[0].xyz) + abs(instanceMatrix[1].xyz) + abs(instanceMatrix[2].xyz));
  float on = step(0.25, vLay.w);
  float cy = mix(1e4, uCut.x, on), cz = mix(1e4, uCut.y, on);
  bool gone = g <= 0.0 || vLay.x + vLay.y < 0.003 || c.y - hx.y > cy - 0.002 || c.z - hx.z > cz - 0.002;
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vPoche = step(0.75, vLay.w) * max(step(cy, c.y + hx.y) * step(0.5, vN.y), step(cz, c.z + hx.z) * step(0.5, vN.z));
  w.y = min(w.y, cy);
  w.z = min(w.z, cz);
  w.xyz += uOff[L];
  vec4 mv = viewMatrix * w;
  gl_Position = gone ? vec4(0.0, 0.0, 2.0, 1.0) : projectionMatrix * mv;
  vUv = uv;
  vColor = aColor;
  vEdge = aEdge;
  vPass = aTime.x + f * aTime.y;                 // when this point was drawn
  vDepth = -mv.z;
  vHot = clash ? uClash.y : gl_InstanceID == int(uBeam + 0.5) ? uClash.y * step(uTime, uClash.z) * 0.8 : 0.0;
  vSide = 1.0 - abs(normal.y);
}`;

export const MODEL_FS = /* glsl */ `
uniform float uTime;
uniform float uLine;
uniform float uFix;
uniform vec3 uPage;
uniform vec3 uRed;
uniform vec3 uNavy;
uniform vec3 uTint;
uniform vec3 uTintEdge;
uniform vec2 uFog;
uniform vec3 uView;
varying vec2 vUv;
varying vec3 vN;
varying vec4 vColor;
varying vec4 vEdge;
varying vec4 vLay;
varying float vPass;
varying float vDepth;
varying float vHot;
varying float vSide;
varying float vPoche;
void main() {
  vec3 n = normalize(vN);
#ifdef CYL
  float d = vSide > 0.5 ? min(vUv.y, 1.0 - vUv.y) / max(fwidth(vUv.y), 1e-6) : 1e3;
  float nv = dot(n, uView);
  d = min(d, abs(nv) / max(fwidth(nv), 1e-6));
#else
  vec2 e2 = min(vUv, 1.0 - vUv) / max(fwidth(vUv), vec2(1e-6));
  float d = min(e2.x, e2.y);
#endif
  float edge = 1.0 - smoothstep(uLine - 0.5, uLine + 0.5, d);

  // drafted -> modelled: the fill dithers in (interleaved gradient noise) just behind the drawn edge
  float fill = clamp((uTime - vPass - 0.12) / 0.55, 0.0, 1.0);
  float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float fa = (ign < fill ? 1.0 : 0.0) * vColor.a * vLay.x;

  float wake = min(vEdge.w, 1.0) * (1.0 - smoothstep(0.0, 0.9, uTime - vPass));
  if (vEdge.w > 1.5) wake = max(wake, 0.75 * uFix);
  float hot = max(wake, vHot);
  vec3 ec = mix(mix(vEdge.rgb, uTintEdge, vLay.z), uRed, hot);
  float ea = edge * mix(vColor.a < 0.99 ? 0.5 : 0.88, 1.0, hot) * vLay.y;

  vec3 fc = mix(vColor.rgb, uTint, vLay.z) * (0.86 + 0.14 * n.y + 0.05 * n.x - 0.02 * n.z);
  fc = mix(fc, uRed, 0.22 * vHot);
  fc = mix(fc, uNavy, 0.82 * vPoche);            // cut faces: solid navy poche, as on a drawing
  float a = ea + fa * (1.0 - ea);
  if (a < 0.003) discard;
  vec3 col = (ec * ea + fc * fa * (1.0 - ea)) / a;
  col = mix(col, uPage, smoothstep(uFog.x, uFog.y, vDepth) * 0.45);
  gl_FragColor = vec4(col, a);
}`;

/* Ground lines: per-vertex reveal time, distance along (for dash patterns), pattern, group; AI flag (red while fresh). */
export const LINE_VS = /* glsl */ `
attribute vec4 aColor;
attribute vec4 aLine;
attribute float aAI;
uniform float uGA[5];   // per line group: alpha
uniform vec3 uGOff[5];  // per line group: explode offset
varying vec4 vColor;
varying vec3 vLine;
varying vec2 vXZ;
varying float vAI;
void main() {
  int G = int(aLine.w + 0.5);
  vColor = vec4(aColor.rgb, aColor.a * uGA[G]);
  vLine = aLine.xyz; vXZ = position.xz; vAI = aAI;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position + uGOff[G], 1.0);
}`;

export const LINE_FS = /* glsl */ `
uniform float uTime;
uniform vec2 uFade;
uniform vec4 uCut;
uniform vec3 uRed;
varying vec4 vColor;
varying vec3 vLine;
varying vec2 vXZ;
varying float vAI;
void main() {
  if (vLine.x > uTime) discard;                  // per-vertex reveal: the line draws itself
  float m;
  if (vLine.z > 2.5) { if (mod(vLine.y, 2.4) > 1.5) discard; }                       // centre line
  else if (vLine.z > 1.5) { m = mod(vLine.y, 1.9); if ((m > 1.25 && m < 1.45) || m > 1.65) discard; } // dash-dot
  else if (vLine.z > 0.5) { if (mod(vLine.y, 0.8) > 0.5) discard; }                  // dashed
  float a = vColor.a * (1.0 - smoothstep(uFade.x, uFade.y, length(vXZ * vec2(0.8, 1.0))));
  a *= smoothstep(uCut.x, uCut.y, gl_FragCoord.y) * (1.0 - smoothstep(uCut.z, uCut.w, gl_FragCoord.y)); // clear of marquee + copy
  if (a < 0.003) discard;
  float wake = vAI * (1.0 - smoothstep(0.0, 0.6, uTime - vLine.x));
  gl_FragColor = vec4(mix(vColor.rgb, uRed, wake), a);
}`;

// Screen-aligned marker (size in CSS px): kind 0 = the AI square with a soft glow, 1 = the clash ring.
export const MARK_VS = /* glsl */ `
uniform vec3 uPos;
uniform float uSize;
uniform vec2 uRes;
varying vec2 vP;
void main() {
  vP = position.xy * uSize;
  vec4 c = projectionMatrix * viewMatrix * vec4(uPos, 1.0);
  c.xy += position.xy * uSize * 2.0 / uRes * c.w;
  gl_Position = c;
}`;

export const MARK_FS = /* glsl */ `
uniform vec3 uRed;
uniform float uA;
uniform float uKind;
uniform float uR;
varying vec2 vP;
void main() {
  float a;
  if (uKind < 0.5) {
    float body = 1.0 - smoothstep(uR - 0.7, uR + 0.7, max(abs(vP.x), abs(vP.y)));
    a = max(body, exp(-dot(vP, vP) / (8.8 * uR * uR)) * 0.4);
  } else {
    float r = length(vP);
    a = 1.0 - smoothstep(0.55, 1.4, abs(r - uR));
    vec2 q = abs(vP);
    float tick = (1.0 - smoothstep(0.45, 1.1, min(q.x, q.y))) * step(uR + 3.0, max(q.x, q.y)) * step(max(q.x, q.y), uR + 8.0);
    a = max(max(a, tick), exp(-r * r / (2.0 * uR * uR)) * 0.16);
  }
  gl_FragColor = vec4(uRed, a * uA);
}`;
