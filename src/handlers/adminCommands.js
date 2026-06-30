const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

async function handleResetData(message) {
  const isStaff = message.member.roles.cache.has(config.staffRoleId);
  if (!isStaff) {
    return message.reply('❌ Hanya admin/staff yang bisa menggunakan command ini!');
  }

  db.resetData();

  const embed = new EmbedBuilder()
    .setTitle('🔄 Data Direset')
    .setColor(config.colors.danger)
    .setDescription('Semua data **orders.json**, **invoice.json**, dan **stock.json** telah direset ke kondisi awal.')
    .setFooter({ text: `Direset oleh ${message.author.tag}` })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function handleOrders(message) {
  const isStaff = message.member.roles.cache.has(config.staffRoleId);
  if (!isStaff) {
    return message.reply('❌ Hanya staff yang bisa melihat semua orders!');
  }

  const orders = db.getOrders();

  if (orders.length === 0) {
    return message.reply('📋 Belum ada order sama sekali.');
  }

  const recent = orders.slice(-10).reverse();

  const statusEmoji = {
    'ORDER CREATED':   '🟡',
    'WAITING PAYMENT': '🟠',
    'PROOF SENT':      '🔵',
    'VERIFIED':        '🟢',
    'DONE':            '⚫',
    'CANCELLED':       '❌',
  };

  const embed = new EmbedBuilder()
    .setTitle('📋 Order Log — 10 Transaksi Terakhir')
    .setColor(config.colors.primary)
    .setFooter({ text: `Total: ${orders.length} order` })
    .setTimestamp();

  recent.forEach(o => {
    embed.addFields({
      name: `${o.invoice} — ${o.itemName || 'Cart'}`,
      value:
        `👤 ${o.username} | ` +
        `💰 ${rp(o.totalPrice || o.price || 0)} | ` +
        `${statusEmoji[o.status] || '⚪'} ${o.status}`,
      inline: false,
    });
  });

  await message.reply({ embeds: [embed] });
}

async function handleStock(message) {
  const stock = db.getStock();
  const items = db.getItems();
  const categories = db.getCategories();

  const embed = new EmbedBuilder()
    .setTitle('📦 Stock Produk — Semua Kategori')
    .setColor(config.colors.gold)
    .setTimestamp();

  for (const cat of categories) {
    const catItems = items.filter(i => i.categoryId === cat.id);
    if (catItems.length === 0) continue;
    const lines = catItems.map(p => {
      const stk = stock[p.id] ?? 0;
      return `${p.emoji} ${p.name} — ${stk > 0 ? `✅ ${stk}` : '❌ Habis'}`;
    }).join('\n');
    embed.addFields({ name: `${cat.emoji} ${cat.name}`, value: lines || '—', inline: false });
  }

  await message.reply({ embeds: [embed] });
}

async function handleAddStock(message) {
  const isStaff = message.member.roles.cache.has(config.staffRoleId);
  if (!isStaff) return message.reply('❌ Hanya staff yang bisa tambah stock!');

  const args = message.content.trim().split(/\s+/);
  if (args.length < 3) {
    return message.reply('❌ Format: `!addstock <product_id> <jumlah>`\nContoh: `!addstock ff-d-100 50`');
  }

  const productId = args[1];
  const amount = parseInt(args[2]);

  if (isNaN(amount) || amount <= 0) {
    return message.reply('❌ Jumlah harus angka positif.');
  }

  const product = db.getProductById(productId);
  if (!product) {
    return message.reply(`❌ Product ID \`${productId}\` tidak ditemukan. Gunakan \`!stock\` untuk melihat ID produk.`);
  }

  const stock = db.getStock();
  stock[productId] = (stock[productId] || 0) + amount;
  db.setStock(stock);

  const embed = new EmbedBuilder()
    .setTitle('📦 Stock Ditambahkan')
    .setColor(config.colors.success)
    .addFields(
      { name: '🛍️ Produk', value: `${product.emoji} ${product.name}`, inline: true },
      { name: '➕ Ditambah', value: `${amount} unit`, inline: true },
      { name: '📊 Total Stock', value: `${stock[productId]} unit`, inline: true },
    )
    .setFooter({ text: `Oleh ${message.author.tag}` })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function handleRevenue(message) {
  const isStaff = message.member.roles.cache.has(config.staffRoleId);
  if (!isStaff) return message.reply('❌ Hanya staff yang bisa melihat revenue!');

  const orders = db.getOrders();
  const completed = orders.filter(o => ['VERIFIED', 'DONE'].includes(o.status));
  const pending   = orders.filter(o => !['DONE', 'VERIFIED', 'CANCELLED', 'REFUNDED'].includes(o.status));

  const now = new Date();
  const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);

  const revenue = (list) => list.reduce((s, o) => s + (o.totalPrice || o.price || 0), 0);

  const revToday = revenue(completed.filter(o => new Date(o.date) >= todayStart));
  const revMonth = revenue(completed.filter(o => new Date(o.date) >= monthStart));
  const revAll   = revenue(completed);

  const embed = new EmbedBuilder()
    .setTitle('💰 Revenue Summary')
    .setColor(config.colors.gold)
    .addFields(
      { name: '📅 Hari Ini',   value: `**${rp(revToday)}**`,  inline: true },
      { name: '📆 Bulan Ini',  value: `**${rp(revMonth)}**`,  inline: true },
      { name: '💎 Total',      value: `**${rp(revAll)}**`,    inline: true },
      { name: '📦 Order Selesai', value: `**${completed.length}**`, inline: true },
      { name: '⏳ Pending',       value: `**${pending.length}**`,   inline: true },
      { name: '📊 Total Order',   value: `**${orders.length}**`,    inline: true },
    )
    .setFooter({ text: `Yass Store Bot • ${new Date().toLocaleString('id-ID')}` })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function handleTopBuyers(message) {
  const isStaff = message.member.roles.cache.has(config.staffRoleId);
  if (!isStaff) return message.reply('❌ Hanya staff yang bisa melihat top buyers!');

  const orders = db.getOrders().filter(o => ['VERIFIED', 'DONE'].includes(o.status));

  const userMap = {};
  for (const o of orders) {
    if (!userMap[o.userId]) userMap[o.userId] = { username: o.username, total: 0, count: 0 };
    userMap[o.userId].total += o.totalPrice || o.price || 0;
    userMap[o.userId].count += 1;
  }

  const sorted = Object.values(userMap).sort((a, b) => b.total - a.total).slice(0, 10);

  if (sorted.length === 0) return message.reply('📭 Belum ada transaksi selesai.');

  const medals = ['🥇', '🥈', '🥉'];
  const lines = sorted.map((u, i) =>
    `${medals[i] || `\`${i + 1}\``} **${u.username}** — ${rp(u.total)} *(${u.count}x order)*`
  ).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🏆 Top Buyers')
    .setColor(config.colors.gold)
    .setDescription(lines)
    .setFooter({ text: `Yass Store Bot • ${sorted.length} buyer teratas` })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

module.exports = { handleResetData, handleOrders, handleStock, handleAddStock, handleRevenue, handleTopBuyers };
