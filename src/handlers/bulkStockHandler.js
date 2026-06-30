const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');
const db = require('../db');
const config = require('../config');
const liveStore = require('../liveStore');

async function showBulkStockModal(interaction) {
  const items = db.getItems();
  const preview = items.slice(0, 5).map(i => `${i.id}:10`).join('\n');

  const modal = new ModalBuilder()
    .setCustomId('modal_bulk_stock')
    .setTitle('📦  Bulk Add Stock');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('bulk_input')
        .setLabel('Format: id-item:jumlah (satu per baris)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(preview + '\n...')
        .setRequired(true)
        .setMaxLength(2000),
    ),
  );

  await interaction.showModal(modal);
}

async function handleBulkStockModal(interaction) {
  const raw = interaction.fields.getTextInputValue('bulk_input').trim();
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  const stock = db.getStock();
  const successLines = [];
  const failedLines  = [];

  for (const line of lines) {
    const parts = line.split(':');
    if (parts.length < 2) { failedLines.push(`\`${line}\` — format salah (gunakan id:jumlah)`); continue; }

    const itemId = parts[0].trim();
    const qty    = parseInt(parts[1].trim());

    if (isNaN(qty) || qty <= 0) { failedLines.push(`\`${line}\` — jumlah tidak valid`); continue; }

    const item = db.getItemById(itemId);
    if (!item) { failedLines.push(`\`${itemId}\` — item tidak ditemukan`); continue; }

    stock[itemId] = (stock[itemId] || 0) + qty;
    successLines.push(`${item.emoji} **${item.name}** +${qty} → total **${stock[itemId]}**`);
  }

  if (successLines.length > 0) {
    db.setStock(stock);
    await liveStore.refresh();
  }

  const fields = [];
  if (successLines.length > 0) fields.push({ name: `✅ Berhasil (${successLines.length})`, value: successLines.join('\n').substring(0, 1024) });
  if (failedLines.length  > 0) fields.push({ name: `❌ Gagal (${failedLines.length})`,    value: failedLines.join('\n').substring(0, 1024) });

  const embed = new EmbedBuilder()
    .setColor(failedLines.length === 0 ? config.colors.success : config.colors.warning)
    .setTitle('📦  Bulk Stock Result')
    .addFields(...fields)
    .setFooter({ text: `Oleh ${interaction.user.tag} • Yass Store Bot` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { showBulkStockModal, handleBulkStockModal };
