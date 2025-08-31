import { EmbedBuilder } from "discord.js";

export const createCeskyStatistickyUradEmbed = () => {
	return new EmbedBuilder()
		.setColor(0x004080)
		.setAuthor({
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
	return new EmbedBuilder()
		.setColor(0xd88e30)
		.setAuthor({
			name: "Český telekomunikační úřad",
			icon_url: "https://ctu.gov.cz/profiles/nautilus/themes/nautilus/img/logo-mobile.png",
		});
};
