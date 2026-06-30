const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const config = require('./config');
const db = require('./db');
const embeds = require('./embeds');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

async function sendAutoDm(user, order) {
  if (!config.autoDmEnabled) return;
  try {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🧾  Order Berhasil Dibuat!')
      .setDescription(`Hei **${user.username}**! Order kamu sudah masuk. Berikut detailnya:`)
      .addFields(
        { name: '🧾 Invoice',   value: `\`${order.invoice}\``,                          inline: true },
        { name: '🛍️ Item',     value: order.itemName || 'Cart',                          inline: true },
        { name: '💰 Total',    value: rp(order.totalPrice || order.price || 0),          inline: true },
        { name: '💳 Bayar ke', value: `DANA: \`${config.dana.number}\`\na/n **${config.dana.name}**`, inline: false },
        { name: '📋 Langkah', value: '1. Buka ticket channel yang baru dibuat\n2. Klik ✔ **Payment Done**\n3. Upload screenshot bukti transfer\n4. Tunggu staff verifikasi', inline: false },
      )
      .setFooter({ text: 'Yass Store Bot • Simpan invoice ini sebagai referensi' })
      .setTimestamp();
    await user.send({ embeds: [embed] });
  } catch (_) {}
}

async function checkLowStockAlert(guild, itemId, itemName, remaining) {
  const threshold = config.lowStockThreshold;
  if (remaining > threshold) return;
  try {
    const { sendCustomLog } = require('./handlers/logManager');
    const alertEmbed = new EmbedBuilder()
      .setColor(remaining === 0 ? 0xED4245 : 0xFEE75C)
      .setTitle(remaining === 0 ? '🚨  Stock HABIS!' : '⚠️  Stock Rendah!')
      .setDescription(
        remaining === 0
          ? `Item **${itemName}** (\`${itemId}\`) telah **HABIS**!`
          : `Stock **${itemName}** (\`${itemId}\`) tersisa **${remaining}** unit.`
      )
      .addFields({ name: '📊 Sisa Stock', value: `**${remaining}** unit`, inline: true })
      .setFooter({ text: 'Yass Store Bot • Low Stock Alert' })
      .setTimestamp();
    await sendCustomLog(guild, alertEmbed, `<@&${config.staffRoleId}>`);
  } catch (_) {}
}

function userActionRow(invoice) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`payment_done_${invoice}`).setLabel('✔ Payment Done').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`upload_bukti_${invoice}`).setLabel('📸 Upload Bukti').setStyle(ButtonStyle.Secondary),
  );
}

function staffActionRow(invoice) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`claim_ticket_${invoice}`).setLabel('📌 Claim').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`verify_payment_${invoice}`).setLabel('✅ Verify Payment').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`close_ticket_${invoice}`).setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger),
  );
}

async function createTicket(guild, user, product, order) {
  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === config.categoryName,
  );
  if (!category) {
    category = await guild.channels.create({ name: config.categoryName, type: ChannelType.GuildCategory });
  }

  const amountPart = product.amount ? `${product.amount}d` : product.name.toLowerCase().replace(/\s+/g, '-');
  const invoiceSlug = order.invoice.replace('-', '').toLowerCase();
  const channelName = `${product.gameSlug}-${amountPart}-${invoiceSlug}`;

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
      { id: config.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
    ],
  });

  db.updateOrder(order.invoice, { channelId: ticketChannel.id, status: 'WAITING PAYMENT' });
  db.appendOrderLog(order.invoice, 'WAITING PAYMENT', 'System');
  const updatedOrder = db.getOrderByInvoice(order.invoice);

  await ticketChannel.send({ content: `<@${user.id}> | <@&${config.staffRoleId}>`, embeds: [embeds.invoiceEmbed(updatedOrder)] });
  await ticketChannel.send({ embeds: [embeds.paymentEmbed(config.dana, order)], components: [userActionRow(order.invoice)] });
  await ticketChannel.send({ content: `> <@&${config.staffRoleId}> — Ticket baru masuk, gunakan tombol di bawah.`, components: [staffActionRow(order.invoice)] });

  await sendAutoDm(user, updatedOrder);

  const stock = db.getStock();
  if (product.id && stock[product.id] !== undefined) {
    await checkLowStockAlert(guild, product.id, product.name, stock[product.id]);
  }

  return ticketChannel;
}

async function createCartTicket(guild, user, cartItems, order) {
  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === config.categoryName,
  );
  if (!category) {
    category = await guild.channels.create({ name: config.categoryName, type: ChannelType.GuildCategory });
  }

  const invoiceSlug = order.invoice.replace('-', '').toLowerCase();
  const channelName = `cart-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${invoiceSlug}`;

  const ticketChannel = await guild.channels.create({
    name: channelName.substring(0, 100),
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
      { id: config.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
    ],
  });

  db.updateOrder(order.invoice, { channelId: ticketChannel.id, status: 'WAITING PAYMENT' });
  db.appendOrderLog(order.invoice, 'WAITING PAYMENT', 'System');
  const updatedOrder = db.getOrderByInvoice(order.invoice);

  await ticketChannel.send({ content: `<@${user.id}> | <@&${config.staffRoleId}>`, embeds: [embeds.invoiceEmbed(updatedOrder)] });
  await ticketChannel.send({ embeds: [embeds.paymentEmbed(config.dana, updatedOrder)], components: [userActionRow(order.invoice)] });
  await ticketChannel.send({ content: `> <@&${config.staffRoleId}> — Ticket cart baru masuk, gunakan tombol di bawah.`, components: [staffActionRow(order.invoice)] });

  await sendAutoDm(user, updatedOrder);

  const stock = db.getStock();
  for (const item of cartItems) {
    if (item.id && stock[item.id] !== undefined) {
      await checkLowStockAlert(guild, item.id, item.name, stock[item.id]);
    }
  }

  return ticketChannel;
}

module.exports = { createTicket, createCartTicket };
