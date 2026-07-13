const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { resolveInvite, processBoost, sleep, randomDelay } = require('../core/booster');
const storage = require('../core/storage');
const { logBoost } = require('../core/logger');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boost-server')
    .setDescription('Boost a server with tokens')
    .addStringOption(opt =>
      opt.setName('invite').setDescription('Server invite link or code').setRequired(true))
    .addStringOption(opt =>
      opt.setName('type')
         .setDescription('Type of tokens to use')
         .setRequired(true)
         .addChoices(
           { name: '1 Month', value: '1m' },
           { name: '3 Months', value: '3m' }
         ))
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('Number of tokens to use').setRequired(true).setMinValue(1))
    .addBooleanOption(opt =>
      opt.setName('proxy').setDescription('Use proxies').setRequired(false)),

  async execute(interaction) {
    const invite = interaction.options.getString('invite');
    const type = interaction.options.getString('type');
    const amount = interaction.options.getInteger('amount');
    const useProxy = interaction.options.getBoolean('proxy') ?? false;

    const stock = storage.getTokenCount(type);
    if (stock < amount) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`<:false:1514854531412922518> Not enough tokens. Available: \`${stock}\``)],
        ephemeral: true
      });
    }

    await interaction.deferReply();

    const inviteData = await resolveInvite(invite);
    if (!inviteData || !inviteData.guild) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('<:false:1514854531412922518> Invalid invite link')]
      });
    }

    const guildId = inviteData.guild.id;
    const guildName = inviteData.guild.name;
    const tokens = storage.takeTokens(amount, type);

    if (!tokens) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('<:false:1514854531412922518> Failed to retrieve tokens from stock')]
      });
    }

    const order = storage.createOrder({
      guildId,
      guildName,
      invite,
      amount,
      type,
      requestedBy: interaction.user.id,
      useProxy
    });

    const proxies = useProxy ? storage.getProxies() : [];
    let success = 0;
    let failed = 0;
    const usedTokens = [];

    const boostPromises = tokens.map((token, i) => {
      const proxy = useProxy && proxies.length > 0 ? proxies[i % proxies.length] : null;
      return processBoost(token, invite, guildId, proxy).then(result => {
        if (result.success) {
          success += result.slots;
          usedTokens.push(token);
        } else {
          failed++;
        }
      });
    });

    await Promise.all(boostPromises);

    storage.markUsed(usedTokens);

    const status = failed === 0 ? 'completed' : success === 0 ? 'failed' : 'partial';
    storage.updateOrder(order.id, { status, success, failed, tokens: usedTokens });

    await logBoost(interaction.client, config, {
      orderId: order.id,
      guildId,
      guildName,
      invite,
      amount,
      success,
      failed,
      user: interaction.user.id
    });

    const embed = new EmbedBuilder()
      .setTitle('Boost Complete')
      .setColor(status === 'completed' ? 0x57F287 : status === 'failed' ? 0xED4245 : 0xFEE75C)
      .addFields(
        { name: 'Order ID', value: `\`${order.id}\``, inline: true },
        { name: 'Server', value: `\`${guildName}\``, inline: true },
        { name: 'Type', value: type === '1m' ? '1 Month' : '3 Months', inline: true },
        { name: 'Status', value: status === 'completed' ? '<:true:1514854400101712074> Completed' : status === 'failed' ? '<:false:1514854531412922518> Failed' : '⚠️ Partial', inline: true },
        { name: 'Success', value: `\`${success}\``, inline: true },
        { name: 'Failed', value: `\`${failed}\``, inline: true },
        { name: 'Stock Left', value: `\`${storage.getTokenCount(type)}\``, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
