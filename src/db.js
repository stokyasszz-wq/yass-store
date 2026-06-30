const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function readJSON(filename) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`[DB] Error reading ${filename}:`, err.message);
    return null;
  }
}

function writeJSON(filename, data) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`[DB] Error writing ${filename}:`, err.message);
    return false;
  }
}

function _itemToProduct(item) {
  return {
    ...item,
    gameSlug: item.categoryId,
    game: item.categoryId === 'freefire'
      ? 'Free Fire'
      : item.categoryId === 'mobilelegend'
        ? 'Mobile Legend'
        : item.categoryId,
  };
}

// ── Settings ──────────────────────────────────────────────────────────────────
function getSettings() {
  return readJSON('settings.json') || { robuxRate: 145, antiSpam: true, maxOrderPerUser: 5 };
}
function saveSettings(settings) { return writeJSON('settings.json', settings); }
function updateSetting(key, value) {
  const s = getSettings(); s[key] = value; return saveSettings(s);
}

// ── Items ─────────────────────────────────────────────────────────────────────
function getItems() { return readJSON('items.json') || []; }
function getItemsByCategory(categoryId) { return getItems().filter(i => i.categoryId === categoryId); }
function getItemById(id) { return getItems().find(i => i.id === id) || null; }
function addItem(item) {
  const items = getItems();
  if (items.find(i => i.id === item.id)) return false;
  items.push({ defaultStock: 0, ...item });
  const ok = writeJSON('items.json', items);
  if (ok) {
    const stock = getRawStock();
    if (!(item.id in stock)) { stock[item.id] = item.defaultStock ?? item.stock ?? 0; writeJSON('stock.json', stock); }
  }
  return ok;
}
function removeItem(id) {
  const items = getItems().filter(i => i.id !== id);
  writeJSON('items.json', items);
  const stock = getRawStock(); delete stock[id]; return writeJSON('stock.json', stock);
}
function updateItem(id, updates) {
  const items = getItems();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return false;
  items[idx] = { ...items[idx], ...updates };
  return writeJSON('items.json', items);
}

// ── Products (alias with gameSlug) ────────────────────────────────────────────
function getProducts() { return getItems().map(_itemToProduct); }
function getProductsByGame(gameSlug) { return getItemsByCategory(gameSlug).map(_itemToProduct); }
function getProductById(id) { const item = getItemById(id); return item ? _itemToProduct(item) : null; }

// ── Categories ────────────────────────────────────────────────────────────────
function getCategories() { return readJSON('categories.json') || []; }
function getCategoryById(id) { return getCategories().find(c => c.id === id) || null; }
function isCategoryOpen(categoryId) { const cat = getCategoryById(categoryId); return cat ? cat.isOpen : true; }
function updateCategory(id, updates) {
  const cats = getCategories();
  const idx = cats.findIndex(c => c.id === id);
  if (idx === -1) return false;
  cats[idx] = { ...cats[idx], ...updates }; return writeJSON('categories.json', cats);
}
function addCategory(category) {
  const cats = getCategories();
  if (cats.find(c => c.id === category.id)) return false;
  cats.push({ isOpen: true, ...category }); return writeJSON('categories.json', cats);
}
function deleteCategory(id) { return writeJSON('categories.json', getCategories().filter(c => c.id !== id)); }

// ── Stock ─────────────────────────────────────────────────────────────────────
function getRawStock() { return readJSON('stock.json') || {}; }
function getStock() {
  const stock = getRawStock(); const items = getItems(); let changed = false;
  for (const item of items) { if (!(item.id in stock)) { stock[item.id] = item.defaultStock ?? 0; changed = true; } }
  if (changed) writeJSON('stock.json', stock); return stock;
}
function setStock(stock) { return writeJSON('stock.json', stock); }

// ── Store config ──────────────────────────────────────────────────────────────
function getStoreConfig() { return readJSON('store.json') || { channelId: null, messageId: null, lastUpdated: null }; }
function setStoreConfig(data) { return writeJSON('store.json', data); }

// ── Orders ────────────────────────────────────────────────────────────────────
function getOrders() { return readJSON('orders.json') || []; }
function saveOrders(orders) { return writeJSON('orders.json', orders); }
function getNextInvoiceNumber() {
  let inv = readJSON('invoice.json') || { counter: 0 };
  inv.counter = inv.counter + 1; writeJSON('invoice.json', inv); return inv.counter;
}
function createOrder(data) {
  const orders = getOrders();
  const num = getNextInvoiceNumber();
  const invoice = `YS-${String(num).padStart(4, '0')}`;
  const order = {
    invoice, userId: data.userId, username: data.username,
    gameSlug: data.gameSlug, itemId: data.itemId, itemName: data.itemName,
    price: data.price, items: data.items || null, isCart: data.isCart || false,
    totalPrice: data.totalPrice || data.price,
    voucherCode: data.voucherCode || null, discount: data.discount || 0,
    status: 'ORDER CREATED', paymentProofURL: null, claimedBy: null, channelId: null,
    date: new Date().toISOString(),
    log: [{ event: 'ORDER CREATED', by: data.username, at: new Date().toISOString() }],
  };
  orders.push(order); saveOrders(orders); return order;
}
function updateOrder(invoice, updates) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.invoice === invoice);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...updates }; saveOrders(orders); return orders[idx];
}
function appendOrderLog(invoice, event, by) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.invoice === invoice);
  if (idx === -1) return null;
  if (!Array.isArray(orders[idx].log)) orders[idx].log = [];
  orders[idx].log.push({ event, by, at: new Date().toISOString() });
  saveOrders(orders); return orders[idx];
}
function addOrderNote(invoice, note, by) {
  const orders = getOrders();
  const idx = orders.findIndex(o => o.invoice === invoice);
  if (idx === -1) return null;
  if (!Array.isArray(orders[idx].notes)) orders[idx].notes = [];
  orders[idx].notes.push({ note, by, at: new Date().toISOString() });
  saveOrders(orders); return orders[idx];
}
function getOrderByChannel(channelId) { return getOrders().find(o => o.channelId === channelId) || null; }
function getOrderByInvoice(invoice) { return getOrders().find(o => o.invoice === invoice) || null; }
function getUserActiveOrder(userId) {
  return getOrders().find(o =>
    o.userId === userId && !['DONE', 'VERIFIED', 'REFUNDED', 'CANCELLED'].includes(o.status)
  ) || null;
}
function resetData() {
  const items = getItems(); const defaultStock = {};
  items.forEach(p => { defaultStock[p.id] = p.defaultStock ?? 99; });
  writeJSON('stock.json', defaultStock); writeJSON('orders.json', []); writeJSON('invoice.json', { counter: 0 });
}

// ── Cart ──────────────────────────────────────────────────────────────────────
function getCart(userId) { return (readJSON('cart.json') || {})[userId] || []; }
function setCart(userId, items) {
  const carts = readJSON('cart.json') || {};
  if (!items || items.length === 0) delete carts[userId]; else carts[userId] = items;
  return writeJSON('cart.json', carts);
}
function addToCart(userId, item) {
  const cart = getCart(userId);
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
    existing.price = item.price;
    existing.type = item.type;
    existing.robuxAmount = item.robuxAmount;
    existing.categoryId = item.categoryId;
    existing.name = item.name;
    existing.emoji = item.emoji;
  } else cart.push({ ...item, quantity: 1 });
  return setCart(userId, cart);
}
function removeFromCart(userId, itemId) { return setCart(userId, getCart(userId).filter(i => i.id !== itemId)); }
function clearCart(userId) {
  const carts = readJSON('cart.json') || {}; delete carts[userId]; return writeJSON('cart.json', carts);
}
function getAllCarts() { return readJSON('cart.json') || {}; }

// ── Bans ──────────────────────────────────────────────────────────────────────
function getBans() { return readJSON('bans.json') || {}; }
function addBan(userId, reason, bannedBy) {
  const bans = getBans();
  bans[userId] = { reason, bannedBy, date: new Date().toISOString() };
  return writeJSON('bans.json', bans);
}
function removeBan(userId) {
  const bans = getBans(); delete bans[userId]; return writeJSON('bans.json', bans);
}
function isBanned(userId) { return userId in getBans(); }

// ── Reviews ───────────────────────────────────────────────────────────────────
function getReviews() { return readJSON('reviews.json') || []; }
function addReview(review) {
  const reviews = getReviews(); reviews.push(review); return writeJSON('reviews.json', reviews);
}
function deleteReview(idx) {
  const reviews = getReviews();
  if (idx < 0 || idx >= reviews.length) return false;
  reviews.splice(idx, 1); return writeJSON('reviews.json', reviews);
}
function clearReviews() { return writeJSON('reviews.json', []); }

// ── Maintenance ───────────────────────────────────────────────────────────────
function isMaintenanceMode() { return getSettings().maintenance === true; }
function setMaintenanceMode(val) { return updateSetting('maintenance', val); }

// ── Log Channel ───────────────────────────────────────────────────────────────
function getLogChannelId() { return getSettings().logChannelId || null; }

// ── GiG Rate ─────────────────────────────────────────────────────────────────
function getGigRate() { return getSettings().gigRate || 86; }

function getItemEffectivePrice(item) {
  if (item.type === 'gig') return (item.robuxAmount || 0) * getGigRate();
  return item.price || 0;
}

// ── Vouchers ─────────────────────────────────────────────────────────────────
function getVouchers() { return readJSON('vouchers.json') || []; }
function getVoucherByCode(code) {
  return getVouchers().find(v => v.code.toUpperCase() === code.toUpperCase()) || null;
}
function addVoucher(v) { const vs = getVouchers(); vs.push(v); return writeJSON('vouchers.json', vs); }
function updateVoucher(code, updates) {
  const vs = getVouchers();
  const idx = vs.findIndex(v => v.code.toUpperCase() === code.toUpperCase());
  if (idx === -1) return false;
  vs[idx] = { ...vs[idx], ...updates }; return writeJSON('vouchers.json', vs);
}
function deleteVoucher(code) {
  return writeJSON('vouchers.json', getVouchers().filter(v => v.code.toUpperCase() !== code.toUpperCase()));
}
function useVoucher(code, userId) {
  const vs = getVouchers();
  const idx = vs.findIndex(v => v.code.toUpperCase() === code.toUpperCase());
  if (idx === -1) return null;
  vs[idx].usedCount = (vs[idx].usedCount || 0) + 1;
  vs[idx].usedBy = [...(vs[idx].usedBy || []), { userId, at: new Date().toISOString() }];
  writeJSON('vouchers.json', vs);
  return vs[idx];
}
function validateVoucher(code) {
  const v = getVoucherByCode(code);
  if (!v || !v.active) return { ok: false, reason: 'Voucher tidak ditemukan atau tidak aktif.' };
  if (v.expiry && new Date(v.expiry) < new Date()) return { ok: false, reason: 'Voucher sudah kadaluarsa.' };
  if (v.maxUses > 0 && v.usedCount >= v.maxUses) return { ok: false, reason: 'Voucher sudah habis digunakan.' };
  return { ok: true, voucher: v };
}
function applyVoucherDiscount(voucher, price) {
  if (!voucher) return { finalPrice: price, discount: 0 };
  let discount = 0;
  if (voucher.type === 'percent') discount = Math.floor(price * voucher.value / 100);
  else discount = Math.min(voucher.value, price);
  return { finalPrice: Math.max(0, price - discount), discount };
}

// ── Analytics ─────────────────────────────────────────────────────────────────
function getDailyRevenue(days) {
  const orders = getOrders();
  const result = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    result[key] = 0;
  }
  for (const o of orders) {
    if (!['DONE', 'VERIFIED'].includes(o.status)) continue;
    const key = o.date?.split('T')[0];
    if (key && key in result) result[key] += (o.totalPrice || o.price || 0);
  }
  return result;
}
function getDailyOrders(days) {
  const orders = getOrders();
  const result = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    result[key] = 0;
  }
  for (const o of orders) {
    const key = o.date?.split('T')[0];
    if (key && key in result) result[key]++;
  }
  return result;
}
function getTopItems(limit) {
  const orders = getOrders().filter(o => ['DONE', 'VERIFIED'].includes(o.status));
  const map = {};
  for (const o of orders) {
    const id = o.itemId || o.itemName || 'unknown';
    if (!map[id]) map[id] = { id, name: o.itemName || id, revenue: 0, count: 0 };
    map[id].revenue += (o.totalPrice || o.price || 0);
    map[id].count++;
  }
  return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, limit || 10);
}
function getTopBuyersData(limit) {
  const orders = getOrders().filter(o => ['DONE', 'VERIFIED'].includes(o.status));
  const map = {};
  for (const o of orders) {
    if (!map[o.userId]) map[o.userId] = { userId: o.userId, username: o.username, revenue: 0, count: 0 };
    map[o.userId].revenue += (o.totalPrice || o.price || 0);
    map[o.userId].count++;
  }
  return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, limit || 10);
}
function getStatusDistribution() {
  const orders = getOrders();
  const dist = {};
  for (const o of orders) dist[o.status] = (dist[o.status] || 0) + 1;
  return dist;
}
function getCategoryRevenue() {
  const orders = getOrders().filter(o => ['DONE', 'VERIFIED'].includes(o.status));
  const map = {};
  for (const o of orders) {
    const cat = o.gameSlug || 'unknown';
    map[cat] = (map[cat] || 0) + (o.totalPrice || o.price || 0);
  }
  return map;
}
function getUserStats(userId) {
  const orders = getOrders().filter(o => o.userId === userId);
  const done = orders.filter(o => ['DONE', 'VERIFIED'].includes(o.status));
  return {
    totalOrders: orders.length,
    doneOrders: done.length,
    totalSpent: done.reduce((s, o) => s + (o.totalPrice || o.price || 0), 0),
    lastOrder: orders.sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null,
  };
}

module.exports = {
  getSettings, saveSettings, updateSetting, getGigRate, getItemEffectivePrice,
  getItems, getItemsByCategory, getItemById, addItem, removeItem, updateItem,
  getProducts, getProductsByGame, getProductById,
  getCategories, getCategoryById, isCategoryOpen, updateCategory, addCategory, deleteCategory,
  getRawStock, getStock, setStock,
  getStoreConfig, setStoreConfig,
  getOrders, saveOrders, createOrder, updateOrder, appendOrderLog, addOrderNote,
  getOrderByChannel, getOrderByInvoice, getUserActiveOrder, resetData,
  getCart, setCart, addToCart, removeFromCart, clearCart, getAllCarts,
  getBans, addBan, removeBan, isBanned,
  getReviews, addReview, deleteReview, clearReviews,
  isMaintenanceMode, setMaintenanceMode,
  getLogChannelId,
  getVouchers, getVoucherByCode, addVoucher, updateVoucher, deleteVoucher,
  useVoucher, validateVoucher, applyVoucherDiscount,
  getDailyRevenue, getDailyOrders, getTopItems, getTopBuyersData,
  getStatusDistribution, getCategoryRevenue, getUserStats,
};
