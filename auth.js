import { supabase } from './supabase.js';

const lg = document.getElementById('lg');
const tr = (m = '') =>
  /Invalid login/i.test(m) ? 'E-posta veya şifre hatalı.' :
  /not confirmed/i.test(m) ? 'E-posta adresi doğrulanmamış.' :
  /rate|too many/i.test(m) ? 'Çok fazla deneme yapıldı. Biraz bekleyin.' :
  'Giriş yapılamadı. İnternet bağlantınızı kontrol edin.';

function lock(msg = '') {
  document.body.classList.add('locked');
  lg.innerHTML = '<form id="lf" class="card" style="width:100%;max-width:340px">' +
    '<h2 style="margin:0 0 4px">🧺 Mahir Kurutemizleme</h2><small style="color:var(--mut)">Yönetim paneli girişi</small>' +
    '<label>E-posta</label><input id="le" type="email" required autocomplete="username" style="width:100%">' +
    '<label>Şifre</label><input id="lp" type="password" required autocomplete="current-password" style="width:100%">' +
    '<p id="lm" style="color:var(--rd);min-height:1.3em"></p><button id="lb" style="width:100%">Giriş Yap</button></form>';
  document.getElementById('lm').textContent = msg;
  document.getElementById('lf').onsubmit = async (e) => {
    e.preventDefault();
    const b = document.getElementById('lb'), m = document.getElementById('lm');
    b.disabled = true; m.textContent = '';
    const { error } = await supabase.auth.signInWithPassword({
      email: document.getElementById('le').value.trim(),
      password: document.getElementById('lp').value,
    });
    if (error) { m.textContent = tr(error.message); b.disabled = false; return; }
    await enter();
  };
}

function addBar(st) {
  document.getElementById('lo')?.remove();
  const b = document.createElement('button');
  b.id = 'lo'; b.className = 'b2'; b.textContent = 'Çıkış (' + st.full_name + ')';
  b.onclick = async () => { await supabase.auth.signOut(); location.reload(); };
  document.getElementById('top').append(b);
}

// Oturum var mı ve bu kullanıcı staff tablosunda aktif mi? (Asıl koruma veritabanı RLS'indedir.)
async function enter() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return lock();
  const { data: st, error } = await supabase.from('staff')
    .select('full_name,role,active').eq('user_id', session.user.id).maybeSingle();
  if (error || !st || !st.active) {
    lock('Bu hesabın yönetim paneline erişim yetkisi yok.');
    await supabase.auth.signOut();
    return;
  }
  window.__mahir = { role: st.role, name: st.full_name };
  document.body.classList.remove('locked');
  addBar(st);
}

export function initAuth() {
  if (!supabase) {
    lock("Yapılandırma eksik: Vercel'de VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY değişkenlerini girin.");
    return;
  }
  supabase.auth.onAuthStateChange((ev) => {
    if (ev === 'SIGNED_OUT' && !document.body.classList.contains('locked')) location.reload();
  });
  enter();
}
