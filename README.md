# pi-en2th

`pi-en2th` is a Pi extension and npm package for local English to Thai assistant response translation with Ollama. It translates assistant responses inside Pi, preserves fenced code blocks, and lets you choose the translation model, style, and output mode.

It is designed for Thai-speaking developers, bilingual workflows, local LLM setups, and markdown-heavy technical conversations where code blocks, commands, and formatting need to stay intact.

## Features

- Local English to Thai translation powered by Ollama
- Designed for Pi assistant responses
- Preserves fenced code blocks during translation
- Supports `natural`, `literal`, and `technical` translation styles
- Supports `append`, `replace`, and `thai-only` output modes
- Stores preferences locally in `~/.pi/agent/en2th-translate-config.json`
- Shows a Pi status footer with enabled state, model, style, output mode, and last translation time

## Requirements

- [Pi](https://pi.dev)
- [Ollama](https://ollama.com) running locally
- An Ollama model suitable for English to Thai translation

Default model:

```bash
ollama pull translategemma:latest
```

## Installation

### Install from npm

```bash
pi install npm:pi-en2th
```

### Install from GitHub

```bash
pi install https://github.com/jamiejamesdev/pi-en2th.git
```

## Quick Start

1. Install the extension.
2. Make sure Ollama is running locally.
3. Pull a translation model if needed.
4. Start Pi and use the commands below to configure translation behavior.

## Commands

| Command | Description |
| --- | --- |
| `/en2th-toggle` | Enable or disable English to Thai translation |
| `/en2th-model` | Choose the Ollama model used for translation |
| `/en2th-style` | Choose the translation style: `natural`, `literal`, or `technical` |
| `/en2th-output` | Choose the output mode: `append`, `replace`, or `thai-only` |
| `/en2th-status` | Show the current translation status |

You can also pass values directly when supported, for example:

```bash
/en2th-model translategemma:latest
/en2th-style technical
/en2th-output append
```

## Configuration

### Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Base URL for the local Ollama server |
| `EN2TH_TRANSLATE_MODEL` | `translategemma:latest` | Default Ollama model used for translation |

### Local Config File

The extension stores user preferences in:

```text
~/.pi/agent/en2th-translate-config.json
```

Saved settings include:

- `model`
- `enabled`
- `style`
- `outputMode`

## Translation Styles

- `natural` — smoother Thai phrasing for general reading
- `literal` — closer to the English source wording
- `technical` — preserves technical terms more strictly

## Output Modes

- `append` — keeps the original English response and adds the Thai translation below it
- `replace` — replaces the original response text with translation notes and the Thai translation
- `thai-only` — shows only the Thai translation

## Behavior

- Translates assistant text after the response is generated
- Leaves non-text content unchanged
- Preserves fenced code blocks during translation
- Falls back to the original response if translation fails

## Troubleshooting

### Ollama is not running

Make sure Ollama is running locally and that `OLLAMA_BASE_URL` points to the correct host.

### Model is not available

Pull a model first or select an installed model:

```bash
ollama pull translategemma:latest
/en2th-model translategemma:latest
```

### Translation does not appear

Run `/en2th-status` to confirm translation is enabled. If translation fails, the extension leaves the original assistant response unchanged.

## Publishing

Use this only when releasing a new public npm version:

```bash
npm publish --access public
```
