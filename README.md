# Swirl 🍦

A fun, mobile-first ice cream ordering web app for the kids. Browse a menu, customize treats, place orders, and earn sprinkles. The scooper gets a desktop notification (and optionally a text) when an order comes in.

---

## The Idea

Built for two 7-year-olds who want their own magical ice cream shop experience. They browse the menu, build their own custom scoop, and rack up sprinkles. The app is the ordering kiosk; you're the scooper.

---

## How to Run It

```bash
cd "Desktop/Swirl"
npm start
```

Server starts at:
- **Local:** http://localhost:3001
- **Network (phone):** http://192.168.x.x:3001 (IP printed in console)

**Prerequisites:**
- NordLayer VPN must be disconnected (or local network bypass enabled) — otherwise phones can't reach the server
- Both PC and phone must be on the same WiFi network

---

## Tech Stack

| Layer | Tech |
|---|---|
| Server | Node.js + Express |
| Database | JSON flat file (`data/db.json`) |
| Notifications | node-notifier (Windows toast) + Twilio SMS (optional) |
| Frontend | Vanilla JS SPA (no framework) |
| Fonts | Google Fonts — Fredoka (headings) + Nunito (body) |
| Hosting | Local network only |

Deliberately kept light — no build step, no bundler, no TypeScript. Just `npm start` and go.

---

## Project Structure

```
Swirl/
├── server.js              # Express server + all API routes + notifications
├── package.json
├── data/
│   └── db.json            # All persistent data (auto-created on first run)
└── public/
    ├── index.html         # SPA shell
    ├── style.css          # All styles — mobile-first + admin portal
    └── app.js             # All frontend logic — views, state, API calls
```

---

## Authentication

Users now log in with a **username + 4-digit PIN** instead of picking from a list.

**Sign Up:** First name, last name, username, PIN (4 digits)

**Default accounts (seeded on first run):**

| Username | PIN  | Admin? |
|----------|------|--------|
| sofia    | 1234 | ✓      |
| maya     | 1234 | —      |
| lily     | 1234 | —      |
| luna     | 1234 | —      |

Change PINs by editing `data/db.json` directly or adding a user management screen.

---

## Admin Portal

Access the admin portal by logging in as an admin user (e.g., `sofia / 1234`), then tapping **Me → Admin Portal**.

The admin portal is designed for **iPad landscape** (horizontal layout) with a sidebar and main content area.

### Sidebar

Always visible — shows:
- Navigation (Orders, Menu, Users, Settings)
- Live stats: today's revenue, all-time revenue, pending orders, total orders

### Orders Tab

- Filter by **All / Pending / Completed**
- Revenue stats at the top: today's revenue, pending revenue, all-time total
- Each order card shows: customer name, timestamp, item details, notes, sprinkles earned, order total
- **Mark Done** button on each card — turns green when completed, dims the card
- Orders default to showing **Pending** first

### Menu Tab

- All treats listed by category with their price and visibility status
- **Add Treat** — opens an inline form with name, description, emoji, price, and all default customizations
- **Edit** — inline edit form for any treat (same fields + price)
- **Hide / Show** — toggle visibility without deleting
- **Del** — delete a treat permanently

### Inventory Tab

Track what ingredients are in or out of stock.

- All ingredients listed by category (Flavors, Sauces, Toppings, Extras, Supplies)
- Toggle **In Stock / Out of Stock** per ingredient — one click
- Menu items linked to out-of-stock ingredients automatically show **Sold Out** on the customer menu
- **Add Ingredient** — add new items with name and category
- **Del** — remove an ingredient permanently

### Users Tab

- All users listed by sprinkle count (highest first)
- Shows username, order count, sprinkle balance, admin status
- **Edit** — inline form to update first/last name, username, PIN, and sprinkles
- **Make Admin / Revoke Admin** — toggle admin access
- **Del** — permanently delete a user

### Rewards Tab (Admin)

Manage the rewards catalog that users can redeem with sprinkles.

- Full list of all rewards (available and hidden)
- **Add Reward** — name, emoji, description, and points cost
- **Edit** — inline edit form for any reward
- **Hide / Show** — toggle visibility without deleting
- **Del** — remove a reward permanently

### Settings Tab

#### Pricing

Set a price for each menu item in the Menu tab. Use `$0.00` for anything free.

**Custom Order Price** — the default price applied to orders built with "Create Your Own."  
To set: Settings tab → Custom Order Price → Save.

Prices are tracked for admin revenue reporting only. Customers see no prices — everything is still ordered freely (cash at the counter).

#### Twilio SMS

Fill in credentials to enable text notifications when orders arrive:

| Field | Description |
|---|---|
| Account SID | From your Twilio console |
| Auth Token | From your Twilio console |
| From Number | Your Twilio phone number |
| To Number | Your phone (where texts go) |
| Enable SMS | Toggle on/off without clearing credentials |

**To activate SMS:**
1. Get free Twilio credentials at twilio.com
2. Fill in all fields in Admin → Settings → Twilio
3. Check "Enable SMS notifications" and save
4. Run `npm install twilio` in the Swirl folder

The framework is already wired in — once credentials are set and the package is installed, texts will fire automatically with every new order.

---

## Pricing System

- Prices live on each menu item (`price` field, default `$0`)
- Custom orders use the `custom_order_price` setting (default `$2.50`)
- Every order records its `total` (sum of item prices)
- Revenue is tracked over all orders and shown in admin stats
- **No paywall** — ordering always works regardless of price; everything is cash

---

## Architecture

### Backend (`server.js`)

Single-file Express server. DB helpers read/write `data/db.json` synchronously.

**Key endpoints added:**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticate with username + PIN |
| PUT | `/api/orders/:id/status` | Mark order pending or completed |
| GET | `/api/admin/stats` | Revenue totals, order counts |
| GET | `/api/settings` | Current settings (Twilio, custom price) |
| PUT | `/api/settings` | Update settings |

**Full API reference:**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login `{ username, password }` |
| GET | `/api/users` | All users |
| POST | `/api/users` | Sign up `{ first_name, last_name, username, password }` |
| GET | `/api/users/:id` | Single user |
| GET | `/api/menu` | Available menu items |
| GET | `/api/menu/all` | All menu items including hidden |
| POST | `/api/menu` | Add treat (includes `price`) |
| PUT | `/api/menu/:id` | Update treat (includes `price`) |
| DELETE | `/api/menu/:id` | Delete treat |
| GET | `/api/customizations` | Vessels, flavors, sauces, toppings, extras |
| GET | `/api/categories` | All categories |
| POST | `/api/orders` | Place order → fires notifications + awards sprinkles |
| GET | `/api/orders` | Last 100 orders with items |
| PUT | `/api/orders/:id/status` | Update order status |
| GET | `/api/admin/stats` | Revenue and order stats |
| GET | `/api/admin/users` | Users with order counts |
| PUT | `/api/admin/users/:id` | Edit user sprinkles or admin status |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |

### Frontend (`app.js`)

Single-page app. Key globals: `currentUser`, `cart`, `menuData`, `customizations`.

**Views:**
- `login` — username + PIN form
- `signup` — first name, last name, username, PIN
- `menu` — grouped treat list with search
- `treat` — treat customization wizard
- `create` — 5-step Create Your Own
- `cart` — review + place order
- `confirmation` — order placed screen
- `profile` — user stats + admin access button
- `admin` — full admin portal (full-width, iPad layout)

---

## Database Schema (`db.json`)

```json
{
  "users": [
    {
      "id": 1,
      "first_name": "Sofia",
      "last_name": "",
      "username": "sofia",
      "password": "1234",
      "name": "Sofia",
      "points": 150,
      "is_admin": true
    }
  ],
  "menu_items": [
    {
      "id": 1,
      "category_id": 1,
      "name": "Pink Princess",
      "emoji": "🌸",
      "price": 3.50,
      "is_available": true,
      ...
    }
  ],
  "orders": [
    {
      "id": 1,
      "user_id": 2,
      "points_earned": 20,
      "total": 7.50,
      "status": "pending",
      "notes": "",
      "created_at": "..."
    }
  ],
  "settings": {
    "custom_order_price": 2.50,
    "twilio_account_sid": "",
    "twilio_auth_token": "",
    "twilio_from_number": "",
    "twilio_to_number": "",
    "twilio_enabled": false
  }
}
```

The DB migrates automatically — existing data gets new fields added without losing anything.

---

## Sprinkles System

- Earn 10 sprinkles per item in an order
- Shown on login screen, home screen, and profile
- Admin can manually edit any user's balance from the Users tab
- **Rewards Shop** — users tap "🎁 Rewards Shop" on their profile to browse and redeem rewards

---

## User Flow

```
Login screen
  ├── Enter username + PIN → Home (menu)
  └── "I'm new here" → Sign up (first/last name, username, PIN) → Home

Home (menu)
  ├── Treats grouped by category with search bar
  ├── Tap treat → Customize → Add to cart
  ├── Create tab → 5-step wizard → Add to cart
  ├── Cart tab → Review → Add notes → Place Order → Confirmation
  └── Me tab → Profile → Admin Portal (admin users only)

Admin Portal (iPad landscape)
  ├── Orders — view all, filter, mark done, see totals
  ├── Menu — add/edit/hide/delete treats + set prices
  ├── Users — manage sprinkles and admin status
  └── Settings — custom order price + Twilio SMS config
```

---

## Design

- **Palette:** Hot pink (`#FF4FAF`) primary, lavender (`#C084FC`) secondary, pale pink background, gold for sprinkles
- **Admin sidebar:** Deep plum gradient
- **Fonts:** Fredoka (headings), Nunito (body)
- **Customer layout:** Max 430px, mobile-only
- **Admin layout:** Full-width, sidebar + content, optimized for iPad landscape

---

## Public Hosting (Self-Hosted)

To make the app accessible outside your home network without moving it to the cloud:

### Step 1 — Keep the app running with PM2

Without PM2, the server dies when you close the terminal.

```bash
npm install -g pm2
pm2 start server.js --name swirl
pm2 startup    # follow the printed command to auto-start on boot
pm2 save
```

### Step 2 — Expose it publicly with Cloudflare Tunnel

Cloudflare Tunnel punches a secure connection out to Cloudflare's edge — no port forwarding, no exposing your home IP, HTTPS included, free.

```bash
# Install cloudflared (download from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
cloudflared tunnel login
cloudflared tunnel --url http://localhost:3001
```

This gives you a public `https://*.trycloudflare.com` URL. If you own a domain, you can pin a permanent subdomain (still free) through the Cloudflare dashboard.

**To auto-start the tunnel with PM2:**
```bash
pm2 start "cloudflared tunnel --url http://localhost:3001" --name swirl-tunnel
pm2 save
```

### Alternatives

| Method | Cost | Notes |
|---|---|---|
| Cloudflare Tunnel | Free | Best — no IP exposure, HTTPS auto, stable URL with domain |
| ngrok | Free (unstable URL) | Quick to try, but URL changes each restart on free tier |
| Tailscale Funnel | Free | Good if you already use Tailscale |
| Port forwarding | Free | Exposes home IP, ISP may block ports 80/443 |

---

## Known Limitations / Future Work

- **Rewards redemption** — fully implemented; users redeem via Profile → Rewards Shop
- **No order history for users** — users see sprinkles but not past orders
- **No persistent cart** — cart lives in memory, lost on page refresh
- **No HTTPS** — plain HTTP on local network (resolved if using Cloudflare Tunnel)
- **JSON file DB** — great for a handful of kids
- **NordLayer conflict** — VPN must be disconnected for phones to reach the server
- **Twilio** — `npm install twilio` needed before SMS works (intentionally not auto-installed)
