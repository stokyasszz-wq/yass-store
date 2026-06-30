const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

async function showSetPaymentModal(interaction) {
  const settings = db.getSettings();
  const currentNumber = settings.danaNumber || config.dana.number;
  const currentName   = settings.danaName   || config.dana.name;

  const modal = new ModalBuilder()
    .setCustomId('modal_set_payment')
    .setTitle('💳  Update Info Pembayaran DANA');

  const numberInput = new TextInputBuilder()
    .setCustomId('dana_number')
    .setLabel('Nomor DANA (HP)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Contoh: 08123456789')
    .setValue(currentNumber)
    .setRequired(true)
    .setMaxLength(15);

  const nameInput = new TextInputBuilder()
    .setCustomId('dana_name')
    .setLabel('Nama Akun DANA')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Contoh: BUDI SANTOSO')
    .setValue(currentName)
    .setRequired(true)
    .setMaxLength(50);

  modal.addComponents(
    new ActionRowBuilder().addComponents(numberInput),
    new ActionRowBuilder().addComponents(nameInput),
  );

  await interaction.showModal(modal);
}

async function handleSetPaymentModal(interaction) {
  const number = interaction.fields.getTextInputValue('dana_number').trim();
  const name   = interaction.fields.getTextInputValue('dana_name').trim().toUpperCase();

  db.updateSetting('danaNumber', number);
  db.updateSetting('danaName', name);

  config.dana.number = number;
  config.dana.name   = name;

  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('✅  Info Pembayaran Diperbarui')
    .addFields(
      { name: '📱 Nomor DANA Baru', value: `\`\`\`${number}\`\`\``, inline: false },
      { name: '👤 Nama Baru',       value: `\`\`\`${name}\`\`\``,   inline: false },
    )
    .setFooter({ text: `Diubah oleh ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { showSetPaymentModal, handleSetPaymentModal };
