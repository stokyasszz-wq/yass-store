const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const db = require('../db');
const embeds = require('../embeds');
const config = require('../config');

function orderPanelEmbed() {
  const orders = db.getOrders();
  const open = orders.filter(o => o.status !== 'DONE').length;
  const verified = orders.filter(o => o.status === 'VERIFIED').length;

  return new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('🛒  Order Control Panel')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    .addFields(
      { name: '📂 Open Tickets',     value: `${open}`,     inline: true },
      { name: '✅ Verified Today',    value: `${verified}`, inline: true },
      { name: '📊 Total Orders',      value: `${orders.length}`, inline: true },
    )
    .setTimestamp();
}

function orderPanelButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('op_view')        .setLabel('📋 View Orders')     .setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('op_verify')      .setLabel('✅ Verify Payment')   .setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('op_force_close') .setLabel('🔒 Force Close')      .setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('dash_back')      .setLabel('⬅ Back')              .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

async function showOrderPanel(interaction) {
  await interaction.update({
    embeds: [orderPanelEmbed()],
    components: orderPanelButtons(),
  });
}

async function showOrderView(interaction) {
  const orders = db.getOrders();
  const recent = orders.slice(-8).reverse();

  const statusEmoji = {
    'ORDER CREATED':   '🟡',
    'WAITING PAYMENT': '🟠',
    'PROOF SENT':      '🔵',
    'VERIFIED':        '🟢',
    'DONE':            '⚫',
  };

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('📋  Recent Orders (last 8)')
    .setTimestamp();

  if (recent.length === 0) {
    embed.setDescription('Belum ada order.');
  } else {
    recent.forEach(o => {
      const itemLabel = o.isCart ? `🛒 Cart (${(o.items || []).length} item)` : (o.itemName || '—');
      const price = o.totalPrice || o.price || 0;
      embed.addFields({
        name: `${o.invoice} — ${itemLabel}`.substring(0, 256),
        value: `👤 ${o.username} | 💰 Rp ${price.toLocaleString('id-ID')} | ${statusEmoji[o.status] || '⚪'} ${o.status}`,
        inline: false,
      });
    });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showVerifyModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_order_verify')
    .setTitle('✅ Verify Payment');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('invoice')
        .setLabel('Invoice Number (contoh: YS-0001)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('YS-0001')
        .setRequired(true),
    ),
  );

  await interaction.showModal(modal);
}

async function showForceCloseModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_order_force_close')
    .setTitle('🔒 Force Close Ticket');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('invoice')
        .setLabel('Invoice Number (contoh: YS-0001)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('YS-0001')
        .setRequired(true),
    ),
  );

  await interaction.showModal(modal);
}

async function handleVerifyModal(interaction) {
  const invoice = interaction.fields.getTextInputValue('invoice').trim().toUpperCase();
  const order = db.getOrderByInvoice(invoice);

  if (!order) return interaction.reply({ content: `❌ Invoice \`${invoice}\` tidak ditemukan.`, ephemeral: true });
  if (order.status === 'VERIFIED' || order.status === 'DONE') {
    return interaction.reply({ content: '✅ Order ini sudah VERIFIED sebelumnya.', ephemeral: true });
  }
  if (order.status !== 'PROOF SENT') {
    return interaction.reply({ content: `❌ Status saat ini: **${order.status}**\nHanya bisa verify jika status PROOF SENT.`, ephemeral: true });
  }

  db.updateOrder(invoice, { status: 'VERIFIED' });
  db.appendOrderLog(invoice, 'VERIFIED via dashboard', interaction.user.tag);

  const updated = db.getOrderByInvoice(invoice);

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('✅ Payment Verified via Dashboard')
    .addFields(
      { name: '🧾 Invoice', value: invoice, inline: true },
      { name: '👤 User',    value: updated.username, inline: true },
      { name: '🛍️ Item',   value: updated.isCart ? `Cart (${(updated.items||[]).length} item)` : (updated.itemName || '—'), inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });

  try {
    if (updated.channelId) {
      const channel = await interaction.client.channels.fetch(updated.channelId).catch(() => null);
      if (channel) {
        await channel.send({
          content: `<@${updated.userId}> 🎉 Pembayaran kamu **TERVERIFIKASI** via admin dashboard! Item akan segera diproses.`,
          embeds: [embeds.verifiedEmbed(updated, interaction.user.tag)],
        });
      }
    }
  } catch (_) {}
}

async function handleForceCloseModal(interaction) {
  const invoice = interaction.fields.getTextInputValue('invoice').trim().toUpperCase();
  const order = db.getOrderByInvoice(invoice);

  if (!order) return interaction.reply({ content: `❌ Invoice \`${invoice}\` tidak ditemukan.`, ephemeral: true });
  if (order.status === 'DONE') {
    return interaction.reply({ content: '✅ Ticket ini sudah DONE/CLOSED.', ephemeral: true });
  }

  db.updateOrder(invoice, { status: 'DONE' });
  db.appendOrderLog(invoice, 'FORCE CLOSED via dashboard', interaction.user.tag);

  const embed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle('🔒 Ticket Force Closed')
    .addFields(
      { name: '🧾 Invoice', value: invoice, inline: true },
      { name: '👤 User', value: order.username, inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });

  try {
    if (order.channelId) {
      const channel = await interaction.client.channels.fetch(order.channelId).catch(() => null);
      if (channel) {
        await channel.send({ content: '🔒 Ticket ini ditutup paksa oleh admin via dashboard.' });
        setTimeout(() => channel.delete().catch(() => {}), 5000);
      }
    }
  } catch (_) {}
}

module.exports = {
  showOrderPanel,
  showOrderView,
  showVerifyModal,
  showForceCloseModal,
  handleVerifyModal,
  handleForceCloseModal,
};
