const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

async function handleBan(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'Tidak ada alasan';

  if (target.id === interaction.user.id) {
    return interaction.editReply({ content: '❌ Tidak bisa ban diri sendiri.' });
  }
  if (target.bot) {
    return interaction.editReply({ content: '❌ Tidak bisa ban bot.' });
  }
  if (db.isBanned(target.id)) {
    return interaction.editReply({ content: `❌ **${target.username}** sudah di-ban sebelumnya.` });
  }

  db.addBan(target.id, reason, interaction.user.tag);

  const embed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle('🔨  User Di-ban dari Store')
    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '👤 User',     value: `<@${target.id}> (${target.tag})`, inline: true },
      { name: '🔨 Di-ban oleh', value: interaction.user.tag,          inline: true },
      { name: '📝 Alasan',  value: reason,                             inline: false },
    )
    .setFooter({ text: 'User ini tidak bisa melakukan order di store' })
    .setTimestamp();

  try {
    await target.send({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle('🔨  Kamu Di-ban dari Yass Store')
        .setDescription(`Kamu tidak bisa melakukan order di store.\n**Alasan:** ${reason}\n\nHubungi staff jika ada kesalahan.`)
        .setTimestamp()],
    });
  } catch (_) {}

  await interaction.editReply({ embeds: [embed] });
}

async function handleUnban(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getUser('user');

  if (!db.isBanned(target.id)) {
    return interaction.editReply({ content: `❌ **${target.username}** tidak ada dalam daftar ban.` });
  }

  db.removeBan(target.id);

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('✅  User Di-unban')
    .addFields(
      { name: '👤 User',       value: `<@${target.id}> (${target.tag})`, inline: true },
      { name: '✅ Di-unban oleh', value: interaction.user.tag,           inline: true },
    )
    .setTimestamp();

  try {
    await target.send({
      embeds: [new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅  Kamu Sudah Di-unban dari Yass Store')
        .setDescription('Kamu sudah bisa melakukan order kembali di store.')
        .setTimestamp()],
    });
  } catch (_) {}

  await interaction.editReply({ embeds: [embed] });
}

async function handleBanList(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const bans = db.getBans();
  const entries = Object.entries(bans);

  if (entries.length === 0) {
    return interaction.editReply({ content: '✅ Tidak ada user yang di-ban.' });
  }

  const lines = entries.map(([uid, info]) =>
    `🔨 <@${uid}> — **${info.reason || '-'}** *(ban oleh: ${info.bannedBy || '-'})* — ${new Date(info.date).toLocaleDateString('id-ID')}`
  ).join('\n');

  const embed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle(`🔨  Daftar Ban — ${entries.length} user`)
    .setDescription(lines.substring(0, 4096))
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { handleBan, handleUnban, handleBanList };
