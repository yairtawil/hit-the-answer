---
name: push-it
description: Stage all changes, commit with auto-generated message, and push to remote
allowed-tools: Bash(git *), Grep, Read, Glob
---

Stage all changes, create a commit with a descriptive message, and push to the remote.

Steps:
1. Run `git status` and `git diff --stat` to see what changed
2. Run `git add .` to stage everything
3. Generate a concise commit message summarizing the changes
4. Commit with the message (include Co-Authored-By trailer)
5. Push to the remote

Do NOT ask for confirmation — just do it.
