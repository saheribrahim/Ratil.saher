// Supabase authentication for Ratil, with username/password UI.
// Supabase still uses an internal email identifier; non-admin usernames map to
// an unroutable ratil.invalid address. Disable email confirmations in Supabase
// Auth settings before enabling username-only signup.
const SUPABASE_URL = "https://arsvcabzyvgsqtbxchom.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_k-NAJUWfzq3vL952cgpryA_vVuxoQOC";
const ADMIN_EMAIL = "ssaheror@gmail.com";
const ADMIN_USERNAME = "saher";

let supabaseClient;
let currentUser = null;
let mode = "login";
let authBusy = false;

const am = (message, isError = false) => {
  const messageElement = document.getElementById("aMsg");
  messageElement.textContent = message;
  messageElement.className = isError ? "err" : "";
};

function normalizedUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function usernameToAuthEmail(username) {
  return normalizedUsername(username) === ADMIN_USERNAME
    ? ADMIN_EMAIL
    : `${normalizedUsername(username)}@ratil.invalid`;
}

function isAdminAccount(user) {
  return String(user?.email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

function setMode(value) {
  mode = value;
  document.getElementById("tL").classList.toggle("primary", mode === "login");
  document.getElementById("tS").classList.toggle("primary", mode === "signup");
  const usernameInput = document.getElementById("aU");
  usernameInput.style.display = "";
  usernameInput.placeholder = "Username / اسم المستخدم";
  usernameInput.autocomplete = "username";
  usernameInput.value = "";
  document.getElementById("aP").autocomplete = mode === "signup" ? "new-password" : "current-password";
  document.getElementById("aGo").textContent = mode === "signup"
    ? "Create account إنشاء حساب"
    : "Log in دخول";
  document.getElementById("aP").value = "";
  am("");
}

function friendlyAuthError(error) {
  const message = String(error?.message || "");
  if (/invalid login credentials/i.test(message)) return "اسم المستخدم أو كلمة المرور غير صحيحة.";
  if (/user already registered/i.test(message)) return "اسم المستخدم مسجل بالفعل. اختر تسجيل الدخول.";
  if (/password.*(weak|short|least)/i.test(message)) return "كلمة المرور قصيرة؛ استخدم كلمة مرور من 8 أحرف على الأقل.";
  if (/email.*(invalid|valid)/i.test(message)) return "تعذّر إنشاء الحساب. تأكد من تعطيل تأكيد البريد في إعدادات Supabase.";
  return message || "تعذّر الاتصال بخدمة الحسابات. تحقق من الإنترنت وإعدادات Supabase.";
}

function injectFeedbackUI() {
  if (document.getElementById("feedbackSection")) return;
  const style = document.createElement("style");
  style.textContent = `
    #feedbackSection{display:none;margin:12px 0;padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--card);color:var(--ink)}
    #feedbackSection h2{margin:0 0 8px;font-size:18px}
    #feedbackSection p{color:var(--mute);font-size:14px;margin:6px 0 10px}
    #feedbackMessage{display:block;width:100%;min-height:100px;margin:8px 0;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);font:inherit;resize:vertical}
    #feedbackStatus{min-height:1.5em;margin:8px 0;color:var(--mute);font-size:14px}
    #feedbackList{display:grid;gap:10px;margin-top:12px}
    .feedback-item{padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--bg)}
    .feedback-meta{margin-bottom:6px;color:var(--mute);font-size:13px}
    .feedback-text{white-space:pre-wrap;overflow-wrap:anywhere}
  `;
  document.head.appendChild(style);

  const section = document.createElement("section");
  section.id = "feedbackSection";
  section.innerHTML = `
    <h2>ملاحظاتك · Feedback</h2>
    <p>اكتب اقتراحك أو بلّغ عن مشكلة. سيتمكن المشرف من الاطلاع على الملاحظات المرسلة.</p>
    <label for="feedbackMessage">اكتب ملاحظتك</label>
    <textarea id="feedbackMessage" maxlength="2000" placeholder="اكتب ملاحظتك هنا…" required></textarea>
    <button id="feedbackSubmit" type="button" class="primary">إرسال الملاحظة Submit</button>
    <div id="feedbackStatus" role="status" aria-live="polite"></div>
    <div id="adminFeedback" style="display:none">
      <h2>ملاحظات المستخدمين · User feedback</h2>
      <button id="refreshFeedback" type="button">تحديث القائمة</button>
      <div id="feedbackList" aria-live="polite"></div>
    </div>
  `;
  const me = document.getElementById("me");
  me.insertAdjacentElement("afterend", section);
  document.getElementById("feedbackSubmit").addEventListener("click", submitFeedback);
  document.getElementById("refreshFeedback").addEventListener("click", loadFeedback);
}

function showSignedIn(user) {
  currentUser = user;
  const username = isAdminAccount(user) ? ADMIN_USERNAME : user.user_metadata?.username;
  document.getElementById("auth").style.display = "none";
  document.getElementById("me").style.display = "block";
  document.getElementById("who").textContent = username || "مستخدم";
  const section = document.getElementById("feedbackSection");
  section.style.display = "block";
  const isAdmin = isAdminAccount(user);
  document.getElementById("adminFeedback").style.display = isAdmin ? "block" : "none";
  if (isAdmin) loadFeedback();
}

function showSignedOut() {
  currentUser = null;
  if (typeof stop === "function") stop();
  document.getElementById("me").style.display = "none";
  document.getElementById("feedbackSection").style.display = "none";
  document.getElementById("auth").style.display = "flex";
}

async function handleAuthSubmit() {
  if (authBusy) return;
  const username = document.getElementById("aU").value.trim();
  const normalized = normalizedUsername(username);
  const password = document.getElementById("aP").value;
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
    return am("اسم المستخدم يجب أن يكون من 3 إلى 30 حرفًا إنجليزيًا أو رقمًا أو (._-).", true);
  }
  if (!password) return am("أدخل كلمة المرور.", true);
  if (mode === "signup" && password.length < 8) {
    return am("استخدم كلمة مرور من 8 أحرف على الأقل.", true);
  }
  if (mode === "signup" && normalized === ADMIN_USERNAME) {
    return am("اسم المستخدم محجوز للمشرف.", true);
  }

  const button = document.getElementById("aGo");
  authBusy = true;
  button.disabled = true;
  try {
    const email = usernameToAuthEmail(username);
    if (mode === "signup") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { username: username.trim() } }
      });
      if (error) throw error;
      if (data.session) {
        showSignedIn(data.user);
        am("تم إنشاء الحساب وتسجيل الدخول بنجاح.");
      } else {
        am("تم إنشاء الحساب، لكن يلزم تعطيل تأكيد البريد في إعدادات Supabase لاستخدام تسجيل الدخول باسم المستخدم فقط.", true);
        setMode("login");
      }
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showSignedIn(data.user);
      am("");
    }
  } catch (error) {
    am(friendlyAuthError(error), true);
  } finally {
    authBusy = false;
    button.disabled = false;
  }
}

async function submitFeedback() {
  const input = document.getElementById("feedbackMessage");
  const status = document.getElementById("feedbackStatus");
  const button = document.getElementById("feedbackSubmit");
  const message = input.value.trim();
  if (!currentUser) return status.textContent = "سجّل الدخول أولًا لإرسال الملاحظة.";
  if (!message) return status.textContent = "اكتب ملاحظتك قبل الإرسال.";
  if (message.length > 2000) return status.textContent = "الملاحظة طويلة جدًا (الحد الأقصى 2000 حرف).";
  button.disabled = true;
  status.textContent = "جارٍ إرسال الملاحظة…";
  try {
    const username = isAdminAccount(currentUser) ? ADMIN_USERNAME : String(currentUser.user_metadata?.username || "مستخدم");
    const { error } = await supabaseClient.from("feedback").insert({
      user_id: currentUser.id,
      username,
      message
    });
    if (error) throw error;
    input.value = "";
    status.textContent = "تم إرسال ملاحظتك، شكرًا لك.";
    if (isAdminAccount(currentUser)) await loadFeedback();
  } catch (error) {
    status.textContent = /relation .*feedback.* does not exist/i.test(String(error.message || ""))
      ? "جدول الملاحظات غير مفعّل بعد. نفّذ ملف supabase-feedback.sql في Supabase."
      : `تعذّر إرسال الملاحظة: ${error.message || "تحقق من الاتصال وإعدادات قاعدة البيانات."}`;
  } finally {
    button.disabled = false;
  }
}

async function loadFeedback() {
  const list = document.getElementById("feedbackList");
  if (!list || !isAdminAccount(currentUser)) return;
  list.replaceChildren();
  const loading = document.createElement("p");
  loading.textContent = "جارٍ تحميل الملاحظات…";
  list.appendChild(loading);
  const { data, error } = await supabaseClient
    .from("feedback")
    .select("id, username, message, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  list.replaceChildren();
  if (error) {
    const problem = document.createElement("p");
    problem.textContent = "تعذّر تحميل الملاحظات. تأكد من تنفيذ supabase-feedback.sql ومن صلاحية حساب المشرف.";
    list.appendChild(problem);
    return;
  }
  if (!data.length) {
    const empty = document.createElement("p");
    empty.textContent = "لا توجد ملاحظات مرسلة حتى الآن.";
    list.appendChild(empty);
    return;
  }
  for (const item of data) {
    const card = document.createElement("article");
    card.className = "feedback-item";
    const meta = document.createElement("div");
    meta.className = "feedback-meta";
    const date = new Date(item.created_at);
    meta.textContent = `${String(item.username || "مستخدم")} · ${Number.isNaN(date.getTime()) ? "" : date.toLocaleString()}`;
    const body = document.createElement("div");
    body.className = "feedback-text";
    body.textContent = String(item.message || "");
    card.append(meta, body);
    list.appendChild(card);
  }
}

async function handleSignOut() {
  const button = document.getElementById("out");
  button.style.pointerEvents = "none";
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    showSignedOut();
    document.getElementById("aP").value = "";
    setMode("login");
  } catch (error) {
    am(friendlyAuthError(error), true);
  } finally {
    button.style.pointerEvents = "";
  }
}

function loadSupabaseSdk() {
  if (window.supabase?.createClient) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("تعذّر تحميل مكتبة Supabase. تحقق من اتصال الإنترنت."));
    document.head.appendChild(script);
  });
}

async function initializeAuth() {
  const button = document.getElementById("aGo");
  button.disabled = true;
  try {
    document.getElementById("aE")?.remove();
    injectFeedbackUI();
    await loadSupabaseSdk();
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    document.getElementById("tL").addEventListener("click", () => setMode("login"));
    document.getElementById("tS").addEventListener("click", () => setMode("signup"));
    button.addEventListener("click", handleAuthSubmit);
    document.getElementById("aP").addEventListener("keydown", event => {
      if (event.key === "Enter") handleAuthSubmit();
    });
    document.getElementById("aU").addEventListener("keydown", event => {
      if (event.key === "Enter") handleAuthSubmit();
    });
    document.getElementById("out").addEventListener("click", handleSignOut);
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (data.session?.user) showSignedIn(data.session.user);
    else showSignedOut();
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) showSignedIn(session.user);
      else showSignedOut();
    });
    setMode("login");
  } catch (error) {
    am(friendlyAuthError(error), true);
  } finally {
    button.disabled = false;
  }
}

// السطر الوحيد في النهاية هو استدعاء الدالة فقط:
initializeAuth();
