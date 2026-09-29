# .agents/

Everything agents (and humans working with them) write to remember and share
context about this project lives here, not scattered around the repo.

| Folder | What goes in it |
|---|---|
| `docs/` | Project documentation and every update/report generated along the way: overview, technical deep dive, specs (`artifacts/`), proposals and plans (`proposals/`) |
| `context/` | Working memory for agents: decisions taken and why, open questions, notes to pick up next session |

Rules:

- New Markdown docs, plans, reports and update notes go in `.agents/docs/` (never a new top-level `docs/`).
- When a decision is made in a session, add it to `context/decisions.md` (date, decision, reason).
- `CLAUDE.md` and `README.md` stay at the repo root (tools and GitHub read them there) and link here.
- No secrets here, ever: keys live only in `.env` files, which are git-ignored.
