const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

async function handleSearch(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const query = interaction.options.getString('query').toLowerCase().trim();

  const items = db.getItems();
  const stock = db.getStock();
  const categories = db.getCategories();

  const results = items.filter(i =>
    i.name.toLowerCase().includes(query) ||
    i.id.toLowerCase().includes(query) ||
    (i.categoryId && i.categoryId.toLowerCase().includes(query))
  );

  if (results.length === 0) {
    return interaction.editReply({
      content: `🔍 Tidak ada produk yang cocok dengan **"${query}"**.`,
    });
  }

  const lines = results.slice(0, 15).map(item => {
    const stk = stock[item.id] ?? 0;
    const cat = categories.find(c => c.id === item.categoryId);
    const catName = cat ? cat.name : item.categoryId;
    const statusIcon = stk > 0 ? `✅ ${stk}` : '❌ Habis';
    return `${item.emoji} **${item.name}** — ${rp(item.price)} ┃ ${statusIcon}\n  > 📂 ${catName} ┃ 🆔 \`${item.id}\``;
  }).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(config.colors.blurple)
    .setTitle(`🔍  Hasil Pencarian — "${query}"`)
    .setDescription(`Ditemukan **${results.length}** produk.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${lines}`)
    .setFooter({ text: results.length > 15 ? `Menampilkan 15 dari ${results.length} hasil` : `${results.length} hasil ditemukan` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { handleSearch };
