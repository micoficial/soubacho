#!/usr/bin/env bash
# 新しい ZIP（不動産情報ライブラリの全国・全期間の CSV）を、リリース「data-latest」の控えに置き換えて、サイトを作り直す。
# 使い方: GH_TOKEN=<micoficial に書き込めるトークン> bash scripts/refresh-data.sh data/raw/All_20053_20262.zip
#   ZIP は scripts/download-reinfolib.mjs か、国のサイトの画面（全都道府県・すべて・2005年第3四半期〜最新）で取る。
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="micoficial/soubacho"
zip="$1"
name=$(basename "$zip")
[[ "$name" =~ ^All_[0-9]{5}_[0-9]{5}\.zip$ ]] || { echo "ファイル名が All_YYYYQ_YYYYQ.zip ではありません: $name" >&2; exit 1; }
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
unzip -q "$zip" -d "$tmp"
node scripts/check-data.mjs "$tmp"
if ! gh release view data-latest -R "$REPO" > /dev/null 2>&1; then
  gh release create data-latest -R "$REPO" --title "最新の公開データ（控え）" --notes-file scripts/release-notes.md
fi
old=$(gh release view data-latest -R "$REPO" --json assets --jq '.assets[].name')
gh release upload data-latest "$zip" -R "$REPO" --clobber
# 新しい ZIP を置けてから、古い ZIP を消す
for o in $old; do
  [ "$o" = "$name" ] || gh release delete-asset data-latest "$o" -R "$REPO" --yes
done
gh workflow run deploy.yml -R "$REPO" --ref main
echo "控えを $name に差し替え、作り直しを始めました"
