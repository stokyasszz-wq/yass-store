const { PermissionFlagsBits, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');
const config = require('../config');
const { sendLog } = require('./logManager');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

function userActionRow(invoice) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`payment_done_${invoice}`).setLabel('✔ Payment Done').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`upload_bukti_${invoice}`).setLabel('📸 Upload Bukti').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`cancel_order_btn_${invoice}`).setLabel('❌ Cancel Order').setStyle(ButtonStyle.Danger),
  );
}

function staffTicketActionRow(invoice) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`done_order_${invoice}`).setLabel('✅ Done Order').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`cancel_order_btn_${invoice}`).setLabel('❌ Cancel Order').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`close_ticket_${invoice}`).setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Secondary),
  );
}

async function handlePaymentClaim(interaction) {
  if (!interaction.member.roles.cache.has(config.staffRoleId))
    return interaction.reply({ content: '❌ Hanya staff yang bisa menggunakan command ini!', ephemeral: true });

  const invoice = interaction.options.getString('invoice').toUpperCase().trim();
  const order = db.getOrderByInvoice(invoice);

  if (!order)
    return interaction.reply({ content: `❌ Invoice \`${invoice}\` tidak ditemukan.`, ephemeral: true });

  if (['DONE', 'CANCELLED', 'REFUNDED'].includes(order.status))
    return interaction.reply({ content: `❌ Order \`${invoice}\` sudah **${order.status}** dan tidak bisa di-claim.`, ephemeral: true });

  if (order.claimedBy && order.claimedBy !== interaction.user.id)
    return interaction.reply({ content: `❌ Ticket ini sudah di-claim oleh <@${order.claimedBy}>!`, ephemeral: true });

  const adminPayment = db.getAdminPayment(interaction.user.id);
  if (!adminPayment)
    return interaction.reply({
      content: `❌ Kamu belum mengatur info payment-mu!\nGunakan \`/setmypayment\` dulu untuk mengatur nomor DANA & nama rekening kamu.`,
      ephemeral: true,
    });

  const channel = interaction.guild.channels.cache.get(order.channelId);
  if (!channel)
    return interaction.reply({ content: `❌ Channel ticket tidak ditemukan. Mungkin sudah dihapus.`, ephemeral: true });

  await interaction.deferReply({ ephemeral: true });

  db.updateOrder(invoice, { claimedBy: interaction.user.id });
  db.appendOrderLog(invoice, 'CLAIMED + PAYMENT SENT', interaction.user.tag);

  try {
    await channel.permissionOverwrites.edit(order.userId, {
      ViewChannel: true,
      SendMessages: true,
      AttachFiles: true,
      ReadMessageHistory: true,
    });
  } catch (err) {
    console.error('[PaymentClaim] Failed to unlock buyer:', err.message);
  }

  const paymentEmbed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('💳  Info Pembayaran')
    .setDescription(`Hei <@${order.userId}>! Berikut info pembayaran untuk order **${invoice}**:`)
    .addFields(
      { name: '🏦 Metode', value: 'DANA', inline: true },
      { name: '📱 Nomor', value: `\`${adminPayment.number}\``, inline: true },
      { name: '👤 Atas Nama', value: `**${adminPayment.name}**`, inline: true },
      { name: '💰 Total Bayar', value: `**${rp(order.totalPrice || order.price || 0)}**`, inline: false },
      { name: '📋 Langkah', value: '1. Transfer ke nomor DANA di atas\n2. Klik ✔ **Payment Done**\n3. Upload screenshot bukti transfer\n4. Tunggu staff verifikasi', inline: false },
    )
    .setFooter({ text: `Dihandle oleh ${interaction.user.tag} • Yass Store Bot` })
    .setTimestamp();

  if (adminPayment.qrisUrl) {
    paymentEmbed.addFields({ name: '🔲 QRIS', value: 'Scan QR Code di bawah ini untuk bayar:', inline: false });
    paymentEmbed.setImage(adminPayment.qrisUrl);
  }

  await channel.send({
    content: `<@${order.userId}> — Info pembayaran dari staff <@${interaction.user.id}>:`,
    embeds: [paymentEmbed],
    components: [userActionRow(invoice)],
  });
  await channel.send({
    content: `📌 Ticket ini di-handle oleh <@${interaction.user.id}>.`,
    components: [staffTicketActionRow(invoice)],
  });

  if (interaction.guild) await sendLog(interaction.guild, db.getOrderByInvoice(invoice), 'CLAIMED', `Claimed + payment sent by ${interaction.user.tag}`);

  await interaction.editReply({ content: `✅ Berhasil! Payment info dikirim ke <#${channel.id}> dan buyer sekarang bisa chat.` });
}

module.exports = { handlePaymentClaim };
