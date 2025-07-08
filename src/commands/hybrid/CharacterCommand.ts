import type {
	AutocompleteInteraction,
	MessageCreateOptions,
	SlashCommandStringOption,
} from "discord.js";
import {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import type { HybridContext } from "../../base/command/Command.js";
import { HybridCommand, useHybridCommand } from "../../base/command/Command.js";

import prisma from "../../libs/prisma.js";
import { extractId, sanitize } from "../../utils/string.js";
import type { Character } from "@prisma/client";
import {
	createUserCharacter,
	getCharacterInformationEmbed,
	getDisplayNameWithTag,
	getUserCharacterById,
	getUserCharacterByTag,
	getUserCharacters,
	updateUserCharacterById,
} from "../../libs/character.js";
import { isImageUrl } from "../../utils/url.js";
import { Paginator } from "../../libs/Paginator.js";

const getCharacterOption = (option: SlashCommandStringOption) =>
	option
		.setName("character")
		.setDescription("Specific a character.")
		.setAutocomplete(true)
		.setRequired(true);

@useHybridCommand({
	applicationCommandData: new SlashCommandBuilder()
		.setName("character")
		.setDescription("Character management command.")
		.setContexts(InteractionContextType.Guild)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription("Create a new character.")
				.addStringOption((option) =>
					option
						.setName("tag")
						.setDescription("Specific character tag.")
						.setMinLength(1)
						.setMaxLength(20)
						.setRequired(true),
				),
		)
		.addSubcommandGroup((group) =>
			group
				.setName("edit")
				.setDescription("Edit character information.")
				.addSubcommand((subcommand) =>
					subcommand
						.setName("name")
						.setDescription("Update display name for a character.")
						.addStringOption(getCharacterOption)
						.addStringOption((option) =>
							option
								.setName("name")
								.setDescription("Specific a new name for the character.")
								.setMinLength(1)
								.setMaxLength(50)
								.setRequired(true),
						),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("tag")
						.setDescription("Update tag for a character.")
						.addStringOption(getCharacterOption)
						.addStringOption((option) =>
							option
								.setName("tag")
								.setDescription("Specific a new tag for the character.")
								.setMinLength(1)
								.setMaxLength(20)
								.setRequired(true),
						),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("prefix")
						.setDescription("Set prefix for a character.")
						.addStringOption(getCharacterOption)
						.addStringOption((option) =>
							option
								.setName("prefix")
								.setDescription("Specific a new prefix for the character.")
								.setRequired(true)
								.setMinLength(1)
								.setMaxLength(10),
						),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("avatar")
						.setDescription("Set avatar for a character.")
						.addStringOption(getCharacterOption)
						.addAttachmentOption((option) =>
							option
								.setName("avatar")
								.setDescription("Upload a file attachment.")
								.setRequired(true),
						),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("list")
				.setDescription("Shows a list of your characters.")
				.addUserOption((option) =>
					option.setName("user").setDescription("Choose a user to show their characters."),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("info")
				.setDescription("Show character information.")
				.addStringOption(getCharacterOption)
				.addUserOption((option) =>
					option.setName("user").setDescription("Choose a user to their character information."),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("delete")
				.setDescription("Delete a character.")
				.addStringOption(getCharacterOption),
		),
	prefixTriggers: ["character", "char"],
})
export default class CharacterCommand extends HybridCommand {
	public override async autocomplete(interaction: AutocompleteInteraction) {
		const focusedOption = interaction.options.getFocused(true);

		if (focusedOption.name === "character") {
			const userId = (interaction.options.get("user")?.value as string) || interaction.user.id;

			const characters = await prisma.character.findMany({
				where: {
					userId: userId,
				},
			});

			if (!characters.length) {
				return;
			}

			const input = focusedOption.value.toLowerCase().trim();

			const filterred = characters.filter(
				(char) => char.name?.toLowerCase().includes(input) || char.id.toLowerCase().includes(input),
			);

			if (!filterred.length) {
				return;
			}

			await interaction.respond(
				filterred.map((choice) => ({
					name: choice.name ? `${choice.name} (${choice.tag})` : choice.tag,
					value: choice.id,
				})),
			);
		}
	}

	public async execute(context: HybridContext, args: string[]) {
		const choice = context.isInteraction()
			? context.source.options.getSubcommandGroup(false) || context.source.options.getSubcommand()
			: args[1];

		switch (choice) {
			case "create":
				await this.onCreate(context, args);
				break;
			case "edit":
				await this.onEdit(context, args);
				break;
			case "list":
				await this.onList(context, args);
				break;
			case "info":
				await this.onInfo(context, args);
				break;
			case "delete":
				await this.onDelete(context, args);
				break;
		}
	}

	private async onCreate(context: HybridContext, args: string[]) {
		let tag: string;

		if (context.isInteraction()) {
			tag = context.source.options.getString("tag", true);
		} else {
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
			},
		});

		if (existed !== null) {
			await context.send({
				content: `Character with name \`${tag}\` already exists.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		await createUserCharacter(context.user.id, tag);

		await context.send(
			`Created new character with tag \`${tag}\`. You can also change character tag and name later.`,
		);
	}

	private async onDelete(context: HybridContext, args: string[]) {
		let character: Character | null;

		if (context.isInteraction()) {
			const characterId = context.source.options.getString("character", true);
			character = await getUserCharacterById(context.user.id, characterId);
		} else {
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

		const displayName = getDisplayNameWithTag(character);

		const message = await context.send({
			content: `Are you sure you want to delete character ${displayName}?`,
			components: [
				new ActionRowBuilder<ButtonBuilder>().setComponents(
					new ButtonBuilder()
						.setCustomId("character:delete:yes")
						.setLabel("Yes")
						.setStyle(ButtonStyle.Danger)
						.setEmoji("🗑️"),
					new ButtonBuilder()
						.setCustomId("character:delete:no")
						.setLabel("No")
						.setStyle(ButtonStyle.Secondary)
						.setEmoji("❌"),
				),
			],
			embeds: [getCharacterInformationEmbed(character)],
		});

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: (interaction) => interaction.user.id === context.user.id,
			time: 30_000,
		});

		collector.on("collect", async (interaction) => {
			switch (interaction.customId) {
				case "character:delete:yes":
					await prisma.character.delete({
						where: { id: character.id },
					});

					// A better alternative to .edit() and .deferUpdate()
					await interaction.update({
						content: `Successfully deleted character ${displayName}`,
						components: [],
					});

					break;
				case "character:delete:no":
					// No need to handle interaction update anymore because the original message will be deleted
					await message.delete();
					break;
			}

			collector.stop();
		});

		collector.on("ignore", async (interaction) => {
			await interaction.reply({
				content: "You can't use this button!",
				flags: MessageFlags.Ephemeral,
			});
		});

		collector.on("end", async (collected) => {
			// User can only interact the buttons once
			// If the collected size is 0, that means user haven't pressed
			if (collected.size === 0) {
				await message.delete();
			}
		});
	}

	private async onEdit(context: HybridContext, args: string[]) {
		let character: Character | null;

		if (context.isInteraction()) {
			const characterId = context.source.options.getString("character", true);
			character = await getUserCharacterById(context.user.id, characterId);
		} else {
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

		const choice = context.isInteraction() ? context.source.options.getSubcommand() : args[3];

		switch (choice) {
			case "name":
				await this.onNameEdit(context, args, character);
				break;
			case "tag":
				await this.onTagEdit(context, args, character);
				break;
			case "prefix":
				await this.onPrefixEdit(context, args, character);
				break;
			case "avatar":
				await this.onAvatarEdit(context, args, character);
				break;
			default:
				await context.send(`- \`_char edit [tag] name [...name]\`: Update character name
- \`_char edit [tag] tag [new tag]\`: Update character tag
- \`_char edit [tag] prefix [prefix]\`: Update character prefix
- \`_char edit [tag] tag [avatar]\`: Update character avatar`);
				break;
		}
	}

	private async onList(context: HybridContext, args: string[]) {
		let user = context.user;

		if (context.isInteraction()) {
			user = context.source.options.getUser("user") || user;
		} else if (args.filter((x) => x)[2]) {
			const userId = extractId(args[2]);

			if (userId) {
				try {
					user = await this.client.users.fetch(userId);
				} catch {
					await context.send("Couldn't find that user");
					return;
				}
			}
		}

		const characters = (await getUserCharacters(user.id)).map((char) => char);

		if (characters.length) {
			const pages: MessageCreateOptions[] = [];

			const limitPerPage = 5;

			for (let i = 0; i < characters.length; i += limitPerPage) {
				const currentChars = characters.slice(i, i + limitPerPage);

				const embed = new EmbedBuilder()
					.setAuthor({ name: user.displayName, iconURL: user.displayAvatarURL() })
					.setColor("Yellow")
					.setFields(
						currentChars.map((char) => {
							return {
								name: char.name || char.tag,
								value: `> **Prefix:** ${char.prefix ? `\`${char.prefix}\`` : "None"}
> **Tag:** ${char.tag}`,
							};
						}),
					);

				pages.push({ embeds: [embed] });
			}

			const paginator = new Paginator(context, {
				pages,
				timeout: 60_000,
			});

			await paginator.start();
		} else {
			await context.send(
				`${user.id === context.user.id ? "You don't" : "This user doesn't"} have any characters.`,
			);
		}
	}

	private async onInfo(context: HybridContext, args: string[]) {
		let user = context.user;
		let character: Character | null;

		if (context.isInteraction()) {
			user = context.source.options.getUser("user") || user;
			const characterId = context.source.options.getString("character", true);
			character = await getUserCharacterById(user.id, characterId);
		} else {
			const arg1 = args[2];
			const arg2 = args[3];

			let characterTag: string | undefined;

			if (arg1 && arg2) {
				const userId = extractId(arg1);

				if (userId) {
					// [user] [tag]
					try {
						user = await this.client.users.fetch(userId);
						characterTag = sanitize(arg2).toLowerCase();
					} catch {
						await context.send("Couldn't find that user.");
						return;
					}
				} else {
					characterTag = sanitize(arg1).toLowerCase(); // fallback to [tag]
				}
			} else if (arg1) {
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

	private async onNameEdit(context: HybridContext, args: string[], character: Character) {
		let name: string;

		if (context.isInteraction()) {
			name = context.source.options.getString("name", true);
		} else {
			name = args.slice(4).join(" ");

			if (!name) {
				await context.send("Invalid syntax used: _char edit [tag] name [...name]");
				return;
			}
		}

		await updateUserCharacterById(context.user.id, character.id, { name });

		await context.send(
			`Successfully changed character name from \`${character.name || character.tag}\` to \`${name}\`.`,
		);
	}

	private async onTagEdit(context: HybridContext, args: string[], character: Character) {
		let newTag: string;

		if (context.isInteraction()) {
			newTag = context.source.options.getString("tag", true);
		} else {
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

		await context.send(
			`Successfully changed character tag from \`${character.tag}\` to \`${newTag}\`.`,
		);
	}

	private async onAvatarEdit(context: HybridContext, args: string[], character: Character) {
		let avatarURL: string | null = null;

		if (context.isInteraction()) {
			const attachment = context.source.options.getAttachment("avatar", true);

			if (attachment.contentType?.startsWith("image/")) {
				avatarURL = attachment.url;
			}
		} else {
			const attachment = context.source.attachments.first();

			if (attachment?.contentType?.startsWith("image/")) {
				avatarURL = attachment.url;
			} else if (await isImageUrl(args[4])) {
				avatarURL = args[4];
			} else {
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

	private async onPrefixEdit(context: HybridContext, args: string[], character: Character) {
		let prefix: string;

		if (context.isInteraction()) {
			prefix = context.source.options.getString("prefix", true).split(/\+s/g)[0];
		} else {
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

		await context.send(
			character.prefix
				? `Successfully changed character prefix from \`${character.prefix}\` to \`${prefix}\`.`
				: `Successfully set character prefix to \`${prefix}\`.`,
		);
	}
}
