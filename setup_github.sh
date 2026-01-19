#!/bin/bash
# Remove old git configuration and script
rm -rf .git
rm fix_git.sh

# Re-initialize git
git init

# Rename branch to main
git branch -M main

# Add remote
git remote add origin https://github.com/Anurag-6799/Redis-Radar

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Push to remote (force to overwrite if remote is not empty)
git push -u origin main --force

echo "Git repository reset and pushed to GitHub successfully!"
