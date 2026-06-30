const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const db = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

function buildCategoryEmbed(catId) {
  const cat = db.getCategoryById(catId);
  if (!cat) return null;

  const items = db.getItemsByCategory(catId);
  const stock = db.getStock();

  const statusLine = cat.isOpen ? '🟢 **OPEN**' : '🔴 **CLOSED**';

  const lines = items.map(item => {
    const stk = stock[item.id] ?? 0;
    if (!cat.isOpen) return `~~${item.emoji} ${item.name} — ${rp(item.price)}~~ *(closed)*`;
    if (stk <= 0) return `${item.emoji} ~~${item.name}~~ — ${rp(item.price)} ┃ ❌ **HABIS**`;
    return `${item.emoji} **${item.name}** — ${rp(item.price)} ┃ ✅ Stock: ${stk}`;
  }).join('\n');

  const colorMap = {
    freefire: config.colors.ff,
    mobilelegend: config.colors.ml,
    robux_login: 0x00B2FF,
    skin_fish_it: 0x3ABDA8,
    gift_limited: config.colors.purple,
    gift_hot: config.colors.danger,
    gamepass: config.colors.gold,
    crates: config.colors.primary,
    boosts: config.colors.warning,
  };

  const embed = new EmbedBuilder()
    .setColor(colorMap[catId] || config.colors.blurple)
    .setTitle(`${cat.emoji}  ${cat.name.toUpperCase()} — ${statusLine}`)
    .setDescription(
      '> Yass Store Bot — Top Up Aman & Terpercaya\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      (lines || '— Tidak ada item —'),
    )
    .setFooter({ text: `Yass Store Bot • ${cat.name} | Order via !store` })
    .setTimestamp();

  if (items.length === 0) embed.setDescription('Kategori ini belum memiliki item.');

  return embed;
}

async function handleSendProduct(interaction) {
  const catId = interaction.options.getString('category');
  const channel = interaction.options.getChannel('channel');

  if (!channel.isTextBased()) {
    return interaction.reply({ content: '❌ Channel harus berupa text channel!', ephemeral: true });
  }

  const cat = db.getCategoryById(catId);
  if (!cat) {
    const cats = db.getCategories();
    const list = cats.map(c => `\`${c.id}\` — ${c.emoji} ${c.name}`).join('\n');
    return interaction.reply({
      content: `❌ Kategori \`${catId}\` tidak ditemukan.\n\nKategori yang tersedia:\n${list}`,
      ephemeral: true,
    });
  }

  const embed = buildCategoryEmbed(catId);

  const orderBtns = [
    new ButtonBuilder()
      .setCustomId('store_order_now')
      .setLabel('🛒 Order Sekarang')
      .setStyle(ButtonStyle.Success),
  ];
  if (catId === 'skin_fish_it') {
    orderBtns.push(
      new ButtonBuilder()
        .setCustomId('store_nego')
        .setLabel('🤝 Nego')
        .setStyle(ButtonStyle.Secondary),
    );
  }
  const row = new ActionRowBuilder().addComponents(orderBtns);

  await channel.send({ embeds: [embed], components: [row] });

  await interaction.reply({
    content: `✅ Product **${cat.emoji} ${cat.name}** berhasil dikirim ke ${channel}!`,
    ephemeral: true,
  });
}

module.exports = { handleSendProduct, buildCategoryEmbed };
