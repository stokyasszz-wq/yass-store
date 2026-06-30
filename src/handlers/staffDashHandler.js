const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const db     = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

function buildStaffDashEmbed() {
  const orders     = db.getOrders();
  const items      = db.getItems();
  const stock      = db.getStock();
  const settings   = db.getSettings();
  const gigRate    = db.getGigRate();

  const done       = orders.filter(o => ['DONE','VERIFIED'].includes(o.status));
  const revenue    = done.reduce((s, o) => s + (o.totalPrice || o.price || 0), 0);
  const active     = orders.filter(o => !['DONE','CANCELLED','VERIFIED','REFUNDED'].includes(o.status));
  const pending    = orders.filter(o => o.status === 'PROOF SENT').length;

  const today      = new Date().toDateString();
  const todayOrds  = orders.filter(o => new Date(o.date).toDateString() === today);
  const todayRev   = todayOrds.filter(o => ['DONE','VERIFIED'].includes(o.status)).reduce((s,o) => s + (o.totalPrice||o.price||0), 0);

  const lowStock   = Object.entries(stock)
    .filter(([id, qty]) => qty > 0 && qty <= config.lowStockThreshold)
    .map(([id]) => items.find(i => i.id === id)?.name || id)
    .slice(0, 5);

  const outStock   = Object.entries(stock)
    .filter(([id, qty]) => qty === 0 && items.find(i => i.id === id))
    .map(([id]) => items.find(i => i.id === id)?.name || id)
    .slice(0, 5);

  const recentActive = active.slice(-5).reverse().map(o =>
    `🔹 \`${o.invoice}\` — ${(o.itemName||'').substring(0,20)} (${o.status})`
  ).join('\n') || '—';

  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false });

  return new EmbedBuilder()
    .setColor(config.colors.blurple)
    .setTitle('📺  Staff Live Dashboard')
    .setDescription(`🕐 Update: **${now} WIB**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    .addFields(
      { name: '📦 Total Orders',       value: `**${orders.length}**`,           inline: true },
      { name: '💰 Total Revenue',      value: `**${rp(revenue)}**`,             inline: true },
      { name: '⏳ Active Tickets',     value: `**${active.length}**`,           inline: true },
      { name: '🔵 Pending Verify',     value: `**${pending}**`,                 inline: true },
      { name: '📅 Order Hari Ini',     value: `**${todayOrds.length}**`,        inline: true },
      { name: '💵 Revenue Hari Ini',   value: `**${rp(todayRev)}**`,            inline: true },
      { name: '💱 GiG Rate',           value: `**Rp ${gigRate}/R$**`,           inline: true },
      { name: '💱 Robux Rate',         value: `**Rp ${settings.robuxRate}/R$**`,inline: true },
      { name: '🔧 Maintenance',        value: db.isMaintenanceMode() ? '🔴 **ON**' : '🟢 **OFF**', inline: true },
    )
    .addFields(
      { name: '📋 Ticket Aktif (Terbaru)', value: recentActive, inline: false },
    )
    .addFields(
      {
        name: '⚠️ Stock Alert',
        value: outStock.length || lowStock.length
          ? `**Habis:** ${outStock.join(', ') || '—'}\n**Low:** ${lowStock.join(', ') || '—'}`
          : '✅ Semua stock aman',
        inline: false,
      },
    )
    .setFooter({ text: 'Yass Store Bot • Staff Dashboard • Klik Refresh untuk update' })
    .setTimestamp();
}

function staffDashButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('staffdash_refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('staffdash_toggle_maint').setLabel('🔧 Toggle Maintenance').setStyle(ButtonStyle.Danger),
    ),
  ];
}

async function handleStaffDash(interaction) {
  const isStaff = interaction.member?.roles?.cache?.has(config.staffRoleId);
  if (!isStaff) return interaction.reply({ content: '❌ Staff only!', ephemeral: true });
  await interaction.reply({
    embeds:     [buildStaffDashEmbed()],
    components: staffDashButtons(),
  });
}

async function handleStaffDashRefresh(interaction) {
  const isStaff = interaction.member?.roles?.cache?.has(config.staffRoleId);
  if (!isStaff) return interaction.reply({ content: '❌ Staff only!', ephemeral: true });
  await interaction.update({
    embeds:     [buildStaffDashEmbed()],
    components: staffDashButtons(),
  });
}

async function handleStaffDashToggleMaint(interaction) {
  const isStaff = interaction.member?.roles?.cache?.has(config.staffRoleId);
  if (!isStaff) return interaction.reply({ content: '❌ Staff only!', ephemeral: true });
  const current = db.isMaintenanceMode();
  db.setMaintenanceMode(!current);
  await interaction.update({
    embeds:     [buildStaffDashEmbed()],
    components: staffDashButtons(),
  });
}

module.exports = { handleStaffDash, handleStaffDashRefresh, handleStaffDashToggleMaint };
