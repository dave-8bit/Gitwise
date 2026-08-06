# TODO — Milestone 4 → Phase 4.2.2 (Shared OpenAI-Compatible Helpers)

- [x] Analyze duplicated logic across Groq, OpenRouter, Ollama
- [x] Create `src/core/ai/helpers/openai-compatible.ts` with:
  - `OpenAICompatibleResponse` type
  - `buildChatMessages()`
  - `extractOpenAICompatibleContent()`
  - `buildOpenAICompatibleMetadata()`
- [x] Refactor `src/providers/groq/groq.provider.ts` to use helpers
- [x] Refactor `src/providers/openrouter/openrouter.provider.ts` to use helpers
- [x] Refactor `src/providers/ollama/ollama.provider.ts` to use helpers
- [x] Add `test/core/ai/helpers/openai-compatible.test.ts`
- [x] Run `npm test`
- [x] Run `npm run build`
