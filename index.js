const { Client, GatewayIntentBits, PermissionFlagsBits, ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

const responseMessageFile = 'responseMessage.txt'; // It should create the responseMessage.txt file. If it doesn't, add manually

// Authorized user IDs to change status
const authorizedIDs = ['your_discord_id_here'];

// Cooldown tracking
const cooldowns = new Map();
const cooldownSeconds = 60; // Cooldown

function saveResponseMessage(message) {
    fs.writeFileSync(responseMessageFile, message);
}

function loadResponseMessage() {
    if (fs.existsSync(responseMessageFile)) {
        return fs.readFileSync(responseMessageFile, 'utf8');
    }
    return "Self-starring is not allowed here!";
}

let responseMessage = loadResponseMessage();

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.guilds.cache.forEach(async guild => {
        try {
            // Register the /status command
            await guild.commands.create({
                name: 'status',
                description: 'Change the bot\'s status message',
                type: ApplicationCommandType.ChatInput,
                options: [{
                    name: 'message',
                    type: ApplicationCommandOptionType.String,
                    description: 'The new status message',
                    required: true,
                }]
            });

            // Register the /changemessage command
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
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'changemessage') {
        if (interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            responseMessage = interaction.options.getString('message');
            saveResponseMessage(responseMessage);
            await interaction.reply(`Response message changed to: ${responseMessage}`);
        } else {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }
    }

    if (interaction.commandName === 'status') {
        if (authorizedIDs.includes(interaction.user.id)) {
            const newStatus = interaction.options.getString('message');
            client.user.setActivity(newStatus);
            await interaction.reply(`Bot status updated to: ${newStatus}`);
        } else {
            await interaction.reply({ content: 'You are not authorized to use this command.', ephemeral: true });
        }
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    // Ignore if reaction is from bot
    if (user.bot) {
        return;
    }

    if (reaction.emoji.name === '⭐' && reaction.message.author.id === user.id) {
        try {
            reaction.users.remove(user);
        } catch (error) {
            if (error.code !== 50013) { // Ignore missing permissions (DOESN'T WORK?)
                console.error("Failed to remove reaction:", error);
            }
        }

        const currentTime = Date.now();
        const lastUsed = cooldowns.get(user.id);

        // Send the message only if the user is not in the cooldown period
        if (!lastUsed || currentTime - lastUsed > cooldownSeconds * 1000) {
            cooldowns.set(user.id, currentTime);
            const personalizedMessage = responseMessage.replace('{mention}', `<@${user.id}>`);
            try {
                const sentMessage = await reaction.message.channel.send(personalizedMessage);
                await sentMessage.react('⭐');
            } catch (error) {
                if (error.code !== 50013) {
                    console.error("Failed to send message or react:", error);
                }
            }
        }
    }
});

client.login('token_here');
