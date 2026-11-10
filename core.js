/* ============================================================================
   Ratil.saher - Style.css
   ملاحظة: تنسيقات الواجهة الليلية، وإخفاء القراءة بالضبابية، 
   وتحديد المربع الواضح للكلمة الحالية.
   ============================================================================ */

:root {
  --bg: #0b1311;
  --panel: #111e1a;
  --text: #e6edec;
  --muted: #8aa39b;
  --cur: #1b3830;
  --ok: #22c55e;
  --near: #f59e0b;
  --miss: #ef4444;
  --line: #162621;
}

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 0;
  direction: rtl;
}

/* حاوية النص العامة */
#text {
  line-height: 2.4;
  font-size: 1.8rem;
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
  text-align: right;
}

/* الآيات */
.v {
  display: inline;
  margin-left: 8px;
}

/* أرقام الآيات */
.num {
  font-size: 1.2rem;
  color: var(--muted);
  margin: 0 6px;
  user-select: none;
}

/* الكلمات الأساسية */
.w {
  display: inline-block;
  padding: 0 4px;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}

/* حالات التلاوة */
.w.todo { color: var(--text); }
.w.ok { color: var(--ok); }
.w.near { color: var(--near); }
.w.miss { color: var(--miss); }

/* الكلمة الحالية أثناء التلاوة العادية */
.w.cur {
  background-color: var(--cur);
  border: 1px solid var(--ok);
  color: var(--text) !important;
}

/* ============================================================================
   وضع إخفاء للقراءة (Reading-Hide Mode)
   ============================================================================ */
body.reading-hide #text .w {
  color: transparent !important;
  background: var(--line);
  filter: blur(6px);
  user-select: none;
  transition: all 0.2s;
}

/* إظهار الكلمة الحالية (.cur) بوضوح داخل مربع التحديد حتى لو كان وضع الإخفاء مفعلاً */
body.reading-hide #text .w.cur {
  color: var(--text) !important;
  background-color: var(--cur) !important;
  border: 1px solid var(--ok) !important;
  filter: none !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
}

/* أزرار التحكم والواجهة */
button, select {
  background-color: var(--panel);
  color: var(--text);
  border: 1px solid var(--muted);
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}

button:hover {
  background-color: var(--cur);
}

.rec {
  background-color: #ef4444 !important;
  color: #fff !important;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}
