const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const db = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

const STATUS_GROUPS = [
  { key: 'ORDER CREATED',   emoji: '🟡', label: 'ORDER CREATED' },
  { key: 'WAITING PAYMENT', emoji: '🟠', label: 'WAITING PAYMENT' },
  { key: 'PROOF SENT',      emoji: '🔵', label: 'PROOF SENT' },
  { key: 'VERIFIED',        emoji: '🟢', label: 'VERIFIED' },
  { key: 'DONE',            emoji: '⚫', label: 'DONE' },
  { key: 'REFUNDED',        emoji: '🔄', label: 'REFUNDED' },
];

async function showOrderTracker(interaction) {
  const orders = db.getOrders();

  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('📦  Order Tracker')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nStatus semua order saat ini:')
    .setTimestamp();

  for (const group of STATUS_GROUPS) {
    const groupOrders = orders.filter(o => o.status === group.key);
    if (groupOrders.length === 0) {
      embed.addFields({
        name: `${group.emoji} ${group.label}`,
        value: '*Kosong*',
        inline: true,
      });
      continue;
    }

    const lines = groupOrders.slice(-5).reverse().map(o => {
      const price = o.totalPrice || o.price || 0;
      const label = o.isCart ? `🛒 Cart (${(o.items || []).length})` : (o.itemName || '?').substring(0, 25);
      return `**${o.invoice}** — ${label} | ${rp(price)}`;
    }).join('\n');

    embed.addFields({
      name: `${group.emoji} ${group.label} (${groupOrders.length})`,
      value: lines.substring(0, 512),
      inline: false,
    });
  }

  const totalRevenue = orders
    .filter(o => ['VERIFIED', 'DONE'].includes(o.status))
    .reduce((s, o) => s + (o.totalPrice || o.price || 0), 0);

  embed.addFields({ name: '💰 Total Revenue (Verified+Done)', value: rp(totalRevenue), inline: true });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ot_refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('dash_back').setLabel('⬅ Back').setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [buttons] });
}

module.exports = { showOrderTracker };
