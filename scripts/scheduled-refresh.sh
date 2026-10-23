#!/usr/bin/env bash
# Windows のタスク スケジューラから週1回呼ぶ：不動産情報ライブラリに新しい四半期のデータが出ていたら、
# 画面からダウンロードして控え（リリース data-latest）を差し替え、サイトを作り直す。新しいデータが無ければ何もしない。
# 動作確認だけするとき: bash scripts/scheduled-refresh.sh --check（国のサイトの最新の時期を見るだけ）
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p data/raw
LOG=data/refresh.log

{
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') 開始 $*"
  if ! GH_TOKEN=$(gh auth token --user mico95official-create); then
    echo "=== 失敗：gh のトークン（mico95official-create）を取れません"
    exit 1
  fi
  export GH_TOKEN
  cur=$(gh release view data-latest -R micoficial/soubacho --json assets --jq '.assets[].name' 2>/dev/null | grep -oE '_[0-9]{5}\.zip$' | grep -oE '[0-9]{5}' | sort | tail -1)
  echo "いまの控え：${cur:-なし}"
  if [ "${1:-}" = "--check" ]; then
    node scripts/download-reinfolib.mjs --current 99999 --out data/raw
    echo "=== 確認だけ（データは更新していません）"
    exit 0
  fi
  if ! out=$(node scripts/download-reinfolib.mjs --current "${cur:-0}" --out data/raw); then
    echo "=== 失敗（国のサイトから取れませんでした。画面が変わったか、準備中の可能性があります）"
    exit 1
  fi
  last=$(echo "$out" | tail -1)
  if [ "$last" = "no-new-data" ]; then
    echo "=== 新しいデータはありません"
    exit 0
  fi
  if bash scripts/refresh-data.sh "$last"; then
    for f in data/raw/All_*.zip; do [ "$f" = "$last" ] || rm -f "$f"; done
    rm -rf data/raw/torihiki
    echo "=== 完了：$last"
  else
    echo "=== 失敗（控えの差し替え）"
  fi
} >> "$LOG" 2>&1
