import fg from "fast-glob";
import { pathToFileURL } from "node:url";
const listenersRegistry = [];
export class Listener {
}
export function useListener(event, once = false) {
    return function (constructor) {
        const correctConstructor = constructor;
        correctConstructor.eventName = event;
        correctConstructor.once = once;
        listenersRegistry.push(correctConstructor);
    };
}
export async function loadListenerRegistry() {
    const files = await fg.glob("dist/listeners/**/*.js");
    for (const file of files) {
        try {
            await import(pathToFileURL(file).toString());
        }
        catch (error) {
            console.error(`Failed to load file: ${file}`, error);
        }
    }
    return listenersRegistry;
}
