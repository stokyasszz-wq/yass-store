const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const db = require('../db');
const config = require('../config');

const STARS = ['', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'];

async function showReviewModal(interaction) {
  const invoice = interaction.options.getString('invoice').toUpperCase().trim();
  const order   = db.getOrderByInvoice(invoice);

  if (!order) {
    return interaction.reply({ content: `❌ Invoice **${invoice}** tidak ditemukan.`, ephemeral: true });
  }
  if (order.userId !== interaction.user.id) {
    return interaction.reply({ content: '❌ Kamu hanya bisa review order milikmu sendiri.', ephemeral: true });
  }
  if (!['VERIFIED', 'DONE'].includes(order.status)) {
    return interaction.reply({ content: '❌ Hanya order yang sudah **VERIFIED** atau **DONE** yang bisa direview.', ephemeral: true });
  }

  const existing = db.getReviews().find(r => r.invoice === invoice);
  if (existing) {
    return interaction.reply({ content: `❌ Kamu sudah mereview invoice **${invoice}** sebelumnya.`, ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_review_${invoice}`)
    .setTitle(`⭐ Review Order ${invoice}`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('rating')
        .setLabel('Rating (1-5)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Masukkan angka 1 sampai 5')
        .setRequired(true)
        .setMaxLength(1),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('message')
        .setLabel('Pesan Review')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Ceritakan pengalaman belanjamu...')
        .setRequired(true)
        .setMaxLength(500),
    ),
  );

  await interaction.showModal(modal);
}

async function handleReviewModal(interaction, invoice) {
  const ratingStr = interaction.fields.getTextInputValue('rating').trim();
  const message   = interaction.fields.getTextInputValue('message').trim();
  const rating    = parseInt(ratingStr);

  if (isNaN(rating) || rating < 1 || rating > 5) {
    return interaction.reply({ content: '❌ Rating harus angka antara 1 sampai 5.', ephemeral: true });
  }

  const order = db.getOrderByInvoice(invoice);
  if (!order || order.userId !== interaction.user.id) {
    return interaction.reply({ content: '❌ Invoice tidak valid.', ephemeral: true });
  }

  db.addReview({
    invoice,
    userId:   interaction.user.id,
    username: interaction.user.tag,
    itemName: order.itemName || 'Cart',
    rating,
    message,
    date: new Date().toISOString(),
  });

  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('⭐  Review Berhasil Dikirim!')
    .setDescription(`Terima kasih atas reviewmu, **${interaction.user.username}**!`)
    .addFields(
      { name: '🧾 Invoice', value: invoice,         inline: true },
      { name: '⭐ Rating',  value: STARS[rating],   inline: true },
      { name: '💬 Pesan',   value: message,          inline: false },
    )
    .setFooter({ text: 'Yass Store Bot • Review System' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleReviews(interaction) {
  await interaction.deferReply({ ephemeral: false });

  const reviews = db.getReviews();
  if (reviews.length === 0) {
    return interaction.editReply({ content: '📭 Belum ada review.' });
  }

  const recent = [...reviews].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  const lines = recent.map(r =>
    `${STARS[r.rating]} **${r.username}** — \`${r.invoice}\`\n> ${r.message}`
  ).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(`⭐  Reviews — Rating Rata-rata: ${avgRating}/5`)
    .setDescription(`**${reviews.length}** total review\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${lines}`)
    .setFooter({ text: 'Menampilkan 10 review terbaru • Yass Store Bot' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleClearReviews(interaction) {
  db.clearReviews();
  await interaction.reply({ content: '🗑️ Semua review telah dihapus.', ephemeral: true });
}

module.exports = { showReviewModal, handleReviewModal, handleReviews, handleClearReviews };
