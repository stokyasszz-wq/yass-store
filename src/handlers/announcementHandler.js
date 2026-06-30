const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function handleAnnouncement(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.options.getChannel('channel');
  const message = interaction.options.getString('message');
  const title   = interaction.options.getString('title') || '📢  Pengumuman — Yass Store';
  const ping    = interaction.options.getBoolean('ping') ?? false;

  if (!channel.isTextBased()) {
    return interaction.editReply({ content: '❌ Channel harus berupa text channel.' });
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(title)
    .setDescription(message)
    .setFooter({ text: `Diumumkan oleh ${interaction.user.tag} • Yass Store Bot` })
    .setTimestamp();

  const content = ping ? `<@&${config.staffRoleId}> @everyone` : null;

  try {
    await channel.send({ content, embeds: [embed] });
    await interaction.editReply({
      content: `✅ Pengumuman berhasil dikirim ke ${channel}!`,
    });
  } catch (err) {
    await interaction.editReply({ content: `❌ Gagal kirim ke ${channel}: ${err.message}` });
  }
}

module.exports = { handleAnnouncement };
