const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

async function handleSetLogChannel(interaction) {
  const channel = interaction.options.getChannel('channel');

  if (!channel.isTextBased()) {
    return interaction.reply({ content: '❌ Channel harus berupa text channel.', ephemeral: true });
  }

  db.updateSetting('logChannelId', channel.id);

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('✅  Log Channel Diperbarui')
    .addFields(
      { name: '📝 Channel Baru', value: `${channel} (\`${channel.id}\`)`, inline: false },
    )
    .setFooter({ text: `Diubah oleh ${interaction.user.tag}` })
    .setTimestamp();

  try {
    await channel.send({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.blurple)
        .setTitle('📋  Log Channel Aktif')
        .setDescription('Channel ini sekarang digunakan sebagai log transaksi Yass Store Bot.')
        .setTimestamp()],
    });
  } catch (_) {}

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { handleSetLogChannel };
