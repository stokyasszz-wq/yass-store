const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');
const config = require('../config');

function analyticsPanelButtons() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dash_back').setLabel('⬅ Back').setStyle(ButtonStyle.Secondary),
  )];
}

async function showAnalytics(interaction) {
  const orders = db.getOrders();
  const allCarts = db.getAllCarts();
  const items = db.getItems();
  const stock = db.getStock();

  const total = orders.length;
  const done = orders.filter(o => ['VERIFIED', 'DONE'].includes(o.status)).length;
  const pending = orders.filter(o => ['ORDER CREATED', 'WAITING PAYMENT', 'PROOF SENT'].includes(o.status)).length;
  const refunded = orders.filter(o => o.status === 'REFUNDED').length;
  const cartOrders = orders.filter(o => o.isCart).length;

  const totalRevenue = orders
    .filter(o => ['VERIFIED', 'DONE'].includes(o.status))
    .reduce((sum, o) => sum + (o.totalPrice || o.price || 0), 0);

  const pendingRevenue = orders
    .filter(o => ['WAITING PAYMENT', 'PROOF SENT'].includes(o.status))
    .reduce((sum, o) => sum + (o.totalPrice || o.price || 0), 0);

  const conversionRate = total > 0 ? ((done / total) * 100).toFixed(1) : '0.0';

  const itemSales = {};
  orders.forEach(o => {
    if (o.isCart && o.items) {
      o.items.forEach(item => {
        if (!itemSales[item.id]) itemSales[item.id] = { count: 0, name: item.name, emoji: item.emoji || '📦' };
        itemSales[item.id].count += (item.quantity || 1);
      });
    } else if (o.itemId) {
      if (!itemSales[o.itemId]) itemSales[o.itemId] = { count: 0, name: o.itemName, emoji: '📦' };
      itemSales[o.itemId].count++;
    }
  });

  const sorted = Object.entries(itemSales)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const topItems = sorted.length > 0
    ? sorted.map(([, v], i) => `\`${i + 1}.\` ${v.emoji} ${v.name} — **${v.count}x**`).join('\n')
    : '*Belum ada penjualan.*';

  const catSales = {};
  items.forEach(item => { catSales[item.categoryId] = (catSales[item.categoryId] || 0); });
  orders.forEach(o => {
    if (o.isCart && o.items) {
      o.items.forEach(item => {
        const dbItem = db.getItemById(item.id);
        if (dbItem) catSales[dbItem.categoryId] = (catSales[dbItem.categoryId] || 0) + 1;
      });
    } else if (o.itemId) {
      const cat = o.gameSlug || o.categoryId || 'other';
      catSales[cat] = (catSales[cat] || 0) + 1;
    }
  });

  const catLines = Object.entries(catSales)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => {
      const cat = db.getCategoryById(k);
      return `${cat ? cat.emoji : '📦'} ${cat ? cat.name : k}: **${v}**`;
    }).join(' ┃ ') || '*Belum ada data.*';

  const activeCartsCount = Object.keys(allCarts).length;
  const lowStockItems = items.filter(i => (stock[i.id] ?? 0) === 0).length;

  const embed = new EmbedBuilder()
    .setColor(config.colors.blurple)
    .setTitle('📊  Analytics PRO Dashboard')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    .addFields(
      { name: '📦 Total Orders',     value: `${total}`,               inline: true },
      { name: '✅ Selesai',           value: `${done}`,                inline: true },
      { name: '⏳ Pending',           value: `${pending}`,             inline: true },
      { name: '💰 Total Revenue',    value: `Rp ${totalRevenue.toLocaleString('id-ID')}`, inline: true },
      { name: '💸 Pending Revenue',  value: `Rp ${pendingRevenue.toLocaleString('id-ID')}`, inline: true },
      { name: '📈 Conversion Rate',  value: `${conversionRate}%`,     inline: true },
      { name: '🛒 Cart Orders',      value: `${cartOrders}`,          inline: true },
      { name: '🛒 Active Carts',     value: `${activeCartsCount}`,    inline: true },
      { name: '🔄 Refunded',         value: `${refunded}`,            inline: true },
      { name: '❌ Out of Stock Items', value: `${lowStockItems} item`, inline: true },
      { name: '📂 Sales by Category', value: catLines,                inline: false },
      { name: '🏆 Top 5 Best Seller', value: topItems,                inline: false },
    )
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: analyticsPanelButtons() });
}

module.exports = { showAnalytics };
