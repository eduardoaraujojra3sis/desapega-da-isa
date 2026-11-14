import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const KEY = 'desapega-isa-data-v2';
try { localStorage.removeItem('desapega-isa-data-v1'); } catch (e) {}
const CART = 'desapega-isa-cart-v1';

const settings = {
  storeName: 'Desapega da Isa',
  announcement: 'Peças únicas · quem viu primeiro, levou · Envio para todo o Brasil',
  whatsapp: '5563985157647',
  instagram: '@desapegadaisa',
  heroEyebrow: 'O closet tá aberto!',
  heroTitle: 'Amei muito. Agora é a sua vez de amar.',
  heroText: 'Abri meu armário e separei as queridinhas que merecem uma nova dona. Cada peça é única — gostou, joga na sacola e corre pro meu WhatsApp antes que alguém leve!',
  heroImage: '',
  aboutTitle: 'Oi, eu sou a Isa.',
  aboutText: 'Sim, sou eu mesma por trás de cada look que vocês viram lá no Instagram. O Desapega nasceu porque meu armário não fecha mais (rs) e porque roupa boa merece circular. Tudo aqui foi usado com carinho, revisado por mim e tá esperando um novo rolê com você.',
  aboutImage: '',
  messageIntro: 'Oi, Isa! Vim pelo Desapega e me apaixonei por estas peças:',
  checkoutNote: 'Frete, pagamento e retirada a gente combina direitinho no WhatsApp.',
  categories: ['Vestidos', 'Blusas', 'Calças', 'Saias', 'Conjuntos'],
  sizes: ['PP', 'P', 'M', 'G', 'GG', '34', '36', '38', '40', '42', '44', 'Único'],
  password: 'isa123'
};

export const defaults = { settings, products: [] };

export const conditions = ['Nova com etiqueta', 'Nova sem etiqueta', 'Seminova', 'Usada em ótimo estado', 'Usada'];
export const statuses = [
  { v: 'disponivel', l: 'Disponível', c: 'oklch(0.56 0.07 150)' },
  { v: 'reservado', l: 'Reservada', c: 'oklch(0.62 0.09 70)' },
  { v: 'vendido', l: 'Vendida', c: '#1F1A17' },
  { v: 'oculto', l: 'Oculta', c: '#B5AAA0' }
];

const clone = o => JSON.parse(JSON.stringify(o));

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return { settings: { ...clone(settings), ...(d.settings || {}) }, products: d.products || [] };
    }
  } catch (e) {}
  return clone(defaults);
}

export function cached() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw); return { settings: { ...clone(settings), ...(d.settings || {}) }, products: d.products || [] }; } } catch (e) {}
  return null;
}

export function save(d) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; }
}

export function reset() { localStorage.removeItem(KEY); }

export function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART) || '[]'); } catch (e) { return []; }
}
export function saveCart(c) { try { localStorage.setItem(CART, JSON.stringify(c)); } catch (e) {} }

export function brl(n) {
  const v = Number(n);
  if (!isFinite(v) || n === '' || n == null) return '';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

export function nextCode(products) {
  const n = products.reduce((m, p) => Math.max(m, parseInt((p.code || '').replace(/\D/g, '')) || 0), 0) + 1;
  return 'DI-' + String(n).padStart(3, '0');
}

export function compressImage(file, max = 1600, q = 0.85) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = rej;
    r.onload = () => {
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', q));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

export const remote = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
const H = t => ({ apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) });
const norm = d => ({ settings: { ...clone(settings), ...(d.settings || {}) }, products: d.products || [] });

export async function fetchRemote() {
  const r = await fetch(SUPABASE_URL + '/rest/v1/loja?id=eq.1&select=dados', { headers: H() });
  if (!r.ok) throw new Error('Falha ao carregar');
  const rows = await r.json();
  if (!rows[0] || !rows[0].dados || !rows[0].dados.products) return null;
  const d = norm(rows[0].dados);
  save(d);
  return d;
}

export async function saveRemote(d, token) {
  const clean = { ...d, settings: { ...d.settings, password: '' } };
  const r = await fetch(SUPABASE_URL + '/rest/v1/loja', { method: 'POST', headers: { ...H(token), Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ id: 1, dados: clean }) });
  if (r.status === 401) throw new Error('sessao');
  if (!r.ok) throw new Error(await r.text());
  save(d);
}

// Erros possíveis: 'rede' (sem conexão com o Supabase), 'confirmar' (e-mail não confirmado),
// 'credenciais' (e-mail ou senha errados), 'outro' (detalhe em e.detail).
export async function signIn(email, password) {
  let r;
  try {
    r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  } catch (e) { throw new Error('rede'); }
  if (r.ok) return (await r.json()).access_token;
  let body = {};
  try { body = await r.json(); } catch (e) {}
  const code = String(body.error_code || body.code || '');
  const msg = String(body.msg || body.message || body.error_description || body.error || '');
  if (code === 'email_not_confirmed' || /not confirmed/i.test(msg)) throw new Error('confirmar');
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) throw new Error('credenciais');
  const err = new Error('outro');
  err.detail = (msg || ('HTTP ' + r.status));
  throw err;
}

export async function uploadImage(dataURL, token) {
  const blob = await (await fetch(dataURL)).blob();
  const name = Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.jpg';
  const r = await fetch(SUPABASE_URL + '/storage/v1/object/fotos/' + name, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'image/jpeg' }, body: blob });
  if (r.status === 401) throw new Error('sessao');
  if (!r.ok) throw new Error('upload');
  return SUPABASE_URL + '/storage/v1/object/public/fotos/' + name;
}

export function waLink(number, text) {
  return 'https://wa.me/' + String(number || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(text);
}

// ---------- Estatísticas (tabela "eventos" e função "painel_resumo" no Supabase — ver LEIA-ME) ----------
const ADMIN_FLAG = 'desapega-isa-admin';
export function markAdmin() { try { localStorage.setItem(ADMIN_FLAG, '1'); } catch (e) {} }
const isAdminBrowser = () => { try { return localStorage.getItem(ADMIN_FLAG) === '1'; } catch (e) { return false; } };

// events: [{ tipo: 'visita' | 'clique' | 'sacola' | 'pedido' | 'pedido_item', produto?: id }]
export function track(events) {
  if (!remote || isAdminBrowser() || !events || !events.length) return;
  const rows = events.map(e => ({ tipo: e.tipo, produto: e.produto || null }));
  try {
    fetch(SUPABASE_URL + '/rest/v1/eventos', { method: 'POST', keepalive: true, headers: { ...H(), Prefer: 'return=minimal' }, body: JSON.stringify(rows) }).catch(() => {});
  } catch (e) {}
}

export async function fetchStats(days, token) {
  const desde = new Date(Date.now() - days * 86400000).toISOString();
  const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/painel_resumo', { method: 'POST', headers: H(token), body: JSON.stringify({ desde }) });
  if (r.status === 401) throw new Error('sessao');
  if (!r.ok) throw new Error('stats');
  const d = await r.json();
  return { por_dia: (d && d.por_dia) || [], por_peca: (d && d.por_peca) || [] };
}
