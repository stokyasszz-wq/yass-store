const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function handlePing(interaction) {
  const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true, ephemeral: true });
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  const apiLatency = Math.round(interaction.client.ws.ping);

  const bar = (ms) => {
    if (ms < 100) return '🟢 Excellent';
    if (ms < 200) return '🟡 Good';
    if (ms < 400) return '🟠 Fair';
    return '🔴 Poor';
  };

  const embed = new EmbedBuilder()
    .setColor(latency < 200 ? config.colors.success : config.colors.warning)
    .setTitle('🏓  Pong!')
    .addFields(
      { name: '⚡ Bot Latency', value: `**${latency}ms** — ${bar(latency)}`, inline: true },
      { name: '📡 API Latency', value: `**${apiLatency}ms** — ${bar(apiLatency)}`, inline: true },
    )
    .setFooter({ text: 'Yass Store Bot • Uptime Monitor' })
    .setTimestamp();

  await interaction.editReply({ content: '', embeds: [embed] });
}

module.exports = { handlePing };
