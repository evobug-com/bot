import { describe, expect, it } from "bun:test";
import { isValidMediaTitle } from "./handleMediaForum.ts";

describe("Media Forum Handler", () => {
	describe("isValidMediaTitle", () => {
		describe("valid titles", () => {
			it("should accept title with game name and description", () => {
				expect(isValidMediaTitle("[R.E.P.O.] look at meee!")).toBe(true);
			});

			it("should accept title with game name and space before description", () => {
				expect(isValidMediaTitle("[Minecraft] Můj epický build")).toBe(true);
			});

			it("should accept title without space after brackets", () => {
				expect(isValidMediaTitle("[CS2]Ace clutch 1v5")).toBe(true);
			});

			it("should accept title with food name", () => {
				expect(isValidMediaTitle("[Svíčková] To je ale dobrůtka")).toBe(true);
			});

			it("should accept title with player name", () => {
				expect(isValidMediaTitle("[Jméno hráče] Honzova reakce na jumpscare")).toBe(true);
			});

			it("should accept title with community name", () => {
				expect(isValidMediaTitle("[Allcom] Když ti spadne internet během clutche")).toBe(true);
			});

			it("should accept title with long game name", () => {
				expect(isValidMediaTitle("[League of Legends] Yasuo 0/10 powerspike")).toBe(true);
			});

			it("should accept title with special characters in game name", () => {
				expect(isValidMediaTitle("[GTA V] Policejní honičky fail")).toBe(true);
			});

			it("should accept title with numbers in brackets", () => {
				expect(isValidMediaTitle("[CS2] AWP shot")).toBe(true);
			});

			it("should accept title with emoji in description", () => {
				expect(isValidMediaTitle("[Minecraft] Best build ever 🏠")).toBe(true);
			});
		});

		describe("invalid titles", () => {
			it("should reject title without brackets", () => {
				expect(isValidMediaTitle("Just a regular title")).toBe(false);
			});

			it("should reject title with empty brackets", () => {
				expect(isValidMediaTitle("[] Some description")).toBe(false);
			});

			it("should reject title with only game name in brackets", () => {
				expect(isValidMediaTitle("[CS2]")).toBe(false);
			});

			it("should reject title with only game name and space", () => {
				expect(isValidMediaTitle("[CS2] ")).toBe(false);
			});

			it("should reject title starting with text before brackets", () => {
				expect(isValidMediaTitle("Hey [CS2] check this out")).toBe(false);
			});

			it("should reject title with unclosed bracket", () => {
				expect(isValidMediaTitle("[CS2 some description")).toBe(false);
			});

			it("should reject title with only closing bracket", () => {
				expect(isValidMediaTitle("CS2] some description")).toBe(false);
			});

			it("should reject empty title", () => {
				expect(isValidMediaTitle("")).toBe(false);
			});

			it("should reject title with only brackets no description", () => {
				expect(isValidMediaTitle("[Game Name]")).toBe(false);
			});

			it("should reject title with reversed brackets", () => {
				expect(isValidMediaTitle("]CS2[ description")).toBe(false);
			});
		});

		describe("edge cases", () => {
			it("should handle title with multiple bracket pairs", () => {
				expect(isValidMediaTitle("[CS2] [Clutch] Ace moment")).toBe(true);
			});

			it("should handle title with nested brackets", () => {
				expect(isValidMediaTitle("[[CS2]] description")).toBe(true);
			});

			it("should accept minimal valid title", () => {
				expect(isValidMediaTitle("[A] B")).toBe(true);
			});

			it("should handle unicode characters in game name", () => {
				expect(isValidMediaTitle("[Řízek s kaší] Asi jsem tam dala moc másla...")).toBe(true);
			});
		});
	});
});
