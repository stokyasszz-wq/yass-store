const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');
const embeds = require('../embeds');

async function handleInvoiceLookup(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const invoiceId = interaction.options.getString('id').toUpperCase().trim();
  const order = db.getOrderByInvoice(invoiceId);

  if (!order) {
    return interaction.editReply({ content: `❌ Invoice **${invoiceId}** tidak ditemukan.` });
  }

  const isStaff = interaction.member?.roles?.cache?.has(config.staffRoleId);
  const isOwner = order.userId === interaction.user.id;

  if (!isOwner && !isStaff) {
    return interaction.editReply({ content: '❌ Kamu hanya bisa melihat invoice milikmu sendiri.' });
  }

  const logLines = Array.isArray(order.log) && order.log.length > 0
    ? order.log.map(l => `\`${new Date(l.at).toLocaleString('id-ID')}\` — **${l.event}** *(${l.by})*`).join('\n')
    : '_Tidak ada log._';

  const embed = embeds.invoiceEmbed(order);

  const logEmbed = new EmbedBuilder()
    .setColor(config.colors.blurple)
    .setTitle('📜  Log Aktivitas')
    .setDescription(logLines.substring(0, 4096));

  await interaction.editReply({ embeds: [embed, logEmbed] });
}

module.exports = { handleInvoiceLookup };
