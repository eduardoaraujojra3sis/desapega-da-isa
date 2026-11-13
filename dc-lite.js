// Mini-runtime: transforma os templates (sc-if / sc-for / {{ }}) em componentes Preact.
import { h, render, Component } from './preact-htm.js';

export class DCLogic extends Component {
  render() { return toVNodes(this.constructor.__tpl, [this.renderVals()]); }
}

const EXPR = /\{\{\s*([^}]*?)\s*\}\}/g;
const WHOLE = /^\s*\{\{\s*([^}]*?)\s*\}\}\s*$/;

function lookup(expr, scopes) {
  if (expr === 'true') return true;
  if (expr === 'false') return false;
  if (expr === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
  const parts = expr.split('.');
  for (let i = scopes.length - 1; i >= 0; i--) {
    const sc = scopes[i];
    if (sc && parts[0] in sc) {
      let v = sc[parts[0]];
      for (let j = 1; j < parts.length; j++) v = v == null ? undefined : v[parts[j]];
      return v;
    }
  }
  return undefined;
}
const str = v => (v == null || v === false ? '' : String(v));
const interp = (text, scopes) => text.replace(EXPR, (_, e) => str(lookup(e, scopes)));
function attrVal(raw, scopes) {
  const m = WHOLE.exec(raw);
  return m ? lookup(m[1], scopes) : interp(raw, scopes);
}

// :hover vindo de style-hover="..."
const hoverCache = new Map();
let hoverSheet;
function hoverClass(css) {
  if (hoverCache.has(css)) return hoverCache.get(css);
  if (!hoverSheet) { hoverSheet = document.createElement('style'); document.head.appendChild(hoverSheet); }
  const cls = 'dch' + hoverCache.size;
  const decl = css.split(';').map(s => s.trim()).filter(Boolean).map(s => s + ' !important').join(';');
  hoverSheet.textContent += `.${cls}:hover{${decl}}\n`;
  hoverCache.set(css, cls);
  return cls;
}

const TEXTY = el => el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(file|checkbox|radio)$/i.test(el.getAttribute('type') || ''));

function toVNodes(nodes, scopes) {
  const out = [];
  for (const n of nodes) {
    if (n.nodeType === 3) { if (n.data) out.push(interp(n.data, scopes)); continue; }
    if (n.nodeType !== 1) continue;
    if (n.tagName === 'TEMPLATE' && n.hasAttribute('data-if')) {
      if (attrVal(n.getAttribute('value'), scopes)) out.push(...toVNodes(n.content.childNodes, scopes));
      continue;
    }
    if (n.tagName === 'TEMPLATE' && n.hasAttribute('data-for')) {
      const list = attrVal(n.getAttribute('list'), scopes) || [];
      const as = n.getAttribute('as');
      list.forEach((item, i) => out.push(...toVNodes(n.content.childNodes, [...scopes, { [as]: item, $index: i }])));
      continue;
    }
    const tag = n.localName;
    const props = {};
    let hover = '';
    for (const a of n.attributes) {
      const name = a.name;
      if (name.startsWith('hint-')) continue;
      if (name === 'style-hover') { hover = interp(a.value, scopes); continue; }
      let v = attrVal(a.value, scopes);
      if (name.startsWith('on')) {
        const ev = name === 'onchange' && TEXTY(n) ? 'oninput' : name;
        if (typeof v === 'function') props[ev] = v;
        continue;
      }
      if (v === false || v == null) { if (name === 'value') props.value = ''; continue; }
      props[name === 'class' ? 'class' : name] = v === true ? (name === 'value' ? 'true' : true) : v;
    }
    if (hover) props.class = (props.class ? props.class + ' ' : '') + hoverClass(hover);
    const kids = n.tagName === 'TEMPLATE' ? n.content.childNodes : n.childNodes;
    out.push(h(tag, props, ...toVNodes(kids, scopes)));
  }
  return out;
}

export function mount(Comp, templateId = 'dc-template', target = document.getElementById('app')) {
  const src = document.getElementById(templateId).textContent
    .replace(/<sc-if\b/g, '<template data-if').replace(/<\/sc-if>/g, '</template>')
    .replace(/<sc-for\b/g, '<template data-for').replace(/<\/sc-for>/g, '</template>');
  const t = document.createElement('template');
  t.innerHTML = src.trim();
  Comp.__tpl = Array.from(t.content.childNodes);
  render(h(Comp), target);
}
