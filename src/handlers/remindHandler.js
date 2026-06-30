const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

async function handleRemind(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const pending = db.getOrders().filter(o =>
    ['ORDER CREATED', 'WAITING PAYMENT'].includes(o.status) && o.channelId
  );

  if (pending.length === 0) {
    return interaction.editReply({ content: '✅ Tidak ada order yang menunggu pembayaran.' });
  }

  let sent = 0;
  let failed = 0;

  for (const order of pending) {
    try {
      const ch = await interaction.guild.channels.fetch(order.channelId).catch(() => null);
      if (!ch) { failed++; continue; }

      const reminderEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('⏰  Pengingat Pembayaran!')
        .setDescription(
          `Hei <@${order.userId}>! Order kamu **${order.invoice}** belum selesai.\n\n` +
          `Segera lakukan pembayaran agar order diproses.`
        )
        .addFields(
          { name: '🧾 Invoice',  value: order.invoice,                               inline: true },
          { name: '🛍️ Item',    value: order.itemName || 'Cart',                     inline: true },
          { name: '💰 Total',   value: rp(order.totalPrice || order.price || 0),     inline: true },
          { name: '📊 Status',  value: order.status,                                 inline: true },
        )
        .setFooter({ text: `Pengingat dikirim oleh staff` })
        .setTimestamp();

      await ch.send({ content: `<@${order.userId}>`, embeds: [reminderEmbed] });
      sent++;
    } catch (_) {
      failed++;
    }
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('📣  Reminder Terkirim')
    .addFields(
      { name: '✅ Berhasil',  value: `**${sent}** ticket`, inline: true },
      { name: '❌ Gagal',     value: `**${failed}** ticket`, inline: true },
      { name: '📦 Total',     value: `**${pending.length}** pending`, inline: true },
    )
    .setFooter({ text: `Oleh ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { handleRemind };
