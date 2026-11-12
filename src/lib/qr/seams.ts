/**
 * The QR library draws every module as its own shape inside a <clipPath>.
 * Neighbouring shapes share an edge, and when the artwork is scaled each
 * shape is anti-aliased on its own, which leaves hairline gaps between
 * modules. Folding all the shapes of a clip path into a single <path> lets
 * the renderer work out coverage once, so the gaps disappear at every size.
 *
 * Anything this does not recognise is left exactly as the library wrote it.
 */

const round = (value: number) => {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? "0" : String(rounded);
};

const attribute = (attributes: string, name: string): string | null => {
  const match = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attributes);
  return match ? match[1] : null;
};

const number = (attributes: string, name: string): number => Number(attribute(attributes, name) ?? "0");

type Turn = { cos: number; sin: number; cx: number; cy: number; degrees: number };

const NO_TURN: Turn = { cos: 1, sin: 0, cx: 0, cy: 0, degrees: 0 };
const QUARTER_TURNS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

/** Parse `rotate(angle, cx, cy)`. Only quarter turns are supported. */
function parseTurn(transform: string | null): Turn | null {
  if (!transform) return NO_TURN;
  const match = /^\s*rotate\(\s*([-\d.e]+)[\s,]+([-\d.e]+)[\s,]+([-\d.e]+)\s*\)\s*$/.exec(transform);
  if (!match) return null;
  const degrees = Number(match[1]);
  const quarters = degrees / 90;
  if (!Number.isInteger(quarters)) return null;
  const [cos, sin] = QUARTER_TURNS[((quarters % 4) + 4) % 4];
  return { cos, sin, cx: Number(match[2]), cy: Number(match[3]), degrees };
}

const turnVector = (t: Turn, dx: number, dy: number) =>
  `${round(dx * t.cos - dy * t.sin)} ${round(dx * t.sin + dy * t.cos)}`;

const turnPoint = (t: Turn, x: number, y: number) => {
  const dx = x - t.cx;
  const dy = y - t.cy;
  return `${round(t.cx + dx * t.cos - dy * t.sin)} ${round(t.cy + dx * t.sin + dy * t.cos)}`;
};

const ARITY: Record<string, number> = { M: 2, L: 2, m: 2, l: 2, h: 1, v: 1, a: 7, z: 0, Z: 0 };

/** Rewrite path data with the rotation baked in. Returns null if it uses commands we do not handle. */
function turnPath(d: string, t: Turn): string | null {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g);
  if (!tokens) return null;
  let out = "";
  let index = 0;
  let command = "";

  while (index < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[index])) {
      command = tokens[index++];
      if (!(command in ARITY)) return null;
      if (ARITY[command] === 0) {
        out += "z";
        continue;
      }
    } else if (!command || ARITY[command] === 0) {
      return null;
    }

    const count = ARITY[command];
    const args = tokens.slice(index, index + count).map(Number);
    if (args.length !== count || args.some(Number.isNaN)) return null;
    index += count;

    switch (command) {
      case "M":
      case "L":
        out += `${command}${turnPoint(t, args[0], args[1])}`;
        break;
      case "m":
      case "l":
        out += `${command}${turnVector(t, args[0], args[1])}`;
        break;
      case "h":
        out += `l${turnVector(t, args[0], 0)}`;
        break;
      case "v":
        out += `l${turnVector(t, 0, args[0])}`;
        break;
      case "a":
        out += `a${round(args[0])} ${round(args[1])} ${round(args[2] + t.degrees)} ${args[3]} ${args[4]} ${turnVector(t, args[5], args[6])}`;
        break;
    }
    // Repeated coordinates after a move are implicit line-tos.
    if (command === "M") command = "L";
    if (command === "m") command = "l";
  }
  return out;
}

function shapeToPath(tag: string, attributes: string): string | null {
  const turn = parseTurn(attribute(attributes, "transform"));
  if (!turn) return null;

  if (tag === "rect") {
    if (attribute(attributes, "rx") || attribute(attributes, "ry")) return null;
    const width = number(attributes, "width");
    const height = number(attributes, "height");
    return turnPath(
      `M ${number(attributes, "x")} ${number(attributes, "y")} h ${width} v ${height} h ${-width} z`,
      turn,
    );
  }
  if (tag === "circle") {
    const r = number(attributes, "r");
    const cx = number(attributes, "cx");
    const cy = number(attributes, "cy");
    return turnPath(`M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 z`, turn);
  }
  const d = attribute(attributes, "d");
  return d ? turnPath(d, turn) : null;
}

function mergeShapes(body: string): string | null {
  const shape = /<(rect|circle|path)\b([^>]*?)\/>/g;
  if (body.replace(shape, "").trim() !== "") return null;

  const parts: string[] = [];
  let evenOdd = false;
  for (const match of body.matchAll(shape)) {
    const path = shapeToPath(match[1], match[2]);
    if (path === null) return null;
    if (attribute(match[2], "clip-rule") === "evenodd") evenOdd = true;
    parts.push(path);
  }
  if (parts.length < 2) return null;
  // Modules never overlap, so even-odd is safe for all of them and keeps ring shapes hollow.
  return `<path${evenOdd ? ' clip-rule="evenodd"' : ""} d="${parts.join("")}"/>`;
}

export function sealSeams(svg: string): string {
  return svg.replace(/<clipPath\b([^>]*)>([\s\S]*?)<\/clipPath>/g, (whole, attributes: string, body: string) => {
    const merged = mergeShapes(body);
    return merged ? `<clipPath${attributes}>${merged}</clipPath>` : whole;
  });
}
