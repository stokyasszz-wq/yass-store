const { REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');
const config = require('./config');

const commands = [
  // ── Store Management ──────────────────────────────────────────────────────
  new SlashCommandBuilder().setName('store').setDescription('Post live store embed di channel ini (staff only)'),
  new SlashCommandBuilder().setName('dashboard').setDescription('Buka admin dashboard (staff only)'),
  new SlashCommandBuilder().setName('staffdash').setDescription('Tampilkan live staff dashboard embed (staff only)'),

  new SlashCommandBuilder().setName('open').setDescription('Buka kategori (staff only)')
    .addStringOption(o => o.setName('category').setDescription('ID kategori').setRequired(true)),
  new SlashCommandBuilder().setName('close').setDescription('Tutup kategori (staff only)')
    .addStringOption(o => o.setName('category').setDescription('ID kategori').setRequired(true)),
  new SlashCommandBuilder().setName('opencategory').setDescription('Buka kategori (staff only)')
    .addStringOption(o => o.setName('category').setDescription('ID kategori').setRequired(true)),
  new SlashCommandBuilder().setName('closecategory').setDescription('Tutup kategori (staff only)')
    .addStringOption(o => o.setName('category').setDescription('ID kategori').setRequired(true)),
  new SlashCommandBuilder().setName('deletecategory').setDescription('Hapus kategori (staff only)')
    .addStringOption(o => o.setName('category').setDescription('ID kategori').setRequired(true)),
  new SlashCommandBuilder().setName('addcategory').setDescription('Tambah kategori baru (staff only)'),

  new SlashCommandBuilder().setName('sendproduct').setDescription('Kirim embed produk ke channel (staff only)')
    .addStringOption(o => o.setName('category').setDescription('ID kategori').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Channel tujuan').setRequired(true).addChannelTypes(ChannelType.GuildText)),

  new SlashCommandBuilder().setName('additem').setDescription('Tambah item baru ke store (staff only)'),
  new SlashCommandBuilder().setName('removeitem').setDescription('Hapus item dari store (staff only)'),

  new SlashCommandBuilder().setName('addstock').setDescription('Tambah stock item (staff only)')
    .addStringOption(o => o.setName('id').setDescription('Product ID').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Jumlah').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder().setName('reducestock').setDescription('Kurangi stock item (staff only)')
    .addStringOption(o => o.setName('id').setDescription('Product ID').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Jumlah dikurangi').setRequired(true).setMinValue(1)),

  new SlashCommandBuilder().setName('setstock').setDescription('Set stock item ke nilai tertentu (staff only)')
    .addStringOption(o => o.setName('id').setDescription('Product ID').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Jumlah stock baru').setRequired(true).setMinValue(0)),

  new SlashCommandBuilder().setName('bulkstock').setDescription('Tambah stock banyak item sekaligus via modal (staff only)'),

  // ── Rate Management ───────────────────────────────────────────────────────
  new SlashCommandBuilder().setName('setgigrate').setDescription('Ubah rate GiG (Rp per Robux) — staff only')
    .addIntegerOption(o => o.setName('rate').setDescription('Rate baru, contoh: 86').setRequired(true).setMinValue(1).setMaxValue(10000)),

  new SlashCommandBuilder().setName('setrobuxrate').setDescription('Ubah rate Robux Login (Rp per Robux) — staff only')
    .addIntegerOption(o => o.setName('rate').setDescription('Rate baru, contoh: 145').setRequired(true).setMinValue(1).setMaxValue(10000)),

  new SlashCommandBuilder().setName('gigrate').setDescription('Lihat GiG rate saat ini'),

  // ── Price List ────────────────────────────────────────────────────────────
  new SlashCommandBuilder().setName('pricelist').setDescription('Kirim price list ke channel ini (staff only)')
    .addStringOption(o => o.setName('category').setDescription('ID kategori (kosongkan = GiG)').setRequired(false)),

  // ── Cart ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder().setName('cart').setDescription('Lihat dan kelola cart belanjaan kamu'),
  new SlashCommandBuilder().setName('checkout').setDescription('Checkout semua item di cart kamu sekarang'),

  // ── Voucher ───────────────────────────────────────────────────────────────
  new SlashCommandBuilder().setName('voucher').setDescription('Kelola atau gunakan voucher diskon')
    .addSubcommand(sub => sub.setName('list').setDescription('Lihat semua voucher (staff only)'))
    .addSubcommand(sub => sub.setName('create').setDescription('Buat voucher baru via modal (staff only)'))
    .addSubcommand(sub => sub.setName('delete').setDescription('Hapus voucher (staff only)')
      .addStringOption(o => o.setName('code').setDescription('Kode voucher').setRequired(true)))
    .addSubcommand(sub => sub.setName('info').setDescription('Lihat info voucher (staff only)')
      .addStringOption(o => o.setName('code').setDescription('Kode voucher').setRequired(true)))
    .addSubcommand(sub => sub.setName('toggle').setDescription('Aktifkan/nonaktifkan voucher (staff only)')
      .addStringOption(o => o.setName('code').setDescription('Kode voucher').setRequired(true))),

  new SlashCommandBuilder().setName('applyvoucher').setDescription('Terapkan voucher diskon untuk order berikutnya')
    .addStringOption(o => o.setName('code').setDescription('Kode voucher').setRequired(true)),

  // ── User Commands ─────────────────────────────────────────────────────────
  new SlashCommandBuilder().setName('ping').setDescription('Cek latency bot dan API Discord'),

  new SlashCommandBuilder().setName('profile').setDescription('Lihat profil & riwayat order pengguna')
    .addUserOption(o => o.setName('user').setDescription('User yang ingin dilihat').setRequired(false)),

  new SlashCommandBuilder().setName('myorders').setDescription('Lihat semua riwayat ordermu'),

  new SlashCommandBuilder().setName('invoice').setDescription('Cek detail invoice order')
    .addStringOption(o => o.setName('id').setDescription('Nomor invoice (contoh: YS-0001)').setRequired(true)),

  new SlashCommandBuilder().setName('cancelorder').setDescription('Batalkan order yang masih pending')
    .addStringOption(o => o.setName('invoice').setDescription('Nomor invoice').setRequired(true)),

  new SlashCommandBuilder().setName('leaderboard').setDescription('Lihat top 10 pembeli terbanyak'),
  new SlashCommandBuilder().setName('search').setDescription('Cari produk berdasarkan nama atau ID')
    .addStringOption(o => o.setName('query').setDescription('Kata kunci pencarian').setRequired(true)),

  new SlashCommandBuilder().setName('info').setDescription('Lihat info dan status Yass Store'),
  new SlashCommandBuilder().setName('faq').setDescription('Lihat pertanyaan yang sering ditanyakan (FAQ)'),

  new SlashCommandBuilder().setName('review').setDescription('Beri review untuk order yang sudah selesai')
    .addStringOption(o => o.setName('invoice').setDescription('Nomor invoice order').setRequired(true)),

  new SlashCommandBuilder().setName('reviews').setDescription('Lihat semua review pembeli'),

  // ── Staff Commands ────────────────────────────────────────────────────────
  new SlashCommandBuilder().setName('stats').setDescription('Lihat statistik revenue & order (staff only)'),
  new SlashCommandBuilder().setName('setpayment').setDescription('Update info pembayaran DANA (staff only)'),
  new SlashCommandBuilder().setName('remind').setDescription('Kirim reminder ke semua ticket yang belum bayar (staff only)'),
  new SlashCommandBuilder().setName('maintenance').setDescription('Toggle mode maintenance store (staff only)'),

  new SlashCommandBuilder().setName('ban').setDescription('Ban user dari store (staff only)')
    .addUserOption(o => o.setName('user').setDescription('User yang akan di-ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Alasan ban').setRequired(false)),

  new SlashCommandBuilder().setName('unban').setDescription('Unban user dari store (staff only)')
    .addUserOption(o => o.setName('user').setDescription('User yang akan di-unban').setRequired(true)),

  new SlashCommandBuilder().setName('banlist').setDescription('Lihat daftar user yang di-ban (staff only)'),

  new SlashCommandBuilder().setName('orderhistory').setDescription('Lihat riwayat order milik user tertentu (staff only)')
    .addUserOption(o => o.setName('user').setDescription('User yang dicari').setRequired(true)),

  new SlashCommandBuilder().setName('exportorders').setDescription('Export semua order ke file CSV (staff only)')
    .addStringOption(o =>
      o.setName('filter').setDescription('Filter status order').setRequired(false)
        .addChoices(
          { name: 'Semua', value: 'all' },
          { name: 'Done', value: 'DONE' },
          { name: 'Verified', value: 'VERIFIED' },
          { name: 'Pending', value: 'ORDER CREATED' },
          { name: 'Cancelled', value: 'CANCELLED' },
        )
    ),

  new SlashCommandBuilder().setName('announcement').setDescription('Kirim pengumuman ke channel tertentu (staff only)')
    .addChannelOption(o => o.setName('channel').setDescription('Channel tujuan').setRequired(true).addChannelTypes(ChannelType.GuildText))
    .addStringOption(o => o.setName('message').setDescription('Isi pengumuman').setRequired(true))
    .addStringOption(o => o.setName('title').setDescription('Judul pengumuman (opsional)').setRequired(false))
    .addBooleanOption(o => o.setName('ping').setDescription('Ping staff role? (default: false)').setRequired(false)),

  new SlashCommandBuilder().setName('setlogchannel').setDescription('Set channel untuk log transaksi (staff only)')
    .addChannelOption(o => o.setName('channel').setDescription('Channel log').setRequired(true).addChannelTypes(ChannelType.GuildText)),

  new SlashCommandBuilder().setName('clearreviews').setDescription('Hapus semua review (staff only)'),

  new SlashCommandBuilder().setName('payment').setDescription('Claim ticket dan kirim info pembayaran ke buyer (staff only)')
    .addStringOption(o => o.setName('invoice').setDescription('Nomor invoice (contoh: YS-0001)').setRequired(true)),

  new SlashCommandBuilder().setName('setmypayment').setDescription('Atur info pembayaran DANA pribadimu untuk digunakan saat claim ticket (staff only)'),

  new SlashCommandBuilder().setName('sethistorychannel').setDescription('Set channel riwayat order selesai (staff only)')
    .addChannelOption(o => o.setName('channel').setDescription('Channel untuk riwayat order').setRequired(true).addChannelTypes(ChannelType.GuildText)),

].map(c => c.toJSON());

async function registerCommands(clientId, guildId) {
  const rest = new REST({ version: '10' }).setToken(config.token);
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`[SlashCMD] ✅ ${commands.length} slash commands registered`);
  } catch (err) {
    console.error('[SlashCMD] Failed to register:', err.message);
  }
}

module.exports = { registerCommands };
