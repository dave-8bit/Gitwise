# Gritch

<div align="center">

### AI-powered Git assistant that understands your repository before it writes, reviews, or explains your code.

Generate Conventional Commits, review staged changes, explain commits, inspect repositories, and create changelogs using multiple AI providers.

Supports **Groq**, **OpenRouter**, and **Google Gemini** through a unified provider architecture.

</div>

<p align="center">
  <a href="https://www.npmjs.com/package/gritch">
    <img alt="npm version" src="https://img.shields.io/npm/v/gritch.svg" />
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-blue" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-18%2B-green" />
  <img alt="AI Providers" src="https://img.shields.io/badge/AI-Groq%20%7C%20OpenRouter%20%7C%20Gemini-blue" />
</p>

---

# Overview

**Gritch** is an AI-powered Git CLI built to improve developer workflows.

Instead of only analyzing a Git diff, Gritch first inspects your repository to understand the technologies you're using. That repository context is then injected into AI prompts, allowing commit messages, reviews, and explanations to be aware of your project's actual stack.

Whether you're working on a React frontend, an Express API, a Prisma backend, or a monorepo, Gritch gives the AI the context it needs before generating responses.

The result is AI assistance that is significantly more relevant than traditional Git AI tools.

---

# Why Gritch?

Most AI Git tools only see:

* the Git diff
* the commit message
* a prompt

Gritch goes further.

Before sending anything to the AI provider, it inspects your repository and automatically detects:

* Languages
* Frameworks
* Build tools
* Package manager
* Testing framework
* Linting tools
* Formatting tools
* Database technologies
* ORM
* Project architecture
* Repository health

That context is then included in AI prompts, allowing better commit generation, more accurate reviews, and more informative explanations.

---

# Features

## AI Commands

* AI-generated Conventional Commit messages
* AI-powered staged code reviews
* Plain-English commit explanations
* Automatic changelog generation

## Repository Inspection

* Language detection
* Framework detection
* Package manager detection
* Build tool detection
* Testing framework detection
* Linting detection
* Formatting detection
* Database detection
* ORM detection
* Monorepo detection
* Repository health scoring

## AI Platform

* Provider abstraction
* Switch providers without changing commands
* Configurable models
* Configurable token limits
* Future provider support

---

# Repository-Aware AI

One of Gritch's core features is repository awareness.

When running commands like:

```bash
gritch commit

gritch review

gritch explain HEAD
```

Gritch automatically performs repository inspection and builds a context such as:

```
Languages: TypeScript, JavaScript
Frameworks: React, Express
Package Manager: npm
Build Tools: Vite
Testing: Vitest
Linting: ESLint
Database: PostgreSQL
ORM: Prisma
Architecture: Monorepo
Health: Excellent (95/100)
```

This context is injected into AI prompts before sending requests to the selected provider.

---

# Installation

## Global Installation

```bash
npm install -g gritch
```

Verify installation:

```bash
gritch --version
```

---

# Supported AI Providers

Gritch currently supports:

* Groq
* OpenRouter
* Google Gemini (Google AI Studio)

Additional providers can be added through the provider abstraction layer without changing the CLI.

---

# Environment Variables

| Variable           | Purpose                  |
| ------------------ | ------------------------ |
| GROQ_API_KEY       | Groq API key             |
| OPENROUTER_API_KEY | OpenRouter API key       |
| GEMINI_API_KEY     | Google Gemini API key    |
| GRITCH_PROVIDER    | Override active provider |

Example:

PowerShell

```powershell
$env:GRITCH_PROVIDER="groq"
$env:GROQ_API_KEY="YOUR_API_KEY"
```

Linux/macOS

```bash
export GRITCH_PROVIDER=groq
export GROQ_API_KEY=YOUR_API_KEY
```

---

# Configuration

Configuration is loaded from:

```
gritch.config.json
```

Example:

```json
{
  "provider": "groq",
  "model": "llama-3.3-70b-versatile",
  "maxTokens": 1024,
  "reviewThreshold": 7,
  "conventionalCommits": true
}
```

Provider resolution order:

1. Environment variable
2. gritch.config.json
3. Default provider (Groq)

---

# Usage

## Generate Commit Message

```bash
gritch commit
```

---

## Review Staged Changes

```bash
gritch review
```

Specify language:

```bash
gritch review --language typescript
```

---

## Explain a Commit

```bash
gritch explain HEAD
```

or

```bash
gritch explain <commit-hash>
```

---

## Generate Changelog

```bash
gritch changelog v1.0.0 v1.1.0
```

---

## Inspect Repository

```bash
gritch inspect
```

Repository inspection reports:

* Languages
* Frameworks
* Build tools
* Package manager
* Testing
* Formatting
* Linting
* Databases
* ORM
* Architecture
* Repository health

---

# Project Architecture

```
CLI
 │
 ▼
Commands
 │
 ▼
Repository Inspection
 │
 ▼
Repository Context
 │
 ▼
Prompt Builders
 │
 ▼
AI Request Builder
 │
 ▼
AI Service
 │
 ▼
Provider Registry
 │
 ├── Groq
 ├── OpenRouter
 └── Gemini
 │
 ▼
Provider
 │
 ▼
AI Response
```

The repository inspection pipeline is shared across AI commands, ensuring consistent context regardless of the selected provider.

---

# Technology Stack

## Language

* TypeScript

## Runtime

* Node.js

## CLI

* Commander.js

## Git Integration

* simple-git

## AI Providers

* Groq SDK
* OpenRouter API
* Google Gemini API

## Testing

* Vitest

---

# Development

Clone the repository:

```bash
git clone https://github.com/dave-8bit/Gritch.git
```

Install dependencies:

```bash
npm install
```

Compile:

```bash
npx tsc --noEmit
```

Run tests:

```bash
npx vitest run
```

---

# Roadmap

## Milestone 1 ✅

* Multi-provider AI architecture
* Commit generation
* Review generation
* Commit explanations
* Changelog generation

## Milestone 2 ✅

Repository Inspection Engine

* Languages
* Frameworks
* Build tools
* Package managers
* Dependencies
* Testing
* Formatting
* Linting
* Databases
* ORM
* Architecture
* Repository health

## Milestone 3 ✅

Repository-Aware AI

* Repository-aware commit generation
* Repository-aware code reviews
* Repository-aware commit explanations
* Shared repository context system

## Milestone 4 🚧

Planned improvements and new capabilities.

---

# Contributing

Contributions are welcome.

Areas of interest include:

* New AI providers
* Repository detectors
* Performance improvements
* Bug fixes
* Documentation
* Tests
* CLI enhancements

Please open an issue before making significant architectural changes.

---

# License

MIT License.

---

# Author

Developed by **Dave Craft**.

If you find Gritch useful, consider starring the repository on GitHub.

<!-- Ollama provider runtime test -->
