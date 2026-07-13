const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('../core/storage');
const { processUnboost, sleep, randomDelay } = require('../core/booster');
const { logUnboost } = require('../core/logger');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unboost-order')
    .setDescription('Remove boosts from an order')
    .addStringOption(opt =>
      opt.setName('order-id').setDescription('The order ID').setRequired(true)),

  async execute(interaction) {
    const orderId = interaction.options.getString('order-id');
    const order = storage.getOrder(orderId);

    if (!order) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('<:false:1514854531412922518> Order not found')],
        ephemeral: true
      });
    }

    if (order.status === 'unboosted') {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xFEE75C).setDescription('⚠️ This order has already been unboosted')],
        ephemeral: true
      });
    }

    if (!order.tokens || order.tokens.length === 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('<:false:1514854531412922518> No tokens found for this order')],
        ephemeral: true
      });
    }

    await interaction.deferReply();

    const proxies = order.useProxy ? storage.getProxies() : [];
    let removed = 0;
    let failed = 0;

    const unboostPromises = order.tokens.map((token, i) => {
      const proxy = order.useProxy && proxies.length > 0 ? proxies[i % proxies.length] : null;
      return processUnboost(token, order.guildId, proxy).then(result => {
        if (result.success) {
          removed += result.slots;
        } else {
          failed++;
        }
      });
    });

    await Promise.all(unboostPromises);

    storage.updateOrder(orderId, {
      status: 'unboosted',
      unboostedAt: new Date().toISOString(),
      unboostedSlots: removed
    });

    await logUnboost(interaction.client, config, {
      orderId,
      guildName: order.guildName || order.guildId,
      removed,
      failed,
      user: interaction.user.id
    });

    const embed = new EmbedBuilder()
      .setTitle('Unboost Complete')
      .setColor(removed > 0 ? 0x57F287 : 0xED4245)
      .addFields(
        { name: 'Order ID', value: `\`${orderId}\``, inline: true },
        { name: 'Server', value: `\`${order.guildName || order.guildId}\``, inline: true },
        { name: 'Removed', value: `\`${removed}\``, inline: true },
        { name: 'Failed', value: `\`${failed}\``, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
