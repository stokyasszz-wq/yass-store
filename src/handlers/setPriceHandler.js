const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const db = require('../db');
const config = require('../config');
const liveStore = require('../liveStore');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

const pendingPriceChange = new Map();

async function showCategorySelect(interaction) {
  const categories = db.getCategories();

  const options = categories.map(cat =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${cat.emoji} ${cat.name}`)
      .setValue(cat.id)
      .setDescription(cat.isOpen ? '🟢 Open' : '🔴 Closed'),
  );

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('💰  Ubah Harga Item')
    .setDescription('**Langkah 1/2** — Pilih kategori:');

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('sp_price_cat')
      .setPlaceholder('Pilih kategori...')
      .addOptions(options),
  );

  await interaction.update({ embeds: [embed], components: [row] });
}

async function showItemSelect(interaction) {
  const catId = interaction.values[0];
  const cat = db.getCategoryById(catId);
  if (!cat) return interaction.reply({ content: '❌ Kategori tidak ditemukan.', ephemeral: true });

  const items = db.getItemsByCategory(catId);
  if (items.length === 0) {
    return interaction.update({
      embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada item di kategori ini.')],
      components: [],
    });
  }

  const options = items.slice(0, 25).map(item =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${item.emoji} ${item.name}`.substring(0, 100))
      .setValue(item.id)
      .setDescription(`Harga saat ini: ${rp(item.price)}`.substring(0, 100)),
  );

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`💰  Ubah Harga — ${cat.emoji} ${cat.name}`)
    .setDescription('**Langkah 2/2** — Pilih item yang ingin diubah harganya:');

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('sp_price_item')
      .setPlaceholder('Pilih item...')
      .addOptions(options),
  );

  await interaction.update({ embeds: [embed], components: [row] });
}

async function showPriceModal(interaction) {
  const itemId = interaction.values[0];
  const item = db.getItemById(itemId);
  if (!item) return interaction.reply({ content: '❌ Item tidak ditemukan.', ephemeral: true });

  pendingPriceChange.set(interaction.user.id, itemId);

  const modal = new ModalBuilder()
    .setCustomId('modal_price_set')
    .setTitle(`Ubah Harga: ${item.name}`.substring(0, 45));

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('new_price')
        .setLabel(`Harga baru (saat ini: ${rp(item.price)})`.substring(0, 45))
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: 50000')
        .setValue(String(item.price))
        .setRequired(true),
    ),
  );

  await interaction.showModal(modal);
}

async function handlePriceModal(interaction) {
  const itemId = pendingPriceChange.get(interaction.user.id);
  if (!itemId) {
    return interaction.reply({ content: '❌ Sesi expired. Ulangi dari awal.', ephemeral: true });
  }

  const raw = interaction.fields.getTextInputValue('new_price').trim().replace(/[^\d]/g, '');
  const newPrice = parseInt(raw);

  if (isNaN(newPrice) || newPrice <= 0) {
    return interaction.reply({ content: '❌ Harga tidak valid. Masukkan angka saja (contoh: `50000`).', ephemeral: true });
  }

  const item = db.getItemById(itemId);
  if (!item) return interaction.reply({ content: '❌ Item tidak ditemukan.', ephemeral: true });

  const oldPrice = item.price;
  db.updateItem(itemId, { price: newPrice });
  pendingPriceChange.delete(interaction.user.id);
  await liveStore.refresh();

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('✅ Harga Berhasil Diubah')
    .addFields(
      { name: '🛍️ Item',       value: `${item.emoji} ${item.name}`, inline: false },
      { name: '💰 Harga Lama', value: rp(oldPrice),                 inline: true },
      { name: '✅ Harga Baru', value: rp(newPrice),                 inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { showCategorySelect, showItemSelect, showPriceModal, handlePriceModal };
