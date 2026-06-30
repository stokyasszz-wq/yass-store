const db = require('../db');
const embeds = require('../embeds');
const { sendLog } = require('./logManager');

async function handleProofUpload(message) {
  if (message.author.bot) return;

  const order = db.getOrderByChannel(message.channel.id);
  if (!order) return;

  if (order.userId !== message.author.id) return;

  if (order.status === 'VERIFIED' || order.status === 'DONE') return;

  const attachment = message.attachments.first();
  if (!attachment) return;

  const isImage = attachment.contentType && attachment.contentType.startsWith('image/');
  if (!isImage) {
    await message.reply(
      '❌ Hanya **gambar/screenshot** yang diterima sebagai bukti transfer!\n' +
      'Bukan teks, PDF, atau file lain.',
    );
    return;
  }

  db.updateOrder(order.invoice, { status: 'PROOF SENT', paymentProofURL: attachment.url });
  db.appendOrderLog(order.invoice, 'PROOF SENT', message.author.tag);

  const updatedOrder = db.getOrderByInvoice(order.invoice);

  await message.reply({
    content: `<@&${require('../config').staffRoleId}> — Bukti transfer diterima, mohon verifikasi!`,
    embeds: [embeds.proofReceivedEmbed(updatedOrder, attachment.url)],
  });

  await sendLog(message.guild, updatedOrder, 'PROOF SENT',
    `Proof uploaded by ${message.author.tag}`);
}

module.exports = { handleProofUpload };
