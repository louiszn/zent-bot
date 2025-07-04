import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ComponentType, InteractionCollector, InteractionUpdateOptions, Message, MessageCreateOptions, MessageEditOptions, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { HybridContext } from "../base/Command.js";

interface PaginationOptions {
	pages: MessageCreateOptions[];
	timeout?: number;
}

export class Paginator {
	public context: HybridContext;
	public options: PaginationOptions;

	private currentPage = 0;

	public constructor(context: HybridContext, options: PaginationOptions) {
		this.context = context;
		this.options = options;
	}

	public async start() {
		const message = await this.context.send(this.renderPage());

		if (this.options.pages.length === 1) {
			return;
		}

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: (interaction) => interaction.user.id === this.context.user.id,
			time: this.options.timeout,
		});

		collector.on("collect", (interaction) => this.onCollect(collector, interaction));
		collector.on("end", () => this.onEnd(collector, message));
		collector.on("ignore", async (interaction) => {
			await interaction.reply({
				content: "This button is not for you!",
				flags: MessageFlags.Ephemeral,
			});
		});
	}

	private async onCollect(collector: InteractionCollector<ButtonInteraction<"cached">>, interaction: ButtonInteraction) {
		if (![
			"first",
			"last",
			"previous",
			"next",
			"current"
		].some((x) => `paginator:${x}` === interaction.customId)) {
			return;
		}

		collector.resetTimer();

		switch (interaction.customId) {
			case "paginator:first":
				this.currentPage = 0;
				break;
			case "paginator:last":
				this.currentPage = this.options.pages.length - 1;
				break;
			case "paginator:previous":
				this.currentPage--;
				break;
			case "paginator:next":
				this.currentPage++;
				break;
			case "paginator:current": {
				const modal = new ModalBuilder()
					.setTitle("Set page")
					.setCustomId("paginator:set-page");

				const pageInput = new TextInputBuilder()
					.setCustomId("page-input")
					.setLabel("Enter a page number")
					.setPlaceholder("1")
					.setValue(`${this.currentPage + 1}`)
					.setStyle(TextInputStyle.Short)
					.setRequired(true);

				modal.setComponents(new ActionRowBuilder<TextInputBuilder>().setComponents(pageInput));

				await interaction.showModal(modal);

				try {
					const modalInteraction = await interaction.awaitModalSubmit({ time: 60_000 });

					// This case is rare, but still want to make sure :)
					if (collector.ended) {
						return;
					}

					const pageInputValue = modalInteraction.fields.getTextInputValue("page-input");

					const pageNumber = Number(pageInputValue);

					// Only accept input from 1+
					if (isNaN(pageNumber) || pageNumber <= 0) {
						await modalInteraction.reply({
							content: "Invalid page number specified.",
							flags: MessageFlags.Ephemeral,
						});

						return;
					}

					if (pageNumber > this.options.pages.length) {
						this.currentPage = this.options.pages.length - 1;
					} else {
						this.currentPage = pageNumber - 1;
					}

					await modalInteraction.deferUpdate();
				} catch {
					return;
				}

				break;
			}
		}

		// Using modular to automatically adjust page index in range
		this.currentPage = (this.currentPage + this.options.pages.length) % this.options.pages.length;

		const display = this.renderPage();

		if (interaction.customId === "paginator:current") {
			await interaction.message.edit(display as MessageEditOptions);
		} else {
			await interaction.update(display as InteractionUpdateOptions);
		}
	}

	private async onEnd(collector: InteractionCollector<ButtonInteraction<"cached">>, message: Message<true>) {
		await message.edit(this.renderPage(true) as MessageEditOptions);
	}

	public renderPage(isEnded = false): MessageCreateOptions {
		const page = this.options.pages[this.currentPage];

		const components = [...(page.components || [])];

		if (this.options.pages.length > 1) {
			components.push(this.getActionRow(isEnded))
		}

		return {
			...page,
			components,
		};
	}

	private getActionRow(isDisabled = false) {
		return new ActionRowBuilder<ButtonBuilder>().setComponents(
			new ButtonBuilder()
				.setCustomId("paginator:first")
				.setLabel("<<")
				.setDisabled(isDisabled)
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId("paginator:previous")
				.setLabel("<")
				.setDisabled(isDisabled)
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId("paginator:current")
				.setLabel(`${this.currentPage + 1}/${this.options.pages.length}`)
				.setDisabled(isDisabled)
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId("paginator:next")
				.setLabel(">")
				.setDisabled(isDisabled)
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId("paginator:last")
				.setLabel(">>")
				.setDisabled(isDisabled)
				.setStyle(ButtonStyle.Secondary),
		);
	}
}
