---
name: Doc Comments
description: Ensure every function, struct, and class carries a doc comment in the language's idiomatic style
---

# Doc comments

Every function, method, struct, and class you write or modify gets a doc
comment.

## Rules

1. Use the language's idiomatic syntax and match the repo's existing style
   first: Python docstrings (Google or reST — follow the repo), JSDoc/TSDoc in
   JS/TS, `///` or `/** */` in Rust, `// Name ...` in Go, XML docs in C#,
   KDoc/Javadoc in Kotlin/Java.
2. Content: a one-line summary of what it does and why it exists; document
   every parameter, the return value, and errors/raises/panics when applicable.
3. Do not restate the signature — no `@param foo {string} - a string`.
4. Public API: always complete. Internal helpers: at minimum a one-liner.
5. Skip trivial getters/setters only where the repo convention does.
6. Update the doc comment in the same change that alters behavior, parameters,
   return values, or errors.
