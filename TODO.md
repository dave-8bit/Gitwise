# TODO — Milestone 4 → Phase 4.2.3.1 (Shared Fetch Timeout Helper)

- [x] Create `src/core/ai/helpers/http-timeout.ts` with:
  - `DEFAULT_FETCH_TIMEOUT_MS` shared default constant (same file)
  - `fetchWithTimeout(url, init, timeoutMs?)` using `AbortController`
  - If `init.signal` is provided, preserve it (no signal composition)
  - Otherwise create an `AbortController` for the timeout
  - Always clear the timeout timer
  - Throw a readable timeout error on timeout abort
  - Do not change successful fetch behavior
- [x] Create `test/core/ai/helpers/http-timeout.test.ts` covering:
  - Successful request
  - Timeout abort
  - Timer cleanup (no leaked timeout)
  - Custom timeout override
  - Default timeout behavior
  - Caller-provided signal preserved (no signal composition)
  - Non-timeout errors propagate unchanged
- [x] Run `npm test`
- [x] Run `npm run build`

