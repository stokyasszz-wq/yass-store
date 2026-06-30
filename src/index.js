const {
  Client, GatewayIntentBits, Partials, Events, EmbedBuilder,
} = require('discord.js');

const config = require('./config');
const db     = require('./db');
const liveStore = require('./liveStore');
const { registerCommands } = require('./slashCommands');
const { handleButtonInteraction, handleSelectInteraction } = require('./handlers/buttonHandler');
const { handleProofUpload } = require('./handlers/proofHandler');
const { handleResetData, handleOrders, handleStock, handleAddStock, handleRevenue, handleTopBuyers } = require('./handlers/adminCommands');
const { handleDashboard } = require('./handlers/dashboardHandler');
const { handleAddStockModal, handleReduceStockModal } = require('./handlers/stockPanel');
const { handleVerifyModal, handleForceCloseModal } = require('./handlers/orderPanel');
const { handleOpenCategory, handleCloseCategory } = require('./handlers/categoryPanel');
const { handleSendProduct } = require('./handlers/sendProductHandler');
const { showAddItemModal, handleAddItemModal, showRemoveItemSlashModal, showRemoveItemModal, handleRemoveItemModal, showAddCategoryModal, handleAddCategoryModal } = require('./handlers/addItemHandler');
const { handleSetRateModal, handleSetGigRateModal, handleSetGigRateSlash, handleSetRobuxRateSlash } = require('./handlers/securityPanel');
const { handlePriceModal } = require('./handlers/setPriceHandler');
const { handleViewCart, handleCheckoutCommand } = require('./handlers/cartHandler');
const { postStore } = require('./liveStore');
const { startWebServer } = require('./web/server');

const { handlePing }        = require('./handlers/pingHandler');
const { handleProfile }     = require('./handlers/profileHandler');
const { handleStats }       = require('./handlers/statsHandler');
const { handleLeaderboard } = require('./handlers/leaderboardHandler');
const { handleCancelOrder } = require('./handlers/cancelOrderHandler');
const { showSetPaymentModal, handleSetPaymentModal } = require('./handlers/setPaymentHandler');
const { handleRemind }      = require('./handlers/remindHandler');
const { handleSearch }      = require('./handlers/searchHandler');
const { handleMyOrders }    = require('./handlers/myOrdersHandler');
const { handleInvoiceLookup } = require('./handlers/invoiceLookupHandler');
const { handleBan, handleUnban, handleBanList } = require('./handlers/banHandler');
const { handleMaintenance } = require('./handlers/maintenanceHandler');
const { handleInfo, handleFaq } = require('./handlers/infoHandler');
const { showReviewModal, handleReviewModal, handleReviews, handleClearReviews } = require('./handlers/reviewHandler');
const { handleAnnouncement } = require('./handlers/announcementHandler');
const { handleOrderHistory } = require('./handlers/orderHistoryHandler');
const { handleExportOrders } = require('./handlers/exportHandler');
const { showBulkStockModal, handleBulkStockModal } = require('./handlers/bulkStockHandler');
const { handleSetLogChannel } = require('./handlers/logChannelHandler');
const { handleReduceStock, handleSetStock } = require('./handlers/reduceStockCommandHandler');
const { handleGigManualModal } = require('./handlers/gigManualOrderHandler');
const { handlePaymentClaim } = require('./handlers/paymentClaimHandler');
const { showSetMyPaymentModal, handleSetMyPaymentModal } = require('./handlers/setMyPaymentHandler');
const { handleSetHistoryChannel } = require('./handlers/orderHistoryChannel');

['token', 'guildId', 'staffRoleId'].forEach(key => {
  if (!config[key]) { console.error(`[BOT] Config missing: ${key}`); process.exit(1); }
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Message, Partials.Channel],
});

liveStore.setClient(client);

client.once(Events.ClientReady, async (c) => {
  const gigRate = db.getGigRate();
  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log(`✅  Yass Store Bot ONLINE — ${c.user.tag}`);
  console.log(`🏪  Guild    : ${config.guildId}`);
  console.log(`👮  Staff    : ${config.staffRoleId}`);
  console.log(`💳  Dana     : ${config.dana.number} (${config.dana.name})`);
  console.log(`📦  Items    : ${db.getItems().length}`);
  console.log(`📂  Cats     : ${db.getCategories().length}`);
  console.log(`💰  GiG Rate : Rp${gigRate}/R$`);
  console.log(`🔧  Maint    : ${db.isMaintenanceMode() ? 'ON' : 'OFF'}`);
  console.log(`🔨  Bans     : ${Object.keys(db.getBans()).length}`);
  console.log('══════════════════════════════════════════════════════');
  console.log('');

  c.user.setActivity('🛒 Yass Store | /info', { type: 3 });
  await registerCommands(c.application.id, config.guildId);
  db.getStock();

  const settings = db.getSettings();
  if (settings.danaNumber) config.dana.number = settings.danaNumber;
  if (settings.danaName)   config.dana.name   = settings.danaName;
});

// ── Message Commands ──────────────────────────────────────────────────────────
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  const lower = message.content.trim().toLowerCase();

  if (lower === '!store')          { const { handleStoreCommand } = require('./handlers/storeCommand'); return handleStoreCommand(message); }
  if (lower === '!stock')          return handleStock(message);
  if (lower === '!orders')         return handleOrders(message);
  if (lower === '!resetdata')      return handleResetData(message);
  if (lower === '!revenue')        return handleRevenue(message);
  if (lower === '!topbuyers')      return handleTopBuyers(message);
  if (lower.startsWith('!addstock')) return handleAddStock(message);

  if (lower === '!help') {
    const embed = new EmbedBuilder()
      .setTitle('📖  Yass Store Bot — Help')
      .setColor(config.colors.primary)
      .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      .addFields(
        { name: '📋 Slash — Staff', value: '`/store` `/dashboard` `/stats` `/setpayment` `/remind` `/maintenance`\n`/additem` `/removeitem` `/addstock` `/reducestock` `/setstock` `/bulkstock`\n`/addcategory` `/opencategory` `/closecategory` `/deletecategory`\n`/setgigrate` `/setrobuxrate` `/gigrate` `/pricelist`\n`/ban` `/unban` `/banlist` `/orderhistory` `/exportorders`\n`/announcement` `/setlogchannel` `/clearreviews`' },
        { name: '📋 Slash — Semua User', value: '`/ping` `/info` `/faq` `/search` `/profile` `/myorders`\n`/invoice` `/cancelorder` `/leaderboard` `/review` `/reviews`\n`/cart` `/checkout`' },
        { name: '🤖 Prefix — Staff', value: '`!orders` `!stock` `!addstock` `!revenue` `!topbuyers` `!resetdata`' },
        { name: '🤖 Prefix — Semua', value: '`!store` `!help`' },
        { name: '🌐 Web Dashboard', value: 'Akses via preview Replit — port 5000' },
      )
      .setFooter({ text: 'Yass Store Bot • Anti-Scam System' });
    return message.reply({ embeds: [embed] });
  }

  await handleProofUpload(message);
});

// ── Interaction Handler ───────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;
      const isStaff = interaction.member?.roles?.cache?.has(config.staffRoleId);
      const staffOnly = async () => {
        if (!isStaff) { await interaction.reply({ content: '❌ Hanya staff yang bisa menggunakan command ini!', ephemeral: true }); return true; }
        return false;
      };

      // ── Store Management ──────────────────────────────────────────────────
      if (commandName === 'store') {
        if (await staffOnly()) return;
        await interaction.deferReply({ ephemeral: true });
        await postStore(interaction.channel);
        return interaction.editReply({ content: '✅ Live store berhasil dipost di channel ini!' });
      }
      if (commandName === 'dashboard') return handleDashboard(interaction);

      if (commandName === 'open')         { if (await staffOnly()) return; return handleOpenCategory(interaction.options.getString('category'), interaction); }
      if (commandName === 'close')        { if (await staffOnly()) return; return handleCloseCategory(interaction.options.getString('category'), interaction); }
      if (commandName === 'opencategory') { if (await staffOnly()) return; return handleOpenCategory(interaction.options.getString('category'), interaction); }
      if (commandName === 'closecategory'){ if (await staffOnly()) return; return handleCloseCategory(interaction.options.getString('category'), interaction); }
      if (commandName === 'addcategory')  { if (await staffOnly()) return; return showAddCategoryModal(interaction); }
      if (commandName === 'additem')      { if (await staffOnly()) return; return showAddItemModal(interaction); }
      if (commandName === 'removeitem')   { if (await staffOnly()) return; return showRemoveItemSlashModal(interaction); }
      if (commandName === 'sendproduct')  { if (await staffOnly()) return; return handleSendProduct(interaction); }
      if (commandName === 'bulkstock')    { if (await staffOnly()) return; return showBulkStockModal(interaction); }

      if (commandName === 'deletecategory') {
        if (await staffOnly()) return;
        const catId = interaction.options.getString('category');
        const cat = db.getCategoryById(catId);
        if (!cat) return interaction.reply({ content: `❌ Kategori \`${catId}\` tidak ditemukan.`, ephemeral: true });
        db.deleteCategory(catId); await liveStore.refresh();
        return interaction.reply({ content: `🗑️ Kategori **${cat.name}** dihapus.`, ephemeral: true });
      }

      if (commandName === 'addstock') {
        if (await staffOnly()) return;
        const itemId = interaction.options.getString('id');
        const amount = interaction.options.getInteger('amount');
        const item   = db.getItemById(itemId);
        if (!item) return interaction.reply({ content: `❌ Item \`${itemId}\` tidak ditemukan.`, ephemeral: true });
        const stock = db.getStock(); stock[itemId] = (stock[itemId] || 0) + amount; db.setStock(stock);
        await liveStore.refresh();
        return interaction.reply({ content: `✅ Stock **${item.name}** +**${amount}**. Total: **${stock[itemId]}**`, ephemeral: true });
      }
      if (commandName === 'reducestock') { if (await staffOnly()) return; return handleReduceStock(interaction); }
      if (commandName === 'setstock')    { if (await staffOnly()) return; return handleSetStock(interaction); }

      // ── Rate Commands ─────────────────────────────────────────────────────
      if (commandName === 'setgigrate')   { if (await staffOnly()) return; return handleSetGigRateSlash(interaction); }
      if (commandName === 'setrobuxrate') { if (await staffOnly()) return; return handleSetRobuxRateSlash(interaction); }
      if (commandName === 'gigrate') {
        const rate = db.getGigRate();
        const items = db.getItemsByCategory('gift_in_game').slice(0, 6);
        const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;
        const examples = items.map(i => `• ${i.emoji} **${i.name}** — ©${i.robuxAmount} = **${rp(i.robuxAmount * rate)}**`).join('\n') || '—';
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.gold)
              .setTitle('💰 GiG Rate Saat Ini')
              .setDescription(`Rate: **Rp ${rate}** per Robux (©)\n\n**Contoh harga:**\n${examples}`)
              .setFooter({ text: 'Gunakan /setgigrate untuk mengubah rate' })
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      // ── Price List ────────────────────────────────────────────────────────
      if (commandName === 'pricelist') {
        if (await staffOnly()) return;
        const catId = interaction.options.getString('category') || 'gift_in_game';
        const cat   = db.getCategoryById(catId);
        if (!cat) return interaction.reply({ content: `❌ Kategori \`${catId}\` tidak ditemukan.`, ephemeral: true });
        const items = db.getItemsByCategory(catId);
        const stock = db.getStock();
        const embed = require('./embeds').categoryOrderEmbed(cat, items, stock);
        await interaction.deferReply({ ephemeral: true });
        await interaction.channel.send({ embeds: [embed] });
        return interaction.editReply({ content: '✅ Price list berhasil dikirim ke channel!' });
      }

      // ── Staff Tools ───────────────────────────────────────────────────────
      if (commandName === 'stats')        { if (await staffOnly()) return; return handleStats(interaction); }
      if (commandName === 'setpayment')   { if (await staffOnly()) return; return showSetPaymentModal(interaction); }
      if (commandName === 'remind')       { if (await staffOnly()) return; return handleRemind(interaction); }
      if (commandName === 'maintenance')  { if (await staffOnly()) return; return handleMaintenance(interaction); }
      if (commandName === 'ban')          { if (await staffOnly()) return; return handleBan(interaction); }
      if (commandName === 'unban')        { if (await staffOnly()) return; return handleUnban(interaction); }
      if (commandName === 'banlist')      { if (await staffOnly()) return; return handleBanList(interaction); }
      if (commandName === 'orderhistory') { if (await staffOnly()) return; return handleOrderHistory(interaction); }
      if (commandName === 'exportorders') { if (await staffOnly()) return; return handleExportOrders(interaction); }
      if (commandName === 'announcement') { if (await staffOnly()) return; return handleAnnouncement(interaction); }
      if (commandName === 'setlogchannel'){ if (await staffOnly()) return; return handleSetLogChannel(interaction); }
      if (commandName === 'clearreviews') { if (await staffOnly()) return; return handleClearReviews(interaction); }

      if (commandName === 'payment')           { if (await staffOnly()) return; return handlePaymentClaim(interaction); }
      if (commandName === 'setmypayment')      { if (await staffOnly()) return; return showSetMyPaymentModal(interaction); }
      if (commandName === 'sethistorychannel') { if (await staffOnly()) return; return handleSetHistoryChannel(interaction); }

      // ── Cart ──────────────────────────────────────────────────────────────
      if (commandName === 'cart')     return handleViewCart(interaction);
      if (commandName === 'checkout') return handleCheckoutCommand(interaction);

      // ── User Commands ─────────────────────────────────────────────────────
      if (commandName === 'ping')        return handlePing(interaction);
      if (commandName === 'profile')     return handleProfile(interaction);
      if (commandName === 'myorders')    return handleMyOrders(interaction);
      if (commandName === 'leaderboard') return handleLeaderboard(interaction);
      if (commandName === 'search')      return handleSearch(interaction);
      if (commandName === 'info')        return handleInfo(interaction);
      if (commandName === 'faq')         return handleFaq(interaction);
      if (commandName === 'cancelorder') return handleCancelOrder(interaction);
      if (commandName === 'invoice')     return handleInvoiceLookup(interaction);
      if (commandName === 'review')      return showReviewModal(interaction);
      if (commandName === 'reviews')     return handleReviews(interaction);

      return;
    }

    if (interaction.isStringSelectMenu()) return handleSelectInteraction(interaction);
    if (interaction.isButton())           return handleButtonInteraction(interaction);

    if (interaction.isModalSubmit()) {
      const id = interaction.customId;
      if (id === 'modal_stock_add')         return handleAddStockModal(interaction);
      if (id === 'modal_stock_reduce')      return handleReduceStockModal(interaction);
      if (id === 'modal_order_verify')      return handleVerifyModal(interaction);
      if (id === 'modal_order_force_close') return handleForceCloseModal(interaction);
      if (id === 'modal_add_item')          return handleAddItemModal(interaction);
      if (id === 'modal_remove_item')       return handleRemoveItemModal(interaction);
      if (id === 'modal_add_category')      return handleAddCategoryModal(interaction);
      if (id === 'modal_set_robux_rate')    return handleSetRateModal(interaction);
      if (id === 'modal_set_gig_rate')      return handleSetGigRateModal(interaction);
      if (id === 'modal_price_set')         return handlePriceModal(interaction);
      if (id === 'modal_set_payment')       return handleSetPaymentModal(interaction);
      if (id === 'modal_bulk_stock')        return handleBulkStockModal(interaction);
      if (id === 'modal_gig_manual')        return handleGigManualModal(interaction);
      if (id === 'modal_set_my_payment')    return handleSetMyPaymentModal(interaction);
      if (id.startsWith('modal_review_'))   return handleReviewModal(interaction, id.replace('modal_review_', ''));
      if (id === 'modal_inv_search') {
        const { handleInvoiceSearchModal } = require('./handlers/invoicePanel');
        return handleInvoiceSearchModal(interaction);
      }
    }

  } catch (err) {
    console.error('[BOT] Interaction error:', err.message, err.stack?.split('\n')[1]);
    try {
      const msg = { content: '❌ Terjadi error. Coba lagi atau hubungi staff.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    } catch (_) {}
  }
});

client.on('error', (err) => console.error('[BOT] Client error:', err.message));

process.on('unhandledRejection', (err) => {
  const msg = err?.message || String(err);
  if (msg.includes('disallowed intents')) {
    console.error('\n❌  MESSAGE CONTENT INTENT BELUM DIAKTIFKAN!');
    console.error('→ discord.com/developers/applications → Bot → Privileged Gateway Intents\n');
    process.exit(1);
  }
  console.error('[BOT] Unhandled rejection:', msg);
});

// ── Start Web Dashboard ───────────────────────────────────────────────────────
startWebServer(5000);

client.login(config.token);

