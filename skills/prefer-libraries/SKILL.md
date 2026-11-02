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
6. Always ask the user before adding a dependency — never add one silently,
   including via package-manager commands that touch the manifest or lockfile.
   When proposing it, provide:
   - what the library does and why you want to use it (including what the
     alternative — hand-rolling or a different library — would look like),
   - a link to its repository or homepage (and docs, when useful),
   - its license, maintenance status, and dependency footprint,
   - exactly where it would be added (manifest, version).
   Only add the dependency after the user approves. If no repository or
   homepage can be found, say so. When adding, follow the project's
   version-pinning conventions.
