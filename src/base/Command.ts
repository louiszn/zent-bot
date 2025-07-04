import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	ContextMenuCommandBuilder,
	Guild,
	GuildTextBasedChannel,
	InteractionCallbackResponse,
	InteractionReplyOptions,
	InteractionResponse,
	Message,
	MessageContextMenuCommandInteraction,
	MessageCreateOptions,
	MessagePayload,
	RESTPostAPIApplicationCommandsJSONBody,
	SlashCommandBuilder,
	SlashCommandSubcommandsOnlyBuilder,
	User,
	UserContextMenuCommandInteraction
} from "discord.js";

import fg from "fast-glob";
import { pathToFileURL } from "node:url";

import ZentBot from "./ZentBot.js";

const prefixCommandsRegistry: PrefixCommandConstructor[] = [];
const slashCommandsRegistry: SlashCommandConstructor[] = [];
const contextMenuCommandsRegistry: ContextMenuCommandConstructor[] = [];
const hybridCommandsRegistry: HybridCommandConstructor[] = [];

export abstract class BaseCommand {
	protected client!: ZentBot<true>;
	abstract execute(...args: any[]): Promise<void>;
}

export abstract class PrefixCommand extends BaseCommand {
	abstract execute(message: Message<true>, args: string[]): Promise<void>;
}

export abstract class SlashCommand extends BaseCommand {
	abstract execute(interaction: ChatInputCommandInteraction<"cached">): Promise<void>;
	autocomplete?(interaction: AutocompleteInteraction<"cached">): Promise<void>;
}

export abstract class ContextMenuCommand extends BaseCommand {
	abstract execute(interaction: UserContextMenuCommandInteraction | MessageContextMenuCommandInteraction): Promise<void>;
}

export abstract class HybridCommand extends BaseCommand {
	abstract execute(context: HybridContext, args: string[]): Promise<void>;
	autocomplete?(interaction: AutocompleteInteraction<"cached">): Promise<void>;
}

export interface ContextResponse {
	message?: Message<true>;
	interaction?: InteractionResponse<true> | InteractionCallbackResponse;
}

export interface ContextCallbackResponse {
	interaction: InteractionCallbackResponse
}

export type SlashContextSendOptions =
	| string
	| InteractionReplyOptions

export type PrefixContextSendOptions =
	| string
	| MessagePayload
	| MessageCreateOptions;

export type ContextSendOptions = SlashContextSendOptions | PrefixContextSendOptions;

export class BaseHybridContext {
	public readonly source: ChatInputCommandInteraction<"cached"> | Message<true>;

	public constructor(source: ChatInputCommandInteraction<"cached"> | Message<true>) {
		this.source = source;
	}

	public isInteraction(): this is SlashHybridContext {
		return this.source instanceof ChatInputCommandInteraction;
	}

	public isMessage(): this is PrefixHybridContext {
		return this.source instanceof Message;
	}

	public get user(): User {
		throw new Error("Invalid source provided.");
	}

	public get channel(): GuildTextBasedChannel | null {
		throw new Error("Invalid source provided.");
	}

	public get guild(): Guild {
		throw new Error("Invalid source provided.");
	}

	public async send(options: ContextSendOptions): Promise<Message<true>> {
		throw new Error("Invalid source provided.");
	}
}

export class SlashHybridContext extends BaseHybridContext {
	public declare readonly source: ChatInputCommandInteraction<"cached">;

	public override get user(): User {
		return this.source.user;
	}

	public override get channel(): GuildTextBasedChannel | null {
		return this.source.channel;
	}

	public override get guild(): Guild {
		return this.source.guild;
	}

	public override async send(options: ContextSendOptions): Promise<Message<true>> {
		options = options;

		if (typeof options === "string") {
			options = { content: options };
		}

		const response = await this.source.reply({
			...(options as InteractionReplyOptions),
			withResponse: true,
		});

		return response.resource?.message as Message<true>;
	}
}

export class PrefixHybridContext extends BaseHybridContext {
	public declare readonly source: Message<true>;

	public override get user(): User {
		return this.source.author;
	}

	public override get channel(): GuildTextBasedChannel {
		return this.source.channel;
	}

	public override get guild(): Guild {
		return this.source.guild;
	}

	public override async send(options: ContextSendOptions): Promise<Message<true>> {
		const message = await this.channel.send(options as PrefixContextSendOptions);
		return message;
	}
}

export type HybridContext = SlashHybridContext | PrefixHybridContext;

export interface PrefixCommandConstructor {
	new(): PrefixCommand;
	triggers: string[]
}

export interface SlashCommandConstructor {
	new(): SlashCommand;
	data: RESTPostAPIApplicationCommandsJSONBody;
}

export interface ContextMenuCommandConstructor {
	new(): ContextMenuCommand;
	data: RESTPostAPIApplicationCommandsJSONBody;
}

export interface HybridCommandConstructor {
	new(): HybridCommand;
	applicationCommandData: RESTPostAPIApplicationCommandsJSONBody;
	prefixTriggers: string[];
}

export type CommandConstructor = SlashCommandConstructor | PrefixCommandConstructor | ContextMenuCommandConstructor | HybridCommandConstructor;

export function usePrefixCommand(triggers: string[]) {
	return function <T extends typeof PrefixCommand>(constructor: T) {
		(constructor as T & PrefixCommandConstructor).triggers = triggers;
		prefixCommandsRegistry.push(constructor as T & PrefixCommandConstructor);
	};
}

export function useSlashCommand(data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder) {
	return function <T extends typeof SlashCommand>(constructor: T) {
		(constructor as T & SlashCommandConstructor).data = data.toJSON();
		slashCommandsRegistry.push(constructor as T & SlashCommandConstructor);
	}
}

export function useContextMenuCommand(data: ContextMenuCommandBuilder) {
	return function <T extends typeof ContextMenuCommand>(constructor: T) {
		(constructor as T & ContextMenuCommandConstructor).data = data.toJSON();
		contextMenuCommandsRegistry.push(constructor as T & ContextMenuCommandConstructor);
	}
}

export function useHybridCommand(options: {
	applicationCommandData: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
	prefixTriggers: string[];
}) {
	return function <T extends typeof HybridCommand>(constructor: T) {
		const correctConstructor = constructor as T & HybridCommandConstructor;

		correctConstructor.applicationCommandData = options.applicationCommandData.toJSON();
		correctConstructor.prefixTriggers = options.prefixTriggers;

		hybridCommandsRegistry.push(correctConstructor);
	}
}

export async function loadCommandRegistry() {
	const files = await fg.glob("dist/commands/**/*.js");

	for (const file of files) {
		try {
			await import(pathToFileURL(file).toString());
		} catch (error) {
			console.error(`Failed to load file: ${file}`, error);
		}
	}

	return {
		prefixCommandsRegistry,
		slashCommandsRegistry,
		contextMenuCommandsRegistry,
		hybridCommandsRegistry,
	}
}
