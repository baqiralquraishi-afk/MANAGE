# GitHub Auto-Sync Rule

## Objective
Whenever the user asks to update, commit, save, or complete any development task (or whenever significant work/features are finished), always stage, commit, and push the changes directly to GitHub so the remote repository stays continuously up to date.

## Execution Pattern
1. Verify working directory status:
   `git status`
2. Stage and commit changes with a descriptive conventional commit message:
   `git add -A; git commit -m "<type>(<scope>): <summary>"`
3. Push directly to GitHub `main` branch:
   `git push origin main`
4. Confirm to the user that the changes have been deployed/updated to GitHub with the commit hash and summary.
