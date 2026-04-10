// ============================================================
// STATE
// ============================================================

let currentUser = null;
let cart = [];
let menuData = [];
let customizations = {};

// ============================================================
// API HELPERS
// ============================================================

const API = {
  async get(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async put(path, body) {
    const res = await fetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async del(path) {
    const res = await fetch(path, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};

// ============================================================
// UTILS
// ============================================================

function saveUser(user) {
  currentUser = user;
  localStorage.setItem('swirlUser', JSON.stringify(user));
}

function loadSavedUser() {
  try {
    const s = localStorage.getItem('swirlUser');
    return s ? JSON.parse(s) : null;
  } catch (e) { return null; }
}

function showToast(msg, type = 'success') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = `toast${type === 'error' ? ' toast-error' : ''}`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 350);
  }, 3000);
}

function addToCart(item) {
  cart.push({ ...item, cartId: Date.now() + Math.random() });
  updateCartBadge();
  showToast(`${item.name} added! 🍦`);
}

function removeFromCart(cartId) {
  cart = cart.filter(i => i.cartId !== cartId);
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  badge.textContent = cart.length;
  badge.style.display = cart.length > 0 ? 'flex' : 'none';
}

function formatTime(datetime) {
  const d = new Date(datetime);
  const diff = Date.now() - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

function fmt$(n) {
  return n > 0 ? `$${Number(n).toFixed(2)}` : 'Free';
}

function starRatingHTML(prefix, currentRating) {
  return [1,2,3,4,5].map(v =>
    `<span style="cursor:pointer;font-size:28px;color:${v <= currentRating ? '#FFD700' : '#ddd'};transition:transform 0.15s"
           onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"
           onclick="${prefix}SelectStar(${v})">★</span>`
  ).join('');
}

// ============================================================
// NAVIGATION
// ============================================================

const views = {};

function showView(name, params = {}) {
  const app = document.getElementById('app');
  const nav = document.getElementById('bottom-nav');

  app.classList.remove('admin-mode');
  nav.classList.remove('admin-mode');

  const noNav = ['login', 'signup', 'confirmation'];
  nav.style.display = noNav.includes(name) ? 'none' : 'flex';

  document.querySelectorAll('.nav-btn').forEach(btn => {
    const v = btn.dataset.view;
    const active =
      v === name ||
      (v === 'menu' && ['category', 'treat'].includes(name)) ||
      (v === 'create' && name === 'create');
    btn.classList.toggle('active', active);
  });

  app.innerHTML = '';
  app.scrollTop = 0;
  const fn = views[name];
  if (fn) fn(app, params);
  else app.innerHTML = `<p style="padding:24px;color:#999">View not found: ${name}</p>`;
}

// ============================================================
// VIEW: LOGIN
// ============================================================

views.login = (container) => {
  container.innerHTML = `
    <div class="login-page">
      <div class="login-hero">
        <span class="ice-cream-art">🍦</span>
        <div class="brand-wordmark">Swirl</div>
        <p class="brand-tagline">Your magical ice cream shop ✨</p>
      </div>
      <div class="login-card">
        <h2>Welcome back! 🌸</h2>
        <div class="form-group">
          <input
            type="text"
            id="login-username"
            class="text-input"
            placeholder="Username"
            autocomplete="username"
            autocorrect="off"
            autocapitalize="none"
            spellcheck="false"
          />
        </div>
        <div class="form-group">
          <input
            type="password"
            id="login-password"
            class="text-input"
            placeholder="PIN (4 digits)"
            maxlength="4"
            inputmode="numeric"
            pattern="[0-9]*"
            autocomplete="current-password"
          />
        </div>
        <button class="btn btn-primary btn-full" id="login-btn" onclick="handleLogin()">
          Let's Go! 🍦
        </button>
        <div class="login-divider"><span>or</span></div>
        <button class="btn btn-outline btn-full" onclick="showView('signup')">
          ✨ I'm new here!
        </button>
      </div>
    </div>
  `;

  const u = document.getElementById('login-username');
  const p = document.getElementById('login-password');
  if (u) u.focus();
  const onEnter = (e) => { if (e.key === 'Enter') handleLogin(); };
  u?.addEventListener('keydown', onEnter);
  p?.addEventListener('keydown', onEnter);
};

window.handleLogin = async () => {
  const username = (document.getElementById('login-username')?.value || '').trim();
  const password = (document.getElementById('login-password')?.value || '').trim();

  if (!username) { showToast('Enter your username!', 'error'); document.getElementById('login-username')?.focus(); return; }
  if (!password) { showToast('Enter your PIN!', 'error'); document.getElementById('login-password')?.focus(); return; }

  const btn = document.getElementById('login-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Logging in...'; }

  try {
    const user = await API.post('/api/auth/login', { username, password });
    saveUser(user);
    showView('menu');
    showToast(`Hey ${user.first_name || user.name}! 🍦`);
  } catch (e) {
    let msg = 'Wrong username or PIN';
    try { msg = JSON.parse(e.message).error; } catch {}
    showToast(msg, 'error');
    if (btn) { btn.disabled = false; btn.textContent = "Let's Go! 🍦"; }
    document.getElementById('login-password')?.select();
  }
};

// ============================================================
// VIEW: SIGNUP
// ============================================================

views.signup = (container) => {
  container.innerHTML = `
    <div class="signup-page">
      <button class="back-btn" style="align-self:flex-start" onclick="showView('login')">←</button>
      <div class="signup-content">
        <span class="ice-cream-art">🌸</span>
        <h1>Join Swirl!</h1>
        <p>Create your account to start earning sprinkles!</p>

        <div class="form-row">
          <div class="form-group" style="flex:1">
            <input
              type="text"
              id="signup-first"
              class="text-input"
              placeholder="First name *"
              maxlength="30"
              autocomplete="given-name"
            />
          </div>
          <div class="form-group" style="flex:1">
            <input
              type="text"
              id="signup-last"
              class="text-input"
              placeholder="Last name"
              maxlength="30"
              autocomplete="family-name"
            />
          </div>
        </div>
        <div class="form-group">
          <input
            type="text"
            id="signup-username"
            class="text-input"
            placeholder="Username (e.g. sofia123)"
            maxlength="30"
            autocomplete="username"
            autocorrect="off"
            autocapitalize="none"
            spellcheck="false"
          />
        </div>
        <div class="form-group">
          <input
            type="password"
            id="signup-pin"
            class="text-input"
            placeholder="PIN — 4 digits (e.g. 1234)"
            maxlength="4"
            inputmode="numeric"
            pattern="[0-9]*"
            autocomplete="new-password"
          />
        </div>
        <button class="btn btn-primary btn-full" id="signup-btn" onclick="handleSignup()">Let's Go! 🍦</button>
      </div>
    </div>
  `;

  const first = document.getElementById('signup-first');
  if (first) first.focus();

  ['signup-first', 'signup-last', 'signup-username', 'signup-pin'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSignup(); });
  });
};

window.handleSignup = async () => {
  const first_name = (document.getElementById('signup-first')?.value || '').trim();
  const last_name  = (document.getElementById('signup-last')?.value  || '').trim();
  const username   = (document.getElementById('signup-username')?.value || '').trim().toLowerCase();
  const password   = (document.getElementById('signup-pin')?.value || '').trim();

  if (!first_name) { showToast('Enter your first name!', 'error'); document.getElementById('signup-first')?.focus(); return; }
  if (!username)   { showToast('Pick a username!', 'error'); document.getElementById('signup-username')?.focus(); return; }
  if (!/^\d{4}$/.test(password)) { showToast('PIN must be exactly 4 digits', 'error'); document.getElementById('signup-pin')?.focus(); return; }

  const btn = document.getElementById('signup-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Joining...'; }

  try {
    const user = await API.post('/api/users', { first_name, last_name, username, password });
    saveUser(user);
    showView('menu');
    showToast(`Welcome, ${user.first_name || user.name}! 🎉`);
  } catch (e) {
    let msg = 'Something went wrong';
    try { msg = JSON.parse(e.message).error; } catch {}
    showToast(msg, 'error');
    if (btn) { btn.disabled = false; btn.textContent = "Let's Go! 🍦"; }
  }
};

// ============================================================
// VIEW: MENU (home — grouped by category)
// ============================================================

views.menu = async (container) => {
  container.innerHTML = `
    <div class="menu-page">
      <div class="menu-header">
        <div class="header-top">
          <div>
            <h2>Hey, ${currentUser?.first_name || currentUser?.name?.split(' ')[0] || 'friend'}! 🌸</h2>
            <div class="sprinkles-pill">✨ ${currentUser?.points ?? 0} sprinkles</div>
          </div>
          <div class="header-wordmark">🍦 Swirl</div>
        </div>
        <h1 class="section-title">What sounds yummy?</h1>
        <input
          id="menu-search"
          type="text"
          class="text-input menu-search"
          placeholder="Search treats..."
          oninput="menuFilter()"
          autocomplete="off"
        />
      </div>
      <div id="treat-list" class="drinks-list">
        <div class="loading-dots">Loading the magic... ✨</div>
      </div>
    </div>
  `;

  try {
    [menuData, customizations] = await Promise.all([
      API.get('/api/menu'),
      API.get('/api/customizations')
    ]);
    renderMenuList('');
  } catch (e) {
    const list = document.getElementById('treat-list');
    if (list) list.innerHTML = '<p class="error-msg">Menu failed to load. 😢</p>';
  }
};

function renderMenuList(query) {
  const list = document.getElementById('treat-list');
  if (!list) return;

  let items = menuData;
  if (query) {
    items = menuData.filter(d => d.name.toLowerCase().includes(query.toLowerCase()));
  }

  list.innerHTML = items.length
    ? items.map(d => treatCardHTML(d)).join('')
    : `<p class="no-users" style="padding:24px;text-align:center">${query ? 'No treats found. 🍦' : 'No treats available right now! 🍦'}</p>`;
}

function treatCardHTML(d) {
  if (d.sold_out) {
    return `
      <div class="drink-card sold-out">
        <div class="drink-emoji" style="filter:grayscale(0.8);opacity:0.6">${d.emoji}</div>
        <div class="drink-info">
          <div class="drink-name">${d.name} <span class="sold-out-badge">Sold Out</span></div>
          <div class="drink-desc">Not available right now — check back soon!</div>
        </div>
        <div class="drink-arrow" style="opacity:0.2">›</div>
      </div>
    `;
  }
  return `
    <div class="drink-card" onclick="showView('treat', { treatId: ${d.id} })">
      <div class="drink-emoji">${d.emoji}</div>
      <div class="drink-info">
        <div class="drink-name">${d.name}</div>
        <div class="drink-desc">${d.description}</div>
      </div>
      <div class="drink-arrow">›</div>
    </div>
  `;
}

window.menuFilter = () => {
  const q = document.getElementById('menu-search')?.value || '';
  renderMenuList(q);
};

// ============================================================
// VIEW: TREAT DETAIL
// ============================================================

views.treat = async (container, { treatId }) => {
  try { customizations = await API.get('/api/customizations'); } catch (e) {}

  const treat = menuData.find(i => i.id === treatId);

  if (!treat) { showView('menu'); return; }

  const vesselEmoji = { 'Cup': '🥤', 'Sugar Cone': '🍦', 'Waffle Cone': '🧇' };

  // Only show in-stock options from customizations
  const availVessels  = customizations.vessels  || ['Cup', 'Sugar Cone', 'Waffle Cone'];
  const availFlavors  = customizations.flavors  || [];
  const availSauces   = customizations.sauces   || [];
  const availToppings = customizations.toppings || [];
  const availExtras   = customizations.extras   || [];

  let order = {
    menu_item_id: treat.id,
    name: treat.name,
    emoji: treat.emoji,
    vessel:   availVessels.includes(treat.default_temperature) ? treat.default_temperature : (availVessels[0] || 'Cup'),
    flavor:   availFlavors.includes(treat.default_milk) ? treat.default_milk : (availFlavors[0] || 'Vanilla'),
    sauce:    treat.default_creamer && availSauces.includes(treat.default_creamer) ? treat.default_creamer : null,
    toppings: (treat.default_syrups || []).filter(t => availToppings.includes(t)),
    extras:   (treat.default_extras || []).filter(e => availExtras.includes(e)),
    is_custom: false
  };

  function render() {
    container.innerHTML = `
      <div class="drink-detail-page">
        <div class="page-header">
          <button class="back-btn" onclick="showView('menu')">←</button>
          <h1>Customize</h1>
          <div></div>
        </div>

        <div class="drink-hero">
          <span class="drink-hero-emoji">${treat.emoji}</span>
          <h2>${treat.name}</h2>
          <p>${treat.description}</p>
        </div>

        <div class="customization-sections">
          <div class="custom-section">
            <h3>Vessel 🥤</h3>
            <div class="option-pills">
              ${(customizations.vessels || ['Cup', 'Sugar Cone', 'Waffle Cone']).map(v => `
                <button class="pill ${order.vessel === v ? 'active' : ''}"
                  onclick="drinkSetOption('vessel','${v}')">
                  ${vesselEmoji[v] || '🥤'} ${v}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="custom-section">
            <h3>Flavor 🍨</h3>
            <div class="option-pills">
              ${(customizations.flavors || []).map(f => `
                <button class="pill ${order.flavor === f ? 'active' : ''}"
                  onclick="drinkSetOption('flavor','${f}')">
                  ${f}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="custom-section">
            <h3>Sauce <span class="optional">(optional)</span></h3>
            <div class="option-pills">
              ${(customizations.sauces || []).map(s => `
                <button class="pill ${order.sauce === s ? 'active' : ''}"
                  onclick="drinkToggleSingle('sauce','${s}')">
                  ${s}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="custom-section">
            <h3>Toppings <span class="optional">(optional)</span></h3>
            <div class="option-pills">
              ${(customizations.toppings || []).map(t => `
                <button class="pill ${order.toppings.includes(t) ? 'active' : ''}"
                  onclick="drinkToggleArray('toppings','${t.replace(/'/g, "\\'")}')">
                  ${t}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="custom-section">
            <h3>Extras <span class="optional">(optional)</span></h3>
            <div class="option-pills">
              ${(customizations.extras || []).map(e => `
                <button class="pill ${order.extras.includes(e) ? 'active' : ''}"
                  onclick="drinkToggleArray('extras','${e.replace(/'/g, "\\'")}')">
                  ${e}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="add-to-cart-bar">
          <button class="btn btn-primary btn-full btn-lg" onclick="drinkAddToCart()">
            Add to Cart 🍦
          </button>
        </div>
      </div>
    `;
  }

  window.drinkSetOption    = (key, val) => { order[key] = val; render(); };
  window.drinkToggleSingle = (key, val) => { order[key] = order[key] === val ? null : val; render(); };
  window.drinkToggleArray  = (key, val) => {
    const idx = order[key].indexOf(val);
    if (idx > -1) order[key].splice(idx, 1);
    else order[key].push(val);
    render();
  };
  window.drinkAddToCart = () => {
    addToCart({
      menu_item_id: order.menu_item_id,
      name:    treat.name,
      emoji:   treat.emoji,
      vessel:  order.vessel,
      milk:    order.flavor,
      creamer: order.sauce,
      syrups:  [...order.toppings],
      extras:  [...order.extras],
      is_custom: false
    });
    showView('menu');
  };

  render();
};

// ============================================================
// VIEW: CREATE YOUR OWN
// ============================================================

views.create = async (container) => {
  container.innerHTML = '<div class="loading-dots" style="padding:48px;text-align:center">Loading the magic... ✨</div>';

  try { customizations = await API.get('/api/customizations'); } catch (e) {}

  const vesselEmoji = { 'Cup': '🥤', 'Sugar Cone': '🍦', 'Waffle Cone': '🧇' };
  const vessels = customizations.vessels || ['Cup', 'Sugar Cone', 'Waffle Cone'];
  const flavors  = customizations.flavors  || [];
  const sauces   = customizations.sauces   || [];
  const toppings = customizations.toppings || [];
  const extras   = customizations.extras   || [];

  // Build dynamic steps — only include categories that have in-stock items
  const steps = ['vessel', 'flavor'];
  if (sauces.length)   steps.push('sauce');
  if (toppings.length) steps.push('toppings');
  if (extras.length)   steps.push('extras');
  steps.push('confirm');
  const totalSteps = steps.length;

  let s = {
    stepIdx:  0,
    vessel:   'Cup',
    flavor:   flavors[0] || 'Vanilla',
    sauce:    null,
    toppings: [],
    extras:   []
  };

  function treatName() {
    if (!s.flavor) return 'Custom Scoop';
    const label = s.vessel === 'Waffle Cone' ? 'Waffle Cone' : s.vessel === 'Sugar Cone' ? 'Cone' : 'Cup';
    return `${s.flavor} ${label}`;
  }

  function render() {
    const stepNum = s.stepIdx + 1;
    const progress = Math.round((stepNum / totalSteps) * 100);
    const currentStep = steps[s.stepIdx];
    let content = '';

    if (currentStep === 'vessel') {
      const vesselChoices = ['Cup', 'Waffle Cone'];
      content = `
        <h2>Pick your vessel! 🥤</h2>
        <div class="vessel-stack">
          ${vesselChoices.map(v => `
            <button class="vessel-big ${s.vessel === v ? 'active' : ''}"
              onclick="buildSet('vessel','${v}');buildNext()">
              <span class="vessel-emoji">${vesselEmoji[v] || '🥤'}</span>
              <span class="vessel-label">${v}</span>
            </button>
          `).join('')}
        </div>
      `;
    } else if (currentStep === 'flavor') {
      content = `
        <h2>Pick your flavor! 🍨</h2>
        <div class="option-pills">
          ${flavors.map(f => `
            <button class="pill ${s.flavor === f ? 'active' : ''}" onclick="buildSet('flavor','${f}')">
              ${f}
            </button>
          `).join('')}
        </div>
        <button class="btn btn-primary" onclick="buildNext()">Next →</button>
      `;
    } else if (currentStep === 'sauce') {
      content = `
        <h2>Any sauce? <span class="optional">(optional)</span></h2>
        <div class="option-pills">
          ${sauces.map(sa => `
            <button class="pill ${s.sauce === sa ? 'active' : ''}" onclick="buildToggleSingle('sauce','${sa}')">
              ${sa}
            </button>
          `).join('')}
        </div>
        <button class="btn btn-primary" onclick="buildNext()">${s.sauce ? 'Next →' : 'Skip →'}</button>
      `;
    } else if (currentStep === 'toppings') {
      content = `
        <h2>Toppings? <span class="optional">(optional)</span></h2>
        <div class="option-pills">
          ${toppings.map(t => `
            <button class="pill ${s.toppings.includes(t) ? 'active' : ''}"
              onclick="buildToggle('toppings','${t.replace(/'/g, "\\'")}')">
              ${t}
            </button>
          `).join('')}
        </div>
        <button class="btn btn-primary" onclick="buildNext()">${s.toppings.length ? 'Next →' : 'Skip →'}</button>
      `;
    } else if (currentStep === 'extras') {
      content = `
        <h2>Extras? <span class="optional">(optional)</span></h2>
        <div class="option-pills">
          ${extras.map(e => `
            <button class="pill ${s.extras.includes(e) ? 'active' : ''}"
              onclick="buildToggle('extras','${e.replace(/'/g, "\\'")}')">
              ${e}
            </button>
          `).join('')}
        </div>
        <button class="btn btn-primary" onclick="buildNext()">${s.extras.length ? 'Next →' : 'Skip →'}</button>
      `;
    } else if (currentStep === 'confirm') {
      content = `
        <div class="build-summary">
          <h3>Your Scoop ✨</h3>
          <div class="summary-line">${vesselEmoji[s.vessel] || '🍦'} ${treatName()}</div>
          <div class="summary-line">🍨 ${s.flavor}</div>
          ${s.sauce    ? `<div class="summary-line">🍯 ${s.sauce} sauce</div>` : ''}
          ${s.toppings.length ? `<div class="summary-line">🌈 ${s.toppings.join(', ')}</div>` : ''}
          ${s.extras.length   ? `<div class="summary-line">✨ ${s.extras.join(', ')}</div>` : ''}
        </div>

        <button class="btn btn-primary btn-full btn-lg" onclick="buildAddToCart()">
          Add to Cart 🍦
        </button>
      `;
    }

    container.innerHTML = `
      <div class="build-page">
        <div class="page-header">
          <button class="back-btn" onclick="${s.stepIdx > 0 ? 'buildPrev()' : "showView('menu')"}">←</button>
          <h1>Create Your Own</h1>
          <span class="step-counter">${stepNum} / ${totalSteps}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${progress}%"></div>
        </div>
        <div class="build-content">${content}</div>
      </div>
    `;
  }

  window.buildSet          = (key, val) => { s[key] = val; render(); };
  window.buildToggle       = (key, val) => {
    const idx = s[key].indexOf(val);
    if (idx > -1) s[key].splice(idx, 1); else s[key].push(val);
    render();
  };
  window.buildToggleSingle = (key, val) => { s[key] = s[key] === val ? null : val; render(); };
  window.buildNext         = () => { if (s.stepIdx < totalSteps - 1) { s.stepIdx++; render(); } };
  window.buildPrev         = () => { if (s.stepIdx > 0) { s.stepIdx--; render(); } };
  window.buildAddToCart    = () => {
    addToCart({
      name:    treatName(),
      emoji:   vesselEmoji[s.vessel] || '🍦',
      vessel:  s.vessel,
      milk:    s.flavor,
      creamer: s.sauce,
      syrups:  [...s.toppings],
      extras:  [...s.extras],
      is_custom: true,
      menu_item_id: null
    });
    showView('menu');
  };

  render();
};

// ============================================================
// VIEW: CART
// ============================================================

views.cart = (container) => {
  function render() {
    if (cart.length === 0) {
      container.innerHTML = `
        <div class="cart-page">
          <div class="page-header"><h1>Your Cart</h1><div></div></div>
          <div class="empty-cart">
            <span class="empty-cart-emoji">🍦</span>
            <h2>Your cart is empty</h2>
            <p>Add some treats to get started!</p>
            <button class="btn btn-primary" onclick="showView('menu')">Browse Treats</button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="cart-page">
        <div class="page-header">
          <h1>Your Cart</h1>
          <span class="item-count">${cart.length} treat${cart.length !== 1 ? 's' : ''}</span>
        </div>

        <div class="cart-items">
          ${cart.map(item => {
            const details = [
              item.vessel,
              item.milk,
              item.creamer,
              ...(item.syrups || []),
              ...(item.extras || [])
            ].filter(Boolean).join(' · ');
            return `
              <div class="cart-item">
                <div class="cart-item-emoji">${item.emoji || '🍦'}</div>
                <div class="cart-item-info">
                  <div class="cart-item-name">${item.name}</div>
                  ${details ? `<div class="cart-item-details">${details}</div>` : ''}
                </div>
                <button class="remove-btn" onclick="cartRemove(${item.cartId})">✕</button>
              </div>
            `;
          }).join('')}
        </div>

        <div class="cart-footer">
          <div class="points-preview">You'll earn ✨ ${cart.length * 10} sprinkles!</div>
          <textarea id="order-notes" class="notes-input" placeholder="Any special requests? (optional)" rows="2"></textarea>
          <button class="btn btn-primary btn-full btn-lg" onclick="cartPlaceOrder()">
            Place Order 🍦
          </button>
        </div>
      </div>
    `;
  }

  window.cartRemove = (cartId) => { removeFromCart(cartId); render(); };

  window.cartPlaceOrder = async () => {
    if (!currentUser) { showView('login'); return; }
    if (cart.length === 0) return;

    const notes = document.getElementById('order-notes')?.value || '';
    const btn = document.querySelector('.cart-page .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Placing order... 🍦'; }

    try {
      const result = await API.post('/api/orders', {
        user_id: currentUser.id,
        items: cart.map(i => ({
          menu_item_id: i.menu_item_id || null,
          name:    i.name,
          size:    i.vessel  || null,
          milk:    i.milk    || null,
          creamer: i.creamer || null,
          syrups:  i.syrups  || [],
          extras:  i.extras  || [],
          is_custom: i.is_custom || false
        })),
        notes
      });

      currentUser.points = result.total_points;
      saveUser(currentUser);

      const placed = [...cart];
      cart = [];
      updateCartBadge();

      showView('confirmation', {
        orderId: result.order_id,
        pointsEarned: result.points_earned,
        totalPoints: result.total_points,
        items: placed
      });
    } catch (e) {
      showToast('Order failed — try again', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Place Order 🍦'; }
    }
  };

  render();
};

// ============================================================
// VIEW: CONFIRMATION
// ============================================================

views.confirmation = (container, { orderId, pointsEarned, totalPoints, items }) => {
  let confirmationRating = 0;

  container.innerHTML = `
    <div class="confirmation-page">
      <div class="check-circle">🍦</div>
      <h1>Order Placed!</h1>
      <p class="confirmation-sub">Your scooper is on it! ✨</p>

      <div class="order-summary-card">
        <h3>Your treats</h3>
        ${items.map(i => `<div class="summary-item">${i.emoji || '🍦'} ${i.name}</div>`).join('')}
      </div>

      <div class="points-earned-card">
        <div class="points-earned-label">✨ Sprinkles Earned</div>
        <div class="points-earned-value">+${pointsEarned} ✨</div>
        <div class="points-total">Total: ${totalPoints} sprinkles</div>
      </div>

      <div class="review-card" id="confirmation-review">
        <h3>How was your experience?</h3>
        <div id="confirmation-stars">${starRatingHTML('confirmation', 0)}</div>
        <textarea id="confirmation-comment" class="text-input" placeholder="Tell us what you thought! (optional)" rows="2" style="margin-top:10px"></textarea>
        <button class="btn btn-primary btn-sm btn-full" onclick="submitConfirmationReview()" id="confirmation-review-btn" style="margin-top:10px" disabled>
          Submit Review
        </button>
      </div>

      <button class="btn btn-primary btn-full btn-lg" onclick="showView('menu')">
        Order Again 🍦
      </button>
    </div>
  `;

  window.confirmationSelectStar = (v) => {
    confirmationRating = v;
    document.getElementById('confirmation-stars').innerHTML = starRatingHTML('confirmation', v);
    document.getElementById('confirmation-review-btn').disabled = false;
  };

  window.submitConfirmationReview = async () => {
    if (confirmationRating === 0) return;
    const comment = document.getElementById('confirmation-comment')?.value || '';
    try {
      await API.post('/api/reviews', {
        order_id: orderId,
        user_id: currentUser.id,
        rating: confirmationRating,
        comment
      });
      document.getElementById('confirmation-review').innerHTML =
        '<div style="text-align:center;padding:16px;color:#34D399;font-weight:700;font-family:Fredoka,sans-serif">Thanks for your review! ⭐</div>';
    } catch (e) {
      showToast('Could not submit review', 'error');
    }
  };
};

// ============================================================
// VIEW: PROFILE
// ============================================================

views.profile = async (container) => {
  try {
    const fresh = await API.get(`/api/users/${currentUser.id}`);
    saveUser(fresh);
  } catch (e) {}

  let redemptionCount = 0;
  let unreviewedOrders = [];
  try {
    const [redemptions, unreviewed] = await Promise.all([
      API.get(`/api/users/${currentUser.id}/redemptions`),
      API.get(`/api/users/${currentUser.id}/unreviewed-orders`)
    ]);
    redemptionCount = redemptions.length;
    unreviewedOrders = unreviewed;
  } catch (e) {}

  const displayName = currentUser.first_name || currentUser.name || '?';

  container.innerHTML = `
    <div class="profile-page">
      <div class="profile-header">
        <div class="profile-avatar">${displayName.charAt(0).toUpperCase()}</div>
        <h1>${currentUser.name}</h1>
        <span class="big-points">${currentUser.points}</span>
        <span class="points-label">✨ sprinkles</span>
      </div>

      <div class="profile-card">
        <div class="profile-stat">
          <span>✨ Total Sprinkles</span>
          <strong>${currentUser.points}</strong>
        </div>
        <div class="profile-stat">
          <span>🎁 Rewards Redeemed</span>
          <strong>${redemptionCount}</strong>
        </div>
        <div class="profile-stat">
          <span>🍦 Every treat earns</span>
          <strong>+10 sprinkles</strong>
        </div>
      </div>

      ${unreviewedOrders.length > 0 ? `
      <div class="profile-card" style="margin-bottom:16px">
        <h3 style="font-family:'Fredoka',sans-serif;font-size:16px;color:var(--text);padding:8px 4px 4px">
          Rate Your Orders ⭐
        </h3>
        ${unreviewedOrders.map(o => {
          const itemNames = o.items.map(i => i.item_name).join(', ');
          return `
            <div style="padding:12px 0;border-top:1px solid var(--cream-dark)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <span style="font-size:13px;font-weight:700;color:var(--text)">🍦 ${itemNames}</span>
                <span style="font-size:11px;color:var(--text-light)">${formatTime(o.created_at)}</span>
              </div>
              <div id="profile-stars-${o.id}">${starRatingHTML('profile' + o.id, 0)}</div>
              <textarea id="profile-comment-${o.id}" class="text-input" placeholder="Optional comment..." rows="1" style="font-size:13px;margin-top:6px"></textarea>
              <button class="btn btn-primary btn-sm btn-full" id="profile-review-btn-${o.id}" onclick="submitProfileReview(${o.id})" disabled style="margin-top:6px">
                Submit
              </button>
            </div>
          `;
        }).join('')}
      </div>
      ` : ''}

      <button class="btn btn-primary btn-full" onclick="showView('rewards')" style="margin-bottom:10px">
        🎁 Rewards Shop
      </button>

      ${currentUser.is_admin
        ? `<button class="btn btn-outline btn-full" onclick="showView('admin')" style="margin-bottom:10px">🔧 Admin Portal</button>`
        : ''
      }

      <button class="btn btn-ghost btn-full" onclick="profileLogout()" style="color:#EF4444">
        Sign Out
      </button>
    </div>
  `;

  // Set up star handlers for unreviewed orders
  const profileRatings = {};
  unreviewedOrders.forEach(o => {
    window['profile' + o.id + 'SelectStar'] = (v) => {
      profileRatings[o.id] = v;
      document.getElementById('profile-stars-' + o.id).innerHTML = starRatingHTML('profile' + o.id, v);
      const btn = document.getElementById('profile-review-btn-' + o.id);
      if (btn) btn.disabled = false;
    };
  });

  window.submitProfileReview = async (orderId) => {
    const rating = profileRatings[orderId];
    if (!rating) return;
    const comment = document.getElementById('profile-comment-' + orderId)?.value || '';
    try {
      await API.post('/api/reviews', { order_id: orderId, user_id: currentUser.id, rating, comment });
      showToast('Review submitted! ⭐');
      showView('profile');
    } catch (e) {
      showToast('Could not submit review', 'error');
    }
  };

  window.profileLogout = () => {
    currentUser = null;
    cart = [];
    updateCartBadge();
    localStorage.removeItem('swirlUser');
    showView('login');
  };
};

// ============================================================
// VIEW: REWARDS SHOP
// ============================================================

views.rewards = async (container) => {
  container.innerHTML = `
    <div class="rewards-page">
      <div class="page-header">
        <button class="back-btn" onclick="showView('profile')">←</button>
        <h1>Rewards Shop 🎁</h1>
        <div></div>
      </div>
      <div class="rewards-balance-bar">
        <span>✨ Your balance:</span>
        <strong>${currentUser?.points ?? 0} sprinkles</strong>
      </div>
      <div id="rewards-grid" class="rewards-grid">
        <div class="loading-dots">Loading rewards... ✨</div>
      </div>
    </div>
  `;

  try {
    const rewards = await API.get('/api/rewards');
    const grid = document.getElementById('rewards-grid');
    if (!grid) return;

    if (!rewards.length) {
      grid.innerHTML = '<p style="padding:24px;text-align:center;color:#C45EA0">No rewards available yet!</p>';
      return;
    }

    grid.innerHTML = rewards.map(r => {
      const canAfford = currentUser.points >= r.points_cost;
      return `
        <div class="reward-card ${canAfford ? '' : 'reward-card-locked'}">
          <div class="reward-emoji">${r.emoji}</div>
          <div class="reward-name">${r.name}</div>
          <div class="reward-desc">${r.description}</div>
          <div class="reward-cost">✨ ${r.points_cost} sprinkles</div>
          ${canAfford
            ? `<button class="btn btn-primary btn-sm btn-full" onclick="redeemReward(${r.id}, '${r.name.replace(/'/g, "\\'")}', ${r.points_cost})">Redeem!</button>`
            : `<div class="reward-need">Need ${r.points_cost - currentUser.points} more ✨</div>`
          }
        </div>
      `;
    }).join('');
  } catch (e) {
    const grid = document.getElementById('rewards-grid');
    if (grid) grid.innerHTML = '<p class="error-msg">Failed to load rewards.</p>';
  }

  window.redeemReward = async (rewardId, rewardName, cost) => {
    if (!confirm(`Redeem "${rewardName}" for ${cost} sprinkles?`)) return;
    try {
      const result = await API.post(`/api/rewards/${rewardId}/redeem`, { user_id: currentUser.id });
      currentUser.points = result.new_points;
      saveUser(currentUser);
      showToast(`${result.reward.emoji} ${rewardName} redeemed!`);
      showView('rewards');
    } catch (e) {
      let msg = 'Could not redeem reward';
      try { msg = JSON.parse(e.message).error; } catch {}
      showToast(msg, 'error');
    }
  };
};

// ============================================================
// VIEW: ADMIN PORTAL (iPad horizontal layout)
// ============================================================

views.admin = async (container) => {
  const appEl = document.getElementById('app');
  const navEl = document.getElementById('bottom-nav');
  appEl.classList.add('admin-mode');
  navEl.classList.add('admin-mode');

  let activeTab     = 'orders';
  let orderFilter   = 'pending';
  let rewardFilter  = 'pending';
  let editingId     = null;   // menu item editing
  let editDraft     = {};
  let editingUserId = null;   // user editing
  let editUserDraft = {};
  let editingRewardId   = null;
  let editRewardDraft   = {};
  let adminStats    = { total_revenue: 0, today_revenue: 0, pending_count: 0, completed_count: 0, total_orders: 0, today_orders: 0 };
  let adminInventory = [];

  let vessels  = ['Cup', 'Sugar Cone', 'Waffle Cone'];
  let flavors  = [];
  let sauces   = [];
  let toppings = [];
  let extras   = [];

  // ── Stats ─────────────────────────────────────────────────
  async function loadStats() {
    try {
      [adminStats, adminInventory] = await Promise.all([
        API.get('/api/admin/stats'),
        API.get('/api/inventory').then(r => r.items || [])
      ]);
      // Derive admin options from full inventory (all items, not just in-stock)
      vessels  = ['Cup', 'Sugar Cone', 'Waffle Cone'];
      flavors  = adminInventory.filter(i => i.category === 'Flavors').map(i => i.name);
      sauces   = adminInventory.filter(i => i.category === 'Sauces').map(i => i.name);
      toppings = adminInventory.filter(i => i.category === 'Toppings').map(i => i.name);
      extras   = adminInventory.filter(i => i.category === 'Extras').map(i => i.name);
    } catch (e) {}
  }

  // ── Orders Tab ────────────────────────────────────────────
  async function buildOrdersContent() {
    try {
      const orders = await API.get('/api/orders');

      const pendingCount   = orders.filter(o => o.status === 'pending').length;
      const completedCount = orders.filter(o => o.status === 'completed').length;
      let filtered = orders;
      if (orderFilter === 'pending')   filtered = orders.filter(o => o.status === 'pending');
      if (orderFilter === 'completed') filtered = orders.filter(o => o.status === 'completed');

      const pendingRevenue = orders.filter(o => o.status === 'pending').reduce((s, o) => s + (o.total || 0), 0);

      const statsRow = `
        <div class="admin-stats-row">
          <div class="admin-stat-card">
            <div class="admin-stat-card-label">Today's Revenue</div>
            <div class="admin-stat-card-value">$${adminStats.today_revenue.toFixed(2)}</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-card-label">Pending Revenue</div>
            <div class="admin-stat-card-value">$${pendingRevenue.toFixed(2)}</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-card-label">All-Time Revenue</div>
            <div class="admin-stat-card-value">$${adminStats.total_revenue.toFixed(2)}</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-card-label">Showing</div>
            <div class="admin-stat-card-value">${filtered.length} order${filtered.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      `;

      const filterBar = `
        <div class="order-filters">
          <button class="filter-btn ${orderFilter === 'all'       ? 'active' : ''}" onclick="adminOrderFilter('all')">All (${orders.length})</button>
          <button class="filter-btn ${orderFilter === 'pending'   ? 'active' : ''}" onclick="adminOrderFilter('pending')">Pending (${pendingCount})</button>
          <button class="filter-btn ${orderFilter === 'completed' ? 'active' : ''}" onclick="adminOrderFilter('completed')">Completed (${completedCount})</button>
        </div>
      `;

      let orderCardsHTML = '';
      if (filtered.length === 0) {
        orderCardsHTML = '<div class="no-data">No orders here yet 🍦</div>';
      } else {
        orderCardsHTML = `<div class="orders-grid">${filtered.map(o => {
          const itemLines = o.items.map(i => {
            let line = i.item_name;
            if (i.size)    line += ` · ${i.size}`;
            if (i.milk)    line += ` · ${i.milk}`;
            if (i.creamer) line += ` · ${i.creamer}`;
            if (i.syrups)  { try { const sy = JSON.parse(i.syrups); if (sy.length) line += ` · ${sy.join(', ')}`; } catch {} }
            if (i.extras)  { try { const ex = JSON.parse(i.extras); if (ex.length) line += ` · ${ex.join(', ')}`; } catch {} }
            return `<div class="admin-order-item-line">🍦 ${line}</div>`;
          }).join('');

          const done = o.status === 'completed';
          return `
            <div class="admin-order-card-v2 ${done ? 'completed' : ''}">
              <div class="admin-order-header-v2">
                <div>
                  <div class="admin-order-user">${o.user_name}</div>
                  <div class="admin-order-time">${formatTime(o.created_at)}</div>
                </div>
                <div style="display:flex;gap:6px;align-items:center">
                  <button class="admin-order-done-btn ${done ? 'done' : ''}"
                    onclick="adminToggleOrderStatus(${o.id}, '${o.status}')">
                    ${done ? '✓ Done' : '○ Mark Done'}
                  </button>
                  <button class="btn-tiny" style="color:#EF4444;border-color:#FECACA;font-size:11px"
                    onclick="adminDeleteOrder(${o.id}, '${o.user_name.replace(/'/g, "\\'")}')">Del</button>
                </div>
              </div>
              <div class="admin-order-items-list">${itemLines}</div>
              ${o.notes ? `<div class="admin-order-note">💬 "${o.notes}"</div>` : ''}
              <div class="admin-order-total-row">
                <span class="order-sprinkles">✨ +${o.points_earned} sprinkles</span>
                <span class="admin-order-price">${o.total > 0 ? `$${Number(o.total).toFixed(2)}` : '$0.00'}</span>
              </div>
            </div>
          `;
        }).join('')}</div>`;
      }

      return statsRow + filterBar + orderCardsHTML;
    } catch (e) {
      return '<p class="error-msg">Failed to load orders</p>';
    }
  }

  // ── Menu Tab ──────────────────────────────────────────────
  function ingredientPickerHTML(selectedIds, prefix) {
    if (!adminInventory.length) return '';
    const categories = [...new Set(adminInventory.map(i => i.category))];
    return `
      <div class="custom-section">
        <h3>Linked Ingredients <span class="optional">(marks item Sold Out when any are out of stock)</span></h3>
        ${categories.map(cat => `
          <div style="margin-bottom:6px">
            <div style="font-size:11px;font-weight:700;color:#C45EA0;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">${cat}</div>
            <div class="option-pills">
              ${adminInventory.filter(i => i.category === cat).map(i => `
                <button class="pill ${selectedIds.includes(i.id) ? 'active' : ''}"
                  onclick="adminToggleIngredient('${prefix}',${i.id})">
                  ${i.in_stock ? '' : '⚠️ '}${i.name}
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function editFormInnerHTML() {
    return `
      <div class="admin-form-section">
        <div class="admin-form-row-2">
          <div class="form-group">
            <label class="form-label">Treat Name *</label>
            <input type="text" id="edit-name" class="text-input" placeholder="Treat name" />
          </div>
          <div class="form-group">
            <label class="form-label">Emoji</label>
            <input type="text" id="edit-emoji" class="text-input" placeholder="🍦" />
          </div>
        </div>
        <div class="admin-form-row-2">
          <div class="form-group" style="flex:2">
            <label class="form-label">Description</label>
            <input type="text" id="edit-desc" class="text-input" placeholder="Short description" />
          </div>
          <div class="form-group" style="flex:1">
            <label class="form-label">Price ($)</label>
            <input type="number" id="edit-price" class="text-input" placeholder="0.00" min="0" step="0.01" />
          </div>
        </div>
        <div class="custom-section">
          <h3>Default Vessel</h3>
          <div class="option-pills">
            ${vessels.map(v => `
              <button class="pill ${editDraft.default_temperature === v ? 'active' : ''}"
                onclick="adminEditDraftSet('default_temperature','${v}')">
                ${v}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="custom-section">
          <h3>Default Flavor</h3>
          <div class="option-pills">
            ${flavors.map(f => `
              <button class="pill ${editDraft.default_milk === f ? 'active' : ''}"
                onclick="adminEditDraftSet('default_milk','${f}')">
                ${f}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="custom-section">
          <h3>Default Sauce <span class="optional">(optional)</span></h3>
          <div class="option-pills">
            ${sauces.map(s => `
              <button class="pill ${editDraft.default_creamer === s ? 'active' : ''}"
                onclick="adminEditDraftToggleSingle('default_creamer','${s}')">
                ${s}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="custom-section">
          <h3>Default Toppings <span class="optional">(optional)</span></h3>
          <div class="option-pills">
            ${toppings.map(t => `
              <button class="pill ${editDraft.default_syrups.includes(t) ? 'active' : ''}"
                onclick="adminEditDraftToggle('default_syrups','${t.replace(/'/g, "\\'")}')">
                ${t}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="custom-section">
          <h3>Default Extras <span class="optional">(optional)</span></h3>
          <div class="option-pills">
            ${extras.map(e => `
              <button class="pill ${editDraft.default_extras.includes(e) ? 'active' : ''}"
                onclick="adminEditDraftToggle('default_extras','${e.replace(/'/g, "\\'")}')">
                ${e}
              </button>
            `).join('')}
          </div>
        </div>
        ${ingredientPickerHTML(editDraft.ingredient_ids || [], 'edit')}
        <div class="form-row">
          <button class="btn btn-primary btn-sm" onclick="adminSaveEdit()">Save Changes</button>
          <button class="btn btn-ghost btn-sm" onclick="adminCancelEdit()">Cancel</button>
        </div>
      </div>
    `;
  }

  async function buildMenuContent() {
    try {
      const all = await API.get('/api/menu/all');
      window._adminMenuItems = all;

      const addBar = `
        <div class="admin-top-bar">
          <button class="btn btn-primary btn-sm" onclick="adminShowAddTreat()">+ Add Treat</button>
        </div>
        <div id="add-treat-form" class="hidden"></div>
      `;

      const rows = all.map(item => {
        if (item.id === editingId) {
          return `<div id="admin-edit-form" class="admin-edit-section">${editFormInnerHTML()}</div>`;
        }
        const ingCount = (item.ingredient_ids || []).length;
        const hasOutOfStock = (item.ingredient_ids || []).some(ingId => {
          const ing = adminInventory.find(i => i.id === ingId);
          return ing && !ing.in_stock;
        });
        return `
          <div class="admin-menu-item-v2 ${!item.is_available ? 'unavailable' : ''} ${item.sold_out ? 'item-sold-out' : ''}">
            <span class="menu-item-emoji-col">${item.emoji}</span>
            <div class="menu-item-info-col">
              <div class="menu-item-name">${item.name}${item.sold_out ? ' <span class="sold-out-badge">Sold Out</span>' : ''}</div>
              <div class="menu-item-status">${item.is_available ? '✓ Visible' : '✗ Hidden'} &nbsp;·&nbsp; ${ingCount} ingredient${ingCount !== 1 ? 's' : ''}${hasOutOfStock ? ' ⚠️' : ''}</div>
            </div>
            <div class="menu-item-price-col">${item.price > 0 ? `$${Number(item.price).toFixed(2)}` : 'Free'}</div>
            <div class="admin-item-actions">
              <button class="btn-tiny" onclick="adminEditItem(${item.id})">Edit</button>
              <button class="btn-tiny" onclick="adminToggleItem(${item.id},${item.is_available},'${item.name.replace(/'/g, "\\'")}','${(item.description||'').replace(/'/g, "\\'")}','${item.emoji}')">
                ${item.is_available ? 'Hide' : 'Show'}
              </button>
              <button class="btn-tiny" style="color:#EF4444;border-color:#FECACA" onclick="adminDeleteItem(${item.id},'${item.name.replace(/'/g, "\\'")}')">Del</button>
            </div>
          </div>
        `;
      }).join('');

      return addBar + (rows || '<div class="no-data" style="padding:12px;font-size:13px">No treats yet</div>');
    } catch (e) {
      return '<p class="error-msg">Failed to load menu</p>';
    }
  }

  // ── Inventory Tab ─────────────────────────────────────────
  async function buildInventoryContent() {
    try {
      const { items, grouped } = await API.get('/api/inventory');
      adminInventory = items;

      const outCount = items.filter(i => !i.in_stock).length;
      const statsBar = `
        <div class="admin-stats-row" style="margin-bottom:16px">
          <div class="admin-stat-card">
            <div class="admin-stat-card-label">Total Items</div>
            <div class="admin-stat-card-value">${items.length}</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-card-label">Out of Stock</div>
            <div class="admin-stat-card-value" style="${outCount > 0 ? 'color:#EF4444' : ''}">${outCount}</div>
          </div>
        </div>
      `;

      const addBar = `
        <div class="admin-top-bar">
          <button class="btn btn-primary btn-sm" onclick="adminShowAddIngredient()">+ Add Ingredient</button>
        </div>
        <div id="add-ingredient-form" class="hidden"></div>
      `;

      const categories = Object.keys(grouped).sort();
      const sections = categories.map(cat => `
        <div class="menu-category-section">
          <h3 class="admin-cat-header">📦 ${cat}</h3>
          ${grouped[cat].map(item => `
            <div class="inventory-item-row ${!item.in_stock ? 'out-of-stock' : ''}">
              <div class="inventory-item-name">${item.name}</div>
              <div class="inventory-item-actions">
                <button class="btn-tiny ${item.in_stock ? 'active' : ''}"
                  onclick="adminToggleStock(${item.id}, ${item.in_stock})">
                  ${item.in_stock ? '✓ In Stock' : '✗ Out of Stock'}
                </button>
                <button class="btn-tiny" style="color:#EF4444;border-color:#FECACA"
                  onclick="adminDeleteIngredient(${item.id}, '${item.name.replace(/'/g, "\\'")}')">Del</button>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('');

      return statsBar + addBar + sections;
    } catch (e) {
      return '<p class="error-msg">Failed to load inventory</p>';
    }
  }

  // ── Users Tab ─────────────────────────────────────────────
  async function buildUsersContent() {
    try {
      const users = await API.get('/api/admin/users');
      const cards = users.map(u => {
        if (u.id === editingUserId) {
          return `
            <div class="admin-user-card-v2 editing">
              <div class="admin-user-edit-form">
                <h4 style="font-family:'Fredoka',sans-serif;font-size:16px;color:#5B1647;margin-bottom:12px">Edit User</h4>
                <div class="admin-form-row-2">
                  <div class="form-group">
                    <label class="form-label">First Name</label>
                    <input type="text" id="uedit-first" class="text-input" value="${editUserDraft.first_name || ''}" placeholder="First name" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Last Name</label>
                    <input type="text" id="uedit-last" class="text-input" value="${editUserDraft.last_name || ''}" placeholder="Last name" />
                  </div>
                </div>
                <div class="admin-form-row-2">
                  <div class="form-group">
                    <label class="form-label">Username</label>
                    <input type="text" id="uedit-username" class="text-input" value="${editUserDraft.username || ''}" placeholder="username" autocapitalize="none" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">New PIN <span class="optional">(leave blank to keep)</span></label>
                    <input type="password" id="uedit-pin" class="text-input" placeholder="4 digits" maxlength="4" inputmode="numeric" />
                  </div>
                </div>
                <div class="form-group" style="max-width:180px">
                  <label class="form-label">Sprinkles ✨</label>
                  <input type="number" id="uedit-points" class="text-input" value="${editUserDraft.points ?? 0}" min="0" />
                </div>
                <div class="form-row">
                  <button class="btn btn-primary btn-sm" onclick="adminSaveUserEdit(${u.id})">Save</button>
                  <button class="btn btn-ghost btn-sm" onclick="adminCancelUserEdit()">Cancel</button>
                </div>
              </div>
            </div>
          `;
        }
        return `
          <div class="admin-user-card-v2">
            <div class="admin-user-avatar">${(u.name || '?').charAt(0).toUpperCase()}</div>
            <div class="admin-user-info">
              <div class="admin-user-name">${u.name}${u.is_admin ? ' ⭐' : ''}</div>
              <div class="admin-user-meta">@${u.username || '—'} &nbsp;·&nbsp; ${u.order_count} order${u.order_count !== 1 ? 's' : ''} &nbsp;·&nbsp; ${u.points} ✨ sprinkles</div>
            </div>
            <div class="admin-user-actions">
              <button class="btn-tiny" onclick="adminStartUserEdit(${u.id}, '${(u.first_name||'').replace(/'/g,"\\'")}',' ${(u.last_name||'').replace(/'/g,"\\'")}','${(u.username||'').replace(/'/g,"\\'")}',${u.points})">Edit</button>
              <button class="btn-tiny ${u.is_admin ? 'active' : ''}" onclick="adminToggleAdmin(${u.id}, ${u.is_admin})">
                ${u.is_admin ? '⭐ Admin' : 'Make Admin'}
              </button>
              <button class="btn-tiny" style="color:#EF4444;border-color:#FECACA" onclick="adminDeleteUser(${u.id},'${(u.name||'').replace(/'/g,"\\'")}')">Del</button>
            </div>
          </div>
        `;
      }).join('') || '<div class="no-data">No users yet</div>';
      return `<div class="users-list-v2">${cards}</div>`;
    } catch (e) {
      return '<p class="error-msg">Failed to load users</p>';
    }
  }

  // ── Rewards Tab (Admin) ────────────────────────────────────
  async function buildRewardsContent() {
    try {
      const [rewards, redemptions] = await Promise.all([
        API.get('/api/rewards/all'),
        API.get('/api/redemptions')
      ]);

      // ── Redemptions section ──
      const rPending   = redemptions.filter(r => (r.status || 'pending') === 'pending').length;
      const rCompleted = redemptions.filter(r => r.status === 'completed').length;
      let rFiltered = redemptions;
      if (rewardFilter === 'pending')   rFiltered = redemptions.filter(r => (r.status || 'pending') === 'pending');
      if (rewardFilter === 'completed') rFiltered = redemptions.filter(r => r.status === 'completed');

      const rewardFilterBar = `
        <div class="order-filters">
          <button class="filter-btn ${rewardFilter === 'all'       ? 'active' : ''}" onclick="adminRewardFilter('all')">All (${redemptions.length})</button>
          <button class="filter-btn ${rewardFilter === 'pending'   ? 'active' : ''}" onclick="adminRewardFilter('pending')">Pending (${rPending})</button>
          <button class="filter-btn ${rewardFilter === 'completed' ? 'active' : ''}" onclick="adminRewardFilter('completed')">Completed (${rCompleted})</button>
        </div>
      `;

      let rewardCardsHTML = '';
      if (rFiltered.length === 0) {
        rewardCardsHTML = '<div class="no-data">No redemptions here yet 🎁</div>';
      } else {
        rewardCardsHTML = `<div class="orders-grid">${rFiltered.map(r => {
          const done = r.status === 'completed';
          return `
            <div class="admin-order-card-v2 ${done ? 'completed' : ''}" style="border-left:3px solid ${done ? '#A3E635' : '#FBBF24'}">
              <div class="admin-order-header-v2">
                <div>
                  <div class="admin-order-user">${r.user_name}</div>
                  <div class="admin-order-time">${formatTime(r.created_at)}</div>
                </div>
                <div style="display:flex;gap:6px;align-items:center">
                  <button class="admin-order-done-btn ${done ? 'done' : ''}"
                    onclick="adminToggleRedemption(${r.id}, '${r.status || 'pending'}')">
                    ${done ? '✓ Done' : '○ Mark Done'}
                  </button>
                  <button class="btn-tiny" style="color:#EF4444;border-color:#FECACA;font-size:11px"
                    onclick="adminDeleteRedemption(${r.id}, '${(r.reward_name || '').replace(/'/g, "\\'")}')">Del</button>
                </div>
              </div>
              <div style="padding:8px 0;font-size:14px;font-weight:700;color:#5B1647">
                ${r.reward_emoji || '🎁'} ${r.reward_name}
              </div>
              <div style="font-size:12px;color:#888">
                ✨ ${r.points_spent} sprinkles spent
              </div>
            </div>
          `;
        }).join('')}</div>`;
      }

      const redemptionsSection = `
        <div style="margin-bottom:32px">
          <h3 style="font-family:'Fredoka',sans-serif;font-size:18px;color:#5B1647;margin-bottom:12px">🎁 Redemptions</h3>
          ${rewardFilterBar}
          ${rewardCardsHTML}
        </div>
      `;

      // ── Rewards list section ──
      const addBar = `
        <h3 style="font-family:'Fredoka',sans-serif;font-size:18px;color:#5B1647;margin-bottom:12px">🏆 Rewards</h3>
        <div class="admin-top-bar">
          <button class="btn btn-primary btn-sm" onclick="adminShowAddReward()">+ Add Reward</button>
        </div>
        <div id="add-reward-form" class="hidden"></div>
      `;

      const rows = rewards.map(r => {
        if (r.id === editingRewardId) {
          return `
            <div class="admin-reward-row editing">
              <div class="admin-user-edit-form">
                <h4 style="font-family:'Fredoka',sans-serif;font-size:16px;color:#5B1647;margin-bottom:12px">Edit Reward</h4>
                <div class="admin-form-row-2">
                  <div class="form-group">
                    <label class="form-label">Reward Name *</label>
                    <input type="text" id="redit-name" class="text-input" value="${editRewardDraft.name || ''}" />
                  </div>
                  <div class="form-group" style="max-width:100px">
                    <label class="form-label">Emoji</label>
                    <input type="text" id="redit-emoji" class="text-input" value="${editRewardDraft.emoji || ''}" />
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Description</label>
                  <input type="text" id="redit-desc" class="text-input" value="${editRewardDraft.description || ''}" />
                </div>
                <div class="form-group" style="max-width:180px">
                  <label class="form-label">Points Cost ✨</label>
                  <input type="number" id="redit-cost" class="text-input" value="${editRewardDraft.points_cost ?? 0}" min="0" />
                </div>
                <div class="form-row">
                  <button class="btn btn-primary btn-sm" onclick="adminSaveRewardEdit(${r.id})">Save</button>
                  <button class="btn btn-ghost btn-sm" onclick="adminCancelRewardEdit()">Cancel</button>
                </div>
              </div>
            </div>
          `;
        }
        return `
          <div class="admin-reward-row ${!r.is_available ? 'unavailable' : ''}">
            <span class="menu-item-emoji-col">${r.emoji}</span>
            <div class="menu-item-info-col">
              <div class="menu-item-name">${r.name}</div>
              <div class="menu-item-status">${r.is_available ? '✓ Available' : '✗ Hidden'} &nbsp;·&nbsp; ✨ ${r.points_cost} pts</div>
            </div>
            <div class="admin-item-actions">
              <button class="btn-tiny" onclick="adminEditReward(${r.id})">Edit</button>
              <button class="btn-tiny" onclick="adminToggleReward(${r.id}, ${r.is_available})">${r.is_available ? 'Hide' : 'Show'}</button>
              <button class="btn-tiny" style="color:#EF4444;border-color:#FECACA" onclick="adminDeleteReward(${r.id},'${r.name.replace(/'/g,"\\'")}')">Del</button>
            </div>
          </div>
        `;
      }).join('') || '<div class="no-data">No rewards yet — add one!</div>';

      return redemptionsSection + addBar + `<div class="admin-rewards-list">${rows}</div>`;
    } catch (e) {
      return '<p class="error-msg">Failed to load rewards</p>';
    }
  }

  // ── Reviews Tab ─────────────────────────────────────────
  async function buildReviewsContent() {
    try {
      const reviews = await API.get('/api/admin/reviews');

      const avgRating = reviews.length > 0
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : '—';
      const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: reviews.filter(r => r.rating === star).length,
        pct: reviews.length > 0
          ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100)
          : 0
      }));

      const statsRow = `
        <div class="admin-stats-row">
          <div class="admin-stat-card">
            <div class="admin-stat-card-label">Average Rating</div>
            <div class="admin-stat-card-value">${avgRating} ⭐</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-card-label">Total Reviews</div>
            <div class="admin-stat-card-value">${reviews.length}</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-card-label">5-Star Reviews</div>
            <div class="admin-stat-card-value">${ratingCounts[0].count}</div>
          </div>
          <div class="admin-stat-card">
            <div class="admin-stat-card-label">With Comments</div>
            <div class="admin-stat-card-value">${reviews.filter(r => r.comment).length}</div>
          </div>
        </div>
      `;

      const distribution = `
        <div style="margin:20px 0;padding:16px;background:white;border-radius:16px;border:2px solid var(--cream-dark)">
          <h3 style="font-family:'Fredoka',sans-serif;font-size:16px;color:var(--text);margin-bottom:12px">Rating Distribution</h3>
          ${ratingCounts.map(r => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="width:24px;text-align:right;font-weight:700;font-size:13px;color:#FFD700">${r.star}★</span>
              <div style="flex:1;height:20px;background:var(--cream);border-radius:10px;overflow:hidden">
                <div style="width:${r.pct}%;height:100%;background:linear-gradient(90deg,#FFD700,#FFA500);border-radius:10px;transition:width 0.3s"></div>
              </div>
              <span style="width:32px;font-size:12px;color:var(--text-light);font-weight:700">${r.count}</span>
            </div>
          `).join('')}
        </div>
      `;

      let reviewCards = '';
      if (reviews.length === 0) {
        reviewCards = '<div class="no-data">No reviews yet ⭐</div>';
      } else {
        reviewCards = `<div class="orders-grid">${reviews.map(r => {
          const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
          const itemNames = r.items.map(i => i.item_name).join(', ');
          return `
            <div class="admin-order-card-v2" style="border-left:3px solid #FFD700">
              <div class="admin-order-header-v2">
                <div>
                  <div class="admin-order-user">${r.user_name}</div>
                  <div class="admin-order-time">${formatTime(r.created_at)}</div>
                </div>
                <button class="btn-tiny" style="color:#EF4444;border-color:#FECACA;font-size:11px"
                  onclick="adminDeleteReview(${r.id})">Del</button>
              </div>
              <div style="font-size:18px;color:#FFD700;margin:4px 0">${stars}</div>
              ${r.comment ? `<div style="font-size:13px;color:var(--text);font-style:italic;margin:6px 0">"${r.comment}"</div>` : ''}
              <div style="font-size:12px;color:var(--text-light)">🍦 ${itemNames}</div>
            </div>
          `;
        }).join('')}</div>`;
      }

      return statsRow + distribution + reviewCards;
    } catch (e) {
      return '<p class="error-msg">Failed to load reviews</p>';
    }
  }

  // ── Settings Tab ──────────────────────────────────────────
  async function buildSettingsContent() {
    try {
      const settings = await API.get('/api/settings');
      const twilioConfigured = settings.twilio_account_sid && settings.twilio_from_number && settings.twilio_to_number;

      return `
        <div class="settings-section">
          <h3>💰 Pricing</h3>
          <p class="settings-desc">Set a price for each menu item under the Menu tab. Use $0.00 for anything that's free.</p>
          <div class="settings-field-row">
            <div class="form-group">
              <label class="form-label">Custom Order Price ($)</label>
              <p class="settings-hint">Default price applied to orders built with "Create Your Own"</p>
              <div style="display:flex;gap:8px;max-width:240px;margin-top:6px">
                <input type="number" id="custom-price-input" class="text-input"
                  value="${Number(settings.custom_order_price).toFixed(2)}"
                  min="0" step="0.01" placeholder="0.00" />
                <button class="btn btn-primary btn-sm" onclick="adminSaveCustomPrice()">Save</button>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h3>📱 Twilio SMS Notifications</h3>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <span class="twilio-status ${twilioConfigured ? 'configured' : 'not-configured'}">
              ${twilioConfigured ? '✓ Credentials Saved' : '✗ Not Configured'}
            </span>
            <span class="twilio-status ${settings.twilio_enabled ? 'configured' : 'not-configured'}">
              ${settings.twilio_enabled ? '✓ Enabled' : '✗ Disabled'}
            </span>
          </div>
          <p class="settings-desc">
            When an order comes in, Swirl can text you. Fill in your Twilio credentials below to activate.
            Once configured, run <code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:12px">npm install twilio</code> in the Swirl folder to enable SMS sending.
          </p>
          <div class="settings-grid-2">
            <div class="form-group">
              <label class="form-label">Account SID</label>
              <input type="text" id="twilio-sid" class="text-input" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value="${settings.twilio_account_sid}" autocomplete="off" spellcheck="false" />
            </div>
            <div class="form-group">
              <label class="form-label">Auth Token</label>
              <input type="password" id="twilio-token" class="text-input" placeholder="${settings.twilio_auth_token ? '(saved — leave blank to keep)' : 'Your auth token'}" autocomplete="off" />
            </div>
            <div class="form-group">
              <label class="form-label">From Number (Twilio)</label>
              <input type="text" id="twilio-from" class="text-input" placeholder="+15550001234" value="${settings.twilio_from_number}" />
            </div>
            <div class="form-group">
              <label class="form-label">To Number (your phone)</label>
              <input type="text" id="twilio-to" class="text-input" placeholder="+15559876543" value="${settings.twilio_to_number}" />
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <label style="display:flex;align-items:center;gap:8px;font-weight:700;color:#5B1647;cursor:pointer;font-family:'Nunito',sans-serif">
              <input type="checkbox" id="twilio-enabled" ${settings.twilio_enabled ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer" />
              Enable SMS notifications
            </label>
          </div>
          <button class="btn btn-primary btn-sm" onclick="adminSaveTwilio()">Save Twilio Settings</button>
          <p class="settings-hint" style="margin-top:12px">Don't have Twilio? Sign up free at twilio.com — you get a trial number to test with.</p>
        </div>
      `;
    } catch (e) {
      return '<p class="error-msg">Failed to load settings</p>';
    }
  }

  // ── Main render ───────────────────────────────────────────
  async function renderAdmin() {
    await loadStats();

    let mainContent = '';
    let mainTitle   = '';
    if      (activeTab === 'orders')    { mainTitle = 'Orders';    mainContent = await buildOrdersContent(); }
    else if (activeTab === 'menu')      { mainTitle = 'Menu';      mainContent = await buildMenuContent(); }
    else if (activeTab === 'inventory') { mainTitle = 'Inventory'; mainContent = await buildInventoryContent(); }
    else if (activeTab === 'users')     { mainTitle = 'Users';     mainContent = await buildUsersContent(); }
    else if (activeTab === 'rewards')   { mainTitle = 'Rewards';   mainContent = await buildRewardsContent(); }
    else if (activeTab === 'reviews')   { mainTitle = 'Reviews';   mainContent = await buildReviewsContent(); }
    else if (activeTab === 'settings')  { mainTitle = 'Settings';  mainContent = await buildSettingsContent(); }

    const pendingBadge = adminStats.pending_count > 0
      ? `<span class="admin-sidebar-badge">${adminStats.pending_count}</span>` : '';

    container.innerHTML = `
      <div class="admin-portal">

        <!-- Sidebar -->
        <div class="admin-sidebar">
          <div class="admin-sidebar-logo">
            <div style="font-size:28px">🍦</div>
            <h2>Swirl</h2>
            <p>Admin Portal</p>
          </div>

          <nav class="admin-nav">
            <button class="admin-nav-btn ${activeTab === 'orders'    ? 'active' : ''}" onclick="adminTab('orders')">
              <span class="nav-icon-admin">📋</span> Orders ${pendingBadge}
            </button>
            <button class="admin-nav-btn ${activeTab === 'menu'      ? 'active' : ''}" onclick="adminTab('menu')">
              <span class="nav-icon-admin">🍦</span> Menu
            </button>
            <button class="admin-nav-btn ${activeTab === 'inventory' ? 'active' : ''}" onclick="adminTab('inventory')">
              <span class="nav-icon-admin">📦</span> Inventory
            </button>
            <button class="admin-nav-btn ${activeTab === 'users'     ? 'active' : ''}" onclick="adminTab('users')">
              <span class="nav-icon-admin">👥</span> Users
            </button>
            <button class="admin-nav-btn ${activeTab === 'rewards'   ? 'active' : ''}" onclick="adminTab('rewards')">
              <span class="nav-icon-admin">🎁</span> Rewards
            </button>
            <button class="admin-nav-btn ${activeTab === 'reviews'   ? 'active' : ''}" onclick="adminTab('reviews')">
              <span class="nav-icon-admin">⭐</span> Reviews ${adminStats.review_count > 0 ? `<span class="admin-sidebar-badge" style="background:#FFD700;color:#5B1647">${adminStats.review_count}</span>` : ''}
            </button>
            <button class="admin-nav-btn ${activeTab === 'settings'  ? 'active' : ''}" onclick="adminTab('settings')">
              <span class="nav-icon-admin">⚙️</span> Settings
            </button>
          </nav>

          <div class="admin-sidebar-stats">
            <div class="sidebar-stat">
              <span class="sidebar-stat-label">Today's Revenue</span>
              <span class="sidebar-stat-value">$${adminStats.today_revenue.toFixed(2)}</span>
            </div>
            <div class="sidebar-stat">
              <span class="sidebar-stat-label">All-Time Revenue</span>
              <span class="sidebar-stat-value">$${adminStats.total_revenue.toFixed(2)}</span>
            </div>
            <div class="sidebar-stat">
              <span class="sidebar-stat-label">Pending Orders</span>
              <span class="sidebar-stat-value">${adminStats.pending_count}</span>
            </div>
            <div class="sidebar-stat">
              <span class="sidebar-stat-label">Today's Orders</span>
              <span class="sidebar-stat-value">${adminStats.today_orders}</span>
            </div>
            <div class="sidebar-stat">
              <span class="sidebar-stat-label">Total Orders</span>
              <span class="sidebar-stat-value">${adminStats.total_orders}</span>
            </div>
          </div>

          <div class="admin-sidebar-back">
            <button class="admin-back-btn" onclick="adminExit()">← Back to App</button>
          </div>
        </div>

        <!-- Main Content -->
        <div class="admin-main">
          <div class="admin-main-header">
            <h1 class="admin-main-title">${mainTitle}</h1>
            <button class="btn btn-outline btn-sm" onclick="adminRefresh()">↻ Refresh</button>
          </div>
          <div class="admin-main-content" id="admin-tab-content">
            ${mainContent}
          </div>
        </div>

      </div>
    `;

    // Restore edit form values if needed
    if (editingId && activeTab === 'menu') {
      const n = document.getElementById('edit-name');
      const d = document.getElementById('edit-desc');
      const e = document.getElementById('edit-emoji');
      const p = document.getElementById('edit-price');
      if (n) n.value = editDraft.name || '';
      if (d) d.value = editDraft.description || '';
      if (e) e.value = editDraft.emoji || '';
      if (p) p.value = editDraft.price !== undefined ? editDraft.price : '';
    }
  }

  // ── Event handlers ────────────────────────────────────────

  window.adminTab     = (tab) => { activeTab = tab; editingId = null; editingUserId = null; editingRewardId = null; renderAdmin(); };
  window.adminRefresh = ()    => { renderAdmin(); };
  window.adminExit    = ()    => {
    appEl.classList.remove('admin-mode');
    navEl.classList.remove('admin-mode');
    showView('profile');
  };

  window.adminOrderFilter = (f) => { orderFilter = f; renderAdmin(); };

  window.adminDeleteReview = async (id) => {
    if (!confirm('Delete this review?')) return;
    try {
      await API.del(`/api/admin/reviews/${id}`);
      showToast('Review deleted');
      renderAdmin();
    } catch (e) { showToast('Failed to delete review', 'error'); }
  };

  window.adminToggleOrderStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    try {
      await API.put(`/api/orders/${id}/status`, { status: newStatus });
      renderAdmin();
    } catch (e) { showToast('Failed to update order', 'error'); }
  };

  window.adminDeleteOrder = async (id, userName) => {
    if (!confirm(`Delete order from ${userName}? Points will be refunded. This cannot be undone.`)) return;
    try {
      await API.del(`/api/orders/${id}`);
      showToast('Order deleted');
      renderAdmin();
    } catch (e) { showToast('Failed to delete order', 'error'); }
  };

  window.adminRewardFilter = (f) => { rewardFilter = f; renderAdmin(); };

  window.adminToggleRedemption = async (id, currentStatus) => {
    const newStatus = (currentStatus || 'pending') === 'pending' ? 'completed' : 'pending';
    try {
      await API.put(`/api/redemptions/${id}/status`, { status: newStatus });
      renderAdmin();
    } catch (e) { showToast('Failed to update redemption', 'error'); }
  };

  window.adminDeleteRedemption = async (id, rewardName) => {
    if (!confirm(`Delete "${rewardName}" redemption? Sprinkles will be refunded.`)) return;
    try {
      await API.del(`/api/redemptions/${id}`);
      showToast('Redemption deleted, sprinkles refunded');
      renderAdmin();
    } catch (e) { showToast('Failed to delete redemption', 'error'); }
  };

  // Menu item visibility toggle
  window.adminToggleItem = async (id, current, name, description, emoji) => {
    try {
      await API.put(`/api/menu/${id}`, { name, description, emoji, is_available: !current });
      menuData = await API.get('/api/menu');
      showToast(current ? 'Treat hidden' : 'Treat now visible');
      renderAdmin();
    } catch (e) { showToast('Failed to update', 'error'); }
  };

  // Menu item delete
  window.adminDeleteItem = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await API.del(`/api/menu/${id}`);
      menuData = await API.get('/api/menu');
      showToast(`${name} deleted`);
      renderAdmin();
    } catch (e) { showToast('Failed to delete', 'error'); }
  };

  // Ingredient linking toggle
  window.adminToggleIngredient = (prefix, ingId) => {
    if (prefix === 'edit') {
      const arr = editDraft.ingredient_ids || [];
      const idx = arr.indexOf(ingId);
      if (idx > -1) arr.splice(idx, 1); else arr.push(ingId);
      editDraft.ingredient_ids = arr;
      window._renderEditForm?.();
    } else if (prefix === 'new') {
      const arr = window._newTreatDraft?.ingredient_ids || [];
      const idx = arr.indexOf(ingId);
      if (idx > -1) arr.splice(idx, 1); else arr.push(ingId);
      if (window._newTreatDraft) window._newTreatDraft.ingredient_ids = arr;
      window._renderAddTreatForm?.();
    }
  };

  // ── User management ────────────────────────────────────────

  window.adminStartUserEdit = (userId, first, last, username, points) => {
    editingUserId = userId;
    editUserDraft = {
      first_name: first.trim(),
      last_name:  last.trim(),
      username:   username,
      points:     points
    };
    renderAdmin();
  };

  window.adminCancelUserEdit = () => { editingUserId = null; renderAdmin(); };

  window.adminSaveUserEdit = async (userId) => {
    const first_name = (document.getElementById('uedit-first')?.value || '').trim();
    const last_name  = (document.getElementById('uedit-last')?.value  || '').trim();
    const username   = (document.getElementById('uedit-username')?.value || '').trim().toLowerCase();
    const pin        = (document.getElementById('uedit-pin')?.value   || '').trim();
    const points     = parseInt(document.getElementById('uedit-points')?.value || '0');

    if (!first_name) { showToast('First name is required', 'error'); return; }
    if (!username)   { showToast('Username is required', 'error'); return; }
    if (pin && !/^\d{4}$/.test(pin)) { showToast('PIN must be exactly 4 digits', 'error'); return; }

    try {
      const payload = { first_name, last_name, username, points };
      if (pin) payload.password = pin;
      const result = await API.put(`/api/admin/users/${userId}`, payload);
      if (currentUser.id === userId) { saveUser({ ...currentUser, ...result.user }); }
      editingUserId = null;
      showToast('User updated!');
      renderAdmin();
    } catch (e) {
      let msg = 'Failed to save';
      try { msg = JSON.parse(e.message).error; } catch {}
      showToast(msg, 'error');
    }
  };

  window.adminToggleAdmin = async (userId, isAdmin) => {
    try {
      await API.put(`/api/admin/users/${userId}`, { is_admin: !isAdmin });
      if (currentUser.id === userId) { currentUser.is_admin = !isAdmin; saveUser(currentUser); }
      showToast(isAdmin ? 'Admin removed' : 'Admin granted ⭐');
      renderAdmin();
    } catch (e) { showToast('Failed to update', 'error'); }
  };

  window.adminDeleteUser = async (userId, name) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await API.del(`/api/admin/users/${userId}`);
      showToast(`${name} deleted`);
      renderAdmin();
    } catch (e) { showToast('Failed to delete user', 'error'); }
  };

  // ── Inventory management ───────────────────────────────────

  window.adminToggleStock = async (id, inStock) => {
    try {
      await API.put(`/api/inventory/${id}`, { in_stock: !inStock });
      menuData = await API.get('/api/menu');
      showToast(inStock ? 'Marked out of stock' : 'Back in stock! ✓');
      renderAdmin();
    } catch (e) { showToast('Failed to update', 'error'); }
  };

  window.adminDeleteIngredient = async (id, name) => {
    if (!confirm(`Remove "${name}" from inventory?`)) return;
    try {
      await API.del(`/api/inventory/${id}`);
      showToast(`${name} removed`);
      renderAdmin();
    } catch (e) { showToast('Failed to delete', 'error'); }
  };

  window.adminShowAddIngredient = () => {
    const form = document.getElementById('add-ingredient-form');
    if (!form) return;
    form.classList.remove('hidden');
    form.innerHTML = `
      <div class="admin-form-section" style="margin-bottom:16px">
        <h4 style="font-family:'Fredoka',sans-serif;font-size:16px;color:#5B1647;margin-bottom:12px">New Ingredient</h4>
        <div class="admin-form-row-2">
          <div class="form-group">
            <label class="form-label">Name *</label>
            <input type="text" id="new-ing-name" class="text-input" placeholder="e.g. Peanut Butter" />
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select id="new-ing-cat" class="text-input">
              <option value="Flavors">Flavors</option>
              <option value="Sauces">Sauces</option>
              <option value="Toppings">Toppings</option>
              <option value="Extras">Extras</option>
              <option value="Supplies">Supplies</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <button class="btn btn-primary btn-sm" onclick="adminSubmitIngredient()">Add Ingredient</button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('add-ingredient-form').classList.add('hidden')">Cancel</button>
        </div>
      </div>
    `;
    document.getElementById('new-ing-name')?.focus();
  };

  window.adminSubmitIngredient = async () => {
    const name     = (document.getElementById('new-ing-name')?.value || '').trim();
    const category = (document.getElementById('new-ing-cat')?.value  || '').trim() || 'Other';
    if (!name) { showToast('Name is required', 'error'); return; }
    try {
      await API.post('/api/inventory', { name, category });
      showToast(`${name} added!`);
      renderAdmin();
    } catch (e) { showToast('Failed to add ingredient', 'error'); }
  };

  // ── Rewards management (admin) ─────────────────────────────

  window.adminShowAddReward = () => {
    const form = document.getElementById('add-reward-form');
    if (!form) return;
    form.classList.remove('hidden');
    form.innerHTML = `
      <div class="admin-form-section" style="margin-bottom:16px">
        <h4 style="font-family:'Fredoka',sans-serif;font-size:16px;color:#5B1647;margin-bottom:12px">New Reward</h4>
        <div class="admin-form-row-2">
          <div class="form-group">
            <label class="form-label">Reward Name *</label>
            <input type="text" id="new-rwd-name" class="text-input" placeholder="e.g. Free Scoop" />
          </div>
          <div class="form-group" style="max-width:100px">
            <label class="form-label">Emoji</label>
            <input type="text" id="new-rwd-emoji" class="text-input" placeholder="🎁" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input type="text" id="new-rwd-desc" class="text-input" placeholder="What does the kid get?" />
        </div>
        <div class="form-group" style="max-width:180px">
          <label class="form-label">Points Cost ✨</label>
          <input type="number" id="new-rwd-cost" class="text-input" placeholder="100" min="0" />
        </div>
        <div class="form-row">
          <button class="btn btn-primary btn-sm" onclick="adminSubmitReward()">Add Reward</button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('add-reward-form').classList.add('hidden')">Cancel</button>
        </div>
      </div>
    `;
    document.getElementById('new-rwd-name')?.focus();
  };

  window.adminSubmitReward = async () => {
    const name        = (document.getElementById('new-rwd-name')?.value  || '').trim();
    const emoji       = (document.getElementById('new-rwd-emoji')?.value || '').trim() || '🎁';
    const description = (document.getElementById('new-rwd-desc')?.value  || '').trim();
    const points_cost = parseInt(document.getElementById('new-rwd-cost')?.value  || '0') || 0;
    if (!name) { showToast('Name is required', 'error'); return; }
    try {
      await API.post('/api/rewards', { name, emoji, description, points_cost });
      showToast(`${emoji} ${name} added!`);
      renderAdmin();
    } catch (e) { showToast('Failed to add reward', 'error'); }
  };

  window.adminEditReward = (id) => {
    const reward = (window._adminRewards || []).find(r => r.id === id);
    if (!reward) { renderAdmin(); return; }
    editingRewardId = id;
    editRewardDraft = { name: reward.name, emoji: reward.emoji, description: reward.description, points_cost: reward.points_cost };
    renderAdmin();
  };

  window.adminSaveRewardEdit = async (id) => {
    const name        = (document.getElementById('redit-name')?.value  || '').trim();
    const emoji       = (document.getElementById('redit-emoji')?.value || '').trim() || '🎁';
    const description = (document.getElementById('redit-desc')?.value  || '').trim();
    const points_cost = parseInt(document.getElementById('redit-cost')?.value  || '0') || 0;
    if (!name) { showToast('Name is required', 'error'); return; }
    try {
      await API.put(`/api/rewards/${id}`, { name, emoji, description, points_cost });
      editingRewardId = null;
      showToast('Reward updated!');
      renderAdmin();
    } catch (e) { showToast('Failed to save reward', 'error'); }
  };

  window.adminCancelRewardEdit = () => { editingRewardId = null; renderAdmin(); };

  window.adminToggleReward = async (id, isAvailable) => {
    try {
      await API.put(`/api/rewards/${id}`, { is_available: !isAvailable });
      showToast(isAvailable ? 'Reward hidden' : 'Reward now available');
      renderAdmin();
    } catch (e) { showToast('Failed to update', 'error'); }
  };

  window.adminDeleteReward = async (id, name) => {
    if (!confirm(`Delete reward "${name}"?`)) return;
    try {
      await API.del(`/api/rewards/${id}`);
      showToast(`${name} deleted`);
      renderAdmin();
    } catch (e) { showToast('Failed to delete', 'error'); }
  };

  // ── Add treat form ─────────────────────────────────────────
  window.adminShowAddTreat = () => {
    const form = document.getElementById('add-treat-form');
    if (!form) return;

    let draft = {
      default_temperature: 'Cup',
      default_milk:    flavors[0] || 'Vanilla',
      default_creamer: null,
      default_syrups:  [],
      default_extras:  [],
      ingredient_ids:  []
    };
    window._newTreatDraft = draft;

    function renderAddForm() {
      const prevName  = document.getElementById('new-name')?.value  ?? '';
      const prevDesc  = document.getElementById('new-desc')?.value  ?? '';
      const prevEmoji = document.getElementById('new-emoji')?.value ?? '';
      const prevPrice = document.getElementById('new-price')?.value ?? '';

      form.classList.remove('hidden');
      form.innerHTML = `
        <div class="admin-form-section" style="margin-bottom:16px">
          <h4 style="font-family:'Fredoka',sans-serif;font-size:18px;color:#5B1647;margin-bottom:12px">New Treat</h4>
          <div class="admin-form-row-2">
            <div class="form-group">
              <label class="form-label">Treat Name *</label>
              <input type="text" id="new-name"  class="text-input" placeholder="Treat name" />
            </div>
            <div class="form-group">
              <label class="form-label">Emoji</label>
              <input type="text" id="new-emoji" class="text-input" placeholder="🍦" />
            </div>
          </div>
          <div class="admin-form-row-2">
            <div class="form-group" style="flex:2">
              <label class="form-label">Description</label>
              <input type="text" id="new-desc"  class="text-input" placeholder="Short description" />
            </div>
            <div class="form-group" style="flex:1">
              <label class="form-label">Price ($)</label>
              <input type="number" id="new-price" class="text-input" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          <div class="custom-section">
            <h3>Default Vessel</h3>
            <div class="option-pills">
              ${vessels.map(v => `
                <button class="pill ${draft.default_temperature === v ? 'active' : ''}"
                  onclick="adminDraftSet('default_temperature','${v}')">
                  ${v}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="custom-section">
            <h3>Default Flavor</h3>
            <div class="option-pills">
              ${flavors.map(f => `
                <button class="pill ${draft.default_milk === f ? 'active' : ''}"
                  onclick="adminDraftSet('default_milk','${f}')">
                  ${f}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="custom-section">
            <h3>Default Sauce <span class="optional">(optional)</span></h3>
            <div class="option-pills">
              ${sauces.map(s => `
                <button class="pill ${draft.default_creamer === s ? 'active' : ''}"
                  onclick="adminDraftToggleSingle('default_creamer','${s}')">
                  ${s}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="custom-section">
            <h3>Default Toppings <span class="optional">(optional)</span></h3>
            <div class="option-pills">
              ${toppings.map(t => `
                <button class="pill ${draft.default_syrups.includes(t) ? 'active' : ''}"
                  onclick="adminDraftToggle('default_syrups','${t.replace(/'/g, "\\'")}')">
                  ${t}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="custom-section">
            <h3>Default Extras <span class="optional">(optional)</span></h3>
            <div class="option-pills">
              ${extras.map(e => `
                <button class="pill ${draft.default_extras.includes(e) ? 'active' : ''}"
                  onclick="adminDraftToggle('default_extras','${e.replace(/'/g, "\\'")}')">
                  ${e}
                </button>
              `).join('')}
            </div>
          </div>
          ${ingredientPickerHTML(draft.ingredient_ids || [], 'new')}
          <div class="form-row">
            <button class="btn btn-primary btn-sm" onclick="adminSubmitTreat()">Add Treat</button>
            <button class="btn btn-ghost btn-sm" onclick="adminCancelTreat()">Cancel</button>
          </div>
        </div>
      `;

      document.getElementById('new-name').value  = prevName;
      document.getElementById('new-desc').value  = prevDesc;
      document.getElementById('new-emoji').value = prevEmoji;
      document.getElementById('new-price').value = prevPrice;
    }
    window._renderAddTreatForm = renderAddForm;

    window.adminDraftSet          = (key, val) => { draft[key] = val; renderAddForm(); };
    window.adminDraftToggleSingle = (key, val) => { draft[key] = draft[key] === val ? null : val; renderAddForm(); };
    window.adminDraftToggle       = (key, val) => {
      const idx = draft[key].indexOf(val);
      if (idx > -1) draft[key].splice(idx, 1); else draft[key].push(val);
      renderAddForm();
    };
    window.adminCancelTreat = () => { form.classList.add('hidden'); };

    window.adminSubmitTreat = async () => {
      const name        = (document.getElementById('new-name')?.value  || '').trim();
      const description = (document.getElementById('new-desc')?.value  || '').trim();
      const emoji       = (document.getElementById('new-emoji')?.value || '').trim() || '🍦';
      const price       = parseFloat(document.getElementById('new-price')?.value || '0') || 0;
      if (!name) { showToast('Name is required', 'error'); return; }
      try {
        await API.post('/api/menu', {
          name, description, emoji, price,
          default_temperature: draft.default_temperature,
          default_milk:        draft.default_milk,
          default_creamer:     draft.default_creamer,
          default_syrups:      draft.default_syrups,
          default_extras:      draft.default_extras,
          ingredient_ids:      draft.ingredient_ids
        });
        menuData = await API.get('/api/menu');
        showToast(`${emoji} ${name} added!`);
        renderAdmin();
      } catch (e) { showToast('Failed to add treat', 'error'); }
    };

    renderAddForm();
  };

  // Edit menu item
  window.adminEditItem = (id) => {
    const item = (window._adminMenuItems || []).find(i => i.id === id);
    if (!item) return;
    editingId = id;
    editDraft = {
      name:                item.name,
      description:         item.description,
      emoji:               item.emoji,
      price:               item.price || 0,
      default_temperature: item.default_temperature || 'Cup',
      default_milk:        item.default_milk        || (flavors[0] || 'Vanilla'),
      default_creamer:     item.default_creamer     || null,
      default_syrups:      [...(item.default_syrups || [])],
      default_extras:      [...(item.default_extras || [])],
      ingredient_ids:      [...(item.ingredient_ids  || [])]
    };

    window._renderEditForm = () => {
      const form = document.getElementById('admin-edit-form');
      if (!form) return;
      const prevName  = document.getElementById('edit-name')?.value  ?? editDraft.name;
      const prevDesc  = document.getElementById('edit-desc')?.value  ?? editDraft.description;
      const prevEmoji = document.getElementById('edit-emoji')?.value ?? editDraft.emoji;
      const prevPrice = document.getElementById('edit-price')?.value ?? editDraft.price;
      form.innerHTML = editFormInnerHTML();
      const n = document.getElementById('edit-name');
      const d = document.getElementById('edit-desc');
      const e = document.getElementById('edit-emoji');
      const p = document.getElementById('edit-price');
      if (n) n.value = prevName;
      if (d) d.value = prevDesc;
      if (e) e.value = prevEmoji;
      if (p) p.value = prevPrice;
    };

    renderAdmin();
  };

  window.adminEditDraftSet          = (key, val) => { editDraft[key] = val; window._renderEditForm?.(); };
  window.adminEditDraftToggleSingle = (key, val) => { editDraft[key] = editDraft[key] === val ? null : val; window._renderEditForm?.(); };
  window.adminEditDraftToggle       = (key, val) => {
    const idx = editDraft[key].indexOf(val);
    if (idx > -1) editDraft[key].splice(idx, 1); else editDraft[key].push(val);
    window._renderEditForm?.();
  };
  window.adminCancelEdit = () => { editingId = null; renderAdmin(); };
  window.adminSaveEdit   = async () => {
    const name        = (document.getElementById('edit-name')?.value  || '').trim();
    const description = (document.getElementById('edit-desc')?.value  || '').trim();
    const emoji       = (document.getElementById('edit-emoji')?.value || '').trim() || '🍦';
    const price       = parseFloat(document.getElementById('edit-price')?.value || '0') || 0;
    if (!name) { showToast('Name is required', 'error'); return; }
    try {
      await API.put(`/api/menu/${editingId}`, {
        name, description, emoji, price,
        default_temperature: editDraft.default_temperature,
        default_milk:        editDraft.default_milk,
        default_creamer:     editDraft.default_creamer,
        default_syrups:      editDraft.default_syrups,
        default_extras:      editDraft.default_extras,
        ingredient_ids:      editDraft.ingredient_ids
      });
      menuData = await API.get('/api/menu');
      editingId = null;
      showToast('Treat updated! ✓');
      renderAdmin();
    } catch (e) { showToast('Failed to save', 'error'); }
  };

  // Settings handlers
  window.adminSaveCustomPrice = async () => {
    const val = parseFloat(document.getElementById('custom-price-input')?.value || '0') || 0;
    try {
      await API.put('/api/settings', { custom_order_price: val });
      showToast(`Custom order price set to $${val.toFixed(2)}`);
    } catch (e) { showToast('Failed to save', 'error'); }
  };

  window.adminSaveTwilio = async () => {
    const sid     = (document.getElementById('twilio-sid')?.value   || '').trim();
    const token   = (document.getElementById('twilio-token')?.value || '').trim();
    const from    = (document.getElementById('twilio-from')?.value  || '').trim();
    const to      = (document.getElementById('twilio-to')?.value    || '').trim();
    const enabled = document.getElementById('twilio-enabled')?.checked || false;

    try {
      await API.put('/api/settings', {
        twilio_account_sid: sid,
        twilio_auth_token:  token,
        twilio_from_number: from,
        twilio_to_number:   to,
        twilio_enabled:     enabled
      });
      showToast('Twilio settings saved!');
      renderAdmin();
    } catch (e) { showToast('Failed to save', 'error'); }
  };

  renderAdmin();
};

// ============================================================
// INIT
// ============================================================

async function initApp() {
  document.getElementById('bottom-nav').innerHTML = `
    <button class="nav-btn" data-view="menu" onclick="showView('menu')">
      <span class="nav-icon">📋</span>
      <span>Menu</span>
    </button>
    <button class="nav-btn" data-view="create" onclick="showView('create')">
      <span class="nav-icon">🧁</span>
      <span>Build</span>
    </button>
    <button class="nav-btn" data-view="cart" onclick="showView('cart')">
      <span class="nav-icon">🛒<span id="cart-count" class="cart-count">0</span></span>
      <span>Cart</span>
    </button>
    <button class="nav-btn" data-view="profile" onclick="showView('profile')">
      <span class="nav-icon">👤</span>
      <span>Profile</span>
    </button>
  `;

  try {
    [menuData, customizations] = await Promise.all([
      API.get('/api/menu'),
      API.get('/api/customizations')
    ]);
  } catch (e) { /* will retry in menu view */ }

  const saved = loadSavedUser();
  if (saved) {
    try {
      const fresh = await API.get(`/api/users/${saved.id}`);
      saveUser(fresh);
      showView('menu');
    } catch (e) {
      localStorage.removeItem('swirlUser');
      showView('login');
    }
  } else {
    showView('login');
  }
}

document.addEventListener('DOMContentLoaded', initApp);
