const express = require('express');
const notifier = require('node-notifier');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// ============================================================
// JSON DATA STORE
// ============================================================

function readDb() {
  if (!fs.existsSync(DB_PATH)) return seedDb();
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    return migrateDb(db);
  } catch (e) {
    return seedDb();
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function nextId(db, table) {
  if (!db._sequences) db._sequences = {};
  db._sequences[table] = (db._sequences[table] || 0) + 1;
  return db._sequences[table];
}

function inventorySeed() {
  return [
    { id: 1,  name: 'Vanilla',             category: 'Flavors',  in_stock: true },
    { id: 2,  name: 'Chocolate',           category: 'Flavors',  in_stock: true },
    { id: 3,  name: 'Strawberry',          category: 'Flavors',  in_stock: true },
    { id: 4,  name: 'Birthday Cake',       category: 'Flavors',  in_stock: true },
    { id: 5,  name: 'Mint Chip',           category: 'Flavors',  in_stock: true },
    { id: 6,  name: 'Cotton Candy',        category: 'Flavors',  in_stock: true },
    { id: 7,  name: 'Cookies & Cream',     category: 'Flavors',  in_stock: true },
    { id: 8,  name: 'Caramel Ribbon',      category: 'Flavors',  in_stock: true },
    { id: 9,  name: 'Rainbow Sherbet',     category: 'Flavors',  in_stock: true },
    { id: 10, name: 'Hot Fudge',           category: 'Sauces',   in_stock: true },
    { id: 11, name: 'Caramel Sauce',       category: 'Sauces',   in_stock: true },
    { id: 12, name: 'Strawberry Sauce',    category: 'Sauces',   in_stock: true },
    { id: 13, name: 'Raspberry Sauce',     category: 'Sauces',   in_stock: true },
    { id: 14, name: 'Rainbow Sprinkles',   category: 'Toppings', in_stock: true },
    { id: 15, name: 'Chocolate Sprinkles', category: 'Toppings', in_stock: true },
    { id: 16, name: 'Gummy Bears',         category: 'Toppings', in_stock: true },
    { id: 17, name: 'Crushed Oreos',       category: 'Toppings', in_stock: true },
    { id: 18, name: "M&M's",              category: 'Toppings', in_stock: true },
    { id: 19, name: 'Whipped Cream',       category: 'Extras',   in_stock: true },
    { id: 20, name: 'Maraschino Cherries', category: 'Extras',   in_stock: true },
    { id: 21, name: 'Crushed Nuts',        category: 'Extras',   in_stock: true },
    { id: 22, name: 'Sugar Cones',         category: 'Supplies', in_stock: true },
    { id: 23, name: 'Waffle Cones',        category: 'Supplies', in_stock: true }
  ];
}

function rewardsSeed() {
  return [
    { id: 1, name: 'Free Topping Upgrade', emoji: '🎯', description: 'Add any extra topping to your next order — on the house!',        points_cost: 25,  is_available: true },
    { id: 2, name: 'Rainbow Sticker Pack', emoji: '🌈', description: 'A fun pack of rainbow stickers for your notebook or water bottle!', points_cost: 50,  is_available: true },
    { id: 3, name: 'Candy Surprise Bag',   emoji: '🍬', description: 'A mystery bag of assorted candy — no two bags are the same!',       points_cost: 75,  is_available: true },
    { id: 4, name: 'Free Scoop',           emoji: '🍦', description: 'A free scoop of any flavor, any cone — your choice!',               points_cost: 100, is_available: true },
    { id: 5, name: 'Fidget Toy',           emoji: '🪀', description: 'A fun fidget spinner, pop-it, or cube — great for busy hands!',     points_cost: 150, is_available: true },
    { id: 6, name: 'Mini Art Kit',         emoji: '🎨', description: 'A set of colored pencils and a cute mini sketchbook!',              points_cost: 200, is_available: true },
    { id: 7, name: 'Mini Stuffed Animal',  emoji: '🧸', description: 'A cute little stuffed friend to take home — surprise selection!',   points_cost: 300, is_available: true },
    { id: 8, name: 'Swirl VIP Crown',      emoji: '👑', description: 'Wear the official Swirl crown for the day. You are royalty!',       points_cost: 500, is_available: true }
  ];
}

// Migrate an existing DB to add new fields without losing data
function migrateDb(db) {
  let changed = false;

  if (!db.settings) {
    db.settings = {
      custom_order_price: 0,
      twilio_account_sid: '',
      twilio_auth_token: '',
      twilio_from_number: '',
      twilio_to_number: '',
      twilio_enabled: false
    };
    changed = true;
  }

  for (const u of db.users) {
    if (!u.username) {
      u.username = (u.name || '').toLowerCase().replace(/\s+/g, '');
      u.password = '1234';
      const parts = (u.name || '').split(' ');
      u.first_name = parts[0] || u.name || '';
      u.last_name = parts.slice(1).join(' ') || '';
      changed = true;
    }
    if (!u.name) {
      u.name = u.first_name + (u.last_name ? ` ${u.last_name}` : '');
      changed = true;
    }
  }

  for (const item of db.menu_items) {
    if (item.price === undefined)     { item.price = 0;            changed = true; }
    if (!item.ingredient_ids)         { item.ingredient_ids = [];   changed = true; }
  }

  for (const order of db.orders) {
    if (!order.status)                { order.status = 'pending';  changed = true; }
    if (order.total === undefined)    { order.total = 0;           changed = true; }
  }

  if (!db.inventory) {
    db.inventory = inventorySeed();
    db._sequences = db._sequences || {};
    db._sequences.inventory = db.inventory.length;
    changed = true;
  }

  if (!db.rewards) {
    db.rewards = rewardsSeed();
    db._sequences = db._sequences || {};
    db._sequences.rewards = db.rewards.length;
    changed = true;
  }

  if (!db.redemptions) { db.redemptions = []; changed = true; }
  if (!db.reviews) { db.reviews = []; changed = true; }

  if (!db.high_scores) {
    db.high_scores = [];
    db._sequences = db._sequences || {};
    if (!db._sequences.high_scores) db._sequences.high_scores = 0;
    changed = true;
  }

  if (changed) writeDb(db);
  return db;
}

function userPublic(u) {
  return {
    id: u.id,
    name: u.name,
    first_name: u.first_name || '',
    last_name: u.last_name || '',
    username: u.username || '',
    points: u.points,
    is_admin: u.is_admin
  };
}

function seedDb() {
  const inventory = inventorySeed();
  const rewards   = rewardsSeed();
  const db = {
    users: [
      { id: 1, first_name: 'Sofia', last_name: '', username: 'sofia', password: '1234', name: 'Sofia', points: 150, is_admin: true },
      { id: 2, first_name: 'Maya',  last_name: '', username: 'maya',  password: '1234', name: 'Maya',  points: 80,  is_admin: false },
      { id: 3, first_name: 'Lily',  last_name: '', username: 'lily',  password: '1234', name: 'Lily',  points: 40,  is_admin: false },
      { id: 4, first_name: 'Luna',  last_name: '', username: 'luna',  password: '1234', name: 'Luna',  points: 20,  is_admin: false }
    ],
    categories: [
      { id: 1, name: 'Classic Scoops', emoji: '🍦', sort_order: 1 },
      { id: 2, name: 'Sundaes',        emoji: '🍨', sort_order: 2 },
      { id: 3, name: 'Shakes',         emoji: '🥤', sort_order: 3 }
    ],
    menu_items: [
      { id: 1, category_id: 1, name: 'Pink Princess',      description: 'Strawberry & vanilla swirl on a sugar cone — fit for royalty!',          emoji: '🌸', is_available: true, sort_order: 1, price: 3.50, default_temperature: 'Sugar Cone', default_milk: 'Strawberry',     default_creamer: 'Strawberry', default_syrups: ['Rainbow Sprinkles'],          default_extras: [],                                 ingredient_ids: [3, 22] },
      { id: 2, category_id: 1, name: 'Unicorn Dream',      description: "Birthday cake & cotton candy — it's basically magic in a cone!",         emoji: '🦄', is_available: true, sort_order: 2, price: 4.00, default_temperature: 'Waffle Cone', default_milk: 'Birthday Cake',  default_creamer: null,          default_syrups: ['Rainbow Sprinkles', "M&M's"],    default_extras: ['Whipped Cream'],                  ingredient_ids: [4, 23, 18, 19] },
      { id: 3, category_id: 1, name: 'Mint Magic',         description: 'Cool mint chip with hot fudge and crushed Oreos — a cozy combo!',        emoji: '🌿', is_available: true, sort_order: 3, price: 3.25, default_temperature: 'Cup',         default_milk: 'Mint Chip',      default_creamer: 'Hot Fudge',   default_syrups: ['Crushed Oreos'],                 default_extras: [],                                 ingredient_ids: [5, 10, 17] },
      { id: 4, category_id: 1, name: 'Choco Cloud',        description: 'Double chocolate for the chocolate lover in you ☁️',                    emoji: '🍫', is_available: true, sort_order: 4, price: 3.25, default_temperature: 'Cup',         default_milk: 'Chocolate',      default_creamer: 'Hot Fudge',   default_syrups: ['Chocolate Sprinkles'],           default_extras: ['Whipped Cream'],                  ingredient_ids: [2, 10, 15, 19] },
      { id: 5, category_id: 2, name: 'Rainbow Dream',      description: 'Rainbow sherbet with gummy bears and all the colors of the sky!',        emoji: '🌈', is_available: true, sort_order: 1, price: 4.50, default_temperature: 'Cup',         default_milk: 'Rainbow Sherbet',default_creamer: 'Strawberry',  default_syrups: ['Rainbow Sprinkles', 'Gummy Bears'],default_extras: ['Whipped Cream', 'Cherry on Top'], ingredient_ids: [9, 12, 16, 19, 20] },
      { id: 6, category_id: 2, name: 'Birthday Bash',      description: 'The ultimate celebration sundae — sprinkles everywhere!',                emoji: '🎂', is_available: true, sort_order: 2, price: 4.50, default_temperature: 'Cup',         default_milk: 'Birthday Cake',  default_creamer: 'Caramel',     default_syrups: ['Rainbow Sprinkles'],             default_extras: ['Whipped Cream', 'Cherry on Top'], ingredient_ids: [4, 11, 14, 19, 20] },
      { id: 7, category_id: 2, name: 'Caramel Star',       description: 'Dreamy vanilla drowning in rivers of golden caramel ⭐',                emoji: '⭐', is_available: true, sort_order: 3, price: 4.00, default_temperature: 'Cup',         default_milk: 'Vanilla',        default_creamer: 'Caramel',     default_syrups: [],                                default_extras: ['Whipped Cream', 'Crushed Nuts'],  ingredient_ids: [1, 11, 19, 21] },
      { id: 8, category_id: 3, name: 'Strawberry Kiss',    description: 'Thick and creamy strawberry shake with rainbow sprinkles 💕',           emoji: '💕', is_available: true, sort_order: 1, price: 5.00, default_temperature: 'Cup',         default_milk: 'Strawberry',     default_creamer: 'Strawberry',  default_syrups: ['Rainbow Sprinkles'],             default_extras: ['Whipped Cream'],                  ingredient_ids: [3, 12, 14, 19] },
      { id: 9, category_id: 3, name: 'Cotton Candy Cloud', description: 'A fluffy cotton candy shake that floats on clouds ☁️',                  emoji: '🩷', is_available: true, sort_order: 2, price: 5.00, default_temperature: 'Cup',         default_milk: 'Cotton Candy',   default_creamer: null,          default_syrups: ["M&M's"],                         default_extras: ['Whipped Cream'],                  ingredient_ids: [6, 18, 19] }
    ],
    inventory,
    orders: [],
    order_items: [],
    rewards,
    redemptions: [],
    reviews: [],
    settings: {
      custom_order_price: 2.50,
      twilio_account_sid: '',
      twilio_auth_token: '',
      twilio_from_number: '',
      twilio_to_number: '',
      twilio_enabled: false
    },
    high_scores: [],
    _sequences: { users: 4, menu_items: 9, orders: 0, order_items: 0, inventory: 23, rewards: 8, redemptions: 0, reviews: 0, high_scores: 0 }
  };
  writeDb(db);
  return db;
}

// ============================================================
// NOTIFICATIONS (desktop + Twilio SMS framework)
// ============================================================

async function sendOrderNotifications(db, user, items) {
  const userName = user.name || user.first_name || 'Someone';
  const itemNames = items.map(i => i.name).join(', ');

  try {
    notifier.notify({
      title: '🍦 New Swirl Order!',
      message: `${userName} ordered: ${itemNames}`,
      sound: true
    });
  } catch (e) {
    console.log('[notification] Desktop notification failed:', e.message);
  }

  const settings = db.settings || {};
  if (
    settings.twilio_enabled &&
    settings.twilio_account_sid &&
    settings.twilio_auth_token &&
    settings.twilio_from_number &&
    settings.twilio_to_number
  ) {
    try {
      const twilio = require('twilio');
      const client = twilio(settings.twilio_account_sid, settings.twilio_auth_token);
      const body = `🍦 New Swirl Order!\n${userName} ordered: ${itemNames}`;
      await client.messages.create({
        body,
        from: settings.twilio_from_number,
        to: settings.twilio_to_number
      });
      console.log('[twilio] SMS sent to', settings.twilio_to_number);
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        console.log('[twilio] Twilio package not installed. Run: npm install twilio');
      } else {
        console.log('[twilio] SMS failed:', e.message);
      }
    }
  }
}

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// AUTH
// ============================================================

app.post('/api/auth/login', (req, res) => {
  const username = (req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and PIN are required' });
  }

  const db = readDb();
  const user = db.users.find(u =>
    u.username && u.username.toLowerCase() === username &&
    u.password === password
  );

  if (!user) return res.status(401).json({ error: 'Wrong username or PIN. Try again!' });

  res.json(userPublic(user));
});

// ============================================================
// USERS
// ============================================================

app.get('/api/users', (req, res) => {
  const db = readDb();
  const users = db.users
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(userPublic);
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const first_name = (req.body.first_name || '').trim();
  const last_name  = (req.body.last_name  || '').trim();
  const username   = (req.body.username   || '').trim().toLowerCase();
  const password   = String(req.body.password || '').trim();

  if (!first_name) return res.status(400).json({ error: 'First name is required' });
  if (!username)   return res.status(400).json({ error: 'Username is required' });
  if (!/^\d{4}$/.test(password)) {
    return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
  }

  const db = readDb();
  if (db.users.find(u => u.username && u.username.toLowerCase() === username)) {
    return res.status(409).json({ error: 'That username is already taken!' });
  }

  const name = first_name + (last_name ? ` ${last_name}` : '');
  const user = {
    id: nextId(db, 'users'),
    first_name,
    last_name,
    username,
    password,
    name,
    points: 0,
    is_admin: false
  };
  db.users.push(user);
  writeDb(db);
  res.json(userPublic(user));
});

app.get('/api/users/:id', (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(userPublic(user));
});

app.get('/api/users/:id/redemptions', (req, res) => {
  const db = readDb();
  const redemptions = (db.redemptions || [])
    .filter(r => r.user_id === parseInt(req.params.id))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(redemptions);
});

// Admin: all redemptions with user names
app.get('/api/redemptions', (req, res) => {
  const db = readDb();
  const redemptions = (db.redemptions || [])
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(r => {
      const user = db.users.find(u => u.id === r.user_id);
      return { ...r, user_name: user ? (user.first_name || user.name) : 'Unknown' };
    });
  res.json(redemptions);
});

app.put('/api/redemptions/:id/status', (req, res) => {
  const db = readDb();
  const idx = (db.redemptions || []).findIndex(r => r.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Redemption not found' });
  const { status } = req.body;
  if (!['pending', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Status must be pending or completed' });
  }
  db.redemptions[idx].status = status;
  writeDb(db);
  res.json({ success: true });
});

app.delete('/api/redemptions/:id', (req, res) => {
  const db = readDb();
  const idx = (db.redemptions || []).findIndex(r => r.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Redemption not found' });

  // Refund points
  const redemption = db.redemptions[idx];
  const userIdx = db.users.findIndex(u => u.id === redemption.user_id);
  if (userIdx !== -1) {
    db.users[userIdx].points += redemption.points_spent || 0;
  }
  db.redemptions.splice(idx, 1);
  writeDb(db);
  res.json({ success: true });
});

// ============================================================
// MENU
// ============================================================

function buildMenu(db, includeUnavailable = false) {
  return db.menu_items
    .filter(i => includeUnavailable || i.is_available)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(item => {
      const soldOut = (item.ingredient_ids || []).some(ingId => {
        const ing = (db.inventory || []).find(i => i.id === ingId);
        return ing && !ing.in_stock;
      });
      return { ...item, sold_out: soldOut };
    });
}

app.get('/api/menu', (req, res) => {
  const db = readDb();
  res.json(buildMenu(db, false));
});

app.get('/api/menu/all', (req, res) => {
  const db = readDb();
  res.json(buildMenu(db, true));
});

app.post('/api/menu', (req, res) => {
  const { name, description, emoji, price } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  const db = readDb();
  const maxOrder = db.menu_items.length ? Math.max(...db.menu_items.map(i => i.sort_order)) : 0;

  const { default_temperature, default_milk, default_creamer, default_syrups, default_extras, ingredient_ids } = req.body;
  const item = {
    id: nextId(db, 'menu_items'),
    name: name.trim(),
    description: (description || '').trim(),
    emoji: emoji || '🍦',
    is_available: true,
    sort_order: maxOrder + 1,
    price: Math.round((parseFloat(price) || 0) * 100) / 100,
    default_temperature: default_temperature || 'Cup',
    default_milk: default_milk || 'Vanilla',
    default_creamer: default_creamer || null,
    default_syrups: default_syrups || [],
    default_extras: default_extras || [],
    ingredient_ids: ingredient_ids || []
  };
  db.menu_items.push(item);
  writeDb(db);
  res.json({ id: item.id });
});

app.put('/api/menu/:id', (req, res) => {
  const db = readDb();
  const idx = db.menu_items.findIndex(i => i.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });

  const {
    name, description, emoji, is_available, price,
    default_temperature, default_milk, default_creamer, default_syrups, default_extras,
    ingredient_ids
  } = req.body;

  if (name !== undefined)               db.menu_items[idx].name = name;
  if (description !== undefined)        db.menu_items[idx].description = description;
  if (emoji !== undefined)              db.menu_items[idx].emoji = emoji;
  if (is_available !== undefined)       db.menu_items[idx].is_available = Boolean(is_available);
  if (price !== undefined)              db.menu_items[idx].price = Math.round((parseFloat(price) || 0) * 100) / 100;
  if (default_temperature !== undefined) db.menu_items[idx].default_temperature = default_temperature;
  if (default_milk !== undefined)       db.menu_items[idx].default_milk = default_milk;
  if (default_creamer !== undefined)    db.menu_items[idx].default_creamer = default_creamer;
  if (default_syrups !== undefined)     db.menu_items[idx].default_syrups = default_syrups;
  if (default_extras !== undefined)     db.menu_items[idx].default_extras = default_extras;
  if (ingredient_ids !== undefined)     db.menu_items[idx].ingredient_ids = ingredient_ids;

  writeDb(db);
  res.json({ success: true });
});

app.delete('/api/menu/:id', (req, res) => {
  const db = readDb();
  db.menu_items = db.menu_items.filter(i => i.id !== parseInt(req.params.id));
  writeDb(db);
  res.json({ success: true });
});

// ============================================================
// CUSTOMIZATIONS
// ============================================================

app.get('/api/customizations', (req, res) => {
  const db = readDb();
  const inv = db.inventory || [];
  const inStock = inv.filter(i => i.in_stock);

  // Cup is always available; cones depend on Supplies inventory
  const vessels = ['Cup'];
  if (inStock.some(i => i.category === 'Supplies' && i.name.toLowerCase().includes('sugar'))) vessels.push('Sugar Cone');
  if (inStock.some(i => i.category === 'Supplies' && i.name.toLowerCase().includes('waffle'))) vessels.push('Waffle Cone');

  res.json({
    vessels,
    flavors:  inStock.filter(i => i.category === 'Flavors').map(i => i.name),
    sauces:   inStock.filter(i => i.category === 'Sauces').map(i => i.name),
    toppings: inStock.filter(i => i.category === 'Toppings').map(i => i.name),
    extras:   inStock.filter(i => i.category === 'Extras').map(i => i.name),
  });
});

// ============================================================
// ORDERS
// (categories removed — flat menu)
// ============================================================
// ORDERS
// ============================================================

app.post('/api/orders', (req, res) => {
  const { user_id, items, notes } = req.body;
  if (!user_id || !items || !items.length) return res.status(400).json({ error: 'Invalid order' });

  const db = readDb();
  const userIdx = db.users.findIndex(u => u.id === parseInt(user_id));
  if (userIdx === -1) return res.status(404).json({ error: 'User not found' });

  const pointsEarned = items.length * 10;
  const settings = db.settings || {};

  let orderTotal = 0;
  for (const item of items) {
    if (!item.is_custom && item.menu_item_id) {
      const menuItem = db.menu_items.find(m => m.id === parseInt(item.menu_item_id));
      orderTotal += menuItem ? (menuItem.price || 0) : 0;
    } else {
      orderTotal += settings.custom_order_price || 0;
    }
  }

  const orderId = nextId(db, 'orders');
  const order = {
    id: orderId,
    user_id: parseInt(user_id),
    points_earned: pointsEarned,
    total: Math.round(orderTotal * 100) / 100,
    status: 'pending',
    notes: (notes || '').trim(),
    created_at: new Date().toISOString()
  };
  db.orders.push(order);

  for (const item of items) {
    const oi = {
      id: nextId(db, 'order_items'),
      order_id: orderId,
      menu_item_id: item.menu_item_id || null,
      item_name: item.name,
      size: item.size || null,
      milk: item.milk || null,
      creamer: item.creamer || null,
      syrups: item.syrups && item.syrups.length ? JSON.stringify(item.syrups) : null,
      extras: item.extras && item.extras.length ? JSON.stringify(item.extras) : null,
      is_custom: item.is_custom ? true : false
    };
    db.order_items.push(oi);
  }

  db.users[userIdx].points += pointsEarned;
  writeDb(db);

  sendOrderNotifications(db, db.users[userIdx], items);

  res.json({
    success: true,
    order_id: orderId,
    points_earned: pointsEarned,
    total_points: db.users[userIdx].points,
    total: order.total
  });
});

app.get('/api/orders', (req, res) => {
  const db = readDb();
  const orders = db.orders
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 100)
    .map(o => {
      const user = db.users.find(u => u.id === o.user_id);
      const items = db.order_items.filter(i => i.order_id === o.id);
      return { ...o, user_name: user ? (user.name || user.first_name) : 'Unknown', items };
    });
  res.json(orders);
});

app.put('/api/orders/:id/status', (req, res) => {
  const db = readDb();
  const idx = db.orders.findIndex(o => o.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  const { status } = req.body;
  if (!['pending', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Status must be pending or completed' });
  }
  db.orders[idx].status = status;
  writeDb(db);
  res.json({ success: true });
});

app.delete('/api/orders/:id', (req, res) => {
  const db = readDb();
  const id = parseInt(req.params.id);
  const idx = db.orders.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });

  // Remove order and its items, refund points
  const order = db.orders[idx];
  const userIdx = db.users.findIndex(u => u.id === order.user_id);
  if (userIdx !== -1) {
    db.users[userIdx].points = Math.max(0, db.users[userIdx].points - (order.points_earned || 0));
  }
  db.order_items = (db.order_items || []).filter(oi => oi.order_id !== id);
  db.reviews = (db.reviews || []).filter(r => r.order_id !== id);
  db.orders.splice(idx, 1);
  writeDb(db);
  res.json({ success: true });
});

// ============================================================
// ADMIN
// ============================================================

app.get('/api/admin/stats', (req, res) => {
  const db = readDb();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const allOrders     = db.orders;
  const todayOrders   = allOrders.filter(o => o.created_at >= todayIso);
  const pendingOrders = allOrders.filter(o => o.status === 'pending');
  const doneOrders    = allOrders.filter(o => o.status === 'completed');

  const totalRevenue = allOrders.reduce((s, o) => s + (o.total || 0), 0);
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);

  const reviews = db.reviews || [];
  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  res.json({
    total_revenue:    Math.round(totalRevenue * 100) / 100,
    today_revenue:    Math.round(todayRevenue * 100) / 100,
    pending_count:    pendingOrders.length,
    completed_count:  doneOrders.length,
    total_orders:     allOrders.length,
    today_orders:     todayOrders.length,
    review_count:     reviews.length,
    avg_rating:       avgRating
  });
});

app.get('/api/admin/users', (req, res) => {
  const db = readDb();
  const users = db.users.map(u => ({
    ...userPublic(u),
    order_count: db.orders.filter(o => o.user_id === u.id).length
  })).sort((a, b) => b.points - a.points);
  res.json(users);
});

app.put('/api/admin/users/:id', (req, res) => {
  const db = readDb();
  const idx = db.users.findIndex(u => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  const { is_admin, points, first_name, last_name, username, password } = req.body;

  if (is_admin !== undefined) db.users[idx].is_admin = Boolean(is_admin);
  if (points   !== undefined) db.users[idx].points   = parseInt(points);

  if (first_name !== undefined) {
    db.users[idx].first_name = first_name.trim();
    db.users[idx].name = first_name.trim() + (db.users[idx].last_name ? ` ${db.users[idx].last_name}` : '');
  }
  if (last_name !== undefined) {
    db.users[idx].last_name = last_name.trim();
    db.users[idx].name = (db.users[idx].first_name || '') + (last_name.trim() ? ` ${last_name.trim()}` : '');
  }
  if (username !== undefined) {
    const uname = username.trim().toLowerCase();
    if (!uname) return res.status(400).json({ error: 'Username cannot be empty' });
    const conflict = db.users.find((u, i) => i !== idx && u.username && u.username.toLowerCase() === uname);
    if (conflict) return res.status(409).json({ error: 'Username already taken' });
    db.users[idx].username = uname;
  }
  if (password !== undefined && password.trim()) {
    if (!/^\d{4}$/.test(password.trim())) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    db.users[idx].password = password.trim();
  }

  writeDb(db);
  res.json({ success: true, user: userPublic(db.users[idx]) });
});

app.delete('/api/admin/users/:id', (req, res) => {
  const db = readDb();
  const idx = db.users.findIndex(u => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  db.users.splice(idx, 1);
  writeDb(db);
  res.json({ success: true });
});

// ============================================================
// INVENTORY
// ============================================================

app.get('/api/inventory', (req, res) => {
  const db = readDb();
  const items = db.inventory || [];
  const grouped = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }
  res.json({ items, grouped });
});

app.post('/api/inventory', (req, res) => {
  const { name, category } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const db = readDb();
  db.inventory = db.inventory || [];
  const item = {
    id: nextId(db, 'inventory'),
    name: name.trim(),
    category: (category || 'Other').trim(),
    in_stock: true
  };
  db.inventory.push(item);
  writeDb(db);
  res.json(item);
});

app.put('/api/inventory/:id', (req, res) => {
  const db = readDb();
  db.inventory = db.inventory || [];
  const idx = db.inventory.findIndex(i => i.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Inventory item not found' });
  const { in_stock, name, category } = req.body;
  if (in_stock  !== undefined) db.inventory[idx].in_stock  = Boolean(in_stock);
  if (name      !== undefined) db.inventory[idx].name      = name.trim();
  if (category  !== undefined) db.inventory[idx].category  = category.trim();
  writeDb(db);
  res.json({ success: true });
});

app.delete('/api/inventory/:id', (req, res) => {
  const db = readDb();
  db.inventory = (db.inventory || []).filter(i => i.id !== parseInt(req.params.id));
  writeDb(db);
  res.json({ success: true });
});

// ============================================================
// REWARDS
// ============================================================

app.get('/api/rewards', (req, res) => {
  const db = readDb();
  res.json((db.rewards || []).filter(r => r.is_available));
});

app.get('/api/rewards/all', (req, res) => {
  const db = readDb();
  res.json(db.rewards || []);
});

app.post('/api/rewards', (req, res) => {
  const { name, emoji, description, points_cost } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const db = readDb();
  db.rewards = db.rewards || [];
  const reward = {
    id: nextId(db, 'rewards'),
    name: name.trim(),
    emoji: (emoji || '🎁').trim(),
    description: (description || '').trim(),
    points_cost: Math.max(0, parseInt(points_cost) || 0),
    is_available: true
  };
  db.rewards.push(reward);
  writeDb(db);
  res.json(reward);
});

app.put('/api/rewards/:id', (req, res) => {
  const db = readDb();
  db.rewards = db.rewards || [];
  const idx = db.rewards.findIndex(r => r.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Reward not found' });
  const { name, emoji, description, points_cost, is_available } = req.body;
  if (name         !== undefined) db.rewards[idx].name         = name.trim();
  if (emoji        !== undefined) db.rewards[idx].emoji        = emoji.trim();
  if (description  !== undefined) db.rewards[idx].description  = description.trim();
  if (points_cost  !== undefined) db.rewards[idx].points_cost  = Math.max(0, parseInt(points_cost) || 0);
  if (is_available !== undefined) db.rewards[idx].is_available = Boolean(is_available);
  writeDb(db);
  res.json({ success: true });
});

app.delete('/api/rewards/:id', (req, res) => {
  const db = readDb();
  db.rewards = (db.rewards || []).filter(r => r.id !== parseInt(req.params.id));
  writeDb(db);
  res.json({ success: true });
});

app.post('/api/rewards/:id/redeem', (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  const db = readDb();
  const reward = (db.rewards || []).find(r => r.id === parseInt(req.params.id));
  if (!reward)              return res.status(404).json({ error: 'Reward not found' });
  if (!reward.is_available) return res.status(400).json({ error: 'Reward is not available' });

  const userIdx = db.users.findIndex(u => u.id === parseInt(user_id));
  if (userIdx === -1) return res.status(404).json({ error: 'User not found' });

  const user = db.users[userIdx];
  if (user.points < reward.points_cost) {
    return res.status(400).json({
      error: `Not enough sprinkles! You need ${reward.points_cost} but only have ${user.points}.`
    });
  }

  db.users[userIdx].points -= reward.points_cost;
  db.redemptions = db.redemptions || [];
  db.redemptions.push({
    id: nextId(db, 'redemptions'),
    user_id: parseInt(user_id),
    reward_id: reward.id,
    reward_name: reward.name,
    reward_emoji: reward.emoji,
    points_spent: reward.points_cost,
    status: 'pending',
    created_at: new Date().toISOString()
  });

  writeDb(db);
  res.json({ success: true, new_points: db.users[userIdx].points, reward });
});

// ============================================================
// REVIEWS
// ============================================================

app.post('/api/reviews', (req, res) => {
  const { order_id, user_id, rating, comment } = req.body;
  if (!order_id || !user_id || !rating) return res.status(400).json({ error: 'order_id, user_id, and rating are required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

  const db = readDb();
  const order = db.orders.find(o => o.id === parseInt(order_id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.user_id !== parseInt(user_id)) return res.status(403).json({ error: 'Not your order' });

  const existing = (db.reviews || []).find(r => r.order_id === parseInt(order_id));
  if (existing) return res.status(409).json({ error: 'This order already has a review' });

  db.reviews = db.reviews || [];
  const review = {
    id: nextId(db, 'reviews'),
    order_id: parseInt(order_id),
    user_id: parseInt(user_id),
    rating: parseInt(rating),
    comment: (comment || '').trim(),
    created_at: new Date().toISOString()
  };
  db.reviews.push(review);
  writeDb(db);
  res.json({ success: true, review });
});

app.get('/api/users/:id/unreviewed-orders', (req, res) => {
  const db = readDb();
  const userId = parseInt(req.params.id);
  const reviewedOrderIds = new Set((db.reviews || []).filter(r => r.user_id === userId).map(r => r.order_id));
  const unreviewed = db.orders
    .filter(o => o.user_id === userId && !reviewedOrderIds.has(o.id))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(o => {
      const items = (db.order_items || []).filter(i => i.order_id === o.id);
      return { ...o, items };
    });
  res.json(unreviewed);
});

app.get('/api/admin/reviews', (req, res) => {
  const db = readDb();
  const reviews = (db.reviews || [])
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(r => {
      const user = db.users.find(u => u.id === r.user_id);
      const items = (db.order_items || []).filter(i => i.order_id === r.order_id);
      return {
        ...r,
        user_name: user ? (user.first_name || user.name) : 'Unknown',
        items
      };
    });
  res.json(reviews);
});

app.delete('/api/admin/reviews/:id', (req, res) => {
  const db = readDb();
  const idx = (db.reviews || []).findIndex(r => r.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Review not found' });
  db.reviews.splice(idx, 1);
  writeDb(db);
  res.json({ success: true });
});

// ============================================================
// SETTINGS
// ============================================================

app.get('/api/settings', (req, res) => {
  const db = readDb();
  const s = db.settings || {};
  res.json({
    custom_order_price: s.custom_order_price || 0,
    twilio_account_sid: s.twilio_account_sid || '',
    twilio_auth_token:  s.twilio_auth_token  ? '***' : '',
    twilio_from_number: s.twilio_from_number || '',
    twilio_to_number:   s.twilio_to_number   || '',
    twilio_enabled:     s.twilio_enabled     || false
  });
});

app.put('/api/settings', (req, res) => {
  const db = readDb();
  if (!db.settings) db.settings = {};
  const s = db.settings;

  const {
    custom_order_price,
    twilio_account_sid, twilio_auth_token,
    twilio_from_number, twilio_to_number,
    twilio_enabled
  } = req.body;

  if (custom_order_price !== undefined) s.custom_order_price = Math.round((parseFloat(custom_order_price) || 0) * 100) / 100;
  if (twilio_account_sid !== undefined) s.twilio_account_sid = (twilio_account_sid || '').trim();
  if (twilio_auth_token  !== undefined && twilio_auth_token !== '***') s.twilio_auth_token = (twilio_auth_token || '').trim();
  if (twilio_from_number !== undefined) s.twilio_from_number = (twilio_from_number || '').trim();
  if (twilio_to_number   !== undefined) s.twilio_to_number   = (twilio_to_number   || '').trim();
  if (twilio_enabled     !== undefined) s.twilio_enabled     = Boolean(twilio_enabled);

  writeDb(db);
  res.json({ success: true });
});

// ============================================================
// MINI GAMES
// ============================================================

// Submit a game score and award sprinkles
app.post('/api/games/score', (req, res) => {
  const { user_id, game, score, sprinkles_earned } = req.body;
  if (!user_id || !game || score === undefined) {
    return res.status(400).json({ error: 'user_id, game, and score are required' });
  }

  const db = readDb();
  const userIdx = db.users.findIndex(u => u.id === user_id);
  if (userIdx < 0) return res.status(404).json({ error: 'User not found' });

  const earned = Math.max(0, Math.min(3, sprinkles_earned || 0));
  db.users[userIdx].points += earned;

  const id = ++db._sequences.high_scores;
  const record = { id, user_id, game, score, sprinkles_earned: earned, created_at: new Date().toISOString() };
  db.high_scores.push(record);

  // Check if personal/global best
  const userScores = db.high_scores.filter(s => s.user_id === user_id && s.game === game);
  const allScores  = db.high_scores.filter(s => s.game === game);
  const isPersonalBest = userScores.every(s => score >= s.score);
  const isGlobalBest   = allScores.every(s => score >= s.score);

  writeDb(db);
  res.json({
    success: true,
    new_points: db.users[userIdx].points,
    high_score_id: id,
    is_personal_best: isPersonalBest,
    is_global_best: isGlobalBest
  });
});

// Get top 20 leaderboard for a game
app.get('/api/games/leaderboard/:game', (req, res) => {
  const db = readDb();
  const game = req.params.game;

  // Get best score per user
  const bestByUser = {};
  for (const s of db.high_scores.filter(h => h.game === game)) {
    if (!bestByUser[s.user_id] || s.score > bestByUser[s.user_id].score) {
      bestByUser[s.user_id] = s;
    }
  }

  const sorted = Object.values(bestByUser)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  const leaderboard = sorted.map((s, i) => {
    const user = db.users.find(u => u.id === s.user_id);
    return {
      rank: i + 1,
      user_id: s.user_id,
      user_name: user ? user.name : 'Unknown',
      score: s.score,
      created_at: s.created_at
    };
  });

  res.json(leaderboard);
});

// Get a user's personal best for a game
app.get('/api/games/personal-best/:game/:userId', (req, res) => {
  const db = readDb();
  const game = req.params.game;
  const userId = parseInt(req.params.userId);

  const userScores = db.high_scores.filter(s => s.user_id === userId && s.game === game);
  if (!userScores.length) return res.json({ score: null });

  const best = userScores.reduce((a, b) => a.score > b.score ? a : b);
  res.json({ score: best.score, created_at: best.created_at });
});

// ============================================================
// SPA FALLBACK
// ============================================================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// START
// ============================================================

app.listen(PORT, '0.0.0.0', () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let localIp = 'your-pc-ip';
  for (const iface of Object.values(nets)) {
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) { localIp = alias.address; break; }
    }
    if (localIp !== 'your-pc-ip') break;
  }

  console.log('\n🍦 =====================================');
  console.log('   Swirl Ice Cream is open for business!');
  console.log('=======================================');
  console.log(`\n  Local:    http://localhost:${PORT}`);
  console.log(`  Network:  http://${localIp}:${PORT}`);
  console.log('\n  Admin login: sofia / PIN: 1234');
  console.log('  (All default users start with PIN 1234)');
  console.log('=======================================\n');
});
