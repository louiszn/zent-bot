import type {
	AutocompleteInteraction,
	Awaitable,
	ContextMenuCommandBuilder,
	ContextMenuCommandInteraction,
	RESTPostAPIApplicationCommandsJSONBody,
	SlashCommandBuilder,
	SlashCommandSubcommandsOnlyBuilder,
	ChatInputCommandInteraction,
	Message,
} from "discord.js";

import type ZentBot from "../ZentBot.js";

import CommandRegistry from "./CommandRegistry.js";
import SubcommandManager from "./subcommand/SubcommandManager.js";

import type { HybridContext } from "./HybridContext.js";

export abstract class BaseCommand {
	public static guildIds: string[];

	public constructor(protected client: ZentBot<true>) {}

	abstract execute(...args: unknown[]): Awaitable<void>;
}

export abstract class BaseCommandWithSubcommands extends BaseCommand {
	public static subcommands = new SubcommandManager(BaseCommandWithSubcommands);
}

export abstract class PrefixCommand extends BaseCommandWithSubcommands {
	public static triggers: string[];

	abstract override execute(message: Message<true>, args: string[]): Awaitable<void>;
}

export abstract class SlashCommand extends BaseCommandWithSubcommands {
	public static data: RESTPostAPIApplicationCommandsJSONBody;

	abstract override execute(interaction: ChatInputCommandInteraction<"cached">): Awaitable<void>;
	autocomplete?(interaction: AutocompleteInteraction<"cached">): Awaitable<void>;
}

export abstract class HybridCommand extends BaseCommandWithSubcommands {
	public static applicationCommandData: RESTPostAPIApplicationCommandsJSONBody;
	public static prefixTriggers: string[];

	abstract override execute(context: HybridContext, args: string[]): Awaitable<void>;
	autocomplete?(interaction: AutocompleteInteraction<"cached">): Awaitable<void>;
}

export abstract class ContextMenuCommand extends BaseCommand {
	public static data: RESTPostAPIApplicationCommandsJSONBody;

	abstract override execute(interaction: ContextMenuCommandInteraction<"cached">): Awaitable<void>;
}

export type CommandWithSubcommands = PrefixCommand | SlashCommand | HybridCommand;

export type Command = ContextMenuCommand | CommandWithSubcommands;

export type BaseCommandConstructor<Constructor extends typeof BaseCommand> = Omit<
	Constructor,
	"new"
> & {
	new (...args: ConstructorParameters<Constructor>): InstanceType<Constructor>;
};

export type PrefixCommandConstructor = BaseCommandConstructor<typeof PrefixCommand>;

export type SlashCommandConstructor = BaseCommandConstructor<typeof SlashCommand>;

export type HybridCommandConstructor = BaseCommandConstructor<typeof HybridCommand>;

export type ContextMenuCommandConstructor = BaseCommandConstructor<typeof ContextMenuCommand>;

export type CommandWithSubcommandsConstructor =
	| HybridCommandConstructor
	| PrefixCommandConstructor
	| SlashCommandConstructor;

export type CommandConstructor = ContextMenuCommandConstructor | CommandWithSubcommandsConstructor;

export interface BaseUseCommandOptions {
	guildIds?: string[];
}

export interface UsePrefixCommandOptions extends BaseUseCommandOptions {
	triggers: string[];
}

export interface UseSlashCommandOptions extends BaseUseCommandOptions {
	data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
}

export interface UseContextMenuCommandOptions extends BaseUseCommandOptions {
	data: ContextMenuCommandBuilder;
}

export interface UseHybridCommandOptions extends BaseUseCommandOptions {
	applicationCommandData: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
	prefixTriggers: string[];
}

export function usePrefixCommand(options: UsePrefixCommandOptions) {
	const { triggers, guildIds } = options;

	return function <T extends typeof PrefixCommand>(constructor: T) {
		const enhanced = Object.assign(constructor, {
			triggers: triggers.filter(Boolean),
			guildIds: guildIds || [],
		} as PrefixCommandConstructor);

		CommandRegistry.addPrefixCommand(enhanced);
	};
}

export function useSlashCommand(options: UseSlashCommandOptions) {
	const { data, guildIds } = options;

	return function <T extends typeof SlashCommand>(constructor: T) {
		const enhanced = Object.assign(constructor, {
			data: data.toJSON(),
			guildIds: guildIds || [],
		} as SlashCommandConstructor);

		CommandRegistry.addSlashCommand(enhanced);
	};
}

export function useHybridCommand(options: UseHybridCommandOptions) {
	const { applicationCommandData, prefixTriggers, guildIds } = options;

	return function <T extends typeof HybridCommand>(constructor: T) {
		const enhanced = Object.assign(constructor, {
			applicationCommandData: applicationCommandData.toJSON(),
			prefixTriggers: prefixTriggers.filter(Boolean),
			guildIds: guildIds || [],
		} as HybridCommandConstructor);

		CommandRegistry.addHybridCommand(enhanced);
	};
}

export function useContextMenuCommand(options: UseContextMenuCommandOptions) {
	const { data, guildIds } = options;

	return function <T extends typeof ContextMenuCommand>(constructor: T) {
		const enhanced = Object.assign(constructor, {
			data: data.toJSON(),
			guildIds: guildIds || [],
		} as ContextMenuCommandConstructor);

		CommandRegistry.addContextMenuCommand(enhanced);
	};
}
