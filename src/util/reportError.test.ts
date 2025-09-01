import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Guild, TextChannel } from "discord.js";

describe("Error Reporting Logic", () => {
	let mockGuild: Guild;
	let mockChannel: TextChannel;

	beforeEach(() => {
		// Setup mock channel
		mockChannel = {
			id: "1381322985754988544",
			name: "✍︱071︱bot-info",
			isTextBased: () => true,
			send: mock(async (_message: unknown) => ({ id: "msg123" })),
		} as unknown as TextChannel;

		// Setup mock guild
		mockGuild = {
			id: "123456789",
			channels: {
				cache: {
					get: (id: string) => {
						if (id === "1381322985754988544") {
							return mockChannel;
						}
						return undefined;
					},
				},
			},
		} as unknown as Guild;
	});

	describe("Channel operations", () => {
		it("should find bot-info channel", () => {
			const channel = mockGuild.channels.cache.get("1381322985754988544");
			expect(channel).toBeDefined();
			expect(channel?.id).toBe("1381322985754988544");
		});

		it("should identify as text channel", () => {
			const channel = mockGuild.channels.cache.get("1381322985754988544");
			expect(channel?.isTextBased()).toBe(true);
		});

		it("should send error message", async () => {
			const errorMessage = {
				content: "**⚠️ Test Error**\nThis is a test",
				embeds: [
					{
						color: 0xff0000,
						timestamp: new Date().toISOString(),
						footer: {
							text: "Allcom Bot Error Reporter",
						},
					},
				],
			};

			await mockChannel.send(errorMessage);

			expect(mockChannel.send).toHaveBeenCalledWith(errorMessage);
		});

		it("should format error with details", () => {
			const details = {
				userId: "123",
				error: "Test error",
			};

			const formattedDetails = JSON.stringify(details, null, 2);
			const expectedContent = `**⚠️ Test Error**\nTest message\n\`\`\`json\n${formattedDetails}\`\`\``;

			expect(expectedContent).toContain("userId");
			expect(expectedContent).toContain("Test error");
			expect(expectedContent).toContain("```json");
		});
	});
});
