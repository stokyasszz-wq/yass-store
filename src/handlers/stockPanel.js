const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const db = require('../db');
const config = require('../config');
const liveStore = require('../liveStore');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

const pendingStockAdd    = new Map();
const pendingStockReduce = new Map();

function stockPanelEmbed() {
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('📦  Stock Management Panel')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    .addFields({
      name: '📋  Actions',
      value:
        '• **Add Stock** — Tambah jumlah stock\n' +
        '• **Reduce Stock** — Kurangi jumlah stock\n' +
        '• **View Stock** — Lihat semua stock\n' +
        '• **Ubah Harga** — Ubah harga item via pilihan\n' +
        '• **Add Item** — Tambah item baru\n' +
        '• **Remove Item** — Hapus item',
    })
    .setFooter({ text: 'Yass Store Bot • Stock Management' });
}

function stockPanelButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('sp_add')        .setLabel('➕ Add Stock')    .setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('sp_reduce')     .setLabel('➖ Reduce Stock') .setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('sp_view')       .setLabel('📋 View Stock')   .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('sp_set_price')  .setLabel('💰 Ubah Harga')   .setStyle(ButtonStyle.Primary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('sp_add_item')   .setLabel('🆕 Add Item')     .setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('sp_remove_item').setLabel('🗑️ Remove Item')  .setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('dash_back')     .setLabel('⬅ Back')          .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function backToStockButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dash_panel_stock').setLabel('⬅ Back').setStyle(ButtonStyle.Secondary),
  );
}

function buildCategorySelect(customId, title) {
  const categories = db.getCategories();
  if (categories.length === 0) return null;
  const options = categories.map(c =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${c.emoji} ${c.name}`)
      .setValue(c.id)
      .setDescription(c.isOpen ? '🟢 Open' : '🔴 Closed'),
  );
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(`Pilih kategori untuk ${title}...`)
      .addOptions(options),
  );
}

async function showStockPanel(interaction) {
  await interaction.update({ embeds: [stockPanelEmbed()], components: stockPanelButtons() });
}

async function showAddStockModal(interaction) {
  const select = buildCategorySelect('sp_add_cat', 'Add Stock');
  if (!select) {
    return interaction.update({
      embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Belum ada kategori.')],
      components: [backToStockButton()],
    });
  }
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle('➕ Add Stock — Langkah 1/3').setDescription('Pilih **kategori** item yang ingin ditambah stocknya:')],
    components: [select, backToStockButton()],
  });
}

async function showAddStockItemSelect(interaction) {
  const catId = interaction.values[0];
  const cat = db.getCategoryById(catId);
  const items = db.getItemsByCategory(catId);
  const stock = db.getStock();
  if (items.length === 0) {
    return interaction.update({
      embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada item di kategori ini.')],
      components: [backToStockButton()],
    });
  }
  const options = items.slice(0, 25).map(item =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${item.emoji} ${item.name}`.substring(0, 100))
      .setValue(item.id)
      .setDescription(`Stok saat ini: ${stock[item.id] ?? 0}`.substring(0, 100)),
  );
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(config.colors.success).setTitle(`➕ Add Stock — ${cat.emoji} ${cat.name}`).setDescription('Pilih **item** yang ingin ditambah stocknya:')],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('sp_add_item_sel').setPlaceholder('Pilih item...').addOptions(options),
      ),
      backToStockButton(),
    ],
  });
}

async function showAddStockQtyModal(interaction) {
  const itemId = interaction.values[0];
  const item = db.getItemById(itemId);
  if (!item) return interaction.reply({ content: '❌ Item tidak ditemukan.', ephemeral: true });
  const stock = db.getStock();
  pendingStockAdd.set(interaction.user.id, itemId);
  const modal = new ModalBuilder().setCustomId('modal_stock_add').setTitle(`Add Stock: ${item.name}`.substring(0, 45));
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('amount')
        .setLabel(`Tambah berapa? (stok saat ini: ${stock[itemId] ?? 0})`.substring(0, 45))
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: 10')
        .setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

async function handleAddStockModal(interaction) {
  const itemId = pendingStockAdd.get(interaction.user.id);
  if (!itemId) return interaction.reply({ content: '❌ Sesi expired. Ulangi dari awal.', ephemeral: true });

  const amount = parseInt(interaction.fields.getTextInputValue('amount'));
  if (isNaN(amount) || amount <= 0) return interaction.reply({ content: '❌ Jumlah harus angka positif!', ephemeral: true });

  const item = db.getItemById(itemId);
  if (!item) return interaction.reply({ content: '❌ Item tidak ditemukan.', ephemeral: true });

  const stock = db.getStock();
  stock[itemId] = (stock[itemId] || 0) + amount;
  db.setStock(stock);
  pendingStockAdd.delete(interaction.user.id);
  await liveStore.refresh();

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('✅ Stock Ditambahkan')
    .addFields(
      { name: '🛍️ Item',  value: `${item.emoji} ${item.name}`, inline: true },
      { name: '➕ Tambah', value: `${amount}`,                  inline: true },
      { name: '📊 Total',  value: `${stock[itemId]}`,           inline: true },
    ).setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showReduceStockModal(interaction) {
  const select = buildCategorySelect('sp_reduce_cat', 'Reduce Stock');
  if (!select) {
    return interaction.update({
      embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Belum ada kategori.')],
      components: [backToStockButton()],
    });
  }
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(config.colors.danger).setTitle('➖ Reduce Stock — Langkah 1/3').setDescription('Pilih **kategori** item yang ingin dikurangi stocknya:')],
    components: [select, backToStockButton()],
  });
}

async function showReduceStockItemSelect(interaction) {
  const catId = interaction.values[0];
  const cat = db.getCategoryById(catId);
  const items = db.getItemsByCategory(catId);
  const stock = db.getStock();
  if (items.length === 0) {
    return interaction.update({
      embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada item di kategori ini.')],
      components: [backToStockButton()],
    });
  }
  const options = items.slice(0, 25).map(item =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${item.emoji} ${item.name}`.substring(0, 100))
      .setValue(item.id)
      .setDescription(`Stok saat ini: ${stock[item.id] ?? 0}`.substring(0, 100)),
  );
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(config.colors.danger).setTitle(`➖ Reduce Stock — ${cat.emoji} ${cat.name}`).setDescription('Pilih **item** yang ingin dikurangi stocknya:')],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('sp_reduce_item_sel').setPlaceholder('Pilih item...').addOptions(options),
      ),
      backToStockButton(),
    ],
  });
}

async function showReduceStockQtyModal(interaction) {
  const itemId = interaction.values[0];
  const item = db.getItemById(itemId);
  if (!item) return interaction.reply({ content: '❌ Item tidak ditemukan.', ephemeral: true });
  const stock = db.getStock();
  pendingStockReduce.set(interaction.user.id, itemId);
  const modal = new ModalBuilder().setCustomId('modal_stock_reduce').setTitle(`Reduce Stock: ${item.name}`.substring(0, 45));
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('amount')
        .setLabel(`Kurangi berapa? (stok saat ini: ${stock[itemId] ?? 0})`.substring(0, 45))
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: 5')
        .setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

async function handleReduceStockModal(interaction) {
  const itemId = pendingStockReduce.get(interaction.user.id);
  if (!itemId) return interaction.reply({ content: '❌ Sesi expired. Ulangi dari awal.', ephemeral: true });

  const amount = parseInt(interaction.fields.getTextInputValue('amount'));
  if (isNaN(amount) || amount <= 0) return interaction.reply({ content: '❌ Jumlah harus angka positif!', ephemeral: true });

  const item = db.getItemById(itemId);
  if (!item) return interaction.reply({ content: '❌ Item tidak ditemukan.', ephemeral: true });

  const stock = db.getStock();
  const current = stock[itemId] || 0;
  stock[itemId] = Math.max(0, current - amount);
  db.setStock(stock);
  pendingStockReduce.delete(interaction.user.id);
  await liveStore.refresh();

  const embed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle('⚠️ Stock Dikurangi')
    .addFields(
      { name: '🛍️ Item',  value: `${item.emoji} ${item.name}`, inline: true },
      { name: '➖ Kurang', value: `${amount}`,                  inline: true },
      { name: '📊 Total',  value: `${stock[itemId]}`,           inline: true },
    ).setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showStockView(interaction) {
  const stock = db.getStock();
  const categories = db.getCategories();
  const items = db.getItems();

  const embed = new EmbedBuilder().setColor(config.colors.gold).setTitle('📦  Current Stock').setTimestamp();

  for (const cat of categories) {
    const catItems = items.filter(i => i.categoryId === cat.id);
    if (catItems.length === 0) continue;
    const lines = catItems.map(i => {
      const stk = stock[i.id] ?? 0;
      const shortName = i.name.substring(0, 22).padEnd(22);
      return `${stk > 0 ? '✅' : '❌'} \`${shortName}\` ${stk}`;
    }).join('\n');
    embed.addFields({ name: `${cat.emoji} ${cat.name}`, value: lines.substring(0, 1024) || '—', inline: false });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = {
  showStockPanel, stockPanelButtons,
  showAddStockModal, showAddStockItemSelect, showAddStockQtyModal, handleAddStockModal,
  showReduceStockModal, showReduceStockItemSelect, showReduceStockQtyModal, handleReduceStockModal,
  showStockView,
};
