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
	SlashCommandOptionsOnlyBuilder,
} from "discord.js";

import CommandRegistry from "./CommandRegistry.js";

import {
	HybridSubcommandManager,
	PrefixSubcommandManager,
	SlashSubcommandManager,
} from "./subcommand/SubcommandManager.js";

import { getSubcommandsMetadata } from "./subcommand/Subcommand.js";

import type ZentBot from "../ZentBot.js";

import type { BaseSubcommandManager } from "./subcommand/SubcommandManager.js";
import type { HybridContext } from "./HybridContext.js";
import type ArgumentResolver from "./argument/ArgumentResolver.js";

export abstract class BaseCommand {
	public static guildIds: string[];

	public constructor(protected client: ZentBot<true>) {}

	abstract execute(...args: unknown[]): Awaitable<void>;
}

export abstract class BaseCommandWithSubcommands extends BaseCommand {
	public static subcommands: BaseSubcommandManager<BaseCommandWithSubcommands>;
}

export abstract class PrefixCommand extends BaseCommandWithSubcommands {
	public static override subcommands: PrefixSubcommandManager;

	public static triggers: string[];

	abstract override execute(message: Message<true>, args: ArgumentResolver): Awaitable<void>;
}

export abstract class SlashCommand extends BaseCommandWithSubcommands {
	public static override subcommands: SlashSubcommandManager;

	public static data: RESTPostAPIApplicationCommandsJSONBody;

	abstract override execute(interaction: ChatInputCommandInteraction<"cached">): Awaitable<void>;
	autocomplete?(interaction: AutocompleteInteraction<"cached">): Awaitable<void>;
}

export abstract class HybridCommand extends BaseCommandWithSubcommands {
	public static override subcommands: HybridSubcommandManager;

	public static applicationCommandData: RESTPostAPIApplicationCommandsJSONBody;
	public static prefixTriggers: string[];

	abstract override execute(context: HybridContext, args: ArgumentResolver): Awaitable<void>;
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
	data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder;
}

export interface UseContextMenuCommandOptions extends BaseUseCommandOptions {
	data: ContextMenuCommandBuilder;
}

export interface UseHybridCommandOptions extends BaseUseCommandOptions {
	applicationCommandData:
		| SlashCommandBuilder
		| SlashCommandSubcommandsOnlyBuilder
		| SlashCommandOptionsOnlyBuilder;
	prefixTriggers: string[];
}

function registerSubcommands<T extends typeof BaseCommandWithSubcommands>(constructor: T) {
	const subcommands = getSubcommandsMetadata(constructor);

	for (const subcommand of subcommands) {
		constructor.subcommands.add(subcommand);
	}
}

export function usePrefixCommand(options: UsePrefixCommandOptions) {
	const { triggers, guildIds } = options;

	return function <T extends typeof PrefixCommand>(constructor: T & PrefixCommandConstructor) {
		constructor.triggers = triggers.filter(Boolean);
		constructor.guildIds = guildIds || [];
		constructor.subcommands = new PrefixSubcommandManager();

		registerSubcommands(constructor);

		CommandRegistry.addPrefixCommand(constructor);
	};
}

export function useSlashCommand(options: UseSlashCommandOptions) {
	const { data, guildIds } = options;

	return function <T extends typeof SlashCommand>(constructor: T & SlashCommandConstructor) {
		constructor.data = data.toJSON();
		constructor.guildIds = guildIds || [];
		constructor.subcommands = new SlashSubcommandManager();

		registerSubcommands(constructor);

		CommandRegistry.addSlashCommand(constructor);
	};
}

export function useHybridCommand(options: UseHybridCommandOptions) {
	const { applicationCommandData, prefixTriggers, guildIds } = options;

	return function <T extends typeof HybridCommand>(constructor: T & HybridCommandConstructor) {
		constructor.applicationCommandData = applicationCommandData.toJSON();
		constructor.prefixTriggers = prefixTriggers.filter(Boolean);
		constructor.guildIds = guildIds || [];
		constructor.subcommands = new HybridSubcommandManager();

		registerSubcommands(constructor);

		CommandRegistry.addHybridCommand(constructor);
	};
}

export function useContextMenuCommand(options: UseContextMenuCommandOptions) {
	const { data, guildIds } = options;

	return function <T extends typeof ContextMenuCommand>(
		constructor: T & ContextMenuCommandConstructor,
	) {
		constructor.data = data.toJSON();
		constructor.guildIds = guildIds || [];

		CommandRegistry.addContextMenuCommand(constructor);
	};
}
