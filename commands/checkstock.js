const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('../core/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkstock')
    .setDescription('Check available token stock'),

  async execute(interaction) {
    const tokens1m = storage.getTokenCount('1m');
    const tokens3m = storage.getTokenCount('3m');
    const proxies = storage.getProxies().length;

    const embed = new EmbedBuilder()
      .setThumbnail('https://cdn.discordapp.com/emojis/1499849038441480376.webp?size=96&animated=true')
      .setTitle('<:stock:1514854402387869796> Stock Status')
      .setColor(0x5865F2)
      .addFields(
        { name: '<:nitro:1514854404329570304> 1 Month Tokens', value: `\`${tokens1m}\``, inline: true },
        { name: '<:nitro:1514854404329570304> 3 Months Tokens', value: `\`${tokens3m}\``, inline: true },
        { name: '<:proxy:1514854398537498725> Proxies', value: `\`${proxies}\``, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
