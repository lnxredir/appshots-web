function angleToCoords(angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const x1 = Math.round(50 - Math.cos(rad) * 50);
  const y1 = Math.round(50 - Math.sin(rad) * 50);
  const x2 = Math.round(50 + Math.cos(rad) * 50);
  const y2 = Math.round(50 + Math.sin(rad) * 50);
  return { x1, y1, x2, y2 };
}

export function buildBackgroundSvg(w: number, h: number, background: string): string {
  const gradientMatch = background.match(
    /linear-gradient\(\s*(\d+)deg\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/,
  );

  if (gradientMatch) {
    const angle = parseInt(gradientMatch[1], 10);
    const color1 = gradientMatch[2].trim();
    const color2 = gradientMatch[3].trim();
    const { x1, y1, x2, y2 } = angleToCoords(angle);

    return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
          <stop offset="0%" stop-color="${color1}"/>
          <stop offset="100%" stop-color="${color2}"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)"/>
    </svg>`;
  }

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="${background}"/>
  </svg>`;
}

const PATTERNS: Record<string, (size: number, color: string) => string> = {
  dots: (s, c) => `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.08}" fill="${c}"/>`,

  grid: (s, c) =>
    `<line x1="0" y1="${s}" x2="${s}" y2="${s}" stroke="${c}" stroke-width="1"/>
     <line x1="${s}" y1="0" x2="${s}" y2="${s}" stroke="${c}" stroke-width="1"/>`,

  diagonal: (s, c) =>
    `<line x1="0" y1="${s}" x2="${s}" y2="0" stroke="${c}" stroke-width="1.5"/>`,

  'cross-dots': (s, c) =>
    `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.06}" fill="${c}"/>
     <line x1="${s * 0.3}" y1="${s / 2}" x2="${s * 0.7}" y2="${s / 2}" stroke="${c}" stroke-width="1"/>
     <line x1="${s / 2}" y1="${s * 0.3}" x2="${s / 2}" y2="${s * 0.7}" stroke="${c}" stroke-width="1"/>`,

  waves: (s, c) => {
    const h = s / 2;
    return `<path d="M0 ${h} Q${s / 4} ${h - s * 0.3} ${s / 2} ${h} T${s} ${h}"
      fill="none" stroke="${c}" stroke-width="1.5"/>`;
  },

  diamonds: (s, c) => {
    const m = s / 2;
    return `<polygon points="${m},${s * 0.1} ${s * 0.9},${m} ${m},${s * 0.9} ${s * 0.1},${m}" fill="none" stroke="${c}" stroke-width="1"/>`;
  },
};

export function buildPatternSvg(
  w: number,
  h: number,
  pattern: string,
  color: string,
  opacity: number,
): string | null {
  const builder = PATTERNS[pattern];
  if (!builder) return null;

  const tileSize = Math.round(Math.min(w, h) * 0.025);
  const tile = builder(tileSize, color);

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="pat" width="${tileSize}" height="${tileSize}" patternUnits="userSpaceOnUse">
        ${tile}
      </pattern>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#pat)" opacity="${opacity}"/>
  </svg>`;
}
