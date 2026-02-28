import {
	ChatInputCommandBuilder,
	EmbedBuilder,
	MessageFlags,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ComponentType,
} from "discord.js";
import type { CommandContext } from "../util/commands.ts";
import {
	Career,
	CAREER_INFO,
	getUserCareer,
	setUserCareer,
	hasSelectedCareer,
	type CareerType,
} from "../services/career/index.ts";

export const data = new ChatInputCommandBuilder()
	.setName("career")
	.setNameLocalizations({ cs: "kariéra" })
	.setDescription("Choose your career path to influence your work activities")
	.setDescriptionLocalizations({ cs: "Vyber si kariérní cestu, která ovlivní tvé pracovní aktivity" })
	.addSubcommands((subcommand) =>
		subcommand
			.setName("view")
			.setNameLocalizations({ cs: "zobrazit" })
			.setDescription("View your current career")
			.setDescriptionLocalizations({ cs: "Zobraz svou aktuální kariéru" }),
	)
	.addSubcommands((subcommand) =>
		subcommand
			.setName("choose")
			.setNameLocalizations({ cs: "vybrat" })
			.setDescription("Choose or change your career")
			.setDescriptionLocalizations({ cs: "Vyber nebo změň svou kariéru" }),
	);

export const execute = async ({ interaction }: CommandContext): Promise<void> => {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const subcommand = interaction.options.getSubcommand();
	const discordId = interaction.user.id;

	if (subcommand === "view") {
		const userCareer = getUserCareer(discordId);
		const careerInfo = CAREER_INFO[userCareer.career];
		const hasExplicitlySelected = hasSelectedCareer(discordId);

		const embed = new EmbedBuilder()
			.setTitle(`${careerInfo.emoji} Tvá kariéra: ${careerInfo.czechName}`)
			.setColor(getCareerColor(userCareer.career))
			.setDescription(careerInfo.czechDescription)
			.addFields(
				{
					name: "Vliv na /work",
					value: getWorkInfluenceDescription(userCareer.career),
					inline: false,
				},
				{
					name: "Vliv na /story",
					value: getStoryInfluenceDescription(userCareer.career),
					inline: false,
				},
			);

		if (!hasExplicitlySelected) {
			embed.setFooter({ text: "Toto je výchozí kariéra. Použij /career choose pro změnu." });
		}

		await interaction.editReply({ embeds: [embed] });
		return;
	}

	if (subcommand === "choose") {
		const currentCareer = getUserCareer(discordId);
		const hasExplicitlySelected = hasSelectedCareer(discordId);

		// Build career selection menu
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId("career_select")
			.setPlaceholder("Vyber si kariéru...")
			.addOptions(
				Object.values(Career).map((careerId) => {
					const info = CAREER_INFO[careerId];
					const isCurrentCareer = careerId === currentCareer.career;
					return new StringSelectMenuOptionBuilder()
						.setLabel(`${info.emoji} ${info.czechName}`)
						.setDescription(info.czechDescription.slice(0, 100))
						.setValue(careerId)
						.setDefault(isCurrentCareer);
				}),
			);

		const row = new ActionRowBuilder().addComponents(selectMenu);

		const embed = new EmbedBuilder()
			.setTitle("🎭 Výběr kariéry")
			.setColor(0x5865f2)
			.setDescription(
				"Vyber si kariérní cestu. Tvá kariéra ovlivní, jaké aktivity a příběhy dostáváš.\n\n" +
				"**Dostupné kariéry:**\n" +
				Object.values(CAREER_INFO)
					.map((info) => `${info.emoji} **${info.czechName}** - ${info.czechDescription}`)
					.join("\n"),
			);

		if (hasExplicitlySelected) {
			embed.setFooter({ text: `Aktuální kariéra: ${CAREER_INFO[currentCareer.career].czechName}` });
		}

		const response = await interaction.editReply({
			embeds: [embed],
			components: [row],
		});

		// Wait for selection
		try {
			const selectInteraction = await response.awaitMessageComponent({
				componentType: ComponentType.StringSelect,
				filter: (i) => i.user.id === discordId && i.customId === "career_select",
				time: 60_000,
			});

			const selectedCareer = selectInteraction.values[0] as CareerType;
			const selectedInfo = CAREER_INFO[selectedCareer];

			// Save the career
			setUserCareer(discordId, selectedCareer);

			const successEmbed = new EmbedBuilder()
				.setTitle(`${selectedInfo.emoji} Kariéra nastavena!`)
				.setColor(getCareerColor(selectedCareer))
				.setDescription(
					`Tvá nová kariéra je **${selectedInfo.czechName}**.\n\n` +
					`${selectedInfo.czechDescription}\n\n` +
					"Tato kariéra ovlivní, jaké aktivity a příběhy dostáváš při použití /work a /story.",
				)
				.addFields(
					{
						name: "Vliv na /work",
						value: getWorkInfluenceDescription(selectedCareer),
						inline: false,
					},
					{
						name: "Vliv na /story",
						value: getStoryInfluenceDescription(selectedCareer),
						inline: false,
					},
				);

			await selectInteraction.update({
				embeds: [successEmbed],
				components: [],
			});
		} catch {
			// Timeout or error
			const timeoutEmbed = new EmbedBuilder()
				.setTitle("⏰ Čas vypršel")
				.setColor(0xed4245)
				.setDescription("Výběr kariéry byl zrušen. Použij /career choose pro nový pokus.");

			await interaction.editReply({
				embeds: [timeoutEmbed],
				components: [],
			});
		}

		return;
	}
};

function getCareerColor(career: CareerType): number {
	const colors: Record<CareerType, number> = {
		[Career.CLERK]: 0x95a5a6,     // Gray - bureaucracy
		[Career.DEVELOPER]: 0x3498db, // Blue - tech
		[Career.SALESPERSON]: 0xf1c40f, // Yellow - business
		[Career.ADVENTURER]: 0x9b59b6, // Purple - adventure
		[Career.SHADOW]: 0x2c3e50,    // Dark - shadow
	};
	return colors[career];
}

function getWorkInfluenceDescription(career: CareerType): string {
	const descriptions: Record<CareerType, string> = {
		[Career.CLERK]: "📈 Více kancelářských aktivit (schůzky, papírování, e-maily)",
		[Career.DEVELOPER]: "📈 Více technických aktivit (code review, git, docker)",
		[Career.SALESPERSON]: "📈 Více obchodních aktivit (schůzky s klienty, vyjednávání)",
		[Career.ADVENTURER]: "📈 Rozmanitější aktivity, více komunitních referencí",
		[Career.SHADOW]: "📈 Více náhodných aktivit, méně běžné kancelářské práce",
	};
	return descriptions[career];
}

function getStoryInfluenceDescription(career: CareerType): string {
	const descriptions: Record<CareerType, string> = {
		[Career.CLERK]: "📖 Více kancelářských příběhů (vánoční večírek, schůzky)",
		[Career.DEVELOPER]: "📖 Více technických příběhů (hackathon, deploy, serverovna)",
		[Career.SALESPERSON]: "📖 Více obchodních příběhů (pohovory, vyjednávání)",
		[Career.ADVENTURER]: "📖 Více dobrodružných příběhů (volby, výtah) a AI příběhů",
		[Career.SHADOW]: "📖 Více příběhů s morálními volbami (krádeže, podvody)",
	};
	return descriptions[career];
}
