# pi-en2th

Pi extension that translates assistant responses from English to Thai using a local Ollama model.

This package is published publicly on npm.

## Requirements

- [Pi](https://pi.dev)
- [Ollama](https://ollama.com) running locally
- A translation model available in Ollama

Default model:

```bash
ollama pull translategemma:latest
```

## Install

### From npm

```bash
pi install npm:pi-en2th
```

### From git

```bash
pi install https://github.com/jamiejamesdev/pi-en2th.git
```

## Usage

Enable it in pi, then use:

- `/en2th-toggle` — enable or disable translation
- `/en2th-model` — choose the Ollama model
- `/en2th-style` — choose translation style: `natural`, `literal`, or `technical`
- `/en2th-status` — show current status

The extension appends Thai translation under each assistant text response.
It also shows a persistent footer status in pi with on/off state, selected model, Ollama host, and the last translation time.

## Config

Environment variables:

- `OLLAMA_BASE_URL` — defaults to `http://localhost:11434`
- `EN2TH_TRANSLATE_MODEL` — default model name

Style presets:

- `natural` — smoother Thai phrasing
- `literal` — closer wording to the English source
- `technical` — preserves technical terminology more strictly

Config file:

- `~/.pi/agent/en2th-translate-config.json`

## Publish

The package is public, so this is only needed when releasing a new version.

```bash
npm publish --access public
```
