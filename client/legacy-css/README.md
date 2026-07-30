# Legacy CSS archive

This directory is intentionally outside `client/src`.

- Files under `archive-2026-07-29/` are historical rollback references only.
- Application code must not import files from this directory.
- New UI work must use Tailwind utilities and the tokens defined in `client/src/index.css`.
- Restoring a legacy stylesheet requires an explicit visual-regression justification and review.

The active CSS entrypoint is only `client/src/index.css`, which initializes Tailwind.
