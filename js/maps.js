// Detailed SVG floor plans of Jahan's gym, drawn from the Nov 9 redraw in plan_v1.md.
const Z = (id, x, y, w, h, title, sub, hl, marks) => {
  const on = hl.has(id);
  const m = (marks[id] || []);
  const dots = m.map((n, i) => { const cx = x + 14 + (i % Math.max(1, Math.floor((w - 8) / 22))) * 22, cy = y + h - 14 - Math.floor(i / Math.max(1, Math.floor((w - 8) / 22))) * 22; return `<g><circle cx="${cx}" cy="${cy}" r="9.5" fill="#ff7a1a" stroke="#111" stroke-width="1.5"/><text x="${cx}" y="${cy + 3.6}" text-anchor="middle" font-size="10" font-weight="800" fill="#111">${n}</text></g>`; }).join('');
  return `<g class="zone${on ? ' on' : ''}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${on ? 'rgba(255,122,26,.22)' : '#1c1f24'}" stroke="${on ? '#ff7a1a' : '#353a42'}" stroke-width="${on ? 2.5 : 1.2}"/>
  <text x="${x + 6}" y="${y + 14}" font-size="11" font-weight="800" fill="${on ? '#ffb070' : '#8a93a0'}">${id}</text>
  <text x="${x + 6}" y="${y + 26}" font-size="8.2" fill="${on ? '#ffe2c8' : '#6c7480'}">${sub.split('|').map((s, i) => `<tspan x="${x + 6}" dy="${i ? 10 : 0}">${s}</tspan>`).join('')}</text>${dots}</g>`;
};
const machines = (x, y, n, dx, dy, w = 10, h = 8) => Array.from({ length: n }, (_, i) => `<rect x="${x + i * dx}" y="${y + i * dy}" width="${w}" height="${h}" rx="2" fill="#2b3038" stroke="#4a515c" stroke-width=".6"/>`).join('');

export function lowerMap(hlZones = [], marks = {}) {
  const hl = new Set(hlZones);
  return `<svg viewBox="0 0 340 520" class="floormap" role="img" aria-label="2nd floor map">
  <defs><pattern id="win" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#0f2233"/><path d="M0 6L6 0" stroke="#2f6d9a" stroke-width="1"/></pattern>
  <pattern id="stairs" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#1a1d22"/><path d="M0 4H8" stroke="#555" stroke-width="2"/></pattern></defs>
  <rect x="6" y="6" width="328" height="508" rx="10" fill="#121418" stroke="#3a3f47" stroke-width="2"/>
  <rect x="40" y="8" width="260" height="20" rx="4" fill="#2a1410" stroke="#7a3b1c"/><text x="170" y="22" text-anchor="middle" font-size="9.5" font-weight="800" fill="#ffb070" letter-spacing="1.5">WHERE CHAMPIONS TRAIN · mural + glass doors</text>
  <rect x="6" y="34" width="7" height="400" fill="url(#win)"/><text x="3" y="240" font-size="8" fill="#5ea8dc" transform="rotate(-90 9 240)" text-anchor="middle">WINDOWS</text>
  <rect x="327" y="34" width="7" height="400" fill="#9aa4b1" opacity=".35"/><text x="331" y="240" font-size="8" fill="#c8d0da" transform="rotate(90 331 240)" text-anchor="middle">MIRRORS</text>
  <path d="M96 392 V128 Q96 118 106 118 H234 Q244 118 244 128 V392" fill="none" stroke="#ff7a1a" stroke-width="15" stroke-linecap="butt" opacity=".9"/>
  <path d="M96 392 V128 Q96 118 106 118 H234 Q244 118 244 128 V392" fill="none" stroke="#ffd2ad" stroke-width="1" stroke-dasharray="5 6" opacity=".7"/>
  <text x="170" y="114" text-anchor="middle" font-size="8" fill="#ffb070" font-weight="700">ORANGE TRACK (U-loop)</text>
  ${Z('Z7', 18, 38, 132, 66, 'Z7', 'Dual-pulley + low-row plates|Tire station', hl, marks)}
  ${Z('Z1', 190, 38, 132, 66, 'Z1', 'Combaxx storage: balls,|sandbags, bands, bars', hl, marks)}
  ${Z('Z6', 18, 112, 66, 282, 'Z6', 'Machine row|multi press|pec fly / rear delt|curl machines|T-bar rows|seated row|VKR / dip|ab coaster', hl, marks)}
  ${machines(26, 230, 6, 0, 16, 48, 9)}
  ${Z('Z4', 112, 136, 116, 248, 'Z4', 'Life Fitness|cable jungle island|lat pulldown · pushdown|crossover · low row', hl, marks)}
  <circle cx="170" cy="275" r="30" fill="none" stroke="#4a515c" stroke-dasharray="3 3"/><text x="170" y="278" text-anchor="middle" font-size="8" fill="#6c7480">cable stack</text>
  ${Z('Z2', 256, 112, 66, 206, 'Z2', 'Bench field|DB racks on|mirror|preacher + EZ', hl, marks)}
  ${machines(300, 170, 8, 0, 14, 16, 6)}
  ${Z('Z3', 256, 324, 66, 70, 'Z3', 'Smith machine|flat + decline', hl, marks)}
  ${Z('Z5', 18, 404, 304, 104, 'Z5', 'Mezzanine end: SkiErg · heavy bag · wall balls · plyo box', hl, marks)}
  <rect x="24" y="446" width="58" height="56" fill="url(#stairs)" stroke="#555"/><text x="53" y="478" text-anchor="middle" font-size="8" fill="#aaa">STAIRS ↑</text>
  <rect x="246" y="446" width="70" height="56" rx="4" fill="#173a22" stroke="#2f7a46"/><text x="281" y="471" text-anchor="middle" font-size="8" fill="#8fdca8">turf ramp</text><text x="281" y="481" text-anchor="middle" font-size="8" fill="#8fdca8">+ battle ropes</text>
  <circle cx="170" cy="478" r="11" fill="#d42c2c" stroke="#fff" stroke-width="1.5"/><text x="170" y="481" text-anchor="middle" font-size="7.5" font-weight="800" fill="#fff">BOB</text>
  <text x="170" y="503" text-anchor="middle" font-size="8" fill="#ff9a9a">you start here, facing the mural ↑</text>
  </svg>`;
}

export function upperMap(hlZones = [], marks = {}) {
  const hl = new Set(hlZones);
  return `<svg viewBox="0 0 340 560" class="floormap" role="img" aria-label="Upper floor map">
  <defs><pattern id="win2" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#0f2233"/><path d="M0 6L6 0" stroke="#2f6d9a" stroke-width="1"/></pattern></defs>
  <rect x="6" y="6" width="328" height="548" rx="10" fill="#121418" stroke="#3a3f47" stroke-width="2"/>
  <rect x="90" y="8" width="160" height="20" rx="4" fill="#10202c" stroke="#2f6d9a"/><text x="170" y="22" text-anchor="middle" font-size="9" font-weight="700" fill="#8cc8f0">ENTRANCE · glass doors · turnstiles · clock</text>
  <rect x="6" y="34" width="7" height="480" fill="url(#win2)"/><text x="9" y="280" font-size="8" fill="#5ea8dc" transform="rotate(-90 9 280)" text-anchor="middle">WINDOWS · CARDIO</text>
  <rect x="327" y="34" width="7" height="480" fill="#9aa4b1" opacity=".35"/><text x="331" y="280" font-size="8" fill="#c8d0da" transform="rotate(90 331 280)" text-anchor="middle">MIRRORS · MACHINES</text>
  <rect x="146" y="100" width="30" height="420" fill="#ff7a1a" opacity=".9"/><line x1="161" y1="100" x2="161" y2="520" stroke="#ffd2ad" stroke-dasharray="5 6"/>
  <text x="161" y="310" font-size="8" font-weight="800" fill="#111" transform="rotate(-90 161 310)" text-anchor="middle">ORANGE TRACK (straight)</text>
  ${Z('U1', 18, 36, 304, 58, 'U1', 'RowErgs · spin bikes  |  LF hip abductor/adductor (right)', hl, marks)}
  ${Z('U2', 18, 102, 58, 336, 'U2', 'Window row|stair climbers|spin bikes|treadmills', hl, marks)}
  ${machines(30, 190, 10, 0, 22, 34, 12)}
  ${Z('U3', 82, 102, 58, 318, 'U3', 'Inner row|ellipticals|recumbents', hl, marks)}
  ${machines(94, 170, 8, 0, 26, 32, 14)}
  ${Z('U4', 254, 102, 68, 156, 'U4', 'Mirror wall|DB rack · KBs|benches|plyo box', hl, marks)}
  ${Z('U5', 184, 196, 64, 132, 'U5', 'Cables|dual pulley|ab bench|stab. ball', hl, marks)}
  ${Z('U6', 254, 264, 68, 156, 'U6', 'Leg cluster|hip thrust x2|45° leg press|seated leg press', hl, marks)}
  ${Z('U8', 18, 446, 122, 72, 'U8', 'Rogue plate tree · belt|squat · landmine · adj. DBs', hl, marks)}
  ${Z('U9', 184, 446, 64, 72, 'U9', 'Fixed bars|straight + EZ', hl, marks)}
  ${Z('U7', 254, 426, 68, 92, 'U7', 'Squat rack|+ barbell|band/KB rack', hl, marks)}
  <rect x="110" y="526" width="120" height="22" rx="4" fill="#2a2016" stroke="#6b5130"/><text x="170" y="540" text-anchor="middle" font-size="8.5" fill="#d8b98a">far end · wooden-slat doors (photos taken here)</text>
  </svg>`;
}
