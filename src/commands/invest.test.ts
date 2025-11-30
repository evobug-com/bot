import { describe, expect, it } from "bun:test";
import { chunkSymbols, paginateItems } from "./invest";

describe("invest command utilities", () => {
	describe("paginateItems", () => {
		it("returns first page of items", () => {
			const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
			const result = paginateItems(items, 1, 3);

			expect(result.pageItems).toEqual([1, 2, 3]);
			expect(result.currentPage).toBe(1);
			expect(result.totalPages).toBe(4);
			expect(result.totalItems).toBe(10);
			expect(result.startIndex).toBe(0);
			expect(result.endIndex).toBe(3);
		});

		it("returns middle page of items", () => {
			const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
			const result = paginateItems(items, 2, 3);

			expect(result.pageItems).toEqual([4, 5, 6]);
			expect(result.currentPage).toBe(2);
			expect(result.totalPages).toBe(4);
			expect(result.startIndex).toBe(3);
			expect(result.endIndex).toBe(6);
		});

		it("returns last page with fewer items", () => {
			const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
			const result = paginateItems(items, 4, 3);

			expect(result.pageItems).toEqual([10]);
			expect(result.currentPage).toBe(4);
			expect(result.totalPages).toBe(4);
			expect(result.startIndex).toBe(9);
			expect(result.endIndex).toBe(10);
		});

		it("clamps page number to max when too high", () => {
			const items = [1, 2, 3, 4, 5];
			const result = paginateItems(items, 100, 2);

			expect(result.pageItems).toEqual([5]);
			expect(result.currentPage).toBe(3);
			expect(result.totalPages).toBe(3);
		});

		it("clamps page number to 1 when zero or negative", () => {
			const items = [1, 2, 3, 4, 5];
			const result = paginateItems(items, 0, 2);

			expect(result.pageItems).toEqual([1, 2]);
			expect(result.currentPage).toBe(1);

			const resultNegative = paginateItems(items, -5, 2);
			expect(resultNegative.currentPage).toBe(1);
		});

		it("handles empty array", () => {
			const items: number[] = [];
			const result = paginateItems(items, 1, 10);

			expect(result.pageItems).toEqual([]);
			expect(result.currentPage).toBe(1);
			expect(result.totalPages).toBe(1);
			expect(result.totalItems).toBe(0);
		});

		it("handles exact page fit", () => {
			const items = [1, 2, 3, 4, 5, 6];
			const result = paginateItems(items, 2, 3);

			expect(result.pageItems).toEqual([4, 5, 6]);
			expect(result.currentPage).toBe(2);
			expect(result.totalPages).toBe(2);
		});

		it("handles single item", () => {
			const items = ["only"];
			const result = paginateItems(items, 1, 10);

			expect(result.pageItems).toEqual(["only"]);
			expect(result.totalPages).toBe(1);
		});

		it("works with 15 items per page (assets scenario)", () => {
			const items = Array.from({ length: 47 }, (_, i) => `ASSET${i}`);

			const page1 = paginateItems(items, 1, 15);
			expect(page1.pageItems).toHaveLength(15);
			expect(page1.totalPages).toBe(4);
			expect(page1.pageItems[0]).toBe("ASSET0");

			const page2 = paginateItems(items, 2, 15);
			expect(page2.pageItems).toHaveLength(15);
			expect(page2.pageItems[0]).toBe("ASSET15");

			const page4 = paginateItems(items, 4, 15);
			expect(page4.pageItems).toHaveLength(2);
			expect(page4.pageItems[0]).toBe("ASSET45");
		});

		it("preserves item types", () => {
			const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
			const result = paginateItems(items, 1, 2);

			expect(result.pageItems).toEqual([{ id: 1 }, { id: 2 }]);
		});
	});

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
