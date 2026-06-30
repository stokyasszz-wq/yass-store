const {
  EmbedBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const db = require('../db');
const config = require('../config');
const liveStore = require('../liveStore');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

async function showAddItemModal(interaction) {
  const cats = db.getCategories();
  const catIds = cats.map(c => c.id).join(' / ');

  const modal = new ModalBuilder()
    .setCustomId('modal_add_item')
    .setTitle('➕ Add New Item');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('item_name')
        .setLabel('Nama Item')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: Dark Sword x1')
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('item_price')
        .setLabel('Harga / Jumlah Robux (jika type=gig)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Harga: 35000 | GiG: isi jumlah Robux, mis: 999')
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('item_stock')
        .setLabel('Stock awal')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: 10')
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('item_category')
        .setLabel('Category ID')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(catIds.substring(0, 100))
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('item_type')
        .setLabel('Tipe (normal/gig/robux/gamepass/crate)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('normal')
        .setRequired(false),
    ),
  );

  await interaction.showModal(modal);
}

async function handleAddItemModal(interaction) {
  const name     = interaction.fields.getTextInputValue('item_name').trim();
  const priceRaw = interaction.fields.getTextInputValue('item_price').trim().replace(/\D/g, '');
  const stockRaw = interaction.fields.getTextInputValue('item_stock').trim();
  const catId    = interaction.fields.getTextInputValue('item_category').trim().toLowerCase();
  const type     = interaction.fields.getTextInputValue('item_type').trim().toLowerCase() || 'normal';

  const price = parseInt(priceRaw);
  const stock = parseInt(stockRaw);

  const isGigType = type === 'gig';
  if (!name || isNaN(price) || price <= 0) {
    const hint = isGigType ? 'Untuk type gig, isi jumlah Robux (contoh: 999).' : '';
    return interaction.reply({ content: `❌ Nama dan harga wajib diisi dengan benar. ${hint}`, ephemeral: true });
  }
  if (isNaN(stock) || stock < 0) {
    return interaction.reply({ content: '❌ Stock harus berupa angka non-negatif.', ephemeral: true });
  }

  const cat = db.getCategoryById(catId);
  if (!cat) {
    const cats = db.getCategories();
    const list = cats.map(c => `\`${c.id}\``).join(', ');
    return interaction.reply({
      content: `❌ Kategori \`${catId}\` tidak ditemukan.\nTersedia: ${list}`,
      ephemeral: true,
    });
  }

  const emojiMap = {
    normal: '🛍️', gig: '🎮', robux: '💰', gift: '🎁',
    gamepass: '🎮', crate: '📦', boost: '⚡',
  };

  const slug   = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const short  = slug.substring(0, 20);
  const itemId = `${type}-${short}-${Date.now() % 100000}`.substring(0, 50);

  let newItem;
  let priceDisplay;

  if (type === 'gig') {
    // Untuk GiG: price field diisi robuxAmount, harga dihitung otomatis
    const robuxAmount = price; // user input = jumlah Robux
    const gigRate     = db.getGigRate();
    const calcPrice   = robuxAmount * gigRate;
    newItem = {
      id:           itemId,
      categoryId:   catId,
      name,
      price:        0,          // selalu 0, dihitung dinamis
      robuxAmount,              // jumlah Robux item ini
      emoji:        emojiMap[type] || '🎮',
      type:         'gig',
      defaultStock: stock,
    };
    priceDisplay = `©${robuxAmount} R$ = ${rp(calcPrice)} (rate Rp${gigRate}/R$)`;
  } else {
    newItem = {
      id:           itemId,
      categoryId:   catId,
      name,
      price,
      emoji:        emojiMap[type] || '🛍️',
      type,
      defaultStock: stock,
    };
    priceDisplay = rp(price);
  }

  const ok = db.addItem(newItem);
  if (!ok) {
    return interaction.reply({ content: '❌ Gagal menambah item. Coba lagi.', ephemeral: true });
  }

  await liveStore.refresh();

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('✅ Item Berhasil Ditambahkan')
    .addFields(
      { name: '🆔 ID',       value: `\`${itemId}\``,           inline: false },
      { name: '🛍️ Nama',    value: name,                       inline: true },
      { name: '💰 Harga',    value: priceDisplay,               inline: true },
      { name: '📦 Stock',    value: `${stock}`,                 inline: true },
      { name: '📂 Category', value: `${cat.emoji} ${cat.name}`, inline: true },
      { name: '🔖 Type',     value: type,                       inline: true },
    )
    .setFooter({ text: `ID: ${itemId}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showRemoveItemSlashModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_remove_item')
    .setTitle('🗑️ Hapus Item dari Store');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('item_id')
        .setLabel('ID Item yang ingin dihapus')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: freefire-dark-sword-12345')
        .setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

async function showRemoveItemModal(interaction) {
  const categories = db.getCategories();
  if (categories.length === 0) {
    return interaction.update({
      embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Belum ada kategori.')],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dash_panel_stock').setLabel('⬅ Back').setStyle(ButtonStyle.Secondary),
      )],
    });
  }

  const options = categories.map(c =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${c.emoji} ${c.name}`)
      .setValue(c.id),
  );

  await interaction.update({
    embeds: [new EmbedBuilder()
      .setColor(config.colors.danger)
      .setTitle('🗑️ Remove Item — Langkah 1/3')
      .setDescription('Pilih **kategori** item yang ingin dihapus:')],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('sp_remove_cat')
          .setPlaceholder('Pilih kategori...')
          .addOptions(options),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dash_panel_stock').setLabel('⬅ Back').setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
}

async function showRemoveItemItemSelect(interaction) {
  const catId = interaction.values[0];
  const cat = db.getCategoryById(catId);
  const items = db.getItemsByCategory(catId);

  if (items.length === 0) {
    return interaction.update({
      embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Tidak ada item di kategori ini.')],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dash_panel_stock').setLabel('⬅ Back').setStyle(ButtonStyle.Secondary),
      )],
    });
  }

  const stock = db.getStock();
  const options = items.slice(0, 25).map(item =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${item.emoji} ${item.name}`.substring(0, 100))
      .setValue(item.id)
      .setDescription(`${rp(item.price)} | Stok: ${stock[item.id] ?? 0}`.substring(0, 100)),
  );

  await interaction.update({
    embeds: [new EmbedBuilder()
      .setColor(config.colors.danger)
      .setTitle(`🗑️ Remove Item — ${cat.emoji} ${cat.name}`)
      .setDescription('Pilih **item** yang ingin dihapus:')],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('sp_remove_item_sel')
          .setPlaceholder('Pilih item...')
          .addOptions(options),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dash_panel_stock').setLabel('⬅ Back').setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
}

async function showRemoveItemConfirm(interaction) {
  const itemId = interaction.values[0];
  const item = db.getItemById(itemId);
  if (!item) return interaction.update({
    embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Item tidak ditemukan.')],
    components: [],
  });

  const stock = db.getStock();

  await interaction.update({
    embeds: [new EmbedBuilder()
      .setColor(config.colors.danger)
      .setTitle('🗑️ Konfirmasi Hapus Item')
      .setDescription('⚠️ **Tindakan ini tidak bisa dibatalkan!**')
      .addFields(
        { name: '🛍️ Item',    value: `${item.emoji} ${item.name}`, inline: true },
        { name: '💰 Harga',   value: rp(item.price),               inline: true },
        { name: '📦 Stok',    value: `${stock[itemId] ?? 0}`,      inline: true },
        { name: '🆔 ID',      value: `\`${itemId}\``,              inline: false },
      )],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`sp_remove_confirm_${itemId}`)
          .setLabel('✅ Ya, Hapus Item')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('dash_panel_stock')
          .setLabel('❌ Batal')
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
}

async function handleRemoveConfirm(interaction, itemId) {
  const item = db.getItemById(itemId);
  if (!item) {
    return interaction.update({
      embeds: [new EmbedBuilder().setColor(config.colors.danger).setDescription('❌ Item tidak ditemukan.')],
      components: [],
    });
  }

  db.removeItem(itemId);
  await liveStore.refresh();

  const embed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle('🗑️ Item Dihapus')
    .setDescription(`${item.emoji} **${item.name}** telah dihapus.`)
    .addFields({ name: '🆔 ID', value: `\`${itemId}\``, inline: true })
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dash_panel_stock').setLabel('⬅ Back to Stock').setStyle(ButtonStyle.Secondary),
    ),
  ]});
}

async function handleRemoveItemModal(interaction) {
  const itemId = interaction.fields.getTextInputValue('item_id').trim();
  const item = db.getItemById(itemId);

  if (!item) {
    return interaction.reply({ content: `❌ Item \`${itemId}\` tidak ditemukan.`, ephemeral: true });
  }

  db.removeItem(itemId);
  await liveStore.refresh();

  const embed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle('🗑️ Item Dihapus')
    .setDescription(`${item.emoji} **${item.name}** (\`${itemId}\`) telah dihapus.`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showAddCategoryModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_add_category')
    .setTitle('📂 Add New Category');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('cat_id')
        .setLabel('Category ID (huruf kecil, no spasi)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: skin_roblox')
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('cat_name')
        .setLabel('Nama Kategori')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: Skin Roblox')
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('cat_emoji')
        .setLabel('Emoji (opsional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('🎮')
        .setRequired(false),
    ),
  );

  await interaction.showModal(modal);
}

async function handleAddCategoryModal(interaction) {
  const catId  = interaction.fields.getTextInputValue('cat_id').trim().toLowerCase().replace(/\s+/g, '_');
  const name   = interaction.fields.getTextInputValue('cat_name').trim();
  const emoji  = interaction.fields.getTextInputValue('cat_emoji').trim() || '🎮';

  if (!catId || !name) {
    return interaction.reply({ content: '❌ ID dan nama kategori wajib diisi.', ephemeral: true });
  }

  const existing = db.getCategoryById(catId);
  if (existing) {
    return interaction.reply({ content: `❌ Kategori \`${catId}\` sudah ada!`, ephemeral: true });
  }

  db.addCategory({ id: catId, name, emoji, isOpen: true });
  await liveStore.refresh();

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('✅ Kategori Ditambahkan')
    .addFields(
      { name: '🆔 ID',    value: `\`${catId}\``, inline: true },
      { name: '📂 Nama', value: `${emoji} ${name}`, inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = {
  showAddItemModal,
  handleAddItemModal,
  showRemoveItemSlashModal,
  showRemoveItemModal,
  showRemoveItemItemSelect,
  showRemoveItemConfirm,
  handleRemoveConfirm,
  handleRemoveItemModal,
  showAddCategoryModal,
  handleAddCategoryModal,
};
