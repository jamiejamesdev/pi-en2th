# pi-en2th

Pi extension that translates assistant responses from English to Thai using a local Ollama model.

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
pi install git:github.com/<you>/pi-en2th
```

## Usage

Enable it in pi, then use:

- `/en2th-toggle` — enable or disable translation
- `/en2th-model` — choose the Ollama model
- `/en2th-status` — show current status

The extension appends Thai translation under each assistant text response.

## Config

Environment variables:

- `OLLAMA_BASE_URL` — defaults to `http://localhost:11434`
- `EN2TH_TRANSLATE_MODEL` — default model name

Config file:

- `~/.pi/agent/en2th-translate-config.json`

## Publish

```bash
npm publish --access public
```
# pi-en2th
