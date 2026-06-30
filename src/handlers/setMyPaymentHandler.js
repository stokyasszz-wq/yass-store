const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

async function showSetMyPaymentModal(interaction) {
  if (!interaction.member.roles.cache.has(config.staffRoleId))
    return interaction.reply({ content: '❌ Hanya staff yang bisa menggunakan command ini!', ephemeral: true });

  const existing = db.getAdminPayment(interaction.user.id);

  const modal = new ModalBuilder()
    .setCustomId('modal_set_my_payment')
    .setTitle('⚙️ Atur Payment Info Kamu');

  const numberInput = new TextInputBuilder()
    .setCustomId('my_payment_number')
    .setLabel('Nomor DANA')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Contoh: 08123456789')
    .setRequired(true)
    .setMaxLength(20);

  const nameInput = new TextInputBuilder()
    .setCustomId('my_payment_name')
    .setLabel('Nama Rekening (Atas Nama)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Contoh: BUDI SANTOSO')
    .setRequired(true)
    .setMaxLength(50);

  const qrisInput = new TextInputBuilder()
    .setCustomId('my_payment_qris')
    .setLabel('URL Gambar QRIS (opsional, bisa dikosongkan)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Contoh: https://i.imgur.com/xxxxx.png')
    .setRequired(false)
    .setMaxLength(500);

  if (existing) {
    numberInput.setValue(existing.number);
    nameInput.setValue(existing.name);
    if (existing.qrisUrl) qrisInput.setValue(existing.qrisUrl);
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(numberInput),
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(qrisInput),
  );

  await interaction.showModal(modal);
}

async function handleSetMyPaymentModal(interaction) {
  if (!interaction.member.roles.cache.has(config.staffRoleId))
    return interaction.reply({ content: '❌ Hanya staff yang bisa menggunakan command ini!', ephemeral: true });

  const number  = interaction.fields.getTextInputValue('my_payment_number').trim();
  const name    = interaction.fields.getTextInputValue('my_payment_name').trim().toUpperCase();
  const qrisUrl = interaction.fields.getTextInputValue('my_payment_qris').trim() || null;

  db.setAdminPayment(interaction.user.id, { number, name, qrisUrl });

  const fields = [
    { name: '🏦 Metode', value: 'DANA', inline: true },
    { name: '📱 Nomor', value: `\`${number}\``, inline: true },
    { name: '👤 Atas Nama', value: `**${name}**`, inline: true },
  ];
  if (qrisUrl) fields.push({ name: '🔲 QRIS', value: '✅ Tersimpan — akan ditampilkan di payment embed', inline: false });
  else fields.push({ name: '🔲 QRIS', value: '—  (belum diatur)', inline: false });

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('✅ Payment Info Tersimpan!')
    .setDescription('Info payment kamu berhasil diperbarui. Akan digunakan saat kamu menjalankan `/payment`.')
    .addFields(...fields)
    .setFooter({ text: `Disimpan untuk ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { showSetMyPaymentModal, handleSetMyPaymentModal };
