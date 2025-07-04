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
import { PermissionFlagsBits } from "discord.js";
import { Listener, useListener } from "../base/Listener.js";
import prisma from "../libs/prisma.js";
import { getUserCharacters } from "../libs/character.js";
let CharacterMessageListener = (() => {
    let _classDecorators = [useListener("messageCreate")];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = Listener;
    var CharacterMessageListener = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CharacterMessageListener = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async execute(client, message) {
            if (message.author.bot || !message.inGuild()) {
                return;
            }
            // These permissions are required for deleting messages and creating webhooks.
            if (!message.guild.members.me?.permissions.has([PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageWebhooks])) {
                return;
            }
            // Having MANAGE_MESSAGES is not enough, the message may be undeletable.
            if (!message.deletable) {
                return;
            }
            const characters = await getUserCharacters(message.author.id);
            if (!characters.size) {
                return;
            }
            const lowercaseContent = message.content.toLowerCase();
            const character = characters.find((char) => char.prefix && lowercaseContent.startsWith(char.prefix.toLowerCase()));
            if (!character) {
                return;
            }
            const contentToSend = message.content
                .slice(character.prefix?.length)
                .trim()
                .replace(/@everyone|@here/g, "@\u200b$&"); // Prevent mention abuse
            // Users can just send a message contains only characters' prefix, which can lead to an empty content.
            if (!contentToSend && !message.attachments.size) {
                return;
            }
            // Because of limit of characters a webhook can send, we will use 100 characters for the replied message preview.
            if (contentToSend.length > 1_900) {
                return;
            }
            let repliedMessagePreview = null;
            if (message.reference?.messageId) {
                try {
                    const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                    repliedMessagePreview = await this.getPreviewMessage(repliedMessage);
                }
                catch (error) {
                    console.error("Failed to fetch replied message:", error);
                }
            }
            let webhook = null;
            try {
                webhook = await this.getWebhook(client, message.channel);
            }
            catch (error) {
                console.error("Failed to fetch or create a new webhook:", error);
            }
            if (!webhook) {
                return;
            }
            try {
                await message.delete();
                const characterMessage = await webhook.send({
                    username: character.name || character.tag,
                    avatarURL: character.avatarURL || undefined,
                    content: repliedMessagePreview
                        ? `${repliedMessagePreview}\n${contentToSend}`
                        : contentToSend,
                    threadId: message.channel.isThread() ? message.channelId : undefined,
                    files: message.attachments.map((attachment) => ({
                        name: attachment.name,
                        attachment: attachment.proxyURL,
                    }))
                });
                await prisma.message.create({
                    data: {
                        id: characterMessage.id,
                        content: contentToSend,
                        characterId: character.id,
                    }
                });
            }
            catch (error) {
                console.error("Failed to send webhook message:", error);
            }
        }
        async getWebhook(client, channel) {
            let baseChannel;
            // Threads can send wehook messages using its parent channel and threadId option.
            if (channel.isThread()) {
                if (!channel.parent?.isTextBased()) {
                    return null;
                }
                baseChannel = channel.parent;
            }
            else {
                baseChannel = channel;
            }
            let webhook = client.botWebhooks.get(baseChannel.id);
            if (!webhook) {
                const webhooks = await baseChannel.fetchWebhooks();
                webhook = webhooks.find((w) => w.owner?.id === client.user.id);
                if (!webhook) {
                    webhook = await baseChannel.createWebhook({
                        name: client.user.displayName,
                    });
                }
                client.botWebhooks.set(baseChannel.id, webhook); // Cache the webhook so we don't have to re-fetch it
            }
            return webhook;
        }
        async getPreviewMessage(message) {
            let author = message.author.toString();
            let content = message.content;
            if (message.webhookId) {
                author = message.author.displayName;
                const characterMessage = await prisma.message.findFirst({
                    where: { id: message.id },
                    include: {
                        character: true,
                    }
                });
                if (characterMessage) {
                    content = characterMessage.content;
                    if (characterMessage.character) {
                        author = characterMessage.character.name || characterMessage.character.tag;
                    }
                }
            }
            return `-# ╭ **${author}** - [${content.slice(0, 50)}](${message.url})`;
        }
    };
    return CharacterMessageListener = _classThis;
})();
export default CharacterMessageListener;
