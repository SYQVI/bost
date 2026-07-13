const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('../core/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fetch-order')
    .setDescription('Fetch order details')
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

    const statusLabels = {
      pending: '⏳ Pending',
      completed: '<:true:1514854400101712074> Completed',
      failed: '<:false:1514854531412922518> Failed',
      partial: '⚠️ Partial',
      unboosted: '🔄 Unboosted'
    };

    const statusColors = {
      completed: 0x57F287,
      failed: 0xED4245,
      unboosted: 0x99AAB5,
      partial: 0xFEE75C,
      pending: 0xFEE75C
    };

    const embed = new EmbedBuilder()
      .setTitle(`📋 Order \`${order.id}\``)
      .setColor(statusColors[order.status] || 0x5865F2)
      .addFields(
        { name: 'Status', value: statusLabels[order.status] || order.status, inline: true },
        { name: 'Server', value: `\`${order.guildName || order.guildId}\``, inline: true },
        { name: 'Invite', value: `\`${order.invite}\``, inline: true },
        { name: 'Requested', value: `\`${order.amount}\``, inline: true },
        { name: 'Success', value: `\`${order.success || 0}\``, inline: true },
        { name: 'Failed', value: `\`${order.failed || 0}\``, inline: true },
        { name: 'Requested By', value: `<@${order.requestedBy}>`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(new Date(order.createdAt).getTime() / 1000)}:R>`, inline: true },
        { name: 'Proxy', value: order.useProxy ? '<:true:1514854400101712074>' : '<:false:1514854531412922518>', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
