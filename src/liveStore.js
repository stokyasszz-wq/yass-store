const db = require('./db');
const embeds = require('./embeds');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

let _client = null;

function setClient(client) {
  _client = client;
}

const BUTTON_STYLES = {
  freefire:     ButtonStyle.Danger,
  mobilelegend: ButtonStyle.Primary,
  skin_fish_it: ButtonStyle.Secondary,
  gift_in_game: ButtonStyle.Success,
  robux_login:  ButtonStyle.Secondary,
};

function buildLiveStoreComponents() {
  const categories = db.getCategories();
  const rows = [];

  const catButtons = categories.map(cat =>
    new ButtonBuilder()
      .setCustomId(`ls_order_${cat.id}`)
      .setLabel(`${cat.emoji} ${cat.name}`)
      .setStyle(BUTTON_STYLES[cat.id] || ButtonStyle.Secondary),
  );

  const allBtns = [...catButtons];

  for (let i = 0; i < allBtns.length; i += 5) {
    rows.push(new ActionRowBuilder().addComponents(allBtns.slice(i, i + 5)));
  }

  return rows;
}

async function refresh() {
  if (!_client) return;
  const cfg = db.getStoreConfig();
  if (!cfg.channelId || !cfg.messageId) return;

  try {
    const channel = await _client.channels.fetch(cfg.channelId).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(cfg.messageId).catch(() => null);
    if (!message) return;

    await message.edit({
      embeds: [embeds.liveStoreEmbed()],
      components: buildLiveStoreComponents(),
    });

    db.setStoreConfig({ ...cfg, lastUpdated: new Date().toISOString() });
  } catch (err) {
    console.error('[LiveStore] Refresh error:', err.message);
  }
}

async function postStore(channel) {
  const embed = embeds.liveStoreEmbed();
  const msg = await channel.send({
    embeds: [embed],
    components: buildLiveStoreComponents(),
  });

  db.setStoreConfig({
    channelId: channel.id,
    messageId: msg.id,
    lastUpdated: new Date().toISOString(),
  });

  return msg;
}

module.exports = { setClient, refresh, postStore, buildLiveStoreComponents };
