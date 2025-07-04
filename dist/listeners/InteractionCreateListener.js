var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { DiscordAPIError, MessageFlags, RESTJSONErrorCodes } from "discord.js";
import { Listener, useListener } from "../base/Listener.js";
import { HybridCommand, SlashHybridContext } from "../base/Command.js";
let InteractionCreateListener = (() => {
    let _classDecorators = [useListener("interactionCreate")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Listener;
    var InteractionCreateListener = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            InteractionCreateListener = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async execute(client, interaction) {
            if (interaction.isChatInputCommand()) {
                if (!interaction.inCachedGuild()) {
                    return;
                }
                const { commandName } = interaction;
                const command = client.slashCommands.get(commandName);
                if (!command) {
                    console.warn(`Unknown slash command: ${commandName}`);
                    return;
                }
                try {
                    if (command instanceof HybridCommand) {
                        await command.execute(client, new SlashHybridContext(interaction), []);
                    }
                    else {
                        await command.execute(client, interaction);
                    }
                }
                catch (error) {
                    await this.handleCommandInteractionError(interaction, error);
                }
            }
            else if (interaction.isContextMenuCommand()) {
                if (!interaction.inCachedGuild()) {
                    return;
                }
                const { commandName } = interaction;
                const command = client.contextMenuCommands.get(commandName);
                if (!command) {
                    console.warn(`Unknown context menu command: ${commandName}`);
                    return;
                }
                try {
                    await command.execute(client, interaction);
                }
                catch (error) {
                    await this.handleCommandInteractionError(interaction, error);
                }
            }
            else if (interaction.isAutocomplete()) {
                if (!interaction.inCachedGuild()) {
                    return;
                }
                const { commandName } = interaction;
                const command = client.slashCommands.get(commandName);
                if (!command) {
                    console.warn(`Unknown slash command: ${commandName}`);
                    return;
                }
                if (!command.autocomplete) {
                    console.warn(`Command '${commandName}' used autocomplete option but no methods were declared.`);
                    return;
                }
                try {
                    await command.autocomplete(client, interaction);
                }
                catch (error) {
                    console.error("Failed to respond autocomplete:", error);
                }
            }
        }
        async handleCommandInteractionError(interaction, error) {
            const { commandName } = interaction;
            console.error(`An error occurred while executing '${commandName}':`, error);
            if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownInteraction) {
                return; // Too late to respond
            }
            if (interaction.isRepliable()) {
                const content = "An error occurred while executing this command.";
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
                    }
                    else {
                        await interaction.reply({ content, flags: MessageFlags.Ephemeral });
                    }
                }
                catch (replyError) {
                    console.error("Failed to notify user of command failure:", replyError);
                }
            }
        }
    };
    return InteractionCreateListener = _classThis;
})();
export default InteractionCreateListener;
