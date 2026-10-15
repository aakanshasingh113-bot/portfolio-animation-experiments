import type { ReactElement, ReactNode } from 'react';

// Flat placeholder illustrations, one per item. Each viewBox matches the item's
// `size` in data/items.ts. Colours come from the theme tokens in globals.css.

type Art = () => ReactElement;

const svg = (w: number, h: number, children: ReactNode) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

const Watch: Art = () =>
  svg(
    110,
    150,
    <>
      <rect x="33" y="0" width="44" height="50" rx="10" fill="var(--obj-ink)" />
      <rect x="33" y="100" width="44" height="50" rx="10" fill="var(--obj-ink)" />
      {[114, 124, 134].map((y) => (
        <circle key={y} cx="55" cy={y} r="2.2" fill="var(--obj-ink-hi)" />
      ))}
      <rect x="96" y="60" width="8" height="18" rx="3" fill="var(--obj-metal)" />
      <rect x="12" y="32" width="86" height="86" rx="26" fill="var(--obj-metal)" />
      <rect x="18" y="38" width="74" height="74" rx="21" fill="var(--obj-ink)" />
      <g transform="rotate(-90 55 75)" fill="none" strokeLinecap="round" strokeWidth="6">
        <circle cx="55" cy="75" r="24" stroke="var(--accent)" opacity=".25" />
        <circle cx="55" cy="75" r="24" stroke="var(--accent)" strokeDasharray="110 200" />
        <circle cx="55" cy="75" r="15" stroke="var(--obj-sage)" opacity=".25" />
        <circle cx="55" cy="75" r="15" stroke="var(--obj-sage)" strokeDasharray="70 200" />
        <circle cx="55" cy="75" r="6" stroke="var(--obj-sky)" strokeDasharray="22 200" strokeWidth="5" />
      </g>
    </>,
  );

const Paperback: Art = () =>
  svg(
    150,
    210,
    <>
      <rect x="9" y="7" width="139" height="201" rx="4" fill="var(--obj-paper-edge)" />
      <rect x="2" y="2" width="140" height="200" rx="4" fill="var(--obj-sage)" />
      <rect x="2" y="2" width="12" height="200" rx="3" fill="#000" opacity=".1" />
      <circle cx="96" cy="74" r="24" fill="var(--obj-butter)" />
      <path d="M14 128 L56 92 L84 116 L108 98 L142 124 L142 132 L14 132 Z" fill="var(--obj-sage-dark)" />
      <rect x="28" y="148" width="92" height="10" rx="2" fill="var(--obj-paper)" />
      <rect x="28" y="166" width="58" height="7" rx="2" fill="var(--obj-paper)" opacity=".7" />
      <rect x="28" y="24" width="46" height="5" rx="2" fill="var(--obj-paper)" opacity=".6" />
    </>,
  );

const Keyring: Art = () =>
  svg(
    130,
    150,
    <>
      <g stroke="var(--obj-metal)" strokeWidth="2.5" fill="none">
        <path d="M60 74 L34 96" />
        <path d="M62 74 L94 92" />
        <path d="M61 74 L64 112" />
      </g>
      <circle cx="52" cy="34" r="26" fill="none" stroke="var(--obj-metal)" strokeWidth="6" />
      <path d="M32 18 A26 26 0 0 1 60 9" fill="none" stroke="var(--obj-metal-hi)" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="55" y="54" width="12" height="24" rx="5" fill="var(--obj-metal)" />
      <path
        d="M32 120 C14 106 14 92 24 88 C30 86 32 90 32 92 C32 90 34 86 40 88 C50 92 50 106 32 120 Z"
        fill="var(--accent)"
      />
      <path
        d="M96 84 L101 95 L113 96 L104 104 L107 116 L96 110 L85 116 L88 104 L79 96 L91 95 Z"
        fill="var(--obj-butter)"
      />
      <rect x="47" y="110" width="36" height="36" rx="7" fill="var(--obj-paper)" />
      <rect x="53" y="116" width="11" height="11" rx="2" fill="var(--obj-ink)" opacity=".75" />
      <rect x="66" y="116" width="11" height="11" rx="2" fill="var(--obj-ink)" opacity=".35" />
      <rect x="53" y="129" width="11" height="11" rx="2" fill="var(--obj-ink)" opacity=".35" />
      <rect x="66" y="129" width="11" height="11" rx="2" fill="var(--accent)" />
    </>,
  );

const Recipe: Art = () =>
  svg(
    190,
    130,
    <>
      <rect x="2" y="2" width="186" height="126" rx="6" fill="var(--obj-paper)" />
      <path d="M16 18 c6 -6 10 4 16 -1 s10 -5 16 0 s8 3 14 -1 s10 -2 14 1" fill="none" stroke="var(--obj-ink)" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="14" y="27" width="162" height="2.5" rx="1" fill="var(--accent)" opacity=".75" />
      {[46, 63, 80, 97, 114].map((y, i) => (
        <g key={y}>
          <rect x="14" y={y} width="162" height="1.2" fill="var(--obj-paper-line)" />
          <path
            d={`M18 ${y - 4} c5 -4 8 3 13 0 s8 -4 13 0 s8 3 13 0 ${i % 2 ? 's7 -3 12 0 s8 3 12 0' : 's9 -3 14 0 s7 4 12 0 s7 -3 12 0'}`}
            fill="none"
            stroke="var(--obj-ink-soft)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      ))}
      <ellipse cx="142" cy="90" rx="30" ry="16" fill="#fff" opacity=".35" />
      <ellipse cx="146" cy="88" rx="20" ry="10" fill="#fff" opacity=".45" />
      <ellipse cx="138" cy="94" rx="10" ry="5" fill="#fff" opacity=".5" />
      <circle cx="168" cy="72" r="2.5" fill="#fff" opacity=".6" />
    </>,
  );

const Band: Art = () =>
  svg(
    170,
    120,
    <>
      <ellipse cx="85" cy="60" rx="74" ry="46" fill="none" stroke="var(--obj-band)" strokeWidth="18" />
      <ellipse cx="85" cy="60" rx="74" ry="46" fill="none" stroke="#000" strokeWidth="18" opacity=".06" strokeDasharray="60 400" />
      <ellipse cx="85" cy="58" rx="70" ry="42" fill="none" stroke="#fff" strokeWidth="2.5" opacity=".35" />
      <path d="M128 22 C136 32 140 40 138 52" fill="none" stroke="#000" strokeWidth="5" opacity=".08" strokeLinecap="round" />
    </>,
  );

const Pass: Art = () =>
  svg(
    170,
    110,
    <>
      <rect x="2" y="2" width="166" height="106" rx="10" fill="var(--obj-paper)" />
      <path d="M2 28 V12 A10 10 0 0 1 12 2 H158 A10 10 0 0 1 168 12 V28 Z" fill="var(--accent)" />
      <rect x="120" y="11" width="34" height="7" rx="3.5" fill="var(--obj-paper)" opacity=".85" />
      <rect x="14" y="38" width="42" height="52" rx="5" fill="var(--obj-sage)" opacity=".55" />
      <circle cx="35" cy="56" r="9" fill="var(--obj-paper)" />
      <path d="M20 90 C20 74 50 74 50 90 Z" fill="var(--obj-paper)" />
      <rect x="66" y="42" width="78" height="7" rx="2" fill="var(--obj-ink)" opacity=".8" />
      <rect x="66" y="56" width="58" height="5" rx="2" fill="var(--obj-ink)" opacity=".35" />
      <rect x="66" y="66" width="68" height="5" rx="2" fill="var(--obj-ink)" opacity=".35" />
      {[66, 70, 73, 78, 81, 85, 90, 92, 96, 101, 104, 108, 113, 116, 120].map((x, i) => (
        <rect key={x} x={x} y="80" width={i % 3 ? 1.5 : 2.5} height="14" fill="var(--obj-ink)" opacity=".6" />
      ))}
    </>,
  );

const Paper: Art = () =>
  svg(
    140,
    170,
    <>
      <path d="M8 4 H132 L134 58 L130 114 L134 166 H6 L10 114 L6 58 Z" fill="var(--obj-paper)" />
      <path d="M6 58 L134 58 L130 114 L10 114 Z" fill="var(--obj-paper-edge)" />
      <path d="M6 58 H134" stroke="var(--obj-paper-line)" strokeWidth="1.5" />
      <path d="M10 114 H130" stroke="var(--obj-paper-line)" strokeWidth="1.5" />
      <rect x="22" y="18" width="56" height="8" rx="2" fill="var(--obj-ink)" opacity=".75" />
      <rect x="22" y="32" width="88" height="4" rx="2" fill="var(--obj-ink)" opacity=".3" />
      <rect x="22" y="41" width="76" height="4" rx="2" fill="var(--obj-ink)" opacity=".3" />
      {[72, 81, 90, 99, 128, 137, 146].map((y, i) => (
        <rect key={y} x="22" y={y} width={[90, 70, 84, 60, 88, 74, 52][i]} height="4" rx="2" fill="var(--obj-ink)" opacity=".28" />
      ))}
      <rect x="22" y="66" width="6" height="40" rx="2" fill="var(--accent)" opacity=".7" />
    </>,
  );

const Phone: Art = () =>
  svg(
    100,
    190,
    <>
      <rect x="2" y="2" width="96" height="186" rx="18" fill="var(--obj-ink)" />
      <rect x="7" y="7" width="86" height="176" rx="13" fill="var(--obj-screen)" />
      <rect x="38" y="12" width="24" height="6" rx="3" fill="var(--obj-ink)" />
      <rect x="32" y="34" width="36" height="12" rx="3" fill="var(--obj-paper)" opacity=".9" />
      <rect x="40" y="50" width="20" height="4" rx="2" fill="var(--obj-paper)" opacity=".5" />
      <rect x="12" y="76" width="76" height="34" rx="9" fill="var(--obj-paper)" opacity=".95" />
      <circle cx="24" cy="93" r="6" fill="var(--accent)" />
      <text x="35" y="97" fontSize="11" fontFamily="var(--font-sans), sans-serif" fontWeight="600" fill="#1D1B1A">
        Say hi?
      </text>
      <circle cx="80" cy="83" r="3" fill="var(--accent)" />
      <rect x="36" y="172" width="28" height="3" rx="1.5" fill="var(--obj-paper)" opacity=".6" />
    </>,
  );

const Mat: Art = () =>
  svg(
    58,
    250,
    <>
      <rect x="4" y="12" width="50" height="230" rx="10" fill="var(--obj-sage)" />
      <rect x="4" y="12" width="12" height="230" rx="6" fill="#fff" opacity=".12" />
      <rect x="40" y="12" width="14" height="230" rx="6" fill="#000" opacity=".08" />
      <ellipse cx="29" cy="14" rx="25" ry="10" fill="var(--obj-sage-dark)" />
      <path d="M29 14 m-3 0 a3 2 0 1 1 6 0 a7 5 0 1 1 -14 0 a12 8 0 1 1 24 0 a17 8 0 0 1 -6 6" fill="none" stroke="var(--obj-sage)" strokeWidth="1.6" />
      <rect x="0" y="58" width="58" height="11" rx="3" fill="var(--obj-strap)" />
      <rect x="0" y="188" width="58" height="11" rx="3" fill="var(--obj-strap)" />
    </>,
  );

const Earphones: Art = () =>
  svg(
    120,
    110,
    <>
      <path d="M30 44 C30 70 50 76 58 82 C66 88 64 98 60 106" fill="none" stroke="var(--obj-ink)" strokeWidth="3" strokeLinecap="round" />
      <path d="M88 40 C90 64 72 72 64 78" fill="none" stroke="var(--obj-ink)" strokeWidth="3" strokeLinecap="round" />
      <rect x="55" y="76" width="10" height="16" rx="4" fill="var(--obj-ink)" />
      <rect x="25" y="30" width="10" height="18" rx="4" fill="var(--obj-ink)" />
      <rect x="83" y="26" width="10" height="18" rx="4" fill="var(--obj-ink)" />
      <circle cx="30" cy="24" r="15" fill="var(--obj-ink)" />
      <circle cx="88" cy="20" r="15" fill="var(--obj-ink)" />
      <circle cx="30" cy="24" r="8" fill="var(--obj-ink-hi)" />
      <circle cx="88" cy="20" r="8" fill="var(--obj-ink-hi)" />
      <circle cx="27" cy="20" r="2.5" fill="#fff" opacity=".35" />
      <circle cx="85" cy="16" r="2.5" fill="#fff" opacity=".35" />
    </>,
  );

const Cookie: Art = () =>
  svg(
    100,
    100,
    <>
      <path d="M8 34 L22 10 L48 6 L72 14 L92 30 L94 58 L84 82 L60 94 L32 92 L12 76 L4 54 Z" fill="var(--obj-metal-hi)" />
      <path d="M22 10 L36 30 L8 34 Z M72 14 L64 34 L92 30 Z M94 58 L74 66 L84 82 Z M32 92 L36 72 L12 76 Z" fill="var(--obj-metal)" opacity=".7" />
      <path d="M48 6 L50 24 L36 30" fill="none" stroke="#fff" strokeWidth="1.2" opacity=".7" />
      <circle cx="54" cy="52" r="27" fill="var(--obj-cookie)" />
      <circle cx="54" cy="52" r="27" fill="none" stroke="#000" strokeWidth="2" opacity=".08" />
      {[
        [44, 42],
        [62, 40],
        [52, 56],
        [68, 60],
        [42, 64],
        [58, 70],
      ].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="3.2" ry="2.6" fill="var(--obj-ink)" opacity=".8" />
      ))}
      <path d="M30 68 L36 72 L30 80 L22 72 Z" fill="var(--obj-metal-hi)" />
    </>,
  );

const Sunglasses: Art = () =>
  svg(
    170,
    70,
    <>
      <path d="M8 18 L2 8 M162 18 L168 8" stroke="var(--obj-ink)" strokeWidth="4" strokeLinecap="round" />
      <path d="M8 16 H76 C78 16 78 18 78 20 C78 46 66 60 44 60 C22 60 8 46 8 24 Z" fill="var(--obj-ink)" />
      <path d="M92 16 H160 C162 16 162 18 162 24 C162 46 148 60 126 60 C104 60 92 46 92 20 C92 18 92 16 94 16 Z" fill="var(--obj-ink)" />
      <path d="M76 22 C82 16 88 16 94 22" fill="none" stroke="var(--obj-ink)" strokeWidth="5" />
      <path d="M14 22 H70 C70 44 60 54 44 54 C26 54 14 44 14 26 Z" fill="var(--obj-lens)" />
      <path d="M100 22 H156 C156 44 144 54 126 54 C110 54 100 44 100 26 Z" fill="var(--obj-lens)" />
      <path d="M22 28 L40 28 L26 44 Z M108 28 L126 28 L112 44 Z" fill="#fff" opacity=".18" />
    </>,
  );

const Goggles: Art = () =>
  svg(
    160,
    70,
    <>
      <path d="M2 34 C10 20 22 22 26 30 M134 30 C138 22 150 20 158 34" fill="none" stroke="var(--obj-sage-dark)" strokeWidth="7" strokeLinecap="round" />
      <path d="M72 34 C76 28 84 28 88 34" fill="none" stroke="var(--obj-ink)" strokeWidth="4" />
      <ellipse cx="48" cy="36" rx="28" ry="22" fill="var(--obj-ink)" />
      <ellipse cx="112" cy="36" rx="28" ry="22" fill="var(--obj-ink)" />
      <ellipse cx="48" cy="36" rx="22" ry="16" fill="var(--obj-sky)" />
      <ellipse cx="112" cy="36" rx="22" ry="16" fill="var(--obj-sky)" />
      <path d="M36 28 C40 24 46 23 52 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".55" />
      <path d="M100 28 C104 24 110 23 116 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".55" />
    </>,
  );

export const TrekPhoto: Art = () =>
  svg(
    170,
    70,
    <>
      <rect x="0" y="0" width="170" height="70" rx="6" fill="var(--obj-sky)" />
      <circle cx="132" cy="20" r="9" fill="var(--obj-butter)" />
      <path d="M0 70 L40 22 L62 44 L92 10 L140 70 Z" fill="var(--obj-paper)" opacity=".9" />
      <path d="M40 22 L50 34 L44 36 L36 30 Z M92 10 L104 26 L96 24 L88 30 L84 20 Z" fill="#fff" />
      <path d="M0 70 L30 50 L56 62 L96 40 L134 58 L170 46 L170 70 Z" fill="var(--obj-sage-dark)" />
    </>,
  );

export const BagArt = ({ open = false }: { open?: boolean }) =>
  svg(
    260,
    300,
    <>
      {open ? (
        <>
          {/* Lying on its side: the handles flop open past the mouth */}
          <path d="M60 98 C34 44 96 22 118 94" fill="none" stroke="var(--bag-shade)" strokeWidth="12" strokeLinecap="round" />
          <path d="M142 94 C168 18 232 46 200 98" fill="none" stroke="var(--bag)" strokeWidth="13" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M78 98 C78 26 182 26 182 98" fill="none" stroke="var(--bag-shade)" strokeWidth="12" strokeLinecap="round" />
          <path d="M68 100 C68 14 192 14 192 100" fill="none" stroke="var(--bag)" strokeWidth="13" strokeLinecap="round" />
          <path d="M68 100 C68 14 192 14 192 100" fill="none" stroke="var(--bag-shade)" strokeWidth="1.5" strokeDasharray="4 5" opacity=".9" />
        </>
      )}
      <path d="M22 92 H238 L252 290 Q252 298 244 298 H16 Q8 298 8 290 Z" fill="var(--bag)" />
      {open ? (
        <ellipse cx="130" cy="98" rx="112" ry="16" fill="var(--bag-inner)" />
      ) : (
        <path d="M22 92 H238 L240 104 H20 Z" fill="var(--bag-inner)" opacity=".7" />
      )}
      <path d="M14 186 H246 L248 212 H12 Z" fill="var(--accent)" />
      <path d="M200 92 H238 L252 290 Q252 298 244 298 H214 Z" fill="#000" opacity=".05" />
      <path d="M26 112 H234" stroke="var(--bag-shade)" strokeWidth="1.5" strokeDasharray="4 5" />
      <path d="M16 282 H244" stroke="var(--bag-shade)" strokeWidth="1.5" strokeDasharray="4 5" />
    </>,
  );

export const HairClip: Art = () =>
  svg(
    140,
    60,
    <>
      <path d="M6 30 C6 12 22 6 40 10 L130 24 C138 26 138 34 130 36 L40 50 C22 54 6 48 6 30 Z" fill="var(--accent)" />
      <path d="M22 30 C22 22 30 20 38 22 L112 30 L38 38 C30 40 22 38 22 30 Z" fill="var(--floor)" />
      <path d="M44 14 L120 26" stroke="#fff" strokeWidth="2" opacity=".35" strokeLinecap="round" />
    </>,
  );

export const art: Record<string, Art> = {
  watch: Watch,
  paperback: Paperback,
  keyring: Keyring,
  recipe: Recipe,
  band: Band,
  pass: Pass,
  paper: Paper,
  phone: Phone,
  mat: Mat,
  earphones: Earphones,
  cookie: Cookie,
  sunglasses: Sunglasses,
  goggles: Goggles,
};
