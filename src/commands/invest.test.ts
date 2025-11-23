import { describe, expect, it } from "bun:test";
import { chunkSymbols } from "./invest";

describe("invest command utilities", () => {
	describe("chunkSymbols", () => {
		it("returns single chunk when symbols fit in limit", () => {
			const symbols = ["AAPL", "MSFT", "GOOGL"];
			const chunks = chunkSymbols(symbols, 1900);

			expect(chunks).toHaveLength(1);
			expect(chunks[0]).toBe("AAPL, MSFT, GOOGL");
		});

		it("splits symbols into multiple chunks when exceeding limit", () => {
			const symbols = ["AAPL", "MSFT", "GOOGL", "TSLA", "META"];
			const chunks = chunkSymbols(symbols, 20); // Very small limit to force splitting

			expect(chunks.length).toBeGreaterThan(1);
			// Each chunk should be within the limit
			for (const chunk of chunks) {
				expect(chunk.length).toBeLessThanOrEqual(20);
			}
		});

		it("handles single symbol", () => {
			const symbols = ["AAPL"];
			const chunks = chunkSymbols(symbols, 1900);

			expect(chunks).toHaveLength(1);
			expect(chunks[0]).toBe("AAPL");
		});

		it("handles empty array", () => {
			const symbols: string[] = [];
			const chunks = chunkSymbols(symbols, 1900);

			expect(chunks).toHaveLength(1);
			expect(chunks[0]).toBe("");
		});

		it("handles symbols with different lengths", () => {
			const symbols = ["A", "VERYLONGSYMBOLNAME", "BTC", "ETH"];
			const chunks = chunkSymbols(symbols, 30);

			// Should split appropriately
			expect(chunks.length).toBeGreaterThan(1);
			for (const chunk of chunks) {
				expect(chunk.length).toBeLessThanOrEqual(30);
			}
		});

		it("preserves all symbols across chunks", () => {
			const symbols = ["AAPL", "MSFT", "GOOGL", "TSLA", "META", "NVDA", "AMD"];
			const chunks = chunkSymbols(symbols, 20);

			// Rejoin all chunks and verify all symbols are present
			const rejoined = chunks.join(", ").split(", ");
			expect(rejoined.sort()).toEqual(symbols.sort());
		});

		it("handles exactly at limit", () => {
			// Create a case where symbols exactly fit the limit
			const symbols = ["AAPL", "MSFT"]; // "AAPL, MSFT" = 11 chars
			const chunks = chunkSymbols(symbols, 11);

			expect(chunks).toHaveLength(1);
			expect(chunks[0]).toBe("AAPL, MSFT");
		});

		it("handles one character over limit", () => {
			const symbols = ["AAPL", "MSFT", "X"]; // "AAPL, MSFT, X" = 15 chars
			const chunks = chunkSymbols(symbols, 10); // Limit is 10, should split

			expect(chunks.length).toBeGreaterThan(1);
		});

		it("realistic scenario with 100 symbols", () => {
			// Generate 100 realistic stock symbols
			const symbols: string[] = [];
			for (let i = 0; i < 100; i++) {
				symbols.push(`SYM${i.toString().padStart(2, "0")}`);
			}

			const chunks = chunkSymbols(symbols, 1900);

			// Should create chunks
			expect(chunks.length).toBeGreaterThan(0);

			// Each chunk should be within limit
			for (const chunk of chunks) {
				expect(chunk.length).toBeLessThanOrEqual(1900);
			}

			// All symbols should be preserved
			const allSymbolsInChunks = chunks.join(", ").split(", ");
			expect(allSymbolsInChunks).toHaveLength(100);
		});
	});
});
