---
name: Type Hints
description: Annotate function, method, struct, and class signatures with type hints whenever the language supports them
---

# Type hints in signatures

When writing or editing code, annotate signatures in any language that has a
type annotation syntax.

## Rules

1. Annotate every function/method parameter and return type, and every
   struct/class field — public APIs and internal helpers alike.
2. Use the language's idiomatic modern syntax:
   - **Python**: builtin generics (`list[str]`, `dict[str, int]`), `X | None`;
     reach for `typing` only for `Protocol`, `TypeVar`, `Self`, etc. Skip
     `self`/`cls`.
   - **TypeScript**: explicit return types on exported functions; never `any` —
     use `unknown` plus narrowing; reuse the project's existing types/aliases.
   - **Rust**: types are inferred; make public API signatures fully explicit and
     prefer concrete types over `impl Trait` in public signatures.
   - **Go / Java / Kotlin / C#**: types are required or idiomatic — follow the
     language and use nullable annotations where the ecosystem has them.
   - **JavaScript**: use JSDoc `@param`/`@returns` only when the project runs
     `checkJs`; otherwise leave it alone.
3. Prefer the project's existing named types over repeating inline structures.
4. Never annotate with a type you can't stand behind: `Any`, `any`, `object`,
   bare `interface{}` only when the value is genuinely unconstrained.
5. Update annotations in the same change that alters a signature.
6. Languages with no annotation system: do nothing — never bolt one on (no
   adding TypeScript to a JS project or RBS/Sorbet to Ruby).
