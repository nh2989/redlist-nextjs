# レッドリスト検索アプリ - プロジェクト現状

最終更新：2026年5月29日
リポジトリ：https://github.com/nh2989/redlist-nextjs

---

## 現在地

```
フェーズ0.5 ✅ → フェーズ1 ✅ → フェーズ2 ✅ → フェーズ3 🔲
HTML/JS試作    Next.js移行   機能拡張完了   次の展開
```

---

## ディレクトリ構成（現状）

```
redlist-nextjs/
├── app/
│   ├── page.tsx                    # トップページ（検索フォーム）
│   ├── layout.tsx                  # 共通レイアウト
│   ├── globals.css                 # グローバルスタイル（CSS変数で一元管理）
│   ├── favicon.ico
│   ├── search/
│   │   └── page.tsx                # 検索結果ページ（メインロジック）
│   ├── sources/
│   │   └── page.tsx                # 出典一覧ページ（新規）
│   └── components/
│       ├── SpeciesMap.tsx          # 地図コンポーネント（Geolonia SVG）
│       └── CategoryStyles.tsx      # カテゴリ色をCSS変数として注入
├── lib/
│   ├── categoryConstants.ts        # カテゴリ色・定数・ユーティリティ関数の一元管理
│   └── types.ts                    # 共通型定義（RawSpeciesRecord / Jurisdiction / SpeciesGroup / SourceRecord）
└── public/
    ├── japan.topojson              # 日本地図データ（5%簡略化済み、40KB）※現在未使用
    ├── japan-map.svg               # Geolonia map-mobile.svg（地図表示用）
    └── data/
        ├── sources.json            # 出典メタ情報（id・title・year・url を一元管理）
        ├── synonyms.json           # シノニム（非標準和名 → 標準和名）マスター ★新規
        ├── national.json           # 環境省 第５次レッドリスト
        ├── shiga_2025.json         # 滋賀県 2025年版（旧 shiga.json から更新）
        ├── kyoto.json              # 京都府
        ├── aichi.json              # 愛知県
        ├── hiroshima.json          # 広島県
        ├── shimane.json            # 島根県
        ├── fukui.json              # 福井県
        ├── gifu.json               # 岐阜県
        ├── mie.json                # 三重県
        ├── koka.json               # 甲賀市
        └── hikone.json             # 彦根市
```

※ `osaka.json`・`sample.json` は削除済み

---

## 実装済み機能

### ページ構成
- **トップページ** (`/`): カテゴリ・都道府県の複数選択フィルター付き検索フォーム → URLパラメータで `/search` に遷移。都道府県リストは sources.json から動的取得
- **検索結果ページ** (`/search`): 全メインロジック
- **出典一覧ページ** (`/sources`): sources.json を読み込み、機関名・資料名・発行年・URLを表示。都道府県コード順ソート。フッターからリンク

### データ処理
- [x] 11ファイルの並列読み込み（sources.json + synonyms.json + 10データJSON、Promise.all）
- [x] sources.json によるメタ情報一元管理（source_id をキーに publication_year 付与）
- [x] synonyms.json による非標準和名の正規名変換（グルーピング前に適用）
- [x] 非標準和名を species_aliases に自動追加（別名検索に対応）
- [x] 和名ベースのグルーピング（学名の表記ゆれを吸収）
- [x] jurisdiction_type（national / prefecture / municipality）による階層管理
- [x] 別名（species_aliases）の正規化（`|`区切り文字列または配列に対応）
- [x] カテゴリ統一マッピング（EX, EW, CREN, VU, NT, DD, LP, OTHER）
- [x] JIS X 0401 都道府県コードによる並び順
- [x] original_name（出典上の和名）を Jurisdiction に保持
- [x] source_id・publication_year を Jurisdiction に保持

### 検索・フィルター
- [x] 和名 / 別名 / 学名の横断検索
- [x] 非標準和名（シノニム）での検索にも対応（aliases 経由）
- [x] カテゴリフィルター（EX/EW/CREN/VU/NT/DD/LP/OTHER）**複数選択対応**
- [x] 都道府県フィルター（**環境省を含む**）**複数選択対応**
- [x] 市町村フィルター（都道府県選択後に動的表示）
- [x] 「市町村を含む」チェックボックス（都道府県選択時に表示・市町村選択時は自動ON）
- [x] 分類群フィルター
- [x] 複合フィルター（カテゴリ＋都道府県＋市町村の組み合わせ）
- [x] トップページでも同一フィルター（複数選択）を使用可能
- [x] URLパラメータで複数値を引き継ぎ（`?category=EX&category=VU` 形式）

### UI
- [x] オートコンプリート（↑↓・Enter・Escキーボード操作対応）
- [x] 検索クリアボタン（×）
- [x] ソート（種名・カテゴリ希少性順・指定箇所数・学名）
- [x] カード表示（国 / 都道府県 / 市町村を階層別にバッジ表示）
- [x] カテゴリ別色分けバッジ
- [x] モーダル詳細表示（学名・分類群・環境省ステータス・指定状況テーブル）
- [x] 地図表示（都道府県データがある種のみ、モーダル内）

### モーダル指定状況テーブル（現在の列構成）

**都道府県・市町村テーブル：**
| 機関 | 和名 | 統一カテゴリ | 出典カテゴリ | 発行年 |
|------|------|------------|------------|--------|

- 「機関」列：現在はテキストのみ（URLリンク化は未実装 → タスク4残作業）
- 「和名」列：`original_name`（出典上の記載名）を表示。シノニム統合後も元の表記が確認できる
- 「統一カテゴリ」：`CATEGORY_LABEL` によるバッジ表示
- 「出典カテゴリ」：元の文字列をそのまま表示
- 「発行年」：`sources.json` の `publication_year` を参照（未設定は「—」）

### 地図
- [x] Geolonia map-mobile.svg による地図表示（react-simple-maps廃止）
- [x] 都道府県ごとのカテゴリ色塗り分け（最高優先カテゴリで着色）
- [x] 凡例（地図右側に縦並び表示）
- [x] SVGモジュールレベルキャッシュ（2回目以降のモーダル開閉でfetchゼロ）

### パフォーマンス
- [x] 都道府県→カラーマップのメモ化（useMemo）

### スタイル・コード品質
- [x] CSS変数による色の一元管理（globals.css の `:root`）
- [x] ブランドカラーをフラット単色（`#4a6fa5`）に統一
- [x] `categoryConstants.ts` でカテゴリ色・優先順位・マッピング・都道府県コードを一元管理
- [x] `CategoryStyles.tsx` でTS側の色定義をCSS変数として注入（二重管理の解消）
- [x] TypeScript 型定義整備（`lib/types.ts`）

---

## データJSON構造（現行スキーマ）

```json
{
  "id": "1",
  "species_name": "ヒモヅル",
  "species_aliases": "別名1|別名2",
  "scientific_name": "Lycopodium casuarinoides",
  "taxonomy": "維管束植物",
  "jurisdiction_name": "滋賀県",
  "jurisdiction_type": "prefecture",
  "parent_prefecture": null,
  "category": "絶滅(EX)",
  "category_unified": "EX"
}
```

※ `publication_year` は JSON には持たせず `sources.json` で一元管理

---

## sources.json 登録済み出典

| id | 機関 | 発行年 |
|----|------|--------|
| national | 環境省 | 2025-2026 |
| shiga_2025 | 滋賀県 | 2026 |
| kyoto | 京都府 | 2021-2025 |
| aichi | 愛知県 | 2026 |
| hiroshima | 広島県 | 2022 |
| shimane | 島根県 | 2026 |
| fukui | 福井県 | 2016 |
| gifu | 岐阜県 | 2026 |
| mie | 三重県 | 2024 |
| koka | 甲賀市 | - |
| hikone | 彦根市 | - |

---

## 既知の課題

### 優先度低・将来
- [ ] 市町村フィルターは滋賀県選択時のみ機能（甲賀市・彦根市のみ対応）
- [ ] Supabaseデータベース移行（データが増えたタイミング）
- [ ] Geolonia SVGのライセンス（GFDL）→ 商用化時に自作SVGへ切り替え検討

---

## 次回作業計画

### 完了済みタスク

- [x] **タスク1**：各データJSONの原典チェック
- [x] **タスク2**：`sources.json` の作成と実装（source_id 設計・loadData 統合）
- [x] **タスク3**：モーダルの指定状況テーブルに発行年・和名（出典）列を追加
- [x] **タスク4**：出典一覧ページ `/sources` の実装・フッターにリンク追加
- [x] **タスク5**：`synonyms.json` の作成とシノニム統合

### 残作業順序

```
① ordinance.json を作成（タスク6）
      ↓
② loadData に ordinance.json の読み込みを追加
      ↓
③ UI に条例指定バッジ・フィルターを追加
```

---

### タスク1：各データJSONの原典チェック（進捗）

各JSONを原典PDFと照合し、種名・学名・カテゴリの表記が原記載に忠実かを確認する。
**`publication_year` はJSONには追加しない**（`sources.json` で一元管理するため）。

| ファイル | 状態 |
|---------|------|
| national.json | ✅ 済 |
| shiga_2025.json | ✅ 済（旧shiga.json から更新、学名列削除） |
| kyoto.json | ✅ 済 |
| aichi.json | ✅ 済 |
| hiroshima.json | ✅ 済 |
| osaka.json | ✅ 削除済み |
| fukui.json | ✅ 済 |
| shimane.json | ✅ 済 |
| gifu.json | ✅ 済 |
| mie.json | ✅ 済 |
| koka.json | ✅ 済 |
| hikone.json | ✅ 済 |

---

### タスク5：synonyms.jsonの作成とシノニム統合 ✅

地域によって異なる名前で登録されている同一種を、正規名に統一してグループ化するためのマスターファイル。

#### シノニム収集の方法

1. **学名一致チェック**：各JSONを横断し、同一学名に複数の和名が存在するケースを抽出（7件検出）
2. **YList照合**：[YList（米倉・梶田, 2003-）](http://ylist.info/)の標準和名データベース（2021年版）と照合し、各JSONの種名が別名（非標準和名）に該当するケースを自動検出（144件ヒット）
3. **精査・除外**：
   - 同名別種（ホモニム）のケースは除外（例：オキナグサ → キンポウゲ科が通常だが、クサスギカズラ科でも使われる）
   - 片方がシソ科の標準和名として独立している場合は除外（例：ミズトラノオ）
   - 環境省 national.json に掲載がある場合はその表記を正規名として優先

#### 登録内容（24件）

```json
{
  "エンシュウツリフネ": "エンシュウツリフネソウ",
  "イトタヌキモ": "ミカワタヌキモ",
  "コバイモ": "ミノコバイモ",
  "ミスミソウ（狭義のオオミスミソウおよびケスハマソウを含む）": "ミスミソウ",
  "ニッコウキスゲ": "ゼンテイカ",
  "アイヅシモツケ": "アイズシモツケ",
  "ウスキムヨウラン": "ウスギムヨウラン",
  "キヨズミウツボ": "キヨスミウツボ",
  "セキコク": "セッコク",
  "ナンバンカモメラン": "ナンバンカゴメラン",
  "ミクラジマトウヒレン": "ミクラシマトウヒレン",
  "モクビャクコウ": "モクビャッコウ",
  "スズメハコベ": "スズメノハコベ",
  "ベニバナツクバネウツギ": "ベニバナノツクバネウツギ",
  "ホソバツルリンドウ": "ホソバノツルリンドウ",
  "ホソバヤマハハコ": "ホソバノヤマハハコ",
  "ホテイアツモリ": "ホテイアツモリソウ",
  "ミズタカモジ": "ミズタカモジグサ",
  "ミツバヒヨドリ": "ミツバヒヨドリバナ",
  "ホザキノヤドリギ": "ホザキヤドリギ",
  "ヨナグニカモメヅル": "ヨナクニカモメヅル",
  "オオマルバノコンロンソウ": "オオマルバコンロンソウ",
  "キビナワシロイチゴ": "キビノナワシロイチゴ",
  "チシマネコノメ": "チシマネコノメソウ"
}
```

#### 実装の仕組み

```typescript
// loadData内：Promise.all に synonyms.json を追加
const [sourcesRes, synonymsRes, ...dataResponses] = await Promise.all([
  fetch("/data/sources.json"),
  fetch("/data/synonyms.json").catch(() => null),
  ...dataFiles.map((f) => fetch(f.path).catch(() => null)),
]);

const synonyms: Record<string, string> = synonymsRes
  ? await synonymsRes.json().catch(() => ({}))
  : {};

// groupBySpecies のシグネチャ変更
function groupBySpecies(
  data: RawSpeciesRecord[],
  synonyms: Record<string, string>
): SpeciesGroup[]

// 正規名に変換してからキーにする
const key = synonyms[item.species_name] ?? item.species_name;

// シノニム変換された元の名前を aliases に追加（別名検索に対応）
if (synonyms[item.species_name] && !speciesMap[key].species_aliases.includes(item.species_name)) {
  speciesMap[key].species_aliases.push(item.species_name);
}
```

#### 運用方針
- データ拡充に伴い随時追記する
- 正規名の優先順位：①環境省掲載表記 > ②YList標準和名 > ③広く使われている表記
- 同名別種（ホモニム）はシノニム登録せず、各JSONの記載名のまま独立させる
- 今回保留した YList 検出の大幅改名ケース（例：ミズトラノオ、各種分類改訂名）は
  新データ追加時に都度判断する

---

### タスク6：条例指定希少野生動植物の実装

#### 概要

都道府県条例に基づく「指定希少野生動植物」をレッドリストとは別ファイルで管理し、
検索・表示時に法的保護の有無を明示できるようにする。

#### 背景・設計方針

- レッドリスト（学術評価）と条例指定（法令）は**更新サイクルが異なる**ため別ファイル管理
  - レッドリスト：改訂時（5〜10年ごと）
  - 条例指定：指定追加・解除の都度（種の保存法への格上げで解除されるケースあり）
- 令和7年11月時点で**36都道府県**が希少野生生物保護条例を制定
- 1県あたりの指定種数は数種〜数十種（レッドリストより大幅に少ない）

#### ファイル構造

```json
// public/data/ordinance.json
[
  {
    "species_name": "イタセンパラ",
    "scientific_name": "Acheilognathus longipinnis",
    "jurisdiction_name": "愛知県",
    "designation_name": "指定希少野生動植物",
    "ordinance_name": "愛知県自然環境の保全及び緑化の推進に関する条例",
    "designated_year": 2004,
    "note": ""
  }
]
```

#### 結合キーの設計

- `species_name`（和名）× `jurisdiction_name` の組み合わせで種データと結合
- 条例指定種は数が少ないため、synonym の揺れは手動で名寄せして対応
- 将来的には `scientific_name` を補助キーとして活用できるよう `note` に記録しておく

#### loadData への組み込みイメージ

```typescript
const [sourcesRes, synonymsRes, ordinanceRes, ...dataResponses] = await Promise.all([
  fetch("/data/sources.json"),
  fetch("/data/synonyms.json").catch(() => null),
  fetch("/data/ordinance.json").catch(() => null),
  ...dataFiles.map((f) => fetch(f.path).catch(() => null)),
]);

const ordinanceList: OrdinanceRecord[] = ordinanceRes
  ? await ordinanceRes.json().catch(() => [])
  : [];

const ordinanceMap = new Map<string, OrdinanceRecord>();
for (const rec of ordinanceList) {
  const key = `${rec.jurisdiction_name}::${rec.species_name}`;
  ordinanceMap.set(key, rec);
}
```

#### 型定義（lib/types.ts への追加）

```typescript
export interface OrdinanceRecord {
  species_name: string;
  scientific_name: string;
  jurisdiction_name: string;
  designation_name: string;
  ordinance_name: string;
  designated_year: number | null;
  note: string;
}

// Jurisdiction 型に追加
ordinance: OrdinanceRecord | null;
```

#### UI表示仕様

- **検索カード**：条例指定がある自治体が1つでもある種に「🔒 条例指定あり」バッジを追加
- **モーダル指定状況テーブル**：条例指定のある行の機関名セルに「🔒」アイコン＋条例名をツールチップまたは括弧書きで表示
- **フィルター**：「条例指定のみ表示」チェックボックスを追加（任意・後回し可）

---

## 技術メモ

### 色管理の仕組み
```
categoryConstants.ts（CATEGORY_COLORS）
  ↓ import
CategoryStyles.tsx → <style> タグで :root に CSS変数を注入
  ↓
globals.css の .category-* クラスが var(--color-cat-*) を参照
```

### 地図の仕組み
```
public/japan-map.svg（Geolonia map-mobile.svg）
  ↓ fetch & モジュールレベルキャッシュ（svgCache 変数）
SpeciesMap.tsx → DOMに挿入後 data-code 属性でprefを特定
  ↓
categoryConstants.ts の CODE_TO_PREF & getCategoryColor で色を適用
```

### sources.json の仕組み
```
public/data/sources.json
  ↓ loadData で並列fetch
sourceMap（id → SourceRecord）を State に保持
  ↓
各レコードに source_id・publication_year を付与（既存JSONは編集不要）
  ↓
Jurisdiction.publication_year としてモーダルテーブルに表示
  ↓
/sources ページでも同 sources.json を fs.readFile で参照
```

### synonyms.json の仕組み
```
public/data/synonyms.json（非標準和名 → 標準和名）
  ↓ loadData で sources.json と並列fetch
synonyms（Record<string, string>）として保持
  ↓
groupBySpecies(data, synonyms) に引数として渡す
  ↓
const key = synonyms[item.species_name] ?? item.species_name;
でグループキーを正規名に統一
  ↓
変換された元の名前は species_aliases に自動追加
→ 非標準和名での検索にも対応
```

### フィルターの仕組み
```
カテゴリ・都道府県フィルター：string[] で管理（複数選択対応）
  ↓
トップページ：params.append("category", cat) で複数値をURLに付与
  ↓
検索ページ：searchParams.getAll("category") で配列として受け取り
  ↓
filterResults：species.jurisdictions.some(j => matchCat && matchPref && matchMuni)
で全フィルターを統合判定（AND条件）
  ↓
filterJurisdictionsForDisplay：カード・モーダルの表示自治体を同条件で絞り込み

都道府県選択時の市町村制御：
- includeMunicipalities（bool）で parent_prefecture 一致を含むか制御
- 市町村ドロップダウンで選択時は自動で true にセット
- 市町村データがある都道府県選択時のみチェックボックスを表示

都道府県リスト（トップページ）：
- sources.json を fetch し jurisdiction_type === "prefecture" で抽出
- PREFECTURE_CODES でソート → データ追加時に自動反映
```

### tsconfig.json のパス設定
```json
"paths": { "@/*": ["./*"] }
```
`lib/categoryConstants.ts` は `@/lib/categoryConstants` でimport可能。

---

## データ拡充の優先順位（将来）

| 優先度 | 県 | 入手方法 |
|--------|-----|---------|
| 高 | 宮城・福島・栃木・埼玉・千葉・長野・静岡・高知・鹿児島 | Excel入手可能 |
| 中 | 東京・神奈川・兵庫 | PDF（構造化しやすい） |
| 低 | その他PDF県 | PDF（難度高） |

---

## 地図パフォーマンス追加改善候補

1. mapshaperでTopoJSON間引き（10〜20%に簡略化 → ファイルサイズ・描画頂点数削減）
2. SVG→Canvas描画切り替え（DOM要素削減、ライブラリ変更必要）