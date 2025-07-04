import { Collection, EmbedBuilder } from "discord.js";
import prisma from "./prisma.js";
const userCharacters = new Collection();
export async function getUserCharacters(userId, force = false) {
    let characters;
    if (!force) {
        characters = userCharacters.get(userId);
    }
    if (!characters) {
        const dbCharacters = await prisma.character.findMany({
            where: { userId },
        });
        characters = new Collection();
        for (const character of dbCharacters) {
            characters.set(character.id, character);
        }
        // Cache even empty result to avoid re-querying
        userCharacters.set(userId, characters);
    }
    return characters;
}
export async function getUserCharacterById(userId, characterId, force = false) {
    const characters = await getUserCharacters(userId, force);
    return characters.get(characterId) ?? null;
}
export async function getUserCharacterByTag(userId, characterTag, force = false) {
    const characters = await getUserCharacters(userId, force);
    return characters.find((char) => char.tag === characterTag) || null;
}
export async function createUserCharacter(userId, characterTag) {
    const characters = await getUserCharacters(userId);
    const character = await prisma.character.create({
        data: {
            tag: characterTag,
            userId
        }
    });
    characters.set(character.id, character);
    return character;
}
export async function updateUserCharacterById(userId, characterId, data) {
    const characters = await getUserCharacters(userId);
    const character = await prisma.character.update({
        where: {
            id: characterId,
            userId,
        },
        data
    });
    characters.set(characterId, character);
    return character;
}
export function getDisplayNameWithTag(character) {
    return character.name ? `${character.name} (${character.tag})` : character.tag;
}
export function getCharacterInformationEmbed(character) {
    return new EmbedBuilder()
        .setTitle(character.name || character.tag)
        .setColor("Yellow")
        .setThumbnail(character.avatarURL)
        .setDescription(`> **Tag:** \`${character.tag}\`
> **Prefix:** \`${character.prefix}\`
> **Owner:** <@${character.userId}>
> **Created at:** <t:${Math.floor(character.createdAt.getTime() / 1000)}:R>`)
        .setTimestamp();
}
