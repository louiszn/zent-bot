import type {
	APIEmbedField,
	AutocompleteInteraction,
	Awaitable,
	ButtonInteraction,
	ChatInputCommandInteraction,
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

import { HybridCommand, useHybridCommand } from "../../base/command/Command.js";
import { useSubcommand } from "../../base/command/subcommand/Subcommand.js";

import type { HybridContext } from "../../base/command/HybridContext.js";

import { sanitize } from "../../utils/string.js";

import { isImageUrl } from "../../utils/url.js";
import { Paginator } from "../../libs/Paginator.js";

import CharacterManager from "../../managers/CharacterManager.js";

import type { Character } from "../../managers/CharacterManager.js";
import logger from "../../libs/logger.js";
import { useArguments } from "../../base/command/argument/ArgumentManager.js";
import { ArgumentType, UserArgumentAcceptanceType } from "../../base/command/argument/enums.js";
import type ArgumentResolver from "../../base/command/argument/ArgumentResolver.js";

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
	public override execute(context: HybridContext, args: ArgumentResolver): Awaitable<void> {}

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
	@useArguments((arg) => arg.setName("tag").setType(ArgumentType.String).setRequired(true))
	protected async onCreate(context: HybridContext, args: ArgumentResolver) {
		let tag: string;

		if (context.isInteraction()) {
			tag = context.source.options.getString("tag", true);
		} else {
			tag = args.getString("tag", true);
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
			onMessage: () => string;
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

	@useSubcommand("delete")
	@useArguments((arg) =>
		arg
			.setName("tag")
			.setDescription("Specify character tag to delete")
			.setType(ArgumentType.String)
			.setRequired(true),
	)
	protected async onDelete(context: HybridContext, args: ArgumentResolver) {
		const characterManager = CharacterManager.create(context.user.id);

		const character = await this.getCharacter(context, context.user.id, {
			onInteraction: (interaction) => interaction.options.getString("character", true),
			onMessage: () => args.getString("tag", true),
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
	@useArguments((arg) =>
		arg
			.setName("user")
			.setDescription("Specify a user to list their characters")
			.setType(ArgumentType.User),
	)
	protected async onList(context: HybridContext, args: ArgumentResolver) {
		let user = context.isInteraction()
			? context.source.options.getUser("user")
			: args.getUser("user");

		if (!user) {
			user = context.user;
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
	@useArguments(
		(argument) =>
			argument
				.setName("user")
				.setDescription("Specify a user to get their character information.")
				.setType(ArgumentType.User)
				.setAcceptance(UserArgumentAcceptanceType.User),
		(argument) =>
			argument
				.setName("tag")
				.setDescription("Specify character tag to get character information.")
				.setType(ArgumentType.String)
				.setRequired(true),
	)
	protected async onInfo(context: HybridContext, args: ArgumentResolver) {
		let user = context.isInteraction()
			? context.source.options.getUser("user")
			: args.getUser("user");

		if (!user) {
			user = context.user;
		}

		const character = await this.getCharacter(context, user.id, {
			onInteraction: (interaction) => interaction.options.getString("character", true),
			onMessage: () => args.getString("tag", true),
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
	@useArguments(
		(argument) =>
			argument
				.setName("tag")
				.setDescription("Specify character tag to edit its name.")
				.setType(ArgumentType.String)
				.setRequired(true),
		null,
		(argument) =>
			argument
				.setName("name")
				.setDescription("Specify a new name to set for the character")
				.setRequired(true)
				.setType(ArgumentType.String)
				.setTuple(true)
				.setMaxLength(50),
	)
	protected async onNameEdit(context: HybridContext, args: ArgumentResolver) {
		const character = await this.getCharacter(context, context.user.id, {
			onInteraction: (interaction) => interaction.options.getString("character", true),
			onMessage: () => args.getString("tag", true),
		});

		if (!character) {
			return;
		}

		const name = context.isInteraction()
			? context.source.options.getString("name", true)
			: args.getStrings("name").join(" ");

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
	@useArguments(
		(argument) =>
			argument
				.setName("tag")
				.setDescription("Specify character tag to edit its name.")
				.setType(ArgumentType.String)
				.setRequired(true),
		null,
		(argument) =>
			argument
				.setName("new-tag")
				.setDescription("Specify a new tag to set for the character")
				.setRequired(true)
				.setType(ArgumentType.String),
	)
	protected async onTagEdit(context: HybridContext, args: ArgumentResolver) {
		const character = await this.getCharacter(context, context.user.id, {
			onInteraction: (interaction) => interaction.options.getString("character", true),
			onMessage: () => args.getString("tag", true),
		});

		if (!character) {
			return;
		}

		let newTag: string;

		if (context.isInteraction()) {
			newTag = context.source.options.getString("new-tag", true);
		} else {
			newTag = sanitize(args.getString("new-tag", true)).toLowerCase();
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
	@useArguments(
		(argument) =>
			argument
				.setName("tag")
				.setDescription("Specify character tag to edit its name.")
				.setType(ArgumentType.String)
				.setRequired(true),
		null,
		(argument) =>
			argument
				.setName("url")
				.setDescription("Specify a new image url to set for the character")
				.setType(ArgumentType.String),
	)
	protected async onAvatarEdit(context: HybridContext, args: ArgumentResolver) {
		const character = await this.getCharacter(context, context.user.id, {
			onInteraction: (interaction) => interaction.options.getString("character", true),
			onMessage: () => args.getString("tag", true),
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
			const url = args.getString("url");

			if (attachment?.contentType?.startsWith("image/")) {
				avatarURL = attachment.url;
			} else if (url && (await isImageUrl(url))) {
				avatarURL = url;
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
	@useArguments(
		(argument) =>
			argument
				.setName("tag")
				.setDescription("Specify character tag to edit its name.")
				.setType(ArgumentType.String)
				.setRequired(true),
		null,
		(argument) =>
			argument
				.setName("prefix")
				.setDescription("Specify a new prefix to set for the character")
				.setType(ArgumentType.String),
	)
	protected async onPrefixEdit(context: HybridContext, args: ArgumentResolver) {
		const character = await this.getCharacter(context, context.user.id, {
			onInteraction: (interaction) => interaction.options.getString("character", true),
			onMessage: () => args.getString("tag", true),
		});

		if (!character) {
			return;
		}

		let prefix: string;

		if (context.isInteraction()) {
			prefix = context.source.options.getString("prefix", true).split(/\+s/g)[0];
		} else {
			prefix = args.getString("prefix", true).toLowerCase();

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
