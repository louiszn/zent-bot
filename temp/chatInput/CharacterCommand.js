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
import { InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { HybridCommand, useHybridCommand } from "../../src/base/Command.js";
import prisma from "../../src/libs/prisma.js";
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
                .setName("name")
                .setDescription("Specific character name.")
                .setMinLength(5)
                .setMaxLength(50)
                .setRequired(true)))
                .addSubcommandGroup((group) => group
                .setName("edit")
                .setDescription("Edit character information.")
                .addSubcommand((subcommand) => subcommand
                .setName("name")
                .setDescription("Set display name for a character.")
                .addStringOption(CharacterCommand.getCharacterOption)
                .addStringOption((option) => option
                .setName("name")
                .setDescription("Specific a new name for the character.")
                .setMinLength(5)
                .setMaxLength(50)
                .setRequired(true)))
                .addSubcommand((subcommand) => subcommand
                .setName("avatar")
                .setDescription("Set avatar for a character.")
                .addStringOption(CharacterCommand.getCharacterOption)
                .addAttachmentOption((option) => option
                .setName("avatar")
                .setDescription("Upload a file attachment.")
                .setRequired(true)))
                .addSubcommand((subcommand) => subcommand
                .setName("prefix")
                .setDescription("Set prefix for a character.")
                .addStringOption(CharacterCommand.getCharacterOption)
                .addStringOption((option) => option
                .setName("prefix")
                .setDescription("Specific a new prefix for the character.")
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(10)))),
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
        static getCharacterOption(option) {
            return option
                .setName("character")
                .setDescription("Specific a character.")
                .setAutocomplete(true)
                .setRequired(true);
        }
        async autocomplete(client, interaction) {
            const focusedOption = interaction.options.getFocused(true);
            if (focusedOption.name === "character") {
                const characters = await prisma.character.findMany({
                    where: {
                        userId: interaction.user.id,
                    }
                });
                if (!characters.length) {
                    return;
                }
                const input = focusedOption.value.toLowerCase();
                const filterred = characters.filter((char) => char.name?.toLowerCase().includes(input) ||
                    char.id.toLowerCase().includes(input));
                if (!filterred.length) {
                    return;
                }
                await interaction.respond(filterred.map((choice) => ({
                    name: choice.name,
                    value: choice.id,
                })));
            }
        }
        async execute(client, context) {
            // const subcommandGroup = interaction.options.getSubcommandGroup(false);
            // const subcommand = interaction.options.getSubcommand();
            // if (subcommandGroup === "edit") {
            // 	switch (subcommand) {
            // 		case "name":
            // 			await this.onNameEdit(client, interaction);
            // 			break;
            // 		case "avatar":
            // 			await this.onAvatarEdit(client, interaction);
            // 			break;
            // 		case "prefix":
            // 			await this.onPrefixEdit(client, interaction);
            // 			break;
            // 	}
            // 	return;
            // }
            // switch (subcommand) {
            // 	case "create":
            // 		await this.onCreate(client, interaction);
            // 		break;
            // }
        }
        async onCreate(client, interaction) {
            const name = interaction.options.getString("name", true);
            const existed = await prisma.character.findFirst({
                where: {
                    name,
                    userId: interaction.user.id,
                }
            });
            if (existed !== null) {
                await interaction.reply({
                    content: `Character with name \`${name}\` already exists.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            await prisma.character.create({
                data: {
                    name,
                    userId: interaction.user.id,
                }
            });
            await interaction.reply(`Created new character \`${name}\`. You can also change character's name later.`);
        }
        async onNameEdit(client, interaction) {
            const id = interaction.options.getString("character", true);
            const name = interaction.options.getString("name", true);
            const character = await this.getCharacterByIdOrReply(interaction, id);
            if (character === null) {
                return;
            }
            const existed = await prisma.character.findFirst({
                where: { userId: interaction.user.id, name },
            });
            if (existed) {
                await interaction.reply({
                    content: `Character with name \`${name}\` already exists.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            await prisma.character.update({
                where: { id },
                data: { name },
            });
            await interaction.reply(`Successfully changed character name from \`${character.name}\` to \`${name}\`.`);
        }
        async onAvatarEdit(client, interaction) {
            const id = interaction.options.getString("character", true);
            const character = await this.getCharacterByIdOrReply(interaction, id);
            if (character === null) {
                return;
            }
            const avatar = interaction.options.getAttachment("avatar", true);
            if (!avatar.contentType?.startsWith("image/")) {
                await interaction.reply({
                    content: "Invalid attachment uploaded! Please use a valid image file (PNG, JPG, etc).",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            const response = await interaction.reply({
                content: "Updating avatar...",
                files: [avatar],
                withResponse: true,
            });
            if (!response.resource?.message) {
                await interaction.editReply({
                    content: "Failed to get message resource.",
                    files: [],
                });
                return;
            }
            const { message } = response.resource;
            const newAvatar = message.attachments.first();
            if (!newAvatar) {
                await interaction.editReply({
                    content: "Failed to get message attachment.",
                    files: [],
                });
                return;
            }
            await prisma.character.update({
                where: { id: character.id },
                data: { avatarURL: newAvatar.url },
            });
            await interaction.editReply({
                content: `Successfully updated avatar for ${character.name}!\n*Keep this message and channel safe! Otherwise your character will lost its avatar.*`,
            });
        }
        async onPrefixEdit(client, interaction) {
            const id = interaction.options.getString("character", true);
            const prefix = interaction.options.getString("prefix", true)
                .split(/\\/g)[0]
                .trim()
                .toLowerCase();
            const character = await this.getCharacterByIdOrReply(interaction, id);
            if (character === null) {
                return;
            }
            const existed = await prisma.character.findFirst({
                where: { userId: interaction.user.id, prefix },
            });
            if (existed) {
                await interaction.reply({
                    content: `Character with prefix \`${prefix}\` already exists.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            await prisma.character.update({
                where: { id },
                data: { prefix },
            });
            await interaction.reply(`Successfully set character's prefix for \`${character.name}\` to ${prefix}`);
        }
        async getCharacterByIdOrReply(interaction, characterId) {
            const character = await prisma.character.findFirst({
                where: { id: characterId }
            });
            if (character === null) {
                await interaction.reply({
                    content: `Character with ID \`${characterId}\` does not exist.`,
                    flags: MessageFlags.Ephemeral,
                });
                return null;
            }
            return character;
        }
    };
    return CharacterCommand = _classThis;
})();
export default CharacterCommand;
