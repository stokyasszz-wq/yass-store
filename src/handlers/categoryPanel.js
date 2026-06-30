const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const db = require('../db');
const config = require('../config');
const liveStore = require('../liveStore');

function categoryPanelEmbed() {
  const categories = db.getCategories();
  const lines = categories.map(c =>
    `${c.emoji} **${c.name}** — ${c.isOpen ? '🟢 OPEN' : '🔴 CLOSED'} \`${c.id}\``
  ).join('\n') || '—';

  return new EmbedBuilder()
    .setColor(config.colors.purple)
    .setTitle('📂  Category Control Panel')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    .addFields({ name: '📋  Status Kategori', value: lines })
    .setFooter({ text: 'OPEN = bisa dibeli | CLOSED = diblokir' });
}

function categoryPanelButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cp_add')   .setLabel('➕ Add Category')   .setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cp_open')  .setLabel('🟢 Open')           .setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cp_close') .setLabel('🔴 Close')          .setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cp_delete').setLabel('🗑️ Delete')         .setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('dash_back').setLabel('⬅ Back')            .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function buildCategorySelect(customId, placeholder) {
  const categories = db.getCategories();
  const options = categories.map(c =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${c.name} (${c.isOpen ? 'OPEN' : 'CLOSED'})`)
      .setValue(c.id)
      .setEmoji(c.emoji),
  );
  if (options.length === 0) return null;
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(options),
  );
}

function backButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dash_panel_category').setLabel('⬅ Back').setStyle(ButtonStyle.Secondary),
  );
}

async function showCategoryPanel(interaction) {
  await interaction.update({
    embeds: [categoryPanelEmbed()],
    components: categoryPanelButtons(),
  });
}

async function showAddCategoryModal(interaction) {
  const { showAddCategoryModal: modal } = require('./addItemHandler');
  return modal(interaction);
}

async function showOpenSelect(interaction) {
  const select = buildCategorySelect('cat_select_open', 'Pilih kategori untuk DIBUKA...');
  if (!select) return interaction.update({ embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada kategori.')], components: [backButton()] });
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('🟢 Pilih Kategori untuk DIBUKA')],
    components: [select, backButton()],
  });
}

async function showCloseSelect(interaction) {
  const select = buildCategorySelect('cat_select_close', 'Pilih kategori untuk DITUTUP...');
  if (!select) return interaction.update({ embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada kategori.')], components: [backButton()] });
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(config.colors.danger).setTitle('🔴 Pilih Kategori untuk DITUTUP')],
    components: [select, backButton()],
  });
}

async function showDeleteSelect(interaction) {
  const select = buildCategorySelect('cat_select_delete', 'Pilih kategori untuk DIHAPUS...');
  if (!select) return interaction.update({ embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada kategori.')], components: [backButton()] });
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(config.colors.danger).setTitle('🗑️ Pilih Kategori untuk DIHAPUS').setDescription('⚠️ Semua item dalam kategori ini tidak akan ikut terhapus.')],
    components: [select, backButton()],
  });
}

async function handleCategorySelectOpen(interaction) {
  const catId = interaction.values[0];
  db.updateCategory(catId, { isOpen: true });
  await liveStore.refresh();
  const cat = db.getCategoryById(catId);
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('✅ Kategori Dibuka').setDescription(`${cat.emoji} **${cat.name}** sekarang **OPEN**.`)],
    components: [backButton()],
  });
}

async function handleCategorySelectClose(interaction) {
  const catId = interaction.values[0];
  db.updateCategory(catId, { isOpen: false });
  await liveStore.refresh();
  const cat = db.getCategoryById(catId);
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(config.colors.danger).setTitle('🔴 Kategori Ditutup').setDescription(`${cat.emoji} **${cat.name}** sekarang **CLOSED**.`)],
    components: [backButton()],
  });
}

async function handleCategorySelectDelete(interaction) {
  const catId = interaction.values[0];
  const cat = db.getCategoryById(catId);
  db.deleteCategory(catId);
  await liveStore.refresh();
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(config.colors.danger).setTitle('🗑️ Kategori Dihapus').setDescription(`${cat.emoji} **${cat.name}** (\`${catId}\`) telah dihapus.`)],
    components: [backButton()],
  });
}

async function handleOpenCategory(categoryId, interaction) {
  const cat = db.getCategoryById(categoryId);
  if (!cat) return interaction.reply({ content: `❌ Kategori \`${categoryId}\` tidak ditemukan.`, ephemeral: true });
  db.updateCategory(categoryId, { isOpen: true });
  await liveStore.refresh();
  await interaction.reply({
    embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('🟢 Kategori Dibuka').setDescription(`${cat.emoji} **${cat.name}** sekarang **OPEN**.`)],
    ephemeral: true,
  });
}

async function handleCloseCategory(categoryId, interaction) {
  const cat = db.getCategoryById(categoryId);
  if (!cat) return interaction.reply({ content: `❌ Kategori \`${categoryId}\` tidak ditemukan.`, ephemeral: true });
  db.updateCategory(categoryId, { isOpen: false });
  await liveStore.refresh();
  await interaction.reply({
    embeds: [new EmbedBuilder().setColor(config.colors.danger).setTitle('🔴 Kategori Ditutup').setDescription(`${cat.emoji} **${cat.name}** sekarang **CLOSED**.`)],
    ephemeral: true,
  });
}

module.exports = {
  showCategoryPanel,
  showAddCategoryModal,
  showOpenSelect,
  showCloseSelect,
  showDeleteSelect,
  handleCategorySelectOpen,
  handleCategorySelectClose,
  handleCategorySelectDelete,
  handleOpenCategory,
  handleCloseCategory,
};
