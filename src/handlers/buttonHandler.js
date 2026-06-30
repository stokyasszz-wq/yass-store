const db = require('../db');
const embeds = require('../embeds');
const config = require('../config');
const { sendLog } = require('./logManager');

const claimedTickets = new Map();

async function handleButtonInteraction(interaction) {
  const id = interaction.customId;

  if (id === 'store_game_ff') {
    const { handleGameSelect } = require('./storeCommand');
    return handleGameSelect(interaction, 'freefire');
  }
  if (id === 'store_game_ml') {
    const { handleGameSelect } = require('./storeCommand');
    return handleGameSelect(interaction, 'mobilelegend');
  }

  if (id.startsWith('ls_order_')) {
    const catId = id.replace('ls_order_', '');
    const { showCategoryStore } = require('./storeCommand');
    return showCategoryStore(interaction, catId);
  }

  if (id === 'store_order_now') {
    const { handleOrderNow } = require('./purchaseFlow');
    return handleOrderNow(interaction);
  }
  if (id === 'store_nego') {
    return interaction.reply({ embeds: [embeds.negoEmbed()], ephemeral: true });
  }

  if (id === 'dash_panel_stock') {
    const { showStockPanel } = require('./stockPanel');
    return showStockPanel(interaction);
  }
  if (id === 'dash_panel_category') {
    const { showCategoryPanel } = require('./categoryPanel');
    return showCategoryPanel(interaction);
  }
  if (id === 'dash_panel_order') {
    const { showOrderPanel } = require('./orderPanel');
    return showOrderPanel(interaction);
  }
  if (id === 'dash_panel_analytics') {
    const { showAnalytics } = require('./analyticsPanel');
    return showAnalytics(interaction);
  }
  if (id === 'dash_panel_security') {
    const { showSecurityPanel } = require('./securityPanel');
    return showSecurityPanel(interaction);
  }
  if (id === 'dash_back') {
    const { dashboardEmbed, dashboardButtons } = require('./dashboardHandler');
    return interaction.update({ embeds: [dashboardEmbed()], components: dashboardButtons() });
  }

  if (id === 'sp_add')         { const { showAddStockModal }  = require('./stockPanel');      return showAddStockModal(interaction); }
  if (id === 'sp_reduce')      { const { showReduceStockModal }= require('./stockPanel');      return showReduceStockModal(interaction); }
  if (id === 'sp_view')        { const { showStockView }       = require('./stockPanel');      return showStockView(interaction); }
  if (id === 'sp_set_price')   { const { showCategorySelect }  = require('./setPriceHandler'); return showCategorySelect(interaction); }
  if (id === 'sp_add_item')    { const { showAddItemModal }    = require('./addItemHandler');  return showAddItemModal(interaction); }
  if (id === 'sp_remove_item') { const { showRemoveItemModal } = require('./addItemHandler');  return showRemoveItemModal(interaction); }

  if (id === 'cp_add')    { const { showAddCategoryModal } = require('./categoryPanel'); return showAddCategoryModal(interaction); }
  if (id === 'cp_open')   { const { showOpenSelect }       = require('./categoryPanel'); return showOpenSelect(interaction); }
  if (id === 'cp_close')  { const { showCloseSelect }      = require('./categoryPanel'); return showCloseSelect(interaction); }
  if (id === 'cp_delete') { const { showDeleteSelect }     = require('./categoryPanel'); return showDeleteSelect(interaction); }

  if (id === 'dash_panel_cart')    { const { showCartMonitor }    = require('./cartMonitorPanel');  return showCartMonitor(interaction); }
  if (id === 'dash_panel_invoice') { const { showInvoicePanel }   = require('./invoicePanel');      return showInvoicePanel(interaction); }
  if (id === 'dash_panel_verify')  { const { showPendingInvoices }= require('./invoicePanel');      return showPendingInvoices(interaction); }
  if (id === 'dash_panel_tracker') { const { showOrderTracker }   = require('./orderTrackerPanel'); return showOrderTracker(interaction); }
  if (id === 'dash_panel_refund')  { const { showRefundPanel }    = require('./refundPanel');       return showRefundPanel(interaction); }

  if (id === 'cm_refresh')  { const { showCartMonitor }    = require('./cartMonitorPanel');  return showCartMonitor(interaction); }
  if (id === 'inv_refresh') { const { showInvoicePanel }   = require('./invoicePanel');      return showInvoicePanel(interaction); }
  if (id === 'inv_panel')   { const { showInvoicePanel }   = require('./invoicePanel');      return showInvoicePanel(interaction); }
  if (id === 'inv_pending') { const { showPendingInvoices }   = require('./invoicePanel');      return showPendingInvoices(interaction); }
  if (id === 'inv_search')  { const { showInvoiceSearchModal }= require('./invoicePanel');      return showInvoiceSearchModal(interaction); }
  if (id === 'ot_refresh')  { const { showOrderTracker }      = require('./orderTrackerPanel'); return showOrderTracker(interaction); }
  if (id === 'refund_panel'){ const { showRefundPanel }    = require('./refundPanel');       return showRefundPanel(interaction); }
  if (id.startsWith('refund_confirm_')) {
    const { handleRefundConfirm } = require('./refundPanel');
    return handleRefundConfirm(interaction, id.replace('refund_confirm_', ''));
  }
  if (id.startsWith('sp_remove_confirm_')) {
    const { handleRemoveConfirm } = require('./addItemHandler');
    return handleRemoveConfirm(interaction, id.replace('sp_remove_confirm_', ''));
  }

  if (id === 'cart_add') {
    const { handleAddToCart } = require('./cartHandler');
    const { pendingSelections } = require('./purchaseFlow');
    return handleAddToCart(interaction, pendingSelections);
  }
  if (id === 'cart_checkout')     { const { handleCartCheckout }   = require('./cartHandler'); return handleCartCheckout(interaction); }
  if (id === 'cart_remove_item')  { const { handleCartRemoveMenu } = require('./cartHandler'); return handleCartRemoveMenu(interaction); }
  if (id === 'cart_clear')        { const { handleCartClear }      = require('./cartHandler'); return handleCartClear(interaction); }
  if (id === 'cart_refresh')      { const { handleViewCart }       = require('./cartHandler'); return handleViewCart(interaction, true); }

  if (id === 'op_view')        { const { showOrderView }       = require('./orderPanel'); return showOrderView(interaction); }
  if (id === 'op_verify')      { const { showVerifyModal }     = require('./orderPanel'); return showVerifyModal(interaction); }
  if (id === 'op_force_close') { const { showForceCloseModal } = require('./orderPanel'); return showForceCloseModal(interaction); }

  if (id === 'sec_set_rate')     { const { showSetRateModal }     = require('./securityPanel'); return showSetRateModal(interaction); }
  if (id === 'sec_set_gig_rate') { const { showSetGigRateModal }  = require('./securityPanel'); return showSetGigRateModal(interaction); }
  if (id === 'sec_toggle_spam')  { const { handleToggleAntiSpam } = require('./securityPanel'); return handleToggleAntiSpam(interaction); }
  if (id === 'sec_recalc_robux') { const { handleRecalcRobux }    = require('./securityPanel'); return handleRecalcRobux(interaction); }

  if (id === 'gig_manual_order') {
    const { showGigManualModal } = require('./gigManualOrderHandler');
    return showGigManualModal(interaction);
  }

  if (id.startsWith('claim_ticket_'))      return handleClaimTicket(interaction,    id.replace('claim_ticket_', ''));
  if (id.startsWith('verify_payment_'))    return handleVerifyPayment(interaction,  id.replace('verify_payment_', ''));
  if (id.startsWith('close_ticket_'))      return handleCloseTicket(interaction,    id.replace('close_ticket_', ''));
  if (id.startsWith('payment_done_'))      return handlePaymentDone(interaction,    id.replace('payment_done_', ''));
  if (id.startsWith('upload_bukti_'))      return handleUploadBukti(interaction,    id.replace('upload_bukti_', ''));
  if (id.startsWith('done_order_'))        return handleDoneOrder(interaction,      id.replace('done_order_', ''));
  if (id.startsWith('cancel_order_btn_')) return handleCancelOrderBtn(interaction, id.replace('cancel_order_btn_', ''));
}

async function handleSelectInteraction(interaction) {
  const id = interaction.customId;
  if (id === 'store_select_item') { const { handleItemSelect }          = require('./purchaseFlow');    return handleItemSelect(interaction); }
  if (id === 'cat_select_open')   { const { handleCategorySelectOpen }  = require('./categoryPanel');   return handleCategorySelectOpen(interaction); }
  if (id === 'cat_select_close')  { const { handleCategorySelectClose } = require('./categoryPanel');   return handleCategorySelectClose(interaction); }
  if (id === 'cat_select_delete') { const { handleCategorySelectDelete }= require('./categoryPanel');   return handleCategorySelectDelete(interaction); }
  if (id === 'sp_price_cat')       { const { showItemSelect }              = require('./setPriceHandler'); return showItemSelect(interaction); }
  if (id === 'sp_price_item')      { const { showPriceModal }              = require('./setPriceHandler'); return showPriceModal(interaction); }
  if (id === 'sp_add_cat')         { const { showAddStockItemSelect }      = require('./stockPanel');      return showAddStockItemSelect(interaction); }
  if (id === 'sp_add_item_sel')    { const { showAddStockQtyModal }        = require('./stockPanel');      return showAddStockQtyModal(interaction); }
  if (id === 'sp_reduce_cat')      { const { showReduceStockItemSelect }   = require('./stockPanel');      return showReduceStockItemSelect(interaction); }
  if (id === 'sp_reduce_item_sel') { const { showReduceStockQtyModal }     = require('./stockPanel');      return showReduceStockQtyModal(interaction); }
  if (id === 'sp_remove_cat')      { const { showRemoveItemItemSelect }    = require('./addItemHandler');  return showRemoveItemItemSelect(interaction); }
  if (id === 'sp_remove_item_sel') { const { showRemoveItemConfirm }       = require('./addItemHandler');  return showRemoveItemConfirm(interaction); }
  if (id === 'cart_select_remove') { const { handleCartSelectRemove }      = require('./cartHandler');     return handleCartSelectRemove(interaction); }
  if (id === 'refund_select')      { const { handleRefundSelect }          = require('./refundPanel');     return handleRefundSelect(interaction); }
}

async function handlePaymentDone(interaction, invoice) {
  const order = db.getOrderByInvoice(invoice);
  if (!order) return interaction.reply({ content: '❌ Order tidak ditemukan.', ephemeral: true });
  if (order.userId !== interaction.user.id)
    return interaction.reply({ content: '❌ Hanya pembeli ticket ini yang bisa klik tombol ini!', ephemeral: true });
  if (['PROOF SENT', 'VERIFIED', 'DONE'].includes(order.status))
    return interaction.reply({ content: '✅ Status sudah diperbarui sebelumnya.', ephemeral: true });

  db.updateOrder(invoice, { status: 'WAITING PAYMENT' });
  db.appendOrderLog(invoice, 'PAYMENT DONE clicked', interaction.user.tag);

  await interaction.reply({
    content: `✅ <@${interaction.user.id}> sudah konfirmasi bayar!\n📸 Sekarang **upload screenshot bukti transfer** langsung di chat channel ini.`,
  });
}

async function handleUploadBukti(interaction, invoice) {
  const order = db.getOrderByInvoice(invoice);
  if (!order) return interaction.reply({ content: '❌ Order tidak ditemukan.', ephemeral: true });
  if (order.userId !== interaction.user.id)
    return interaction.reply({ content: '❌ Hanya pembeli ticket ini yang bisa upload bukti!', ephemeral: true });

  await interaction.reply({
    content: '📸 **Cara upload bukti transfer:**\n1. Screenshot riwayat transfer di DANA\n2. Kirim gambar **langsung di chat channel ini**\n> ⚠️ Hanya gambar yang diterima.',
    ephemeral: true,
  });
}

async function handleDoneOrder(interaction, invoice) {
  if (!interaction.member.roles.cache.has(config.staffRoleId))
    return interaction.reply({ content: '❌ Hanya staff yang bisa menandai order selesai!', ephemeral: true });

  const order = db.getOrderByInvoice(invoice);
  if (!order) return interaction.reply({ content: '❌ Order tidak ditemukan.', ephemeral: true });
  if (order.status === 'DONE')
    return interaction.reply({ content: '✅ Order ini sudah berstatus DONE sebelumnya.', ephemeral: true });
  if (order.status === 'CANCELLED')
    return interaction.reply({ content: '❌ Order ini sudah dibatalkan.', ephemeral: true });

  db.updateOrder(invoice, { status: 'DONE', doneBy: interaction.user.id });
  db.appendOrderLog(invoice, 'DONE', interaction.user.tag);
  const updated = db.getOrderByInvoice(invoice);

  const { EmbedBuilder } = require('discord.js');
  const doneEmbed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('✅  Order Selesai!')
    .setDescription(`Invoice **${invoice}** telah ditandai selesai oleh <@${interaction.user.id}>.`)
    .addFields(
      { name: '👤 Pembeli', value: `<@${order.userId}>`, inline: true },
      { name: '🛍️ Item',   value: order.itemName || (order.isCart ? 'Cart Order' : '—'), inline: true },
      { name: '💰 Total',  value: `Rp ${Number(order.totalPrice || order.price || 0).toLocaleString('id-ID')}`, inline: true },
    )
    .setFooter({ text: `Diselesaikan oleh ${interaction.user.tag} • Yass Store Bot` })
    .setTimestamp();

  await interaction.reply({ content: `✅ Order **${invoice}** berhasil ditandai **DONE**!\n> <@${order.userId}> Item kamu sudah dikirim/selesai diproses. Terima kasih! 🎉`, embeds: [doneEmbed] });

  if (interaction.guild) {
    const { sendLog } = require('./logManager');
    await sendLog(interaction.guild, updated, 'DONE', `Marked done by ${interaction.user.tag}`);
    const { postOrderDone } = require('./orderHistoryChannel');
    await postOrderDone(interaction.guild, updated, interaction.user.tag);
  }

  setTimeout(async () => { try { await interaction.channel.delete(); } catch (_) {} }, 10_000);
}

async function handleCancelOrderBtn(interaction, invoice) {
  const order = db.getOrderByInvoice(invoice);
  if (!order) return interaction.reply({ content: '❌ Order tidak ditemukan.', ephemeral: true });

  const isStaff = interaction.member?.roles?.cache?.has(config.staffRoleId);
  if (order.userId !== interaction.user.id && !isStaff)
    return interaction.reply({ content: '❌ Kamu hanya bisa cancel order milikmu sendiri!', ephemeral: true });

  if (['DONE', 'CANCELLED', 'REFUNDED'].includes(order.status))
    return interaction.reply({ content: `❌ Order sudah **${order.status}**, tidak bisa dibatalkan.`, ephemeral: true });

  if (!isStaff && order.status === 'PROOF SENT')
    return interaction.reply({ content: '❌ Bukti sudah dikirim. Hubungi staff untuk membatalkan.', ephemeral: true });

  const stock = db.getStock();
  if (order.items && order.items.length > 0) {
    for (const item of order.items) stock[item.id] = (stock[item.id] ?? 0) + (item.quantity || 1);
  } else if (order.itemId) {
    stock[order.itemId] = (stock[order.itemId] ?? 0) + 1;
  }
  db.setStock(stock);

  db.updateOrder(invoice, { status: 'CANCELLED' });
  db.appendOrderLog(invoice, 'CANCELLED', interaction.user.tag);

  await interaction.reply({ content: `❌ Order **${invoice}** telah dibatalkan oleh <@${interaction.user.id}>.\n🔒 Channel ini akan ditutup dalam 10 detik.` });

  if (interaction.guild) {
    const { sendLog } = require('./logManager');
    await sendLog(interaction.guild, db.getOrderByInvoice(invoice), 'CANCELLED', `Cancelled by ${interaction.user.tag}`);
  }

  setTimeout(async () => { try { await interaction.channel.delete(); } catch (_) {} }, 10_000);
}

async function handleClaimTicket(interaction, invoice) {
  if (!interaction.member.roles.cache.has(config.staffRoleId))
    return interaction.reply({ content: '❌ Hanya staff yang bisa claim ticket!', ephemeral: true });

  if (claimedTickets.has(invoice)) {
    return interaction.reply({ content: `❌ Ticket ini sudah di-claim oleh <@${claimedTickets.get(invoice)}>!`, ephemeral: true });
  }

  claimedTickets.set(invoice, interaction.user.id);
  db.updateOrder(invoice, { claimedBy: interaction.user.id });
  db.appendOrderLog(invoice, 'CLAIMED', interaction.user.tag);

  await interaction.reply({ content: `📌 Ticket **${invoice}** di-claim oleh <@${interaction.user.id}>!\n> Hanya kamu yang bisa close ticket ini.` });

  const order = db.getOrderByInvoice(invoice);
  if (interaction.guild && order) await sendLog(interaction.guild, order, 'CLAIMED', `Claimed by ${interaction.user.tag}`);
}

async function handleVerifyPayment(interaction, invoice) {
  if (!interaction.member.roles.cache.has(config.staffRoleId))
    return interaction.reply({ content: '❌ Hanya staff yang bisa verify!', ephemeral: true });

  const order = db.getOrderByInvoice(invoice);
  if (!order) return interaction.reply({ content: '❌ Order tidak ditemukan.', ephemeral: true });
  if (order.status === 'VERIFIED' || order.status === 'DONE')
    return interaction.reply({ content: '✅ Sudah terverifikasi sebelumnya.', ephemeral: true });
  if (['ORDER CREATED', 'WAITING PAYMENT'].includes(order.status))
    return interaction.reply({ content: '❌ User belum upload bukti! Tunggu status **PROOF SENT**.', ephemeral: true });

  db.updateOrder(invoice, { status: 'VERIFIED' });
  db.appendOrderLog(invoice, 'VERIFIED', interaction.user.tag);
  const updated = db.getOrderByInvoice(invoice);

  await interaction.reply({ embeds: [embeds.verifiedEmbed(updated, interaction.user.tag)] });
  await interaction.channel.send({ content: `<@${order.userId}> 🎉 Pembayaran kamu **TERVERIFIKASI** oleh staff! Item akan segera diproses.` });
  if (interaction.guild) await sendLog(interaction.guild, updated, 'VERIFIED', `Verified by ${interaction.user.tag}`);
}

async function handleCloseTicket(interaction, invoice) {
  if (!interaction.member.roles.cache.has(config.staffRoleId))
    return interaction.reply({ content: '❌ Hanya staff yang bisa close ticket!', ephemeral: true });

  const claimer = claimedTickets.get(invoice);
  if (claimer && claimer !== interaction.user.id)
    return interaction.reply({ content: `❌ Hanya <@${claimer}> (claimer) yang bisa close ticket ini!`, ephemeral: true });

  const order = db.getOrderByInvoice(invoice);
  db.updateOrder(invoice, { status: 'DONE' });
  db.appendOrderLog(invoice, 'DONE - CLOSED', interaction.user.tag);
  const updated = db.getOrderByInvoice(invoice);

  await interaction.reply({
    content: `🔒 Ticket **${invoice}** akan ditutup dalam 5 detik...`,
    embeds: updated ? [embeds.orderLogEmbed(updated, 'TICKET CLOSED')] : [],
  });

  if (interaction.guild && updated) await sendLog(interaction.guild, updated, 'TICKET CLOSED', `Closed by ${interaction.user.tag}`);
  claimedTickets.delete(invoice);
  setTimeout(async () => { try { await interaction.channel.delete(); } catch (_) {} }, 5000);
}

module.exports = { handleButtonInteraction, handleSelectInteraction };
