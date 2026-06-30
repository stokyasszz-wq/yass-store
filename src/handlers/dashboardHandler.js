const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../config');

function isStaff(member) {
  return member.roles.cache.has(config.staffRoleId);
}

function dashboardEmbed() {
  return new EmbedBuilder()
    .setColor(config.colors.blurple)
    .setTitle('🧑‍💼  YASS STORE PRO — Admin Dashboard')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nPilih panel yang ingin dikelola:')
    .addFields(
      { name: '📦 Stock',         value: 'Stok, harga, tambah/hapus item',     inline: true },
      { name: '📂 Category',      value: 'Buka/tutup/hapus kategori',           inline: true },
      { name: '🛒 Orders',        value: 'Lihat tiket, verify, force close',    inline: true },
      { name: '📊 Analytics',     value: 'Revenue, best seller, konversi',      inline: true },
      { name: '🔒 Security',      value: 'Rate, anti-spam, settings',           inline: true },
      { name: '🛒 Cart Monitor',  value: 'Pantau semua cart aktif',             inline: true },
      { name: '🧾 Invoice Mgmt',  value: 'Kelola & cari invoice',               inline: true },
      { name: '💳 Pay Verify',    value: 'Invoice pending pembayaran',          inline: true },
      { name: '📦 Order Tracker', value: 'Tracking status semua order',         inline: true },
      { name: '🔄 Refund',        value: 'Proses refund & kembalikan stock',    inline: true },
    )
    .setFooter({ text: `Staff Role: ${config.staffRoleId}` })
    .setTimestamp();
}

function dashboardButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dash_panel_stock')    .setLabel('📦 Stock')    .setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('dash_panel_category') .setLabel('📂 Category') .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dash_panel_order')    .setLabel('🛒 Orders')   .setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('dash_panel_analytics').setLabel('📊 Analytics').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dash_panel_security') .setLabel('🔒 Security') .setStyle(ButtonStyle.Danger),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dash_panel_cart')    .setLabel('🛒 Cart Monitor')  .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dash_panel_invoice') .setLabel('🧾 Invoice Mgmt')  .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dash_panel_verify')  .setLabel('💳 Pay Verify')    .setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('dash_panel_tracker') .setLabel('📦 Order Tracker') .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dash_panel_refund')  .setLabel('🔄 Refund')        .setStyle(ButtonStyle.Danger),
    ),
  ];
}

async function handleDashboard(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: '❌ Hanya staff yang bisa akses dashboard!', ephemeral: true });
  }
  await interaction.reply({
    embeds: [dashboardEmbed()],
    components: dashboardButtons(),
    ephemeral: true,
  });
}

module.exports = { handleDashboard, dashboardEmbed, dashboardButtons, isStaff };
