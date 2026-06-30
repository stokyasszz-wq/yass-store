const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;
const PAGE_SIZE = 5;

const statusEmoji = {
  'ORDER CREATED': '🟡', 'WAITING PAYMENT': '🟠', 'PROOF SENT': '🔵',
  'VERIFIED': '🟢', 'DONE': '⚫', 'REFUNDED': '🔄', 'CANCELLED': '❌',
};

function buildEmbed(user, orders, page) {
  const totalPages = Math.ceil(orders.length / PAGE_SIZE) || 1;
  const start = (page - 1) * PAGE_SIZE;
  const slice = orders.slice(start, start + PAGE_SIZE).reverse();

  const totalSpent = orders
    .filter(o => ['VERIFIED', 'DONE'].includes(o.status))
    .reduce((s, o) => s + (o.totalPrice || o.price || 0), 0);

  const lines = slice.map(o =>
    `${statusEmoji[o.status] || '⚪'} **\`${o.invoice}\`** — ${o.itemName || 'Cart'}\n` +
    `> 💰 ${rp(o.totalPrice || o.price || 0)} ┃ 📅 ${new Date(o.date).toLocaleDateString('id-ID')}`
  ).join('\n\n') || '_Belum ada order._';

  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`📋  Riwayat Order — ${user.username}`)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setDescription(`📦 **${orders.length}** total order ┃ 💰 Total belanja: **${rp(totalSpent)}**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${lines}`)
    .setFooter({ text: `Halaman ${page}/${totalPages} • Yass Store Bot` })
    .setTimestamp();
}

async function handleMyOrders(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const orders = db.getOrders().filter(o => o.userId === interaction.user.id);
  const sorted = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (sorted.length === 0) {
    return interaction.editReply({ content: '📭 Kamu belum punya order apapun. Mulai belanja di store!' });
  }
  const embed = buildEmbed(interaction.user, sorted, 1);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const row = totalPages > 1 ? new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('mo_prev_1').setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId('mo_next_1').setLabel('Next ▶').setStyle(ButtonStyle.Primary).setDisabled(totalPages <= 1),
  ) : null;
  await interaction.editReply({ embeds: [embed], components: row ? [row] : [] });
}

module.exports = { handleMyOrders };
