const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

const STARS = ['', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'];
const VERIFY_EMOJI = '<a:veriff:1521453856498651147>';

// Format: +rev [@admin] [1-5] [ulasan]
const REV_REGEX = /^\+rev\s+<@!?(\d+)>\s+([1-5])\s+(.+)$/i;

async function handleVouchMessage(message) {
  if (message.author.bot) return;

  const vouchChannelId = db.getVouchChannelId();
  if (!vouchChannelId || message.channel.id !== vouchChannelId) return;

  const match = message.content.trim().match(REV_REGEX);
  if (!match) {
    // Hapus pesan yang tidak sesuai format
    try {
      await message.delete();
    } catch (_) {}
    try {
      const warn = await message.channel.send({
        content: `${message.author} ❌ Format salah!\nGunakan: \`+rev [@admin] [1-5] [ulasan]\`\nContoh: \`+rev @EkaAdmin 5 Fast respon, trusted banget!\``,
      });
      setTimeout(() => warn.delete().catch(() => {}), 8000);
    } catch (_) {}
    return;
  }

  const [, adminId, ratingStr, ulasan] = match;
  const rating = parseInt(ratingStr);

  // Validasi mention admin/user di guild
  const guild = message.guild;
  let adminMember = null;
  try { adminMember = await guild.members.fetch(adminId); } catch (_) {}
  if (!adminMember) {
    try { await message.delete(); } catch (_) {}
    try {
      const w = await message.channel.send({ content: `${message.author} ❌ User tidak ditemukan di server ini.` });
      setTimeout(() => w.delete().catch(() => {}), 6000);
    } catch (_) {}
    return;
  }

  // Simpan review ke db
  db.addReview({
    type:       'vouch',
    invoice:    null,
    userId:     message.author.id,
    username:   message.author.tag,
    adminId:    adminId,
    adminTag:   adminMember.user.tag,
    itemName:   '—',
    rating,
    message:    ulasan.trim(),
    date:       new Date().toISOString(),
  });

  // Buat embed vouch
  const starsDisplay = STARS[rating];
  const embed = new EmbedBuilder()
    .setColor(rating >= 4 ? config.colors.success : rating === 3 ? config.colors.gold : config.colors.danger)
    .setAuthor({
      name: message.author.username,
      iconURL: message.author.displayAvatarURL({ dynamic: true }),
    })
    .setTitle(`${VERIFY_EMOJI} Vouch Baru!`)
    .setDescription(`> ${ulasan.trim()}`)
    .addFields(
      { name: '⭐ Rating',   value: starsDisplay,                     inline: true },
      { name: '👤 Buyer',    value: `<@${message.author.id}>`,         inline: true },
      { name: '🛡️ Admin',   value: `<@${adminId}>`,                   inline: true },
    )
    .setThumbnail(adminMember.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: 'Yass Store Bot • Vouch System' })
    .setTimestamp();

  // Hapus pesan asli, kirim embed
  try { await message.delete(); } catch (_) {}

  const sent = await message.channel.send({ embeds: [embed] });

  // React dengan animated emoji verify
  try {
    await sent.react(VERIFY_EMOJI);
  } catch (_) {
    // Jika bot tidak punya emoji tersebut, fallback ke ⭐
    try { await sent.react('⭐'); } catch (_2) {}
  }
}

async function handleSetVouchChannel(interaction) {
  const channel = interaction.options.getChannel('channel');
  db.setVouchChannelId(channel.id);
  return interaction.reply({
    content: `✅ Channel vouch diset ke ${channel}!\nBuyer bisa kirim vouch dengan format:\n\`+rev [@admin] [1-5] [ulasan]\``,
    ephemeral: true,
  });
}

module.exports = { handleVouchMessage, handleSetVouchChannel };
