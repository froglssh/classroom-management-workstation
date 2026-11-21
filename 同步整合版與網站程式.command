#!/bin/zsh
# 雙擊執行：由「示範檔案」最新獨立版重新產生整合版，並更新「獨立程式/」網站副本。
cd -- "$(dirname -- "$0")" || exit 1
/usr/bin/env python3 tools/sync_integrated.py
echo
git status --short | head -20
echo
echo '完成。若上方列出變更，請提交並推送，網站才會更新。'
read -k1 '?按任意鍵關閉此視窗。'
