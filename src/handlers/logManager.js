const { ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const embeds = require('../embeds');

let logChannelCache = null;

async function getOrCreateLogChannel(guild) {
  const db = require('../db');
  const savedId = db.getLogChannelId();

  if (savedId) {
    try {
      const ch = await guild.channels.fetch(savedId).catch(() => null);
      if (ch) { logChannelCache = ch; return ch; }
    } catch (_) {}
  }

  if (logChannelCache && guild.channels.cache.has(logChannelCache.id)) return logChannelCache;

  let ch = guild.channels.cache.find(
    c => c.type === ChannelType.GuildText && c.name === config.logChannelName,
  );

  if (!ch) {
    try {
      ch = await guild.channels.create({
        name: config.logChannelName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: config.staffRoleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny:  [PermissionFlagsBits.SendMessages],
          },
        ],
        topic: 'Log semua aktivitas Yass Store Bot — Read Only untuk staff',
      });
      console.log(`[LOG] Created log channel: ${ch.name}`);
    } catch (e) {
      console.error('[LOG] Gagal buat log channel:', e.message);
      return null;
    }
  }

  logChannelCache = ch;
  return ch;
}

async function sendLog(guild, order, event, extraText) {
  try {
    const ch = await getOrCreateLogChannel(guild);
    if (!ch) return;
    const embed = embeds.orderLogEmbed(order, event);
    const content = extraText ? `> ${extraText}` : null;
    await ch.send({ content, embeds: [embed] });
  } catch (e) {
    console.error('[LOG] Gagal kirim log:', e.message);
  }
}

async function sendCustomLog(guild, embed, content) {
  try {
    const ch = await getOrCreateLogChannel(guild);
    if (!ch) return;
    await ch.send({ content: content || null, embeds: [embed] });
  } catch (e) {
    console.error('[LOG] Gagal kirim custom log:', e.message);
  }
}

module.exports = { sendLog, sendCustomLog, getOrCreateLogChannel };
