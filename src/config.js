require('dotenv').config();

const config = {
  token: process.env.DISCORD_TOKEN || 'MTUyMDY5MDE5ODI3NzY1MjY4MA.GoGqDB.Xy8CBkfw9afb6n0DzmaiFymuN5k9PCem93_CB8',
  guildId: process.env.GUILD_ID || '1477540132931244134',
  staffRoleId: process.env.STAFF_ROLE_ID || '1477542921929756753',

  dana: {
    number: process.env.DANA_NUMBER || '083153742020',
    name: process.env.DANA_NAME || 'EKA FITRI SAHARANI',
  },

  colors: {
    primary:   0x5865F2,
    success:   0x57F287,
    warning:   0xFEE75C,
    danger:    0xED4245,
    purple:    0x9B59B6,
    gold:      0xF1C40F,
    orange:    0xE67E22,
    blurple:   0x7289DA,
    dark:      0x2C2F33,
    ff:        0xFF6B35,
    ml:        0x1E90FF,
  },

  status: {
    ORDER_CREATED:   '🟡 ORDER CREATED',
    WAITING_PAYMENT: '🟠 WAITING PAYMENT',
    PROOF_SENT:      '🔵 PROOF SENT',
    VERIFIED:        '🟢 VERIFIED',
    DONE:            '⚫ DONE',
  },

  categoryName: 'YASS STORE TICKETS',
  logChannelName: 'yass-store-log',
  lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD || '3'),
  autoDmEnabled: process.env.AUTO_DM_ENABLED !== 'false',
};

module.exports = config;
