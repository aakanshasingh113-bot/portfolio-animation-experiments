// Flat illustrated placeholders for each thing in the bag. Each one is drawn in
// a viewBox matching the item's `size`, so a real photo can replace it 1:1.
// All art is decorative: the accessible name lives on the button around it.

const ink = "#2B2730";
const steel = "#A7AEB8";
const sage = "#8FA58A";
const mustard = "#E2B04A";
const blush = "#E9A893";
const paper = "#FFFDF8";
const accent = "var(--accent)";

type ArtProps = { id: string; w: number; h: number };

export function ItemArt({ id, w, h }: ArtProps) {
  const Art = art[id];
  if (!Art) return null;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      className="block overflow-visible"
    >
      <Art />
    </svg>
  );
}

const art: Record<string, () => React.ReactElement> = {
  // 110 × 150
  smartwatch: () => (
    <g>
      <rect x="33" y="0" width="44" height="40" rx="10" fill={sage} />
      <rect x="33" y="110" width="44" height="40" rx="10" fill={sage} />
      {[118, 128, 138].map((y) => (
        <circle key={y} cx="55" cy={y} r="2.6" fill={ink} opacity="0.35" />
      ))}
      <rect x="10" y="30" width="90" height="90" rx="24" fill={ink} />
      <rect x="99" y="62" width="8" height="18" rx="3" fill={ink} />
      <rect x="18" y="38" width="74" height="74" rx="18" fill="#141217" />
      <circle cx="55" cy="75" r="24" fill="none" stroke="#3A3540" strokeWidth="6" />
      <path d="M55 51 A24 24 0 1 1 33.2 85" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" />
      <rect x="45" y="70" width="20" height="4" rx="2" fill={paper} opacity="0.9" />
      <rect x="48" y="78" width="14" height="3" rx="1.5" fill={paper} opacity="0.5" />
    </g>
  ),

  // 150 × 205
  paperback: () => (
    <g>
      <rect x="10" y="6" width="136" height="196" rx="6" fill="#EFE7D8" />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1={142} y1={14 + i * 2} x2={142} y2={196} stroke="#D9CFBC" strokeWidth="1" />
      ))}
      <rect x="4" y="2" width="136" height="196" rx="6" fill={mustard} />
      <rect x="4" y="2" width="14" height="196" rx="5" fill="#000" opacity="0.08" />
      <circle cx="78" cy="78" r="30" fill={accent} opacity="0.9" />
      <path d="M30 130 Q60 112 78 124 T128 118 L128 160 L30 160 Z" fill="#000" opacity="0.12" />
      <rect x="32" y="22" width="84" height="8" rx="4" fill={ink} opacity="0.75" />
      <rect x="44" y="36" width="60" height="5" rx="2.5" fill={ink} opacity="0.45" />
      <rect x="44" y="176" width="60" height="5" rx="2.5" fill={ink} opacity="0.45" />
      <path d="M110 0 L110 30 L117 24 L124 30 L124 0 Z" fill={accent} />
    </g>
  ),

  // 130 × 150
  keyring: () => (
    <g>
      <circle cx="50" cy="38" r="26" fill="none" stroke={steel} strokeWidth="6" />
      <path d="M58 60 L70 92" stroke={steel} strokeWidth="5" />
      <g transform="translate(66 88) rotate(-20)">
        <rect x="-10" y="0" width="20" height="22" rx="6" fill="#C9A44A" />
        <rect x="-3" y="20" width="6" height="40" fill="#C9A44A" />
        <rect x="3" y="44" width="8" height="5" fill="#C9A44A" />
        <rect x="3" y="53" width="6" height="5" fill="#C9A44A" />
      </g>
      <path d="M30 58 L22 84" stroke={ink} strokeWidth="2" opacity="0.5" />
      <circle cx="20" cy="94" r="12" fill={accent} />
      <path d="M72 30 L98 40" stroke={ink} strokeWidth="2" opacity="0.5" />
      <path
        d="M108 38 l4 9 10 1 -7.5 6.5 2.5 9.5 -9-5 -9 5 2.5-9.5 -7.5-6.5 10-1z"
        fill={mustard}
      />
      <path d="M44 64 L40 104" stroke={ink} strokeWidth="2" opacity="0.5" />
      <path
        d="M30 106 h8 a5 5 0 1 1 10 0 h8 v8 a5 5 0 1 1 0 10 v8 h-26 z"
        fill={sage}
      />
    </g>
  ),

  // 190 × 130
  "recipe-card": () => (
    <g>
      <rect x="4" y="4" width="182" height="122" rx="4" fill={paper} />
      <rect x="4" y="4" width="182" height="20" rx="4" fill={blush} opacity="0.5" />
      {[44, 62, 80, 98, 116].map((y) => (
        <line key={y} x1="14" y1={y} x2="176" y2={y} stroke="#9CB8D0" strokeWidth="1" opacity="0.6" />
      ))}
      <line x1="30" y1="24" x2="30" y2="126" stroke={blush} strokeWidth="1.2" />
      <g fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" opacity="0.75">
        <path d="M40 18 q6 -8 12 0 t12 0 t12 0 q4 -6 10 -2" />
        <path d="M40 40 q4 -5 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0" />
        <path d="M40 58 q4 -5 8 0 t8 0 t8 0 t8 0 t8 0" />
        <path d="M40 76 q4 -5 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0" />
        <path d="M40 94 q4 -5 8 0 t8 0 t8 0" />
      </g>
      <ellipse cx="146" cy="96" rx="26" ry="16" fill="#FFFFFF" opacity="0.85" />
      <ellipse cx="158" cy="88" rx="12" ry="8" fill="#F4EFE6" opacity="0.9" />
      <circle cx="128" cy="108" r="3" fill="#F4EFE6" />
    </g>
  ),

  // 170 × 120
  "resistance-band": () => (
    <g fill="none" strokeLinecap="round">
      <path
        d="M22 62 C22 22, 150 18, 150 58 C150 100, 30 104, 22 62 Z"
        stroke={accent}
        strokeWidth="18"
      />
      <path
        d="M22 62 C22 22, 150 18, 150 58"
        stroke="#fff"
        strokeWidth="3"
        opacity="0.25"
        transform="translate(0 -5)"
      />
      <path d="M118 88 q14 -8 26 -30" stroke="#000" strokeWidth="18" opacity="0.08" />
    </g>
  ),

  // 160 × 105
  "train-pass": () => (
    <g>
      <rect x="4" y="4" width="152" height="97" rx="10" fill={paper} />
      <rect x="4" y="4" width="152" height="22" rx="10" fill={accent} />
      <rect x="4" y="18" width="152" height="8" fill={accent} />
      <rect x="64" y="10" width="32" height="8" rx="4" fill="var(--floor)" />
      <rect x="16" y="36" width="42" height="52" rx="5" fill="#E7DED1" />
      <circle cx="37" cy="54" r="10" fill={steel} />
      <path d="M21 88 q16 -22 32 0 z" fill={steel} />
      <rect x="68" y="40" width="74" height="7" rx="3.5" fill={ink} opacity="0.75" />
      <rect x="68" y="54" width="56" height="5" rx="2.5" fill={ink} opacity="0.4" />
      <rect x="68" y="66" width="64" height="5" rx="2.5" fill={ink} opacity="0.4" />
      <rect x="68" y="80" width="40" height="8" rx="2" fill={sage} />
    </g>
  ),

  // 130 × 160
  "folded-paper": () => (
    <g>
      <path d="M6 6 H124 V112 L96 154 H6 Z" fill={paper} />
      <path d="M124 112 L96 154 L92 116 Z" fill="#E8E0D3" />
      <line x1="6" y1="80" x2="124" y2="80" stroke="#000" strokeOpacity="0.07" strokeWidth="2" />
      <rect x="18" y="20" width="58" height="8" rx="4" fill={ink} opacity="0.75" />
      <rect x="18" y="34" width="36" height="4" rx="2" fill={accent} />
      {[50, 60, 70, 92, 102, 112, 122].map((y, i) => (
        <rect key={y} x="18" y={y} width={i % 3 === 2 ? 52 : 90} height="4" rx="2" fill={ink} opacity="0.3" />
      ))}
    </g>
  ),

  // 95 × 180
  phone: () => (
    <g>
      <rect x="4" y="2" width="87" height="176" rx="16" fill={ink} />
      <rect x="9" y="8" width="77" height="164" rx="12" fill="url(#phone-screen)" />
      <defs>
        <linearGradient id="phone-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5B4A6E" />
          <stop offset="1" stopColor={accent} />
        </linearGradient>
      </defs>
      <rect x="36" y="13" width="24" height="6" rx="3" fill={ink} />
      <text x="47.5" y="48" textAnchor="middle" fontSize="18" fontWeight="600" fill={paper} fontFamily="var(--font-sans)">
        9:41
      </text>
      <rect x="14" y="68" width="67" height="34" rx="9" fill={paper} opacity="0.92" />
      <circle cx="24" cy="78" r="4" fill={accent} />
      <text x="32" y="81" fontSize="7.5" fill={ink} fontFamily="var(--font-sans)" opacity="0.6">
        1 new
      </text>
      <text x="20" y="96" fontSize="10" fontWeight="600" fill={ink} fontFamily="var(--font-sans)">
        Say hi?
      </text>
      <rect x="34" y="160" width="27" height="4" rx="2" fill={paper} opacity="0.7" />
    </g>
  ),

  // 64 × 250 (rolled up, upright)
  "yoga-mat": () => (
    <g>
      <rect x="6" y="10" width="52" height="230" rx="26" fill={sage} />
      <rect x="6" y="10" width="16" height="230" rx="8" fill="#fff" opacity="0.18" />
      <ellipse cx="32" cy="20" rx="26" ry="10" fill="#7C9277" />
      <path d="M32 20 m-3 0 a3 2 0 1 1 6 0 a8 5 0 1 1 -16 0 a13 8 0 1 1 26 0" fill="none" stroke="#5F735B" strokeWidth="1.6" />
      <rect x="2" y="60" width="60" height="12" rx="4" fill={accent} />
      <rect x="2" y="178" width="60" height="12" rx="4" fill={accent} />
    </g>
  ),

  // 120 × 120
  earphones: () => (
    <g fill="none" strokeLinecap="round">
      <path d="M28 34 C30 70, 52 70, 58 88 C62 100, 60 110, 74 112" stroke={paper} strokeWidth="3" />
      <path d="M86 26 C86 60, 66 64, 58 88" stroke={paper} strokeWidth="3" />
      <path d="M74 112 h18" stroke={steel} strokeWidth="6" />
      <circle cx="28" cy="26" r="14" fill={paper} />
      <circle cx="28" cy="26" r="6" fill={steel} />
      <circle cx="88" cy="20" r="14" fill={paper} />
      <circle cx="88" cy="20" r="6" fill={steel} />
    </g>
  ),

  // 90 × 90
  cookie: () => (
    <g>
      <path
        d="M10 30 L22 8 L48 4 L74 10 L86 34 L82 64 L66 84 L38 86 L14 74 L4 50 Z"
        fill="#C9CED4"
      />
      <path d="M22 8 L40 30 L10 30 Z M74 10 L60 34 L86 34 Z M14 74 L34 60 L38 86 Z" fill="#E6E9EC" />
      <path d="M48 4 L52 26 M82 64 L60 58 M4 50 L28 46" stroke="#AEB4BB" strokeWidth="1.5" />
      <circle cx="47" cy="47" r="22" fill="#C88B4A" />
      <circle cx="47" cy="47" r="22" fill="none" stroke="#A86E33" strokeWidth="2" />
      {[
        [40, 40],
        [54, 44],
        [44, 56],
        [56, 56],
        [36, 50],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#4A2F22" />
      ))}
    </g>
  ),

  // 170 × 75
  sunglasses: () => (
    <g>
      <path d="M16 22 L6 6 M154 22 L164 6" stroke={ink} strokeWidth="5" strokeLinecap="round" />
      <path d="M12 20 H74 Q74 66 44 66 Q12 66 12 20 Z" fill={ink} />
      <path d="M96 20 H158 Q158 66 126 66 Q96 66 96 20 Z" fill={ink} />
      <path d="M74 26 Q85 16 96 26" fill="none" stroke={ink} strokeWidth="5" />
      <path d="M22 28 L40 28 L28 46 Z" fill="#fff" opacity="0.18" />
      <path d="M106 28 L124 28 L112 46 Z" fill="#fff" opacity="0.18" />
    </g>
  ),

  // 130 × 60
  "swim-goggles": () => (
    <g>
      <path d="M4 30 Q4 6 30 10 M126 30 Q126 6 100 10" fill="none" stroke={accent} strokeWidth="5" />
      <path d="M4 30 Q8 56 40 52 M126 30 Q122 56 90 52" fill="none" stroke={accent} strokeWidth="5" />
      <ellipse cx="40" cy="30" rx="24" ry="17" fill={ink} />
      <ellipse cx="40" cy="30" rx="19" ry="13" fill="#6FB3C9" />
      <ellipse cx="90" cy="30" rx="24" ry="17" fill={ink} />
      <ellipse cx="90" cy="30" rx="19" ry="13" fill="#6FB3C9" />
      <path d="M64 30 h2" stroke={ink} strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="34" cy="25" rx="6" ry="3" fill="#fff" opacity="0.5" />
      <ellipse cx="84" cy="25" rx="6" ry="3" fill="#fff" opacity="0.5" />
    </g>
  ),
};

/** The canvas tote, 230 × 280, drawn upright with the opening at the top. */
export function BagArt() {
  return (
    <svg viewBox="0 0 230 280" width="100%" height="100%" aria-hidden="true" focusable="false" className="block overflow-visible">
      <path d="M62 96 C62 10, 168 10, 168 96" fill="none" stroke="var(--bag-shade)" strokeWidth="13" strokeLinecap="round" />
      <path d="M78 96 C78 34, 152 34, 152 96" fill="none" stroke="var(--bag)" strokeWidth="11" strokeLinecap="round" />
      <path d="M18 92 H212 L222 262 Q222 276 208 276 H22 Q8 276 8 262 Z" fill="var(--bag)" />
      <ellipse cx="115" cy="93" rx="97" ry="10" fill="var(--bag-inside)" />
      <rect x="12" y="172" width="206" height="26" fill={accent} />
      <path d="M18 92 L8 262" stroke="var(--bag-shade)" strokeWidth="2" />
      <path d="M212 92 L222 262" stroke="var(--bag-shade)" strokeWidth="2" />
      {[124, 140, 156, 214, 230, 246].map((y) => (
        <line key={y} x1="24" y1={y} x2="206" y2={y} stroke="var(--bag-shade)" strokeWidth="0.8" opacity="0.5" />
      ))}
    </svg>
  );
}

/** Stand-in for the trek photo shown when the sunglasses flip. */
export function TrekPhoto() {
  return (
    <svg viewBox="0 0 170 110" width="100%" height="100%" aria-hidden="true" focusable="false" className="block">
      <rect width="170" height="110" rx="6" fill="#BFD6E2" />
      <circle cx="132" cy="28" r="12" fill={mustard} />
      <path d="M0 110 L46 40 L74 76 L104 30 L170 110 Z" fill="#6E7F86" />
      <path d="M46 40 L56 54 L36 54 Z M104 30 L116 48 L92 48 Z" fill="#fff" />
      <path d="M0 110 L40 84 L80 98 L130 80 L170 110 Z" fill={sage} />
    </svg>
  );
}
