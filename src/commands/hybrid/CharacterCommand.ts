import type {
	APIEmbedField,
	AutocompleteInteraction,
	Awaitable,
	ButtonInteraction,
	ChatInputCommandInteraction,
	MessageCreateOptions,
	SlashCommandStringOption,
	User,
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

import { HybridCommand, useHybridCommand } from "../../base/command/Command.js";
import { useSubcommand } from "../../base/command/subcommand/Subcommand.js";

import type { HybridContext } from "../../base/command/HybridContext.js";

import { extractId, sanitize } from "../../utils/string.js";

import { isImageUrl } from "../../utils/url.js";
import { Paginator } from "../../libs/Paginator.js";

import CharacterManager from "../../managers/CharacterManager.js";

import type { Character } from "../../managers/CharacterManager.js";
import logger from "../../libs/logger.js";

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
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public override execute(context: HybridContext, args: string[]): Awaitable<void> {}

	public override async autocomplete(interaction: AutocompleteInteraction) {
		const focusedOption = interaction.options.getFocused(true);

		if (focusedOption.name !== "character") {
			return;
		}

		const userId = (interaction.options.get("user")?.value as string) || interaction.user.id;

		const characterManager = CharacterManager.create(userId);

		const characters = await characterManager.getAll();

		if (!characters.size) {
			return;
		}

		const input = focusedOption.value.toLowerCase().trim();

		const filterred = characters
			.toJSON()
			.filter((char) => (char.name || char.tag).toLowerCase().includes(input));

		if (!filterred.length) {
			return;
		}

		await interaction.respond(
			filterred.map((choice) => ({
				name: choice.name ? `${choice.name} (${choice.tag})` : choice.tag,
				value: choice.id.toString(),
			})),
		);
	}

	@useSubcommand("create")
	protected async onCreate(context: HybridContext, args: string[]) {
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

		const characterManager = CharacterManager.create(context.user.id);

		const existed = await characterManager.getByTag(tag);

		if (existed) {
			await context.send({
				content: `Character with name \`${tag}\` already exists.`,
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		await characterManager.create({ tag });

		await context.send(
			`Created new character with tag \`${tag}\`. You can also change character tag and name later.`,
		);
	}

	private async getCharacter(
		context: HybridContext,
		userId: string,
		target: {
			onInteraction: (interaction: ChatInputCommandInteraction<"cached">) => string;
			onMessage: () => string | undefined;
		},
	): Promise<Character | null> {
		const characterManager = CharacterManager.create(userId);

		let character: Character | null = null;

		if (context.isInteraction()) {
			character = await characterManager.getById(target.onInteraction(context.source));
		} else {
			const tag = sanitize(target.onMessage() || "");

			if (tag) {
				character = await characterManager.getByTag(tag);
			}
		}

		if (!character) {
			await context.send({
				content: "Couldn't find any character.",
				flags: MessageFlags.Ephemeral,
			});

			return null;
		}

		return character;
	}

	private async getUser(
		context: HybridContext,
		target: {
			onInteraction: (interaction: ChatInputCommandInteraction<"cached">) => User | null;
			onMessage: () => string | undefined;
		},
	) {
		let user: User | null = context.user;

		if (context.isInteraction()) {
			user = target.onInteraction(context.source) || user;
		} else {
			const userId = extractId(target.onMessage() || "");

			if (userId) {
				user = await this.client.users.fetch(userId).catch(() => null);
			}
		}

		if (!user) {
			await context.send("Couldn't find that user");
			return null;
		}

		return user;
	}

	@useSubcommand("delete")
	protected async onDelete(context: HybridContext, args: string[]) {
		const characterManager = CharacterManager.create(context.user.id);

		const character = await this.getCharacter(context, context.user.id, {
			onInteraction: (interaction) => interaction.options.getString("character", true),
			onMessage: () => args[2],
		});

		if (!character) {
			return;
		}

		const displayName = CharacterManager.getDisplayName(character);

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
			embeds: [CharacterManager.getInformationEmbed(character)],
		});

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: (interaction) => interaction.user.id === context.user.id,
			time: 30_000,
		});

		const handleClick = async (interaction: ButtonInteraction<"cached">) => {
			switch (interaction.customId) {
				case "character:delete:yes":
					await characterManager.delete(character.id);

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
		};

		collector.on("collect", (interaction) => {
			handleClick(interaction).catch((error) => logger.error(error));
		});

		collector.on("ignore", (interaction) => {
			interaction
				.reply({
					content: "You can't use this button!",
					flags: MessageFlags.Ephemeral,
				})
				.catch((error) => logger.error(error));
		});

		collector.on("end", (collected) => {
			// User can only interact the buttons once
			// If the collected size is 0, that means user haven't pressed
			if (collected.size === 0) {
				message.delete().catch(() => null);
			}
		});
	}

	@useSubcommand("list")
	protected async onList(context: HybridContext, args: string[]) {
		const user = await this.getUser(context, {
			onInteraction: (interaction) => interaction.options.getUser("user"),
			onMessage: () => args[2],
		});

		if (!user) {
			return;
		}

		const characterManager = CharacterManager.create(user.id);

		const characters = (await characterManager.getAll()).toJSON();

		if (!characters.length) {
			await context.send(
				`${user.id === context.user.id ? "You don't" : "This user doesn't"} have any characters.`,
			);

			return;
		}

		const pages: MessageCreateOptions[] = [];

		const limitPerPage = 5;

		for (let i = 0; i < characters.length; i += limitPerPage) {
			const currentChars = characters.slice(i, i + limitPerPage);

			const fields = currentChars.map((char) => {
				const value = [
					`> **Prefix:** ${char.prefix ? `\`${char.prefix}\`` : "None"}`,
					`> **Tag:** ${char.tag}`,
				].join("\n");

				return {
					name: char.name || char.tag,
					value,
				} satisfies APIEmbedField;
			});

			const embed = new EmbedBuilder()
				.setAuthor({ name: user.displayName, iconURL: user.displayAvatarURL() })
				.setColor("Yellow")
				.setFields(fields);

			pages.push({ embeds: [embed] });
		}

		const paginator = new Paginator(context, {
			pages,
			timeout: 60_000,
		});

		await paginator.start();
	}

	@useSubcommand("info")
	protected async onInfo(context: HybridContext, args: string[]) {
		const user = await this.getUser(context, {
			onInteraction: (interaction) => interaction.options.getUser("user"),
			onMessage: () => (args.length > 3 ? args[2] : undefined),
		});

		if (!user) {
			return;
		}

		const character = await this.getCharacter(context, user.id, {
			onInteraction: (interaction) => interaction.options.getString("character", true),
			onMessage: () => (args.length > 3 ? args[3] : args[2]),
		});

		if (!character) {
			return;
		}

		await context.send({
			embeds: [CharacterManager.getInformationEmbed(character)],
		});
	}

	@useSubcommand({
		chatInput: "edit.name",
		prefixTriggers: ["edit.*.name"],
	})
	protected async onNameEdit(context: HybridContext, args: string[]) {
		const character = await this.getCharacter(context, context.user.id, {
			onInteraction: (interaction) => interaction.options.getString("character", true),
			onMessage: () => args[2],
		});

		if (!character) {
			return;
		}

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

		const characterManager = CharacterManager.create(context.user.id);

		await characterManager.update(character.id, { name });

		await context.send(
			`Successfully changed character name from \`${character.name || character.tag}\` to \`${name}\`.`,
		);
	}

	@useSubcommand({
		chatInput: "edit.tag",
		prefixTriggers: ["edit.*.tag"],
	})
	protected async onTagEdit(context: HybridContext, args: string[]) {
		const character = await this.getCharacter(context, context.user.id, {
			onInteraction: (interaction) => interaction.options.getString("character", true),
			onMessage: () => args[2],
		});

		if (!character) {
			return;
		}

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

		const characterManager = CharacterManager.create(context.user.id);

		const existed = await characterManager.getByTag(newTag);

		if (existed) {
			await context.send(`${CharacterManager.getDisplayName(existed)} already owned this tag.`);
			return;
		}
		await characterManager.update(character.id, { tag: newTag });

		await context.send(
			`Successfully changed character tag from \`${character.tag}\` to \`${newTag}\`.`,
		);
	}

	@useSubcommand({
		chatInput: "edit.avatar",
		prefixTriggers: ["edit.*.avatar"],
	})
	protected async onAvatarEdit(context: HybridContext, args: string[]) {
		const character = await this.getCharacter(context, context.user.id, {
			onInteraction: (interaction) => interaction.options.getString("character", true),
			onMessage: () => args[2],
		});

		if (!character) {
			return;
		}

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

		const characterManager = CharacterManager.create(context.user.id);

		// Notify user about file uploading and also a deferring for interaction
		const originalMessage = await context.send({
			content: "Uploading file...",
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

		await characterManager.update(character.id, {
			avatarURL: newAvatar.url,
		});

		await baseMessage.edit({
			content: `Successfully updated avatar for ${character.name}!\n*Keep this message and channel safe! Otherwise your character will lose its avatar.*`,
		});
	}

	@useSubcommand({
		chatInput: "edit.prefix",
		prefixTriggers: ["edit.*.prefix"],
	})
	protected async onPrefixEdit(context: HybridContext, args: string[]) {
		const character = await this.getCharacter(context, context.user.id, {
			onInteraction: (interaction) => interaction.options.getString("character", true),
			onMessage: () => args[2],
		});

		if (!character) {
			return;
		}

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

		const characterManager = CharacterManager.create(context.user.id);

		const characters = await characterManager.getAll();
		const existed = characters.find((char) => char.prefix === prefix);

		if (existed) {
			await context.send(
				`${CharacterManager.getDisplayName(existed)} already owned prefix \`${prefix}\`.`,
			);
			return;
		}

		await characterManager.update(character.id, { prefix });

		await context.send(
			character.prefix
				? `Successfully changed character prefix from \`${character.prefix}\` to \`${prefix}\`.`
				: `Successfully set character prefix to \`${prefix}\`.`,
		);
	}
}
