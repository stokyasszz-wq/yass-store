const db = require('../db');
const { createTicket } = require('../ticketManager');
const { sendLog } = require('./logManager');
const embeds = require('../embeds');
const stockLock = require('../stockLock');
const liveStore = require('../liveStore');

const pendingSelections = new Map();

async function handleItemSelect(interaction) {
  const productId = interaction.values[0];
  const product   = db.getItemById(productId);
  if (!product) return interaction.reply({ content: '❌ Produk tidak ditemukan.', ephemeral: true });

  if (!db.isCategoryOpen(product.categoryId || product.gameSlug)) {
    return interaction.reply({
      content: `❌ Kategori sedang **CLOSED**. Coba lagi nanti.`,
      ephemeral: true,
    });
  }

  pendingSelections.set(interaction.user.id, productId);

  const stock      = db.getStock();
  const stk        = stock[productId] ?? 0;
  const price      = db.getItemEffectivePrice(product);
  const stockLabel = stk > 0 ? `✅ Stock tersedia` : '❌ **OUT OF STOCK**';

  const priceDisplay = product.type === 'gig'
    ? `©${product.robuxAmount} Robux = **${embeds.rp(price)}** (rate Rp ${db.getGigRate()}/R$)`
    : `**${embeds.rp(price)}**`;

  await interaction.reply({
    content:
      `${product.emoji} **${product.name}** dipilih!\n` +
      `💰 Harga: ${priceDisplay}\n` +
      `${stockLabel}\n\n` +
      `Klik **🟢 Order Sekarang** untuk melanjutkan.`,
    ephemeral: true,
  });
}

async function handleOrderNow(interaction) {
  const productId = pendingSelections.get(interaction.user.id);
  if (!productId) {
    return interaction.reply({ content: '❌ Kamu belum memilih item! Pilih dari dropdown dulu.', ephemeral: true });
  }

  if (db.isMaintenanceMode()) {
    return interaction.reply({ content: '🔧 Store sedang **maintenance**. Coba lagi nanti.', ephemeral: true });
  }
  if (db.isBanned(interaction.user.id)) {
    return interaction.reply({ content: '🔨 Kamu di-ban dari store dan tidak bisa order.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const product = db.getItemById(productId);
  if (!product) return interaction.editReply({ content: '❌ Produk tidak ditemukan.' });

  if (!db.isCategoryOpen(product.categoryId || product.gameSlug)) {
    return interaction.editReply({ content: `❌ Kategori sedang **CLOSED**.` });
  }

  const activeOrder = db.getUserActiveOrder(interaction.user.id);
  if (activeOrder) {
    return interaction.editReply({
      content: `❌ Kamu masih punya order aktif (**${activeOrder.invoice}** — ${activeOrder.status}).\nSelesaikan dulu sebelum order lagi.`,
    });
  }

  if (!stockLock.lock(productId)) {
    return interaction.editReply({ content: '⏳ Item sedang diproses pengguna lain. Tunggu sebentar.' });
  }

  try {
    const stock        = db.getStock();
    const currentStock = stock[productId] ?? 0;
    if (currentStock <= 0) {
      return interaction.editReply({ content: `❌ **${product.name}** habis! Tunggu restock.` });
    }

    stock[productId] = currentStock - 1;
    db.setStock(stock);

    // Harga efektif: GiG = robuxAmount × gigRate, lainnya = price tetap
    const finalPrice = db.getItemEffectivePrice(product);

    const order = db.createOrder({
      userId:     interaction.user.id,
      username:   interaction.user.tag,
      gameSlug:   product.categoryId || product.gameSlug || 'store',
      itemId:     product.id,
      itemName:   product.name,
      price:      finalPrice,
      totalPrice: finalPrice,
      robuxAmount: product.robuxAmount || null,
      items: [{
        id:       product.id,
        name:     product.name,
        emoji:    product.emoji || '📦',
        price:    finalPrice,
        quantity: 1,
        robuxAmount: product.robuxAmount || null,
      }],
    });

    pendingSelections.delete(interaction.user.id);

    const productForTicket = {
      ...product,
      price:    finalPrice,
      gameSlug: product.categoryId || product.gameSlug || 'store',
    };

    const ticketChannel = await createTicket(interaction.guild, interaction.user, productForTicket, order);
    await liveStore.refresh();

    const updatedOrder = db.getOrderByInvoice(order.invoice);
    await sendLog(interaction.guild, updatedOrder, 'ORDER CREATED', `New order by ${interaction.user.tag}`);

    const priceInfo = product.type === 'gig'
      ? `©${product.robuxAmount} R$ = ${embeds.rp(finalPrice)}`
      : embeds.rp(finalPrice);

    await interaction.editReply({
      content:
        `✅ **Order berhasil!**\n` +
        `🧾 Invoice: **${order.invoice}**\n` +
        `🛍️ Item: ${product.emoji} ${product.name}\n` +
        `💰 Total: ${priceInfo}\n` +
        `🎫 Ticket: ${ticketChannel}\n\n` +
        `Cek DM kamu untuk detail order!`,
    });
  } catch (err) {
    console.error('[purchaseFlow] Error:', err.message);
    await interaction.editReply({ content: '❌ Terjadi error. Coba lagi atau hubungi staff.' });
  } finally {
    stockLock.unlock(productId);
  }
}

module.exports = { handleItemSelect, handleOrderNow, pendingSelections };
