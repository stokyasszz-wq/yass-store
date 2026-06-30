const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

async function showCartMonitor(interaction) {
  const allCarts = db.getAllCarts();
  const userIds = Object.keys(allCarts);

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🛒  Cart Monitor')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nSemua cart aktif pengguna:')
    .setTimestamp();

  if (userIds.length === 0) {
    embed.setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n*Tidak ada cart aktif saat ini.*');
  } else {
    const fields = userIds.slice(0, 10).map(uid => {
      const cart = allCarts[uid];
      const total = cart.reduce((s, i) => s + i.price * (i.quantity || 1), 0);
      const itemList = cart.map(i => `• ${i.emoji} ${i.name} ×${i.quantity || 1}`).join('\n').substring(0, 200);
      return {
        name: `👤 <@${uid}>`,
        value: `${itemList}\n💰 **Total: ${rp(total)}**`,
        inline: false,
      };
    });
    embed.addFields(fields);
    embed.setFooter({ text: `${userIds.length} cart aktif` });
  }

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cm_refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('dash_back').setLabel('⬅ Back').setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [buttons] });
}

module.exports = { showCartMonitor };
