const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

async function getOrCreateHistoryChannel(guild) {
  const settings = db.getSettings();
  const savedId = settings.historyChannelId || null;

  if (savedId) {
    try {
      const ch = await guild.channels.fetch(savedId).catch(() => null);
      if (ch) return ch;
    } catch (_) {}
  }

  return null;
}

async function postOrderDone(guild, order, doneBy) {
  try {
    const ch = await getOrCreateHistoryChannel(guild);
    if (!ch) return;

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('✅  Order Selesai!')
      .setDescription(`Order **${order.invoice}** telah berhasil diselesaikan.`)
      .addFields(
        { name: '🧾 Invoice',    value: `\`${order.invoice}\``,                             inline: true },
        { name: '👤 Pembeli',    value: `<@${order.userId}> (${order.username})`,            inline: true },
        { name: '🛍️ Item',      value: order.itemName || (order.isCart ? 'Cart Order' : '—'), inline: true },
        { name: '💰 Total',      value: rp(order.totalPrice || order.price || 0),            inline: true },
        { name: '👮 Staff',      value: doneBy,                                              inline: true },
        { name: '📅 Selesai',    value: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB', inline: true },
      )
      .setFooter({ text: 'Yass Store Bot • Riwayat Order' })
      .setTimestamp();

    await ch.send({ embeds: [embed] });
  } catch (err) {
    console.error('[HistoryChannel] Gagal kirim riwayat order:', err.message);
  }
}

async function handleSetHistoryChannel(interaction) {
  if (!interaction.member.roles.cache.has(config.staffRoleId))
    return interaction.reply({ content: '❌ Hanya staff yang bisa menggunakan command ini!', ephemeral: true });

  const channel = interaction.options.getChannel('channel');

  db.updateSetting('historyChannelId', channel.id);

  await interaction.reply({
    content: `✅ Channel riwayat order berhasil diset ke <#${channel.id}>!\nSetiap order yang selesai (Done) akan otomatis dipost di sana.`,
    ephemeral: true,
  });
}

module.exports = { postOrderDone, handleSetHistoryChannel, getOrCreateHistoryChannel };
