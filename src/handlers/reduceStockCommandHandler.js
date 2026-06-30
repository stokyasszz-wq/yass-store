const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');
const liveStore = require('../liveStore');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

async function handleReduceStock(interaction) {
  const itemId = interaction.options.getString('id');
  const amount = interaction.options.getInteger('amount');

  const item = db.getItemById(itemId);
  if (!item) {
    return interaction.reply({ content: `❌ Item \`${itemId}\` tidak ditemukan.`, ephemeral: true });
  }

  const stock = db.getStock();
  const current = stock[itemId] ?? 0;

  if (amount > current) {
    return interaction.reply({
      content: `❌ Stock **${item.name}** saat ini hanya **${current}**. Tidak bisa kurangi **${amount}**.`,
      ephemeral: true,
    });
  }

  stock[itemId] = current - amount;
  db.setStock(stock);
  await liveStore.refresh();

  const embed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle('📉  Stock Dikurangi')
    .addFields(
      { name: '🛍️ Item',        value: `${item.emoji} ${item.name}`,              inline: true },
      { name: '➖ Dikurangi',    value: `**${amount}** unit`,                      inline: true },
      { name: '📊 Sisa Stock',  value: `**${stock[itemId]}** unit`,               inline: true },
      { name: '💰 Harga',       value: rp(item.price),                             inline: true },
    )
    .setFooter({ text: `Oleh ${interaction.user.tag} • Yass Store Bot` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSetStock(interaction) {
  const itemId = interaction.options.getString('id');
  const amount = interaction.options.getInteger('amount');

  const item = db.getItemById(itemId);
  if (!item) {
    return interaction.reply({ content: `❌ Item \`${itemId}\` tidak ditemukan.`, ephemeral: true });
  }

  const stock = db.getStock();
  stock[itemId] = amount;
  db.setStock(stock);
  await liveStore.refresh();

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('📦  Stock Diset')
    .addFields(
      { name: '🛍️ Item',      value: `${item.emoji} ${item.name}`, inline: true },
      { name: '📊 Stock Baru', value: `**${amount}** unit`,         inline: true },
    )
    .setFooter({ text: `Oleh ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { handleReduceStock, handleSetStock };
