---
description: Guidelines for creating and maintaining reusable workflows/skills
---

# Creating New Skills/Workflows

## When to Create a New Skill

Create a workflow when you encounter:

1. **Recurring problems** - Issues that took time to debug and will likely happen again
2. **Project-specific patterns** - Unique approaches this project uses
3. **Environment quirks** - Dev setup issues, deployment steps, API gotchas
4. **Complex procedures** - Multi-step processes that are easy to forget
5. **User preferences** - Specific ways the user likes things done

## Skill File Structure

Location: `.agent/workflows/[skill-name].md`

```markdown
---
description: One-line summary of what this skill solves
---

# [Skill Title]

## The Problem
What issue does this skill address?

## Root Cause / Context
Why does this happen? Background info.

## Solution
Step-by-step fix or approach.

## Key Points to Remember
- Quick reference bullets
- Common gotchas
- Important commands
```

## Naming Convention

- Use kebab-case: `browser-sizing-issue.md`
- Be descriptive: `firebase-demo-auth.md` not `auth.md`
- Max 3-4 words

## Triggering Skills

User can invoke with: `/skill-name`
Example: `/browser-sizing-issue`

## Proactive Skill Creation

After solving a tricky problem, ask:
> "Should I create a skill for this so we remember how to handle [X] in future sessions?"

## Existing Skills Index

Update this list when creating new skills:

| Skill | Description |
|-------|-------------|
| `/browser-sizing-issue` | Handle tiny UI in browser automation (devicePixelRatio quirk) |

## Tips

- Keep skills focused on ONE problem
- Include actual commands/code snippets
- Document the "why" not just the "how"
- Reference related files when helpful
