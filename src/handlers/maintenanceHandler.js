const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

async function handleMaintenance(interaction) {
  const current = db.isMaintenanceMode();
  const next = !current;

  db.setMaintenanceMode(next);

  const embed = new EmbedBuilder()
    .setColor(next ? config.colors.danger : config.colors.success)
    .setTitle(next ? '🔧  Maintenance Mode AKTIF' : '✅  Maintenance Mode NONAKTIF')
    .setDescription(
      next
        ? 'Store **ditutup sementara**. Semua pembelian diblokir.\nGunakan `/maintenance` lagi untuk membuka kembali.'
        : 'Store kembali **ONLINE**. Pembelian sudah bisa dilakukan kembali.'
    )
    .addFields({ name: '👮 Diubah oleh', value: interaction.user.tag, inline: true })
    .setFooter({ text: 'Yass Store Bot • Maintenance Control' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: false });
}

async function handleMaintenanceStatus(interaction) {
  const isMaintenance = db.isMaintenanceMode();
  await interaction.reply({
    content: isMaintenance
      ? '🔧 Store sedang dalam **maintenance mode** — pembelian diblokir.'
      : '✅ Store sedang **online** — tidak ada maintenance.',
    ephemeral: true,
  });
}

module.exports = { handleMaintenance, handleMaintenanceStatus };
