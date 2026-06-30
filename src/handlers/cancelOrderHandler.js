const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

const CANCELLABLE = ['ORDER CREATED', 'WAITING PAYMENT'];

async function handleCancelOrder(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const invoice = interaction.options.getString('invoice').toUpperCase().trim();
  const order = db.getOrderByInvoice(invoice);

  if (!order) {
    return interaction.editReply({ content: `❌ Invoice **${invoice}** tidak ditemukan.` });
  }

  const isStaff = interaction.member?.roles?.cache?.has(config.staffRoleId);

  if (order.userId !== interaction.user.id && !isStaff) {
    return interaction.editReply({ content: '❌ Kamu hanya bisa cancel order milikmu sendiri.' });
  }

  if (!CANCELLABLE.includes(order.status)) {
    return interaction.editReply({
      content: `❌ Order **${invoice}** tidak bisa dibatalkan.\nStatus saat ini: **${order.status}**\n> Hanya order dengan status ORDER CREATED atau WAITING PAYMENT yang bisa dibatalkan.`,
    });
  }

  const stock = db.getStock();
  if (order.items && order.items.length > 0) {
    for (const item of order.items) {
      stock[item.id] = (stock[item.id] ?? 0) + (item.quantity || 1);
    }
  } else if (order.itemId) {
    stock[order.itemId] = (stock[order.itemId] ?? 0) + 1;
  }
  db.setStock(stock);

  db.updateOrder(invoice, { status: 'CANCELLED' });
  db.appendOrderLog(invoice, 'CANCELLED', interaction.user.tag);

  if (order.channelId) {
    try {
      const ch = await interaction.guild.channels.fetch(order.channelId).catch(() => null);
      if (ch) {
        await ch.send({
          content: `❌ Order **${invoice}** telah dibatalkan oleh <@${interaction.user.id}>.\n🔒 Channel ini akan ditutup dalam 10 detik.`,
        });
        setTimeout(async () => { try { await ch.delete(); } catch (_) {} }, 10_000);
      }
    } catch (_) {}
  }

  const embed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle('❌  Order Dibatalkan')
    .addFields(
      { name: '🧾 Invoice',  value: invoice,                                      inline: true },
      { name: '🛍️ Item',    value: order.itemName || 'Cart',                      inline: true },
      { name: '💰 Total',   value: rp(order.totalPrice || order.price || 0),      inline: true },
    )
    .setDescription('Stock telah dikembalikan secara otomatis.')
    .setFooter({ text: `Dibatalkan oleh ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { handleCancelOrder };
