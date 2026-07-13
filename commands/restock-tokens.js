const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, LabelBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, FileUploadBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const storage = require('../core/storage');
const { logRestock } = require('../core/logger');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restock-tokens')
    .setDescription('Add tokens to the stock'),

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('restockModal_new')
      .setTitle('Restock Tokens');

    const typeSelect = new StringSelectMenuBuilder()
      .setCustomId('type')
      .setPlaceholder('Select token type')
      .setRequired(true)
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('1 Month').setValue('1m'),
        new StringSelectMenuOptionBuilder().setLabel('3 Months').setValue('3m')
      );

    const typeLabel = new LabelBuilder()
      .setLabel('Token Type')
      .setStringSelectMenuComponent(typeSelect);

    const fileUpload = new FileUploadBuilder()
      .setCustomId('tokensFile')
      .setRequired(false);

    const fileLabel = new LabelBuilder()
      .setLabel('Upload Tokens File (.txt)')
      .setFileUploadComponent(fileUpload);

    const textInput = new TextInputBuilder()
      .setCustomId('tokensInput')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setPlaceholder('Or paste tokens here (separated by new line)');

    const textLabel = new LabelBuilder()
      .setLabel('Paste Tokens')
      .setTextInputComponent(textInput);

    modal.addLabelComponents(typeLabel, fileLabel, textLabel);

    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    const typeArray = interaction.fields.getStringSelectValues('type');
    const type = typeArray && typeArray.length > 0 ? typeArray[0] : null;
    const tokensInput = interaction.fields.getTextInputValue('tokensInput');
    const files = interaction.fields.getUploadedFiles('tokensFile');

    let fileUrl = null;
    if (files && files.size > 0) {
      fileUrl = files.first().url;
    } else if (Array.isArray(files) && files.length > 0) {
      fileUrl = files[0].url;
    } else if (files && files.url) {
      fileUrl = files.url;
    }

    if (!tokensInput && !fileUrl) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('<:false:1514854531412922518> Provide tokens as text or upload a `.txt` file')],
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    let tokens = [];

    if (tokensInput) {
      tokens = tokensInput.split(/[\n,]+/).map(t => t.trim()).filter(Boolean);
    }

    if (fileUrl) {
      try {
        const res = await fetch(fileUrl);
        const text = await res.text();
        tokens = [...tokens, ...text.split(/[\n,]+/).map(t => t.trim()).filter(Boolean)];
      } catch (err) {
        console.error("Failed to fetch uploaded file:", err);
      }
    }

    if (tokens.length === 0) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('<:false:1514854531412922518> No valid tokens found')]
      });
    }

    const added = storage.addTokens(tokens, type);
    const total = storage.getTokenCount(type);

    await logRestock(interaction.client, config, {
      user: interaction.user.id,
      amount: added,
      total
    });

    const embed = new EmbedBuilder()
      .setTitle('Restock Complete')
      .setColor(0x57F287)
      .addFields(
        { name: 'Type', value: type === '1m' ? '1 Month' : '3 Months', inline: true },
        { name: 'Added', value: `\`${added}\``, inline: true },
        { name: 'Duplicates', value: `\`${tokens.length - added}\``, inline: true },
        { name: 'Total Stock', value: `\`${total}\``, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
