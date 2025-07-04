var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { AttachmentBuilder, EmbedBuilder, InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { HybridCommand, useHybridCommand } from "../../base/Command.js";
import prisma from "../../libs/prisma.js";
import { extractId, sanitize } from "../../utils/string.js";
import { createUserCharacter, getCharacterInformationEmbed, getDisplayNameWithTag, getUserCharacterById, getUserCharacterByTag, getUserCharacters, updateUserCharacterById } from "../../libs/character.js";
import { isImageUrl } from "../../utils/url.js";
import { Paginator } from "../../libs/Paginator.js";
const getCharacterOption = (option) => option
    .setName("character")
    .setDescription("Specific a character.")
    .setAutocomplete(true)
    .setRequired(true);
let CharacterCommand = (() => {
    let _classDecorators = [useHybridCommand({
            applicationCommandData: new SlashCommandBuilder()
                .setName("character")
                .setDescription("Character management command.")
                .setContexts(InteractionContextType.Guild)
                .addSubcommand((subcommand) => subcommand
                .setName("create")
                .setDescription("Create a new character.")
                .addStringOption((option) => option
                .setName("tag")
                .setDescription("Specific character tag.")
                .setMinLength(1)
                .setMaxLength(20)
                .setRequired(true)))
                .addSubcommandGroup((group) => group
                .setName("edit")
                .setDescription("Edit character information.")
                .addSubcommand((subcommand) => subcommand
                .setName("name")
                .setDescription("Update display name for a character.")
                .addStringOption(getCharacterOption)
                .addStringOption((option) => option
                .setName("name")
                .setDescription("Specific a new name for the character.")
                .setMinLength(1)
                .setMaxLength(50)
                .setRequired(true)))
                .addSubcommand((subcommand) => subcommand
                .setName("tag")
                .setDescription("Update tag for a character.")
                .addStringOption(getCharacterOption)
                .addStringOption((option) => option
                .setName("tag")
                .setDescription("Specific a new tag for the character.")
                .setMinLength(1)
                .setMaxLength(20)
                .setRequired(true)))
                .addSubcommand((subcommand) => subcommand
                .setName("prefix")
                .setDescription("Set prefix for a character.")
                .addStringOption(getCharacterOption)
                .addStringOption((option) => option
                .setName("prefix")
                .setDescription("Specific a new prefix for the character.")
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(10)))
                .addSubcommand((subcommand) => subcommand
                .setName("avatar")
                .setDescription("Set avatar for a character.")
                .addStringOption(getCharacterOption)
                .addAttachmentOption((option) => option
                .setName("avatar")
                .setDescription("Upload a file attachment.")
                .setRequired(true))))
                .addSubcommand((subcommand) => subcommand
                .setName("list")
                .setDescription("Shows a list of your characters.")
                .addUserOption((option) => option
                .setName("user")
                .setDescription("Choose a user to show their characters.")))
                .addSubcommand((subcommand) => subcommand
                .setName("info")
                .setDescription("Show character's information.")
                .addStringOption(getCharacterOption)
                .addUserOption((option) => option
                .setName("user")
                .setDescription("Choose a user to their character's information."))),
            prefixTriggers: ["character", "char"],
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = HybridCommand;
    var CharacterCommand = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CharacterCommand = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async autocomplete(client, interaction) {
            const focusedOption = interaction.options.getFocused(true);
            if (focusedOption.name === "character") {
                const userId = interaction.options.get("user")?.value || interaction.user.id;
                const characters = await prisma.character.findMany({
                    where: {
                        userId: userId,
                    }
                });
                if (!characters.length) {
                    return;
                }
                const input = focusedOption.value.toLowerCase().trim();
                const filterred = characters.filter((char) => char.name?.toLowerCase().includes(input) ||
                    char.id.toLowerCase().includes(input));
                if (!filterred.length) {
                    return;
                }
                await interaction.respond(filterred.map((choice) => ({
                    name: choice.name ? `${choice.name} (${choice.tag})` : choice.tag,
                    value: choice.id,
                })));
            }
        }
        async execute(client, context, args) {
            const choice = context.isInteraction()
                ? context.source.options.getSubcommandGroup(false) || context.source.options.getSubcommand()
                : args[1];
            switch (choice) {
                case "create":
                    await this.onCreate(client, context, args);
                    break;
                case "edit":
                    await this.onEdit(client, context, args);
                    break;
                case "list":
                    await this.onList(client, context, args);
                    break;
                case "info":
                    await this.onInfo(client, context, args);
                    break;
            }
        }
        async onCreate(client, context, args) {
            let tag;
            if (context.isInteraction()) {
                tag = context.source.options.getString("tag", true);
            }
            else {
                tag = args[2] || "";
            }
            tag = sanitize(tag).trim().toLowerCase();
            if (!tag) {
                await context.send("Invalid syntax used: _char create [tag]");
                return;
            }
            const existed = await prisma.character.findFirst({
                where: {
                    tag,
                    userId: context.user.id,
                }
            });
            if (existed !== null) {
                await context.send({
                    content: `Character with name \`${tag}\` already exists.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            await createUserCharacter(context.user.id, tag);
            await context.send(`Created new character with tag \`${tag}\`. You can also change character's tag later.`);
        }
        async onEdit(client, context, args) {
            let character;
            if (context.isInteraction()) {
                const characterId = context.source.options.getString("character", true);
                character = await getUserCharacterById(context.user.id, characterId);
            }
            else {
                const characterTag = sanitize(args[2] || "").toLowerCase();
                character = await getUserCharacterByTag(context.user.id, characterTag);
            }
            if (!character) {
                await context.send({
                    content: "Couldn't find any character.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            const choice = context.isInteraction()
                ? context.source.options.getSubcommand()
                : args[3];
            switch (choice) {
                case "name":
                    await this.onNameEdit(client, context, args, character);
                    break;
                case "tag":
                    await this.onTagEdit(client, context, args, character);
                    break;
                case "prefix":
                    await this.onPrefixEdit(client, context, args, character);
                    break;
                case "avatar":
                    await this.onAvatarEdit(client, context, args, character);
                    break;
                default:
                    await context.send(`- \`_char edit [tag] name [...name]\`: Update character's name
- \`_char edit [tag] tag [new tag]\`: Update character's tag
- \`_char edit [tag] prefix [prefix]\`: Update character's prefix
- \`_char edit [tag] tag [avatar]\`: Update character's avatar`);
                    break;
            }
        }
        async onList(client, context, args) {
            let user = context.user;
            if (context.isInteraction()) {
                user = context.source.options.getUser("user") || user;
            }
            else if (args.filter((x) => x)[2]) {
                const userId = extractId(args[2]);
                if (userId) {
                    try {
                        user = await client.users.fetch(userId);
                    }
                    catch {
                        await context.send("Couldn't find that user");
                        return;
                    }
                }
            }
            const characters = (await getUserCharacters(user.id)).map((char) => char);
            if (characters.length) {
                const pages = [];
                const limitPerPage = 5;
                for (let i = 0; i < characters.length; i += limitPerPage) {
                    const currentChars = characters.slice(i, i + limitPerPage);
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: user.displayName, iconURL: user.displayAvatarURL() })
                        .setColor("Yellow")
                        .setFields(currentChars.map((char) => {
                        return {
                            name: char.name || char.tag,
                            value: `> **Prefix:** ${char.prefix ? `\`${char.prefix}\`` : "None"}
> **Tag:** ${char.tag}`,
                        };
                    }));
                    pages.push({ embeds: [embed] });
                }
                const paginator = new Paginator(context, {
                    pages,
                    timeout: 60_000,
                });
                await paginator.start();
            }
            else {
                await context.send(`${user.id === context.user.id ? "You don't" : "This user doesn't"} have any characters.`);
            }
        }
        async onInfo(client, context, args) {
            let user = context.user;
            let character;
            if (context.isInteraction()) {
                user = context.source.options.getUser("user") || user;
                const characterId = context.source.options.getString("character", true);
                character = await getUserCharacterById(user.id, characterId);
            }
            else {
                const arg1 = args[2];
                const arg2 = args[3];
                let characterTag;
                if (arg1 && arg2) {
                    const userId = extractId(arg1);
                    if (userId) {
                        // [user] [tag]
                        try {
                            user = await client.users.fetch(userId);
                            characterTag = sanitize(arg2).toLowerCase();
                        }
                        catch {
                            await context.send("Couldn't find that user.");
                            return;
                        }
                    }
                    else {
                        characterTag = sanitize(arg1).toLowerCase(); // fallback to [tag]
                    }
                }
                else if (arg1) {
                    characterTag = sanitize(arg1).toLowerCase();
                }
                if (!characterTag) {
                    await context.send("You must provide a character tag.");
                    return;
                }
                character = await getUserCharacterByTag(user.id, characterTag);
            }
            if (!character) {
                await context.send({
                    content: "Couldn't find any character.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            await context.send({
                embeds: [getCharacterInformationEmbed(character)],
            });
        }
        async onNameEdit(client, context, args, character) {
            let name;
            if (context.isInteraction()) {
                name = context.source.options.getString("name", true);
            }
            else {
                name = args.slice(4).join(" ");
                if (!name) {
                    await context.send("Invalid syntax used: _char edit [tag] name [...name]");
                    return;
                }
            }
            await updateUserCharacterById(context.user.id, character.id, { name });
            await context.send(`Successfully changed character name from \`${character.name || character.tag}\` to \`${name}\`.`);
        }
        async onTagEdit(client, context, args, character) {
            let newTag;
            if (context.isInteraction()) {
                newTag = context.source.options.getString("tag", true);
            }
            else {
                newTag = sanitize(args[4] || "").toLowerCase();
                if (!newTag) {
                    await context.send("Invalid syntax used: _char edit [tag] tag [new tag]");
                    return;
                }
            }
            const existed = await getUserCharacterByTag(context.user.id, newTag);
            if (existed) {
                await context.send(`${getDisplayNameWithTag(existed)} already owned this tag.`);
                return;
            }
            await updateUserCharacterById(context.user.id, character.id, { tag: newTag });
            await context.send(`Successfully changed character tag from \`${character.tag}\` to \`${newTag}\`.`);
        }
        async onAvatarEdit(client, context, args, character) {
            let avatarURL = null;
            if (context.isInteraction()) {
                const attachment = context.source.options.getAttachment("avatar", true);
                if (attachment.contentType?.startsWith("image/")) {
                    avatarURL = attachment.url;
                }
            }
            else {
                const attachment = context.source.attachments.first();
                if (attachment?.contentType?.startsWith("image/")) {
                    avatarURL = attachment.url;
                }
                else if (await isImageUrl(args[4])) {
                    avatarURL = args[4];
                }
                else {
                    await context.send("You must specific an image to set.");
                    return;
                }
            }
            if (!avatarURL) {
                await context.send({
                    content: "Invalid attachment uploaded! Please use a valid image file (PNG, JPG, etc).",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            // Notify user about file uploading and also a deferring for interaction
            const originalMessage = await context.send({
                content: "Uploading files...",
            });
            const baseMessage = await originalMessage.edit({
                content: "Updating avatar...",
                files: [new AttachmentBuilder(avatarURL)],
            });
            const newAvatar = baseMessage.attachments.first();
            if (!newAvatar) {
                await baseMessage.edit({
                    content: "Failed to get message attachment.",
                    files: [],
                });
                return;
            }
            await updateUserCharacterById(context.user.id, character.id, { avatarURL: newAvatar.url });
            await baseMessage.edit({
                content: `Successfully updated avatar for ${character.name}!\n*Keep this message and channel safe! Otherwise your character will lose its avatar.*`,
            });
        }
        async onPrefixEdit(client, context, args, character) {
            let prefix;
            if (context.isInteraction()) {
                prefix = context.source.options.getString("prefix", true).split(/\+s/g)[0];
            }
            else {
                prefix = (args[4] || "").toLowerCase();
                if (!prefix) {
                    await context.send("Invalid syntax used: _char edit [tag] prefix [prefix]");
                    return;
                }
            }
            prefix = prefix.toLowerCase();
            const characters = await getUserCharacters(context.user.id);
            const existed = characters.find((char) => char.prefix === prefix);
            if (existed) {
                await context.send(`${getDisplayNameWithTag(existed)} already owned prefix \`${prefix}\`.`);
                return;
            }
            await updateUserCharacterById(context.user.id, character.id, { prefix });
            await context.send(`Successfully changed character prefix from \`${character.prefix}\` to \`${prefix}\`.`);
        }
    };
    return CharacterCommand = _classThis;
})();
export default CharacterCommand;
