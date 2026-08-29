/**
 * Eight services, who calls whom.
 *
 * Authored against signal-console's DESIGN.md rather than adapted from an
 * existing chart, so the data is a parameter and the sample is an export. Swap
 * real traffic in with `mount(el, { nodes, flows })`; the diff then shows what
 * changed rather than a rewrite.
 */

/**
 * One row per service: `[name, callsPerSecond, state]`.
 *
 * `state` is `'ok' | 'warn' | 'crit'` and is the only thing that may put hue on
 * a node. If nothing is degraded, nothing here is amber — status colour is not
 * decoration, and a wall where amber is a brand colour has no way left to say
 * "look here".
 */
export const NODES = [
  ['edge', 18.4, 'ok'],
  ['auth', 12.1, 'ok'],
  ['orders', 9.6, 'ok'],
  ['catalog', 7.8, 'ok'],
  ['payments', 6.2, 'warn'],
  ['search', 5.1, 'ok'],
  ['ledger', 3.4, 'crit'],
  ['audit', 1.9, 'ok'],
];

/**
 * One row per link: `[fromIndex, toIndex, callsPerSecond]`, indexing NODES.
 *
 * Aggregated by pair on purpose. This language never draws one mark per record
 * past roughly fifty — a mesh emits millions of calls a minute, and the chart's
 * job is the shape of the traffic, not its transcript.
 */
export const FLOWS = [
  [0, 1, 8.1], [0, 2, 6.4], [0, 3, 5.2], [0, 5, 4.0],
  [1, 2, 3.6], [1, 4, 2.8], [1, 7, 1.1],
  [2, 4, 5.5], [2, 3, 2.2], [2, 6, 1.6],
  [3, 5, 2.4],
  [4, 6, 2.9], [4, 7, 0.8],
  [6, 7, 0.6],
];

export function mount(root, data = { nodes: NODES, flows: FLOWS }) {
  const q = (name) => root.querySelector(`[data-nx-mount="${name}"]`);
  const svg = q('circular-graph');
  if (!svg) return;

  const nodes = data.nodes ?? NODES;
  const flows = data.flows ?? FLOWS;

  const NS = 'http://www.w3.org/2000/svg';
  const el = (parent, tag, attrs) => {
    const node = document.createElementNS(NS, tag);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    parent.appendChild(node);
    return node;
  };
  const text = (parent, attrs, value) => {
    const node = el(parent, 'text', attrs);
    node.textContent = value;
    return node;
  };
  const title = (node, value) => {
    const t = document.createElementNS(NS, 'title');
    t.textContent = value;
    node.appendChild(t);
  };

  // The accent ladder, quietest to loudest. Magnitude uses this and nothing
  // else; the neutral ladder carries structure and the status pair carries
  // state, so a thick green chord can only ever mean "a lot".
  const ACCENT = ['#12352B', '#1D6B52', '#2FA37C', '#4DD4A8'];
  // Four discrete weights paired with the four accent steps, rather than a
  // continuous width. This language is a real scale, not a gradient, and a
  // reader can count four thicknesses across a ring where they cannot rank
  // twenty. The floor is stroke.mark and the ceiling is stroke.lineMax.
  const WEIGHT = [2, 2.6, 3.2, 4];
  const NEUTRAL = { rule: '#1E242E', dim: '#3D4756', label: '#8A94A3', ink: '#D7DEE8' };
  const STATE = { ok: '#4DD4A8', warn: '#E3B341', crit: '#F0616D' };

  const CX = 210;
  const CY = 126;
  const R = 88;

  const maxFlow = Math.max(...flows.map((f) => f[2]));
  const maxRps = Math.max(...nodes.map((n) => n[1]));
  const at = (i) => {
    // Start at twelve o'clock and run clockwise, so the busiest service — first
    // in the data — sits where the eye lands first.
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return [CX + Math.cos(a) * R, CY + Math.sin(a) * R, a];
  };

  svg.innerHTML = '';

  const ring = el(svg, 'g', {});
  el(ring, 'circle', {
    cx: CX, cy: CY, r: R,
    fill: 'none', stroke: NEUTRAL.rule, 'stroke-width': 1,
    class: 'arrive',
  });

  // Chords first, so the nodes and their labels sit above the traffic.
  const chords = el(svg, 'g', {});
  for (const [from, to, rps] of flows) {
    const [x1, y1] = at(from);
    const [x2, y2] = at(to);
    const t = rps / maxFlow;

    // Bowed toward the centre by how *little* traffic it carries, so heavy
    // links read as short and direct and light ones fall away.
    const bow = 0.18 + (1 - t) * 0.5;
    const mx = CX + ((x1 + x2) / 2 - CX) * bow;
    const my = CY + (((y1 + y2) / 2 - CY)) * bow;

    const step = Math.min(ACCENT.length - 1, Math.floor(t * ACCENT.length));
    const path = el(chords, 'path', {
      d: `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
      fill: 'none',
      // Same step indexes both ladders, so weight and value never disagree.
      stroke: ACCENT[step],
      'stroke-width': WEIGHT[step],
      'stroke-linecap': 'round',
      opacity: (0.4 + t * 0.5).toFixed(2),
      pathLength: 1,
      class: 'chord',
    });
    title(path, `${nodes[from][0]} → ${nodes[to][0]} · ${rps.toFixed(1)}k rps`);
  }

  const marks = el(svg, 'g', {});
  nodes.forEach(([name, rps, state], i) => {
    const [x, y, a] = at(i);
    const r = 3 + (rps / maxRps) * 3.5;
    const colour = STATE[state] ?? STATE.ok;

    // Only a failing node loops. A live dot that has stopped pulsing is
    // indistinguishable from a dead one, which is the failure a status display
    // must not have — but a healthy node has nothing to say.
    const dot = el(marks, 'circle', {
      cx: x.toFixed(1), cy: y.toFixed(1), r: r.toFixed(1),
      fill: state === 'ok' ? NEUTRAL.ink : colour,
      class: state === 'crit' ? 'live' : 'arrive',
    });
    title(dot, `${name} · ${rps.toFixed(1)}k rps · ${state}`);

    // Labels sit outside the ring, anchored by which side they are on, so no
    // label ever overlaps the marks.
    const lx = CX + Math.cos(a) * (R + 16);
    const ly = CY + Math.sin(a) * (R + 16);
    const onLeft = Math.cos(a) < -0.2;
    const onRight = Math.cos(a) > 0.2;
    text(marks, {
      x: lx.toFixed(1),
      y: (ly + 3).toFixed(1),
      'font-size': 9,
      'font-weight': 600,
      'letter-spacing': '0.08em',
      fill: state === 'ok' ? NEUTRAL.label : colour,
      'text-anchor': onLeft ? 'end' : onRight ? 'start' : 'middle',
      class: 'arrive',
    }, name.toUpperCase());
  });

  // Nothing goes in the centre. A chord routes through the middle — that is the
  // form — so anything printed there is crossed by traffic, and the total is
  // already in the head where this language's anatomy puts it. Saying it twice
  // gives the reader two places to look for one number.
  const total = nodes.reduce((sum, n) => sum + n[1], 0);

  const head = q('total');
  if (head) head.textContent = `${total.toFixed(1)}k`;

  // UPDATED is honest or it is worse than absent: a status line that always
  // says "0s ago" teaches the reader to stop believing it.
  const age = q('age');
  if (age) {
    const started = Date.now();
    const tick = () => {
      const seconds = Math.round((Date.now() - started) / 1000);
      age.textContent = `UPDATED ${seconds}S AGO`;
    };
    tick();
    const timer = setInterval(tick, 1000);
    // Handed back so an embedder can stop it; the preview harness closes the
    // window, and an unbounded interval is what hangs a jsdom smoke test.
    return () => clearInterval(timer);
  }

  return () => {};
}
