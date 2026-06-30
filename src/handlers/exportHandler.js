const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

async function handleExportOrders(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const filter = interaction.options.getString('filter') || 'all';
  let orders = db.getOrders();

  if (filter !== 'all') {
    orders = orders.filter(o => o.status.toLowerCase().replace(/\s+/g, '_') === filter ||
      o.status === filter.toUpperCase().replace(/_/g, ' '));
  }

  if (orders.length === 0) {
    return interaction.editReply({ content: '📭 Tidak ada order yang cocok untuk diekspor.' });
  }

  const header = '"Invoice","Username","UserID","Item","Harga","TotalHarga","Status","Tanggal","IsCart"\n';
  const rows = orders.map(o => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [
      esc(o.invoice),
      esc(o.username),
      esc(o.userId),
      esc(o.itemName || 'Cart'),
      esc(o.price || 0),
      esc(o.totalPrice || o.price || 0),
      esc(o.status),
      esc(new Date(o.date).toLocaleString('id-ID')),
      esc(o.isCart ? 'Ya' : 'Tidak'),
    ].join(',');
  }).join('\n');

  const csvBuffer = Buffer.from('\uFEFF' + header + rows, 'utf-8');
  const filename  = `orders-export-${filter}-${Date.now()}.csv`;
  const file      = new AttachmentBuilder(csvBuffer, { name: filename });

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('📊  Export Orders Berhasil')
    .addFields(
      { name: '📦 Total Diekspor', value: `**${orders.length}** order`, inline: true },
      { name: '🔍 Filter',         value: filter,                        inline: true },
    )
    .setFooter({ text: `Oleh ${interaction.user.tag} • Yass Store Bot` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed], files: [file] });
}

module.exports = { handleExportOrders };
