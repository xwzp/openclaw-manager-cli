#!/bin/bash
cd ~/.openclaw || exit 1
git add -A
git diff --cached --quiet || git commit -m "auto-save"
