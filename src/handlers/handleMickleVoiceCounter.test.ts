import { describe, expect, it, mock } from "bun:test";
import { fetchMickleVoiceCount } from "./handleMickleVoiceCounter.ts";

describe("handleMickleVoiceCounter", () => {
	describe("fetchMickleVoiceCount", () => {
		it("should return 0 when there are no rooms", async () => {
			const svc = {
				listRooms: mock(async () => []),
			};

			const count = await fetchMickleVoiceCount(svc as never);
			expect(count).toBe(0);
		});

		it("should sum participants across all rooms", async () => {
			const svc = {
				listRooms: mock(async () => [
					{ numParticipants: 3 },
					{ numParticipants: 5 },
					{ numParticipants: 2 },
				]),
			};

			const count = await fetchMickleVoiceCount(svc as never);
			expect(count).toBe(10);
		});

		it("should return count from a single room", async () => {
			const svc = {
				listRooms: mock(async () => [{ numParticipants: 7 }]),
			};

			const count = await fetchMickleVoiceCount(svc as never);
			expect(count).toBe(7);
		});

		it("should handle rooms with 0 participants", async () => {
			const svc = {
				listRooms: mock(async () => [
					{ numParticipants: 0 },
					{ numParticipants: 4 },
					{ numParticipants: 0 },
				]),
			};

			const count = await fetchMickleVoiceCount(svc as never);
			expect(count).toBe(4);
		});
	});
});
