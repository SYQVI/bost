const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('../core/storage');
const { logTokenSend } = require('../core/logger');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('send-tokens')
    .setDescription('Send tokens to a user via DM')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(opt =>
      opt.setName('type')
         .setDescription('Type of tokens to send')
         .setRequired(true)
         .addChoices(
           { name: '1 Month', value: '1m' },
           { name: '3 Months', value: '3m' }
         ))
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('Number of tokens to send').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const type = interaction.options.getString('type');
    const amount = interaction.options.getInteger('amount');

    const stock = storage.getTokenCount(type);
    if (stock < amount) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`<:false:1514854531412922518> Not enough tokens. Available: \`${stock}\``)],
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const tokens = storage.takeTokens(amount, type);
    if (!tokens) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('<:false:1514854531412922518> Failed to retrieve tokens')]
      });
    }

    try {
      const dm = await target.createDM();

      const chunks = [];
      let current = '';
      for (const token of tokens) {
        if ((current + token + '\n').length > 1900) {
          chunks.push(current);
          current = '';
        }
        current += token + '\n';
      }
      if (current) chunks.push(current);

      for (const chunk of chunks) {
        await dm.send(`\`\`\`\n${chunk}\`\`\``);
      }

      await logTokenSend(interaction.client, config, {
        user: interaction.user.id,
        target: target.id,
        amount
      });

      const embed = new EmbedBuilder()
        .setTitle('Tokens Sent')
        .setColor(0x57F287)
        .addFields(
          { name: 'Sent To', value: `<@${target.id}>`, inline: true },
          { name: 'Type', value: type === '1m' ? '1 Month' : '3 Months', inline: true },
          { name: 'Amount', value: `\`${amount}\``, inline: true },
          { name: 'Stock Left', value: `\`${storage.getTokenCount(type)}\``, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch {
      storage.addTokens(tokens, type);
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('<:false:1514854531412922518> Could not DM the user. Tokens returned to stock.')]
      });
    }
  }
};
