import type {
	Guild,
	GuildTextBasedChannel,
	InteractionCallbackResponse,
	InteractionReplyOptions,
	InteractionResponse,
	MessageCreateOptions,
	MessagePayload,
	User,
} from "discord.js";

import { ChatInputCommandInteraction, Message } from "discord.js";

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
	public send(options: ContextSendOptions): Promise<Message<true>> {
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
