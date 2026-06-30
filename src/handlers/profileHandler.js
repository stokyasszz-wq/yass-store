const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

const statusEmoji = {
  'ORDER CREATED': '🟡',
  'WAITING PAYMENT': '🟠',
  'PROOF SENT': '🔵',
  'VERIFIED': '🟢',
  'DONE': '⚫',
  'REFUNDED': '🔄',
  'CANCELLED': '❌',
};

async function handleProfile(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const targetUser = interaction.options.getUser('user') || interaction.user;
  const orders = db.getOrders().filter(o => o.userId === targetUser.id);

  const totalSpent = orders
    .filter(o => ['VERIFIED', 'DONE'].includes(o.status))
    .reduce((s, o) => s + (o.totalPrice || o.price || 0), 0);

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => ['VERIFIED', 'DONE'].includes(o.status)).length;
  const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
  const pendingOrders = orders.filter(o => !['DONE', 'VERIFIED', 'CANCELLED', 'REFUNDED'].includes(o.status)).length;

  const rank =
    totalSpent >= 1_000_000 ? '💎 Diamond Member' :
    totalSpent >= 500_000  ? '🥇 Gold Member' :
    totalSpent >= 200_000  ? '🥈 Silver Member' :
    totalSpent >= 50_000   ? '🥉 Bronze Member' :
                              '🆕 New Member';

  const recentOrders = orders.slice(-5).reverse();
  const recentLines = recentOrders.length > 0
    ? recentOrders.map(o =>
        `${statusEmoji[o.status] || '⚪'} \`${o.invoice}\` — ${o.itemName || 'Cart'} — **${rp(o.totalPrice || o.price || 0)}**`
      ).join('\n')
    : '_Belum ada order._';

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`👤  Profil — ${targetUser.username}`)
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
    .setDescription(`**${rank}**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    .addFields(
      { name: '📦 Total Order',       value: `**${totalOrders}**`,      inline: true },
      { name: '✅ Selesai',            value: `**${completedOrders}**`,  inline: true },
      { name: '⏳ Pending',            value: `**${pendingOrders}**`,    inline: true },
      { name: '❌ Dibatalkan',         value: `**${cancelledOrders}**`,  inline: true },
      { name: '💰 Total Belanja',      value: `**${rp(totalSpent)}**`,   inline: true },
      { name: '\u200B',               value: '\u200B',                   inline: true },
      { name: '📋 5 Order Terakhir',   value: recentLines,               inline: false },
    )
    .setFooter({ text: `Yass Store Bot • User ID: ${targetUser.id}` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { handleProfile };
