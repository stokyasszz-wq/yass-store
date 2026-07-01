const {
  EmbedBuilder,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const db     = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

const pendingVouchers = new Map();

// ── List ─────────────────────────────────────────────────────────────────────
async function handleVoucherList(interaction) {
  const vouchers = db.getVouchers();
  if (vouchers.length === 0) {
    return interaction.reply({ content: '📭 Belum ada voucher yang dibuat.', ephemeral: true });
  }
  const lines = vouchers.map(v => {
    const disc = v.type === 'percent' ? `${v.value}%` : rp(v.value);
    const used = `${v.usedCount}/${v.maxUses === -1 ? '∞' : v.maxUses}`;
    const exp  = v.expiry ? new Date(v.expiry).toLocaleDateString('id-ID') : 'Selamanya';
    const st   = v.active ? '🟢' : '🔴';
    return `${st} \`${v.code}\` — **${disc}** off • ${used} used • exp: ${exp}`;
  }).join('\n');

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.purple)
        .setTitle('🎫  Voucher List')
        .setDescription(lines)
        .setFooter({ text: `${vouchers.length} voucher • /voucher create untuk tambah baru` })
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}

// ── Create ────────────────────────────────────────────────────────────────────
async function showVoucherCreateModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_voucher_create')
    .setTitle('🎫 Buat Voucher Baru');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('v_code').setLabel('Kode Voucher (huruf kapital, tanpa spasi)')
        .setStyle(TextInputStyle.Short).setPlaceholder('DISKON50').setMaxLength(20).setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('v_type').setLabel('Tipe: "percent" atau "fixed"')
        .setStyle(TextInputStyle.Short).setPlaceholder('percent').setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('v_value').setLabel('Nilai (% atau Rp, contoh: 10 atau 5000)')
        .setStyle(TextInputStyle.Short).setPlaceholder('10').setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('v_maxuses').setLabel('Maks penggunaan (-1 = unlimited)')
        .setStyle(TextInputStyle.Short).setPlaceholder('1').setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('v_expiry').setLabel('Tanggal kedaluarsa (YYYY-MM-DD atau kosong)')
        .setStyle(TextInputStyle.Short).setPlaceholder('2026-12-31').setRequired(false),
    ),
  );
  await interaction.showModal(modal);
}

async function handleVoucherCreateModal(interaction) {
  const code    = interaction.fields.getTextInputValue('v_code').trim().toUpperCase().replace(/\s+/g, '');
  const typeRaw = interaction.fields.getTextInputValue('v_type').trim().toLowerCase();
  const valRaw  = interaction.fields.getTextInputValue('v_value').trim().replace(/\D/g, '');
  const maxRaw  = interaction.fields.getTextInputValue('v_maxuses').trim();
  const expRaw  = interaction.fields.getTextInputValue('v_expiry')?.trim() || '';

  const type    = ['percent', 'fixed'].includes(typeRaw) ? typeRaw : null;
  const value   = parseInt(valRaw);
  const maxUses = parseInt(maxRaw);

  if (!code || !/^[A-Z0-9_-]+$/.test(code))
    return interaction.reply({ content: '❌ Kode voucher hanya boleh huruf kapital, angka, underscore, atau dash.', ephemeral: true });
  if (!type)
    return interaction.reply({ content: '❌ Tipe harus "percent" atau "fixed".', ephemeral: true });
  if (isNaN(value) || value <= 0)
    return interaction.reply({ content: '❌ Nilai voucher harus angka positif.', ephemeral: true });
  if (type === 'percent' && value > 100)
    return interaction.reply({ content: '❌ Diskon persen maksimal 100.', ephemeral: true });
  if (isNaN(maxUses))
    return interaction.reply({ content: '❌ Maks penggunaan harus angka.', ephemeral: true });
  if (db.getVoucherByCode(code))
    return interaction.reply({ content: `❌ Voucher \`${code}\` sudah ada!`, ephemeral: true });

  let expiry = null;
  if (expRaw) {
    const d = new Date(expRaw);
    if (isNaN(d.getTime())) return interaction.reply({ content: '❌ Format tanggal tidak valid. Gunakan YYYY-MM-DD.', ephemeral: true });
    expiry = d.toISOString();
  }

  db.addVoucher({
    code, type, value, maxUses, usedCount: 0, usedBy: [],
    expiry, active: true, createdBy: interaction.user.tag,
    createdAt: new Date().toISOString(),
  });

  const discStr = type === 'percent' ? `${value}%` : rp(value);
  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ Voucher Berhasil Dibuat!')
        .addFields(
          { name: '🎫 Kode',       value: `\`${code}\``,                           inline: true },
          { name: '💸 Diskon',     value: discStr,                                  inline: true },
          { name: '📊 Maks Pakai', value: maxUses === -1 ? '♾️ Unlimited' : `${maxUses}x`, inline: true },
          { name: '⏳ Berlaku s/d', value: expiry ? new Date(expiry).toLocaleDateString('id-ID') : 'Selamanya', inline: true },
          { name: '📢 Share',      value: `Bagikan kode \`${code}\` ke user untuk dapatkan diskon!`, inline: false },
        )
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function handleVoucherDelete(interaction) {
  const code = interaction.options.getString('code')?.toUpperCase();
  const v = db.getVoucherByCode(code);
  if (!v) return interaction.reply({ content: `❌ Voucher \`${code}\` tidak ditemukan.`, ephemeral: true });
  db.deleteVoucher(code);
  return interaction.reply({ content: `🗑️ Voucher \`${code}\` dihapus.`, ephemeral: true });
}

// ── Info ──────────────────────────────────────────────────────────────────────
async function handleVoucherInfo(interaction) {
  const code = interaction.options.getString('code')?.toUpperCase();
  const v = db.getVoucherByCode(code);
  if (!v) return interaction.reply({ content: `❌ Voucher \`${code}\` tidak ditemukan.`, ephemeral: true });
  const discStr = v.type === 'percent' ? `${v.value}%` : rp(v.value);
  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(v.active ? config.colors.success : config.colors.danger)
        .setTitle(`🎫 Voucher: ${v.code}`)
        .addFields(
          { name: '💸 Diskon',     value: discStr,                              inline: true },
          { name: '📊 Terpakai',   value: `${v.usedCount}/${v.maxUses === -1 ? '∞' : v.maxUses}`, inline: true },
          { name: '⏳ Kadaluarsa', value: v.expiry ? new Date(v.expiry).toLocaleDateString('id-ID') : 'Selamanya', inline: true },
          { name: '🔧 Status',     value: v.active ? '🟢 Aktif' : '🔴 Nonaktif', inline: true },
          { name: '👤 Dibuat oleh', value: v.createdBy || '—',                  inline: true },
          { name: '📅 Dibuat',     value: new Date(v.createdAt).toLocaleString('id-ID'), inline: true },
        )
        .setTimestamp(),
    ],
    ephemeral: true,
  });
}

// ── Toggle Active ─────────────────────────────────────────────────────────────
async function handleVoucherToggle(interaction) {
  const code = interaction.options.getString('code')?.toUpperCase();
  const v = db.getVoucherByCode(code);
  if (!v) return interaction.reply({ content: `❌ Voucher \`${code}\` tidak ditemukan.`, ephemeral: true });
  db.updateVoucher(code, { active: !v.active });
  return interaction.reply({ content: `${!v.active ? '✅' : '🔴'} Voucher \`${code}\` ${!v.active ? 'diaktifkan' : 'dinonaktifkan'}.`, ephemeral: true });
}

// ── Apply Voucher (user) ──────────────────────────────────────────────────────
async function handleApplyVoucher(interaction, pendingVouchers) {
  const code  = interaction.options.getString('code')?.toUpperCase();
  const result = db.validateVoucher(code);
  if (!result.ok) return interaction.reply({ content: `❌ ${result.reason}`, ephemeral: true });
  const v      = result.voucher;
  const discStr = v.type === 'percent' ? `${v.value}% off` : `${rp(v.value)} off`;
  pendingVouchers.set(interaction.user.id, code);
  return interaction.reply({
    content: `✅ Voucher **${code}** diterapkan! Diskon **${discStr}** akan berlaku di order berikutnya.\n> Lakukan order sekarang untuk menggunakan voucher ini.`,
    ephemeral: true,
  });
}

module.exports = {
  pendingVouchers,
  handleVoucherList,
  showVoucherCreateModal, handleVoucherCreateModal,
  handleVoucherDelete,
  handleVoucherInfo,
  handleVoucherToggle,
  handleApplyVoucher,
};
