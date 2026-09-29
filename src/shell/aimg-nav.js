// <aimg-nav> and <aimg-footer> — the one site header and footer, shared by the
// static pages (index.html, about.html, apply.html) and both React apps
// (/community, /students). Framework-free custom elements rendered into the
// light DOM so the site's fonts and palette apply.
//
//   <aimg-nav active="about"></aimg-nav>            marketing / app header
//   <aimg-nav variant="slim">…slot="title"…</aimg-nav>  enrollment page header
//   <aimg-footer></aimg-footer>
//
// Auth state is presentation only — never treat it as security. First paint
// comes from the stored session (synchronous, no supabase-js); supabase-js is
// then lazy-loaded to verify it and fetch the role (name, avatar, portfolio,
// admin).
//
// Host apps can intercept link clicks: each click on a same-origin nav link
// dispatches a cancelable `aimg-navigate` event ({ detail: { url } }) that
// bubbles from the element; call preventDefault() to route client-side.

import './aimg-nav.css';
import { readStoredSession, sharedAuthStorage, AUTH_STORAGE_KEY } from './auth-storage.js';

// ───────────────────────────── config ─────────────────────────────
// One list drives the desktop links, the mobile drawer, and the footer CTA.
// `for`: which audience sees the item — 'visitor', 'member', or both.
const LINKS = [
  { key: 'home', label: 'Home', href: '/', for: ['visitor', 'member'] },
  { key: 'programs', label: 'Programs', href: '/#tracks', for: ['visitor'] },
  { key: 'contest', label: 'Contest', href: '/contest', for: ['visitor', 'member'] },
  { key: 'community', label: 'Community', href: '/community', for: ['member'] },
  { key: 'boards', label: 'Boards', href: '/community?tab=boards', for: ['member'] },
  { key: 'messages', label: 'Messages', href: '/community?tab=messages', for: ['member'] },
  { key: 'makers', label: 'Makers', href: '/students', for: ['visitor', 'member'] },
  { key: 'events', label: 'Events', href: '/#next', for: ['visitor', 'member'] },
  { key: 'about', label: 'Who we are', href: '/about', for: ['visitor'] },
  { key: 'faq', label: 'FAQ', href: '/#faq', for: ['visitor', 'member'] },
];
const CTA = { label: 'Enroll in the Cohort', href: '/apply' };
const SIGN_IN = { label: 'Sign in', href: '/community' };
const MENU = {
  settings: { label: 'Settings', href: '/community/settings' },
  admin: { label: 'Admin', href: '/community/admin' },
};

const SOCIAL = [
  { label: 'Instagram', href: 'https://instagram.com/aimakersgeneration' },
  { label: 'TikTok', href: 'https://tiktok.com/@aimakersgeneration' },
  { label: 'X / Twitter', href: 'https://x.com/aimakersgen' },
  { label: 'Facebook group', href: 'https://facebook.com/share/g/1BYbDKRKR5' },
  { label: 'WhatsApp community', href: 'https://chat.whatsapp.com/IdfiaQhqeOuEpduKv2SvP5' },
];
const PROGRAMS = [
  { label: 'Film Bar AI — free Tuesdays', href: '/#film-bar' },
  { label: 'Workshop Wednesdays', href: '/#workshops' },
  { label: 'October Film Cohort', href: '/#cohort' },
];
const SITE = [
  { label: 'Who we are', href: '/about' },
  { label: 'Makers', href: '/students' },
  { label: 'Community', href: '/community' },
  { label: 'FAQ', href: '/#faq' },
];

const APEX = 'https://aimakersgeneration.com';

// On the cohorts subdomain "/" redirects to /apply, so every site link points
// at the main domain instead.
function siteBase() {
  return /^cohorts\./.test(location.hostname) ? APEX : '';
}
const url = (href) => (href.startsWith('/') ? siteBase() + href : href);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const BOT_SVG = `<svg width="34" height="28" viewBox="0 0 40 34" aria-hidden="true" focusable="false">
  <ellipse cx="20" cy="14" rx="18.5" ry="12.5" fill="currentColor"/>
  <path d="M13 23 L9 33 L23 24 Z" fill="currentColor"/>
  <circle cx="11.5" cy="14" r="2.5" fill="#fff"/>
  <circle cx="20" cy="14" r="2.5" fill="#fff"/>
  <circle cx="28.5" cy="14" r="2.5" fill="#fff"/>
</svg>`;
const CHEV_SVG = '<svg class="an-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg>';
const BURGER_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
const CLOSE_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg>';

// ───────────────────────────── auth state ─────────────────────────────
// One module-level store shared by every <aimg-nav> on the page.
const PROFILE_CACHE = 'aimg-nav-profile';

const auth = {
  signedIn: false,
  uid: null,
  email: null,
  accessToken: null,
  name: null,
  avatar: null,
  portfolio: null, // href
  admin: false,
  unread: 0, // conversations with unread messages (Messages badge)
};
const subscribers = new Set();

function readCache(uid) {
  try {
    const c = JSON.parse(localStorage.getItem(PROFILE_CACHE) || 'null');
    return c && c.uid === uid ? c : null;
  } catch { return null; }
}
function writeCache() {
  try {
    if (!auth.signedIn) { localStorage.removeItem(PROFILE_CACHE); return; }
    const { uid, name, avatar, portfolio, admin } = auth;
    localStorage.setItem(PROFILE_CACHE, JSON.stringify({ uid, name, avatar, portfolio, admin }));
  } catch { /* storage unavailable */ }
}

// Name/avatar fallbacks match the old community UserMenu: profile name, then
// OAuth metadata (e.g. Google), then username, then email.
function displayName(user, profile) {
  const m = user?.user_metadata || {};
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
    || m.full_name || m.name || profile?.username || user?.email || 'Maker';
}
function displayAvatar(user, profile) {
  const m = user?.user_metadata || {};
  return profile?.avatar_url || m.avatar_url || m.picture || null;
}

// The single place auth state changes: updates the store, re-renders every
// nav, and publishes window.__aimgAuth + the `aimg:auth` event (consumed by
// public/aimg-bot.js), so they can never drift apart.
function publish(patch) {
  Object.assign(auth, patch);
  if (!auth.signedIn) {
    Object.assign(auth, { uid: null, email: null, accessToken: null, name: null, avatar: null, portfolio: null, admin: false, unread: 0 });
  }
  writeCache();
  window.__aimgAuth = { signedIn: auth.signedIn, name: auth.name, accessToken: auth.accessToken };
  window.dispatchEvent(new CustomEvent('aimg:auth', { detail: window.__aimgAuth }));
  subscribers.forEach((fn) => fn());
}

// Everything we can know about a session without the network.
function fromSession(session) {
  if (!session?.user) return { signedIn: false };
  const user = session.user;
  const cached = readCache(user.id);
  return {
    signedIn: true,
    uid: user.id,
    email: user.email || null,
    accessToken: session.access_token || null,
    name: cached?.name || displayName(user, null),
    avatar: cached?.avatar || displayAvatar(user, null),
    portfolio: cached?.portfolio || `/community/profile/${user.id}`,
    admin: !!cached?.admin,
    unread: 0,
  };
}

let supabasePromise = null;
let roleFor = null; // uid whose role was last fetched

async function fetchRole(supabase, session) {
  const user = session.user;
  const uid = user.id;
  roleFor = uid;
  const [prof, stud, adm] = await Promise.all([
    supabase.from('profiles').select('username, avatar_url, first_name, last_name').eq('id', uid).maybeSingle(),
    supabase.from('students').select('slug, cohort, created_at').eq('user_id', uid)
      .order('created_at', { ascending: false }).limit(1),
    supabase.rpc('is_admin'),
  ].map((p) => Promise.resolve(p).catch((error) => ({ data: null, error }))));
  if (auth.uid !== uid) return; // signed out / switched while we waited
  const profile = prof?.data || null;
  const slug = Array.isArray(stud?.data) && stud.data[0]?.slug;
  publish({
    name: displayName(user, profile),
    avatar: displayAvatar(user, profile),
    portfolio: slug ? `/students/${encodeURIComponent(slug)}` : `/community/profile/${uid}`,
    admin: adm?.data === true,
  });
}

// Unread-conversation count for the Messages badge. Best effort: any failure
// (e.g. messaging not set up yet) just hides the badge.
async function fetchUnread(supabase) {
  const uid = auth.uid;
  if (!uid) return;
  let n = 0;
  try {
    const { data, error } = await supabase.rpc('unread_conversation_count');
    if (!error && Number.isFinite(data)) n = data;
  } catch { /* ignore */ }
  if (auth.uid === uid && auth.unread !== n) publish({ unread: n });
}

function onSession(supabase, session) {
  if (!session?.user) {
    roleFor = null;
    if (auth.signedIn) publish({ signedIn: false });
    return;
  }
  const base = fromSession(session);
  if (auth.uid === session.user.id) {
    // Same user (e.g. TOKEN_REFRESHED): keep the resolved role, refresh the token.
    publish({ signedIn: true, accessToken: base.accessToken, email: base.email });
  } else {
    publish(base);
  }
  if (roleFor !== session.user.id) fetchRole(supabase, session);
  fetchUnread(supabase);
}

function loadSupabase() {
  if (!supabasePromise) {
    supabasePromise = import('../supabaseClient.js').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data }) => onSession(supabase, data?.session || null));
      supabase.auth.onAuthStateChange((event, session) => {
        // Don't await supabase calls inside this callback (supabase-js can
        // deadlock); defer to the next tick.
        setTimeout(() => {
          if (event === 'USER_UPDATED') roleFor = null; // re-read name/avatar
          onSession(supabase, session);
        }, 0);
      });
      return supabase;
    }).catch(() => { supabasePromise = null; return null; });
  }
  return supabasePromise;
}

let started = false;
function startAuth(live) {
  if (started) { if (live) loadSupabase(); return; }
  started = true;
  const stored = readStoredSession();
  publish(fromSession(stored));
  // Visitors on the static pages never download supabase-js; a stored session
  // (or a host app that signs people in) loads it to verify and fetch role.
  if (stored || live) loadSupabase();

  const verify = () => loadSupabase().then((sb) => sb?.auth.getSession().then(({ data }) => onSession(sb, data?.session || null)));

  // Sign-ins/outs in another tab or on the other subdomain: re-peek storage.
  const recheck = () => {
    const s = readStoredSession();
    if (!!s !== auth.signedIn || (s && s.user?.id !== auth.uid)) {
      if (s) { publish(fromSession(s)); verify(); }
      else if (supabasePromise) verify();
      else publish({ signedIn: false });
    }
  };
  window.addEventListener('focus', recheck);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) recheck(); });
  // Settings saves a new name/avatar → the app can fire this to refresh the nav.
  window.addEventListener('aimg:profile-changed', () => { roleFor = null; verify(); });
  // The Messages view fires this after marking a conversation read.
  const refreshUnread = () => { if (auth.signedIn && supabasePromise) supabasePromise.then((sb) => sb && fetchUnread(sb)); };
  window.addEventListener('aimg:messages-changed', refreshUnread);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshUnread(); });
}

async function signOut() {
  const sb = await loadSupabase();
  try { await sb?.auth.signOut(); } catch { /* network error — clear locally below */ }
  // If supabase-js couldn't load or the request failed, still drop the local
  // session so the nav and the other subdomain agree.
  try { sharedAuthStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* ignore */ }
  publish({ signedIn: false });
}

// ───────────────────────────── helpers ─────────────────────────────
function detectActive() {
  const p = location.pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return 'home';
  if (p === '/about') return 'about';
  if (p === '/contest') return 'contest';
  if (p.startsWith('/students')) return 'makers';
  if (p.startsWith('/community')) {
    const tab = new URLSearchParams(location.search).get('tab');
    return tab === 'boards' || tab === 'messages' ? tab : 'community';
  }
  return '';
}

function signInHref() {
  const p = location.pathname;
  if (p === '/' || p.startsWith('/community')) return url(SIGN_IN.href);
  const next = p + location.search;
  return url(`${SIGN_IN.href}?next=${encodeURIComponent(next)}`);
}

function safeAvatar(src) {
  return typeof src === 'string' && /^https:\/\//i.test(src) ? src : null;
}

let uidCounter = 0;

// ───────────────────────────── <aimg-nav> ─────────────────────────────
class AimgNav extends HTMLElement {
  static get observedAttributes() { return ['active', 'variant']; }

  constructor() {
    super();
    this._id = `aimg-nav-${++uidCounter}`;
    this._slot = null;
    this._menuOpen = false;
    this._drawerOpen = false;
    this._render = this._render.bind(this);
    this._onDocClick = this._onDocClick.bind(this);
    this._onKey = this._onKey.bind(this);
    this._onClick = this._onClick.bind(this);
  }

  connectedCallback() {
    // Author-supplied children marked slot="title" (the slim variant's page
    // heading) are kept and placed inside the bar.
    if (!this._slot) {
      this._slot = [...this.children].filter((el) => el.getAttribute('slot') === 'title');
    }
    subscribers.add(this._render);
    document.addEventListener('click', this._onDocClick);
    this.addEventListener('keydown', this._onKey);
    this.addEventListener('click', this._onClick);
    startAuth(this.hasAttribute('live-auth'));
    this._render();
  }

  disconnectedCallback() {
    subscribers.delete(this._render);
    document.removeEventListener('click', this._onDocClick);
    this.removeEventListener('keydown', this._onKey);
    this.removeEventListener('click', this._onClick);
  }

  attributeChangedCallback(_name, oldV, newV) {
    if (oldV !== newV && this.isConnected) this._render();
  }

  get _slim() { return this.getAttribute('variant') === 'slim'; }

  _userHTML() {
    const id = this._id;
    if (!auth.signedIn) {
      return `<a class="an-signin" href="${esc(signInHref())}">${esc(SIGN_IN.label)}</a>`;
    }
    const name = auth.name || 'Maker';
    const initial = esc(name.trim().charAt(0).toUpperCase() || '?');
    const avatar = safeAvatar(auth.avatar);
    const items = [
      `<a role="menuitem" href="${esc(url(auth.portfolio || `/community/profile/${auth.uid}`))}">My portfolio</a>`,
      `<a role="menuitem" href="${esc(url(MENU.settings.href))}">${esc(MENU.settings.label)}</a>`,
      auth.admin ? `<a role="menuitem" href="${esc(url(MENU.admin.href))}">${esc(MENU.admin.label)}</a>` : '',
      '<hr role="separator">',
      '<button type="button" role="menuitem" class="an-danger" data-an-signout>Sign out</button>',
    ].join('');
    return `<div class="an-user">
      <button type="button" class="an-user-btn" id="${id}-ub" aria-haspopup="menu" aria-expanded="${this._menuOpen}" aria-controls="${id}-menu" aria-label="Account menu for ${esc(name)}">
        <span class="an-avatar">${avatar ? `<img src="${esc(avatar)}" alt="" referrerpolicy="no-referrer">` : initial}</span>
        <span class="an-uname">${esc(name)}</span>${CHEV_SVG}
      </button>
      <div class="an-menu" id="${id}-menu" role="menu" aria-labelledby="${id}-ub"${this._menuOpen ? '' : ' hidden'}>
        ${auth.email ? `<div class="an-menu-who" role="presentation">${esc(auth.email)}</div>` : ''}
        ${items}
      </div>
    </div>`;
  }

  _render() {
    const id = this._id;
    const hadFocus = this.contains(document.activeElement) ? document.activeElement : null;
    const focusKey = hadFocus?.id || (hadFocus?.hasAttribute?.('data-an-signout') ? 'signout' : null);

    if (this._slim) {
      this.innerHTML = `<nav class="an an--slim" aria-label="Site">
        <div class="an-in">
          <a class="an-mark" href="${esc(APEX + '/')}">
            <img src="/brand/aimg-mark-256.png" width="256" height="254" alt="">AI MAKERS GENERATION
          </a>
          <div class="an-slot"></div>
          <div class="an-right">${this._userHTML()}</div>
        </div>
      </nav>`;
      const slot = this.querySelector('.an-slot');
      this._slot.forEach((el) => slot.appendChild(el));
      this._restoreFocus(focusKey);
      return;
    }

    const active = this.getAttribute('active') || detectActive();
    const role = auth.signedIn ? 'member' : 'visitor';
    const links = LINKS.filter((l) => l.for.includes(role));
    const badge = (l) => (l.key === 'messages' && auth.unread > 0
      ? ` <span class="an-badge" style="display:inline-block;min-width:1.25em;padding:0 .35em;border-radius:999px;background:#3E9E28;color:#fff;font-size:.7em;line-height:1.5;text-align:center;vertical-align:.15em">${auth.unread > 99 ? '99+' : auth.unread}<span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"> unread</span></span>`
      : '');
    const linkHTML = (l) => `<a class="an-link" href="${esc(url(l.href))}"${l.key === active ? ' aria-current="page"' : ''}>${esc(l.label)}${badge(l)}</a>`;
    const cta = `<a class="an-cta" href="${esc(url(CTA.href))}">${esc(CTA.label)}</a>`;

    this.innerHTML = `<nav class="an" aria-label="Main">
      <div class="an-in">
        <a class="an-mark" href="${esc(url('/'))}" aria-label="AIMG — home">
          <img src="/brand/aimg-mark-256.png" width="256" height="254" alt="">AIMG
        </a>
        <div class="an-links">${links.map(linkHTML).join('')}</div>
        <div class="an-right">
          <a href="#" class="an-bot" data-aimg-bot title="Talk to the AI Maker Bot" aria-label="Talk to the AI Maker Bot">${BOT_SVG}</a>
          ${this._userHTML()}
          ${cta}
          <button type="button" class="an-burger" id="${id}-burger" aria-expanded="${this._drawerOpen}" aria-controls="${id}-drawer" aria-label="${this._drawerOpen ? 'Close menu' : 'Open menu'}">${this._drawerOpen ? CLOSE_SVG : BURGER_SVG}</button>
        </div>
      </div>
      <div class="an-drawer" id="${id}-drawer"${this._drawerOpen ? '' : ' hidden'}>
        ${links.map(linkHTML).join('')}
        ${cta}
      </div>
    </nav>`;
    this._restoreFocus(focusKey);
  }

  _restoreFocus(key) {
    if (!key) return;
    const el = key === 'signout' ? this.querySelector('[data-an-signout]') : this.querySelector(`#${CSS.escape(key)}`);
    el?.focus();
  }

  _menuItems() {
    return [...this.querySelectorAll('.an-menu [role="menuitem"]')];
  }

  _setMenu(open, focus) {
    this._menuOpen = open;
    const btn = this.querySelector('.an-user-btn');
    const menu = this.querySelector('.an-menu');
    if (!btn || !menu) return;
    btn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    if (open && focus === 'first') this._menuItems()[0]?.focus();
    if (open && focus === 'last') this._menuItems().slice(-1)[0]?.focus();
    if (!open && focus === 'button') btn.focus();
  }

  _setDrawer(open, focusButton) {
    this._drawerOpen = open;
    const btn = this.querySelector('.an-burger');
    const drawer = this.querySelector('.an-drawer');
    if (!btn || !drawer) return;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    btn.innerHTML = open ? CLOSE_SVG : BURGER_SVG;
    drawer.hidden = !open;
    if (open) drawer.querySelector('a')?.focus();
    else if (focusButton) btn.focus();
  }

  _onDocClick(e) {
    // composedPath() is captured at dispatch, so it still holds nodes that a
    // click handler has since re-rendered away.
    const path = e.composedPath();
    const user = this.querySelector('.an-user');
    if (this._menuOpen && !(user && path.includes(user))) this._setMenu(false);
    if (this._drawerOpen && !path.includes(this)) this._setDrawer(false);
  }

  _onClick(e) {
    const t = e.target;
    if (t.closest('.an-user-btn')) {
      this._setMenu(!this._menuOpen);
      return;
    }
    if (t.closest('.an-burger')) {
      this._setDrawer(!this._drawerOpen);
      return;
    }
    if (t.closest('[data-an-signout]')) {
      this._setMenu(false);
      signOut();
      return;
    }
    const a = t.closest('a[href]');
    if (!a || a.hasAttribute('data-aimg-bot')) return;
    // Close popovers on navigation (same-page anchors don't reload).
    if (this._menuOpen) this._setMenu(false);
    if (this._drawerOpen) this._setDrawer(false);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target) return;
    const dest = new URL(a.href, location.href);
    if (dest.origin !== location.origin) return;
    const ev = new CustomEvent('aimg-navigate', { bubbles: true, cancelable: true, detail: { url: dest } });
    if (!this.dispatchEvent(ev)) e.preventDefault();
  }

  _onKey(e) {
    const inMenu = e.target.closest('.an-menu');
    const onBtn = e.target.closest('.an-user-btn');
    if (e.key === 'Escape') {
      if (this._menuOpen) { e.preventDefault(); this._setMenu(false, 'button'); return; }
      if (this._drawerOpen) { e.preventDefault(); this._setDrawer(false, true); }
      return;
    }
    if (onBtn && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      this._setMenu(true, e.key === 'ArrowDown' ? 'first' : 'last');
      return;
    }
    if (inMenu) {
      const items = this._menuItems();
      const i = items.indexOf(document.activeElement);
      let next = null;
      if (e.key === 'ArrowDown') next = items[(i + 1) % items.length];
      else if (e.key === 'ArrowUp') next = items[(i - 1 + items.length) % items.length];
      else if (e.key === 'Home') next = items[0];
      else if (e.key === 'End') next = items[items.length - 1];
      else if (e.key === 'Tab') this._setMenu(false);
      if (next) { e.preventDefault(); next.focus(); }
    }
  }
}

// ───────────────────────────── <aimg-footer> ─────────────────────────────
class AimgFooter extends HTMLElement {
  connectedCallback() {
    const a = (l, cls = '') => {
      const ext = /^https?:/.test(l.href);
      return `<a${cls ? ` class="${cls}"` : ''} href="${esc(url(l.href))}"${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a>`;
    };
    this.innerHTML = `<footer class="af" aria-label="Site footer">
      <div class="af-in">
        <div class="af-grid">
          <div>
            <img class="af-logo" src="/brand/aimg-mark-256.png" width="256" height="254" alt="AI MAKERS GENERATION">
            <p class="af-tag">AI MAKERS GENERATION · Atlanta, Georgia.<br>Build the Future. Share the Knowledge.</p>
          </div>
          <div class="af-col">
            <h2 class="af-h">Come find us</h2>
            ${SOCIAL.map((l) => a(l)).join('')}
          </div>
          <div class="af-col">
            <h2 class="af-h">Programs</h2>
            ${PROGRAMS.map((l) => a(l)).join('')}
            ${a(CTA, 'af-cta')}
          </div>
          <div class="af-col">
            <h2 class="af-h">AIMG</h2>
            ${SITE.map((l) => a(l)).join('')}
          </div>
        </div>
        <div class="af-legal">
          <p>© ${new Date().getFullYear()} AI MAKERS GENERATION. All rights reserved.</p>
          <p>Atlanta, GA · <a href="${esc(url('/apply#privacy'))}">Privacy notice</a></p>
        </div>
      </div>
    </footer>`;
  }
}

if (typeof window !== 'undefined' && window.customElements) {
  if (!customElements.get('aimg-nav')) customElements.define('aimg-nav', AimgNav);
  if (!customElements.get('aimg-footer')) customElements.define('aimg-footer', AimgFooter);
}
