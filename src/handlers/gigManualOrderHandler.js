const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const db     = require('../db');
const config = require('../config');

const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

async function showGigManualModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_gig_manual')
    .setTitle('📝 Request Item GiG / Custom Order');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('gig_game')
        .setLabel('Nama Game')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: Fish It!, Blox Fruits, Adopt Me')
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('gig_item')
        .setLabel('Item / Bundle yang diinginkan')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: VIP + Luck Gamepass, 1000 Robux')
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('gig_robux')
        .setLabel('Jumlah Robux (angka saja)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: 445  (lihat harga Robux di list)')
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('gig_notes')
        .setLabel('Catatan tambahan (opsional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Username Roblox, ID game, atau keterangan lainnya...')
        .setRequired(false),
    ),
  );

  await interaction.showModal(modal);
}

async function handleGigManualModal(interaction) {
  const game    = interaction.fields.getTextInputValue('gig_game').trim();
  const item    = interaction.fields.getTextInputValue('gig_item').trim();
  const robuxRaw= interaction.fields.getTextInputValue('gig_robux').trim().replace(/\D/g, '');
  const notes   = interaction.fields.getTextInputValue('gig_notes')?.trim() || '—';

  const robuxAmount = parseInt(robuxRaw);
  if (isNaN(robuxAmount) || robuxAmount <= 0) {
    return interaction.reply({ content: '❌ Jumlah Robux harus angka positif!', ephemeral: true });
  }

  if (db.isBanned(interaction.user.id)) {
    return interaction.reply({ content: '🔨 Kamu di-ban dari store.', ephemeral: true });
  }
  if (db.isMaintenanceMode()) {
    return interaction.reply({ content: '🔧 Store sedang maintenance.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const gigRate  = db.getGigRate();
  const estimated = robuxAmount * gigRate;

  const order = db.createOrder({
    userId:      interaction.user.id,
    username:    interaction.user.tag,
    gameSlug:    'gift_in_game',
    itemId:      'manual_request',
    itemName:    `[MANUAL] ${game} — ${item}`,
    price:       estimated,
    totalPrice:  estimated,
    robuxAmount,
    isManual:    true,
    notes,
  });

  // Create ticket channel
  try {
    const guild = interaction.guild;
    let category = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name === config.categoryName,
    );
    if (!category) {
      category = await guild.channels.create({ name: config.categoryName, type: ChannelType.GuildCategory });
    }

    const channelName = `gig-manual-${order.invoice.replace('YS-','').toLowerCase()}`;
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
        { id: config.staffRoleId,  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
      ],
    });

    const ticketEmbed = new EmbedBuilder()
      .setColor(0xF0C27F)
      .setTitle('📝  Custom / Manual GiG Order')
      .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nRequest item yang tidak ada di list. Staff akan memproses & konfirmasi harga.')
      .addFields(
        { name: '👤  Pembeli',        value: `<@${interaction.user.id}>`,     inline: true },
        { name: '🧾  Invoice',        value: `\`${order.invoice}\``,           inline: true },
        { name: '🎮  Game',           value: game,                              inline: true },
        { name: '🛍️  Item Requested', value: item,                             inline: false },
        { name: '©️  Robux Amount',   value: `©${robuxAmount} R$`,             inline: true },
        { name: '💰  Est. Harga',     value: `${rp(estimated)} (rate Rp${gigRate}/R$)`, inline: true },
        { name: '📝  Catatan',        value: notes,                             inline: false },
      )
      .addFields({ name: '⚠️  Perhatian', value: 'Harga di atas adalah estimasi. Staff akan konfirmasi harga final sebelum proses.' })
      .setFooter({ text: `Yass Store Bot • ${order.invoice}` })
      .setTimestamp();

    const staffRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`claim_ticket_${order.invoice}`).setLabel('📌 Claim').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`verify_payment_${order.invoice}`).setLabel('✅ Verify Payment').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`close_ticket_${order.invoice}`).setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger),
    );

    const paymentRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`payment_done_${order.invoice}`).setLabel('✔ Payment Done').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`upload_bukti_${order.invoice}`).setLabel('📸 Upload Bukti').setStyle(ButtonStyle.Secondary),
    );

    await ticketChannel.send({
      content: `<@${interaction.user.id}> <@&${config.staffRoleId}> — **Custom GiG Order baru!**`,
      embeds: [ticketEmbed],
      components: [paymentRow, staffRow],
    });

    await interaction.editReply({
      content:
        `✅ **Request berhasil dikirim!**\n` +
        `🧾 Invoice: \`${order.invoice}\`\n` +
        `🎮 Game: **${game}** — ${item}\n` +
        `© ${robuxAmount} R$ ≈ **${rp(estimated)}** (estimasi)\n` +
        `🎫 Ticket: ${ticketChannel}\n\n` +
        `> Staff akan konfirmasi harga & proses ordermu di ticket tersebut.`,
    });

    // Log to log channel
    const { sendCustomLog } = require('./logManager');
    const logEmbed = new EmbedBuilder()
      .setColor(0xF0C27F)
      .setTitle('📝  Manual GiG Order')
      .addFields(
        { name: '🧾 Invoice', value: order.invoice, inline: true },
        { name: '👤 User', value: interaction.user.tag, inline: true },
        { name: '🎮 Game', value: game, inline: true },
        { name: '🛍️ Item', value: item, inline: true },
        { name: '© Robux', value: `${robuxAmount} R$`, inline: true },
        { name: '💰 Est.', value: rp(estimated), inline: true },
      ).setTimestamp();
    await sendCustomLog(guild, logEmbed);

  } catch (err) {
    console.error('[GigManual] Ticket error:', err.message);
    await interaction.editReply({ content: `✅ Request tercatat (Invoice: \`${order.invoice}\`). Hubungi staff untuk proses lebih lanjut.` });
  }
}

module.exports = { showGigManualModal, handleGigManualModal };
