import { Client, Collection, GatewayIntentBits } from "discord.js";
import config from "../config.js";
import { loadCommandRegistry } from "./Command.js";
import { loadListenerRegistry } from "./Listener.js";
export default class ZentBot extends Client {
    slashCommands = new Collection();
    prefixCommands = new Collection();
    contextMenuCommands = new Collection();
    botWebhooks = new Collection(); // key is channel ID
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.GuildWebhooks,
            ],
        });
    }
    async initialize() {
        this.rest.setToken(config.botToken);
        await Promise.all([
            this.loadCommands(),
            this.loadListeners(),
        ]);
        this.once("ready", this.onReady);
        await this.login(config.botToken);
    }
    async loadCommands() {
        const { slashCommandsRegistry, prefixCommandsRegistry, contextMenuCommandsRegistry, hybridCommandsRegistry } = await loadCommandRegistry();
        let commandCount = 0;
        for (const constructor of slashCommandsRegistry) {
            if (this.slashCommands.has(constructor.data.name)) {
                console.warn(`Duplicate slash command name detected from ${constructor.name}: ${constructor.data.name}`);
                continue;
            }
            const instance = new constructor();
            this.slashCommands.set(constructor.data.name, instance);
            commandCount++;
        }
        for (const constructor of contextMenuCommandsRegistry) {
            if (this.contextMenuCommands.has(constructor.data.name)) {
                console.warn(`Duplicate context menu command detected from ${constructor.name}: ${constructor.data.name}`);
                continue;
            }
            const instance = new constructor();
            this.contextMenuCommands.set(constructor.data.name, instance);
            commandCount++;
        }
        for (const constructor of prefixCommandsRegistry) {
            const instance = new constructor();
            for (const trigger of constructor.triggers) {
                if (this.prefixCommands.has(trigger)) {
                    console.warn(`Duplicate prefix command trigger detected from ${constructor.name}: ${trigger}`);
                    continue;
                }
                this.prefixCommands.set(trigger, instance);
            }
            commandCount++;
        }
        for (const constructor of hybridCommandsRegistry) {
            const instance = new constructor();
            if (this.slashCommands.has(constructor.applicationCommandData.name)) {
                console.warn(`Duplicate slash command detected from ${constructor.name}: ${constructor.applicationCommandData.name}`);
            }
            else {
                this.slashCommands.set(constructor.applicationCommandData.name, instance);
            }
            for (const trigger of constructor.prefixTriggers) {
                if (this.prefixCommands.has(trigger)) {
                    console.warn(`Duplicate prefix command trigger detected from ${constructor.name}: ${trigger}`);
                    continue;
                }
                this.prefixCommands.set(trigger, instance);
            }
            commandCount++;
        }
        console.log(`Loaded ${commandCount} commands`);
    }
    async loadListeners() {
        let count = 0;
        const registry = await loadListenerRegistry();
        for (const constructor of registry) {
            const instance = new constructor();
            this[constructor.once ? "once" : "on"](constructor.eventName, (...args) => instance.execute(this, ...args));
            count++;
        }
        console.log(`Loaded ${count} listeners`);
    }
    async onReady() {
        console.log(`Successfully logged in as ${this.user.tag}`);
    }
}
