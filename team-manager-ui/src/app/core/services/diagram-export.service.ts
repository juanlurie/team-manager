import { Injectable } from '@angular/core';

// Domain-neutral shapes so this service doesn't depend on process-flow models.
export interface ExportNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string | null;
}
export interface ExportEdge {
  id: string;
  fromId: string;
  toId: string;
  color?: string | null;
  waypoints?: { x: number; y: number }[];
}
export type DiagramFormat = 'png' | 'svg' | 'drawio' | 'mermaid' | 'plantuml';

const DEFAULT_STROKE = '#9aa4b2';
const NODE_FILL = '#20242e';
const NODE_STROKE = '#3a4150';
const BG = '#14171f';
const PAD = 40;

// Builds shareable exports of a node/edge diagram entirely on the client (no external services or
// libraries, so it works under a strict CSP). PNG/SVG are pixel-faithful; draw.io preserves the
// geometry for re-editing; Mermaid/PlantUML are portable text with auto-layout.
@Injectable({ providedIn: 'root' })
export class DiagramExportService {
  download(format: DiagramFormat, title: string, nodes: ExportNode[], edges: ExportEdge[]): void {
    const base = (title || 'diagram').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'diagram';
    switch (format) {
      case 'svg': this.saveText(`${base}.svg`, 'image/svg+xml', this.toSvg(nodes, edges)); break;
      case 'drawio': this.saveText(`${base}.drawio`, 'application/xml', this.toDrawio(nodes, edges)); break;
      case 'mermaid': this.saveText(`${base}.mmd`, 'text/plain', this.toMermaid(nodes, edges)); break;
      case 'plantuml': this.saveText(`${base}.puml`, 'text/plain', this.toPlantuml(nodes, edges)); break;
      case 'png': this.savePng(`${base}.png`, nodes, edges); break;
    }
  }

  // ── geometry (mirrors CanvasBoardComponent so exports match what's on screen) ────────────
  private center(n: ExportNode) { return { x: n.x + n.width / 2, y: n.y + n.height / 2 }; }

  private anchor(from: ExportNode, target: { x: number; y: number }) {
    const hw = from.width / 2, hh = from.height / 2;
    const cx = from.x + hw, cy = from.y + hh;
    const dx = target.x - cx, dy = target.y - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };
    const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
    return { x: cx + dx * scale, y: cy + dy * scale };
  }

  private ortho(from: ExportNode, to: ExportNode): { x: number; y: number }[] {
    const fhw = from.width / 2, fhh = from.height / 2, thw = to.width / 2, thh = to.height / 2;
    const fc = this.center(from), tc = this.center(to);
    const dx = tc.x - fc.x, dy = tc.y - fc.y;
    let pts: { x: number; y: number }[];
    if (Math.abs(dx) >= Math.abs(dy)) {
      const s = dx >= 0 ? 1 : -1, sx = fc.x + s * fhw, tx = tc.x - s * thw, mx = (sx + tx) / 2;
      pts = [{ x: sx, y: fc.y }, { x: mx, y: fc.y }, { x: mx, y: tc.y }, { x: tx, y: tc.y }];
    } else {
      const s = dy >= 0 ? 1 : -1, sy = fc.y + s * fhh, ty = tc.y - s * thh, my = (sy + ty) / 2;
      pts = [{ x: fc.x, y: sy }, { x: fc.x, y: my }, { x: tc.x, y: my }, { x: tc.x, y: ty }];
    }
    return pts.filter((p, i) => i === 0 || Math.abs(p.x - pts[i - 1].x) > 0.5 || Math.abs(p.y - pts[i - 1].y) > 0.5);
  }

  private edgePoints(e: ExportEdge, byId: Map<string, ExportNode>): { x: number; y: number }[] | null {
    const from = byId.get(e.fromId), to = byId.get(e.toId);
    if (!from || !to) return null;
    const wps = e.waypoints ?? [];
    if (wps.length) return [this.anchor(from, wps[0]), ...wps, this.anchor(to, wps[wps.length - 1])];
    return this.ortho(from, to);
  }

  private roundedPath(pts: { x: number; y: number }[], radius = 14): string {
    if (pts.length < 3) return 'M' + pts.map(p => `${r(p.x)},${r(p.y)}`).join(' L');
    let d = `M${r(pts[0].x)},${r(pts[0].y)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      const trim = (f: { x: number; y: number }, t: { x: number; y: number }) => {
        const dx = t.x - f.x, dy = t.y - f.y, len = Math.hypot(dx, dy) || 1, rr = Math.min(radius, len / 2);
        return { x: f.x + (dx / len) * rr, y: f.y + (dy / len) * rr };
      };
      const a = trim(p1, p0), b = trim(p1, p2);
      d += ` L${r(a.x)},${r(a.y)} Q${r(p1.x)},${r(p1.y)} ${r(b.x)},${r(b.y)}`;
    }
    const last = pts[pts.length - 1];
    return d + ` L${r(last.x)},${r(last.y)}`;
  }

  private bounds(nodes: ExportNode[], edges: ExportEdge[]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const eat = (x: number, y: number) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
    for (const n of nodes) { eat(n.x, n.y); eat(n.x + n.width, n.y + n.height); }
    for (const e of edges) for (const w of e.waypoints ?? []) eat(w.x, w.y);
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 200; maxY = 100; }
    return { minX: minX - PAD, minY: minY - PAD, w: (maxX - minX) + PAD * 2, h: (maxY - minY) + PAD * 2 };
  }

  // ── SVG ──────────────────────────────────────────────────────────────────────────────────
  toSvg(nodes: ExportNode[], edges: ExportEdge[]): string {
    const byId = new Map(nodes.map(n => [n.id, n]));
    const b = this.bounds(nodes, edges);
    const parts: string[] = [];
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${r(b.w)}" height="${r(b.h)}" viewBox="${r(b.minX)} ${r(b.minY)} ${r(b.w)} ${r(b.h)}" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif">`);
    parts.push(`<defs><marker id="arr" markerWidth="9" markerHeight="9" refX="7.5" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L0,8 L8,4 z" fill="context-stroke"/></marker></defs>`);
    parts.push(`<rect x="${r(b.minX)}" y="${r(b.minY)}" width="${r(b.w)}" height="${r(b.h)}" fill="${BG}"/>`);
    for (const e of edges) {
      const pts = this.edgePoints(e, byId);
      if (!pts) continue;
      const stroke = e.color || DEFAULT_STROKE;
      parts.push(`<path d="${this.roundedPath(pts)}" fill="none" stroke="${esc(stroke)}" stroke-width="2" marker-end="url(#arr)"/>`);
    }
    for (const n of nodes) {
      const fill = n.color || NODE_FILL;
      const stroke = n.color || NODE_STROKE;
      const textColor = n.color ? '#1a1a1a' : '#ffffff';
      parts.push(`<rect x="${r(n.x)}" y="${r(n.y)}" width="${r(n.width)}" height="${r(n.height)}" rx="10" fill="${esc(fill)}" stroke="${esc(stroke)}" stroke-width="${n.color ? 3 : 1.5}"/>`);
      parts.push(this.svgLabel(n, textColor));
    }
    parts.push('</svg>');
    return parts.join('');
  }

  private svgLabel(n: ExportNode, color: string): string {
    const lines = wrap(n.label || '', Math.max(6, Math.floor((n.width - 16) / 7)));
    const cx = r(n.x + n.width / 2);
    const lh = 15;
    const startY = n.y + n.height / 2 - ((lines.length - 1) * lh) / 2;
    const tspans = lines.map((ln, i) => `<tspan x="${cx}" y="${r(startY + i * lh)}">${esc(ln)}</tspan>`).join('');
    return `<text text-anchor="middle" dominant-baseline="central" font-size="13" fill="${color}">${tspans}</text>`;
  }

  private savePng(name: string, nodes: ExportNode[], edges: ExportEdge[]): void {
    const svg = this.toSvg(nodes, edges);
    const b = this.bounds(nodes, edges);
    const scale = 2;
    const img = new Image();
    // Encode via a data: URL so nothing leaves the page (CSP-safe). unescape/encodeURIComponent
    // handles any unicode in labels before base64.
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(b.w * scale));
      canvas.height = Math.max(1, Math.round(b.h * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => { if (blob) this.saveBlob(name, blob); }, 'image/png');
    };
  }

  // ── draw.io (mxGraph XML) ──────────────────────────────────────────────────────────────
  toDrawio(nodes: ExportNode[], edges: ExportEdge[]): string {
    const cells: string[] = [];
    cells.push('<mxCell id="0"/>');
    cells.push('<mxCell id="1" parent="0"/>');
    const idFor = new Map(nodes.map((n, i) => [n.id, `n${i}`]));
    for (const n of nodes) {
      const fill = n.color || NODE_FILL, stroke = n.color || NODE_STROKE, font = n.color ? '#1a1a1a' : '#ffffff';
      const style = `rounded=1;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};fontColor=${font};`;
      cells.push(`<mxCell id="${idFor.get(n.id)}" value="${esc(n.label)}" style="${esc(style)}" vertex="1" parent="1"><mxGeometry x="${r(n.x)}" y="${r(n.y)}" width="${r(n.width)}" height="${r(n.height)}" as="geometry"/></mxCell>`);
    }
    edges.forEach((e, i) => {
      const s = idFor.get(e.fromId), t = idFor.get(e.toId);
      if (!s || !t) return;
      const stroke = e.color || DEFAULT_STROKE;
      const style = `edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=${stroke};`;
      const wps = (e.waypoints ?? []).map(w => `<mxPoint x="${r(w.x)}" y="${r(w.y)}"/>`).join('');
      const geo = wps ? `<mxGeometry relative="1" as="geometry"><Array as="points">${wps}</Array></mxGeometry>` : '<mxGeometry relative="1" as="geometry"/>';
      cells.push(`<mxCell id="e${i}" style="${esc(style)}" edge="1" parent="1" source="${s}" target="${t}">${geo}</mxCell>`);
    });
    return `<mxfile><diagram name="Diagram"><mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1">`
      + `<root>${cells.join('')}</root></mxGraphModel></diagram></mxfile>`;
  }

  // ── Mermaid ────────────────────────────────────────────────────────────────────────────
  toMermaid(nodes: ExportNode[], edges: ExportEdge[]): string {
    const idFor = new Map(nodes.map((n, i) => [n.id, `n${i}`]));
    const lines = ['flowchart TD'];
    for (const n of nodes) lines.push(`  ${idFor.get(n.id)}["${mmLabel(n.label)}"]`);
    for (const e of edges) {
      const s = idFor.get(e.fromId), t = idFor.get(e.toId);
      if (s && t) lines.push(`  ${s} --> ${t}`);
    }
    nodes.forEach(n => {
      if (n.color) lines.push(`  style ${idFor.get(n.id)} fill:${n.color},stroke:${n.color},color:#1a1a1a`);
    });
    return lines.join('\n') + '\n';
  }

  // ── PlantUML ───────────────────────────────────────────────────────────────────────────
  toPlantuml(nodes: ExportNode[], edges: ExportEdge[]): string {
    const idFor = new Map(nodes.map((n, i) => [n.id, `n${i}`]));
    const lines = ['@startuml', 'left to right direction'];
    for (const n of nodes) {
      const col = n.color ? ` ${n.color}` : '';
      lines.push(`rectangle "${puLabel(n.label)}" as ${idFor.get(n.id)}${col}`);
    }
    for (const e of edges) {
      const s = idFor.get(e.fromId), t = idFor.get(e.toId);
      if (s && t) lines.push(`${s} --> ${t}`);
    }
    lines.push('@enduml');
    return lines.join('\n') + '\n';
  }

  // ── PlantUML parse (for the editable code panel) ─────────────────────────────────────────
  // Understands the subset this service emits plus common variants: `rectangle "Label" as id
  // [#colour]` nodes and `a --> b` edges. Anything else (skinparam, notes, directives) is ignored.
  parsePlantuml(text: string): { nodes: { alias: string; label: string; color?: string }[]; edges: { from: string; to: string }[] } {
    const nodeRe = /^\s*(?:rectangle|node|card|component|usecase|storage|folder|agent|artifact)\s+"([^"]*)"\s+as\s+([A-Za-z0-9_]+)\s*(#[0-9A-Za-z]+)?/;
    const edgeRe = /^\s*([A-Za-z0-9_]+)\s*[-.]+>+\s*([A-Za-z0-9_]+)/;
    const nodes: { alias: string; label: string; color?: string }[] = [];
    const edges: { from: string; to: string }[] = [];
    const seen = new Set<string>();
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('@') || line.startsWith("'") || /^(skinparam|left to right|top to bottom|title|note|hide|show)\b/i.test(line)) continue;
      const nm = line.match(nodeRe);
      if (nm) {
        if (!seen.has(nm[2])) { seen.add(nm[2]); nodes.push({ alias: nm[2], label: nm[1], color: nm[3] }); }
        continue;
      }
      const em = line.match(edgeRe);
      if (em) edges.push({ from: em[1], to: em[2] });
    }
    return { nodes, edges };
  }

  // ── download helpers ─────────────────────────────────────────────────────────────────────
  private saveText(name: string, mime: string, text: string): void {
    this.saveBlob(name, new Blob([text], { type: `${mime};charset=utf-8` }));
  }
  private saveBlob(name: string, blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function r(n: number): number { return Math.round(n * 100) / 100; }
function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function mmLabel(s: string): string { return String(s).replace(/"/g, '&quot;').replace(/\n/g, ' '); }
function puLabel(s: string): string { return String(s).replace(/"/g, "'").replace(/\n/g, ' '); }
function wrap(text: string, maxChars: number): string[] {
  const words = String(text).split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 6);
}
