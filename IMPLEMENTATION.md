# Gritch — Implementation Guide

> Last Updated: August 2026

---

# Vision

Gritch is an AI-powered Git assistant that evolves into an AI engineering platform.

The long-term goal is not simply generating commit messages.

Gritch should understand repositories, assist developers throughout the software lifecycle, work with multiple AI providers, and eventually integrate directly into IDEs.

Every implementation should move the project closer to that goal.

---

# Current Status

## Milestone 1 — Foundation
Status: ✅ Complete

Completed

- CLI foundation
- Commander setup
- AI abstraction
- Configuration loading
- Git utilities
- Core commands
- Testing setup

---

## Milestone 2 — Repository Intelligence
Status: ✅ Complete

Implemented repository inspection engine including:

- Repository scanner
- Folder tree analysis
- Git metadata
- Project statistics
- Language detection
- Framework detection
- Package manager detection
- Build tool detection
- Database detection
- ORM detection
- Testing framework detection
- Deployment detection
- AI framework detection
- Monorepo detection
- Workspace detection

Architecture intelligence

- Entry point detection
- Configuration discovery
- Environment discovery
- API route discovery
- Architecture summaries

---

## Milestone 3 — AI Repository Intelligence
Status: ✅ Complete

Implemented commands

- gritch commit
- gritch review
- gritch changelog
- gritch explain
- gritch inspect

Provider architecture

- Shared AI service
- Provider registry
- Request builder
- Shared response helpers

---

## Milestone 4 — Local AI & Provider Ecosystem
Status: 🚧 In Progress

### Phase 4.1
Status: ✅ Complete

Completed

- Ollama provider
- Provider registry refactor
- Data-driven provider registration
- GRITCH_PROVIDER support
- GRITCH_MODEL support
- Shared JSON response parser
- Markdown fenced JSON parsing
- Local model validation
- Runtime validation using qwen2.5-coder:1.5b
- 156 passing tests

---

### Phase 4.2
Status: 🚧 Next

Goals

Improve provider reliability.

Planned work

- Provider health checks
- Retry logic
- Timeout handling
- Consistent provider errors
- Response timing
- Capability groundwork
- Shared provider behavior
- Additional provider tests

---

## Milestone 5
Status: Planned

LangChain Integration

SQLite Repository Memory

Repository Context

Persistent AI Memory

Repository Indexing

Conversation Context

Architecture Cache

---

## Milestone 6
Status: Planned

VS Code Extension

Extension architecture

Sidebar

Commands

Repository insights

Interactive AI

Command palette integration

---

# Technology Stack

Language

- TypeScript

Runtime

- Node.js

CLI

- Commander

Git

- simple-git

AI Providers

- Groq
- Gemini
- OpenRouter
- Ollama

Testing

- Vitest

Configuration

- JSON configuration
- Environment variables

---

# Architecture

Repository

↓

Commands

↓

AI Service

↓

Provider Registry

↓

Active Provider

↓

AI Provider

↓

Response Helpers

---

# Configuration Priority

Highest Priority

Environment Variables

↓

gritch.config.json

↓

Default Configuration

---

# Design Principles

The project follows these principles.

## Provider Agnostic

No command should depend directly on a specific provider.

Commands communicate only with the AI service.

Providers remain interchangeable.

---

## Thin Providers

Provider implementations should only

- build requests
- call APIs
- parse provider responses

Business logic belongs elsewhere.

---

## Shared Utilities

Duplicate logic should be avoided.

If multiple providers or commands need similar functionality, create a shared helper.

---

## Backward Compatibility

Existing commands should never break.

New functionality should integrate cleanly with the current architecture.

---

## Small, Focused Changes

Every implementation should target one phase only.

Avoid mixing unrelated improvements.

---

## Testing

Every feature must include tests.

Existing tests must continue passing.

---

## Build

Every implementation must compile successfully.

---

# Development Workflow

Every implementation follows this order.

1. Inspect existing code
2. Understand architecture
3. Produce implementation plan
4. Wait for approval
5. Implement
6. Run tests
7. Build
8. Summarize changes

---

# AI Contributor Rules

Before making code changes

- inspect first
- never guess architecture
- reuse existing abstractions
- prefer shared helpers
- avoid duplication
- preserve public APIs
- write tests
- compile before finishing

Do not introduce unrelated refactors.

Do not expand project scope.

Focus only on the requested phase.

---

# Current Metrics

Tests

20 test files

156 tests passing

Build

Passing

Repository

Working tree clean

---

# Roadmap

✅ Milestone 1 — Foundation

✅ Milestone 2 — Repository Intelligence

✅ Milestone 3 — AI Repository Intelligence

🚧 Milestone 4 — Local AI & Provider Ecosystem

⏳ Milestone 5 — LangChain + SQLite Memory

⏳ Milestone 6 — VS Code Extension

---

# Definition of Done

A phase is complete only when:

- implementation is finished
- tests pass
- build succeeds
- runtime behavior is verified
- documentation is updated
- code is committed
- code is pushed
- repository is clean