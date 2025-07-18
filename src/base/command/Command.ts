import type {
	AutocompleteInteraction,
	ContextMenuCommandBuilder,
	Guild,
	GuildTextBasedChannel,
	InteractionCallbackResponse,
	InteractionReplyOptions,
	InteractionResponse,
	MessageContextMenuCommandInteraction,
	MessageCreateOptions,
	MessagePayload,
	RESTPostAPIApplicationCommandsJSONBody,
	SlashCommandBuilder,
	SlashCommandSubcommandsOnlyBuilder,
	User,
	UserContextMenuCommandInteraction,
} from "discord.js";

import { ChatInputCommandInteraction, Message } from "discord.js";

import type ZentBot from "../ZentBot.js";
import CommandRegistry from "./CommandRegistry.js";

export abstract class BaseCommand {
	public constructor(protected client: ZentBot<true>) {}

	abstract execute(...args: unknown[]): Promise<void>;
}

export abstract class PrefixCommand extends BaseCommand {
	abstract override execute(message: Message<true>, args: string[]): Promise<void>;
}

export abstract class SlashCommand extends BaseCommand {
	abstract override execute(interaction: ChatInputCommandInteraction<"cached">): Promise<void>;
	autocomplete?(interaction: AutocompleteInteraction<"cached">): Promise<void>;
}

export abstract class ContextMenuCommand extends BaseCommand {
	abstract override execute(
		interaction: UserContextMenuCommandInteraction | MessageContextMenuCommandInteraction,
	): Promise<void>;
}

export abstract class HybridCommand extends BaseCommand {
	abstract override execute(context: HybridContext, args: string[]): Promise<void>;
	autocomplete?(interaction: AutocompleteInteraction<"cached">): Promise<void>;
}

export type Command = PrefixCommand | SlashCommand | ContextMenuCommand | HybridCommand;

export interface ContextResponse {
	message?: Message<true>;
	interaction?: InteractionResponse<true> | InteractionCallbackResponse;
}

export interface ContextCallbackResponse {
	interaction: InteractionCallbackResponse;
}

export type SlashContextSendOptions = string | InteractionReplyOptions;

export type PrefixContextSendOptions = string | MessagePayload | MessageCreateOptions;

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

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public async send(options: ContextSendOptions): Promise<Message<true>> {
		throw new Error("Invalid source provided.");
	}
}

export class SlashHybridContext extends BaseHybridContext {
	declare public readonly source: ChatInputCommandInteraction<"cached">;

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
	declare public readonly source: Message<true>;

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
	new (client: ZentBot<true>): PrefixCommand;
	triggers: string[];
}

export interface SlashCommandConstructor {
	new (client: ZentBot<true>): SlashCommand;
	data: RESTPostAPIApplicationCommandsJSONBody;
}

export interface ContextMenuCommandConstructor {
	new (client: ZentBot<true>): ContextMenuCommand;
	data: RESTPostAPIApplicationCommandsJSONBody;
}

export interface HybridCommandConstructor {
	new (client: ZentBot<true>): HybridCommand;
	applicationCommandData: RESTPostAPIApplicationCommandsJSONBody;
	prefixTriggers: string[];
}

export type CommandConstructor =
	| SlashCommandConstructor
	| PrefixCommandConstructor
	| ContextMenuCommandConstructor
	| HybridCommandConstructor;

export function usePrefixCommand(triggers: string[]) {
	return function <T extends typeof PrefixCommand>(constructor: T) {
		const correctConstructor = constructor as T & PrefixCommandConstructor;

		correctConstructor.triggers = triggers;

		CommandRegistry.addPrefixCommand(correctConstructor);
	};
}

export function useSlashCommand(data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder) {
	return function <T extends typeof SlashCommand>(constructor: T) {
		const correctConstructor = constructor as T & SlashCommandConstructor;

		correctConstructor.data = data.toJSON();

		CommandRegistry.addSlashCommand(constructor as T & SlashCommandConstructor);
	};
}

export function useContextMenuCommand(data: ContextMenuCommandBuilder) {
	return function <T extends typeof ContextMenuCommand>(constructor: T) {
		const correctConstructor = constructor as T & ContextMenuCommandConstructor;

		correctConstructor.data = data.toJSON();

		CommandRegistry.addContextMenuCommand(correctConstructor);
	};
}

export function useHybridCommand(options: {
	applicationCommandData: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
	prefixTriggers: string[];
}) {
	return function <T extends typeof HybridCommand>(constructor: T) {
		const correctConstructor = constructor as T & HybridCommandConstructor;

		correctConstructor.applicationCommandData = options.applicationCommandData.toJSON();
		correctConstructor.prefixTriggers = options.prefixTriggers;

		CommandRegistry.addHybridCommand(correctConstructor);
	};
}
