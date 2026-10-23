#!/usr/bin/env bash
# 不動産情報ライブラリの CSV（全国・全期間の ZIP）を data/raw/torihiki/ に展開する。
# 国のサイトのダウンロードは画面の操作が要り（公式 API には最寄駅の項目が無い）、海外のサーバーからは
# 取れない可能性もあるため、日本の回線で取った ZIP をリポジトリのリリース「data-latest」に置き、ここではそれを使う。
# 手元に data/raw/All_*.zip があればそれを使う（いちばん新しい期間のもの）。
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data/raw
cd data/raw
zip=$(ls -1 All_*_*.zip 2>/dev/null | sort | tail -1 || true)
if [ -z "$zip" ]; then
  echo "リリース data-latest の控えを取ります" >&2
  gh release download data-latest --pattern 'All_*.zip' --dir . --clobber
  zip=$(ls -1 All_*_*.zip | sort | tail -1)
fi
rm -rf torihiki
mkdir torihiki
unzip -q -o "$zip" -d torihiki
cd ../..
node scripts/check-data.mjs data/raw/torihiki
echo "$zip を展開しました"
