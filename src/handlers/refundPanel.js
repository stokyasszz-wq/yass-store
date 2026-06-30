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

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

async function showRefundPanel(interaction) {
  const orders = db.getOrders();
  const refundable = orders.filter(o => ['VERIFIED', 'DONE'].includes(o.status)).slice(-20).reverse();

  const embed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle('🔄  Refund System')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nPilih invoice yang ingin direfund (status: VERIFIED/DONE):')
    .setTimestamp();

  if (refundable.length === 0) {
    embed.setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n*Tidak ada order VERIFIED/DONE untuk direfund.*');

    return interaction.update({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('dash_back').setLabel('⬅ Back').setStyle(ButtonStyle.Secondary),
        ),
      ],
    });
  }

  const options = refundable.slice(0, 25).map(o => {
    const price = o.totalPrice || o.price || 0;
    const label = o.isCart ? `${o.invoice} — Cart (${(o.items || []).length} item)` : `${o.invoice} — ${o.itemName || '?'}`;
    return new StringSelectMenuOptionBuilder()
      .setLabel(label.substring(0, 100))
      .setValue(o.invoice)
      .setDescription(`${o.username} | ${rp(price)} | ${o.status}`.substring(0, 100));
  });

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('refund_select')
      .setPlaceholder('Pilih invoice untuk direfund...')
      .addOptions(options),
  );

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dash_back').setLabel('⬅ Back').setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row, backRow] });
}

async function handleRefundSelect(interaction) {
  const invoice = interaction.values[0];
  const order = db.getOrderByInvoice(invoice);

  if (!order) {
    return interaction.reply({ content: '❌ Invoice tidak ditemukan.', ephemeral: true });
  }

  const itemLabel = order.isCart
    ? `🛒 Cart (${(order.items || []).length} item)`
    : order.itemName;

  const embed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle(`🔄  Konfirmasi Refund — ${invoice}`)
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ **Tindakan ini tidak bisa dibatalkan!**')
    .addFields(
      { name: '🧾 Invoice', value: invoice, inline: true },
      { name: '👤 Pembeli', value: `<@${order.userId}>`, inline: true },
      { name: '🛍️ Item', value: itemLabel, inline: true },
      { name: '💰 Harga', value: rp(order.totalPrice || order.price || 0), inline: true },
      { name: '📊 Status Lama', value: order.status, inline: true },
    )
    .setTimestamp();

  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`refund_confirm_${invoice}`)
      .setLabel('✅ Ya, Refund Sekarang')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('refund_panel')
      .setLabel('❌ Batal')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [confirmRow] });
}

async function handleRefundConfirm(interaction, invoice) {
  const order = db.getOrderByInvoice(invoice);
  if (!order) return interaction.reply({ content: '❌ Invoice tidak ditemukan.', ephemeral: true });

  db.updateOrder(invoice, { status: 'REFUNDED' });
  db.appendOrderLog(invoice, 'REFUNDED', interaction.user.tag);

  if (order.isCart && order.items) {
    const stock = db.getStock();
    for (const item of order.items) {
      stock[item.id] = (stock[item.id] || 0) + (item.quantity || 1);
    }
    db.setStock(stock);
  } else if (order.itemId) {
    const stock = db.getStock();
    stock[order.itemId] = (stock[order.itemId] || 0) + 1;
    db.setStock(stock);
  }

  await liveStore.refresh();

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('✅  Refund Berhasil')
    .addFields(
      { name: '🧾 Invoice', value: invoice, inline: true },
      { name: '📊 Status',  value: '🔄 REFUNDED', inline: true },
      { name: '👤 Pembeli', value: `<@${order.userId}>`, inline: true },
      { name: '💰 Nominal', value: `Rp ${((order.totalPrice || order.price || 0)).toLocaleString('id-ID')}`, inline: true },
    )
    .setDescription('*Stock item sudah dikembalikan ke inventori.*')
    .setTimestamp();

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('refund_panel').setLabel('⬅ Refund Panel').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('dash_back').setLabel('🏠 Dashboard').setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [backRow] });
}

module.exports = { showRefundPanel, handleRefundSelect, handleRefundConfirm };
