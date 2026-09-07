# Gritch — Implementation Guide
- Retry logic
- Timeout handling
- Consistent provider errors
- Response timing
- Capability groundwork
- Shared provider behavior
- Additional provider tests


Several of these goals have already been implemented as part of the Phase 4.2 development work.


---


## Phase 4.2 Completed Work


### Provider Timeout Infrastructure
Status: ✅ Complete


Implemented:


- Shared `fetchWithTimeout()` helper
- Default fetch timeout
- AbortController-based cancellation
- Timeout error handling
- Timeout tests
- Integration with HTTP-based providers


Providers using the shared timeout infrastructure:


- Ollama
- Gemini
- OpenRouter


Groq continues to use its SDK-based request mechanism.


---


## Runtime Provider Orchestration & Fallback
Status: ✅ Complete


Implemented a provider orchestration layer that allows Gritch to recover from runtime provider failures.


The orchestration layer:


- Attempts the preferred provider first
- Preserves existing provider-selection semantics
- Falls back to other supported providers when appropriate
- Prevents the same provider from being attempted more than once per request
- Handles multiple provider failures
- Produces a bounded final failure
- Preserves the original AI request across provider attempts


All AI commands now use the fallback-capable AI service path:


- `gritch commit`
- `gritch review`
- `gritch changelog`
- `gritch explain`


The orchestration layer is provider-agnostic and does not contain a hardcoded provider chain such as:


`Ollama → Groq`


Instead, provider candidates are derived from the provider registry.


---


## Provider Selection Semantics
Status: ✅ Complete


Existing configuration behavior is preserved.


Configuration precedence remains:


```text
Environment Variables
        ↓
gritch.config.json
        ↓
Default Configuration

GRITCH_PROVIDER represents the preferred provider.

A preferred provider failing at runtime does not necessarily hard-lock Gritch to that provider. Runtime failures may trigger fallback to another viable provider.

This preserves user preference while allowing resilience.

Provider Error Classification

Status: ✅ Complete

The orchestration layer distinguishes between failures that should trigger fallback and failures that should terminate immediately.

Fallback-worthy failures

Examples:

Timeouts
Abort errors
Network failures
ECONNREFUSED
ENOTFOUND
ETIMEDOUT
HTTP 429
HTTP 5xx
Other transient runtime failures
Terminal failures

Examples:

HTTP 400
HTTP 401
HTTP 403
Missing API key
Authentication/configuration failures

Terminal errors are not silently hidden by attempting unrelated providers.

Unknown/unstructured errors retain backward-compatible string-based classification where necessary.

Provider Error Normalization

Status: ✅ Complete

Implemented canonical ProviderError infrastructure.

Provider errors now have structured metadata including:

Provider
Error code
Retriability classification
Human-readable error message

Helper factories provide consistent creation of common provider failures:

HTTP errors
Missing API key errors
Timeout errors
Network errors

The orchestrator checks structured ProviderError metadata first and retains string-based classification as a backward-compatible fallback.

This provides a foundation for future provider health and retry infrastructure.

Provider-Specific Error Handling

Status: ✅ Complete

All four providers have been updated to normalize relevant provider failures:

Groq
Ollama
Gemini
OpenRouter

Provider-specific handling includes:

Authentication failures
Missing configuration
Rate limits
Server failures
Network failures
Timeout failures

Runtime environment values are resolved correctly at request time rather than relying on stale module-load values.

Groq authentication/configuration errors are explicitly normalized so 401/403-style failures are classified correctly.

Provider Contract Tests

Status: ✅ Complete

Provider-specific tests now exist for all four providers:

test/providers/groq.provider.test.ts
test/providers/ollama.provider.test.ts
test/providers/gemini.provider.test.ts
test/providers/openrouter.provider.test.ts

Coverage includes, where applicable:

Successful requests
Missing API keys
Authentication/configuration failures
Rate limiting
Server failures
Network failures
Timeout failures
Provider-specific response behavior

The provider test suite provides a regression boundary around the normalized provider behavior.

Orchestration Tests

Status: ✅ Complete

The provider orchestration test suite contains 19 focused tests covering:

Preferred provider succeeds
Preferred provider failure with fallback
Multiple provider failures
All providers failing
401 terminal behavior
403 terminal behavior
Missing API key terminal behavior
400 terminal behavior
429 fallback
5xx fallback
Network failure fallback
Timeout fallback
Abort fallback
ECONNREFUSED fallback
No duplicate provider attempts
Provider selection preservation
Detailed aggregate errors
Ollama preferred provider falling back successfully
Original request preservation
Phase 4.2 Security Hardening

Status: ✅ Complete

An external developer test of Gritch identified a critical command-injection vulnerability in gritch commit.

Vulnerability

The AI-generated commit message was previously interpolated into a shell command:

execSync(`git commit -m "${message}"`, { stdio: 'inherit' });

Because the message originates from AI output, shell metacharacters could potentially be interpreted as commands.

Examples included:

;
&&
|
$()
backticks
quotes
newlines

This created a command-injection risk.

Remediation

The implementation was changed to use:

execFileSync('git', ['commit', '-m', message], {
  stdio: 'inherit',
});

The commit message is now passed as an argument rather than being interpreted by a shell.

Security Regression Tests

A dedicated test suite was added:

test/commands/commit.test.ts

The tests cover hostile payloads including:

Semicolon injection
&& injection
Pipe injection
Command substitution
Backticks
Double quotes
Single quotes
Newlines
Execution failure
User declining the commit

The audit also searched the production source tree for:

execSync
execFileSync
exec
execFile
spawn
spawnSync
shell.exec
child_process

No additional unsafe command-execution paths were identified.

simple-git remains the Git abstraction and passes command arguments without shell interpolation.

Phase 4.2 Goals — Current Completion State
Goal	Status	Notes
Provider health checks	❌ Not implemented	No provider health API/status tracking yet
Retry logic	🟡 Partially complete	Runtime provider fallback exists; per-provider retry/backoff does not
Timeout handling	✅ Complete	Shared timeout helper implemented and tested
Consistent provider errors	✅ Complete	Canonical ProviderError implemented across providers
Response timing	❌ Not implemented	No response latency metadata/tracking yet
Capability groundwork	❌ Not implemented	No formal provider capability model yet
Shared provider behavior	🟡 Partially complete	Shared helpers and normalized errors exist; further standardization may be needed
Additional provider tests	✅ Complete	Provider-specific contract tests added for all four providers
Phase 4.2 Remaining Work

The following work remains before Phase 4.2 can be considered fully complete.

1. Provider Health Checks

Potential future implementation:

Provider health abstraction
Provider availability state
Health-check mechanism
Configuration/availability detection
Provider health tests
Registry integration where appropriate

Health checks must not introduce unnecessary network requests for every normal AI operation.

2. Proper Retry Logic

Runtime fallback is NOT considered equivalent to per-provider retry logic.

Remaining work may include:

Retry policy
Maximum retry attempts
Retryable error categories
Exponential backoff
Retry delays
Retry budget
Rate-limit handling
Timeout retry policy

Retries must remain bounded.

A provider should not be hammered indefinitely before fallback occurs.

3. Response Timing

Potential implementation:

Measure request duration
Add response timing metadata
Preserve existing response metadata
Avoid exposing unnecessary internal implementation details
Add timing tests
Use timing data for future provider observability

Potential metadata field:

responseTimeMs

Timing must represent meaningful request duration rather than arbitrary internal execution time.

4. Capability Groundwork

Potential provider capabilities include:

Structured output
Streaming
Tool calling
Local/cloud classification
Vision
Context size
Model-specific capabilities

The capability system should remain minimal until an actual feature requires capability negotiation.

Do not build a speculative feature matrix without a concrete consumer.

5. Shared Provider Behavior

Continue reducing provider-specific duplication where justified.

Possible shared concerns:

Request lifecycle
Timeout behavior
Error normalization
Response metadata
Common HTTP handling

Do not introduce a base class solely for abstraction's sake.

Providers should remain thin.

Phase 4.2 Definition of Done

Phase 4.2 is complete only when:

Provider health behavior is implemented where required
Retry behavior is bounded and tested
Timeout handling remains stable
Provider errors are normalized consistently
Response timing is implemented and tested
Capability groundwork is implemented only to the required architectural level
Shared provider behavior is appropriately standardized
All provider-specific tests pass
All orchestration tests pass
Existing tests continue passing
npm test passes
npm run build passes
Runtime behavior is verified
Documentation is updated
Changes are committed
Changes are pushed
Working tree is clean
Milestone 5 — LangChain + SQLite Memory

Status: ⏳ Planned

Milestone 5 moves Gritch from provider reliability into persistent repository intelligence and contextual AI.

Planned capabilities:

LangChain Integration
LangChain integration
Provider-compatible AI workflows
Structured AI chains where justified
Repository-aware AI operations
SQLite Repository Memory
Local SQLite storage
Repository-specific memory
Persistent metadata
Persistent AI context
Memory lifecycle management
Repository Context
Repository context storage
Repository summaries
Architecture context
Project conventions
Relevant file context
Repository Indexing
Repository indexing
Searchable repository context
Incremental indexing
Change-aware context updates
Conversation Context
Persistent conversation context
Command-aware context
Repository-aware context
Context retrieval
Architecture Cache
Cached repository architecture information
Incremental updates
Avoid unnecessary repository rescans
Reuse previously computed intelligence
Milestone 5 Architectural Principle

Memory must be local-first and repository-scoped.

The architecture should avoid turning Gritch into a remote data collection system.

Repository context should be:

Explicit
Inspectable
Persistent locally
Scoped appropriately
Easy to invalidate
Easy to rebuild

SQLite should be introduced as infrastructure, not as an excuse to persist every piece of transient data.

Milestone 6 — VS Code Extension

Status: ⏳ Planned

The VS Code extension is the final major product milestone.

Planned capabilities:

Extension architecture
Sidebar
Repository insights
Gritch commands
Interactive AI
Command palette integration
AI-assisted repository workflows
Provider configuration
Context-aware development assistance

The extension should consume the existing Gritch architecture rather than duplicate CLI business logic.

The CLI remains the core product.

Technology Stack
Language

TypeScript

Runtime

Node.js

CLI

Commander

Git

simple-git

AI Providers
Groq
Gemini
OpenRouter
Ollama
AI Architecture
AI service abstraction
Provider registry
Provider orchestration
Provider fallback
Provider error normalization
Shared response helpers
Shared HTTP timeout infrastructure
Testing

Vitest

Configuration
Environment variables
gritch.config.json
Default configuration
Planned Persistence

SQLite

Planned AI Framework

LangChain

Planned IDE Integration

VS Code Extension API

Architecture

Current high-level architecture:

Repository
    ↓
Commands
    ↓
AI Service
    ↓
Provider Orchestrator
    ↓
Provider Registry
    ↓
Preferred Provider
    ↓
Fallback Providers
    ↓
AI Provider
    ↓
Shared Helpers
    ↓
Normalized AI Response / ProviderError

Repository intelligence operates separately from provider implementation:

Repository
    ↓
Inspection Engine
    ↓
Repository Intelligence
    ↓
Commands / AI Service

Future memory architecture:

Repository
    ↓
Inspection / Indexing
    ↓
Repository Context
    ↓
SQLite Memory
    ↓
AI Service
    ↓
Provider Orchestrator
    ↓
AI Provider
Configuration Priority

Highest Priority:

Environment Variables
        ↓
gritch.config.json
        ↓
Default Configuration

Relevant provider configuration includes:

GRITCH_PROVIDER
GRITCH_MODEL

The preferred provider is a selection preference, not necessarily a permanent runtime lock when fallback is enabled.

Design Principles

The project follows these principles.

Provider Agnostic

No command should depend directly on a specific provider.

Commands communicate with the AI service.

Providers remain interchangeable.

Thin Providers

Provider implementations should primarily:

Build requests
Call provider APIs
Parse provider responses
Normalize provider-specific failures

Business logic belongs in shared services and orchestration layers.

Shared Utilities

Duplicate logic should be avoided.

If multiple providers or commands require identical behavior, create a shared helper where the abstraction is justified.

Reliability Must Be Bounded

Fallback and retry mechanisms must never create uncontrolled request loops.

Every request should have:

Bounded provider attempts
Bounded retries
Clear terminal failure behavior
Useful error reporting
Security First

AI output must be treated as untrusted input.

Never interpolate AI-generated data into shell commands.

Use argument-based process execution APIs or equivalent safe abstractions.

Security-sensitive behavior requires regression tests.

Backward Compatibility

Existing commands should not break.

New functionality should integrate cleanly with the existing architecture.

Public APIs should not change unnecessarily.

Small, Focused Changes

Every implementation should target one clearly defined scope.

Avoid mixing:

Feature work
Unrelated refactors
Documentation restructuring
Dependency changes
Speculative architecture
Testing

Every feature must include tests.

Existing tests must continue passing.

Security fixes require regression tests.

Provider behavior requires provider-specific tests.

Build

Every implementation must compile successfully.

The required verification command is:

npm run build
Documentation Is Part of the Implementation

When the architecture or roadmap changes, documentation must be updated in the same development cycle.

Documentation must describe the actual repository state.

Do not claim a feature is complete based solely on an intended design.

External Validation

Gritch has received external developer testing.

An external developer cloned and tested the current build and specifically evaluated:

AI code review
Ollama integration
qwen2.5-coder
Local model behavior
RAM usage
General usability

The tester reported that:

The AI review functionality was impressive
The Ollama + qwen2.5-coder path worked
Local model RAM usage was relatively low

The external test also identified three actionable issues:

1. Command Injection

Critical security issue in gritch commit.

Status: ✅ Fixed

Remediation:

Replaced shell-interpolated execSync
Added execFileSync
Added security regression tests
Audited production command-execution paths
2. Review Specific Commit

Requested feature:

gritch review <commit-hash>

Status: 📋 Backlog

This should be implemented only after the current reliability phase is appropriately completed or explicitly prioritized.

3. Non-Interactive Terminal Support

Issue:

Animations/spinners can behave incorrectly in dumb/non-interactive terminals, including environments such as Emacs shell mode.

Status: 📋 Backlog

Potential solution:

Detect non-interactive/dumb terminals
Disable animations/spinners
Preserve normal command output

This should be implemented as a focused CLI UX phase rather than mixed into unrelated provider work.

Development Workflow

Every implementation follows this order:

Inspect existing code
Understand architecture
Compare implementation against roadmap
Identify the smallest legitimate scope
Produce an implementation plan
Wait for approval
Implement
Add/update tests
Run npm test
Run npm run build
Perform targeted runtime verification where applicable
Review the diff
Commit
Push
Verify GitHub synchronization
Verify working tree is clean
Update documentation
AI Contributor Rules

Before making code changes:

Inspect first
Never guess architecture
Reuse existing abstractions
Prefer shared helpers
Avoid duplication
Preserve public APIs
Write tests
Compile before finishing
Verify behavior
Keep changes scoped to the requested objective

Do not introduce unrelated refactors.

Do not expand project scope without explicit justification.

Do not rewrite working architecture merely because another abstraction appears theoretically cleaner.

Do not mark roadmap work complete without repository evidence.

Verification Requirements

A phase implementation must provide evidence for:

Tests
npm test

All tests must pass.

Build
npm run build

The TypeScript build must succeed without errors.

Git State
git status

After the implementation is committed and pushed:

working tree clean
branch synchronized with origin
Diff Review

Before committing:

git diff --cached

The staged diff must contain only the intended scope.

Current Metrics

Last verified repository state:

Tests
28 test files
246 tests passing
Build
npm run build

Status:

Passing
Git

Latest verified commit:

ac823ff — fix: protect command injection in commit command

Remote:

origin/main synchronized

Working tree:

Clean
Past — Completed Engineering Work

The project has progressed through:

Milestone 1
Foundation
        ↓
Milestone 2
Repository Intelligence
        ↓
Milestone 3
AI Repository Intelligence
        ↓
Phase 4.1
Ollama / Local AI
        ↓
Phase 4.2
Provider Reliability
        ↓
Timeout Infrastructure
        ↓
Runtime Provider Orchestration
        ↓
Provider Fallback
        ↓
Provider Error Normalization
        ↓
Provider Contract Tests
        ↓
Commit Security Hardening

These are implemented repository capabilities, not necessarily all separate official roadmap phases.

Present — Current Engineering State

Gritch currently has:

A functional AI-powered Git CLI
Repository inspection capabilities
Four AI providers
Local Ollama support
Provider-agnostic command architecture
Preferred-provider configuration
Runtime provider fallback
Timeout handling
Structured provider errors
Provider-specific contract tests
Orchestration tests
Security regression tests
Safe AI-generated Git commit execution
246 passing tests
Passing TypeScript build
Clean GitHub main branch

Phase 4.2 remains in progress because several official reliability goals are still incomplete.

Future — Roadmap
Immediate Future

Complete the remaining legitimate Phase 4.2 reliability work.

Priority areas:

Provider health checks
Proper bounded retry logic
Response timing
Capability groundwork where justified
Further shared provider behavior where justified

Do not implement speculative infrastructure without a concrete consumer.

After Phase 4.2

Move to:

Milestone 5 — LangChain + SQLite Memory

Focus:

Persistent repository context
SQLite memory
Repository indexing
Architecture caching
Conversation context
LangChain integration
After Milestone 5

Move to:

Milestone 6 — VS Code Extension

Focus:

IDE integration
Sidebar
Repository intelligence
Interactive AI
Command palette
Context-aware developer workflows
Feature Backlog

These features are acknowledged but are not currently part of the active implementation scope.

CLI / UX
gritch review <commit-hash>
Dumb-terminal detection
Disable animations in non-interactive environments
Improved terminal output
Provider Ecosystem
Provider health dashboard/status
Provider latency statistics
More advanced capability negotiation
Additional provider integrations
AI Intelligence
More repository-aware commands
Deeper architectural reasoning
Persistent contextual assistance

Backlog items must not be pulled into an active phase without explicit prioritization.

Roadmap
✅ Milestone 1 — Foundation


✅ Milestone 2 — Repository Intelligence


✅ Milestone 3 — AI Repository Intelligence


🚧 Milestone 4 — Local AI & Provider Ecosystem
   ├── ✅ Phase 4.1 — Ollama / Local AI
   └── 🚧 Phase 4.2 — Provider Reliability
       ├── ✅ Timeout handling
       ├── ✅ Runtime provider orchestration
       ├── ✅ Provider fallback
       ├── ✅ Provider error normalization
       ├── ✅ Provider-specific tests
       ├── ❌ Provider health checks
       ├── 🟡 Proper retry logic
       ├── ❌ Response timing
       ├── ❌ Capability groundwork
       └── 🟡 Shared provider behavior


⏳ Milestone 5 — LangChain + SQLite Memory


⏳ Milestone 6 — VS Code Extension
Definition of Done

A phase is complete only when:

Implementation is finished
Scope matches the roadmap
Tests pass
Build succeeds
Runtime behavior is verified where applicable
Security-sensitive behavior is tested
Documentation is updated
Code is reviewed
Code is committed
Code is pushed
Remote branch is synchronized
Repository is clean

A feature must not be marked complete merely because the implementation compiles.

A roadmap item is complete only when its stated requirements have been verified.



### One important thing


I deliberately **did not mark Phase 4.2 complete**. That's the correct call.


Right now your actual state is:


**Past:** orchestration → fallback → timeout → error normalization → provider tests → security fix.  
**Present:** 246 tests, build clean, `main` pushed and clean. Phase 4.2 still has health checks, proper retry behavior, timing, and capability groundwork outstanding.  
**Future:** finish Phase 4.2 → Milestone 5 (LangChain + SQLite) → Milestone 6 (VS Code).


Also, the external tester's findings are now preserved as legitimate product feedback rather than getting mixed into the reliability roadmap. That's important because **`review <commit-hash>` and dumb-terminal support are good features, but they are not excuses to derail the current engineering phase.**