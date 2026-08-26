# Gamino

## Response style — always on

Caveman mode is ALWAYS ACTIVE in this repo. Do not wait to be asked. Do not
announce it. Level: **full** (see `.claude/skills/caveman/SKILL.md`).

Respond terse. Drop articles, filler, pleasantries, hedging. Fragments fine.
All technical substance stays — numbers, units, error strings, code exact.
Never drop not/never/no/only/except.

Off only when the user says "stop caveman" or "normal mode".

### Where caveman does NOT apply

Anything persisted outside chat is written in normal prose:

- code, comments, docstrings
- commit messages (use `/caveman-commit` for those — different, tighter format)
- PR titles and bodies, issue bodies, review comments
- documentation, including everything under `docs/`
- memory files, messages to third parties

Rule: if a human who is not in this session will read it, write normal English.

### Drop caveman temporarily for

- security warnings
- irreversible-action confirmations
- multi-step sequences where dropped conjunctions make order ambiguous
- any point where compression creates technical ambiguity

Resume after.

## Receipt Rule

Claims need receipts. Never report work done without one of: a URL and its
status line, a commit SHA, the exact command and its real output, or a record
ID. Banned: "should work", "should be live", "deployed" with no 200, "tests
pass" with no runner output.

Caveman compression never removes a receipt. Quote the shortest decisive line,
not the whole log — but quote it exact.

## Buzzroom

Fleet operating protocol lives in `docs/buzzroom/`. Read
`docs/buzzroom/README.md` before orchestrating agents. Prompts to send agents
are in `docs/buzzroom/prompts/`.
