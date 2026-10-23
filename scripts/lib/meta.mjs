// サイト全体で使う定数（サイト名・出典・都道府県・集計のきまり）

export const SITE_NAME = 'まちの相場帳';
export const OPERATOR = '合同会社mico';
export const OPERATOR_ID = '8250003003918';
export const CONTACT = 'mico.95.official@gmail.com';

// 出典（不動産情報ライブラリ利用規約の出典記載例にそろえる。リンクは必ずトップページへ）
export const SOURCE = {
  org: '国土交通省',
  name: '不動産情報ライブラリ',
  url: 'https://www.reinfolib.mlit.go.jp/',
  contents: ['不動産取引価格情報', '成約価格情報'],
};

export const TSUBO = 3.305785; // 1坪あたりの㎡

// [コード, 名前, スラッグ]
export const PREFS = [
  [1, '北海道', 'hokkaido'], [2, '青森県', 'aomori'], [3, '岩手県', 'iwate'], [4, '宮城県', 'miyagi'],
  [5, '秋田県', 'akita'], [6, '山形県', 'yamagata'], [7, '福島県', 'fukushima'], [8, '茨城県', 'ibaraki'],
  [9, '栃木県', 'tochigi'], [10, '群馬県', 'gunma'], [11, '埼玉県', 'saitama'], [12, '千葉県', 'chiba'],
  [13, '東京都', 'tokyo'], [14, '神奈川県', 'kanagawa'], [15, '新潟県', 'niigata'], [16, '富山県', 'toyama'],
  [17, '石川県', 'ishikawa'], [18, '福井県', 'fukui'], [19, '山梨県', 'yamanashi'], [20, '長野県', 'nagano'],
  [21, '岐阜県', 'gifu'], [22, '静岡県', 'shizuoka'], [23, '愛知県', 'aichi'], [24, '三重県', 'mie'],
  [25, '滋賀県', 'shiga'], [26, '京都府', 'kyoto'], [27, '大阪府', 'osaka'], [28, '兵庫県', 'hyogo'],
  [29, '奈良県', 'nara'], [30, '和歌山県', 'wakayama'], [31, '鳥取県', 'tottori'], [32, '島根県', 'shimane'],
  [33, '岡山県', 'okayama'], [34, '広島県', 'hiroshima'], [35, '山口県', 'yamaguchi'], [36, '徳島県', 'tokushima'],
  [37, '香川県', 'kagawa'], [38, '愛媛県', 'ehime'], [39, '高知県', 'kochi'], [40, '福岡県', 'fukuoka'],
  [41, '佐賀県', 'saga'], [42, '長崎県', 'nagasaki'], [43, '熊本県', 'kumamoto'], [44, '大分県', 'oita'],
  [45, '宮崎県', 'miyazaki'], [46, '鹿児島県', 'kagoshima'], [47, '沖縄県', 'okinawa'],
].map(([code, name, slug]) => ({ code, name, slug, short: code === 1 ? '北海道' : name.replace(/[都府県]$/, '') }));
export const PREF_BY_CODE = new Map(PREFS.map((p) => [p.code, p]));

export const AREAS = [
  ['北海道・東北', [1, 2, 3, 4, 5, 6, 7]],
  ['関東', [8, 9, 10, 11, 12, 13, 14]],
  ['中部', [15, 16, 17, 18, 19, 20, 21, 22, 23]],
  ['近畿', [24, 25, 26, 27, 28, 29, 30]],
  ['中国', [31, 32, 33, 34, 35]],
  ['四国', [36, 37, 38, 39]],
  ['九州・沖縄', [40, 41, 42, 43, 44, 45, 46, 47]],
];

// 集計する物件の種類。filter の中身は scripts/lib/stats.mjs の KINDS にある
export const KIND_LABEL = {
  tochi: '土地（住宅地）',
  shogyo: '土地（商業地）',
  mansion: '中古マンション',
  kodate: '戸建て（土地と建物）',
  nochi: '農地',
};

// 集計の期間（四半期の数）。新しい期間で件数が足りなければ、長い期間に広げる
export const WINDOWS = [
  { q: 8, label: '直近2年' },
  { q: 20, label: '直近5年' },
  { q: 40, label: '直近10年' },
];
export const MIN_N = 5; // これより少ない件数では中央値を出さない（個別の取引が分かってしまうのを避ける）
export const PREFER_N = 10; // 短い期間を使うのに必要な件数
export const RANK_MIN_N = 20; // ランキングに載せる最低件数（直近2年）
export const CHANGE_MIN_N = 80; // 値上がり率の計算に必要な件数（比べる両方の期間。比べられた区分の合計）
export const STRATUM_MIN_N = 5; // 値上がり率で、区分（築年数・地区）ごとに必要な件数（両方の期間）
export const DISTRICT_MIN_N = 20; // 地区ページを作る最低件数（直近10年、土地・マンション・戸建ての合計）
export const STATION_MIN_N = 20; // 駅ページを作る最低件数（同上）
export const TREND_FROM = 2008; // 推移のグラフの始まり（2008年第2四半期にほぼ全国が対象になった）

// マンションの築年数の区切り
export const AGE_BANDS_M = [[0, 5, '築5年以内'], [6, 10, '築6〜10年'], [11, 15, '築11〜15年'], [16, 20, '築16〜20年'], [21, 25, '築21〜25年'], [26, 30, '築26〜30年'], [31, 40, '築31〜40年'], [41, 999, '築41年以上']];
// 戸建ての築年数の区切り
export const AGE_BANDS_H = [[0, 2, '新築・築2年以内'], [3, 10, '築3〜10年'], [11, 20, '築11〜20年'], [21, 30, '築21〜30年'], [31, 999, '築31年以上']];
// 土地の広さの区切り（㎡）
export const AREA_BANDS_L = [[30, 100, '100㎡未満（約30坪未満）'], [100, 165, '100〜165㎡（約30〜50坪）'], [165, 250, '165〜250㎡（約50〜75坪）'], [250, 1001, '250㎡以上（約75坪以上）']];
// 駅からの時間の区切り（分）
export const WALK_BANDS = [[0, 5, '5分以内'], [6, 10, '6〜10分'], [11, 15, '11〜15分'], [16, 20, '16〜20分'], [21, 29, '21〜29分'], [30, 254, '30分以上']];
// 間取り（コードは load.mjs の madoriCode）
export const MADORI = ['不明', 'ワンルーム・1K', '1DK・1LDK', '2K・2DK', '2LDK', '3K・3DK', '3LDK', '4LDK以上', 'その他'];
