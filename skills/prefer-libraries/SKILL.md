---
name: Prefer Existing Libraries
description: Before implementing functionality by hand, look for a suitable stdlib feature or well-maintained library and use it where appropriate
---

# Prefer existing libraries over hand-rolled code

Before writing non-trivial functionality — parsing, serialization, dates,
retries, argument parsing, HTTP, validation, hashing, diffing — look for an
existing solution.

## Rules

1. Search order: language stdlib first, then dependencies already in the
   project (check the manifest/lockfile), then a well-known third-party package.
2. Adopt a third-party package only if it is actively maintained, widely used,
   license-compatible, has a reasonable dependency footprint, and fits the
   ecosystem's conventions.
3. Hand-roll only when the code is trivial (a few lines), the requirements are
   unusual enough that a library adds more risk than it removes, or the project
   deliberately minimizes dependencies.
4. Never add a dependency for something the stdlib already does (URL parsing,
   argument parsing, date arithmetic, JSON, ...).
5. Never copy code out of a library's source — depend on it instead (license).
6. When adding a dependency, follow the project's version-pinning conventions
   and tell the user which library you added and why.
