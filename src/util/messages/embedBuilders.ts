import { EmbedBuilder } from "discord.js";

export const createCeskyStatistickyUradEmbed = () => {
	return new EmbedBuilder().setColor(0x004080).setAuthor({
		name: "Český statistický úřad",
		icon_url: "https://cdn.discordapp.com/emojis/1405668224674168902.png",
	});
};

export const createUradPraceEmbed = () => {
	return new EmbedBuilder()
		.setColor(0x383184)
		.setAuthor({ name: "Úřad práce", icon_url: "https://cdn.discordapp.com/emojis/1405645407035588640.png" });
};

export const createCeskyTelekomunikacniUradEmbed = () => {
	return new EmbedBuilder().setColor(0xd88e30).setAuthor({
		name: "Český telekomunikační úřad",
		icon_url: "https://ctu.gov.cz/profiles/nautilus/themes/nautilus/img/logo-mobile.png",
	});
};

export const createKancelarPrezidentaRepubliky = () => {
	return new EmbedBuilder().setColor(0x194166).setAuthor({
		name: "Kancelář prezidenta republiky",
		icon_url: "https://www.hrad.cz/img/prezident/cs/logo.png",
	});
};

export const createInteraktivniPribehEmbed = () => {
	return new EmbedBuilder()
		.setColor(0x2b2d31) // Dark/neutral color
		.setAuthor({
			name: "Interaktivní příběh",
			icon_url: "https://cdn.discordapp.com/emojis/1326286362760187944.png", // 📖 book emoji or similar
		});
};
