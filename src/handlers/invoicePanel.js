const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const db = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

const statusEmoji = {
  'ORDER CREATED': '🟡', 'WAITING PAYMENT': '🟠',
  'PROOF SENT': '🔵', 'VERIFIED': '🟢', 'DONE': '⚫', 'REFUNDED': '🔄',
};

async function showInvoicePanel(interaction) {
  const orders = db.getOrders();
  const recent = orders.slice(-15).reverse();

  const embed = new EmbedBuilder()
    .setColor(config.colors.blurple)
    .setTitle('🧾  Invoice Management')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n15 invoice terbaru:')
    .setTimestamp();

  if (recent.length === 0) {
    embed.setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n*Belum ada invoice.*');
  } else {
    const lines = recent.map(o => {
      const emoji = statusEmoji[o.status] || '⚪';
      const itemLabel = o.isCart ? `🛒 Cart (${(o.items || []).length} item)` : o.itemName;
      const price = o.totalPrice || o.price || 0;
      return `${emoji} **${o.invoice}** — ${itemLabel}\n    👤 ${o.username} | 💰 ${rp(price)} | *${o.status}*`;
    }).join('\n\n');

    embed.setDescription(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${lines}`);
    embed.setFooter({ text: `Total: ${orders.length} invoice` });
  }

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('inv_search').setLabel('🔍 Cari Invoice').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('inv_pending').setLabel('⏳ Pending').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('inv_refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('dash_back').setLabel('⬅ Back').setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [buttons] });
}

async function showPendingInvoices(interaction) {
  const orders = db.getOrders();
  const pending = orders.filter(o => !['DONE', 'VERIFIED', 'REFUNDED'].includes(o.status)).reverse();

  const embed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle('⏳  Pending Invoices')
    .setTimestamp();

  if (pending.length === 0) {
    embed.setDescription('✅ Tidak ada invoice pending saat ini.');
  } else {
    const lines = pending.slice(0, 15).map(o => {
      const emoji = statusEmoji[o.status] || '⚪';
      const itemLabel = o.isCart ? `🛒 Cart (${(o.items || []).length} item)` : o.itemName;
      const price = o.totalPrice || o.price || 0;
      const ageMin = Math.floor((Date.now() - new Date(o.date).getTime()) / 60000);
      return `${emoji} **${o.invoice}** — ${itemLabel}\n    👤 ${o.username} | 💰 ${rp(price)} | ⏱ ${ageMin}m lalu`;
    }).join('\n\n');

    embed.setDescription(lines || '—');
    embed.setFooter({ text: `${pending.length} invoice pending` });
  }

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('inv_panel').setLabel('⬅ Back to Invoices').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('dash_back').setLabel('🏠 Dashboard').setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [buttons] });
}

async function showInvoiceSearchModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_inv_search')
    .setTitle('🔍 Cari Invoice');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('invoice_num')
        .setLabel('Nomor Invoice (contoh: YS-0001)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('YS-0001')
        .setRequired(true),
    ),
  );

  await interaction.showModal(modal);
}

async function handleInvoiceSearchModal(interaction) {
  const raw = interaction.fields.getTextInputValue('invoice_num').trim().toUpperCase();
  const order = db.getOrderByInvoice(raw);

  if (!order) {
    return interaction.reply({
      content: `❌ Invoice **${raw}** tidak ditemukan.`,
      ephemeral: true,
    });
  }

  const price = order.totalPrice || order.price || 0;
  const itemLabel = order.isCart
    ? `🛒 Cart (${(order.items || []).length} item)`
    : (order.itemName || '—');
  const emoji = statusEmoji[order.status] || '⚪';

  const logs = (order.logs || []).slice(-5).map(l =>
    `\`${new Date(l.timestamp).toLocaleTimeString('id-ID')}\` ${l.event} — ${l.by}`,
  ).join('\n') || '*Tidak ada log.*';

  const embed = new EmbedBuilder()
    .setColor(config.colors.blurple)
    .setTitle(`🔍  Invoice: ${order.invoice}`)
    .addFields(
      { name: '👤 Pembeli',  value: `<@${order.userId}> (${order.username})`, inline: true },
      { name: '🛍️ Item',    value: itemLabel, inline: true },
      { name: '💰 Total',   value: `Rp ${price.toLocaleString('id-ID')}`, inline: true },
      { name: '📊 Status',  value: `${emoji} ${order.status}`, inline: true },
      { name: '📅 Tanggal', value: new Date(order.date).toLocaleString('id-ID'), inline: true },
      { name: '📋 Log Terakhir', value: logs, inline: false },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { showInvoicePanel, showPendingInvoices, showInvoiceSearchModal, handleInvoiceSearchModal };
