const { EmbedBuilder } = require('discord.js');
const config = require('./config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

const SUB_LABELS = {
  limited:  '🔑 LIMITED SKIN',
  hot:      '🔥 HOT ITEM',
  gamepass: '🎮 GAMEPASS',
  crates:   '📦 CRATES',
  boost:    '⚡ BOOSTS',
};

// Harga efektif item (GiG = robuxAmount × gigRate, lainnya = price tetap)
function effectivePrice(item, gigRate) {
  if (item.type === 'gig') return (item.robuxAmount || 0) * gigRate;
  return item.price || 0;
}

function liveStoreEmbed() {
  const db = require('./db');
  const categories = db.getCategories();
  const stock      = db.getStock();
  const items      = db.getItems();
  const gigRate    = db.getGigRate();
  const now        = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  const catLines = categories.map(cat => {
    const catItems  = items.filter(i => i.categoryId === cat.id);
    const totalStock = catItems.reduce((s, i) => s + (stock[i.id] ?? 0), 0);

    if (!cat.isOpen)   return `${cat.emoji} **${cat.name}** ┃ 🔴 CLOSED`;
    if (!totalStock)   return `${cat.emoji} **${cat.name}** ┃ 🟡 OUT OF STOCK`;
    return `${cat.emoji} **${cat.name}** ┃ <a:veriff:1521453856498651147> AVAILABLE`;
  }).join('\n');

  return new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('<a:veriff:1521453856498651147>  YASS STORE — LIVE')
    .setDescription(
      '> Top Up Aman, Murah, & Terpercaya!\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '**📂 Kategori Tersedia:**\n\n' +
      catLines +
      '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      `💰 GiG Rate: **Rp ${gigRate}/R$**\n` +
      '*Klik tombol kategori di bawah untuk lihat item & order*',
    )
    .setFooter({ text: `🔄 Auto-updated: ${now} WIB` });
}

function categoryOrderEmbed(cat, items, stock) {
  const db = require('./db');
  const gigRate = db.getGigRate();

  const colorMap = {
    freefire:     config.colors.ff,
    mobilelegend: config.colors.ml,
    skin_fish_it: 0x3ABDA8,
    gift_in_game: config.colors.gold,
    robux_login:  0x00B2FF,
  };

  const isGig = items.some(i => i.type === 'gig');
  const statusLine = cat.isOpen ? '🟢 OPEN' : '🔴 CLOSED';

  const embed = new EmbedBuilder()
    .setColor(colorMap[cat.id] || config.colors.blurple)
    .setTitle(`${cat.emoji}  ${cat.name.toUpperCase()} — ${statusLine}`);

  if (isGig) {
    // ── GiG Category: harga dinamis dari robuxAmount × gigRate ──────────────
    const subOrder = ['limited', 'hot', 'gamepass', 'crates', 'boost'];
    for (const sub of subOrder) {
      const subItems = items.filter(i => i.subCategory === sub);
      if (subItems.length === 0) continue;

      const lines = subItems.map(item => {
        const stk   = stock[item.id] ?? 0;
        const price = effectivePrice(item, gigRate);
        const priceStr = `©${item.robuxAmount} = ${rp(price)}`;
        if (stk <= 0) return `${item.emoji} ~~${item.name}~~ — ${priceStr} ❌`;
        return `${item.emoji} **${item.name}** — ${priceStr} ┃ ✅`;
      }).join('\n');

      embed.addFields({ name: SUB_LABELS[sub] || sub.toUpperCase(), value: lines, inline: false });
    }
    embed.addFields({ name: '💰 Current Rate', value: `**Rp ${gigRate}** per Robux (©)`, inline: false });

  } else if (cat.id === 'gift_in_game') {
    // gift_in_game tanpa gig type (fixed price)
    const subOrder = ['limited', 'hot', 'gamepass', 'crates', 'boost'];
    for (const sub of subOrder) {
      const subItems = items.filter(i => i.subCategory === sub);
      if (subItems.length === 0) continue;
      const lines = subItems.map(item => {
        const stk = stock[item.id] ?? 0;
        return stk <= 0
          ? `${item.emoji} ~~${item.name}~~ — ${rp(item.price)} ❌`
          : `${item.emoji} **${item.name}** — ${rp(item.price)} ┃ ✅ ${stk}`;
      }).join('\n');
      embed.addFields({ name: SUB_LABELS[sub] || sub.toUpperCase(), value: lines, inline: false });
    }

  } else if (cat.id === 'freefire') {
    const diamonds = items.filter(i => i.amount);
    const others   = items.filter(i => !i.amount);
    if (diamonds.length) {
      embed.addFields({
        name: '💎 Diamonds',
        value: diamonds.map(i => {
          const stk = stock[i.id] ?? 0;
          return stk > 0 ? `${i.emoji} **${i.name}** — ${rp(i.price)} ┃ ✅ ${stk}` : `${i.emoji} ~~${i.name}~~ — ${rp(i.price)} ❌`;
        }).join('\n'), inline: false,
      });
    }
    if (others.length) {
      embed.addFields({
        name: '👑 Membership & Pass',
        value: others.map(i => {
          const stk = stock[i.id] ?? 0;
          return stk > 0 ? `${i.emoji} **${i.name}** — ${rp(i.price)} ┃ ✅ ${stk}` : `${i.emoji} ~~${i.name}~~ — ${rp(i.price)} ❌`;
        }).join('\n'), inline: false,
      });
    }

  } else if (cat.id === 'mobilelegend') {
    const diamonds = items.filter(i => i.amount);
    const others   = items.filter(i => !i.amount);
    if (diamonds.length) {
      embed.addFields({
        name: '💎 Diamonds',
        value: diamonds.map(i => {
          const stk = stock[i.id] ?? 0;
          return stk > 0 ? `${i.emoji} **${i.name}** — ${rp(i.price)} ┃ ✅ ${stk}` : `${i.emoji} ~~${i.name}~~ — ${rp(i.price)} ❌`;
        }).join('\n'), inline: false,
      });
    }
    if (others.length) {
      embed.addFields({
        name: '💳 Membership & Pass',
        value: others.map(i => {
          const stk = stock[i.id] ?? 0;
          return stk > 0 ? `${i.emoji} **${i.name}** — ${rp(i.price)} ┃ ✅ ${stk}` : `${i.emoji} ~~${i.name}~~ — ${rp(i.price)} ❌`;
        }).join('\n'), inline: false,
      });
    }

  } else {
    const lines = items.map(item => {
      const stk = stock[item.id] ?? 0;
      return stk > 0
        ? `${item.emoji} **${item.name}** — ${rp(item.price)} ┃ ✅ ${stk}`
        : `${item.emoji} ~~${item.name}~~ — ${rp(item.price)} ❌`;
    }).join('\n');
    embed.addFields({ name: '📦 Items', value: lines || '—', inline: false });
  }

  embed.setDescription(
    `> Pilih item dari dropdown, lalu klik **🟢 Order Sekarang** atau **🛒 Tambah ke Cart**\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  );
  embed.setFooter({ text: 'Yass Store Bot • Pilih item dari dropdown' });
  return embed;
}

function storeHomeEmbed() {
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🏪  YASS STORE BOT — Marketplace')
    .setDescription(
      '> Top Up Aman, Murah, & Legal!\n\n' +
      'Pilih game yang ingin kamu top up.\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    )
    .addFields(
      { name: '🔥  Free Fire',    value: '10 Diamond • 3 Membership & Pass', inline: true },
      { name: '📱  Mobile Legend', value: '9 Diamond • 3 Membership & Pass',  inline: true },
    )
    .addFields({ name: '🛡️  Jaminan', value: '✅ Anti-Scam  ✅ Proses Cepat  ✅ Support 24/7' })
    .setFooter({ text: 'Yass Store Bot • Klik tombol di bawah' });
}

function ffStoreEmbed(products) {
  const diamonds    = products.filter(p => p.amount);
  const memberships = products.filter(p => !p.amount);
  return new EmbedBuilder()
    .setColor(config.colors.ff)
    .setTitle('🔥  PRICE LIST FREE FIRE')
    .setDescription('> Top Up Aman, Murah, & Legal!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    .addFields(
      { name: '💎  Diamonds',        value: diamonds.map((p, i) => `\`${String(i+1).padStart(2,'0')}\` 💎 **${p.name}** — ${rp(p.price)}`).join('\n') || '—' },
      { name: '👑  Membership & Pass', value: memberships.map((p, i) => `\`${String(i+1).padStart(2,'0')}\` ${p.emoji} **${p.name}** — ${rp(p.price)}`).join('\n') || '—' },
    )
    .addFields({ name: '📋  Cara Order', value: '1️⃣ Pilih item dari menu\n2️⃣ Klik **🟢 Order Sekarang**\n3️⃣ Ticket otomatis dibuat' })
    .setFooter({ text: 'Yass Store Bot • Free Fire Store' });
}

function mlStoreEmbed(products) {
  const diamonds    = products.filter(p => p.amount);
  const memberships = products.filter(p => !p.amount);
  return new EmbedBuilder()
    .setColor(config.colors.ml)
    .setTitle('📱  PRICE LIST MOBILE LEGEND')
    .setDescription('> Top Up Aman, Murah, & Legal!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    .addFields(
      { name: '💎  Diamonds',       value: diamonds.map((p, i) => `\`${String(i+1).padStart(2,'0')}\` 💎 **${p.name}** — ${rp(p.price)}`).join('\n') || '—' },
      { name: '💳  Membership & Pass', value: memberships.map((p, i) => `\`${String(i+1).padStart(2,'0')}\` ${p.emoji} **${p.name}** — ${rp(p.price)}`).join('\n') || '—' },
    )
    .addFields({ name: '📋  Cara Order', value: '1️⃣ Pilih item dari menu\n2️⃣ Klik **🟢 Order Sekarang**\n3️⃣ Ticket otomatis dibuat' })
    .setFooter({ text: 'Yass Store Bot • Mobile Legend Store' });
}

function invoiceEmbed(order) {
  const statusColor = {
    'ORDER CREATED': config.colors.gold,  'WAITING PAYMENT': config.colors.orange,
    'PROOF SENT':    config.colors.primary,'VERIFIED': config.colors.success,
    'DONE':          config.colors.dark,   'REFUNDED': config.colors.purple,
  };
  const statusDisplay = {
    'ORDER CREATED': '🟡 ORDER CREATED', 'WAITING PAYMENT': '🟠 WAITING PAYMENT',
    'PROOF SENT':    '🔵 PROOF SENT',    'VERIFIED': '🟢 VERIFIED',
    'DONE':          '⚫ DONE',           'REFUNDED': '🔄 REFUNDED',
  };

  const embed = new EmbedBuilder()
    .setColor(statusColor[order.status] || config.colors.gold)
    .setTitle(`🧾  Invoice ${order.invoice}`)
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (order.isCart && order.items && order.items.length > 0) {
    const itemLines = order.items.map(i =>
      `${i.emoji || '📦'} **${i.name}** × ${i.quantity || 1} = ${rp(i.price * (i.quantity || 1))}`,
    ).join('\n');
    embed.addFields(
      { name: '👤  Pembeli',   value: `<@${order.userId}>`,     inline: true },
      { name: '🛒  Tipe',      value: 'Cart Checkout',           inline: true },
      { name: '📊  Status',    value: statusDisplay[order.status] || order.status, inline: true },
      { name: '🛍️  Item List', value: itemLines.substring(0, 1024), inline: false },
      { name: '💰  Total',     value: rp(order.totalPrice || order.price || 0), inline: true },
      { name: '📅  Tanggal',   value: new Date(order.date).toLocaleString('id-ID'), inline: true },
    );
  } else {
    const gigNote = order.robuxAmount ? `\n©${order.robuxAmount} Robux` : '';
    embed.addFields(
      { name: '👤  Pembeli', value: `<@${order.userId}>`,   inline: true },
      { name: '🛍️  Item',   value: (order.itemName || '—') + gigNote, inline: true },
      { name: '💰  Total',  value: rp(order.totalPrice || order.price || 0), inline: true },
      { name: '📊  Status', value: statusDisplay[order.status] || order.status, inline: true },
      { name: '📅  Tanggal',value: new Date(order.date).toLocaleString('id-ID'), inline: true },
    );
  }

  embed.setFooter({ text: `Yass Store Bot • ${order.invoice}` });
  return embed;
}

function paymentEmbed(dana, order) {
  const nominal = order.totalPrice || order.price || 0;
  return new EmbedBuilder()
    .setColor(config.colors.purple)
    .setTitle('💳  Pembayaran via DANA')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTransfer ke rekening DANA berikut:')
    .addFields(
      { name: '📱  Nomor DANA', value: `\`\`\`${dana.number}\`\`\`` },
      { name: '👤  Atas Nama',  value: `\`\`\`${dana.name}\`\`\`` },
      { name: '💰  Nominal',    value: `\`\`\`${rp(nominal)}\`\`\`` },
    )
    .addFields({ name: '📋  Langkah', value: '**1.** Transfer tepat sesuai nominal\n**2.** Klik ✔ **Payment Done**\n**3.** Upload screenshot bukti transfer\n**4.** Tunggu staff verifikasi' })
    .setFooter({ text: 'Jangan tutup ticket sebelum VERIFIED!' });
}

function proofReceivedEmbed(order, imageUrl) {
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('📸  Bukti Transfer Diterima')
    .setDescription(`Invoice **${order.invoice}** — Staff akan segera memverifikasi.`)
    .setImage(imageUrl)
    .addFields(
      { name: '📊  Status',   value: '🔵 PROOF SENT', inline: true },
      { name: '⏳  Estimasi', value: 'Maks 15 menit',  inline: true },
    )
    .setFooter({ text: 'Yass Store Bot • Jangan kirim bukti duplikat' });
}

function verifiedEmbed(order, verifierTag) {
  return new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle(' <a:veriff:1521453856498651147>  Pembayaran Terverifikasi!')
    .setDescription(`Invoice **${order.invoice}** telah diverifikasi. Terima kasih! 🎉`)
    .addFields(
      { name: '📊  Status',            value: '🟢 VERIFIED', inline: true },
      { name: '👮  Diverifikasi oleh', value: verifierTag,   inline: true },
    )
    .setFooter({ text: 'Yass Store Bot • Terima kasih sudah berbelanja!' });
}

function orderLogEmbed(order, event) {
  const statusEmoji = {
    'ORDER CREATED': '🟡', 'WAITING PAYMENT': '🟠',
    'PROOF SENT': '🔵', 'VERIFIED': '🟢', 'DONE': '⚫',
  };
  return new EmbedBuilder()
    .setColor(config.colors.blurple)
    .setTitle(`📋  Order Log — ${event || order.status}`)
    .addFields(
      { name: '🧾  Invoice', value: order.invoice,  inline: true },
      { name: '👤  User',    value: order.username, inline: true },
      { name: '🛍️  Item',   value: order.itemName || '—', inline: true },
      { name: '💰  Harga',  value: rp(order.totalPrice || order.price || 0), inline: true },
      { name: '📊  Status', value: `${statusEmoji[order.status] || '⚪'} ${order.status}`, inline: true },
    ).setTimestamp();
}

function negoEmbed() {
  return new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('🤝  Mau Nego Harga?')
    .setDescription('Harga yang tertera sudah **harga terbaik** kami.\n\nJika ada pertanyaan, mention staff yang online.')
    .setFooter({ text: 'Yass Store Bot • Nego langsung dengan staff' });
}

module.exports = {
  liveStoreEmbed, categoryOrderEmbed,
  storeHomeEmbed, ffStoreEmbed, mlStoreEmbed,
  invoiceEmbed, paymentEmbed, proofReceivedEmbed, verifiedEmbed,
  orderLogEmbed, negoEmbed, rp, effectivePrice,
};
