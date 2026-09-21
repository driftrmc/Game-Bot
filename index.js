const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");

require("dotenv").config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const commands = [
    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check if the bot is online"),

    new SlashCommandBuilder()
        .setName("help")
        .setDescription("Show the bot's commands")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );

        console.log("Slash commands registered!");
    } catch (error) {
        console.error(error);
    }
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ping") {
        await interaction.reply("🏓 Pong! Bot is online.");
    }

    if (interaction.commandName === "help") {
        await interaction.reply(
            "**RMC Bot Commands**\n\n" +
            "`/ping` — Check bot status\n" +
            "`/help` — Show commands"
        );
    }
});

client.login(process.env.TOKEN);