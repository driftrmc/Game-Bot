const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const crypto = require("crypto");
const express = require("express");

require("dotenv").config();

// ==========================================
// CONFIGURATION
// ==========================================

const GUILD_ID = "1551473162892476517";

const ADMIN_ROLE_ID = "1551759030027030628";
const SUPPORT_ROLE_ID = "1551496934643073074";

const TICKET_CATEGORY_ID = "1551500251763056663";
const TICKET_LOG_CHANNEL_ID = "1551514137971138632";

// ==========================================
// ROBLOX CONFIGURATION
// ==========================================

const ROBLOX_GROUP_ID = 225504160;

const VERIFIED_ROLE_ID =
    "1551496954968674336";

// ==========================================
// RANK ROLES
// ==========================================

const RANK_ROLES = {

    "E-1 Private":
        "1551496953987080223",

    "E-2 Private First Class":
        "1551496951126687815",

    "E-3 Lance Corporal":
        "1551496949658816603",

    "E-4 Corporal":
        "1551563502735327322",

    "E-5 Sergeant":
        "1551496948383486012",

    "E-6 Staff Sergeant":
        "1551496942222049312",

    "E-7 Gunnery Sergeant":
        "1551496941249110086",

    "E-8 First Sergeant":
        "1551496939864858697",

    "E-9 Sergeant Major":
        "1551564346255999146",

    "O-1 Second Lieutenant":
        "1551496937755254934",

    "O-2 Lieutenant":
        "1551496936475861103",

    "O-3 Captain":
        "1551496933246378045",

    "O-4 Major":
        "1551496932327694417",

    "O-5 Lieutenant Colonel":
        "1551496931056951388",

    "O-6 Colonel":
        "1551496927202516993",

    "O-7 Brigadier General":
        "1551496925432250382",

    "O-8 Major General":
        "1551496924731805776",

    "O-9 Lieutenant General":
        "1551496921108062308",

    "O-10 General":
        "1551496917828112395",

    "Developer":
        "1551496919979659314",

    "Chief Developer":
        "1551496918700392530",

    "Project Manager":
        "1551496914808340521",

    "Lead":
        "1551496913377820692"
};

// ==========================================
// CATEGORY ROLES
// ==========================================

const CATEGORY_ROLES = {

    ENLISTED:
        "1551496947356139570",

    JUNIOR_OFFICER:
        "1552141638267306084",

    SENIOR_OFFICER:
        "1551496935557562449",

    SENIOR_ENLISTED_ADVISER:
        "1552140743236132966",

    GENERAL_OFFICER:
        "1551561756793376788"

};

// ==========================================
// VERIFICATION SYSTEM
// ==========================================

const verificationCodes = new Map();

const linkedRobloxAccounts = new Map();

function generateVerificationCode() {

    const code =
        crypto
            .randomBytes(5)
            .toString("hex")
            .toUpperCase();

    return `RMC-${code}`;
}

function createVerificationCode(discordId) {

    const code =
        generateVerificationCode();

    verificationCodes.set(
        discordId,
        {
            code: code,
            expiresAt:
                Date.now() +
                (10 * 60 * 1000)
        }
    );

    return code;
}

function getVerificationCode(discordId) {

    const data =
        verificationCodes.get(
            discordId
        );

    if (!data) {
        return null;
    }

    if (
        Date.now() >
        data.expiresAt
    ) {

        verificationCodes.delete(
            discordId
        );

        return null;
    }

    return data;
}

// ==========================================
// CLIENT
// ==========================================

const client = new Client({

    intents: [

        GatewayIntentBits.Guilds,

        GatewayIntentBits.GuildMembers,

        GatewayIntentBits.GuildMessages,

        GatewayIntentBits.MessageContent

    ]

});

// ==========================================
// EXPRESS VERIFICATION SERVER
// ==========================================

const app = express();

app.use(
    express.json()
);

// ==========================================
// SERVER STATUS
// ==========================================

app.get(
    "/",
    (req, res) => {

        res.json({

            online: true,

            service:
                "RMC-Bot Verification Server"

        });

    }
);

// ==========================================
// ROBLOX VERIFICATION ENDPOINT
// ==========================================

app.post(
    "/verify",
    async (req, res) => {

        try {

            const {

                secret,

                discordId,

                robloxUserId,

                code

            } = req.body;

            // ==================================
            // SECRET CHECK
            // ==================================

            if (
                !process.env.VERIFY_SECRET ||
                secret !==
                process.env.VERIFY_SECRET
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid verification secret."

                });

            }

            // ==================================
            // REQUIRED DATA
            // ==================================

            if (
                !discordId ||
                !robloxUserId ||
                !code
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Missing verification information."

                });

            }

            // ==================================
            // GET CODE
            // ==================================

            const verification =
                getVerificationCode(
                    discordId
                );

            if (!verification) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Verification code is missing or expired."

                });

            }

            // ==================================
            // CHECK CODE
            // ==================================

            if (
                verification.code.toUpperCase() !==
                String(code).toUpperCase()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid verification code."

                });

            }

            // ==================================
            // FETCH DISCORD GUILD
            // ==================================

            const guild =
                await client.guilds.fetch(
                    GUILD_ID
                );

            // ==================================
            // FETCH MEMBER
            // ==================================

            const member =
                await guild.members.fetch(
                    discordId
                );

            // ==================================
            // FETCH ROBLOX USER
            // ==================================

            const robloxResponse =
                await fetch(
                    `https://users.roblox.com/v1/users/${robloxUserId}`
                );

            if (
                !robloxResponse.ok
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Roblox user could not be found."

                });

            }

            const robloxUser =
                await robloxResponse.json();

            // ==================================
            // CHECK ROBLOX GROUP
            // ==================================

            const robloxRole =
                await getRobloxGroupRole(
                    Number(robloxUserId)
                );

            if (!robloxRole) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This Roblox account is not in the USMC|RP group."

                });

            }

            const rankName =
                robloxRole.name;

            // ==================================
            // FIND DISCORD RANK
            // ==================================

            const rankRoleId =
                RANK_ROLES[
                    rankName
                ];

            if (!rankRoleId) {

                return res.status(400).json({

                    success: false,

                    message:
                        `Your Roblox rank "${rankName}" does not currently have a Discord role configured.`

                });

            }

            // ==================================
            // FIND CATEGORY
            // ==================================

            const categoryRoleId =
                getCategoryRole(
                    rankName
                );

            // ==================================
            // REMOVE OLD ROLES
            // ==================================

            const oldRoles =
                getAllVerificationRoleIds()
                    .filter(
                        roleId =>
                            member.roles.cache.has(
                                roleId
                            )
                    );

            if (
                oldRoles.length > 0
            ) {

                await member.roles.remove(
                    oldRoles
                );

            }

            // ==================================
            // ADD VERIFIED
            // ==================================

            await member.roles.add(
                VERIFIED_ROLE_ID
            );

            // ==================================
            // ADD RANK
            // ==================================

            await member.roles.add(
                rankRoleId
            );

            // ==================================
            // ADD CATEGORY
            // ==================================

            if (
                categoryRoleId
            ) {

                await member.roles.add(
                    categoryRoleId
                );

            }

            // ==================================
            // CHANGE NICKNAME
            // ==================================

            const nickname =
                `${rankName.split(" ")[0]} ${robloxUser.name}`;

            try {

                await member.setNickname(
                    nickname.slice(
                        0,
                        32
                    )
                );

            } catch (error) {

                console.error(
                    "Could not change nickname:",
                    error
                );

            }

            // ==================================
            // SAVE LINK
            // ==================================

            linkedRobloxAccounts.set(
                discordId,
                {

                    robloxUserId:
                        Number(robloxUserId),

                    robloxUsername:
                        robloxUser.name,

                    rank:
                        rankName

                }
            );

            // ==================================
            // USE CODE ONCE
            // ==================================

            verificationCodes.delete(
                discordId
            );

            // ==================================
            // LOG
            // ==================================

            console.log(

                `✅ ${member.user.tag} verified as ${robloxUser.name} (${rankName})`

            );

            // ==================================
            // DM USER
            // ==================================

            try {

                await member.send(

                    `✅ **Roblox Verification Successful**\n\n` +

                    `**Roblox Username:** ${robloxUser.name}\n` +

                    `**Roblox User ID:** ${robloxUserId}\n` +

                    `**Rank:** ${rankName}\n\n` +

                    `Your Discord roles and nickname have been updated.`

                );

            } catch {}

            // ==================================
            // RESPONSE
            // ==================================

            return res.json({

                success: true,

                username:
                    robloxUser.name,

                userId:
                    Number(robloxUserId),

                rank:
                    rankName

            });

        } catch (error) {

            console.error(
                "❌ Verification server error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Internal verification error."

            });

        }

    }
);

// ==========================================
// SLASH COMMANDS
// ==========================================

const commands = [

    new SlashCommandBuilder()

        .setName("ping")

        .setDescription(
            "Check if the bot is online"
        ),

    new SlashCommandBuilder()

        .setName("help")

        .setDescription(
            "Show bot commands"
        ),

    new SlashCommandBuilder()

        .setName("verify")

        .setDescription(
            "Verify your Roblox group rank"
        ),

    new SlashCommandBuilder()

        .setName("ticketpanel")

        .setDescription(
            "Create the ticket panel"
        ),

    new SlashCommandBuilder()

        .setName("ticket")

        .setDescription(
            "Manage tickets"
        )

        .addSubcommand(sub =>
            sub

                .setName("close")

                .setDescription(
                    "Close the current ticket"
                )
        )

        .addSubcommand(sub =>
            sub

                .setName("add")

                .setDescription(
                    "Add a user to the ticket"
                )

                .addUserOption(option =>
                    option

                        .setName("user")

                        .setDescription(
                            "User to add"
                        )

                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub

                .setName("remove")

                .setDescription(
                    "Remove a user from the ticket"
                )

                .addUserOption(option =>
                    option

                        .setName("user")

                        .setDescription(
                            "User to remove"
                        )

                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub

                .setName("rename")

                .setDescription(
                    "Rename the ticket"
                )

                .addStringOption(option =>
                    option

                        .setName("name")

                        .setDescription(
                            "New ticket name"
                        )

                        .setRequired(true)
                )
        )

].map(
    command =>
        command.toJSON()
);

// ==========================================
// REST
// ==========================================

const rest =
    new REST({
        version: "10"
    }).setToken(
        process.env.TOKEN
    );

// ==========================================
// BOT READY
// ==========================================

client.once(
    "ready",
    async () => {

        console.log(
            `Logged in as ${client.user.tag}`
        );

        const guild =
            await client.guilds
                .fetch(GUILD_ID)
                .catch(
                    () => null
                );

        if (!guild) {

            console.log(
                `❌ Bot cannot find server ${GUILD_ID}`
            );

            return;

        }

        console.log(
            `✅ Found server: ${guild.name}`
        );

        try {

            const registered =
                await rest.put(

                    Routes.applicationGuildCommands(
                        client.user.id,
                        GUILD_ID
                    ),

                    {
                        body:
                            commands
                    }

                );

            console.log(
                `✅ Registered ${registered.length} commands:`
            );

            console.log(

                registered
                    .map(
                        command =>
                            command.name
                    )
                    .join(", ")

            );

        } catch (error) {

            console.error(
                "❌ Command registration error:",
                error
            );

        }

    }
);

// ==========================================
// STAFF CHECK
// ==========================================

function isStaff(member) {

    return (

        member.roles.cache.has(
            ADMIN_ROLE_ID
        )

        ||

        member.roles.cache.has(
            SUPPORT_ROLE_ID
        )

    );

}

// ==========================================
// TICKET INFORMATION
// ==========================================

function getTicketInfo(channel) {

    if (!channel.topic) {
        return null;
    }

    if (
        !channel.topic.startsWith(
            "RMC_TICKET|"
        )
    ) {

        return null;

    }

    const parts =
        channel.topic.split("|");

    return {

        type:
            parts[1],

        ownerId:
            parts[2]

    };

}

// ==========================================
// LOG CHANNEL
// ==========================================

function getLogChannel(guild) {

    return guild.channels.cache.get(
        TICKET_LOG_CHANNEL_ID
    );

}

// ==========================================
// ROBLOX GROUP ROLE LOOKUP
// ==========================================

async function getRobloxGroupRole(
    userId
) {

    try {

        const response =
            await fetch(

                `https://groups.roblox.com/v2/users/${userId}/groups/roles`

            );

        if (!response.ok) {

            console.error(
                "Roblox group lookup failed:",
                response.status
            );

            return null;

        }

        const data =
            await response.json();

        if (!data.data) {

            return null;

        }

        const group =
            data.data.find(

                entry =>

                    entry.group &&

                    entry.group.id ===
                    ROBLOX_GROUP_ID

            );

        if (!group) {

            return null;

        }

        return group.role;

    } catch (error) {

        console.error(
            "Roblox group API error:",
            error
        );

        return null;

    }

}

// ==========================================
// FIND CATEGORY ROLE
// ==========================================

function getCategoryRole(
    rankName
) {

    if (!rankName) {

        return null;

    }

    if (
        rankName ===
        "E-9 Sergeant Major"
    ) {

        return CATEGORY_ROLES
            .SENIOR_ENLISTED_ADVISER;

    }

    if (
        rankName.startsWith("E-")
    ) {

        return CATEGORY_ROLES
            .ENLISTED;

    }

    if (

        rankName.startsWith("O-1") ||

        rankName.startsWith("O-2") ||

        rankName.startsWith("O-3")

    ) {

        return CATEGORY_ROLES
            .JUNIOR_OFFICER;

    }

    if (

        rankName.startsWith("O-4") ||

        rankName.startsWith("O-5") ||

        rankName.startsWith("O-6")

    ) {

        return CATEGORY_ROLES
            .SENIOR_OFFICER;

    }

    if (

        rankName.startsWith("O-7") ||

        rankName.startsWith("O-8") ||

        rankName.startsWith("O-9") ||

        rankName.startsWith("O-10")

    ) {

        return CATEGORY_ROLES
            .GENERAL_OFFICER;

    }

    return null;

}

// ==========================================
// GET ALL VERIFICATION ROLES
// ==========================================

function getAllVerificationRoleIds() {

    return [

        VERIFIED_ROLE_ID,

        ...Object.values(
            RANK_ROLES
        ),

        ...Object.values(
            CATEGORY_ROLES
        )

    ];

}

// ==========================================
// INTERACTIONS
// ==========================================

client.on(
    "interactionCreate",
    async interaction => {

        try {

            // ==================================
            // SLASH COMMANDS
            // ==================================

            if (
                interaction.isChatInputCommand()
            ) {

                // ==================================
                // PING
                // ==================================

                if (
                    interaction.commandName ===
                    "ping"
                ) {

                    return interaction.reply(
                        "🏓 Pong! RMC-Bot is online."
                    );

                }

                // ==================================
                // HELP
                // ==================================

                if (
                    interaction.commandName ===
                    "help"
                ) {

                    return interaction.reply({

                        embeds: [

                            new EmbedBuilder()

                                .setTitle(
                                    "RMC-Bot Commands"
                                )

                                .setDescription(

                                    "**General**\n" +

                                    "`/ping` — Check bot status\n" +

                                    "`/help` — Show commands\n" +

                                    "`/verify` — Verify Roblox rank\n\n" +

                                    "**Tickets**\n" +

                                    "`/ticketpanel` — Create ticket panel\n" +

                                    "`/ticket close` — Close ticket\n" +

                                    "`/ticket add` — Add user\n" +

                                    "`/ticket remove` — Remove user\n" +

                                    "`/ticket rename` — Rename ticket"

                                )

                        ],

                        ephemeral:
                            true

                    });

                }

                // ==================================
                // VERIFY
                // ==================================

                if (
                    interaction.commandName ===
                    "verify"
                ) {

                    const verifyButton =
                        new ButtonBuilder()

                            .setCustomId(
                                "roblox_verify"
                            )

                            .setLabel(
                                "Verify Roblox"
                            )

                            .setEmoji(
                                "✅"
                            )

                            .setStyle(
                                ButtonStyle.Success
                            );

                    const row =
                        new ActionRowBuilder()
                            .addComponents(
                                verifyButton
                            );

                    const embed =
                        new EmbedBuilder()

                            .setTitle(
                                "🇺🇸 USMC|RP Verification"
                            )

                            .setDescription(

                                "Click the button below to begin Roblox verification.\n\n" +

                                "**How it works:**\n" +

                                "• The bot generates a unique verification code\n" +

                                "• You enter the code in the RMC Roblox Verification Game\n" +

                                "• Roblox confirms your actual Roblox UserId\n" +

                                "• Your Roblox group rank is checked\n" +

                                "• Your Discord roles are updated automatically\n" +

                                "• Your nickname is updated automatically\n\n" +

                                "Your Roblox account must be a member of the USMC|RP group."

                            );

                    await interaction.channel.send({

                        embeds: [
                            embed
                        ],

                        components: [
                            row
                        ]

                    });

                    return interaction.reply({

                        content:
                            "✅ Verification panel created.",

                        ephemeral:
                            true

                    });

                }

                // ==================================
                // TICKET PANEL
                // ==================================

                if (
                    interaction.commandName ===
                    "ticketpanel"
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({

                            content:
                                "❌ You do not have permission to create the ticket panel.",

                            ephemeral:
                                true

                        });

                    }

                    const supportButton =
                        new ButtonBuilder()

                            .setCustomId(
                                "ticket_support"
                            )

                            .setLabel(
                                "Support"
                            )

                            .setEmoji(
                                "🆘"
                            )

                            .setStyle(
                                ButtonStyle.Primary
                            );

                    const reportButton =
                        new ButtonBuilder()

                            .setCustomId(
                                "ticket_report"
                            )

                            .setLabel(
                                "Report"
                            )

                            .setEmoji(
                                "🚨"
                            )

                            .setStyle(
                                ButtonStyle.Danger
                            );

                    const row =
                        new ActionRowBuilder()
                            .addComponents(

                                supportButton,

                                reportButton

                            );

                    const embed =
                        new EmbedBuilder()

                            .setTitle(
                                "Welcome to USMC Support Center"
                            )

                            .setDescription(

                                "Welcome to the USMC|RP Support Center.\n\n" +

                                "🆘 **Support**\n" +

                                "Need assistance with the server, Discord, Roblox, or another issue? Open a Support ticket to speak with a member of staff. Please clearly explain your issue and provide any relevant information so staff can assist you as quickly as possible.\n\n" +

                                "🚨 **Report**\n" +

                                "Need to report a player, staff member, or incident? Open a Report ticket and provide a clear explanation of what happened. Include the person involved, relevant details, and any available evidence to help staff review the situation."

                            );

                    await interaction.channel.send({

                        embeds: [
                            embed
                        ],

                        components: [
                            row
                        ]

                    });

                    return interaction.reply({

                        content:
                            "✅ Ticket panel created.",

                        ephemeral:
                            true

                    });

                }

                // ==================================
                // TICKET
                // ==================================

                if (
                    interaction.commandName ===
                    "ticket"
                ) {

                    if (
                        !isStaff(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({

                            content:
                                "❌ You do not have permission to manage tickets.",

                            ephemeral:
                                true

                        });

                    }

                    const ticketInfo =
                        getTicketInfo(
                            interaction.channel
                        );

                    if (!ticketInfo) {

                        return interaction.reply({

                            content:
                                "❌ This command can only be used inside a ticket.",

                            ephemeral:
                                true

                        });

                    }

                    const subcommand =
                        interaction.options
                            .getSubcommand();

                    // ==================================
                    // CLOSE
                    // ==================================

                    if (
                        subcommand ===
                        "close"
                    ) {

                        const modal =
                            new ModalBuilder()

                                .setCustomId(
                                    `close_ticket_modal_${interaction.channel.id}`
                                )

                                .setTitle(
                                    "Close Ticket"
                                );

                        const reasonInput =
                            new TextInputBuilder()

                                .setCustomId(
                                    "close_reason"
                                )

                                .setLabel(
                                    "Why are you closing this ticket?"
                                )

                                .setStyle(
                                    TextInputStyle.Paragraph
                                )

                                .setPlaceholder(
                                    "Enter the closure reason..."
                                )

                                .setRequired(
                                    true
                                )

                                .setMaxLength(
                                    1000
                                );

                        modal.addComponents(

                            new ActionRowBuilder()
                                .addComponents(
                                    reasonInput
                                )

                        );

                        return interaction.showModal(
                            modal
                        );

                    }

                    // ==================================
                    // ADD
                    // ==================================

                    if (
                        subcommand ===
                        "add"
                    ) {

                        const user =
                            interaction.options
                                .getUser(
                                    "user"
                                );

                        await interaction.channel
                            .permissionOverwrites
                            .edit(

                                user.id,

                                {

                                    ViewChannel:
                                        true,

                                    SendMessages:
                                        true,

                                    ReadMessageHistory:
                                        true

                                }

                            );

                        return interaction.reply(

                            `✅ ${user} has been added to this ticket.`

                        );

                    }

                    // ==================================
                    // REMOVE
                    // ==================================

                    if (
                        subcommand ===
                        "remove"
                    ) {

                        const user =
                            interaction.options
                                .getUser(
                                    "user"
                                );

                        await interaction.channel
                            .permissionOverwrites
                            .edit(

                                user.id,

                                {

                                    ViewChannel:
                                        false,

                                    SendMessages:
                                        false,

                                    ReadMessageHistory:
                                        false

                                }

                            );

                        return interaction.reply(

                            `✅ ${user} has been removed from this ticket.`

                        );

                    }

                    // ==================================
                    // RENAME
                    // ==================================

                    if (
                        subcommand ===
                        "rename"
                    ) {

                        let name =
                            interaction.options
                                .getString(
                                    "name"
                                );

                        name =
                            name
                                .toLowerCase()
                                .replace(
                                    /[^a-z0-9-]/g,
                                    "-"
                                )
                                .replace(
                                    /-+/g,
                                    "-"
                                )
                                .slice(
                                    0,
                                    90
                                );

                        if (!name) {

                            return interaction.reply({

                                content:
                                    "❌ Invalid channel name.",

                                ephemeral:
                                    true

                            });

                        }

                        await interaction.channel
                            .setName(
                                name
                            );

                        return interaction.reply(

                            `✅ Ticket renamed to **${name}**.`

                        );

                    }

                }

            }

            // ==================================
            // BUTTONS
            // ==================================

            if (
                interaction.isButton()
            ) {

                // ==================================
                // ROBLOX VERIFY
                // ==================================

                if (
                    interaction.customId ===
                    "roblox_verify"
                ) {

                    const code =
                        createVerificationCode(
                            interaction.user.id
                        );

                    return interaction.reply({

                        embeds: [

                            new EmbedBuilder()

                                .setTitle(
                                    "🔐 Roblox Verification"
                                )

                                .setDescription(

                                    "**Your verification code:**\n\n" +

                                    `# \`${code}\`\n\n` +

                                    "**Next steps:**\n" +

                                    "1. Join the RMC Roblox Verification Game.\n" +

                                    "2. Enter the code shown above.\n" +

                                    "3. The Roblox game will verify your Roblox account.\n" +

                                    "4. Your Discord roles will be updated automatically.\n\n" +

                                    "⏱️ **This code expires in 10 minutes.**\n\n" +

                                    "⚠️ Do not give this code to another person."

                                )

                                .setTimestamp()

                        ],

                        ephemeral:
                            true

                    });

                }

                // ==================================
                // SUPPORT
                // ==================================

                if (
                    interaction.customId ===
                    "ticket_support"
                ) {

                    const modal =
                        new ModalBuilder()

                            .setCustomId(
                                "support_ticket_modal"
                            )

                            .setTitle(
                                "Support Ticket"
                            );

                    const reasonInput =
                        new TextInputBuilder()

                            .setCustomId(
                                "support_reason"
                            )

                            .setLabel(
                                "What do you need help with?"
                            )

                            .setStyle(
                                TextInputStyle.Paragraph
                            )

                            .setPlaceholder(
                                "Explain your issue..."
                            )

                            .setRequired(
                                true
                            )

                            .setMaxLength(
                                1000
                            );

                    modal.addComponents(

                        new ActionRowBuilder()
                            .addComponents(
                                reasonInput
                            )

                    );

                    return interaction.showModal(
                        modal
                    );

                }

                // ==================================
                // REPORT
                // ==================================

                if (
                    interaction.customId ===
                    "ticket_report"
                ) {

                    const modal =
                        new ModalBuilder()

                            .setCustomId(
                                "report_ticket_modal"
                            )

                            .setTitle(
                                "Report"
                            );

                    const reportedUser =
                        new TextInputBuilder()

                            .setCustomId(
                                "reported_user"
                            )

                            .setLabel(
                                "Who are you reporting?"
                            )

                            .setStyle(
                                TextInputStyle.Short
                            )

                            .setPlaceholder(
                                "Username or Discord mention"
                            )

                            .setRequired(
                                true
                            )

                            .setMaxLength(
                                100
                            );

                    const reportReason =
                        new TextInputBuilder()

                            .setCustomId(
                                "report_reason"
                            )

                            .setLabel(
                                "What happened?"
                            )

                            .setStyle(
                                TextInputStyle.Paragraph
                            )

                            .setPlaceholder(
                                "Explain what happened..."
                            )

                            .setRequired(
                                true
                            )

                            .setMaxLength(
                                1500
                            );

                    const evidence =
                        new TextInputBuilder()

                            .setCustomId(
                                "report_evidence"
                            )

                            .setLabel(
                                "Do you have evidence?"
                            )

                            .setStyle(
                                TextInputStyle.Paragraph
                            )

                            .setPlaceholder(
                                "Links or other evidence (optional)"
                            )

                            .setRequired(
                                false
                            )

                            .setMaxLength(
                                1000
                            );

                    modal.addComponents(

                        new ActionRowBuilder()
                            .addComponents(
                                reportedUser
                            ),

                        new ActionRowBuilder()
                            .addComponents(
                                reportReason
                            ),

                        new ActionRowBuilder()
                            .addComponents(
                                evidence
                            )

                    );

                    return interaction.showModal(
                        modal
                    );

                }

            }

            // ==================================
            // MODALS
            // ==================================

            if (
                interaction.isModalSubmit()
            ) {

                // ==================================
                // SUPPORT
                // ==================================

                if (
                    interaction.customId ===
                    "support_ticket_modal"
                ) {

                    const reason =
                        interaction.fields
                            .getTextInputValue(
                                "support_reason"
                            );

                    const guild =
                        interaction.guild;

                    const channel =
                        await guild.channels.create({

                            name:
                                `support-${interaction.user.username}`
                                    .toLowerCase()
                                    .replace(
                                        /[^a-z0-9-]/g,
                                        "-"
                                    )
                                    .slice(
                                        0,
                                        90
                                    ),

                            type:
                                ChannelType.GuildText,

                            parent:
                                TICKET_CATEGORY_ID,

                            topic:
                                `RMC_TICKET|support|${interaction.user.id}`,

                            permissionOverwrites: [

                                {

                                    id:
                                        guild.roles.everyone.id,

                                    deny: [

                                        PermissionFlagsBits
                                            .ViewChannel

                                    ]

                                },

                                {

                                    id:
                                        interaction.user.id,

                                    allow: [

                                        PermissionFlagsBits
                                            .ViewChannel,

                                        PermissionFlagsBits
                                            .SendMessages,

                                        PermissionFlagsBits
                                            .ReadMessageHistory

                                    ]

                                },

                                {

                                    id:
                                        ADMIN_ROLE_ID,

                                    allow: [

                                        PermissionFlagsBits
                                            .ViewChannel,

                                        PermissionFlagsBits
                                            .SendMessages,

                                        PermissionFlagsBits
                                            .ReadMessageHistory

                                    ]

                                },

                                {

                                    id:
                                        SUPPORT_ROLE_ID,

                                    allow: [

                                        PermissionFlagsBits
                                            .ViewChannel,

                                        PermissionFlagsBits
                                            .SendMessages,

                                        PermissionFlagsBits
                                            .ReadMessageHistory

                                    ]

                                },

                                {

                                    id:
                                        client.user.id,

                                    allow: [

                                        PermissionFlagsBits
                                            .ViewChannel,

                                        PermissionFlagsBits
                                            .SendMessages,

                                        PermissionFlagsBits
                                            .ReadMessageHistory,

                                        PermissionFlagsBits
                                            .ManageChannels

                                    ]

                                }

                            ]

                        });

                    const embed =
                        new EmbedBuilder()

                            .setTitle(
                                "🆘 Support Ticket"
                            )

                            .setDescription(

                                `Welcome ${interaction.user}!\n\n` +

                                `**Reason:**\n${reason}\n\n` +

                                "A member of staff will assist you shortly."

                            )

                            .setTimestamp();

                    await channel.send({

                        content:
                            `${interaction.user} <@&${SUPPORT_ROLE_ID}> <@&${ADMIN_ROLE_ID}>`,

                        embeds: [
                            embed
                        ]

                    });

                    await interaction.reply({

                        content:
                            `✅ Your support ticket has been created: ${channel}`,

                        ephemeral:
                            true

                    });

                    const logChannel =
                        getLogChannel(
                            guild
                        );

                    if (logChannel) {

                        await logChannel.send(

                            `🎫 **Support Ticket Created**\n\n` +

                            `**Ticket:** ${channel}\n` +

                            `**User:** ${interaction.user}\n` +

                            `**Reason:** ${reason}`

                        );

                    }

                    try {

                        await interaction.user.send(

                            `🎫 **Your support ticket has been created.**\n\n` +

                            `**Server:** ${guild.name}\n` +

                            `**Ticket:** ${channel.name}\n\n` +

                            `A member of staff will assist you shortly.`

                        );

                    } catch {}

                    return;

                }

                // ==================================
                // REPORT
                // ==================================

                if (
                    interaction.customId ===
                    "report_ticket_modal"
                ) {

                    const reportedUser =
                        interaction.fields
                            .getTextInputValue(
                                "reported_user"
                            );

                    const reason =
                        interaction.fields
                            .getTextInputValue(
                                "report_reason"
                            );

                    const evidence =
                        interaction.fields
                            .getTextInputValue(
                                "report_evidence"
                            ) ||
                            "None provided.";

                    const guild =
                        interaction.guild;

                    const channel =
                        await guild.channels.create({

                            name:
                                `report-${interaction.user.username}`
                                    .toLowerCase()
                                    .replace(
                                        /[^a-z0-9-]/g,
                                        "-"
                                    )
                                    .slice(
                                        0,
                                        90
                                    ),

                            type:
                                ChannelType.GuildText,

                            parent:
                                TICKET_CATEGORY_ID,

                            topic:
                                `RMC_TICKET|report|${interaction.user.id}`,

                            permissionOverwrites: [

                                {

                                    id:
                                        guild.roles.everyone.id,

                                    deny: [

                                        PermissionFlagsBits
                                            .ViewChannel

                                    ]

                                },

                                {

                                    id:
                                        interaction.user.id,

                                    allow: [

                                        PermissionFlagsBits
                                            .ViewChannel,

                                        PermissionFlagsBits
                                            .SendMessages,

                                        PermissionFlagsBits
                                            .ReadMessageHistory

                                    ]

                                },

                                {

                                    id:
                                        ADMIN_ROLE_ID,

                                    allow: [

                                        PermissionFlagsBits
                                            .ViewChannel,

                                        PermissionFlagsBits
                                            .SendMessages,

                                        PermissionFlagsBits
                                            .ReadMessageHistory

                                    ]

                                },

                                {

                                    id:
                                        SUPPORT_ROLE_ID,

                                    allow: [

                                        PermissionFlagsBits
                                            .ViewChannel,

                                        PermissionFlagsBits
                                            .SendMessages,

                                        PermissionFlagsBits
                                            .ReadMessageHistory

                                    ]

                                },

                                {

                                    id:
                                        client.user.id,

                                    allow: [

                                        PermissionFlagsBits
                                            .ViewChannel,

                                        PermissionFlagsBits
                                            .SendMessages,

                                        PermissionFlagsBits
                                            .ReadMessageHistory,

                                        PermissionFlagsBits
                                            .ManageChannels

                                    ]

                                }

                            ]

                        });

                    const embed =
                        new EmbedBuilder()

                            .setTitle(
                                "🚨 Report Ticket"
                            )

                            .setDescription(

                                `**Reported User:** ${reportedUser}\n\n` +

                                `**What happened:**\n${reason}\n\n` +

                                `**Evidence:**\n${evidence}\n\n` +

                                `**Submitted by:** ${interaction.user}`

                            )

                            .setTimestamp();

                    await channel.send({

                        content:
                            `${interaction.user} <@&${SUPPORT_ROLE_ID}> <@&${ADMIN_ROLE_ID}>`,

                        embeds: [
                            embed
                        ]

                    });

                    await interaction.reply({

                        content:
                            `✅ Your report has been submitted: ${channel}`,

                        ephemeral:
                            true

                    });

                    const logChannel =
                        getLogChannel(
                            guild
                        );

                    if (logChannel) {

                        await logChannel.send(

                            `🚨 **Report Ticket Created**\n\n` +

                            `**Ticket:** ${channel}\n` +

                            `**Reporter:** ${interaction.user}\n` +

                            `**Reported User:** ${reportedUser}\n` +

                            `**Reason:** ${reason}\n` +

                            `**Evidence:** ${evidence}`

                        );

                    }

                    try {

                        await interaction.user.send(

                            `🚨 **Your report has been submitted.**\n\n` +

                            `**Server:** ${guild.name}\n` +

                            `**Ticket:** ${channel.name}\n\n` +

                            `Staff will review your report.`

                        );

                    } catch {}

                    return;

                }

                // ==================================
                // CLOSE TICKET
                // ==================================

                if (
                    interaction.customId.startsWith(
                        "close_ticket_modal_"
                    )
                ) {

                    const reason =
                        interaction.fields
                            .getTextInputValue(
                                "close_reason"
                            );

                    const channel =
                        interaction.channel;

                    const ticketInfo =
                        getTicketInfo(
                            channel
                        );

                    if (!ticketInfo) {

                        return interaction.reply({

                            content:
                                "❌ This is not a valid ticket.",

                            ephemeral:
                                true

                        });

                    }

                    const owner =
                        await client.users.fetch(
                            ticketInfo.ownerId
                        );

                    const ticketType =
                        ticketInfo.type ===
                        "support"

                            ? "🆘 Support"

                            : "🚨 Report";

                    // ==================================
                    // DM OWNER
                    // ==================================

                    try {

                        await owner.send(

                            `🔒 **Your ${ticketType} Ticket Has Been Closed**\n\n` +

                            `**Server:** ${interaction.guild.name}\n` +

                            `**Ticket:** ${channel.name}\n` +

                            `**Closed by:** ${interaction.user.tag}\n` +

                            `**Reason:** ${reason}\n\n` +

                            `Thank you for contacting staff.`

                        );

                    } catch {}

                    // ==================================
                    // LOG
                    // ==================================

                    const logChannel =
                        getLogChannel(
                            interaction.guild
                        );

                    if (logChannel) {

                        const logEmbed =
                            new EmbedBuilder()

                                .setTitle(
                                    "🔒 Ticket Closed"
                                )

                                .addFields(

                                    {

                                        name:
                                            "Ticket",

                                        value:
                                            channel.name,

                                        inline:
                                            true

                                    },

                                    {

                                        name:
                                            "Type",

                                        value:
                                            ticketType,

                                        inline:
                                            true

                                    },

                                    {

                                        name:
                                            "Ticket Owner",

                                        value:
                                            `<@${ticketInfo.ownerId}>`,

                                        inline:
                                            true

                                    },

                                    {

                                        name:
                                            "Closed By",

                                        value:
                                            `${interaction.user}`,

                                        inline:
                                            true

                                    },

                                    {

                                        name:
                                            "Reason",

                                        value:
                                            reason

                                    }

                                )

                                .setTimestamp();

                        await logChannel.send({

                            embeds: [
                                logEmbed
                            ]

                        });

                    }

                    await interaction.reply(

                        "🔒 Ticket closed. The ticket owner has been notified by DM."

                    );

                    setTimeout(

                        async () => {

                            try {

                                await channel.delete(
                                    "Ticket closed"
                                );

                            } catch {}

                        },

                        5000

                    );

                }

            }

        } catch (error) {

            console.error(
                "❌ Interaction error:",
                error
            );

            if (
                !interaction.replied &&
                !interaction.deferred
            ) {

                await interaction.reply({

                    content:
                        "❌ Something went wrong while processing that.",

                    ephemeral:
                        true

                }).catch(
                    () => {}
                );

            }

        }

    }
);

// ==========================================
// START VERIFICATION SERVER
// ==========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Verification server running on port ${PORT}`);
});

// ==========================================
// LOGIN
// ==========================================

client.login(
    process.env.TOKEN
);Ax
