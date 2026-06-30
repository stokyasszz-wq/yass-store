const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

async function handleLeaderboard(interaction) {
  await interaction.deferReply({ ephemeral: false });

  const orders = db.getOrders().filter(o => ['VERIFIED', 'DONE'].includes(o.status));

  const userMap = {};
  for (const o of orders) {
    if (!userMap[o.userId]) {
      userMap[o.userId] = { userId: o.userId, username: o.username, total: 0, count: 0 };
    }
    userMap[o.userId].total += o.totalPrice || o.price || 0;
    userMap[o.userId].count += 1;
  }

  const sorted = Object.values(userMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  if (sorted.length === 0) {
    return interaction.editReply({ content: '📭 Belum ada transaksi selesai.' });
  }

  const medals = ['🥇', '🥈', '🥉'];
  const rankEmoji = (i) => medals[i] || `\`${String(i + 1).padStart(2, '0')}\``;

  const lines = sorted.map((u, i) =>
    `${rankEmoji(i)} <@${u.userId}> — **${rp(u.total)}** *(${u.count}x order)*`
  ).join('\n');

  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('🏆  Leaderboard — Top Buyer')
    .setDescription('Pembeli terbanyak berdasarkan total belanja.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' + lines)
    .setFooter({ text: `Yass Store Bot • ${sorted.length} buyer teratas` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { handleLeaderboard };
