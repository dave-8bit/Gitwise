# Gritch

<div align="center">

# Gritch

### An AI-powered Git assistant evolving into an AI engineering platform.

**Understand the repository. Understand the change. Choose the best available AI provider. Then help the developer ship.**

Gritch is a repository-aware developer CLI that combines Git workflows, repository intelligence, multi-provider AI, local models, reliability-aware provider orchestration, and eventually persistent repository memory and IDE integration.

<br />

[![npm version](https://img.shields.io/npm/v/gritch.svg)](https://www.npmjs.com/package/gritch)
[![npm downloads](https://img.shields.io/npm/dm/gritch.svg)](https://www.npmjs.com/package/gritch)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-246%20passing-brightgreen.svg)](#testing)
[![Status](https://img.shields.io/badge/status-active%20development-orange.svg)](#project-status)

</div>

---

# Table of Contents

- [What is Gritch?](#what-is-gritch)
- [Vision](#vision)
- [The Problem](#the-problem)
- [What Gritch Aims to Serve](#what-gritch-aims-to-serve)
- [Core Philosophy](#core-philosophy)
- [Project Status](#project-status)
- [Current Features](#current-features)
- [AI Commands](#ai-commands)
- [Repository Intelligence](#repository-intelligence)
- [Multi-Provider AI Architecture](#multi-provider-ai-architecture)
- [Provider Fallback and Reliability](#provider-fallback-and-reliability)
- [Local AI with Ollama](#local-ai-with-ollama)
- [Security](#security)
- [Installation](#installation)
- [Requirements](#requirements)
- [AI Provider Setup](#ai-provider-setup)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Command Reference](#command-reference)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Development](#development)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Future Architecture](#future-architecture)
- [Design Principles](#design-principles)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

# What is Gritch?

**Gritch** is an AI-powered Git assistant designed to evolve into a broader **AI engineering platform for developers**.

It starts where many AI Git tools start:

- generating commit messages
- reviewing changes
- explaining commits
- generating changelogs

But Gritch is designed around a different principle:

> **AI assistance should understand the repository before attempting to understand the change.**

A Git diff by itself does not tell an AI everything it needs to know.

A change might belong to:

- a React application
- a Node.js API
- a TypeScript monorepo
- a Prisma/PostgreSQL backend
- a Vite application
- a project using Vitest
- a repository with multiple packages
- a local AI workflow
- a production service with specific architectural conventions

Gritch therefore maintains a repository intelligence layer that analyzes the project before AI commands operate on it.

The long-term goal is to move from:

```text
AI + Git diff
 
 TO:

 Developer
    ↓
Gritch
    ↓
Repository Intelligence
    ↓
Repository Context
    ↓
Git / Code / Architecture Context
    ↓
AI Orchestration
    ↓
Best Available Provider
    ↓
Actionable Developer Assistance

Vision

Gritch is being built as an AI engineering companion, not simply an AI commit-message generator.

The long-term vision is for Gritch to understand:

* what a repository is
* how it is structured
* what technologies it uses
* how its components interact
* what has changed
* why something changed
* how the repository has evolved
* what the developer is currently trying to accomplish
* which AI provider is appropriate for the task
* what context should be retained for future interactions

Eventually, Gritch should be able to operate across a developer’s workflow:

Inspect
   ↓
Understand
   ↓
Plan
   ↓
Implement
   ↓
Review
   ↓
Test
   ↓
Commit
   ↓
Document
   ↓
Remember

The CLI is the foundation.

Future Gritch interfaces may include:

* CLI workflows
* persistent repository memory
* interactive AI sessions
* repository-aware agents
* IDE integration
* VS Code
* command palette workflows
* architecture intelligence
* contextual code assistance

⸻

The Problem

Modern AI coding tools are powerful, but developer workflows are fragmented.

A developer may need:

* one tool for Git
* another for code review
* another for AI chat
* another for repository analysis
* another for local models
* another for IDE integration
* another for project memory

Provider availability is also unreliable.

An AI provider can experience:

* rate limits
* downtime
* authentication failures
* network failures
* API timeouts
* service degradation
* model availability changes

Gritch is designed to reduce this fragmentation.

Instead of making every command depend on one AI provider, Gritch introduces a provider abstraction and orchestration layer.

This means the commands can remain provider-agnostic.

⸻

What Gritch Aims to Serve

Gritch aims to serve developers who want AI assistance integrated directly into their engineering workflow.

Individual Developers

For developers who want:

* faster Git workflows
* automated commit messages
* AI code reviews
* repository analysis
* local AI support
* provider flexibility
* less repetitive Git work

Students and Learners

Gritch can help developers understand:

* unfamiliar repositories
* commits
* architectural decisions
* project structure
* technologies used by a project
* changes made by other developers

Open Source Developers

Gritch is designed to work with repositories where developers may need to quickly understand:

* unfamiliar codebases
* incoming changes
* project architecture
* dependencies
* Git history

Teams

The longer-term architecture is intended to support:

* consistent repository context
* provider flexibility
* persistent project memory
* automated review workflows
* shared engineering intelligence

Developers Who Want Local AI

Gritch supports Ollama so developers can use local models without sending every request to a cloud provider.

This is particularly useful for:

* privacy-sensitive repositories
* offline development
* experimentation
* cost reduction
* developers who already operate local models

⸻

Core Philosophy

Gritch follows several architectural principles.

1. Repository First

AI should not blindly operate on a diff.

Gritch should understand the repository context first.

⸻

2. Provider Agnostic

Commands should never depend directly on Groq, Gemini, OpenRouter, Ollama, or any future provider.

Commands communicate with the AI service.

The AI service communicates with the provider layer.

⸻

3. Local AI Should Be a First-Class Option

Cloud AI should not be the only option.

Ollama provides a local execution path for developers who want local inference.

⸻

4. Failure Should Not Automatically Mean the Workflow Stops

If a preferred provider experiences a transient failure, Gritch can attempt another available provider when appropriate.

⸻

5. Security Over Convenience

AI-generated content must be treated as untrusted input.

Gritch must never construct shell commands by blindly interpolating AI-generated strings.

All command execution should use safe argument-based APIs or equivalent safe abstractions.

⸻

6. Small, Focused Architecture

Each feature should have a clear responsibility.

Avoid turning providers into business-logic containers.

⸻

7. Backward Compatibility

Existing commands should continue working as the architecture evolves.

⸻

8. Test Everything That Matters

Features are not considered complete merely because they compile.

Implementation requires:

* tests
* build verification
* runtime validation where appropriate
* documentation
* clean Git state

⸻

Project Status

Gritch is currently in active development.

The project has completed:

* Milestone 1 — Foundation
* Milestone 2 — Repository Intelligence
* Milestone 3 — AI Repository Intelligence
* Phase 4.1 — Local AI / Ollama provider
* Phase 4.2.3 — Runtime provider orchestration
* Phase 4.2.4 — Provider error normalization and provider contract testing
* Security remediation for AI-generated Git commit command execution

Current repository verification:

Test Files: 28
Tests:      246
Build:      Passing
Git State:  Clean

The current implementation is not presented as a finished platform.

It is the foundation for the larger architecture described in the roadmap.

⸻

Current Features

AI-Powered Git Workflows

Gritch currently provides:

* AI-generated Conventional Commit messages
* AI-powered staged-change reviews
* Commit explanations
* Changelog generation
* Repository inspection

⸻

Repository Intelligence

Gritch can inspect and identify:

* programming languages
* frameworks
* package managers
* build tools
* testing frameworks
* linting tools
* formatting tools
* databases
* ORMs
* monorepos
* workspaces
* project architecture
* repository health

⸻

Multi-Provider AI

Current providers:

* Groq
* Google Gemini / Google AI Studio
* OpenRouter
* Ollama

The provider architecture is intentionally designed so additional providers can be added without rewriting commands.

⸻

Provider Configuration

Gritch supports:

* provider selection
* model selection
* token configuration
* environment configuration
* project-level configuration

⸻

Runtime Provider Fallback

Gritch can distinguish between different categories of provider failures.

Transient failures may include:

* timeouts
* network failures
* HTTP 429
* HTTP 5xx

Terminal configuration failures may include:

* HTTP 400
* HTTP 401
* HTTP 403
* missing credentials

The orchestration layer can use this classification to determine whether another provider should be attempted.

⸻

AI Commands

gritch commit

Generate a Conventional Commit message from the current changes.
gritch commit

The Workflow:
Repository
    ↓
Git changes
    ↓
Repository context
    ↓
AI request
    ↓
Provider orchestration
    ↓
Generated commit message
    ↓
User confirmation
    ↓
Git commit

AI-generated commit messages are treated as untrusted data.

Gritch uses argument-based Git process execution rather than shell interpolation to prevent command injection.

gritch review

Review staged changes with AI.

gritch review

Optional language specification:

gritch review --language typescript

The review system combines the code changes with repository context before requesting an AI review.

gritch explain

Explain a Git commit in plain language.

gritch explain HEAD

Or:

gritch explain <commit-hash>

The goal is to make Git history easier to understand without requiring developers to manually reconstruct the context of a change.

gritch changelog

Generate changelog content between Git references.

gritch changelog v1.0.0 v1.1.0

The AI receives the relevant repository and Git context before generating the changelog.

gritch inspect

Inspect the current repository.

gritch inspect

The inspection engine can report information including:

Languages
Frameworks
Package Manager
Build Tool
Testing Framework
Linting
Formatting
Database
ORM
Architecture
Monorepo
Repository Health
Repository-Aware AI

Repository awareness is one of the defining features of Gritch.

For example, a repository may be detected as:

Languages:
  TypeScript
  JavaScript


Frameworks:
  React
  Express


Package Manager:
  npm


Build Tool:
  Vite


Testing:
  Vitest


Database:
  PostgreSQL


ORM:
  Prisma


Architecture:
  Monorepo


Repository Health:
  Excellent

This information can be passed into AI prompts.

Instead of asking:

Review this diff.

Gritch can provide context closer to:

You are reviewing changes inside a TypeScript
monorepo using React, Express, Prisma,
PostgreSQL, Vite, and Vitest.


Repository context:
...


Git changes:
...

This allows the AI to reason about changes within the environment they actually belong to.

Multi-Provider AI Architecture

Gritch does not bind commands to individual providers.

The architecture follows:

Command
   ↓
AIService
   ↓
Provider Orchestrator
   ↓
Provider Registry
   ↓
AI Provider

Current providers include:

Groq
Gemini
OpenRouter
Ollama

The provider layer abstracts provider-specific:

request construction
authentication
API communication
response parsing
error normalization

This means a command should not need to know whether the underlying model is running:

in the cloud
through an API gateway
through an OpenAI-compatible endpoint
locally through Ollama
Provider Reliability

Provider reliability is an active architectural focus in Milestone 4.

Gritch includes a runtime orchestration layer capable of:

attempting the preferred provider
detecting transient failures
classifying provider errors
attempting another available provider when appropriate
preventing duplicate provider attempts
reporting provider failures clearly

The architecture distinguishes between:

Transient Failure
      ↓
Fallback may be appropriate

and:

Configuration / Authentication Failure
      ↓
Immediate failure may be appropriate

This prevents Gritch from blindly retrying invalid credentials or malformed requests.

Provider Error Normalization

Provider APIs do not always return errors in the same format.

Gritch therefore introduces a canonical provider error representation.

Conceptually:

ProviderError
├── provider
├── errorCode
├── category
├── message
└── isRetriable

This allows higher-level orchestration logic to reason about provider failures without depending entirely on provider-specific error strings.

Timeout Handling

Cloud and local AI requests can become unavailable or hang indefinitely.

Gritch therefore uses shared timeout infrastructure for supported HTTP providers.

The current default timeout is:

30 seconds

Timeout behavior is tested independently and integrated into the provider layer.

Local AI with Ollama

Gritch supports Ollama as a local AI provider.

Example configuration:

GRITCH_PROVIDER=ollama

A local model can then be selected through:

GRITCH_MODEL

For example:

$env:GRITCH_PROVIDER="ollama"
$env:GRITCH_MODEL="qwen2.5-coder:1.5b"

This allows developers to use models running directly on their machine.

A typical local architecture looks like:

Gritch
   ↓
AIService
   ↓
Provider Orchestrator
   ↓
Ollama
   ↓
Local Model

Local model performance depends heavily on:

CPU
GPU
RAM
model size
quantization
operating system
Ollama configuration

Gritch does not assume that local inference will always be faster than cloud inference.

Cloud providers may provide substantially faster inference depending on hardware and model availability.

Supported AI Providers
Groq

Cloud inference provider.

Useful for:

fast inference
development workflows
rapid Git operations
Google Gemini / Google AI Studio

Google's Gemini models can be used through the provider architecture.

OpenRouter

OpenRouter provides access to multiple underlying models through a unified API.

This makes it particularly useful for provider/model flexibility.

Ollama

Local inference through models running on the developer's machine.

Useful for:

privacy
local development
experimentation
offline-oriented workflows
avoiding per-request cloud costs
Installation
Global Installation

Install Gritch globally through npm:

npm install -g gritch

Verify:

gritch --version
Local Development Installation

Clone the repository:

git clone https://github.com/dave-8bit/Gritch.git

Enter the project:

cd Gritch

Install dependencies:

npm install

Build:

npm run build

Run tests:

npm test
Requirements

Gritch requires:

Node.js 18+
npm
Git

For cloud AI:

a supported provider API key

For local AI:

Ollama
at least one compatible model

Recommended development environment:

Node.js 18+
TypeScript 5.x
npm
Git
AI Provider Setup

Gritch supports multiple provider configurations.

You do not need to modify Gritch commands when switching providers.

Groq

PowerShell:

$env:GRITCH_PROVIDER="groq"
$env:GROQ_API_KEY="YOUR_API_KEY"

Linux/macOS:

export GRITCH_PROVIDER=groq
export GROQ_API_KEY=YOUR_API_KEY
Google Gemini

PowerShell:

$env:GRITCH_PROVIDER="gemini"
$env:GEMINI_API_KEY="YOUR_API_KEY"

Linux/macOS:

export GRITCH_PROVIDER=gemini
export GEMINI_API_KEY=YOUR_API_KEY
OpenRouter

PowerShell:

$env:GRITCH_PROVIDER="openrouter"
$env:OPENROUTER_API_KEY="YOUR_API_KEY"

Linux/macOS:

export GRITCH_PROVIDER=openrouter
export OPENROUTER_API_KEY=YOUR_API_KEY
Ollama

Install Ollama:

https://ollama.com/

Then pull a model:

ollama pull qwen2.5-coder:1.5b

Configure Gritch:

PowerShell:

$env:GRITCH_PROVIDER="ollama"
$env:GRITCH_MODEL="qwen2.5-coder:1.5b"

Then:

gritch inspect
gritch review
Environment Variables
Variable	Purpose
GRITCH_PROVIDER	Preferred AI provider
GRITCH_MODEL	Model override
GROQ_API_KEY	Groq authentication
GEMINI_API_KEY	Gemini authentication
OPENROUTER_API_KEY	OpenRouter authentication

Additional provider-specific configuration may be introduced as the provider architecture evolves.

Configuration

Gritch can load project-level configuration from:

gritch.config.json

Example:

{
  "provider": "groq",
  "model": "llama-3.3-70b-versatile",
  "maxTokens": 1024,
  "reviewThreshold": 7,
  "conventionalCommits": true
}
Configuration Priority

Provider configuration follows:

Environment Variables
        ↓
gritch.config.json
        ↓
Default Configuration

Environment variables therefore provide the highest-priority override.

This makes it possible to maintain project defaults while allowing individual developers or CI environments to override provider settings.

Usage

Typical workflow:

cd your-project


gritch inspect


gritch review


gritch commit

A developer can use Gritch without needing to understand the underlying provider architecture.

The provider system is an implementation detail of the AI layer.

Project Architecture

Current architecture:

                         ┌───────────────────┐
                         │      Developer    │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │       Gritch      │
                         │       CLI         │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │     Commands      │
                         └─────────┬─────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
          ┌──────────────────┐          ┌──────────────────┐
          │ Repository       │          │ Git Operations   │
          │ Intelligence     │          │                  │
          └────────┬─────────┘          └────────┬─────────┘
                   │                             │
                   └──────────────┬──────────────┘
                                  ▼
                         ┌───────────────────┐
                         │ Repository Context│
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │   Prompt Builder  │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │    AI Service     │
                         └─────────┬─────────┘
                                   │
                                   ▼
                     ┌───────────────────────────┐
                     │ Provider Orchestrator     │
                     └─────────────┬─────────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │ Provider Registry │
                         └─────────┬─────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
           Groq                Gemini             OpenRouter
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                                   ▼
                                Ollama
                                   │
                                   ▼
                              AI Response
Technology Stack
Primary Language
TypeScript

Gritch is written primarily in TypeScript.

TypeScript provides:

static typing
safer refactoring
explicit interfaces
provider contracts
maintainable architecture
improved developer tooling
Runtime
Node.js

Gritch runs on Node.js.

Node.js provides the runtime required for:

CLI execution
filesystem operations
Git integration
network requests
provider integrations
CLI Framework
Commander.js

Commander is used for:

command registration
command arguments
command options
CLI parsing
Git Integration
simple-git

Gritch uses simple-git for Git operations and repository interaction.

This provides a structured abstraction over common Git operations.

Where direct process execution is required, Gritch uses safe argument-based process APIs rather than interpolating untrusted AI-generated strings into shell commands.

AI Layer

The AI architecture is provider-agnostic.

Core concepts include:

AIRequest
AIResponse
AIProvider
AIService
ProviderRegistry
ProviderOrchestrator
ProviderError

This allows new providers to be integrated without rewriting the command layer.

Testing
Vitest

Gritch uses Vitest for automated testing.

The test suite covers:

repository inspection
provider registry
AI helpers
provider orchestration
provider contracts
timeout behavior
response parsing
configuration
command behavior
security regression tests

Current verified test state:

28 test files
246 tests passing
Security

Security is a first-class requirement.

AI output must always be treated as untrusted input.

During external testing, Gritch identified a command-injection vulnerability in the commit workflow.

The vulnerable pattern was:

execSync(`git commit -m "${message}"`);

Because the message originated from AI output, shell metacharacters could potentially be interpreted as commands.

The implementation was replaced with:

execFileSync(
  'git',
  ['commit', '-m', message],
  { stdio: 'inherit' }
);

This passes the commit message as a single argument without invoking a shell.

Regression tests cover hostile inputs including:

;
&&
|
$()
backticks
quotes
newlines

Security-related changes must include regression tests.

Development

Clone the repository:

git clone https://github.com/dave-8bit/Gritch.git
cd Gritch

Install dependencies:

npm install

Build:

npm run build

Run tests:

npm test
Useful Development Commands

Run tests:

npm test

Build:
Build:

npm run build

TypeScript checking:

npx tsc --noEmit

Run Gritch locally after building:

node dist/index.js
Project Structure

The project is organized around separation of concerns.

src/
│
├── commands/
│   ├── changelog.ts
│   ├── commit.ts
│   ├── explain.ts
│   ├── inspect/
│   └── review.ts
│
├── core/
│   ├── ai/
│   │   ├── helpers/
│   │   ├── providers/
│   │   ├── ai.service.ts
│   │   ├── provider.orchestrator.ts
│   │   ├── provider.registry.ts
│   │   └── ai.types.ts
│   │
│   └── config/
│
├── providers/
│   ├── groq.provider.ts
│   ├── gemini.provider.ts
│   ├── openrouter.provider.ts
│   └── ollama.provider.ts
│
└── utils/

Tests mirror the architectural boundaries:

test/
├── commands/
├── core/
├── inspect/
└── providers/

The exact structure may evolve as the architecture grows.

Roadmap

Gritch is intentionally being developed in milestones.

Milestone 1 — Foundation
Status: Complete

Implemented:

CLI foundation
Commander integration
AI abstraction
configuration loading
Git utilities
core commands
testing infrastructure
Milestone 2 — Repository Intelligence
Status: Complete

Implemented:

repository scanner
folder analysis
Git metadata
project statistics
language detection
framework detection
package manager detection
build tool detection
database detection
ORM detection
testing detection
deployment detection
AI framework detection
monorepo detection
workspace detection
architecture analysis
entry-point detection
configuration discovery
environment discovery
API route discovery
repository health
Milestone 3 — AI Repository Intelligence
Status: Complete

Implemented:

repository-aware commit generation
repository-aware code reviews
commit explanations
changelog generation
shared AI service
provider registry
request builder
shared response helpers
Milestone 4 — Local AI & Provider Ecosystem
Status: In Progress

The objective of Milestone 4 is to make Gritch reliable across multiple AI environments.

Phase 4.1 — Ollama Provider
Status: Complete

Implemented:

Ollama provider
data-driven provider registry
provider selection
GRITCH_PROVIDER
GRITCH_MODEL
shared JSON response parsing
fenced JSON parsing
local model validation
runtime validation with qwen2.5-coder:1.5b
Phase 4.2 — Provider Reliability
Status: In Progress

Implemented:

shared timeout handling
runtime provider orchestration
provider fallback
transient failure classification
canonical provider errors
provider-specific error normalization
provider contract tests
security regression testing around command execution

Continuing areas include:

provider health checks
response timing
retry/backoff strategy
capability representation
additional shared provider behavior
reliability metrics

The exact sequencing may evolve based on implementation findings and real-world testing.

Milestone 5 — LangChain + Persistent Repository Memory
Status: Planned

Milestone 5 moves Gritch from repository-aware AI toward repository memory.

Planned capabilities include:

LangChain Integration

LangChain will provide infrastructure for:

structured AI workflows
reusable chains
retrieval workflows
contextual AI operations
future agent capabilities
SQLite Repository Memory

Gritch will eventually maintain persistent local repository information.

Potential stored information includes:

repository metadata
architecture information
repository indexing information
previous AI interactions
project context
cached analysis
architectural decisions
useful historical context

SQLite is intended to provide lightweight persistent local storage without requiring an external database service.

Repository Context

Future Gritch sessions should not need to rediscover everything from scratch.

The goal is:

Repository
     ↓
Index
     ↓
Persistent Context
     ↓
AI
     ↓
Improved Understanding
Conversation Context

Future versions may support persistent conversational context so developers can interact with Gritch across multiple tasks without losing relevant repository information.

Milestone 6 — VS Code Extension
Status: Planned

Gritch will eventually expand beyond the terminal.

Planned VS Code capabilities include:

VS Code extension
sidebar interface
repository insights
interactive AI
command palette integration
Git-aware AI actions
repository-aware explanations
AI code review
contextual developer workflows

The CLI remains the architectural foundation.

The extension should consume the same core intelligence rather than becoming a completely separate implementation.

Future Architecture

The long-term architecture is expected to evolve toward:

                         Developer
                            │
              ┌─────────────┴─────────────┐
              │                           │
             CLI                     VS Code
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
                    Gritch Application
                            │
                            ▼
                  Repository Intelligence
                            │
                            ▼
                    Repository Index
                            │
                            ▼
                  Persistent Memory
                       SQLite
                            │
                            ▼
                   Context Manager
                            │
                            ▼
                     AI Orchestrator
                            │
             ┌──────────────┼──────────────┐
             │              │              │
           Groq          Gemini        OpenRouter
             │              │              │
             └──────────────┼──────────────┘
                            │
                          Ollama
                            │
                            ▼
                     AI Models / Agents

The architecture is intentionally designed so the user-facing interface can evolve without rewriting the underlying repository and AI infrastructure.

Future Capabilities

The long-term Gritch platform may provide capabilities such as:

Repository Understanding
"Explain how authentication works in this repository."

Gritch should be able to combine:

repository structure
source files
dependencies
architecture
Git history
persistent context

to answer the question.

Change Intelligence
"Review everything changed since the last release."

Gritch could combine:

Git history
repository architecture
previous releases
code changes
AI analysis
Architecture Intelligence
"Where should I add the new payment service?"

Instead of blindly generating code, Gritch should eventually understand the existing architecture and identify appropriate locations.

Persistent Engineering Memory

Over time, Gritch should remember useful repository-level information such as:

Architecture decisions
Coding conventions
Important services
Database structure
Common workflows
Previous explanations
Repository history

This moves Gritch toward an AI system that understands a project over time rather than treating every invocation as a completely new conversation.

Production Direction

Gritch is being developed with production-oriented engineering constraints.

The project prioritizes:

deterministic architecture
provider abstraction
graceful provider failure
local AI support
safe process execution
structured errors
automated testing
backwards compatibility
explicit configuration
minimal unnecessary dependencies
repository-aware context
maintainable TypeScript
clear separation of concerns

The goal is not to make Gritch a demo that happens to call an LLM.

The goal is to build infrastructure that can support real developer workflows.

What Gritch Is Not

Gritch is not intended to be:

merely an AI commit-message generator
permanently tied to one AI provider
a wrapper around a single model
dependent on cloud AI for every operation
an IDE-only assistant
an autonomous coding agent without safeguards

Gritch is intended to become the infrastructure connecting:

Git
+
Repository Intelligence
+
AI Providers
+
Local Models
+
Persistent Memory
+
Developer Interfaces
Design Principles
Provider Agnostic

Commands communicate with the AI service rather than individual providers.

Thin Providers

Providers should primarily:

construct requests
communicate with APIs
parse responses
normalize provider-specific behavior

Business logic belongs above the provider layer.

Shared Utilities

Repeated behavior should be implemented through shared abstractions.

Explicit Failure Handling

Errors should be classified and handled intentionally.

Do not silently hide provider failures.

Security by Design

Untrusted AI output must never be treated as executable shell syntax.

Backward Compatibility

Existing functionality should continue to work as the project evolves.

Small Focused Changes

Each implementation phase should solve a defined problem.

Unrelated refactors should not be mixed into feature work.

Tests Are Part of the Feature

A feature is incomplete without appropriate tests.

Documentation Is Part of the Architecture

The roadmap, implementation guide, and README should accurately represent the actual state of the system.

Contributing

Contributions are welcome.

Areas where contributions may be useful include:

new AI providers
repository detectors
AI integrations
provider reliability
testing
security
performance
Git workflows
CLI improvements
documentation
VS Code integration
local AI support

Before making significant architectural changes, open an issue or discussion to establish the intended direction.

Pull requests should:

maintain existing architecture
include tests where appropriate
avoid unrelated changes
preserve backward compatibility
pass the build
pass the test suite
Development Workflow

Gritch development follows a structured workflow:

1. Inspect
      ↓
2. Understand
      ↓
3. Plan
      ↓
4. Implement
      ↓
5. Test
      ↓
6. Build
      ↓
7. Review
      ↓
8. Commit
      ↓
9. Push

The project strongly favors evidence over assumptions.

A feature is not considered complete merely because an AI agent claims that it works.

Definition of Done

A phase is complete only when:

implementation is complete
relevant tests exist
tests pass
build succeeds
runtime behavior is verified where appropriate
documentation is updated
security implications are considered
changes are committed
changes are pushed
working tree is clean
Project Philosophy

Gritch is being built around a simple idea:

AI should understand the engineering environment before it tries to help engineer it.

A repository is more than a Git diff.

It contains:

architecture
dependencies
conventions
history
tooling
configuration
infrastructure
decisions
patterns

Gritch's job is to progressively make that information useful to AI.

The current CLI is only the beginning.

License

MIT License.

See LICENSE for details.

Author

Developed by Dave Craft.

GitHub:

https://github.com/dave-8bit/Gritch

npm:

https://www.npmjs.com/package/gritch

Project Status

Active Development

Gritch is currently evolving through Milestone 4 toward a broader AI engineering platform.

Current verified baseline:

Milestones 1–3        Complete
Milestone 4           In Progress
Ollama Support        Complete
Provider Orchestration Complete
Provider Error System Complete
Security Remediation  Complete


Tests                  246 passing
Test Files             28
Build                  Passing
Repository              Clean

The architecture will continue to evolve as Gritch moves toward persistent repository memory, deeper AI orchestration, and IDE integration.

<div align="center">
Gritch

Understand the repository. Then let AI help you build it.

</div> ```

