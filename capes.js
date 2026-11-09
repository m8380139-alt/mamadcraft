// صفحهٔ کیپ‌ها — با همان سیستم ورود سایت (Nhost) کار می‌کند
const NHOST_SUBDOMAIN = 'vvtyudilywndoyxqiqkm';
const NHOST_REGION = 'eu-central-1';
const AUTH_URL = 'https://' + NHOST_SUBDOMAIN + '.auth.' + NHOST_REGION + '.nhost.run/v1';
const GRAPHQL_URL = 'https://' + NHOST_SUBDOMAIN + '.graphql.' + NHOST_REGION + '.nhost.run/v1';
const SESSION_KEY = 'mamadcraft_session_v1';

let session = null;
let state = { cosmetics: [], owned: new Set(), equipped: {} };
let tab = 'store';

const $ = id => document.getElementById(id);
function say(text) { $('capesMsg').textContent = text || ''; }

function loadSession() {
  try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function saveSession(s) {
  try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch (e) {}
}
async function refreshSession() {
  const res = await fetch(AUTH_URL + '/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken })
  });
  if (!res.ok) { saveSession(null); session = null; throw new Error('expired'); }
  const data = await res.json();
  const raw = data.session || data;
  session = { accessToken: raw.accessToken, refreshToken: raw.refreshToken,
    expiresAt: Date.now() + (raw.accessTokenExpiresIn || 900) * 1000, user: raw.user };
  saveSession(session);
}
async function gql(query, variables, retry = true) {
  if (!session) throw new Error('not-signed-in');
  if (session.expiresAt - Date.now() < 30000) { try { await refreshSession(); } catch (e) { throw new Error('not-signed-in'); } }
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.accessToken },
    body: JSON.stringify({ query, variables: variables || {} })
  });
  let json = null; try { json = await res.json(); } catch (e) {}
  if (!json) throw new Error('HTTP ' + res.status);
  if (json.errors && json.errors.length) {
    const m = json.errors[0].message || 'error';
    if (retry && /jwt|expired|unauthor/i.test(m)) { await refreshSession(); return gql(query, variables, false); }
    throw new Error(m);
  }
  return json.data;
}

function safeImg(url) {
  return typeof url === 'string' && /^(https:\/\/|images\/)/.test(url) ? url : '';
}
function errText(e) {
  const m = (e && e.message) || '';
  if (/failed to fetch|network|load failed/i.test(m)) return 'اتصال به سرور برقرار نشد؛ اینترنتت رو چک کن.';
  if (/not free/i.test(m)) return 'این کیپ فعلاً رایگان نیست.';
  if (/not-signed-in/.test(m)) return 'نشست ورودت تموم شده؛ دوباره وارد شو.';
  return 'مشکلی پیش اومد. دوباره امتحان کن.';
}

async function load() {
  const d = await gql(`query {
    cosmetics(order_by:{sort_order:asc}) { id slug name category price_irt preview_url free_for_now }
    user_cosmetics { cosmetic_id }
    equipped_cosmetics { cosmetic_id category }
    profiles_by_pk(id:"${session.user.id}") { minecraft_name }
  }`);
  $('mcNotice').hidden = !!(d.profiles_by_pk && d.profiles_by_pk.minecraft_name);
  state.cosmetics = d.cosmetics;
  state.owned = new Set(d.user_cosmetics.map(x => x.cosmetic_id));
  state.equipped = {};
  d.equipped_cosmetics.forEach(x => { state.equipped[x.category] = x.cosmetic_id; });
}

function button(text, cls, onClick, disabled) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'cape-btn ' + (cls || ''); b.textContent = text;
  if (disabled) b.disabled = true; else b.addEventListener('click', onClick);
  return b;
}

async function act(fn) {
  say('');
  try { await fn(); await load(); render(); }
  catch (e) { say(errText(e)); }
}
const claim = id => gql(`mutation($id:uuid!){ insert_user_cosmetics_one(object:{cosmetic_id:$id}){ cosmetic_id } }`, { id });
const equip = id => gql(`mutation($id:uuid!){ insert_equipped_cosmetics_one(object:{cosmetic_id:$id}, on_conflict:{constraint:equipped_cosmetics_pkey, update_columns:[cosmetic_id]}){ category } }`, { id });
const unequip = cat => gql(`mutation($c:String!){ delete_equipped_cosmetics(where:{category:{_eq:$c}}){ affected_rows } }`, { c: cat });

function card(c) {
  const owned = state.owned.has(c.id);
  const on = state.equipped[c.category] === c.id;
  const el = document.createElement('div');
  el.className = 'cape-card' + (on ? ' on' : '');
  const img = document.createElement('img');
  img.className = 'cape-img'; img.alt = c.name; img.loading = 'lazy'; img.src = safeImg(c.preview_url);
  const name = document.createElement('div'); name.className = 'cape-name'; name.textContent = c.name;
  const price = document.createElement('div');
  price.className = 'cape-price' + (c.free_for_now ? '' : ' paid');
  price.textContent = owned ? 'تو کمد توئه' : (c.free_for_now ? 'رایگان 🎁' : (c.price_irt.toLocaleString('fa-IR') + ' تومان'));
  el.append(img, name, price);
  if (on) el.append(button('درآوردن', '', () => act(() => unequip(c.category))));
  else if (owned) el.append(button('بپوش', 'main', () => act(() => equip(c.id))));
  else if (c.free_for_now) el.append(button('دریافت رایگان', 'main', () => act(async () => { await claim(c.id); await equip(c.id); })));
  else el.append(button('به‌زودی', '', null, true));
  return el;
}

function render() {
  const grid = $('capesGrid');
  grid.textContent = '';
  const list = state.cosmetics.filter(c => tab === 'store' || state.owned.has(c.id));
  if (!list.length) {
    const p = document.createElement('p'); p.className = 'capes-empty';
    p.textContent = tab === 'store' ? 'هنوز آیتمی اضافه نشده.' : 'کمدت خالیه؛ از فروشگاه یه کیپ رایگان بگیر!';
    grid.append(p); return;
  }
  list.forEach(c => grid.append(card(c)));
}

document.querySelectorAll('.capes-tab').forEach(b => b.addEventListener('click', () => {
  tab = b.dataset.tab;
  document.querySelectorAll('.capes-tab').forEach(x => x.classList.toggle('active', x === b));
  render();
}));

(async function init() {
  session = loadSession();
  $('capesLoading').hidden = false;
  if (!session) { $('capesLoading').hidden = true; $('needLogin').hidden = false; return; }
  try {
    await load();
    const u = session.user || {};
    $('capesUser').textContent = u.displayName || (u.metadata && u.metadata.username) || String(u.email || '').split('@')[0];
    $('capesApp').hidden = false; render();
  } catch (e) {
    if (/not-signed-in/.test(e.message)) $('needLogin').hidden = false; else { $('capesApp').hidden = false; say(errText(e)); }
  }
  $('capesLoading').hidden = true;
})();
