import { ChatInputCommandBuilder, ContainerBuilder, type InteractionReplyOptions, MessageFlags } from "discord.js";
import type { CommandContext } from "../util/commands.js";

export const data = new ChatInputCommandBuilder()
	.setName("v2changelog")
	.setDescription("Zobrazit changelog Allcom Bot v2");

export const execute = async ({ interaction }: CommandContext): Promise<void> => {
	if (!interaction.guild) return;

	const messages = [
		{
			components: [
				new ContainerBuilder().addTextDisplayComponents((b) =>
					b.setContent(`# Allcom Bot v2
Ahoj! Už je to zhruba **5 měsíců**, co pracuji na nové verzi bota. Během té doby jsem ho několikrát kompletně předělal, protože jsem nebyl spokojený s výsledky. Cílem je vytvořit něco **originálního** a **komplexního**. Většina z vás tu vidí jen jednoho dalšího uživatele „Allcom“, který zdánlivě nic nedělá a občas ho někdo použije k příkazům \`/daily\` nebo \`/work\`. Ve skutečnosti je to **mnohem víc**. Proto vznikl tenhle **changelog**, kde popíšu změny a co plánuju dál.
## Co je Allcom Bot v2?
Od nuly přepsaný starý bot, aby běžel na našem **novém backendu**. To nám otevírá cestu ke **škálování** a dalším funkcím. Bot vznikl pro **tento server**. Od této verze ho lze technicky přidat i na jiné servery, ale to **neplánujeme**.
## Novinky
### Média
Často se stávalo, že si nových médií téměř nikdo nevšiml. Odteď se po přidání příspěvku automaticky odešle oznámení do <#1325522814895263781>. Zpráva je **nepřehlédnutelná** a lze se přes ni **prokliknout přímo na příspěvek**.
### Kvíz / Verifikace
Zavádíme **kvízový systém**, kterým musí projít každý:
* Cílem je mít tu lidi, co opravdu chtějí podporovat myšlenku tohoto serveru a **znají pravidla**.
* Kvíz se ptá na otázky z pravidel. Pokud dosáhnete alespoň **80 %**, získáte roli **„Verifikován“**. Bez ní toho tady moc neuděláte.
* Kvíz můžete opakovat až **3×**, pak je nutná delší pauza.
* Pro rychlé „nakouknutí“ do serveru bude v pravidlech **tlačítko kvíz** a **rychlý přístup**, který dá roli **„Částečně verifikován“**. S touto rolí je přístup **pouze** do místností v kategorii <#1325544906336501760>.
* Pokud se vám tu zalíbí, můžete kdykoliv dokončit plný kvíz a stát se **plně verifikovaným**.
* Uživatelé bez role **„Verifikován“** uvidí všechny místnosti, ale **nebudou moci** psát, reagovat ani se jakkoliv zapojit do diskuse.
### Warning System
Přidáváme **Allcom Warning System** (inspirovaný pravidly Discordu):
* Admin nebo moderátor může udělit **varování** za porušení pravidel (spam, urážky, atd.).
* Uživatel sbírá **body**; po překročení **100 bodů** je **automaticky zabanován**.
* Proti varování se lze odvolat přes příkaz \`/review\`.
* Všechna varování **expirují po 3 měsících**.
* Počet bodů se odvíjí od **závažnosti přestupku**.
* Systém umí dočasně **blokovat nahrávání obrázků**, **používání reakcí**, **omezovat zprávy** a další – vždy podle závažnosti.
## Změny
* Předělali jsme vizuál a přidali **instrukce** k příkazům \`/daily\`, \`/work\`, \`/top\`, \`/points\` i ke **streamovacím oznámením**.
* \`/work\` a \`/daily\` jsou nově **pouze** v místnosti <#1380925345515180142>; zároveň je tam **zablokováno** psaní běžných zpráv.
* Zrychlili jsme přesun z <#1325544907254927392> do nově vytvořené místnosti o cca **0,5 s**.
* Odstranili jsme **verifikaci bota na backendu**, takže už **nebude** každý měsíc padat kvůli neověřenému tokenu (dříve to znamenalo několik hodin bez \`/work\`, \`/daily\`, atd.).
* Místnosti v kategorii <#1335575510771695719> (antibot; **neviditelná pro verifikované**), nově přidávají roli **„Bot“**. Jakmile ji někdo získá, **neuvidí žádnou místnost** na serveru a **nebude moci** nikoho kontaktovat.
* Lidi co mají zde aktivní aspoň 1 server booster, tak dostávají násobitel 1.3x ke každé xp a coins odměně. 
## Serverové změny
* **Zakázali** jsme psaní do <#1325522814895263777>. Místnost slouží k **reakcím na nově příchozí**. Chceme, aby svítila jen, když **opravdu** někdo přijde – ne kvůli offtopic debatám.
* S okamžitou platností platí **nová pravidla** inspirovaná **Discord Community**. Pravidla si **musíte** přečíst, jinak **neprojdete kvízem**.`),
				),
			],
			flags: MessageFlags.IsComponentsV2,
		},
		{
			components: [
				new ContainerBuilder().addTextDisplayComponents((b) =>
					b.setContent(`### Změny platné od **středy 3. 9. 2025**
* Server přejde na **nejvyšší verifikační level** – na Discordu musíte mít **ověřené telefonní číslo** (ochrana proti botům a raidům).
* Spojí se místnosti **„Kuchař“** a **„Pekař“** do jedné.
* Přejmenujeme **„Milovník Hudby“** na **„Hudba“** a **„Sportovec“** na **„Sport“**.
* Zruší se místnosti **„Influencer“** a **„návrhy-staré“**.
* Všem se zruší role "Verifikován" a místo toho dostane "Částečně verifikován" (dokud neudělají kvíz)
## Co plánujeme dál?
### **Bodovací systém (body aktivity)**
Pracujeme na **bodovacím systému**, který bude oceňovat aktivitu. Je **oddělený** od \`/work\` a \`/daily\` – půjde o **body aktivity**. Oboje má smysl a kdo chce ze serveru vytěžit maximum, měl by **sbírat oboje**.
### **Allcom Shop**
Plánujeme zprovoznit **Allcom Shop**, kde za body aktivity půjde získat **fyzické odměny** a další **výhody** (detaily si necháme na později).
### **Web a dokumentace**
Děláme na webu **https://alpha.allcom.zone/** (alpha verze; není veřejná, může být nedostupná a některé odkazy nemusí fungovat). Přidáváme **Discord dokumentaci** v češtině, aby bylo kam odkazovat. Každý článek má i **rychlé shrnutí** pro ty, kdo potřebují odpověď hned. Cíl: když budou pravidla **srozumitelně přeložená**, lidi je **neporuší** jen proto, že jim nerozuměli.
### **Další vývoj**
Bot je už **kompletně přepsaný**, takže je **snadné** přidávat novinky. Postupně projdeme **návrhy**, vymyslíme, jak lidi **motivovat k reakci na návrhy** (třeba přes body aktivity), a budeme dál přidávat **nové funkce**.
## Co teď?
1. **Přečtěte si pravidla** – jsou teď jiná
2. Odeberte svoje role v <id:customize> a znova si je nasaďte.
3. Nezapomeňte se zapojit do /daily a /work rituálu v <#1380925345515180142>.
4. Chceš víc XP nebo Coins? Dej sem aspoň jeden booster! Je to momentálně jediný benefit boostingu.`),
				),
			],
			flags: MessageFlags.IsComponentsV2,
		},
	] satisfies Array<InteractionReplyOptions>;

	for (let i = 0; i < messages.length; i++) {
		const message = messages[i] as Required<(typeof messages)[number]>;
		if (i === 0) await interaction.reply(message);
		else await interaction.followUp(message);
	}
};
