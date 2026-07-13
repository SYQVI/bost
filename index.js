const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, EmbedBuilder, REST, Routes } = require('discord.js');
const config = require('./config.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commandsJSON = [];

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    commandsJSON.push(command.data.toJSON());
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  const rest = new REST().setToken(config.token);
  try {
    console.log(`Started refreshing ${commandsJSON.length} application (/) commands.`);

    if (config.guildId && config.guildId !== "GUILD_ID_HERE" && config.guildId.trim() !== "") {
      console.log(`Deploying commands to Guild: ${config.guildId}`);
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commandsJSON }
      );
    } else {
      console.log('Deploying commands globally.');
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commandsJSON }
      );
    }

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const isAdmin = 
      config.adminUsers.includes(interaction.user.id) ||
      interaction.member.roles.cache.some(role => config.adminRoles.includes(role.id)) ||
      interaction.member.permissions.has('Administrator'); 

    if (!isAdmin) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('<:false:1514854531412922518> You do not have permission to use this command.')],
        ephemeral: true
      });
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      const errEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription('<:false:1514854531412922518> There was an error while executing this command!');
        
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('restockModal_')) {
      const command = client.commands.get('restock-tokens');
      if (command && typeof command.handleModal === 'function') {
        try {
          await command.handleModal(interaction);
        } catch (error) {
          console.error(error);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '<:false:1514854531412922518> Error processing modal.', ephemeral: true });
          } else {
            await interaction.reply({ content: '<:false:1514854531412922518> Error processing modal.', ephemeral: true });
          }
        }
      }
    }
  }
});

client.login("MTUyNDE0ODM4NjAxMjQ2NzIyMA.G-BpsG.hqjHPv0iWpqtf44x1WJPVI99wv7UDBGYtTX6lg");
