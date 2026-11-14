import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const KEY = 'desapega-isa-data-v2';
try { localStorage.removeItem('desapega-isa-data-v1'); } catch (e) {}
const CART = 'desapega-isa-cart-v1';

const settings = {
  storeName: 'Desapega da Isa',
  announcement: 'Peças únicas · quem viu primeiro, levou · Envio para todo o Brasil',
  whatsapp: '5563985157647',
  instagram: '@isamramos_',
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

// ---------- Fotos: aceita JPG, PNG, WEBP e HEIC/HEIF (iPhone) ----------
async function looksHeic(file) {
  if (/image\/hei[cf]/i.test(file.type || '') || /\.hei[cf]$/i.test(file.name || '')) return true;
  try { const head = new Uint8Array(await file.slice(0, 32).arrayBuffer()); const t = String.fromCharCode(...head.slice(4, 12)); return /ftyp(heic|heix|hevc|heim|heis|mif1|msf1)/.test(t); } catch (e) { return false; }
}
function decodeToDataURL(blob, max, q) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('formato')); };
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', q));
    };
    img.src = url;
  });
}
export async function compressImage(file, max = 1500, q = 0.8) {
  // 1) tenta abrir direto (Safari já abre HEIC sozinho)
  try { return await decodeToDataURL(file, max, q); }
  catch (e) { if (!(await looksHeic(file))) throw new Error('formato'); }
  // 2) HEIC no Chrome/Android/Windows: converte para JPG com o heic-to (libheif atual,
  //    lê as fotos dos iPhones novos). O conversor só é baixado quando aparece uma foto HEIC.
  let jpg;
  try {
    const lib = await import(new URL('heic-to.min.js', document.baseURI).href);
    jpg = await Promise.race([
      lib.heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), 90000))
    ]);
  } catch (e) { console.error('Não consegui converter o HEIC', file && file.name, e); throw new Error('formato'); }
  return decodeToDataURL(jpg, max, q);
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

// ---------- Sessão da Isa (renova sozinha antes de expirar) ----------
const SESSION = 'isa-admin-session';
export function getSession() { try { return JSON.parse(localStorage.getItem(SESSION) || 'null'); } catch (e) { return null; } }
function setSession(j) {
  try {
    if (!j) return localStorage.removeItem(SESSION);
    localStorage.setItem(SESSION, JSON.stringify({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600) }));
  } catch (e) {}
}
export function clearSession() { setSession(null); }

let refreshing = null;
function refreshToken() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const s = getSession();
    if (!s || !s.refresh_token) throw new Error('sessao');
    let r;
    try { r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) }); }
    catch (e) { throw new Error('rede'); }
    if (r.ok) { const j = await r.json(); setSession(j); return j.access_token; }
    if (r.status >= 500) throw new Error('rede');
    // Outra aba pode estar renovando a sessão no mesmo instante: espera um pouco e usa a sessão nova em vez de sair.
    for (let i = 0; i < 8; i++) {
      const now = getSession();
      if (now && now.refresh_token !== s.refresh_token) return now.access_token;
      await new Promise(res => setTimeout(res, 400));
    }
    clearSession();
    throw new Error('sessao');
  })().finally(() => { refreshing = null; });
  return refreshing;
}
async function token(force) {
  const s = getSession();
  if (!s) throw new Error('sessao');
  if (force || !s.expires_at || s.expires_at * 1000 - Date.now() < 120000) return refreshToken();
  return s.access_token;
}
// Só é problema de login quando a resposta fala do token (vencido/inválido).
// "permission denied" (falta de permissão no banco) NÃO desloga — vira erro 'negado'.
function isAuthText(status, t) {
  if (status !== 401 && status !== 403 && status !== 400) return false;
  if (/42501|permission denied|row-level security/i.test(t || '')) return false;
  if (status === 401) return true;
  return /jwt|expired|invalid.*token|token.*invalid|PGRST30[0-9]|signature/i.test(t || '');
}
async function isAuthErr(r) {
  let t = '';
  try { t = await r.clone().text(); } catch (e) {}
  return isAuthText(r.status, t);
}
async function authed(doFetch) {
  const run = async t => { try { return await doFetch(t); } catch (e) { throw new Error('rede'); } };
  let r = await run(await token());
  if (await isAuthErr(r)) {
    r = await run(await token(true));
    if (await isAuthErr(r)) { const e = new Error('negado'); try { e.detail = (await r.clone().text()).slice(0, 160); } catch (x) {} throw e; }
  }
  if (r.status === 401 || r.status === 403) { const e = new Error('negado'); try { e.detail = (await r.clone().text()).slice(0, 160); } catch (x) {} throw e; }
  return r;
}

export async function saveRemote(d) {
  const clean = { ...d, settings: { ...d.settings, password: '' } };
  const body = JSON.stringify({ id: 1, dados: clean });
  let r;
  try { r = await authed(t => fetch(SUPABASE_URL + '/rest/v1/loja', { method: 'POST', headers: { ...H(t), Prefer: 'resolution=merge-duplicates,return=minimal' }, body })); }
  catch (e) {
    if (e.message !== 'rede') throw e;
    await new Promise(res => setTimeout(res, 1500));
    r = await authed(t => fetch(SUPABASE_URL + '/rest/v1/loja', { method: 'POST', headers: { ...H(t), Prefer: 'resolution=merge-duplicates,return=minimal' }, body }));
  }
  if (!r.ok) { const err = new Error('salvar'); err.detail = (await r.text()).slice(0, 160); throw err; }
  save(d);
}

// Erros possíveis: 'rede' (sem conexão com o Supabase), 'confirmar' (e-mail não confirmado),
// 'credenciais' (e-mail ou senha errados), 'outro' (detalhe em e.detail).
export async function signIn(email, password) {
  let r;
  try {
    r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  } catch (e) { throw new Error('rede'); }
  if (r.ok) { const j = await r.json(); setSession(j); return j.access_token; }
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

export async function uploadImage(dataURL) {
  const blob = await (await fetch(dataURL)).blob();
  const name = Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.jpg';
  const r = await authed(t => fetch(SUPABASE_URL + '/storage/v1/object/fotos/' + name, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'image/jpeg' }, body: blob }));
  if (!r.ok) { const err = new Error('upload'); err.detail = (await r.text()).slice(0, 160); throw err; }
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

export async function fetchStats(days) {
  const desde = new Date(Date.now() - days * 86400000).toISOString();
  const r = await authed(t => fetch(SUPABASE_URL + '/rest/v1/rpc/painel_resumo', { method: 'POST', headers: H(t), body: JSON.stringify({ desde }) }));
  if (!r.ok) throw new Error('stats');
  const d = await r.json();
  return { por_dia: (d && d.por_dia) || [], por_peca: (d && d.por_peca) || [] };
}

// ---------- Desconto ----------
export function discountOf(p) { const d = Number(p && p.discount); return isFinite(d) && d > 0 && d < 100 ? d : 0; }
export function finalPrice(p) {
  const price = Number(p && p.price) || 0, d = discountOf(p);
  return d ? Math.round(price * (100 - d)) / 100 : price;
}

// Link da foto com o endereço do próprio site (ex.: https://desapega-da-isa.vercel.app/foto/abc.jpg).
// O vercel.json / _redirects repassa /foto/... para o armazenamento de fotos.
export function sitePhoto(url) {
  const base = SUPABASE_URL + '/storage/v1/object/public/fotos/';
  if (!url || !url.startsWith(base)) return /^https?:/.test(url || '') ? url : '';
  return location.origin + '/foto/' + url.slice(base.length);
}

// ---------- Enquadramento das fotos (zoom e posição escolhidos no painel) ----------
// adj = { z: zoom (0.6 a 3), x: 0-100 (%), y: 0-100 (%) }
export function imgStyle(adj) {
  if (!adj) return '';
  const z = Math.min(3, Math.max(0.6, Number(adj.z) || 1));
  const x = Math.min(100, Math.max(0, Number(adj.x ?? 50)));
  const y = Math.min(100, Math.max(0, Number(adj.y ?? 50)));
  return `object-position:${x}% ${y}%;transform:scale(${z});transform-origin:${x}% ${y}%;`;
}

// Aceita "@perfil", "perfil" ou o link completo do Instagram (com ?utm... etc.)
export function igHandle(v) {
  let s = String(v || '').trim();
  const m = s.match(/instagram\.com\/([^/?#\s]+)/i);
  if (m) s = m[1];
  return s.replace(/^@/, '').trim();
}

// ---------- Vídeos das peças ----------
export const MAX_VIDEO_MB = 50; // limite de upload do plano gratuito do Supabase
export function uploadVideo(file, onProgress) {
  const ext = ((file.name || '').split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
  const name = 'v-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.' + ext;
  const send = t => new Promise((res, rej) => {
    const x = new XMLHttpRequest();
    x.open('POST', SUPABASE_URL + '/storage/v1/object/fotos/' + name);
    x.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    x.setRequestHeader('Authorization', 'Bearer ' + t);
    x.setRequestHeader('Content-Type', file.type || 'video/mp4');
    x.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100)); };
    x.onload = () => res({ status: x.status, text: x.responseText || '' });
    x.onerror = () => rej(new Error('rede'));
    x.send(file);
  });
  return (async () => {
    let r = await send(await token());
    if (isAuthText(r.status, r.text)) {
      r = await send(await token(true));
      if (isAuthText(r.status, r.text)) { const e = new Error('negado'); e.detail = r.text.slice(0, 160); throw e; }
    }
    if (r.status === 413 || /maximum allowed size|too large|exceeded/i.test(r.text)) throw new Error('grande');
    if (/mime/i.test(r.text)) throw new Error('tipo');
    if (r.status === 401 || r.status === 403 || /42501|row-level security/i.test(r.text)) { const e = new Error('negado'); e.detail = r.text.slice(0, 160); throw e; }
    if (r.status < 200 || r.status >= 300) { const e = new Error('upload'); e.detail = r.text.slice(0, 160); throw e; }
    return SUPABASE_URL + '/storage/v1/object/public/fotos/' + name;
  })();
}

// ---------- Miniaturas (vitrine mais leve e rápida) ----------
export const THUMB_PX = 640;
export function thumbOf(p, url) { return (p && p.thumbs && p.thumbs[url]) || url; }
// Gera e envia uma miniatura (≈640 px) a partir de uma imagem (data URL ou link público).
export async function makeThumb(src) {
  const blob = src.startsWith('data:') ? await (await fetch(src)).blob() : await (await fetch(src, { mode: 'cors' })).blob();
  const small = await decodeToDataURL(blob, THUMB_PX, 0.78);
  return small;
}
export async function uploadThumbFor(fullUrl, srcForThumb) {
  const small = await makeThumb(srcForThumb || fullUrl);
  const name = fullUrl.split('/').pop().replace(/\.jpe?g$/i, '') + '_t.jpg';
  const blob = await (await fetch(small)).blob();
  const r = await authed(t => fetch(SUPABASE_URL + '/storage/v1/object/fotos/' + name, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'image/jpeg' }, body: blob }));
  if (!r.ok && !/already exists|Duplicate|409/i.test(await r.text())) throw new Error('upload');
  return SUPABASE_URL + '/storage/v1/object/public/fotos/' + name;
}
