import {ChatInputCommandBuilder} from "discord.js";
import type {CommandContext} from "../util/commands.ts";

export const data = new ChatInputCommandBuilder()
    .setName("hodina-duchu")
    .setNameLocalizations({ cs: "hodina-duchu" })
    .setDescription("Zjisti kolik zbývá do další hodiny duchů")
    .setDescriptionLocalizations({ cs: "Zjisti kolik zbývá do další hodiny duchů" });


export const execute = async ({ interaction, dbUser }: CommandContext): Promise<void> => {
    const dateNow = new Date();
    const date2AM = new Date();
    date2AM.setDate(dateNow.getDate() + 1); // Set to tomorrow
    date2AM.setHours(2, 0, 0, 0); // Set to 2:00 AM

    let hoursRemaining = Math.floor((date2AM.getTime() - dateNow.getTime()) / (1000 * 60 * 60));
    let minutesRemaining = Math.floor(((date2AM.getTime() - dateNow.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
    if(hoursRemaining > 24) {
       hoursRemaining -= 24;
    }

    if(hoursRemaining === 24) {
        interaction.reply({
            content: `Teď je hodina duchů! 👻`,
        })
        return;
    }

    interaction.reply({
        embeds: [
            {
                // image: {
                //   url: "",
                // },
                description: formatMessage(hoursRemaining, minutesRemaining),
                color: 0xff0000,
                footer: { text: "Hodina duchů je každý den ve 2 ráno." },
            }
        ]
    })
    return;
}


function formatMessage(hours: number, minutes: number): string {
    let result = "Do další hodiny duchů zbývá ";
    if (hours > 0) {
        result += `${hours} ${hours === 1 ? "hodina" : hours <= 4 ? "hodiny" : "hodin"}`;
    }
    if (hours > 0 && minutes > 0) {
        result += " a ";
    }
    if (minutes > 0) {
        result += `${minutes} ${minutes === 1 ? "minuta" : minutes <= 4 ? "minuty" : "minut"}`;
    }
    result += ". 👻";
    return result;
}