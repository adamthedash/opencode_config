---
name: Error Handling
description: Fail loudly on errors instead of silently falling back, except where the fallback is genuinely the right behavior
---

# Error handling: fail loudly

When something goes wrong, make the failure visible. A silent fallback hides
bugs and turns one clear error into a mystery later.

## Rules

1. Default to failing loudly: propagate errors with context — what operation
   failed, the relevant input or state, and the underlying cause — instead of
   swallowing them.
2. Never catch an error and continue as if nothing happened: no empty
   `except`/`catch`, no ignored error returns, no discarded `Result`.
3. Never replace a failed computation with a default (`0`, `""`, `[]`, `null`,
   `None`, a stale value) without an explicit, justified reason.
4. Use the language's idiomatic error channel (exceptions, `Result`, error
   returns) and propagate through it — do not convert failure into a
   "successful" empty value.
5. A fallback is allowed only when it genuinely makes sense:
   - the fallback is correct behavior (a missing optional config key → empty
     list is fine; a corrupt config file → empty list is not);
   - degradation is intentional and expected (retrying a network call; serving
     a cached value when stale data is acceptable);
   - no recovery is possible and continuing is safer than aborting (cleanup,
     best-effort logging).
   When you fall back deliberately, record why in a comment and surface the
   failure at least as a warning — never in total silence.
6. Wrap errors as they propagate so the final message says what operation
   failed and why, not just the low-level cause.
7. Separate expected conditions from genuine errors: a value that legitimately
   may not parse is an `Option`/nullable for the caller to decide on — that is
   not the same as ignoring a parse failure that should succeed.
8. In cleanup paths, log a cleanup failure rather than letting it replace the
   original error.

## Language idioms

- **Python**: no bare `except:` or `except Exception: pass`; don't return a
  default from a helper whose contract says it parses/loads/reads.
- **Go**: never `_ = err`; check every error return and wrap with `%w` plus
  context.
- **TypeScript/JavaScript**: no empty `catch {}` or `.catch(() => {})`; don't
  resolve with a default to hide a rejection.
- **Rust**: don't `let _ = result` or blanket-`unwrap_or_default()` on
  operations whose failure matters; use `?` and a real error type.
