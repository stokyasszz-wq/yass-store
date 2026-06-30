const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

const statusEmoji = {
  'ORDER CREATED': '🟡', 'WAITING PAYMENT': '🟠', 'PROOF SENT': '🔵',
  'VERIFIED': '🟢', 'DONE': '⚫', 'REFUNDED': '🔄', 'CANCELLED': '❌',
};

async function handleOrderHistory(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser('user');
  const orders = db.getOrders()
    .filter(o => o.userId === target.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (orders.length === 0) {
    return interaction.editReply({ content: `📭 **${target.username}** belum memiliki order apapun.` });
  }

  const totalSpent = orders
    .filter(o => ['VERIFIED', 'DONE'].includes(o.status))
    .reduce((s, o) => s + (o.totalPrice || o.price || 0), 0);

  const lines = orders.slice(0, 15).map(o =>
    `${statusEmoji[o.status] || '⚪'} \`${o.invoice}\` — **${o.itemName || 'Cart'}**\n` +
    `> 💰 ${rp(o.totalPrice || o.price || 0)} ┃ 📅 ${new Date(o.date).toLocaleDateString('id-ID')}`
  ).join('\n\n');

  const isBanned = db.isBanned(target.id);
  const banInfo  = isBanned ? db.getBans()[target.id] : null;

  const embed = new EmbedBuilder()
    .setColor(isBanned ? config.colors.danger : config.colors.primary)
    .setTitle(`📋  Riwayat Order — ${target.username}`)
    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
    .setDescription(
      (isBanned ? `🔨 **User ini sedang di-ban!**\nAlasan: ${banInfo?.reason || '-'}\n\n` : '') +
      `📦 **${orders.length}** total order ┃ 💰 Total belanja: **${rp(totalSpent)}**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${lines}` +
      (orders.length > 15 ? `\n\n_...dan ${orders.length - 15} order lainnya_` : '')
    )
    .setFooter({ text: `User ID: ${target.id} • Yass Store Bot` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { handleOrderHistory };
