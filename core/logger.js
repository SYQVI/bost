const { EmbedBuilder } = require('discord.js');

async function logBoost(client, config, { orderId, guildId, guildName, invite, amount, success, failed, user }) {
  const channel = await client.channels.fetch(config.boostLogChannel).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('Boost Order')
    .setColor(failed === 0 ? 0x57F287 : success === 0 ? 0xED4245 : 0xFEE75C)
    .addFields(
      { name: 'Order ID', value: `\`${orderId}\``, inline: true },
      { name: 'Server', value: `\`${guildName || guildId}\``, inline: true },
      { name: 'Invite', value: `\`${invite}\``, inline: true },
      { name: 'Requested By', value: `<@${user}>`, inline: true },
      { name: 'Success', value: `\`${success}\``, inline: true },
      { name: 'Failed', value: `\`${failed}\``, inline: true }
    )
    .setFooter({ text: `Total: ${amount}` })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function logTokenSend(client, config, { user, target, amount }) {
  const channel = await client.channels.fetch(config.tokenLogChannel).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('Tokens Sent')
    .setColor(0x5865F2)
    .addFields(
      { name: 'Sent By', value: `<@${user}>`, inline: true },
      { name: 'Sent To', value: `<@${target}>`, inline: true },
      { name: 'Amount', value: `\`${amount}\``, inline: true }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function logRestock(client, config, { user, amount, total }) {
  const channel = await client.channels.fetch(config.tokenLogChannel).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('Tokens Restocked')
    .setColor(0x57F287)
    .addFields(
      { name: 'Restocked By', value: `<@${user}>`, inline: true },
      { name: 'Added', value: `\`${amount}\``, inline: true },
      { name: 'Total Stock', value: `\`${total}\``, inline: true }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

async function logUnboost(client, config, { orderId, guildName, removed, failed, user }) {
  const channel = await client.channels.fetch(config.boostLogChannel).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('Unboost Order')
    .setColor(removed > 0 ? 0x57F287 : 0xED4245)
    .addFields(
      { name: 'Order ID', value: `\`${orderId}\``, inline: true },
      { name: 'Server', value: `\`${guildName}\``, inline: true },
      { name: 'Requested By', value: `<@${user}>`, inline: true },
      { name: 'Removed', value: `\`${removed}\``, inline: true },
      { name: 'Failed', value: `\`${failed}\``, inline: true }
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

module.exports = { logBoost, logTokenSend, logRestock, logUnboost };
