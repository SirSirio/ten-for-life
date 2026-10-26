/* Exercise figures: one stick-figure rig, posed and animated per exercise.
   A pose is a set of absolute segment angles in degrees: 0 points down, 90 points right (the way the figure faces),
   180 up, -90 left. Bones keep their length, so poses stay anatomically plausible while they interpolate.
   Side view by default (far-side limbs drawn fainter); front view for movements in the frontal plane.
   Each frame: pose fields + d (seconds to move to the next frame) + hold (seconds to stay first).
   Optional per pose: st, sn (torso and neck length factors) and sa, sl (arm and leg segment factors), to foreshorten a
   segment that points toward the viewer.
   Spec options: view, ground (false = float), pin [joint, x, y], box (viewBox crop), ft (foot length), noEye, props. */
const FIG = (() => {
  const W = 160, H = 120, GROUND = 112, R = 6.5;
  const L = {t: 30, n: 10, u: 16, f: 15, h: 21, s: 21, ft: 6};
  const D = {t: 180, h: 180, a: [0, 0, 0, 0], l: [0, 0, 0, 0], c: 0, b: 0, lift: 0, hy: 0, ox: 0, oy: 0, st: 1, sn: 1, sa: [1, 1, 1, 1], sl: [1, 1, 1, 1]};
  const rad = Math.PI / 180;
  const P = (p, a, len) => [p[0] + len * Math.sin(a * rad), p[1] + len * Math.cos(a * rad)];
  const pose = (...parts) => Object.assign({}, D, ...parts);

  // shared starting positions
  const STAND = {};
  const SEAT = {a: [25, 100, 25, 100], l: [80, -100, 72, -95]};                 // cross-legged
  const BELLY = {a: [-12, 72, 4, 4], sa: [1, .8, 1, 1]};                            // standing, near hand resting on the belly
  const QUAD = {t: 110, h: 100, l: [0, -90, 0, -90]};                             // hands and knees
  const SQUAT = {t: 156, h: 168, a: [62, 100, 62, 100], l: [104, -28, 104, -28]};
  const SUPINE = {t: -90, h: -90, a: [90, 90, 90, 90], l: [135, 32, 135, 32]};   // on the back, knees bent, head left

  const BDJ1 = {view: "front", frames: [
    pose({a: [15, -70, -15, 70], d: 1.6, hold: .3}),
    pose({a: [40, -125, -40, 125], d: 1.2}),
    pose({a: [165, 200, -165, -200], d: 1.5, hold: 1.2}),
    pose({a: [95, 95, -95, -95], d: 1.6})]};

  const SPECS = {
    breath_slow: {props: ["breath"], frames: [pose(BELLY, {b: 0, d: 4}), pose(BELLY, {b: 1, a: [-8, 66, 6, 6], d: 6})]},
    breath_sigh: {props: ["breath"], frames: [pose(BELLY, {b: 0, d: 2, hold: 1}), pose(BELLY, {b: .75, a: [-9, 68, 5, 5], d: .5}), pose(BELLY, {b: 1, a: [-7, 65, 6, 6], d: 5})]},
    catcamel: {frames: [pose(QUAD, {d: 1}), pose(QUAD, {c: 9, h: 25, d: 1.2, hold: 1}), pose(QUAD, {d: 1}), pose(QUAD, {c: -7, h: 150, d: 1.2, hold: 1})]},
    birddog: {frames: [
      pose(QUAD, {d: 1}), pose(QUAD, {a: [105, 105, 0, 0], l: [0, -90, -75, -75], d: 1, hold: 2}),
      pose(QUAD, {d: 1}), pose(QUAD, {a: [0, 0, 105, 105], l: [-75, -75, 0, -90], d: 1, hold: 2})]},
    sideplank: {frames: [
      pose({t: -114, h: -114, a: [0, -90, 66, 66], l: [84, 84, 84, 84], d: 1, hold: .5}),
      pose({t: -103, h: -103, a: [0, -90, 77, 77], l: [77, 77, 77, 77], d: 1, hold: 2.5})]},
    balance: {frames: [pose({d: .8, hold: .4}), pose({l: [28, -12, 0, 0], a: [10, 10, -10, -10], d: .8, hold: 3})]},
    sitrise: {frames: [pose({d: 1.2, hold: .6}), pose(SQUAT, {a: [80, 90, 80, 90], d: 1}), pose(SEAT, {d: 1.2, hold: 1}), pose(SQUAT, {a: [80, 90, 80, 90], d: 1.2})]},
    hang: {ground: false, pin: ["haN", 80, 10], props: ["bar"], frames: [
      pose({t: 178, h: 178, a: [180, 180, 180, 180], l: [3, -4, 6, -8], d: 1.6}),
      pose({t: 182, h: 181, a: [180, 180, 180, 180], l: [-1, -2, 2, -5], d: 1.6})]},
    wall_slide: {view: "front", props: ["wallback"], frames: [
      pose({a: [50, 160, -50, -160], d: 1.4, hold: .4}), pose({a: [150, 170, -150, -170], d: 1.4, hold: .4})]},
    hip9090: {view: "front", frames: [
      pose({a: [25, 10, -25, -10], l: [107, -20, 133, -55], sl: [1, .45, .85, 1], d: 1.2, hold: 1}),
      pose({a: [25, 10, -25, -10], l: [160, 24, -160, -24], d: 1.2}),
      pose({a: [25, 10, -25, -10], l: [-133, 55, -107, 20], sl: [.85, 1, 1, .45], d: 1.2, hold: 1}),
      pose({a: [25, 10, -25, -10], l: [160, 24, -160, -24], d: 1.2})]},
    hipflexor: {frames: [
      pose({a: [10, 10, 10, 10], l: [90, 0, 0, -90], d: 1.2, hold: .5}),
      pose({a: [172, 176, 172, 176], l: [72, -12, -28, -95], d: 1.2, hold: 2})]},
    armswing: {frames: [
      pose({a: [90, 95, 90, 95], l: [8, -8, 8, -8], d: .9}), pose({a: [-40, -35, -40, -35], l: [8, -8, 8, -8], d: .9})]},
    calfraise: {ft: 10, props: [["wall", "maxX", 1]], frames: [
      pose({a: [70, 95, 0, 0], l: [0, 0, 12, -60], d: .8, hold: .2}),
      pose({a: [70, 95, 0, 0], l: [0, 0, 12, -60], fa: [28, null], d: .8, hold: .5})]},
    bdj1: BDJ1,
    zhan: {view: "front", props: ["breath"], frames: [
      pose({a: [60, -110, -60, 110], l: [8, -8, -8, 8], b: 0, d: 4}), pose({a: [62, -108, -62, 108], l: [12, -12, -12, 12], b: 1, d: 4})]},
    splitsquat: {frames: [
      pose({t: 178, l: [30, -10, -30, -30], d: 1.2, hold: .3}), pose({t: 176, l: [85, -20, -42, -42], d: 1.5, hold: .6})]},
    wrist: {frames: [pose(QUAD, {d: 1}), pose(QUAD, {t: 106, a: [-25, -25, -25, -25], l: [-15, -90, -15, -90], d: 1})]},
    tib: {ft: 10, props: [["wall", "minX", -1]], frames: [
      pose({t: 192, h: 190, a: [10, 10, 10, 10], l: [12, 12, 12, 12], d: .7}),
      pose({t: 192, h: 190, a: [10, 10, 10, 10], l: [12, 12, 12, 12], fa: [150, 150], d: .7})]},
    bdj2: {view: "front", frames: [
      pose({a: [60, -100, -60, 100], l: [40, -15, -40, 15], d: 1, hold: .3}),
      pose({a: [90, -88, -92, -92], l: [40, -15, -40, 15], d: 1.2, hold: 1.5}),
      pose({a: [60, -100, -60, 100], l: [40, -15, -40, 15], d: 1, hold: .3}),
      pose({a: [92, 92, -90, 88], l: [40, -15, -40, 15], d: 1.2, hold: 1.5})]},
    wgs: {frames: [
      pose({t: 115, h: 105, a: [8, 0, 8, 0], l: [80, -15, -70, -70], d: 1, hold: .8}),
      pose({t: 115, h: 120, a: [8, 0, 185, 185], l: [80, -15, -70, -70], d: 1, hold: 1.5})]},
    shoulderCARs: {frames: [
      pose({a: [0, 0, 0, 0], d: .9}), pose({a: [90, 90, 0, 0], d: .9}), pose({a: [180, 180, 0, 0], d: .9}),
      pose({a: [270, 270, 0, 0], d: .9}), pose({a: [360, 360, 0, 0], d: 0})]},
    squat_hold: {frames: [pose({d: 1.2, hold: .5}), pose(SQUAT, {d: 1.2, hold: 3})]},
    owl: {view: "front", frames: [
      pose({a: [8, 8, -8, -8], hy: 0, d: 1.2, hold: .5}), pose({a: [8, 8, -8, -8], hy: 1, d: 1.2, hold: 2}),
      pose({a: [8, 8, -8, -8], hy: 0, d: 1.2, hold: .5}), pose({a: [8, 8, -8, -8], hy: -1, d: 1.2, hold: 2})]},
    hollow: {frames: [
      pose({t: -90, h: -90, a: [90, 90, 90, 90], l: [90, 90, 90, 90], d: 1, hold: .6}),
      pose({t: -104, h: -112, a: [97, 97, 97, 97], l: [100, 100, 100, 100], d: 1, hold: 2.5})]},
    bdj_full: BDJ1,
    yoga_flow: {frames: [
      pose({a: [180, 180, 180, 180], d: 1.2, hold: .5}),
      pose({t: 35, h: 25, a: [70, 50, 70, 50], l: [-8, 8, -8, 8], d: 1.2, hold: .8}),
      pose({t: 50, h: 35, a: [40, 40, 40, 40], l: [-35, -35, -35, -35], d: 1.2, hold: 1.5})]},
    ankleCARs: {ft: 10, frames: [
      pose({l: [40, 10, 0, 0], fa: [60, null], d: .7}), pose({l: [40, 10, 0, 0], fa: [100, null], d: .7}),
      pose({l: [40, 10, 0, 0], fa: [140, null], d: .7}), pose({l: [40, 10, 0, 0], fa: [100, null], d: .7})]},
    band_pull: {view: "front", props: ["bandHands"], frames: [
      pose({a: [60, 20, -60, -20], sa: [.3, .3, .3, .3], d: 1.1, hold: .3}), pose({a: [92, 92, -92, -92], d: 1.1, hold: .8})]},
    pogo: {frames: [pose({a: [-30, 60, -30, 60], d: .18}), pose({a: [-30, 60, -30, 60], lift: 7, fa: [50, 50], d: .18})]},
    gmb_daily: {frames: [
      pose({t: 100, h: 92, a: [14, 14, -6, -6], l: [-6, -82, 12, -74], d: .7}),
      pose({t: 100, h: 92, a: [-6, -6, 14, 14], l: [12, -74, -6, -82], d: .7})]},
    doorway: {view: "front", ground: false, noEye: true, props: ["door"], frames: [
      pose({st: .3, sn: .05, a: [90, 180, -90, -180], sa: [1, .15, 1, .15], sl: [.05, .05, .05, .05], d: 1.2, hold: .5}),
      pose({st: .3, sn: .05, oy: 9, a: [118, 180, -118, -180], sa: [1.12, .15, 1.12, .15], sl: [.05, .05, .05, .05], d: 1.2, hold: 2})]},
    chin_tuck: {box: [36, 0, 88, 66], frames: [
      pose({h: 166, hf: 90, d: 1, hold: .5}), pose({h: 194, hf: 90, d: 1, hold: 1.5})]},
    tspine_ext: {props: ["roller"], frames: [
      pose(SUPINE, {t: -102, h: -104, a: [-150, -40, -150, -40], d: 1.4, hold: .5}),
      pose(SUPINE, {t: -93, h: -74, a: [-140, -30, -140, -30], d: 1.4, hold: 1.5})]},
    ytw: {view: "front", ground: false, noEye: true, props: ["mat"], frames: [
      pose({a: [150, 150, -150, -150], d: .9, hold: 1.2}), pose({a: [90, 90, -90, -90], d: .9, hold: 1.2}),
      pose({a: [40, 140, -40, -140], d: .9, hold: 1.2})]},
    facepull: {props: ["band"], frames: [
      pose({a: [90, 90, 90, 90], l: [6, -6, -6, 6], d: 1, hold: .3}), pose({a: [-95, 118, -95, 118], l: [6, -6, -6, 6], d: 1, hold: 1})]},
    glute_bridge: {frames: [
      pose(SUPINE, {d: 1, hold: .6}), pose(SUPINE, {t: -62, h: -75, l: [110, 8, 110, 8], d: 1, hold: 2})]},
    posture_wall: {props: [["wall", "minX", -1]], frames: [
      pose({d: .6, hold: 1.5}),
      pose({a: [-20, -10, 20, 30], l: [22, 0, -18, -12], d: .45}),
      pose({a: [20, 30, -20, -10], l: [-18, -12, 22, 0], d: .45})]},
  };

  function joints(q, front, ft) {
    const sa = q.sa || D.sa, sl = q.sl || D.sl;
    const hip = [0, 0], sh = P(hip, q.t, L.t * (q.st != null ? q.st : 1)), head = P(sh, q.h, L.n * (q.sn != null ? q.sn : 1));
    const so = front ? 8 : 0, ho = front ? 5 : 0;   // front view: shoulder and hip width; "near" is the viewer's right
    const shN = [sh[0] + so, sh[1]], shF = [sh[0] - so, sh[1]], hpN = [ho, 0], hpF = [-ho, 0];
    const elN = P(shN, q.a[0], L.u * sa[0]), haN = P(elN, q.a[1], L.f * sa[1]), elF = P(shF, q.a[2], L.u * sa[2]), haF = P(elF, q.a[3], L.f * sa[3]);
    const knN = P(hpN, q.l[0], L.h * sl[0]), anN = P(knN, q.l[1], L.s * sl[1]), knF = P(hpF, q.l[2], L.h * sl[2]), anF = P(knF, q.l[3], L.s * sl[3]);
    const fa = q.fa || [], faN = fa[0] != null ? fa[0] : q.l[1] + (front ? 70 : 90), faF = fa[1] != null ? fa[1] : q.l[3] + (front ? -70 : 90);
    return {hip, sh, head, shN, shF, hpN, hpF, elN, haN, elF, haF, knN, anN, knF, anF, toN: P(anN, faN, ft || L.ft), toF: P(anF, faF, ft || L.ft)};
  }
  const pts = J => Object.values(J).concat([[J.head[0], J.head[1] + R], [J.head[0], J.head[1] - R], [J.head[0] - R, J.head[1]], [J.head[0] + R, J.head[1]]]);
  function bbox(J) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of pts(J)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return {x0, y0, x1, y1};
  }
  const shift = (J, dx, dy) => { const o = {}; for (const k in J) o[k] = [J[k][0] + dx, J[k][1] + dy]; return o; };

  // place a pose in the frame: x from the first frame (so the figure does not drift), y on the ground, pinned, or centred
  function place(spec, q) { const J = place0(spec, q); return q.ox || q.oy ? shift(J, q.ox || 0, q.oy || 0) : J; }
  function place0(spec, q) {
    const J = joints(q, spec.view === "front", spec.ft);
    if (!spec._dx) {
      const J0 = joints(spec.frames[0], spec.view === "front", spec.ft), b = bbox(J0);
      spec._dx = 80 - (b.x0 + b.x1) / 2; spec._dy = 60 - (b.y0 + b.y1) / 2;
    }
    if (spec.pin) { const [j, x, y] = spec.pin; return shift(J, x - J[j][0], y - J[j][1]); }
    if (spec.ground === false) return shift(J, spec._dx, spec._dy);
    return shift(J, spec._dx, GROUND - bbox(J).y1 - (q.lift || 0));
  }

  const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const mix = (a, b, e) => typeof a === "number" ? a + (b - a) * e : Array.isArray(a) ? a.map((v, i) => v == null || b[i] == null ? (e < .5 ? v : b[i]) : v + (b[i] - v) * e) : a;
  function poseAt(spec, t) {
    const F = spec.frames, total = F.reduce((s, f) => s + (f.hold || 0) + f.d, 0);
    let x = t % total;
    for (let i = 0; i < F.length; i++) {
      const f = F[i], n = F[(i + 1) % F.length];
      if (x < (f.hold || 0)) return f;
      x -= f.hold || 0;
      if (x < f.d) {
        const e = ease(x / f.d), q = {};
        for (const k of new Set([...Object.keys(f), ...Object.keys(n)])) {
          const a = f[k] !== undefined ? f[k] : (k === "fa" ? [null, null] : D[k]), b = n[k] !== undefined ? n[k] : (k === "fa" ? [null, null] : D[k]);
          q[k] = mix(a, b, e);
        }
        return q;
      }
      x -= f.d;
    }
    return F[0];
  }

  const r1 = v => Math.round(v * 10) / 10, pt = p => r1(p[0]) + " " + r1(p[1]);
  function svg(spec, q) {
    const front = spec.view === "front", J = place(spec, q), B = place(spec, spec.frames[0]), b0 = bbox(B);
    let props = "";
    if (spec.ground !== false) props += `<path class="ground" d="M8 ${GROUND + 1}H152"/>`;
    for (const p of spec.props || []) {
      const [k, ref, off] = Array.isArray(p) ? p : [p];
      if (k === "wall") { const x = r1((ref === "minX" ? b0.x0 : b0.x1) + (off || 0)); props += `<path class="prop" d="M${x} 8V${GROUND + 1}"/>`; }
      if (k === "post") { const x = r1(B[ref][0] + (off || 0)); props += `<path class="prop" d="M${x} 8V${GROUND + 1}"/>`; }
      if (k === "wallback") props += `<rect class="backdrop" x="${r1(b0.x0 - 14)}" y="6" width="${r1(b0.x1 - b0.x0 + 28)}" height="${GROUND - 5}" rx="3"/>`;
      if (k === "mat") props += `<rect class="backdrop" x="${r1(b0.x0 - 10)}" y="${r1(b0.y0 - 6)}" width="${r1(b0.x1 - b0.x0 + 20)}" height="${r1(b0.y1 - b0.y0 + 12)}" rx="6"/>`;
      if (k === "door") { const y = r1(B.haN[1]); props += `<path class="prop wall" d="M8 ${y}H${r1(B.haF[0] - 1)}M${r1(B.haN[0] + 1)} ${y}H152"/>`; }
      if (k === "bar") props += `<path class="prop" d="M40 ${spec.pin[2]}H120"/>`;
      if (k === "roller") { const m = [J.hip[0] + (J.sh[0] - J.hip[0]) * .72, GROUND - 4]; props += `<circle class="prop" cx="${r1(m[0])}" cy="${r1(m[1])}" r="4.5"/>`; }
      if (k === "breath") { const m = [J.hip[0] + (J.sh[0] - J.hip[0]) * .38, J.hip[1] + (J.sh[1] - J.hip[1]) * .38]; props += `<circle class="breath" cx="${r1(m[0])}" cy="${r1(m[1])}" r="${r1(4 + 9 * q.b)}" style="opacity:${r1(.15 + .35 * q.b)}"/>`; }
      if (k === "band") props += `<path class="band" d="M150 ${r1(B.head[1] + 8)}L${pt(J.haN)}"/>`;
      if (k === "bandHands") props += `<path class="band" d="M${pt(J.haF)}L${pt(J.haN)}"/>`;
    }
    // torso as a gentle curve, so the spine can round (c > 0) or arch (c < 0)
    const dx = J.sh[0] - J.hip[0], dy = J.sh[1] - J.hip[1], len = Math.hypot(dx, dy) || 1, c = q.c || 0;
    const ctrl = [(J.hip[0] + J.sh[0]) / 2 + c * dy / len, (J.hip[1] + J.sh[1]) / 2 - c * dx / len];
    const neckLen = L.n * (q.sn != null ? q.sn : 1) - R, neckEnd = neckLen > 0 ? P(J.sh, q.h, neckLen) : J.sh;
    const limb = (s, e, h, f) => `M${pt(s)}L${pt(e)}L${pt(h)}` + (f ? `L${pt(f)}` : "");
    const far = limb(J.shF, J.elF, J.haF) + limb(J.hpF, J.knF, J.anF, J.toF);
    let body = `M${pt(J.hip)}Q${pt(ctrl)} ${pt(J.sh)}M${pt(J.sh)}L${pt(neckEnd)}` + limb(J.shN, J.elN, J.haN) + limb(J.hpN, J.knN, J.anN, J.toN);
    if (front) body += `M${pt(J.shF)}L${pt(J.shN)}M${pt(J.hpF)}L${pt(J.hpN)}`;
    let eyes = "";
    if (!spec.noEye) {
      if (front) { const o = (q.hy || 0) * 4.4; eyes = [-2.3, 2.3].map(e => `<circle class="eye" cx="${r1(J.head[0] + e + o)}" cy="${r1(J.head[1] - .5)}" r=".9"/>`).join(""); }
      else { const e = P(J.head, q.hf != null ? q.hf : q.h - 90, 3); eyes = `<circle class="eye" cx="${r1(e[0])}" cy="${r1(e[1])}" r=".9"/>`; }
    }
    return props + `<path class="limb far${front ? " front" : ""}" d="${far}"/><path class="limb" d="${body}"/><circle class="head" cx="${r1(J.head[0])}" cy="${r1(J.head[1])}" r="${R}"/>` + eyes;
  }

  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  function markup(id, label) {
    const spec = SPECS[id]; if (!spec) return "";
    const box = spec.box || [0, 0, W, H];
    // reduced motion: a still of the second key pose, which shows the movement itself
    return `<svg class="fig" viewBox="${box.join(" ")}" data-fig="${id}" role="img" aria-label="${label}">${svg(spec, spec.frames[Math.min(1, spec.frames.length - 1)])}</svg>`;
  }
  let raf = 0;
  function frame(now) {
    raf = 0;
    const els = [...document.querySelectorAll("svg.fig[data-fig]")].filter(el => el.getClientRects().length);
    if (!els.length || reduce()) return;
    for (const el of els) {
      if (!el._t0) el._t0 = now;
      el.innerHTML = svg(SPECS[el.dataset.fig], poseAt(SPECS[el.dataset.fig], (now - el._t0) / 1000));
    }
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf && !reduce()) raf = requestAnimationFrame(frame); };
  return {markup, start, has: id => !!SPECS[id], ids: () => Object.keys(SPECS), svgAt: (id, t) => svg(SPECS[id], poseAt(SPECS[id], t)),
    keys: id => SPECS[id].frames.map(f => svg(SPECS[id], f)), box: id => (SPECS[id].box || [0, 0, W, H]).join(" ")};
})();
