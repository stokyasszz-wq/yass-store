const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

async function handleInfo(interaction) {
  await interaction.deferReply({ ephemeral: false });

  const categories = db.getCategories();
  const items      = db.getItems();
  const stock      = db.getStock();
  const orders     = db.getOrders();
  const settings   = db.getSettings();

  const totalStock = items.reduce((s, i) => s + (stock[i.id] ?? 0), 0);
  const totalRevenue = orders
    .filter(o => ['VERIFIED', 'DONE'].includes(o.status))
    .reduce((s, o) => s + (o.totalPrice || o.price || 0), 0);

  const openCats   = categories.filter(c => c.isOpen).length;
  const isMaint    = db.isMaintenanceMode();

  const catLines = categories.map(c => {
    const catItems = items.filter(i => i.categoryId === c.id);
    const catStock = catItems.reduce((s, i) => s + (stock[i.id] ?? 0), 0);
    const status = !c.isOpen ? '🔴 CLOSED' : catStock === 0 ? '🟡 OUT OF STOCK' : '🟢 OPEN';
    return `${c.emoji} **${c.name}** — ${catItems.length} item ┃ ${status}`;
  }).join('\n') || '—';

  const embed = new EmbedBuilder()
    .setColor(isMaint ? config.colors.danger : config.colors.success)
    .setTitle('🏪  Yass Store — Info')
    .setDescription(
      isMaint
        ? '> ⚠️ **MAINTENANCE MODE** — Store sedang ditutup sementara.\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        : '> Top Up Aman, Murah & Terpercaya!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    )
    .addFields(
      { name: '📂 Status Store',    value: isMaint ? '🔴 MAINTENANCE' : '🟢 ONLINE', inline: true },
      { name: '📦 Total Item',      value: `**${items.length}**`,   inline: true },
      { name: '📊 Total Stock',     value: `**${totalStock}**`,     inline: true },
      { name: '📂 Kategori Open',   value: `**${openCats}/${categories.length}**`, inline: true },
      { name: '📋 Total Order',     value: `**${orders.length}**`,  inline: true },
      { name: '💰 Total Revenue',   value: `**${rp(totalRevenue)}**`, inline: true },
      { name: '💳 Pembayaran',      value: `DANA: \`${config.dana.number}\`\n${config.dana.name}`, inline: false },
      { name: '📂 Kategori',        value: catLines, inline: false },
    )
    .setFooter({ text: `Yass Store Bot • Robux Rate: ${settings.robuxRate || 145}/R$` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleFaq(interaction) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.blurple)
    .setTitle('❓  FAQ — Pertanyaan Umum')
    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    .addFields(
      {
        name: '1️⃣  Bagaimana cara order?',
        value: 'Gunakan `/store` atau `!store` untuk melihat katalog.\nPilih item → Klik **Order Sekarang** atau **Tambah ke Cart** → Ikuti instruksi di ticket.',
      },
      {
        name: '2️⃣  Pembayaran lewat apa?',
        value: `Transfer via **DANA** ke nomor \`${config.dana.number}\` a/n **${config.dana.name}**.\nTransfer tepat sesuai nominal yang tertera.`,
      },
      {
        name: '3️⃣  Berapa lama prosesnya?',
        value: 'Verifikasi dilakukan maksimal **15 menit** setelah bukti diterima.\nBiasanya lebih cepat jika staff online.',
      },
      {
        name: '4️⃣  Bagaimana jika item habis?',
        value: 'Item yang habis (OUT OF STOCK) tidak bisa diorder.\nTunggu restock atau hubungi staff.',
      },
      {
        name: '5️⃣  Bisakah cancel order?',
        value: 'Bisa! Gunakan `/cancelorder <invoice>` selama status masih **ORDER CREATED** atau **WAITING PAYMENT**.\nStock akan otomatis dikembalikan.',
      },
      {
        name: '6️⃣  Bagaimana cek status order?',
        value: 'Gunakan `/myorders` untuk lihat semua ordermu.\nAtau `/invoice <id>` untuk cek invoice tertentu.',
      },
      {
        name: '7️⃣  Ada masalah/pertanyaan lain?',
        value: 'Tag staff yang online atau buat ticket support.',
      },
    )
    .setFooter({ text: 'Yass Store Bot • FAQ' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { handleInfo, handleFaq };
