const { Client, GatewayIntentBits, PermissionFlagsBits, ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');

// Bot setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Store the message file
const responseMessageFile = 'responseMessage.txt';

// Save the message
function saveResponseMessage(message) {
    fs.writeFileSync(responseMessageFile, message);
}

// Load the message
function loadResponseMessage() {
    if (fs.existsSync(responseMessageFile)) {
        return fs.readFileSync(responseMessageFile, 'utf8');
    }
    return "{mention} DON'T SELF STAR";
}


let responseMessage = loadResponseMessage();

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.guilds.cache.forEach(async guild => {
        try {
            await guild.commands.create({
                name: 'changemessage',
                description: 'Change the message sent when someone self-stars.',
                type: ApplicationCommandType.ChatInput,
                options: [{
                    name: 'message',
                    type: ApplicationCommandOptionType.String,
                    description: 'The new message to send',
                    required: true,
                }],
                defaultMemberPermissions: PermissionFlagsBits.ManageGuild.toString(),
            });
        } catch (error) {
            console.error(`Error creating commands in guild ${guild.name}:`, error);
        }
    });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() || interaction.commandName !== 'changemessage') return;

    if (interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        responseMessage = interaction.options.getString('message');
        saveResponseMessage(responseMessage);
        await interaction.reply(`Response message changed to: ${responseMessage}`);
    } else {
        await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.emoji.name === '⭐' && reaction.message.author.id === user.id) {
        const personalizedMessage = responseMessage.replace('{mention}', `<@${user.id}>`);
        reaction.message.channel.send(personalizedMessage);
        reaction.users.remove(user);
    }
});

// Replace with bot token
client.login('token_here');
