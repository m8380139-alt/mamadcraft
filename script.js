const SERVER_ADDRESS = 'mohamadkingxddd-srv-foxddd.play.mihancraft.com:25566';
const copyButton = document.getElementById('copyServer');
const copyMessage = document.getElementById('copyMessage');
copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(SERVER_ADDRESS);
    copyMessage.textContent = 'آدرس سرور کپی شد! وارد Minecraft شو و آن را در بخش Multiplayer وارد کن.';
  } catch (error) {
    copyMessage.textContent = 'کپی خودکار در این مرورگر در دسترس نیست؛ آدرس را انتخاب و دستی کپی کن.';
  }
});

// ---------- Nhost (بدون کتابخانه؛ مستقیم با fetch) ----------
const NHOST_SUBDOMAIN = 'vvtyudilywndoyxqiqkm';
const NHOST_REGION = 'eu-central-1';
const AUTH_URL = 'https://' + NHOST_SUBDOMAIN + '.auth.' + NHOST_REGION + '.nhost.run/v1';
const GRAPHQL_URL = 'https://' + NHOST_SUBDOMAIN + '.graphql.' + NHOST_REGION + '.nhost.run/v1';
const FAKE_EMAIL_DOMAIN = 'mamadcraft.example'; // ایمیل ساختگی؛ کاربر فقط نام کاربری می‌بیند
const SESSION_KEY = 'mamadcraft_session_v1';
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const NETWORK_MSG = 'اتصال به سرور برقرار نشد؛ اینترنتت را چک کن و دوباره امتحان کن.';

let session = null; // { accessToken, refreshToken, expiresAt, user }
let refreshTimer = null;
let refreshPromise = null;
let currentUser = null;

function usernameToEmail(username) {
  return username.toLowerCase() + '@' + FAKE_EMAIL_DOMAIN;
}
function isNetworkError(error) {
  return !!error && /failed to fetch|networkerror|network request failed|load failed/i.test(error.message || '');
}
function loadStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function storeSession(s) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch (e) { /* ذخیره‌سازی مرورگر در دسترس نیست */ }
}
function normalizeSession(raw) {
  return {
    accessToken: raw.accessToken,
    refreshToken: raw.refreshToken,
    expiresAt: Date.now() + (raw.accessTokenExpiresIn || 900) * 1000,
    user: raw.user
  };
}
function applySession(s) {
  session = s;
  storeSession(s);
  clearTimeout(refreshTimer);
  if (s) {
    const wait = Math.max(5000, s.expiresAt - Date.now() - 60000);
    refreshTimer = setTimeout(() => refreshSession().catch(() => {}), wait);
  }
  updateUserUI(s ? s.user : null);
}

async function authRequest(path, body) {
  const res = await fetch(AUTH_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let json = null;
  try { json = await res.json(); } catch (e) { /* بدون بدنه */ }
  if (!res.ok) {
    const err = new Error((json && json.message) || res.statusText || 'error');
    err.code = json && json.error;
    err.status = res.status;
    throw err;
  }
  return json || {};
}
function refreshSession() {
  if (refreshPromise) return refreshPromise;
  if (!session) return Promise.resolve();
  const token = session.refreshToken;
  refreshPromise = authRequest('/token', { refreshToken: token })
    .then(data => applySession(normalizeSession(data.session || data)))
    .catch(error => {
      if (error.status === 400 || error.status === 401) applySession(null); // نشست منقضی شده
      throw error;
    })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}
async function gql(query, variables, retry = true) {
  if (session && session.expiresAt - Date.now() < 30000) {
    try { await refreshSession(); } catch (e) { /* ادامه با توکن فعلی */ }
  }
  if (!session) throw new Error('not-signed-in');
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.accessToken },
    body: JSON.stringify({ query, variables: variables || {} })
  });
  let json = null;
  try { json = await res.json(); } catch (e) { /* بدون بدنه */ }
  if (!json) throw new Error('HTTP ' + res.status);
  if (!json.errors && !json.data) throw new Error(json.error || json.message || ('HTTP ' + res.status));
  if (json.errors && json.errors.length) {
    const message = json.errors[0].message || 'error';
    if (retry && /jwt|expired|unauthor/i.test(message)) {
      try { await refreshSession(); return gql(query, variables, false); } catch (e) { /* برو پایین */ }
    }
    throw new Error(message);
  }
  return json.data;
}

// ---------- Auth UI ----------
const modal = document.getElementById('authModal');
const openAuth = document.getElementById('openAuth');
const closeAuth = document.getElementById('closeAuth');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authSubmit = document.getElementById('authSubmit');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const formMessage = document.getElementById('formMessage');
let authMode = 'login';

function showModal() {
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  formMessage.textContent = '';
  usernameInput.focus();
}
function hideModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
}
function setMode(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.mode === mode));
  const registering = mode === 'register';
  authTitle.textContent = registering ? 'ساخت حساب کاربری' : 'ورود به حساب';
  authSubmit.textContent = registering ? 'ثبت‌نام' : 'ورود';
  passwordInput.autocomplete = registering ? 'new-password' : 'current-password';
  formMessage.textContent = '';
}
function displayNameOf(user) {
  if (!user) return '';
  return user.displayName || (user.metadata && user.metadata.username) || String(user.email || '').split('@')[0];
}
function updateUserUI(user) {
  currentUser = user;
  openAuth.textContent = user ? displayNameOf(user) + ' · پروفایل' : 'ورود / ثبت‌نام ↗';
  if (!user && typeof closeProfile === 'function') closeProfile();
  if (typeof onChatAuth === 'function') onChatAuth(user);
}
function translateAuthError(error) {
  if (isNetworkError(error)) return NETWORK_MSG;
  const code = error.code || '';
  const message = error.message || '';
  if (code === 'invalid-email-password') return 'نام کاربری یا رمز عبور اشتباه است.';
  if (code === 'email-already-in-use') return 'این نام کاربری قبلاً گرفته شده؛ یکی دیگر انتخاب کن.';
  if (code === 'unverified-user') return 'حساب هنوز تأیید نشده (تنظیم «تأیید ایمیل» در Nhost باید خاموش باشد).';
  if (code === 'signup-disabled') return 'ثبت‌نام فعلاً بسته است.';
  if (code === 'user-not-found') return 'نام کاربری یا رمز عبور اشتباه است.';
  if (error.status === 429) return 'تعداد تلاش‌ها زیاد بود؛ چند دقیقه بعد دوباره امتحان کن.';
  if (/password/i.test(code + ' ' + message)) return 'رمز عبور مناسب نیست؛ حداقل ۹ کاراکتر و کمی پیچیده‌تر بنویس.';
  return 'خطا: ' + message;
}

openAuth.addEventListener('click', () => {
  if (currentUser) openProfile();
  else showModal();
});
closeAuth.addEventListener('click', hideModal);
modal.addEventListener('click', event => { if (event.target === modal) hideModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) hideModal(); });
document.querySelectorAll('.auth-tab').forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));

authForm.addEventListener('submit', async event => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!USERNAME_RE.test(username)) {
    formMessage.textContent = 'نام کاربری باید ۳ تا ۲۰ حرف انگلیسی، عدد یا زیرخط (_) باشد.';
    return;
  }
  authSubmit.disabled = true;
  formMessage.textContent = 'کمی صبر کن...';
  try {
    const email = usernameToEmail(username);
    if (authMode === 'register') {
      const data = await authRequest('/signup/email-password', {
        email,
        password,
        options: { displayName: username, metadata: { username } }
      });
      if (data.session) {
        applySession(normalizeSession(data.session));
        formMessage.textContent = 'ثبت‌نام انجام شد و وارد شدی!';
        setTimeout(hideModal, 900);
      } else {
        formMessage.textContent = 'ثبت‌نام انجام شد ولی ورود خودکار ممکن نیست؛ از تب «ورود» وارد شو.';
      }
    } else {
      const data = await authRequest('/signin/email-password', { email, password });
      if (!data.session) throw Object.assign(new Error('no session'), { code: 'unverified-user' });
      applySession(normalizeSession(data.session));
      formMessage.textContent = 'با موفقیت وارد شدی!';
      setTimeout(hideModal, 900);
    }
    authForm.reset();
  } catch (error) {
    formMessage.textContent = translateAuthError(error);
  } finally {
    authSubmit.disabled = false;
  }
});

async function signOut() {
  const token = session && session.refreshToken;
  applySession(null);
  if (token) { try { await authRequest('/signout', { refreshToken: token, all: false }); } catch (e) { /* مهم نیست */ } }
}

// ---------- Profile ----------
const profileModal = document.getElementById('profileModal');
const profileForm = document.getElementById('profileForm');
const profileEmail = document.getElementById('profileEmail');
const profileAvatarImg = document.getElementById('profileAvatarImg');
const profileInitial = document.getElementById('profileInitial');
const avatarInput = document.getElementById('avatarInput');
const nicknameInput = document.getElementById('nickname');
const bioInput = document.getElementById('bio');
const profileSave = document.getElementById('profileSave');
const profileMessage = document.getElementById('profileMessage');
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_PREFIX = 'data:image/jpeg;base64,';

function gqlErrorText(error, fallback) {
  if (isNetworkError(error)) return NETWORK_MSG;
  const m = (error && error.message) || '';
  if (/not found in type|field .* not found|no such table|relation .* does not exist/i.test(m)) {
    return 'جدول‌های دیتابیس هنوز ساخته نشده‌اند (مرحلهٔ راه‌اندازی Nhost).';
  }
  return fallback + m;
}
function safeAvatar(url) {
  return (typeof url === 'string' && url.startsWith(AVATAR_PREFIX) && url.length <= 30000) ? url : '';
}
function closeProfile() {
  if (!profileModal || profileModal.hidden) return;
  profileModal.hidden = true;
  document.body.style.overflow = '';
}
function setAvatar(url) {
  const label = nicknameInput.value.trim() || displayNameOf(currentUser) || '?';
  profileInitial.textContent = Array.from(label)[0].toUpperCase();
  if (url) {
    profileAvatarImg.src = url;
    profileAvatarImg.hidden = false;
    profileInitial.hidden = true;
  } else {
    profileAvatarImg.removeAttribute('src');
    profileAvatarImg.hidden = true;
    profileInitial.hidden = false;
  }
}
function resizeToSquare(file, size) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    img.src = url;
  });
}
async function saveProfile(fields) {
  await gql(
    'mutation($o: profiles_insert_input!, $cols: [profiles_update_column!]!) {' +
    ' insert_profiles_one(object: $o, on_conflict: {constraint: profiles_pkey, update_columns: $cols}) { id } }',
    { o: fields, cols: Object.keys(fields) }
  );
}
async function openProfile() {
  if (!currentUser) return;
  profileModal.hidden = false;
  document.body.style.overflow = 'hidden';
  profileEmail.textContent = 'نام کاربری: ' + displayNameOf(currentUser);
  profileMessage.textContent = 'کمی صبر کن...';
  nicknameInput.value = displayNameOf(currentUser);
  bioInput.value = '';
  setAvatar('');
  try {
    const data = await gql('query($id: uuid!) { profiles_by_pk(id: $id) { nickname bio avatar } }', { id: currentUser.id });
    const p = data.profiles_by_pk;
    if (p) {
      nicknameInput.value = p.nickname || displayNameOf(currentUser);
      bioInput.value = p.bio || '';
      setAvatar(safeAvatar(p.avatar));
    }
    profileMessage.textContent = '';
  } catch (error) {
    profileMessage.textContent = gqlErrorText(error, 'خواندن پروفایل ممکن نشد: ');
  }
}

profileAvatarImg.addEventListener('error', () => {
  profileAvatarImg.hidden = true;
  profileInitial.hidden = false;
});
document.getElementById('closeProfile').addEventListener('click', closeProfile);
profileModal.addEventListener('click', event => { if (event.target === profileModal) closeProfile(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeProfile(); });
document.getElementById('avatarPick').addEventListener('click', () => avatarInput.click());
document.getElementById('profileLogout').addEventListener('click', async () => {
  closeProfile();
  await signOut();
});

profileForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!currentUser) return;
  const nickname = nicknameInput.value.trim();
  const bio = bioInput.value.trim();
  if (nickname.length > 24 || bio.length > 200) {
    profileMessage.textContent = 'اسم حداکثر ۲۴ و توضیح حداکثر ۲۰۰ کاراکتر باشد.';
    return;
  }
  profileSave.disabled = true;
  profileMessage.textContent = 'در حال ذخیره...';
  try {
    await saveProfile({ nickname: nickname || null, bio: bio || null });
    profileMessage.textContent = 'پروفایل ذخیره شد ✓';
  } catch (error) {
    profileMessage.textContent = gqlErrorText(error, 'ذخیره نشد: ');
  } finally {
    profileSave.disabled = false;
  }
});

avatarInput.addEventListener('change', async () => {
  const file = avatarInput.files[0];
  avatarInput.value = '';
  if (!file || !currentUser) return;
  if (!AVATAR_TYPES.includes(file.type)) {
    profileMessage.textContent = 'فقط عکس JPG، PNG یا WebP قابل قبول است.';
    return;
  }
  if (file.size > AVATAR_MAX_BYTES) {
    profileMessage.textContent = 'حجم عکس نباید بیشتر از ۵ مگابایت باشد.';
    return;
  }
  profileMessage.textContent = 'در حال ذخیره عکس...';
  try {
    const dataUrl = await resizeToSquare(file, 128);
    if (!safeAvatar(dataUrl)) throw new Error('عکس قابل استفاده نیست');
    await saveProfile({ avatar: dataUrl });
    avatarCache.set(currentUser.id, dataUrl);
    setAvatar(dataUrl);
    profileMessage.textContent = 'عکس ذخیره شد ✓';
  } catch (error) {
    profileMessage.textContent = gqlErrorText(error, 'ذخیرهٔ عکس ناموفق بود: ');
  }
});

// ---------- Chat ----------
const chatLocked = document.getElementById('chatLocked');
const chatBox = document.getElementById('chatBox');
const chatList = document.getElementById('chatList');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatMessage = document.getElementById('chatMessage');
const CHAT_LIMIT = 60;
const CHAT_MAX_DOM = 200;
const CHAT_POLL_MS = 3000;
const MSG_FIELDS = 'id user_id author content created_at';
const avatarCache = new Map();
let chatPoll = null;
let chatBusy = false;
let chatLastId = 0;
let chatSeen = new Set();
let chatUserId = null;

function chatError(error) {
  if (isNetworkError(error)) return NETWORK_MSG;
  const m = (error && error.message) || '';
  if (m.includes('rate_limit_2s')) return 'کمی آهسته‌تر؛ هر ۲ ثانیه فقط یک پیام.';
  if (m.includes('rate_limit_minute')) return 'تعداد پیام‌هات زیاد بود؛ یک دقیقه صبر کن.';
  return gqlErrorText(error, 'ارسال نشد: ');
}
async function ensureAvatars(ids) {
  const need = Array.from(new Set(ids)).filter(id => !avatarCache.has(id));
  if (!need.length) return;
  try {
    const data = await gql('query($ids: [uuid!]!) { profiles(where: {id: {_in: $ids}}) { id avatar } }', { ids: need });
    const found = new Set();
    data.profiles.forEach(p => { avatarCache.set(p.id, safeAvatar(p.avatar)); found.add(p.id); });
    need.forEach(id => { if (!found.has(id)) avatarCache.set(id, ''); });
  } catch (e) { /* بدون عکس نشان داده می‌شود */ }
}
function chatAvatarNode(msg) {
  const box = document.createElement('div');
  box.className = 'chat-avatar';
  const initial = () => { box.textContent = Array.from(msg.author || '?')[0].toUpperCase(); };
  const url = avatarCache.get(msg.user_id);
  if (url) {
    const img = document.createElement('img');
    img.alt = '';
    img.src = url;
    img.addEventListener('error', () => { img.remove(); initial(); });
    box.appendChild(img);
  } else {
    initial();
  }
  return box;
}
function chatNearBottom() {
  return chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight < 80;
}
function addChatMessage(raw) {
  if (!raw) return;
  const msg = Object.assign({}, raw, { id: Number(raw.id) });
  if (chatSeen.has(msg.id)) return;
  chatSeen.add(msg.id);
  if (msg.id > chatLastId) chatLastId = msg.id;
  const empty = chatList.querySelector('.chat-empty');
  if (empty) empty.remove();
  const mine = msg.user_id === chatUserId;
  const stick = chatNearBottom() || mine;

  const row = document.createElement('div');
  row.className = 'chat-msg' + (mine ? ' mine' : '');
  row.dataset.id = msg.id;
  row.appendChild(chatAvatarNode(msg));

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  const meta = document.createElement('div');
  meta.className = 'chat-meta';
  const author = document.createElement('span');
  author.className = 'chat-author';
  author.textContent = msg.author;
  const time = document.createElement('span');
  time.textContent = new Date(msg.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  meta.append(author, time);
  if (mine) {
    const del = document.createElement('button');
    del.className = 'chat-del';
    del.type = 'button';
    del.title = 'حذف پیام';
    del.textContent = '×';
    del.addEventListener('click', async () => {
      try {
        await gql('mutation($id: bigint!) { delete_messages_by_pk(id: $id) { id } }', { id: msg.id });
        row.remove();
      } catch (error) {
        chatMessage.textContent = gqlErrorText(error, 'حذف نشد: ');
      }
    });
    meta.appendChild(del);
  }
  const text = document.createElement('div');
  text.className = 'chat-text';
  text.textContent = msg.content;
  bubble.append(meta, text);
  row.appendChild(bubble);
  chatList.appendChild(row);

  while (chatList.children.length > CHAT_MAX_DOM) chatList.firstElementChild.remove();
  if (stick) chatList.scrollTop = chatList.scrollHeight;
}
async function chatFetchNew() {
  if (chatBusy || !currentUser || !chatUserId) return;
  chatBusy = true;
  try {
    const data = await gql(
      'query($last: bigint!) { messages(where: {id: {_gt: $last}}, order_by: {id: asc}, limit: 100) { ' + MSG_FIELDS + ' } }',
      { last: chatLastId }
    );
    // پیام‌هایی که دیگران پاک کرده‌اند با رفرش شدن لیست حذف می‌شوند
    await ensureAvatars(data.messages.map(m => m.user_id));
    data.messages.forEach(addChatMessage);
    if (chatMessage.textContent === NETWORK_MSG) chatMessage.textContent = '';
  } catch (error) {
    if (isNetworkError(error)) chatMessage.textContent = NETWORK_MSG;
  } finally {
    chatBusy = false;
  }
}
async function startChat(user) {
  chatUserId = user.id;
  chatLocked.hidden = true;
  chatBox.hidden = false;
  chatList.innerHTML = '';
  chatSeen = new Set();
  chatLastId = 0;
  chatMessage.textContent = '';
  try {
    const data = await gql(
      'query($n: Int!) { messages(order_by: {id: desc}, limit: $n) { ' + MSG_FIELDS + ' } }',
      { n: CHAT_LIMIT }
    );
    if (chatUserId !== user.id) return;
    if (!data.messages.length) {
      const empty = document.createElement('div');
      empty.className = 'chat-empty';
      empty.textContent = 'هنوز پیامی نیست؛ اولین نفر باش!';
      chatList.appendChild(empty);
    } else {
      const list = data.messages.slice().reverse();
      await ensureAvatars(list.map(m => m.user_id));
      list.forEach(addChatMessage);
      chatList.scrollTop = chatList.scrollHeight;
    }
  } catch (error) {
    chatMessage.textContent = gqlErrorText(error, 'خواندن پیام‌ها ممکن نشد: ');
  }
  clearInterval(chatPoll);
  chatPoll = setInterval(() => { if (!document.hidden) chatFetchNew(); }, CHAT_POLL_MS);
}
function stopChat() {
  clearInterval(chatPoll);
  chatPoll = null;
  chatUserId = null;
  chatList.innerHTML = '';
  chatBox.hidden = true;
  chatLocked.hidden = false;
}
function onChatAuth(user) {
  if (user) {
    if (chatUserId === user.id) return;
    stopChat();
    startChat(user);
  } else if (chatUserId) {
    stopChat();
  }
}

document.getElementById('chatLogin').addEventListener('click', () => openAuth.click());
chatForm.addEventListener('submit', async event => {
  event.preventDefault();
  const content = chatInput.value.trim();
  if (!content || !currentUser || !chatUserId) return;
  chatSend.disabled = true;
  chatMessage.textContent = '';
  try {
    const data = await gql(
      'mutation($c: String!) { insert_messages_one(object: {content: $c}) { ' + MSG_FIELDS + ' } }',
      { c: content }
    );
    chatInput.value = '';
    avatarCache.has(chatUserId) || await ensureAvatars([chatUserId]);
    addChatMessage(data.insert_messages_one);
    chatInput.focus();
  } catch (error) {
    chatMessage.textContent = chatError(error);
  } finally {
    chatSend.disabled = false;
  }
});

// ---------- Gallery lightbox ----------
(function () {
  const items = Array.from(document.querySelectorAll('.gallery-item'));
  const box = document.getElementById('lightbox');
  if (!items.length || !box) return;
  const img = document.getElementById('lightboxImg');
  const cap = document.getElementById('lightboxCaption');
  let index = 0;
  function show(i) {
    index = (i + items.length) % items.length;
    const src = items[index].querySelector('img');
    img.src = src.src;
    img.alt = src.alt;
    cap.textContent = items[index].querySelector('.gallery-caption').textContent;
  }
  function open(i) {
    show(i);
    box.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function close() {
    box.hidden = true;
    document.body.style.overflow = '';
  }
  items.forEach((item, i) => item.addEventListener('click', () => open(i)));
  document.getElementById('lightboxClose').addEventListener('click', close);
  document.getElementById('lightboxPrev').addEventListener('click', () => show(index - 1));
  document.getElementById('lightboxNext').addEventListener('click', () => show(index + 1));
  box.addEventListener('click', e => { if (e.target === box) close(); });
  document.addEventListener('keydown', e => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(index - 1);
    if (e.key === 'ArrowLeft') show(index + 1);
  });
})();

// ---------- شروع: بازیابی نشست قبلی ----------
(function initSession() {
  const stored = loadStoredSession();
  if (!stored || !stored.refreshToken) return;
  session = stored;
  if (stored.expiresAt - Date.now() < 30000) {
    refreshSession().catch(error => { if (isNetworkError(error)) updateUserUI(stored.user); });
  } else {
    applySession(stored);
  }
})();
