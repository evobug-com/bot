/* eslint-disable no-await-in-loop -- Paginated API fetching requires sequential requests */
import { ChatInputCommandBuilder } from "@discordjs/builders";
import { orpc } from "../client/client.ts";
import { createErrorEmbed } from "../util";
import {
	createInvestmentEmbed,
	formatPercentageChange,
	formatPrice,
	formatProfitLoss,
	formatQuantity,
	formatTimestamp,
	formatAssetType,
	getProfitLossEmoji,
} from "../util/bot/investment-helpers.ts";
import type { CommandContext } from "../util/commands.ts";
import { isAdmin } from "../utils/admin.ts";


export const data = new ChatInputCommandBuilder()
	.setName("invest")
	.setNameLocalizations({ cs: "investovat" })
	.setDescription("Manage your stock/crypto investments")
	.setDescriptionLocalizations({ cs: "Spravujte své investice do akcií/krypta" })
	// Buy subcommand
	.addSubcommands((subcommand) =>
		subcommand
			.setName("buy")
			.setNameLocalizations({ cs: "koupit" })
			.setDescription("Buy stocks or cryptocurrency")
			.setDescriptionLocalizations({ cs: "Nakoupit akcie nebo kryptoměny" })
			.addStringOptions((option) =>
				option
					.setName("symbol")
					.setNameLocalizations({ cs: "symbol" })
					.setDescription("Stock/crypto symbol (e.g., AAPL, BTC)")
					.setDescriptionLocalizations({ cs: "Symbol akcie/kryptoměny (např. AAPL, BTC)" })
					.setRequired(true),
			)
			.addIntegerOptions((option) =>
				option
					.setName("coins")
					.setNameLocalizations({ cs: "mince" })
					.setDescription("How many COINS to invest (min 100 coins, NOT amount of shares!)")
					.setDescriptionLocalizations({ cs: "Kolik MINCÍ investovat (min 100 mincí, NE počet akcií!)" })
					.setRequired(true)
					.setMinValue(100),
			),
	)
	// Sell subcommand
	.addSubcommands((subcommand) =>
		subcommand
			.setName("sell")
			.setNameLocalizations({ cs: "prodat" })
			.setDescription("Sell your stocks or cryptocurrency")
			.setDescriptionLocalizations({ cs: "Prodat akcie nebo kryptoměny" })
			.addStringOptions((option) =>
				option
					.setName("symbol")
					.setNameLocalizations({ cs: "symbol" })
					.setDescription("Symbol of asset to sell")
					.setDescriptionLocalizations({ cs: "Symbol aktiva k prodeji" })
					.setRequired(true),
			)
			.addStringOptions((option) =>
				option
					.setName("type")
					.setNameLocalizations({ cs: "typ" })
					.setDescription("How much to sell")
					.setDescriptionLocalizations({ cs: "Kolik prodat" })
					.setRequired(true)
					.addChoices(
						{ name: "All", value: "all" },
						{ name: "Specific quantity", value: "quantity" },
						{ name: "Percentage", value: "percentage" },
					),
			)
			.addNumberOptions((option) =>
				option
					.setName("quantity")
					.setNameLocalizations({ cs: "množství" })
					.setDescription("Quantity to sell (if type is 'quantity')")
					.setDescriptionLocalizations({ cs: "Množství k prodeji (pokud typ je 'quantity')" })
					.setMinValue(0.001),
			)
			.addIntegerOptions((option) =>
				option
					.setName("percentage")
					.setNameLocalizations({ cs: "procenta" })
					.setDescription("Percentage to sell (if type is 'percentage', 1-100)")
					.setDescriptionLocalizations({ cs: "Procenta k prodeji (pokud typ je 'percentage', 1-100)" })
					.setMinValue(1)
					.setMaxValue(100),
			),
	)
	// Portfolio subcommand
	.addSubcommands((subcommand) =>
		subcommand
			.setName("portfolio")
			.setDescription("View your investment portfolio")
			.setDescriptionLocalizations({ cs: "Zobrazit vaše investiční portfolio" })
			.addUserOptions((option) =>
				option
					.setName("user")
					.setNameLocalizations({ cs: "uživatel" })
					.setDescription("View another user's portfolio")
					.setDescriptionLocalizations({ cs: "Zobrazit portfolio jiného uživatele" }),
			),
	)
	// Assets subcommand
	.addSubcommands((subcommand) =>
		subcommand
			.setName("assets")
			.setNameLocalizations({ cs: "aktiva" })
			.setDescription("List available assets to invest in")
			.setDescriptionLocalizations({ cs: "Seznam dostupných aktiv k investici" })
			.addStringOptions((option) =>
				option
					.setName("type")
					.setNameLocalizations({ cs: "typ" })
					.setDescription("Filter by asset type")
					.setDescriptionLocalizations({ cs: "Filtrovat podle typu aktiva" })
					.addChoices(
						{ name: "All", value: "all" },
						{ name: "US Stocks", value: "stock_us" },
						{ name: "International Stocks", value: "stock_intl" },
						{ name: "Cryptocurrency", value: "crypto" },
					),
			)
			.addStringOptions((option) =>
				option
					.setName("search")
					.setNameLocalizations({ cs: "hledat" })
					.setDescription("Search by symbol or name")
					.setDescriptionLocalizations({ cs: "Hledat podle symbolu nebo jména" }),
			)
			.addBooleanOptions((option) =>
				option
					.setName("compact")
					.setNameLocalizations({ cs: "kompaktní" })
					.setDescription("Show only symbols in compact format")
					.setDescriptionLocalizations({ cs: "Zobrazit pouze symboly v kompaktním formátu" }),
			)
			.addIntegerOptions((option) =>
				option
					.setName("page")
					.setNameLocalizations({ cs: "stránka" })
					.setDescription("Page number (15 assets per page)")
					.setDescriptionLocalizations({ cs: "Číslo stránky (15 aktiv na stránku)" })
					.setMinValue(1),
			),
	)
	// Info subcommand
	.addSubcommands((subcommand) =>
		subcommand
			.setName("info")
			.setDescription("Get detailed information about an asset")
			.setDescriptionLocalizations({ cs: "Získat detailní informace o aktivu" })
			.addStringOptions((option) =>
				option
					.setName("symbol")
					.setNameLocalizations({ cs: "symbol" })
					.setDescription("Asset symbol to look up")
					.setDescriptionLocalizations({ cs: "Symbol aktiva k vyhledání" })
					.setRequired(true),
			),
	)
	// History subcommand
	.addSubcommands((subcommand) =>
		subcommand
			.setName("history")
			.setNameLocalizations({ cs: "historie" })
			.setDescription("View your transaction history")
			.setDescriptionLocalizations({ cs: "Zobrazit historii transakcí" })
			.addStringOptions((option) =>
				option
					.setName("type")
					.setNameLocalizations({ cs: "typ" })
					.setDescription("Filter by transaction type")
					.setDescriptionLocalizations({ cs: "Filtrovat podle typu transakce" })
					.addChoices(
						{ name: "All", value: "all" },
						{ name: "Buys only", value: "buy" },
						{ name: "Sells only", value: "sell" },
					),
			)
			.addIntegerOptions((option) =>
				option
					.setName("limit")
					.setNameLocalizations({ cs: "limit" })
					.setDescription("Number of transactions to show (default: 10)")
					.setDescriptionLocalizations({ cs: "Počet transakcí k zobrazení (výchozí: 10)" })
					.setMinValue(1)
					.setMaxValue(25),
			),
	)
	// Leaderboard subcommand
	.addSubcommands((subcommand) =>
		subcommand
			.setName("leaderboard")
			.setNameLocalizations({ cs: "žebříček" })
			.setDescription("View investment leaderboard")
			.setDescriptionLocalizations({ cs: "Zobrazit investiční žebříček" })
			.addStringOptions((option) =>
				option
					.setName("metric")
					.setNameLocalizations({ cs: "metrika" })
					.setDescription("Sort by metric")
					.setDescriptionLocalizations({ cs: "Seřadit podle metriky" })
					.addChoices(
						{ name: "Celkový zisk", value: "totalProfit" },
						{ name: "Úspěšnost (%)", value: "profitPercent" },
						{ name: "Hodnota portfolia", value: "totalValue" },
					),
			)
			.addIntegerOptions((option) =>
				option
					.setName("limit")
					.setNameLocalizations({ cs: "počet" })
					.setDescription("Number of users to show (default: 10)")
					.setDescriptionLocalizations({ cs: "Počet uživatelů (výchozí: 10)" })
					.setMinValue(5)
					.setMaxValue(25),
			),
	)
	// Help subcommand
	.addSubcommands((subcommand) =>
		subcommand
			.setName("help")
			.setNameLocalizations({ cs: "nápověda" })
			.setDescription("Learn about investments and available commands")
			.setDescriptionLocalizations({ cs: "Zjisti více o investicích a dostupných příkazech" }),
	)
	// Sync subcommand (admin only)
	.addSubcommands((subcommand) =>
		subcommand
			.setName("sync")
			.setNameLocalizations({ cs: "synchronizovat" })
			.setDescription("[ADMIN] Force sync asset prices from Twelve Data API")
			.setDescriptionLocalizations({ cs: "[ADMIN] Vynutit synchronizaci cen aktiv z Twelve Data API" }),
	);

export const execute = async ({ interaction, dbUser }: CommandContext): Promise<void> => {
	const subcommand = interaction.options.getSubcommand() as
		| "buy"
		| "sell"
		| "portfolio"
		| "assets"
		| "info"
		| "history"
		| "leaderboard"
		| "help"
		| "sync";

	switch (subcommand) {
		case "buy":
			return await handleBuy(interaction, dbUser);
		case "sell":
			return await handleSell(interaction, dbUser);
		case "portfolio":
			return await handlePortfolio(interaction, dbUser);
		case "assets":
			return await handleAssets(interaction, dbUser);
		case "info":
			return await handleInfo(interaction, dbUser);
		case "history":
			return await handleHistory(interaction, dbUser);
		case "leaderboard":
			return await handleLeaderboard(interaction, dbUser);
		case "help":
			return await handleHelp(interaction);
		case "sync":
			return await handleSync(interaction, dbUser);
	}
};

/**
 * Handle /invest buy subcommand
 */
async function handleBuy(
	interaction: CommandContext["interaction"],
	dbUser: CommandContext["dbUser"],
): Promise<void> {
	await interaction.deferReply();

	const symbol = interaction.options.getString("symbol", true).toUpperCase();
	const amount = interaction.options.getInteger("coins", true);

	// Call API to buy
	const [error, result] = await orpc.users.investments.buy({
		userId: dbUser.id,
		symbol,
		amountInCoins: amount,
	});

	if (error) {
		console.error("Error buying asset:", error);

		let errorMessage = "Nepodařilo se nakoupit aktivum. Zkuste to prosím později.";

		if ("code" in error) {
			switch (error.code) {
				case "INSUFFICIENT_FUNDS":
					errorMessage = `Nemáš dostatek mincí! Potřebuješ ${error.data?.required?.toLocaleString()} mincí, ale máš jen ${error.data?.available?.toLocaleString()} mincí.`;
					break;
				case "ASSET_NOT_FOUND":
					errorMessage = `Symbol "${symbol}" nebyl nalezen. Použij \`/invest assets\` pro zobrazení dostupných aktiv.`;
					break;
				case "ASSET_INACTIVE":
					errorMessage = `Aktivum "${symbol}" není momentálně dostupné pro obchodování.`;
					break;
				case "PRICE_NOT_AVAILABLE":
					errorMessage = "Cenová data nejsou momentálně dostupná. Ceny se aktualizují každé 4 hodiny (00:00, 04:00, 08:00, 12:00, 16:00, 20:00). Zkus to po další synchronizaci.";
					break;
				case "ECONOMY_BANNED":
					errorMessage = "Tvůj přístup k ekonomice byl pozastaven kvůli podezřelé aktivitě.";
					break;
				case "BELOW_MINIMUM":
					errorMessage = `Minimální investice je ${error.data?.minimum?.toLocaleString()} mincí.`;
					break;
			}
		}

		const errorEmbed = createErrorEmbed("Chyba při nákupu", errorMessage);
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	// Get updated balance
	const [statsError, stats] = await orpc.users.stats.user({ id: dbUser.id });
	const newBalance = statsError ? 0 : stats.stats.coinsCount;

	// Create success embed
	const transaction = result.transaction;
	const quantity = formatQuantity(transaction.quantity);
	const pricePerUnit = formatPrice(transaction.pricePerUnit);
	const total = transaction.totalAmount.toLocaleString();
	const fee = transaction.feeAmount.toLocaleString();

	const embed = createInvestmentEmbed("Nákup úspěšný")
		.setDescription(`Koupil jsi **${quantity}** ${symbol}`)
		.addFields(
			{ name: "Symbol", value: symbol, inline: true },
			{ name: "Množství", value: quantity, inline: true },
			{ name: "Cena za jednotku", value: pricePerUnit, inline: true },
			{ name: "Subtotal", value: `${transaction.subtotal.toLocaleString()} mincí`, inline: true },
			{ name: "Poplatek (1.5%)", value: `${fee} mincí`, inline: true },
			{ name: "Celkem", value: `${total} mincí`, inline: true },
		)
		.setFooter(createInvestmentHelpFooter(`💰 Balance: ${newBalance.toLocaleString()} coins`))
		.setTimestamp();

	await interaction.editReply({ embeds: [embed] });
}

/**
 * Handle /invest sell subcommand
 */
async function handleSell(
	interaction: CommandContext["interaction"],
	dbUser: CommandContext["dbUser"],
): Promise<void> {
	await interaction.deferReply();

	const symbol = interaction.options.getString("symbol", true).toUpperCase();
	const sellType = interaction.options.getString("type", true) as "all" | "quantity" | "percentage";
	const quantity = interaction.options.getNumber("quantity");
	const percentage = interaction.options.getInteger("percentage");

	// Validate inputs based on type
	if (sellType === "quantity" && !quantity) {
		const errorEmbed = createErrorEmbed("Chybný vstup", "Musíš zadat množství pro typ 'quantity'.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	if (sellType === "percentage" && !percentage) {
		const errorEmbed = createErrorEmbed("Chybný vstup", "Musíš zadat procenta pro typ 'percentage'.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	// Build API request based on sell type
	const sellRequest: {
		userId: number;
		symbol: string;
		sellType: "all" | "quantity" | "percentage";
		quantity?: number;
		percentage?: number;
	} = {
		userId: dbUser.id,
		symbol,
		sellType,
	};

	// Add the appropriate parameter based on sell type
	if (sellType === "quantity" && quantity !== null && quantity !== undefined) {
		sellRequest.quantity = Math.floor(quantity * 1000); // Convert to internal format (1.5 shares → 1500)
	} else if (sellType === "percentage" && percentage !== null && percentage !== undefined) {
		sellRequest.percentage = percentage;
	}
	// For "all", no additional parameters needed

	// Call API to sell
	const [error, result] = await orpc.users.investments.sell(sellRequest);

	if (error) {
		console.error("Error selling asset:", error);

		let errorMessage = "Nepodařilo se prodat aktivum. Zkuste to prosím později.";

		if ("code" in error) {
			switch (error.code) {
				case "INSUFFICIENT_HOLDINGS":
					errorMessage = `Nemáš dostatek akcií! Máš pouze ${error.data?.available?.toLocaleString()}, ale snažíš se prodat ${error.data?.requested?.toLocaleString()}.`;
					break;
				case "ASSET_NOT_FOUND":
					errorMessage = `Symbol "${symbol}" nebyl nalezen.`;
					break;
				case "NO_HOLDINGS":
					errorMessage = `Nevlastníš žádné "${symbol}".`;
					break;
				case "PRICE_NOT_AVAILABLE":
					errorMessage = "Cenová data nejsou momentálně dostupná. Ceny se aktualizují každé 4 hodiny (00:00, 04:00, 08:00, 12:00, 16:00, 20:00). Zkus to po další synchronizaci.";
					break;
				case "INVALID_INPUT":
					errorMessage = "Neplatné vstupní parametry.";
					break;
			}
		}

		const errorEmbed = createErrorEmbed("Chyba při prodeji", errorMessage);
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	// Get updated balance
	const [statsError, stats] = await orpc.users.stats.user({ id: dbUser.id });
	const newBalance = statsError ? 0 : stats.stats.coinsCount;

	// Create success embed
	const transaction = result.transaction;
	const soldQuantity = formatQuantity(transaction.quantity);
	const pricePerUnit = formatPrice(transaction.pricePerUnit);
	const received = transaction.totalAmount.toLocaleString();
	const fee = transaction.feeAmount.toLocaleString();

	// Calculate profit/loss percentage
	const profitLossPercent = transaction.costBasis
		? ((result.profitLoss || 0) / transaction.costBasis) * 100
		: 0;
	const profitLossFormatted = formatProfitLoss(result.profitLoss || 0, profitLossPercent);

	const embed = createInvestmentEmbed("Prodej úspěšný")
		.setDescription(`Prodal jsi **${soldQuantity}** ${symbol}`)
		.addFields(
			{ name: "Symbol", value: symbol, inline: true },
			{ name: "Množství", value: soldQuantity, inline: true },
			{ name: "Cena za jednotku", value: pricePerUnit, inline: true },
			{ name: "Subtotal", value: `${transaction.subtotal.toLocaleString()} mincí`, inline: true },
			{ name: "Poplatek (1.5%)", value: `${fee} mincí`, inline: true },
			{ name: "Přijato", value: `${received} mincí`, inline: true },
			{ name: "Zisk/Ztráta", value: profitLossFormatted, inline: false },
		)
		.setFooter(createInvestmentHelpFooter(`💰 Balance: ${newBalance.toLocaleString()} coins`))
		.setTimestamp();

	await interaction.editReply({ embeds: [embed] });
}

/**
 * Handle /invest portfolio subcommand
 */
async function handlePortfolio(
	interaction: CommandContext["interaction"],
	_dbUser: CommandContext["dbUser"],
): Promise<void> {
	await interaction.deferReply();

	const targetUser = interaction.options.getUser("user") || interaction.user;

	// Get target user's stats to get their user ID
	const [userStatsError, userStats] = await orpc.users.stats.user({
		discordId: targetUser.id
	});

	if (userStatsError || !userStats) {
		const errorEmbed = createErrorEmbed(
			"Uživatel nenalezen",
			"Tento uživatel ještě nemá žádné statistiky.",
		);
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	// Get portfolio
	const [error, portfolio] = await orpc.users.investments.portfolio({
		userId: userStats.stats.userId
	});

	if (error) {
		console.error("Error fetching portfolio:", error);
		const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se načíst portfolio.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	if (portfolio.holdings.length === 0) {
		const embed = createInvestmentEmbed()
			.setDescription(
				targetUser.id === interaction.user.id
					? "**Portfolio prázdné**\n\nJeště nemáš žádné investice. Použij `/invest buy` k nákupu aktiv!"
					: `**Portfolio prázdné**\n\n${targetUser.username} ještě nemá žádné investice.`,
			)
			.setFooter(createInvestmentHelpFooter());
		await interaction.editReply({ embeds: [embed] });
		return;
	}

	// Build holdings list (limit to first 10 for now)
	const holdingsText = portfolio.holdings
		.slice(0, 10)
		.map((holding) => {
			const qty = formatQuantity(holding.portfolio.quantity);
			const value = holding.currentValue.toLocaleString();
			const plEmoji = getProfitLossEmoji(holding.unrealizedGain);
			const plPercent = holding.unrealizedGainPercent.toFixed(2);
			const plSign = holding.unrealizedGain >= 0 ? "+" : "";

			return `**${holding.asset.symbol}** | ${qty} | ${value} mincí | ${plEmoji} ${plSign}${plPercent}%`;
		})
		.join("\n");

	// Build summary
	const summary = portfolio.summary;
	const totalGainFormatted = formatProfitLoss(summary.totalGain, summary.totalGainPercent);

	const embed = createInvestmentEmbed(`Portfolio - ${targetUser.username}`)
		.addFields(
			{ name: "📊 Držené pozice", value: holdingsText || "Žádné", inline: false },
			{ name: "💰 Celková investice", value: `${summary.totalInvested.toLocaleString()} mincí`, inline: true },
			{ name: "📈 Aktuální hodnota", value: `${summary.currentValue.toLocaleString()} mincí`, inline: true },
			{ name: "💸 Celkový zisk/ztráta", value: totalGainFormatted, inline: false },
			{
				name: "💎 Realizovaný zisk",
				value: `${summary.realizedGains.toLocaleString()} mincí`,
				inline: true,
			},
			{
				name: "📊 Nerealizovaný zisk",
				value: `${summary.unrealizedGains.toLocaleString()} mincí`,
				inline: true,
			},
		)
		.setTimestamp();

	if (portfolio.holdings.length > 10) {
		embed.setFooter(createInvestmentHelpFooter(`Zobrazeno 10 z ${portfolio.holdings.length} pozic`));
	} else {
		embed.setFooter(createInvestmentHelpFooter());
	}

	await interaction.editReply({ embeds: [embed] });
}

/**
 * Handle /invest assets subcommand
 */
async function handleAssets(
	interaction: CommandContext["interaction"],
	_dbUser: CommandContext["dbUser"],
): Promise<void> {
	await interaction.deferReply();

	const assetType = (interaction.options.getString("type") || "all") as "stock_us" | "stock_intl" | "crypto" | "all";
	const search = interaction.options.getString("search");
	const compact = interaction.options.getBoolean("compact") ?? false;
	const page = interaction.options.getInteger("page") ?? 1;
	const ASSETS_PER_PAGE = 15;

	// Fetch assets - if compact mode or page specified, fetch all assets using pagination
	type AssetWithPrice = {
		asset: {
			id: number;
			symbol: string;
			name: string;
			assetType: string;
			exchange: string | null;
			currency: string;
			apiSource: string;
			apiSymbol: string;
			isActive: boolean;
			minInvestment: number;
			description: string | null;
			logoUrl: string | null;
			createdAt: Date;
			updatedAt: Date;
		};
		currentPrice: number | null;
		change24h: number | null;
		changePercent24h: number | null;
		priceTimestamp: Date | null;
	};
	let allAssets: AssetWithPrice[] = [];

	// Fetch ALL assets using pagination (needed for compact mode, page navigation, and search)
	let offset = 0;
	const limit = 100; // Max limit per API request
	let hasMore = true;

	while (hasMore) {
		const [error, result] = await orpc.users.investments.assets({
			assetType,
			limit,
			offset,
		});

		if (error) {
			console.error("Error fetching assets:", error);
			const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se načíst aktiva.");
			await interaction.editReply({ embeds: [errorEmbed] });
			return;
		}

		allAssets.push(...result.assets);

		// Check if there are more assets to fetch
		hasMore = result.assets.length === limit;
		offset += limit;
	}

	// Filter by search if provided (search in symbol, name, and description)
	if (search) {
		const searchLower = search.toLowerCase();
		allAssets = allAssets.filter(
			(a: AssetWithPrice) =>
				a.asset.symbol.toLowerCase().includes(searchLower) ||
				a.asset.name.toLowerCase().includes(searchLower) ||
				(a.asset.description && a.asset.description.toLowerCase().includes(searchLower)),
		);
	}

	if (allAssets.length === 0) {
		const embed = createInvestmentEmbed()
			.setDescription(
				search
					? `**Žádná aktiva**\n\nNebyla nalezena žádná aktiva odpovídající "${search}".`
					: "**Žádná aktiva**\n\nNebyla nalezena žádná dostupná aktiva.",
			)
			.setFooter(createInvestmentHelpFooter());
		await interaction.editReply({ embeds: [embed] });
		return;
	}

	const typeLabel = {
		all: "Všechna aktiva",
		stock_us: "Americké akcie",
		stock_intl: "Mezinárodní akcie",
		crypto: "Kryptoměny",
	}[assetType];

	// Compact mode: show only symbols
	if (compact) {
		// Extract symbols and chunk them for Discord's character limit
		const symbols = allAssets.map((item: AssetWithPrice) => item.asset.symbol);
		const chunks = chunkSymbols(symbols, 1900);

		// Send first chunk as embed
		const embed = createInvestmentEmbed(typeLabel)
			.setDescription(chunks[0] || "")
			.setFooter(createInvestmentHelpFooter(
				chunks.length > 1
					? `Celkem: ${allAssets.length} symbolů (${chunks.length}/${chunks.length})`
					: `Celkem: ${allAssets.length} symbolů`
			))
			.setTimestamp();

		await interaction.editReply({ embeds: [embed] });

		// Send additional chunks as follow-up messages if needed
		for (let i = 1; i < chunks.length; i++) {
			const followUpEmbed = createInvestmentEmbed(`${typeLabel} (pokračování)`)
				.setDescription(chunks[i] || "")
				.setFooter(createInvestmentHelpFooter(`${i + 1}/${chunks.length}`));

			await interaction.followUp({ embeds: [followUpEmbed] });
		}
	} else {
		// Regular detailed view with pagination
		const { pageItems, currentPage, totalPages, totalItems } = paginateItems(allAssets, page, ASSETS_PER_PAGE);

		if (pageItems.length === 0) {
			const embed = createInvestmentEmbed(typeLabel)
				.setDescription(`**Stránka ${page} neexistuje**\n\nCelkem je k dispozici ${totalPages} ${totalPages === 1 ? "stránka" : totalPages < 5 ? "stránky" : "stránek"}.`)
				.setFooter(createInvestmentHelpFooter())
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
			return;
		}

		const assetList = pageItems
			.map((item: AssetWithPrice) => {
				const price = item.currentPrice ? formatPrice(item.currentPrice) : "N/A";
				const change = item.changePercent24h !== null ? formatPercentageChange(item.changePercent24h) : "";
				const type = formatAssetType(item.asset.assetType);

				return `**${item.asset.symbol}** - ${item.asset.name}\n${type} | ${price} ${change}`;
			})
			.join("\n\n");

		const pageInfo = totalPages > 1
			? `Stránka ${currentPage}/${totalPages} (celkem ${totalItems} aktiv)`
			: `Zobrazeno ${totalItems} aktiv`;

		const embed = createInvestmentEmbed(typeLabel)
			.setDescription(assetList)
			.setFooter(createInvestmentHelpFooter(pageInfo))
			.setTimestamp();

		await interaction.editReply({ embeds: [embed] });
	}
}

/**
 * Handle /invest info subcommand
 */
async function handleInfo(
	interaction: CommandContext["interaction"],
	_dbUser: CommandContext["dbUser"],
): Promise<void> {
	await interaction.deferReply();

	const symbol = interaction.options.getString("symbol", true).toUpperCase();

	// Get all assets and find the one with matching symbol
	const [error, result] = await orpc.users.investments.assets({
		assetType: "all",
		limit: 100, // Max allowed by API
		offset: 0,
	});

	if (error) {
		console.error("Error fetching assets:", error);
		const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se načíst informace o aktivu.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	const assetData = result.assets.find((a) => a.asset.symbol === symbol);

	if (!assetData) {
		const errorEmbed = createErrorEmbed(
			"Aktivum nenalezeno",
			`Symbol "${symbol}" nebyl nalezen. Použij \`/invest assets\` pro zobrazení dostupných aktiv.`,
		);
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	const asset = assetData.asset;
	const price = assetData.currentPrice ? formatPrice(assetData.currentPrice) : "N/A";
	const change24h = assetData.changePercent24h !== null ? formatPercentageChange(assetData.changePercent24h) : "N/A";
	const type = formatAssetType(asset.assetType);
	const lastUpdate = assetData.priceTimestamp ? formatTimestamp(assetData.priceTimestamp) : "Neznámý";

	const embed = createInvestmentEmbed(asset.name)
		.setDescription(asset.description || "Žádný popis není k dispozici.")
		.addFields(
			{ name: "Symbol", value: asset.symbol, inline: true },
			{ name: "Typ", value: type, inline: true },
			{ name: "Minimální investice", value: `${asset.minInvestment} mincí`, inline: true },
			{ name: "📊 Aktuální cena", value: price, inline: true },
			{ name: "📈 24h změna", value: change24h, inline: true },
			{ name: "🕐 Poslední aktualizace", value: lastUpdate, inline: true },
		)
		.setFooter(createInvestmentHelpFooter("Ceny se aktualizují každé 4 hodiny (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)"))
		.setTimestamp();

	await interaction.editReply({ embeds: [embed] });
}

/**
 * Handle /invest history subcommand
 */
async function handleHistory(
	interaction: CommandContext["interaction"],
	dbUser: CommandContext["dbUser"],
): Promise<void> {
	await interaction.deferReply();

	const transactionType = (interaction.options.getString("type") || "all") as "all" | "buy" | "sell";
	const limit = interaction.options.getInteger("limit") || 10;

	// Get transaction history from API
	const [error, result] = await orpc.users.investments.transactions({
		userId: dbUser.id,
		transactionType,
		limit,
		offset: 0,
	});

	if (error) {
		console.error("Error fetching transaction history:", error);
		const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se načíst historii transakcí.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	if (result.transactions.length === 0) {
		const embed = createInvestmentEmbed()
			.setDescription(
				transactionType === "all"
					? "**Historie transakcí**\n\nJeště nemáš žádné transakce. Použij `/invest buy` k nákupu aktiv!"
					: `**Historie transakcí**\n\nNemáš žádné ${transactionType === "buy" ? "nákupy" : "prodeje"}.`,
			)
			.setFooter(createInvestmentHelpFooter());
		await interaction.editReply({ embeds: [embed] });
		return;
	}

	// Build transaction list
	const transactionList = result.transactions
		.map((item, index) => {
			const { transaction, asset } = item;
			const isBuy = transaction.transactionType === "buy";
			const emoji = isBuy ? "🟢" : "🔴";
			const action = isBuy ? "Koupil" : "Prodal";
			const quantity = formatQuantity(transaction.quantity);
			const pricePerUnit = formatPrice(transaction.pricePerUnit);
			const total = transaction.totalAmount.toLocaleString();
			const timestamp = formatTimestamp(transaction.createdAt);

			// Show profit/loss for sells
			let profitInfo = "";
			if (!isBuy && transaction.realizedGain !== null && transaction.realizedGain !== undefined) {
				const profitEmoji = transaction.realizedGain >= 0 ? "💚" : "💔";
				const profitSign = transaction.realizedGain >= 0 ? "+" : "";
				profitInfo = ` ${profitEmoji} ${profitSign}${transaction.realizedGain.toLocaleString()} mincí`;
			}

			return `**${index + 1}.** ${emoji} ${action} ${quantity} **${asset.symbol}**\n` +
				`   └ ${pricePerUnit} × ${quantity} = ${total} mincí${profitInfo}\n` +
				`   └ ${timestamp}`;
		})
		.join("\n\n");

	const typeLabel = {
		all: "Všechny transakce",
		buy: "Nákupy",
		sell: "Prodeje",
	}[transactionType];

	const embed = createInvestmentEmbed(typeLabel)
		.setDescription(transactionList)
		.setFooter(createInvestmentHelpFooter(`Zobrazeno ${result.transactions.length} z ${result.total} transakcí`))
		.setTimestamp();

	await interaction.editReply({ embeds: [embed] });
}

/**
 * Handle /invest leaderboard subcommand
 */
async function handleLeaderboard(
	interaction: CommandContext["interaction"],
	_dbUser: CommandContext["dbUser"],
): Promise<void> {
	await interaction.deferReply();

	const metric = (interaction.options.getString("metric") || "totalProfit") as
		| "totalProfit"
		| "profitPercent"
		| "totalValue";
	const limit = interaction.options.getInteger("limit") || 10;

	// Call the new investment leaderboard API
	const [error, leaderboard] = await orpc.users.investments.leaderboard({
		metric,
		limit,
	});

	if (error) {
		console.error("Error fetching investment leaderboard:", error);
		const errorEmbed = createErrorEmbed(
			"Chyba",
			"Nepodařilo se načíst investiční žebříček. Zkuste to prosím později.",
		);
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	if (leaderboard.length === 0) {
		const embed = createInvestmentEmbed("Investiční žebříček")
			.setDescription("Zatím nikdo neinvestoval! Buď první a použij `/invest buy`.")
			.setFooter(createInvestmentHelpFooter());
		await interaction.editReply({ embeds: [embed] });
		return;
	}

	// Metric labels and formatters
	const metricConfig = {
		totalProfit: {
			label: "Celkový zisk",
			emoji: "💰",
			formatValue: (entry: typeof leaderboard[number]) => {
				const sign = entry.totalProfit >= 0 ? "+" : "";
				const emoji = entry.totalProfit >= 0 ? "🟢" : "🔴";
				return `${emoji} ${sign}${entry.totalProfit.toLocaleString()} mincí`;
			},
		},
		profitPercent: {
			label: "Úspěšnost (%)",
			emoji: "📈",
			formatValue: (entry: typeof leaderboard[number]) => {
				const sign = entry.profitPercent >= 0 ? "+" : "";
				const emoji = entry.profitPercent >= 0 ? "🟢" : "🔴";
				return `${emoji} ${sign}${entry.profitPercent.toFixed(2)}%`;
			},
		},
		totalValue: {
			label: "Hodnota portfolia",
			emoji: "💎",
			formatValue: (entry: typeof leaderboard[number]) => {
				return `💎 ${entry.currentValue.toLocaleString()} mincí`;
			},
		},
	};

	const config = metricConfig[metric];

	// Build leaderboard fields
	const fields = await Promise.all(
		leaderboard.map(async (entry) => {
			const medal = entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`;

			// Get display name from Discord
			let displayName: string;
			if (entry.user.discordId) {
				try {
					const discordUser = await interaction.client.users.fetch(entry.user.discordId);
					displayName = discordUser.username;
					if (entry.user.discordId === interaction.user.id) {
						displayName = `**${displayName}** (Vy)`;
					}
				} catch {
					displayName = entry.user.username || entry.user.guildedId || "Neznámý";
				}
			} else {
				displayName = entry.user.username || entry.user.guildedId || "Neznámý";
			}

			const mainValue = config.formatValue(entry);
			const subInfo = `Investováno: ${entry.totalInvested.toLocaleString()} | Hodnota: ${entry.currentValue.toLocaleString()}`;

			return {
				name: `${medal} ${displayName}`,
				value: `${mainValue}\n${subInfo}`,
				inline: false,
			};
		}),
	);

	const embed = createInvestmentEmbed(`Investiční žebříček - ${config.label}`)
		.addFields(
			{
				name: `${config.emoji} Metrika`,
				value: config.label,
				inline: true,
			},
			{
				name: "🔢 Zobrazeno",
				value: `${leaderboard.length} investorů`,
				inline: true,
			},
			{
				name: "",
				value: "",
				inline: false,
			},
		)
		.addFields(fields)
		.setFooter(createInvestmentHelpFooter())
		.setTimestamp();

	await interaction.editReply({ embeds: [embed] });
}

/**
 * Handle /invest help subcommand
 */
async function handleHelp(
	interaction: CommandContext["interaction"],
): Promise<void> {
	await interaction.deferReply();

	// Embed 1: Quick Start - What beginners need to know first
	const quickStartEmbed = createInvestmentEmbed("Jak začít investovat")
		.setDescription(
			"**1.** Podívej se co můžeš koupit: `/invest assets`\n" +
			"**2.** Vyber si a kup: `/invest buy symbol:AAPL coins:1000`\n" +
			"   *(AAPL = Apple, BTC = Bitcoin, atd.)*\n" +
			"**3.** Sleduj své portfolio: `/invest portfolio`\n" +
			"**4.** Když chceš prodat: `/invest sell symbol:AAPL type:All`\n\n" +

			"**Jak to funguje?**\n" +
			"Kupuješ skutečné akcie a krypto za herní mince. " +
			"Ceny se mění podle reálného trhu. " +
			"Cena vzroste + prodáš = zisk. Cena klesne + prodáš = ztráta.\n\n" +

			"**Důležité:**\n" +
			"• Min. investice: **100 mincí** (kupuješ za mince, ne za kusy akcií!)\n" +
			"• Poplatek: **1.5%** za každý nákup i prodej\n" +
			"• Ceny se aktualizují **každé 4 hodiny**\n" +
			"• 1 mince = 1 CZK, 1 USD = 25 CZK"
		);

	// Embed 2: Commands - Condensed reference
	const commandsEmbed = createInvestmentEmbed("Příkazy")
		.setDescription(
			"`/invest buy` - Nakoupit akcie/krypto\n" +
			"`/invest sell` - Prodat (vše, množství, nebo %)\n" +
			"`/invest portfolio` - Tvoje pozice a zisk/ztráta\n" +
			"`/invest assets` - Seznam dostupných aktiv\n" +
			"`/invest info` - Detail konkrétního aktiva\n" +
			"`/invest history` - Historie transakcí\n" +
			"`/invest leaderboard` - Žebříček investorů"
		);

	// Embed 3: FAQ - Common confusions with real investing terms
	const faqEmbed = createInvestmentEmbed("Časté dotazy")
		.setDescription(
			"**Investoval jsem 100k a mám jen +3k. Proč?**\n" +
			"Zisk = procentuální změna ceny. Akcie +3% = tvých 100k × 0.03 = 3k.\n\n" +

			"**Co znamená % v portfoliu?**\n" +
			"To je tvůj **unrealized gain/loss** (nerealizovaný zisk/ztráta) - rozdíl mezi nákupní a aktuální cenou.\n" +
			"🟢 +5% = akcie zdražila o 5% od nákupu\n" +
			"🔴 -3% = akcie zlevnila o 3% od nákupu\n" +
			"Zisk se **realizuje** až když prodáš.\n\n" +

			"**Kupoval jsem víckrát za různé ceny. Jak se počítá %?**\n" +
			"Z **average cost** (průměrné nákupní ceny). Koupíš za 100, pak za 80, pak za 120 = průměr 100. " +
			"Aktuální cena 110 = +10%. Tomuhle se říká **DCA** (Dollar-Cost Averaging) - rozložení nákupů v čase snižuje riziko.\n\n" +

			"**Co je 24h změna u aktiva?**\n" +
			"Změna ceny na trhu za 24h. **Není to tvůj zisk!** Tvůj zisk se počítá od tvé nákupní ceny.\n\n" +

			"**Můžu shortovat?**\n" +
			"**Short** = sázka na pokles ceny. Ne, nepodporujeme. Máme pouze **long** pozice - kupuješ a doufáš v růst.\n\n" +

			"**Kdy je nejlepší koupit/prodat?**\n" +
			"Nikdo neví. Kdyby šlo předpovědět trh, všichni bychom byli miliardáři. " +
			"Proto existuje DCA - místo časování trhu nakupuješ pravidelně."
		);

	// Embed 4: Investing lessons and tips
	const tipsEmbed = createInvestmentEmbed("Investiční pojmy a tipy")
		.setDescription(
			"**Diverzifikace** - Nedávej všechno do jedné akcie. " +
			"Když jedna padne, ostatní tě zachrání. Rozlož riziko mezi více aktiv.\n\n" +

			"**Volatilita** - Jak moc cena skáče nahoru/dolů. " +
			"Krypto (BTC, ETH) = vysoká volatilita, velké zisky i ztráty. " +
			"**Blue chips** = velké stabilní firmy (AAPL, MSFT) - menší výkyvy, menší riziko.\n\n" +

			"**Bull market** 🐂 = trh roste, všichni jsou optimističtí.\n" +
			"**Bear market** 🐻 = trh padá, pesimismus. Dobří investoři nakupují v bear marketu.\n\n" +

			"**ATH (All-Time High)** - Nejvyšší cena v historii. " +
			"Pozor na FOMO (Fear Of Missing Out) - nekupuj jen proto, že cena láme rekordy.\n\n" +

			"**HODL** - \"Hold On for Dear Life\" - držet i když trh padá. " +
			"Panický prodej při poklesu = realizovaná ztráta. Trpělivost se vyplácí.\n\n" +

			"**ROI (Return on Investment)** - Tvůj celkový výnos v %. " +
			"ROI 50% = z 1000 máš 1500. Sleduj v `/invest portfolio`."
		)
		.setFooter({ text: "Investice nesou riziko ztráty. Investuj zodpovědně!" });

	await interaction.editReply({ embeds: [quickStartEmbed, commandsEmbed, faqEmbed, tipsEmbed] });
}

/**
 * Handle /invest sync subcommand (admin only)
 */
async function handleSync(
	interaction: CommandContext["interaction"],
	_dbUser: CommandContext["dbUser"],
): Promise<void> {
	// Check if user is admin
	if (!isAdmin(interaction.user.id)) {
		const embed = createErrorEmbed(
			"⛔ Nemáš oprávnění",
			"Pouze administrátoři mohou vynutit synchronizaci cen.",
		);
		await interaction.reply({ embeds: [embed] });
		return;
	}

	await interaction.deferReply();

	const startEmbed = createInvestmentEmbed("🔄 Synchronizace zahájená")
		.setDescription("Stahuji aktuální ceny ze Twelve Data API...\n*Toto může trvat několik minut.*");

	await interaction.editReply({ embeds: [startEmbed] });

	// Call sync API endpoint
	const [error, _result] = await orpc.users.investments.sync({
		adminKey: process.env.ADMIN_SYNC_KEY || "change-me-in-production",
	});

	if (error) {
		console.error("Error during sync:", error);

		let errorMessage = "Neznámá chyba při synchronizaci cen.";

		if ("code" in error) {
			switch (error.code) {
				case "UNAUTHORIZED":
					errorMessage = "Neplatný admin klíč. Zkontroluj konfiguraci ADMIN_SYNC_KEY.";
					break;
				case "SYNC_FAILED":
					errorMessage = `Synchronizace selhala s ${error.data?.errors?.length || 0} chybami.`;
					break;
				default:
					errorMessage = error.message || errorMessage;
			}
		}

		const errorEmbed = createErrorEmbed("❌ Chyba synchronizace", errorMessage);
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	// Create result embed
	const embed = createInvestmentEmbed("✅ Synchronizace spuštěna")
		.setDescription(
			"Synchronizace běží na pozadí. Trvá **~11 minut** pro všech 90 aktiv.\n\n" +
			"Výsledky synchronizace najdeš v **logách API serveru**."
		)
		.addFields(
			{ name: "⏱️ Očekávaná doba", value: "~11 minut", inline: true },
			{ name: "📊 Počet aktiv", value: "90", inline: true },
			{ name: "📞 API volání", value: "~90", inline: true },
		)
		.setFooter({ text: `Voláno uživatelem ${interaction.user.tag}` });

	await interaction.editReply({ embeds: [embed] });
}

// Helper to create footer with help suggestion
function createInvestmentHelpFooter(additionalText?: string): { text: string } {
	const helpText = "Chceš vědět více? Použij /invest help";
	if (additionalText) {
		return { text: `${additionalText} • ${helpText}` };
	}
	return { text: helpText };
}

/**
 * Utility function to paginate an array of items
 * Returns the slice of items for the requested page along with pagination metadata
 */
export function paginateItems<T>(
	items: T[],
	page: number,
	itemsPerPage: number,
): { pageItems: T[]; currentPage: number; totalPages: number; totalItems: number; startIndex: number; endIndex: number } {
	const totalItems = items.length;
	const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
	const currentPage = Math.max(1, Math.min(page, totalPages));
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
	const pageItems = items.slice(startIndex, endIndex);

	return {
		pageItems,
		currentPage,
		totalPages,
		totalItems,
		startIndex,
		endIndex,
	};
}

/**
 * Utility function to chunk symbols into parts that fit Discord's character limit
 */
export function chunkSymbols(symbols: string[], maxLength = 1900): string[] {
	const symbolsText = symbols.join(", ");
	const chunks: string[] = [];

	if (symbolsText.length <= maxLength) {
		chunks.push(symbolsText);
	} else {
		// Split by comma and rebuild chunks
		let currentChunk = "";
		for (const symbol of symbols) {
			const addition = (currentChunk ? ", " : "") + symbol;
			if ((currentChunk + addition).length > maxLength) {
				chunks.push(currentChunk);
				currentChunk = symbol;
			} else {
				currentChunk += addition;
			}
		}
		if (currentChunk) {
			chunks.push(currentChunk);
		}
	}

	return chunks;
}
