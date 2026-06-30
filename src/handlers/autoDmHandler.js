const { EmbedBuilder } = require('discord.js');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

async function dmOrderVerified(client, order) {
  try {
    const user = await client.users.fetch(order.userId);
    if (!user) return;
    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('✅ Pembayaranmu Terverifikasi!')
      .setDescription(`Hei **${user.username}**! Kabar baik — pembayaranmu sudah diverifikasi oleh staff. 🎉`)
      .addFields(
        { name: '🧾 Invoice',   value: `\`${order.invoice}\``,              inline: true },
        { name: '🛍️ Item',     value: order.itemName || '—',                inline: true },
        { name: '💰 Total',    value: rp(order.totalPrice || order.price || 0), inline: true },
        { name: '📋 Status',   value: '🟢 VERIFIED',                        inline: true },
        { name: '⏱️ Selanjutnya', value: 'Item akan segera diproses oleh staff. Pantau ticket channelmu!', inline: false },
      )
      .setFooter({ text: 'Yass Store Bot • Terima kasih sudah berbelanja!' })
      .setTimestamp();
    await user.send({ embeds: [embed] });
  } catch (_) {}
}

async function dmOrderDone(client, order) {
  try {
    const user = await client.users.fetch(order.userId);
    if (!user) return;
    const embed = new EmbedBuilder()
      .setColor(config.colors.gold)
      .setTitle('🎉 Order Selesai!')
      .setDescription(`Hei **${user.username}**! Order kamu sudah selesai. Terima kasih sudah belanja di **Yass Store**!`)
      .addFields(
        { name: '🧾 Invoice', value: `\`${order.invoice}\``,              inline: true },
        { name: '🛍️ Item',   value: order.itemName || '—',                inline: true },
        { name: '💰 Total',  value: rp(order.totalPrice || order.price || 0), inline: true },
        { name: '⭐ Review',  value: `Bantu kami berkembang! Ketik \`/review ${order.invoice}\` untuk beri rating.`, inline: false },
      )
      .setFooter({ text: 'Yass Store Bot • Sampai jumpa lagi!' })
      .setTimestamp();
    await user.send({ embeds: [embed] });
  } catch (_) {}
}

async function dmOrderCancelled(client, order, reason) {
  try {
    const user = await client.users.fetch(order.userId);
    if (!user) return;
    const embed = new EmbedBuilder()
      .setColor(config.colors.danger)
      .setTitle('❌ Order Dibatalkan')
      .addFields(
        { name: '🧾 Invoice', value: `\`${order.invoice}\``, inline: true },
        { name: '🛍️ Item',   value: order.itemName || '—',   inline: true },
        { name: '📝 Alasan', value: reason || 'Tidak ada alasan.', inline: false },
        { name: '🔄 Lanjut', value: 'Kamu bisa order lagi kapan saja di server kami.', inline: false },
      )
      .setFooter({ text: 'Yass Store Bot' })
      .setTimestamp();
    await user.send({ embeds: [embed] });
  } catch (_) {}
}

module.exports = { dmOrderVerified, dmOrderDone, dmOrderCancelled };
