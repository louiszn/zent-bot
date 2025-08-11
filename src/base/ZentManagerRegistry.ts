import type ZentBot from "./ZentBot.js";

import CommandManager from "./command/CommandManager.js";
import ComponentManager from "./component/ComponentManager.js";
import ListenerManager from "./listener/ListenerManager.js";

export default class ZentManagerRegistry<Ready extends boolean = boolean> {
	public commands: CommandManager<Ready>;
	public components: ComponentManager<Ready>;
	public listeners: ListenerManager<Ready>;

	public constructor(public client: ZentBot<Ready>) {
		this.commands = new CommandManager(client);
		this.components = new ComponentManager(client);
		this.listeners = new ListenerManager(client);
	}

	public load() {
		return Promise.all([this.commands.load(), this.components.load(), this.listeners.load()]);
	}
}
