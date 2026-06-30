const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

async function handleStats(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const orders = db.getOrders();
  const stock = db.getStock();
  const items = db.getItems();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const completed = orders.filter(o => ['VERIFIED', 'DONE'].includes(o.status));
  const pending   = orders.filter(o => !['DONE', 'VERIFIED', 'CANCELLED', 'REFUNDED'].includes(o.status));
  const cancelled = orders.filter(o => o.status === 'CANCELLED');

  const revenue = (list) => list.reduce((s, o) => s + (o.totalPrice || o.price || 0), 0);

  const revToday = revenue(completed.filter(o => new Date(o.date) >= todayStart));
  const revWeek  = revenue(completed.filter(o => new Date(o.date) >= weekStart));
  const revMonth = revenue(completed.filter(o => new Date(o.date) >= monthStart));
  const revAll   = revenue(completed);

  const ordersToday = orders.filter(o => new Date(o.date) >= todayStart).length;
  const ordersWeek  = orders.filter(o => new Date(o.date) >= weekStart).length;

  const itemSales = {};
  for (const o of completed) {
    if (o.items && o.items.length > 0) {
      for (const i of o.items) {
        itemSales[i.name] = (itemSales[i.name] || 0) + (i.quantity || 1);
      }
    } else if (o.itemName) {
      itemSales[o.itemName] = (itemSales[o.itemName] || 0) + 1;
    }
  }
  const topItems = Object.entries(itemSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, qty], i) => `${['🥇','🥈','🥉'][i]} **${name}** — ${qty}x terjual`)
    .join('\n') || '_Belum ada data_';

  const lowStock = items
    .filter(i => (stock[i.id] ?? 0) <= 3)
    .map(i => `${i.emoji} ${i.name} — **${stock[i.id] ?? 0}** sisa`)
    .slice(0, 5)
    .join('\n') || '✅ Semua stock aman';

  const successRate = orders.length > 0
    ? ((completed.length / orders.length) * 100).toFixed(1)
    : '0.0';

  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('📊  Yass Store — Stats Dashboard')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    .addFields(
      { name: '💰 Revenue Hari Ini',  value: `**${rp(revToday)}**`,  inline: true },
      { name: '💰 Revenue Minggu Ini',value: `**${rp(revWeek)}**`,   inline: true },
      { name: '💰 Revenue Bulan Ini', value: `**${rp(revMonth)}**`,  inline: true },
      { name: '💰 Total Revenue',     value: `**${rp(revAll)}**`,    inline: true },
      { name: '📦 Order Hari Ini',    value: `**${ordersToday}**`,   inline: true },
      { name: '📦 Order Minggu Ini',  value: `**${ordersWeek}**`,    inline: true },
      { name: '📊 Total Order',       value: `**${orders.length}**`,    inline: true },
      { name: '✅ Selesai',           value: `**${completed.length}**`,  inline: true },
      { name: '⏳ Pending',           value: `**${pending.length}**`,    inline: true },
      { name: '❌ Cancelled',         value: `**${cancelled.length}**`,  inline: true },
      { name: '📈 Success Rate',      value: `**${successRate}%**`,       inline: true },
      { name: '\u200B',               value: '\u200B',                    inline: true },
      { name: '🏆 Top 3 Item Terlaris', value: topItems,   inline: false },
      { name: '⚠️ Stock Rendah (≤3)',   value: lowStock,   inline: false },
    )
    .setFooter({ text: `Yass Store Bot • ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { handleStats };
