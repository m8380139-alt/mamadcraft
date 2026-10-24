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
  if (window.supabase || !urls.length) return;
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
    openAuth.textContent = name + ' · خروج';
  } else {
    openAuth.textContent = 'ورود / ثبت‌نام ↗';
  }
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
  if (currentUser && sb) {
    await sb.auth.signOut();
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

loadSupabaseFrom([
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/@supabase/supabase-js@2'
]);
