import {
	ChatInputCommandBuilder,
} from "discord.js";
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
						{ name: "Total Value", value: "total_value" },
						{ name: "Total Profit", value: "profit" },
						{ name: "ROI", value: "roi" },
					),
			),
	)
	// Help subcommand
	.addSubcommands((subcommand) =>
		subcommand
			.setName("help")
			.setNameLocalizations({ cs: "nápověda" })
			.setDescription("Learn about investments and available commands")
			.setDescriptionLocalizations({ cs: "Zjisti více o investicích a dostupných příkazech" }),
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
		| "help";

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
					errorMessage = "Cenová data nejsou momentálně dostupná. Ceny se aktualizují každé 3 hodiny (12:00, 15:00, 18:00, 21:00, 00:00, 03:00, 06:00, 09:00). Zkus to po další synchronizaci.";
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
					errorMessage = "Cenová data nejsou momentálně dostupná. Ceny se aktualizují každé 3 hodiny (12:00, 15:00, 18:00, 21:00, 00:00, 03:00, 06:00, 09:00). Zkus to po další synchronizaci.";
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

	// If search is provided, we'll filter client-side
	const [error, result] = await orpc.users.investments.assets({
		assetType,
		limit: 25,
		offset: 0,
	});

	if (error) {
		console.error("Error fetching assets:", error);
		const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se načíst aktiva.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	let assets = result.assets;

	// Filter by search if provided
	if (search) {
		const searchLower = search.toLowerCase();
		assets = assets.filter(
			(a) =>
				a.asset.symbol.toLowerCase().includes(searchLower) ||
				a.asset.name.toLowerCase().includes(searchLower),
		);
	}

	if (assets.length === 0) {
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

	// Build asset list (limit to 15)
	const assetList = assets
		.slice(0, 15)
		.map((item) => {
			const price = item.currentPrice ? formatPrice(item.currentPrice) : "N/A";
			const change = item.changePercent24h !== null ? formatPercentageChange(item.changePercent24h) : "";
			const type = formatAssetType(item.asset.assetType);

			return `**${item.asset.symbol}** - ${item.asset.name}\n${type} | ${price} ${change}`;
		})
		.join("\n\n");

	const typeLabel = {
		all: "Všechna aktiva",
		stock_us: "Americké akcie",
		stock_intl: "Mezinárodní akcie",
		crypto: "Kryptoměny",
	}[assetType];

	const embed = createInvestmentEmbed(typeLabel)
		.setDescription(assetList)
		.setFooter(createInvestmentHelpFooter(`Zobrazeno ${Math.min(assets.length, 15)} aktiv`))
		.setTimestamp();

	await interaction.editReply({ embeds: [embed] });
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
		limit: 200, // Get more to increase chance of finding the symbol
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
		.setFooter(createInvestmentHelpFooter("Ceny se aktualizují každé 3 hodiny (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00)"))
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

	// Get all portfolios and calculate metrics
	// Note: This is a simplified implementation. In production, you'd want a dedicated API endpoint
	const errorEmbed = createInfoEmbed(
		"Momentálně nedostupné",
		"Investiční žebříček bude brzy k dispozici!",
	).setFooter(createInvestmentHelpFooter());
	await interaction.editReply({ embeds: [errorEmbed] });
}

/**
 * Handle /invest help subcommand
 */
async function handleHelp(
	interaction: CommandContext["interaction"],
): Promise<void> {
	await interaction.deferReply();

	const embed = createInvestmentEmbed("Nápověda")
		.setDescription(
			"**Co jsou investice?**\n" +
			"Investice ti umožňují použít své mince k nákupu skutečných akcií a kryptoměn. " +
			"Ceny se aktualizují každé **3 hodiny** (8x denně) podle reálného trhu. " +
			"Můžeš vydělat nebo ztratit mince v závislosti na výkonu trhu.\n\n" +
			"**💱 Směnný kurz:**\n" +
			"• 1 mince = 1 CZK\n" +
			"• 1 USD = 25 CZK (fixní kurz)\n" +
			"• Ceny z USD trhů jsou automaticky přepočítány\n\n" +
			"**🔒 Jak fungují investované mince:**\n" +
			"• Když nakoupíš akcie, mince se **odečtou z tvého zůstatku**\n" +
			"• Investované mince jsou \"zamčené\" v portfoliu jako akcie\n" +
			"• **Nemůžeš je utratit** - musíš nejdřív prodat investice\n" +
			"• Tvůj zůstatek = pouze volné mince (ne hodnota portfolia)\n\n" +
			"**Účel:** Vyzkoušej si investování s herními mincemi a uč se o důsledcích investičních rozhodnutí v bezpečném prostředí!\n\n" +
			"**⚠️ Upozornění:** Používáš své skutečné mince z ekonomiky bota. Buď opatrný!"
		)
		.addFields(
			{
				name: "📋 Dostupné příkazy",
				value: "\u200B",
				inline: false,
			},
			{
				name: "💰 /invest buy",
				value: "Kup akcie nebo kryptoměny za své mince\n*Minimální investice: 100 mincí (ne 100 akcií!)*\n*Příklad: 100 mincí koupí část BTC, ne 100 celých BTC*",
				inline: false,
			},
			{
				name: "💸 /invest sell",
				value: "Prodej své akcie nebo kryptoměny\n*Prodej vše, konkrétní množství nebo procenta*",
				inline: false,
			},
			{
				name: "📊 /invest portfolio",
				value: "Zobraz své investiční portfolio\n*Uvidíš všechny své pozice a celkový zisk/ztrátu*",
				inline: false,
			},
			{
				name: "🏢 /invest assets",
				value: "Seznam dostupných aktiv k investici\n*Filtruj podle typu nebo hledej konkrétní symbol*",
				inline: false,
			},
			{
				name: "ℹ️ /invest info",
				value: "Detailní informace o konkrétním aktivu\n*Zobrazí aktuální cenu, 24h změnu a další detaily*",
				inline: false,
			},
			{
				name: "📜 /invest history",
				value: "Tvoje historie transakcí\n*Zobraz své nákupy a prodeje s detaily*",
				inline: false,
			},
			{
				name: "🏆 /invest leaderboard",
				value: "Investiční žebříček\n*Porovnej se s ostatními investory*",
				inline: false,
			},
		)
		.addFields(
			{
				name: "\u200B",
				value: "**💡 Tipy:**\n" +
					"• Ceny se aktualizují v **00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00**\n" +
					"• Každá transakce má **1.5% poplatek**\n" +
					"• Diverzifikuj své portfolio pro nižší riziko\n" +
					"• Sleduj 24h změny před nákupem",
				inline: false,
			}
		)
		.setFooter({ text: "Investice nesou riziko ztráty. Investuj zodpovědně!" })
		.setTimestamp();

	await interaction.editReply({ embeds: [embed] });
}

// Helper to create info embed
function createInfoEmbed(title: string, description: string) {
	return createInvestmentEmbed(title).setDescription(description);
}

// Helper to create footer with help suggestion
function createInvestmentHelpFooter(additionalText?: string): { text: string } {
	const helpText = "Chceš vědět více? Použij /invest help";
	if (additionalText) {
		return { text: `${additionalText} • ${helpText}` };
	}
	return { text: helpText };
}
