// @ts-nocheck
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const CONFIG_PATH = join(
	homedir(),
	".pi",
	"agent",
	"en2th-translate-config.json",
);
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const DEFAULT_MODEL = process.env.EN2TH_TRANSLATE_MODEL ?? "translategemma:latest";
const DEFAULT_STYLE: StylePreset = "natural";
const STYLE_PRESETS = ["natural", "literal", "technical"] as const;

type StylePreset = (typeof STYLE_PRESETS)[number];

type Config = {
	model: string;
	enabled: boolean;
	style: StylePreset;
};

let config: Config = loadConfig();
let lastTranslationMs: number | null = null;

function getOllamaLabel(): string {
	try {
		const url = new URL(OLLAMA_BASE_URL);
		return url.host;
	} catch {
		return OLLAMA_BASE_URL;
	}
}

function formatStatus(extra?: string): string {
	const base = [
		` | EN→TH ${config.enabled ? "on" : "off"}`,
		config.model,
		`style ${config.style}`,
		`Ollama ${getOllamaLabel()} |`,
	];

	if (lastTranslationMs != null) {
		base.push(`last ${lastTranslationMs}ms`);
	}

	if (extra) {
		base.push(extra);
	}

	return base.join(" · ");
}

function refreshStatus(ctx: { ui: { setStatus: (id: string, text?: string) => void } }, extra?: string) {
	ctx.ui.setStatus("en2th-translate", formatStatus(extra));
}

function loadConfig(): Config {
	try {
		const raw = readFileSync(CONFIG_PATH, "utf8");
		const parsed = JSON.parse(raw);
		const style = STYLE_PRESETS.includes(parsed.style) ? parsed.style : DEFAULT_STYLE;
		return { enabled: true, model: DEFAULT_MODEL, style: DEFAULT_STYLE, ...parsed, style };
	} catch {
		return { model: DEFAULT_MODEL, enabled: true, style: DEFAULT_STYLE };
	}
}

function saveConfig() {
	mkdirSync(dirname(CONFIG_PATH), { recursive: true });
	writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function listOllamaModels(signal?: AbortSignal): Promise<string[]> {
	const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal });
	if (!res.ok) throw new Error(`Ollama /api/tags failed: ${res.status}`);
	const data = (await res.json()) as { models?: Array<{ name: string }> };
	return (data.models ?? []).map((m) => m.name).sort();
}

function getStyleInstruction(style: StylePreset): string {
	switch (style) {
		case "literal":
			return "Translate as literally as possible while staying grammatical in Thai. Prefer fidelity over smooth paraphrasing.";
		case "technical":
			return "Translate for a technical audience. Preserve precise meaning, technical terminology, and product/API wording over conversational smoothness.";
		case "natural":
		default:
			return "Translate into natural, fluent Thai while preserving the original meaning.";
	}
}

async function translateEnglishToThai(
	text: string,
	signal?: AbortSignal,
): Promise<{ translated: string; durationMs: number }> {
	const trimmed = text.trim();
	if (!trimmed) return { translated: text, durationMs: 0 };

	const startedAt = Date.now();
	const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model: config.model,
			stream: false,
			options: {
				temperature: 0,
				num_predict: 4096,
			},
			prompt: `Translate the following English assistant response into Thai.

Rules:
- Output only the Thai translation.
- Do not answer or extend the content.
- ${getStyleInstruction(config.style)}
- Preserve code blocks, inline code, commands, paths, filenames, package names, API names, URLs, markdown structure, and quoted strings exactly where possible.
- Keep formatting and list structure.
- If a segment is already code or should remain unchanged, keep it unchanged.

English assistant response:
${text}

Thai translation:`,
		}),
		signal,
	});

	if (!res.ok) throw new Error(`Ollama translation failed: ${res.status}`);
	const data = (await res.json()) as { response?: string };
	const translated = data.response?.trim();
	if (!translated) throw new Error("Ollama returned an empty translation");
	return { translated, durationMs: Date.now() - startedAt };
}

function buildTranslatedBlock(original: string, translated: string, durationMs: number) {
	const seconds = (durationMs / 1000).toFixed(2);
	const minutes = (durationMs / 60000).toFixed(2);
	const metadata = [
		"## ✨ Translation Notes ✨",
		"",
		`> **🟦 Source model:** \`${config.model}\``,
		`> **🟪 Style preset:** \`${config.style}\``,
		`> **🟩 Processing time:** \`${durationMs} ms\` · \`${seconds} s\` · \`${minutes} min\``,
		`> **🟨 Data points:** original chars=\`${original.length}\`, translated chars=\`${translated.length}\``,
	].join("\n");

	return `${original}\n\n\n${metadata}\n\n${translated}`;
}

export default function (pi: any) {
	pi.on("session_start", async (_event, ctx) => {
		refreshStatus(ctx);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		ctx.ui.setStatus("en2th-translate", undefined);
	});

	pi.registerCommand("en2th-model", {
		description:
			"Select the local Ollama model used for English → Thai response translation",
		handler: async (args, ctx) => {
			const requested = args.trim();

			if (requested) {
				let models: string[];
				try {
					models = await listOllamaModels(ctx.signal);
				} catch (error) {
					ctx.ui.notify(
						`Could not validate Ollama model: ${String(error)}`,
						"error",
					);
					return;
				}

				if (!models.includes(requested)) {
					ctx.ui.notify(
						`Model not found in Ollama: ${requested}`,
						"error",
					);
					return;
				}

				config = { ...config, model: requested };
				saveConfig();
				refreshStatus(ctx);
				ctx.ui.notify(
					`English translator model set to: ${config.model}`,
					"success",
				);
				return;
			}

			let models: string[];
			try {
				models = await listOllamaModels(ctx.signal);
			} catch (error) {
				ctx.ui.notify(
					`Could not list Ollama models: ${String(error)}`,
					"error",
				);
				return;
			}

			if (models.length === 0) {
				ctx.ui.notify(
					"No Ollama models found. Run: ollama pull translategemma:latest",
					"warning",
				);
				return;
			}

			const choice = await ctx.ui.select(
				"Select English → Thai translation model",
				models.map(
					(model) => `${model}${model === config.model ? "  ✓ current" : ""}`,
				),
			);
			if (!choice) return;

			config = { ...config, model: choice.replace(/\s+✓ current$/, "") };
			saveConfig();
			refreshStatus(ctx);
			ctx.ui.notify(`English translator model set to: ${config.model}`, "success");
		},
	});

	pi.registerCommand("en2th-toggle", {
		description: "Enable or disable English → Thai response translation",
		handler: async (_args, ctx) => {
			config = { ...config, enabled: !config.enabled };
			saveConfig();
			refreshStatus(ctx);
			ctx.ui.notify(
				`English → Thai translation ${config.enabled ? "enabled" : "disabled"}`,
				"info",
			);
		},
	});

	pi.registerCommand("en2th-style", {
		description: "Select the English → Thai translation style preset",
		handler: async (args, ctx) => {
			const requested = args.trim() as StylePreset;

			if (requested) {
				if (!STYLE_PRESETS.includes(requested)) {
					ctx.ui.notify(
						`Unknown style preset: ${requested}. Use: ${STYLE_PRESETS.join(", ")}`,
						"error",
					);
					return;
				}

				config = { ...config, style: requested };
				saveConfig();
				refreshStatus(ctx);
				ctx.ui.notify(`English translator style set to: ${config.style}`, "success");
				return;
			}

			const choice = await ctx.ui.select(
				"Select English → Thai translation style",
				STYLE_PRESETS.map(
					(style) => `${style}${style === config.style ? "  ✓ current" : ""}`,
				),
			);
			if (!choice) return;

			config = {
				...config,
				style: choice.replace(/\s+✓ current$/, "") as StylePreset,
			};
			saveConfig();
			refreshStatus(ctx);
			ctx.ui.notify(`English translator style set to: ${config.style}`, "success");
		},
	});

	pi.registerCommand("en2th-status", {
		description: "Show English → Thai response translation status",
		handler: async (_args, ctx) => {
			refreshStatus(ctx);
			ctx.ui.notify(
				`English → Thai translation: ${config.enabled ? "enabled" : "disabled"}; model: ${config.model}; style: ${config.style}; Ollama: ${OLLAMA_BASE_URL}`,
				"info",
			);
		},
	});

	pi.on("message_end", async (event, ctx) => {
		refreshStatus(ctx);
		if (!config.enabled) return;
		if (event.message.role !== "assistant") return;
		if (!Array.isArray(event.message.content)) return;

		try {
			refreshStatus(ctx, "translating");

			const content = await Promise.all(
				event.message.content.map(async (part) => {
					if (!part || part.type !== "text" || typeof part.text !== "string") {
						return part;
					}

					try {
						const { translated, durationMs } = await translateEnglishToThai(part.text, ctx.signal);
						lastTranslationMs = durationMs;
						return {
							...part,
							text: buildTranslatedBlock(part.text, translated, durationMs),
						};
					} catch {
						return part;
					}
				}),
			);

			return {
				message: {
					...event.message,
					content,
				},
			};
		} catch (error) {
			ctx.ui.notify(
				`English → Thai translation failed; keeping original response. ${String(error)}`,
				"error",
			);
			return;
		} finally {
			refreshStatus(ctx);
		}
	});
}
