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

// ---------- Supabase ----------
const SUPABASE_URL = 'https://yfcuxadgqtkbdlxqnxhk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_DKzOZkCrI5Q-7EOilFUgyw_8KD3xKZ_';
let sb = null;
function initSupabase() {
  if (sb || !window.supabase) return;
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  sb.auth.getSession().then(({ data }) => updateUserUI(data.session ? data.session.user : null));
  sb.auth.onAuthStateChange((_event, session) => updateUserUI(session ? session.user : null));
}
function loadSupabaseFrom(urls) {
  if (window.supabase) { initSupabase(); return; }
  if (!urls.length) return;
  const el = document.createElement('script');
  el.src = urls[0];
  el.async = true;
  el.onload = initSupabase;
  el.onerror = () => loadSupabaseFrom(urls.slice(1));
  document.head.appendChild(el);
  setTimeout(() => { if (!window.supabase) loadSupabaseFrom(urls.slice(1)); }, 6000);
}

const modal = document.getElementById('authModal');
const openAuth = document.getElementById('openAuth');
const closeAuth = document.getElementById('closeAuth');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authSubmit = document.getElementById('authSubmit');
const usernameField = document.getElementById('usernameField');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const formMessage = document.getElementById('formMessage');
let authMode = 'login';
let currentUser = null;

function showModal() {
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  formMessage.textContent = '';
  emailInput.focus();
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
  usernameField.hidden = !registering;
  usernameInput.required = registering;
  passwordInput.autocomplete = registering ? 'new-password' : 'current-password';
  formMessage.textContent = '';
}
function updateUserUI(user) {
  currentUser = user;
  if (user) {
    const name = (user.user_metadata && user.user_metadata.username) || user.email;
    openAuth.textContent = name + ' · پروفایل';
  } else {
    openAuth.textContent = 'ورود / ثبت‌نام ↗';
    if (typeof closeProfile === 'function') closeProfile();
  }
  if (typeof onChatAuth === 'function') onChatAuth(user);
}
function translateError(message) {
  if (message.includes('Invalid login credentials')) return 'ایمیل یا رمز عبور اشتباه است.';
  if (message.includes('already registered')) return 'این ایمیل قبلاً ثبت‌نام کرده است.';
  if (message.includes('Email not confirmed')) return 'ایمیلت هنوز تأیید نشده؛ صندوق ایمیلت را چک کن.';
  if (message.includes('Password should be')) return 'رمز عبور خیلی ضعیف است؛ حداقل ۸ کاراکتر بذار.';
  if (message.includes('rate limit')) return 'تعداد تلاش‌ها زیاد بود؛ چند دقیقه بعد دوباره امتحان کن.';
  return 'خطا: ' + message;
}

openAuth.addEventListener('click', async () => {
  if (currentUser) {
    openProfile();
  } else {
    showModal();
  }
});
closeAuth.addEventListener('click', hideModal);
modal.addEventListener('click', event => { if (event.target === modal) hideModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) hideModal(); });
document.querySelectorAll('.auth-tab').forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));

authForm.addEventListener('submit', async event => {
  event.preventDefault();
  initSupabase();
  if (!sb) {
    formMessage.textContent = 'اتصال به سرویس ورود برقرار نیست؛ اینترنت یا فیلترشکنت را چک کن و صفحه را دوباره باز کن.';
    return;
  }
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  authSubmit.disabled = true;
  formMessage.textContent = 'کمی صبر کن...';
  try {
    if (authMode === 'register') {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { username: usernameInput.value.trim() } }
      });
      if (error) throw error;
      if (data.session) {
        formMessage.textContent = 'ثبت‌نام انجام شد و وارد شدی!';
        setTimeout(hideModal, 900);
      } else {
        formMessage.textContent = 'ثبت‌نام انجام شد. برای تأیید، ایمیلت را چک کن.';
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      formMessage.textContent = 'با موفقیت وارد شدی!';
      setTimeout(hideModal, 900);
    }
    authForm.reset();
  } catch (error) {
    formMessage.textContent = translateError(error.message || 'مشکلی پیش آمد');
  } finally {
    authSubmit.disabled = false;
  }
});

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

function closeProfile() {
  if (!profileModal || profileModal.hidden) return;
  profileModal.hidden = true;
  document.body.style.overflow = '';
}
function defaultName() {
  if (!currentUser) return '';
  return (currentUser.user_metadata && currentUser.user_metadata.username) || currentUser.email || '';
}
function setAvatar(url) {
  const label = nicknameInput.value.trim() || defaultName() || '?';
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
function avatarUrl(path, stamp) {
  if (!path || !sb) return '';
  const { data } = sb.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl + '?v=' + encodeURIComponent(stamp || Date.now());
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
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('resize failed')), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    img.src = url;
  });
}
async function openProfile() {
  if (!currentUser || !sb) return;
  profileModal.hidden = false;
  document.body.style.overflow = 'hidden';
  profileEmail.textContent = currentUser.email || '';
  profileMessage.textContent = 'کمی صبر کن...';
  nicknameInput.value = defaultName();
  bioInput.value = '';
  setAvatar('');
  const { data, error } = await sb.from('profiles')
    .select('nickname,bio,avatar_path,updated_at')
    .eq('id', currentUser.id)
    .maybeSingle();
  if (error) {
    profileMessage.textContent = 'خواندن پروفایل ممکن نشد: ' + error.message;
    return;
  }
  if (data) {
    nicknameInput.value = data.nickname || defaultName();
    bioInput.value = data.bio || '';
    setAvatar(avatarUrl(data.avatar_path, data.updated_at));
  }
  profileMessage.textContent = '';
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
  if (sb) await sb.auth.signOut();
  closeProfile();
});

profileForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!sb || !currentUser) return;
  const nickname = nicknameInput.value.trim();
  const bio = bioInput.value.trim();
  if (nickname.length > 24 || bio.length > 200) {
    profileMessage.textContent = 'اسم حداکثر ۲۴ و توضیح حداکثر ۲۰۰ کاراکتر باشد.';
    return;
  }
  profileSave.disabled = true;
  profileMessage.textContent = 'در حال ذخیره...';
  const { error } = await sb.from('profiles').upsert({
    id: currentUser.id,
    nickname: nickname || null,
    bio: bio || null,
    updated_at: new Date().toISOString()
  });
  profileSave.disabled = false;
  profileMessage.textContent = error ? 'ذخیره نشد: ' + error.message : 'پروفایل ذخیره شد ✓';
});

avatarInput.addEventListener('change', async () => {
  const file = avatarInput.files[0];
  avatarInput.value = '';
  if (!file || !sb || !currentUser) return;
  if (!AVATAR_TYPES.includes(file.type)) {
    profileMessage.textContent = 'فقط عکس JPG، PNG یا WebP قابل قبول است.';
    return;
  }
  if (file.size > AVATAR_MAX_BYTES) {
    profileMessage.textContent = 'حجم عکس نباید بیشتر از ۵ مگابایت باشد.';
    return;
  }
  profileMessage.textContent = 'در حال آپلود عکس...';
  try {
    const blob = await resizeToSquare(file, 256);
    const path = currentUser.id + '/avatar.jpg';
    const up = await sb.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
    if (up.error) throw up.error;
    const stamp = new Date().toISOString();
    const saved = await sb.from('profiles').upsert({ id: currentUser.id, avatar_path: path, updated_at: stamp });
    if (saved.error) throw saved.error;
    setAvatar(avatarUrl(path, stamp));
    profileMessage.textContent = 'عکس ذخیره شد ✓';
  } catch (error) {
    profileMessage.textContent = 'آپلود عکس ناموفق بود: ' + (error.message || 'خطای نامشخص');
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
let chatChannel = null;
let chatPoll = null;
let chatRealtimeOk = false;
let chatLastId = 0;
let chatSeen = new Set();
let chatUserId = null;

function chatError(error) {
  const m = (error && error.message) || '';
  if (m.includes('rate_limit_2s')) return 'کمی آهسته‌تر؛ هر ۲ ثانیه فقط یک پیام.';
  if (m.includes('rate_limit_minute')) return 'تعداد پیام‌هات زیاد بود؛ یک دقیقه صبر کن.';
  return 'ارسال نشد: ' + m;
}
function chatAvatarNode(msg) {
  const box = document.createElement('div');
  box.className = 'chat-avatar';
  const initial = () => { box.textContent = Array.from(msg.author || '?')[0].toUpperCase(); };
  if (msg.avatar_path && sb) {
    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.src = sb.storage.from('avatars').getPublicUrl(msg.avatar_path).data.publicUrl;
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
function addChatMessage(msg) {
  if (!msg || chatSeen.has(msg.id)) return;
  chatSeen.add(msg.id);
  if (msg.id > chatLastId) chatLastId = msg.id;
  const empty = chatList.querySelector('.chat-empty');
  if (empty) empty.remove();
  const stick = chatNearBottom() || msg.user_id === chatUserId;

  const row = document.createElement('div');
  row.className = 'chat-msg' + (msg.user_id === chatUserId ? ' mine' : '');
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
  if (msg.user_id === chatUserId) {
    const del = document.createElement('button');
    del.className = 'chat-del';
    del.type = 'button';
    del.title = 'حذف پیام';
    del.textContent = '×';
    del.addEventListener('click', async () => {
      const { error } = await sb.from('messages').delete().eq('id', msg.id);
      if (error) chatMessage.textContent = 'حذف نشد: ' + error.message;
      else removeChatMessage(msg.id);
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
function removeChatMessage(id) {
  const el = chatList.querySelector('[data-id="' + id + '"]');
  if (el) el.remove();
}
async function chatFetchNew() {
  if (!sb || !chatUserId) return;
  const { data, error } = await sb.from('messages')
    .select('id,user_id,author,avatar_path,content,created_at')
    .gt('id', chatLastId)
    .order('id', { ascending: true })
    .limit(100);
  if (!error && data) data.forEach(addChatMessage);
}
async function startChat(user) {
  chatUserId = user.id;
  chatLocked.hidden = true;
  chatBox.hidden = false;
  chatList.innerHTML = '';
  chatSeen = new Set();
  chatLastId = 0;
  chatMessage.textContent = '';
  const { data, error } = await sb.from('messages')
    .select('id,user_id,author,avatar_path,content,created_at')
    .order('id', { ascending: false })
    .limit(CHAT_LIMIT);
  if (error) {
    chatMessage.textContent = 'خواندن پیام‌ها ممکن نشد: ' + error.message;
  } else if (!data.length) {
    const empty = document.createElement('div');
    empty.className = 'chat-empty';
    empty.textContent = 'هنوز پیامی نیست؛ اولین نفر باش!';
    chatList.appendChild(empty);
  } else {
    data.reverse().forEach(addChatMessage);
    chatList.scrollTop = chatList.scrollHeight;
  }
  chatChannel = sb.channel('public-chat')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => addChatMessage(payload.new))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
      if (payload.old && payload.old.id) removeChatMessage(payload.old.id);
    })
    .subscribe(status => { chatRealtimeOk = status === 'SUBSCRIBED'; });
  chatPoll = setInterval(() => { if (!chatRealtimeOk) chatFetchNew(); }, 8000);
}
function stopChat() {
  if (chatPoll) clearInterval(chatPoll);
  chatPoll = null;
  if (chatChannel && sb) sb.removeChannel(chatChannel);
  chatChannel = null;
  chatRealtimeOk = false;
  chatUserId = null;
  chatList.innerHTML = '';
  chatBox.hidden = true;
  chatLocked.hidden = false;
}
function onChatAuth(user) {
  if (!sb) return;
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
  if (!content || !sb || !chatUserId) return;
  chatSend.disabled = true;
  chatMessage.textContent = '';
  const { data, error } = await sb.from('messages').insert({ content }).select().single();
  chatSend.disabled = false;
  if (error) {
    chatMessage.textContent = chatError(error);
    return;
  }
  chatInput.value = '';
  addChatMessage(data);
  chatInput.focus();
});

loadSupabaseFrom([
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/@supabase/supabase-js@2'
]);

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
