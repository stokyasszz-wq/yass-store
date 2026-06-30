const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const db     = require('../db');
const embeds = require('../embeds');

const SUB_LABELS = {
  limited:  '🔒 LIMITED',
  hot:      '🔥 HOT',
  gamepass: '🎮 GAMEPASS',
  crates:   '📦 CRATES',
  boost:    '⚡ BOOST',
};

function buildProductMenu(categoryId) {
  const items   = db.getItemsByCategory(categoryId);
  const stock   = db.getStock();
  const gigRate = db.getGigRate();

  const options = items.map(p => {
    const stk        = stock[p.id] ?? 0;
    const price      = db.getItemEffectivePrice(p);
    const subPrefix  = p.subCategory ? `[${SUB_LABELS[p.subCategory] || p.subCategory}] ` : '';
    const priceLabel = p.type === 'gig'
      ? `©${p.robuxAmount} = ${embeds.rp(price)}`
      : embeds.rp(price);
    const label = `${p.emoji} ${p.name}`.substring(0, 100);
    const desc  = `${subPrefix}${priceLabel} | Stock: ${stk > 0 ? '✅' : 'Habis'}`.substring(0, 100);

    return new StringSelectMenuOptionBuilder()
      .setLabel(label)
      .setDescription(desc)
      .setValue(p.id)
      .setEmoji(stk > 0 ? '✅' : '❌');
  });

  if (options.length === 0) return null;

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('store_select_item')
      .setPlaceholder('Pilih item...')
      .addOptions(options.slice(0, 25)),
  );
}

function buildGameButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('store_game_ff').setLabel('🔥 Free Fire').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('store_game_ml').setLabel('📱 Mobile Legend').setStyle(ButtonStyle.Primary),
  );
}

function buildOrderButtons(categoryId) {
  const btns = [
    new ButtonBuilder().setCustomId('store_order_now').setLabel('🟢 Order Sekarang').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('cart_add').setLabel('🛒 Tambah ke Cart').setStyle(ButtonStyle.Primary),
  ];
  if (categoryId === 'skin_fish_it') {
    btns.push(new ButtonBuilder().setCustomId('store_nego').setLabel('🤝 Nego').setStyle(ButtonStyle.Secondary));
  }
  if (categoryId === 'gift_in_game') {
    btns.push(new ButtonBuilder().setCustomId('gig_manual_order').setLabel('📝 Request Item Lain').setStyle(ButtonStyle.Secondary));
  }
  return new ActionRowBuilder().addComponents(btns);
}

async function handleStoreCommand(message) {
  try {
    await message.reply({ embeds: [embeds.storeHomeEmbed()], components: [buildGameButtons()] });
  } catch (err) {
    console.error('[storeCommand] Error:', err.message);
    await message.reply('❌ Gagal membuka store. Coba lagi nanti.');
  }
}

async function handleGameSelect(interaction, gameSlug) {
  await interaction.deferUpdate();
  const products = db.getProductsByGame(gameSlug);
  const embed    = gameSlug === 'freefire' ? embeds.ffStoreEmbed(products) : embeds.mlStoreEmbed(products);
  const menu     = buildProductMenu(gameSlug);
  const components = menu
    ? [menu, buildOrderButtons(), buildGameButtons()]
    : [buildOrderButtons(), buildGameButtons()];
  await interaction.editReply({ embeds: [embed], components });
}

async function showCategoryStore(interaction, categoryId) {
  const cat = db.getCategoryById(categoryId);
  if (!cat) return interaction.reply({ content: '❌ Kategori tidak ditemukan.', ephemeral: true });

  if (!cat.isOpen) {
    return interaction.reply({
      content: `❌ Kategori **${cat.emoji} ${cat.name}** sedang **CLOSED** oleh admin. Coba lagi nanti.`,
      ephemeral: true,
    });
  }

  const items = db.getItemsByCategory(categoryId);
  const stock = db.getStock();
  const menu  = buildProductMenu(categoryId);
  const embed = embeds.categoryOrderEmbed(cat, items, stock);

  if (!menu) {
    return interaction.reply({
      embeds: [embed],
      content: '❌ Tidak ada item tersedia di kategori ini.',
      ephemeral: true,
    });
  }

  await interaction.reply({
    embeds: [embed],
    components: [menu, buildOrderButtons(categoryId)],
    ephemeral: true,
  });
}

module.exports = {
  handleStoreCommand, handleGameSelect, showCategoryStore,
  buildGameButtons, buildProductMenu, buildOrderButtons,
};
