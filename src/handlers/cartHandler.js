const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const db = require('../db');
const config = require('../config');
const liveStore = require('../liveStore');
const stockLock = require('../stockLock');
const { sendLog } = require('./logManager');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;
const checkoutCooldowns = new Map();
const COOLDOWN_MS = 30_000;

function cartEmbed(userId, cart, username) {
  if (!cart || cart.length === 0) {
    return new EmbedBuilder()
      .setColor(config.colors.gold)
      .setTitle('🛒  Cart Kamu — Kosong')
      .setDescription('Belum ada item di cart.\n\nGunakan tombol **🛒 Tambah ke Cart** di store untuk menambah item.')
      .setFooter({ text: 'Yass Store Bot • Cart System' });
  }
  const lines = cart.map((item, i) => {
    const subtotal = item.price * (item.quantity || 1);
    return `\`${String(i+1).padStart(2,'0')}\` ${item.emoji || '📦'} **${item.name}** × ${item.quantity || 1}\n    💰 ${rp(item.price)} × ${item.quantity || 1} = **${rp(subtotal)}**`;
  });
  const total = cart.reduce((s, i) => s + i.price * (i.quantity || 1), 0);
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`🛒  Cart — ${username}`)
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' + lines.join('\n\n') + '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' + `**🧾 Total: ${rp(total)}** (${cart.length} item)`)
    .setFooter({ text: 'Yass Store Bot • Klik Checkout untuk lanjut bayar' });
}

function cartButtons(hasItems) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cart_checkout').setLabel('✅ Checkout').setStyle(ButtonStyle.Success).setDisabled(!hasItems),
    new ButtonBuilder().setCustomId('cart_remove_item').setLabel('➖ Hapus Item').setStyle(ButtonStyle.Danger).setDisabled(!hasItems),
    new ButtonBuilder().setCustomId('cart_clear').setLabel('🗑️ Kosongkan').setStyle(ButtonStyle.Secondary).setDisabled(!hasItems),
    new ButtonBuilder().setCustomId('cart_refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary),
  )];
}

async function handleViewCart(interaction, isUpdate = false) {
  const cart = db.getCart(interaction.user.id);
  const embed = cartEmbed(interaction.user.id, cart, interaction.user.username);
  const components = cartButtons(cart.length > 0);
  if (isUpdate) await interaction.update({ embeds: [embed], components });
  else await interaction.reply({ embeds: [embed], components, ephemeral: true });
}

async function handleAddToCart(interaction, pendingSelections) {
  const productId = pendingSelections.get(interaction.user.id);
  if (!productId) return interaction.reply({ content: '❌ Pilih item dari dropdown dulu sebelum tambah ke cart!', ephemeral: true });

  const product = db.getItemById(productId);
  if (!product) return interaction.reply({ content: '❌ Item tidak ditemukan.', ephemeral: true });

  const stock = db.getStock();
  if ((stock[productId] ?? 0) <= 0) return interaction.reply({ content: `❌ **${product.name}** habis!`, ephemeral: true });

  const catId = product.categoryId;
  if (!db.isCategoryOpen(catId)) {
    const cat = db.getCategoryById(catId);
    return interaction.reply({ content: `❌ Kategori **${cat ? cat.name : catId}** sedang CLOSED.`, ephemeral: true });
  }

  db.addToCart(interaction.user.id, { id: product.id, name: product.name, emoji: product.emoji || '📦', price: product.price, categoryId: product.categoryId, quantity: 1 });
  const cart = db.getCart(interaction.user.id);
  const total = cart.reduce((s, i) => s + i.price * (i.quantity || 1), 0);

  await interaction.reply({
    content: `✅ **${product.emoji} ${product.name}** ditambahkan ke cart!\n🛒 Cart kamu: **${cart.length} item** | Total: **${rp(total)}**\n\nGunakan \`/cart\` untuk lihat cart, atau langsung \`/checkout\`.`,
    ephemeral: true,
  });
}

async function handleCartRemoveMenu(interaction) {
  const cart = db.getCart(interaction.user.id);
  if (cart.length === 0) return interaction.update({ content: '🛒 Cart sudah kosong.', embeds: [], components: [] });
  const options = cart.map(item =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${item.emoji} ${item.name}`.substring(0, 100))
      .setValue(item.id)
      .setDescription(`${rp(item.price)} × ${item.quantity || 1} = ${rp(item.price * (item.quantity || 1))}`.substring(0, 100)),
  );
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('cart_select_remove').setPlaceholder('Pilih item yang ingin dihapus...').addOptions(options),
  );
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(config.colors.danger).setTitle('➖  Hapus Item dari Cart').setDescription('Pilih item yang ingin dihapus:')],
    components: [row],
  });
}

async function handleCartSelectRemove(interaction) {
  db.removeFromCart(interaction.user.id, interaction.values[0]);
  await handleViewCart(interaction, true);
}

async function handleCartClear(interaction) {
  db.clearCart(interaction.user.id);
  await handleViewCart(interaction, true);
}

function checkCooldown(userId) {
  const last = checkoutCooldowns.get(userId);
  if (!last) return 0;
  const elapsed = Date.now() - last;
  if (elapsed < COOLDOWN_MS) return Math.ceil((COOLDOWN_MS - elapsed) / 1000);
  return 0;
}

async function handleCartCheckout(interaction) {
  const cart = db.getCart(interaction.user.id);
  if (cart.length === 0) {
    return interaction.update({ content: '❌ Cart kamu kosong! Tambah item dulu.', embeds: [], components: [] });
  }

  if (db.isMaintenanceMode()) {
    return interaction.reply({ content: '🔧 Store sedang dalam **maintenance**. Coba lagi nanti.', ephemeral: true });
  }

  if (db.isBanned(interaction.user.id)) {
    return interaction.reply({ content: '🔨 Kamu di-ban dari store dan tidak bisa melakukan order.', ephemeral: true });
  }

  const cooldownSec = checkCooldown(interaction.user.id);
  if (cooldownSec > 0) {
    return interaction.reply({ content: `⏳ Tunggu **${cooldownSec} detik** sebelum checkout lagi.`, ephemeral: true });
  }

  const activeOrder = db.getUserActiveOrder(interaction.user.id);
  if (activeOrder) {
    return interaction.reply({
      content: `❌ Kamu masih punya order aktif (**${activeOrder.invoice}** — ${activeOrder.status}).\nSelesaikan dulu sebelum checkout lagi.`,
      ephemeral: true,
    });
  }

  await interaction.deferUpdate();

  const stock = db.getStock();
  const insufficientItems = [];
  const closedCats = [];

  for (const item of cart) {
    if (!db.isCategoryOpen(item.categoryId)) closedCats.push(item.name);
    if ((stock[item.id] ?? 0) < (item.quantity || 1)) insufficientItems.push(item.name);
  }
  if (closedCats.length > 0) return interaction.editReply({ content: `❌ Kategori untuk item berikut sedang CLOSED:\n• ${closedCats.join('\n• ')}`, embeds: [], components: [] });
  if (insufficientItems.length > 0) return interaction.editReply({ content: `❌ Stock tidak cukup untuk:\n• ${insufficientItems.join('\n• ')}`, embeds: [], components: [] });

  const locks = [];
  try {
    for (const item of cart) {
      if (!stockLock.lock(item.id)) {
        return interaction.editReply({ content: `⏳ Item **${item.name}** sedang diproses pengguna lain. Coba lagi.`, embeds: [], components: [] });
      }
      locks.push(item.id);
    }

    const freshStock = db.getStock();
    const insufficientAfterLock = cart.filter(item => (freshStock[item.id] ?? 0) < (item.quantity || 1)).map(i => i.name);
    if (insufficientAfterLock.length > 0) {
      return interaction.editReply({ content: `❌ Stock tidak cukup untuk:\n• ${insufficientAfterLock.join('\n• ')}`, embeds: [], components: [] });
    }

    for (const item of cart) {
      freshStock[item.id] = Math.max(0, (freshStock[item.id] ?? 0) - (item.quantity || 1));
    }
    db.setStock(freshStock);

    const totalPrice = cart.reduce((s, i) => s + i.price * (i.quantity || 1), 0);
    const order = db.createOrder({
      userId:   interaction.user.id,
      username: interaction.user.tag,
      gameSlug: 'cart',
      items:    cart.map(i => ({ id: i.id, name: i.name, emoji: i.emoji, price: i.price, quantity: i.quantity || 1 })),
      totalPrice,
      isCart:   true,
      itemId:   null,
      itemName: `Cart (${cart.length} item)`,
      price:    totalPrice,
    });

    db.clearCart(interaction.user.id);
    checkoutCooldowns.set(interaction.user.id, Date.now());

    const { createCartTicket } = require('../ticketManager');
    const ticketChannel = await createCartTicket(interaction.guild, interaction.user, cart, order);
    await liveStore.refresh();

    const updatedOrder = db.getOrderByInvoice(order.invoice);
    await sendLog(interaction.guild, updatedOrder, 'ORDER CREATED', `Cart checkout by ${interaction.user.tag}`);

    await interaction.editReply({
      content:
        `✅ **Checkout berhasil!**\n` +
        `🧾 Invoice: **${order.invoice}**\n` +
        `🛒 ${cart.length} item | Total: **${rp(totalPrice)}**\n` +
        `🎫 Ticket: ${ticketChannel}\n\n` +
        `Silakan lanjutkan pembayaran di channel tersebut. Cek DM kamu untuk detail order!`,
      embeds: [], components: [],
    });
  } catch (err) {
    console.error('[cartHandler] Checkout error:', err.message);
    await interaction.editReply({ content: '❌ Terjadi error saat checkout. Coba lagi.', embeds: [], components: [] });
  } finally {
    for (const id of locks) stockLock.unlock(id);
  }
}

async function handleCheckoutCommand(interaction) {
  const cart = db.getCart(interaction.user.id);
  if (cart.length === 0) return interaction.reply({ content: '🛒 Cart kamu kosong! Tambah item dulu dari store.', ephemeral: true });
  const total = cart.reduce((s, i) => s + i.price * (i.quantity || 1), 0);
  const embed = cartEmbed(interaction.user.id, cart, interaction.user.username);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cart_checkout').setLabel(`✅ Checkout ${cart.length} Item — ${rp(total)}`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('cart_refresh').setLabel('❌ Batal').setStyle(ButtonStyle.Danger),
  );
  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

module.exports = {
  handleViewCart, handleAddToCart, handleCartRemoveMenu, handleCartSelectRemove,
  handleCartClear, handleCartCheckout, handleCheckoutCommand,
};
