import { ChatInputCommandInteraction, Message } from "discord.js";
import fg from "fast-glob";
import { pathToFileURL } from "node:url";
const prefixCommandsRegistry = [];
const slashCommandsRegistry = [];
const contextMenuCommandsRegistry = [];
const hybridCommandsRegistry = [];
export class PrefixCommand {
}
export class SlashCommand {
}
export class ContextMenuCommand {
}
export class HybridCommand {
}
export class BaseHybridContext {
    source;
    constructor(source) {
        this.source = source;
    }
    isInteraction() {
        return this.source instanceof ChatInputCommandInteraction;
    }
    isMessage() {
        return this.source instanceof Message;
    }
    get user() {
        throw new Error("Invalid source provided.");
    }
    get channel() {
        throw new Error("Invalid source provided.");
    }
    get guild() {
        throw new Error("Invalid source provided.");
    }
    async send(options) {
        throw new Error("Invalid source provided.");
    }
}
export class SlashHybridContext extends BaseHybridContext {
    get user() {
        return this.source.user;
    }
    get channel() {
        return this.source.channel;
    }
    get guild() {
        return this.source.guild;
    }
    async send(options) {
        options = options;
        if (typeof options === "string") {
            options = { content: options };
        }
        const response = await this.source.reply({
            ...options,
            withResponse: true,
        });
        return response.resource?.message;
    }
}
export class PrefixHybridContext extends BaseHybridContext {
    get user() {
        return this.source.author;
    }
    get channel() {
        return this.source.channel;
    }
    get guild() {
        return this.source.guild;
    }
    async send(options) {
        const message = await this.channel.send(options);
        return message;
    }
}
export function usePrefixCommand(triggers) {
    return function (constructor) {
        constructor.triggers = triggers;
        prefixCommandsRegistry.push(constructor);
    };
}
export function useSlashCommand(data) {
    return function (constructor) {
        constructor.data = data.toJSON();
        slashCommandsRegistry.push(constructor);
    };
}
export function useContextMenuCommand(data) {
    return function (constructor) {
        constructor.data = data.toJSON();
        contextMenuCommandsRegistry.push(constructor);
    };
}
export function useHybridCommand(options) {
    return function (constructor) {
        const correctConstructor = constructor;
        correctConstructor.applicationCommandData = options.applicationCommandData.toJSON();
        correctConstructor.prefixTriggers = options.prefixTriggers;
        hybridCommandsRegistry.push(correctConstructor);
    };
}
export async function loadCommandRegistry() {
    const files = await fg.glob("dist/commands/**/*.js");
    for (const file of files) {
        try {
            await import(pathToFileURL(file).toString());
        }
        catch (error) {
            console.error(`Failed to load file: ${file}`, error);
        }
    }
    return {
        prefixCommandsRegistry,
        slashCommandsRegistry,
        contextMenuCommandsRegistry,
        hybridCommandsRegistry,
    };
}
