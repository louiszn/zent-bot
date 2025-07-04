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
import { ApplicationCommandType, ContextMenuCommandBuilder, InteractionContextType, MessageFlags } from "discord.js";
import { ContextMenuCommand, useContextMenuCommand } from "../../base/Command.js";
import prisma from "../../libs/prisma.js";
let DeleteCharMessageCommand = (() => {
    let _classDecorators = [useContextMenuCommand(new ContextMenuCommandBuilder()
            .setName("Delete character's message")
            .setContexts(InteractionContextType.Guild)
            .setType(ApplicationCommandType.Message))];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = ContextMenuCommand;
    var DeleteCharMessageCommand = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            DeleteCharMessageCommand = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async execute(client, interaction) {
            const { targetMessage } = interaction;
            if (!targetMessage.webhookId) {
                await interaction.reply({
                    content: "This message isn't sent by a character.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            const characterMessage = await prisma.message.findFirst({
                where: { id: targetMessage.id },
                include: {
                    character: true,
                }
            });
            if (!characterMessage) {
                await interaction.reply({
                    content: "This message isn't sent by a character or isn't in the database.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            if (!characterMessage.character || characterMessage.character.userId !== interaction.user.id) {
                await interaction.reply({
                    content: "You don't have permissions to delete this message.",
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            await interaction.deferReply({
                flags: MessageFlags.Ephemeral,
            });
            await targetMessage.delete();
            await interaction.deleteReply();
            try {
                await prisma.message.delete({
                    where: { id: characterMessage.id },
                });
            }
            catch (error) {
                console.error(`Failed to delete message ${characterMessage.id} from database:`, error);
            }
        }
    };
    return DeleteCharMessageCommand = _classThis;
})();
export default DeleteCharMessageCommand;
