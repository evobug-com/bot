import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import os from "os";

export async function generateAiResponse(
	prompt: string,
	model = "sonnet",
): Promise<
	Partial<{
		title: string;
		color: number;
		description: string;
		footer: { text: string };
	}>
> {
	try {
		let output = "";
		const outputFile = path.join(os.tmpdir(), "claude-output.txt");
		if (await fs.exists(outputFile)) await fs.rm(outputFile, { force: true });
		const outputStream = await fs.open(outputFile, "w");
		const timeoutMinutes = 1;

		const claudeProcess = spawn(
			"bunx",
			[
				"@anthropic-ai/claude-code",
				"-p",
				"--output-format",
				"json",
				"--max-turns",
				"1",
				`"${prompt.replace(/"/g, '\\"')}"`,
			],
			{
				env: { ...process.env },
				cwd: process.cwd(), // Explicitly use current working directory (should be workspace root)
				stdio: ["inherit", "pipe", "inherit"],
			},
		);

		// Capture output
		claudeProcess.stdout.on("data", (data) => {
			const text = data.toString();
			console.log(text);
			output += text;
			outputStream.write(data);
		});

		// Handle timeout
		const timeoutMs = timeoutMinutes * 60 * 1000;
		const timeoutId = setTimeout(() => {
			console.error(`Claude process timed out after ${timeoutMinutes} minutes`);
			claudeProcess.kill("SIGTERM");
		}, timeoutMs);

		// Wait for the process to complete
		const exitCode = await new Promise((resolve) => {
			claudeProcess.on("close", (code) => {
				clearTimeout(timeoutId);
				resolve(code || 0);
			});

			claudeProcess.on("error", (error) => {
				console.error("Claude process error:", error);
				clearTimeout(timeoutId);
				resolve(1);
			});
		});

		await outputStream.close();

		// Process the output
		if (exitCode === 0) {
			try {
				// Convert stream-json output to a single JSON file
				const lines = output.split("\n").filter((line) => line.trim());
				const messages = [];

				for (const line of lines) {
					try {
						const parsed = JSON.parse(line);
						messages.push(parsed);
					} catch (e) {
						// Skip non-JSON lines
					}
				}

				const lastMessage = messages[messages.length - 1];
				return lastMessage ? extractJsonFromResponse(lastMessage.result) : {};
			} catch (e) {
				// Save error information to execution file
				const errorContent = {
					error: e,
					output: output,
					timestamp: new Date().toISOString(),
					exitCode: exitCode,
				};

				console.error(errorContent);
			}
		} else {
			// Save error information to execution file
			const errorContent = {
				error: `Claude exited with code ${exitCode}`,
				output: output,
				timestamp: new Date().toISOString(),
				exitCode: exitCode,
			};

			console.error(errorContent);
		}
	} catch (error) {
		console.error("Error:", error);
	}
	return {};
}

/**
 * Extracts JSON from Claude's response, handling cases where it includes
 * explanatory text before or after the JSON
 */
function extractJsonFromResponse(response: string) {
	if (!response) {
		return null;
	}

	// First, try to parse as-is (best case scenario)
	try {
		return JSON.parse(response);
	} catch (e) {
		// Continue with extraction methods
	}

	// Strip markdown code blocks
	const cleaned = response.replace(/```json\n?/gi, "").replace(/```\n?/gi, "");

	// Try to find JSON by looking for outermost curly braces or square brackets
	const jsonMatches = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
	if (jsonMatches) {
		try {
			return JSON.parse(jsonMatches[1] as string);
		} catch {
			// Continue trying other methods
		}
	}

	// Try to find the first { and last } for object responses
	const firstBrace = cleaned.indexOf("{");
	const lastBrace = cleaned.lastIndexOf("}");
	if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
		try {
			const extracted = cleaned.substring(firstBrace, lastBrace + 1);
			return JSON.parse(extracted);
		} catch (e) {
			// Continue trying
		}
	}

	// Try to find array responses
	const firstBracket = cleaned.indexOf("[");
	const lastBracket = cleaned.lastIndexOf("]");
	if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
		try {
			const extracted = cleaned.substring(firstBracket, lastBracket + 1);
			return JSON.parse(extracted);
		} catch (e) {
			// Continue trying
		}
	}

	return null;
}
