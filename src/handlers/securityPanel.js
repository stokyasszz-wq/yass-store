const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const db = require('../db');
const config = require('../config');
const liveStore = require('../liveStore');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

function securityPanelEmbed() {
  const settings = db.getSettings();
  const orders   = db.getOrders();
  const pending  = orders.filter(o => !['DONE', 'VERIFIED', 'CANCELLED'].includes(o.status)).length;
  const gigRate  = db.getGigRate();
  const webPort  = settings.webPort || 5000;

  return new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle('🔒  Security & Settings Panel')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    .addFields(
      { name: '💱 Robux Login Rate', value: `Rp ${settings.robuxRate}/R$`,  inline: true },
      { name: '🎁 GiG Rate',         value: `Rp ${gigRate}/R$`,              inline: true },
      { name: '🛡️ Anti-Spam',        value: settings.antiSpam ? '✅ ON' : '❌ OFF', inline: true },
      { name: '⏳ Open Tickets',      value: `${pending}`,                    inline: true },
      { name: '🌐 Web Dashboard',     value: `Port :${webPort}`,              inline: true },
      { name: '👮 Staff Role',        value: `<@&${config.staffRoleId}>`,     inline: true },
      { name: '📋 Anti-Scam Rules',
        value:
          '• Hanya gambar diterima sebagai bukti\n' +
          '• Hanya staff bisa verify payment\n' +
          '• Hanya claimer yang bisa close ticket\n' +
          '• User tidak bisa close ticket sendiri',
      },
    )
    .setTimestamp();
}

function securityPanelButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('sec_set_rate')     .setLabel('💱 Robux Login Rate').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('sec_set_gig_rate') .setLabel('🎁 GiG Rate')        .setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('sec_toggle_spam')  .setLabel('🛡️ Anti-Spam')       .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('sec_recalc_robux') .setLabel('🔄 Recalc Robux')   .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dash_back')        .setLabel('⬅ Back')             .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

async function showSecurityPanel(interaction) {
  await interaction.update({
    embeds:     [securityPanelEmbed()],
    components: securityPanelButtons(),
  });
}

// ── Robux Login Rate ─────────────────────────────────────────────────────────
async function showSetRateModal(interaction) {
  const settings = db.getSettings();
  const modal = new ModalBuilder()
    .setCustomId('modal_set_robux_rate')
    .setTitle('💱 Set Robux Login Rate');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('rate')
        .setLabel(`Rate saat ini: Rp ${settings.robuxRate}/R$`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: 145')
        .setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

async function handleSetRateModal(interaction) {
  const rate = parseInt(interaction.fields.getTextInputValue('rate').trim().replace(/\D/g, ''));
  if (isNaN(rate) || rate <= 0) {
    return interaction.reply({ content: '❌ Rate harus angka positif.', ephemeral: true });
  }
  db.updateSetting('robuxRate', rate);
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ Robux Login Rate Diperbarui')
        .setDescription(`Rate baru: **Rp ${rate}/R$**\n• 100 R$ = ${rp(rate * 100)}\n• 500 R$ = ${rp(rate * 500)}\n• 1000 R$ = ${rp(rate * 1000)}`)
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}

// ── GiG Rate ─────────────────────────────────────────────────────────────────
async function showSetGigRateModal(interaction) {
  const gigRate = db.getGigRate();
  const modal = new ModalBuilder()
    .setCustomId('modal_set_gig_rate')
    .setTitle('🎁 Set GiG Rate');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('gig_rate')
        .setLabel(`GiG Rate saat ini: Rp ${gigRate}/R$`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: 86')
        .setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

async function handleSetGigRateModal(interaction) {
  const rate = parseInt(interaction.fields.getTextInputValue('gig_rate').trim().replace(/\D/g, ''));
  if (isNaN(rate) || rate <= 0) {
    return interaction.reply({ content: '❌ Rate harus angka positif.', ephemeral: true });
  }
  db.updateSetting('gigRate', rate);
  await liveStore.refresh();

  // Show updated GiG price examples
  const items = db.getItemsByCategory('gift_in_game').slice(0, 5);
  const examples = items.map(i => `• ${i.name}: ©${i.robuxAmount} = ${rp(i.robuxAmount * rate)}`).join('\n') || '—';

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ GiG Rate Diperbarui')
        .setDescription(`Rate baru: **Rp ${rate}/R$**\n\n**Contoh harga baru:**\n${examples}\n\n*Semua harga GiG diperbarui otomatis.*`)
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}

// ── Slash: /setgigrate ───────────────────────────────────────────────────────
async function handleSetGigRateSlash(interaction) {
  const rate = interaction.options.getInteger('rate');
  db.updateSetting('gigRate', rate);
  await liveStore.refresh();

  const items    = db.getItemsByCategory('gift_in_game').slice(0, 5);
  const examples = items.map(i => `• ${i.name}: ©${i.robuxAmount} = ${rp(i.robuxAmount * rate)}`).join('\n') || '—';

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ GiG Rate Diperbarui')
        .setDescription(`Rate baru: **Rp ${rate}/R$**\n\n**Contoh harga baru:**\n${examples}`)
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}

// ── Slash: /setrobuxrate ─────────────────────────────────────────────────────
async function handleSetRobuxRateSlash(interaction) {
  const rate = interaction.options.getInteger('rate');
  db.updateSetting('robuxRate', rate);
  return interaction.reply({
    content: `✅ Robux Login rate diperbarui: **Rp ${rate}/R$**`,
    ephemeral: true,
  });
}

// ── Anti-Spam Toggle ─────────────────────────────────────────────────────────
async function handleToggleAntiSpam(interaction) {
  const settings = db.getSettings();
  db.updateSetting('antiSpam', !settings.antiSpam);
  await interaction.update({ embeds: [securityPanelEmbed()], components: securityPanelButtons() });
}

// ── Recalc Robux prices ──────────────────────────────────────────────────────
async function handleRecalcRobux(interaction) {
  const rate  = db.getSettings().robuxRate;
  const items = db.getItems();
  let count   = 0;
  for (const item of items) {
    if (item.type === 'robux' && item.useRate && item.amount) {
      db.updateItem(item.id, { price: rate * item.amount });
      count++;
    }
  }
  await liveStore.refresh();
  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('🔄 Robux Prices Recalculated')
        .setDescription(`${count} item diperbarui dengan rate Rp ${rate}/R$.`)
        .setTimestamp(),
    ],
    components: securityPanelButtons(),
  });
}

module.exports = {
  showSecurityPanel,
  showSetRateModal,        handleSetRateModal,
  showSetGigRateModal,     handleSetGigRateModal,
  handleSetGigRateSlash,   handleSetRobuxRateSlash,
  handleToggleAntiSpam,    handleRecalcRobux,
};
