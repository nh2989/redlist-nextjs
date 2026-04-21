# レッドリスト検索アプリ - プロジェクト現状

最終更新：2026年4月20日
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
│       ├── CategoryStyles.tsx      # カテゴリ色をCSS変数として注入
│       └── PreloadTopoJson.tsx     # 不要（削除候補）
├── lib/
│   ├── categoryConstants.ts        # カテゴリ色・定数・ユーティリティ関数の一元管理
│   └── types.ts                    # 共通型定義（RawSpeciesRecord / Jurisdiction / SpeciesGroup / SourceRecord）
└── public/
    ├── japan.topojson              # 日本地図データ（5%簡略化済み、40KB）※現在未使用
    ├── japan-map.svg               # Geolonia map-mobile.svg（地図表示用）
    └── data/
        ├── sources.json            # 出典メタ情報（id・title・year・url を一元管理）
        ├── national.json           # 環境省 第５次レッドリスト
        ├── shiga_2025.json         # 滋賀県 2025年版（旧 shiga.json から更新）
        ├── kyoto.json              # 京都府
        ├── aichi.json              # 愛知県
        ├── hiroshima.json          # 広島県
        ├── shimane.json            # 島根県（新規）
        ├── fukui.json              # 福井県（新規）
        ├── gifu.json               # 岐阜県（新規）
        ├── mie.json                # 三重県（新規）
        ├── koka.json               # 甲賀市
        └── hikone.json             # 彦根市
```

※ `osaka.json`・`sample.json` は削除済み

---

## 実装済み機能

### ページ構成
- **トップページ** (`/`): 検索条件を入力 → URLパラメータで `/search` に遷移
- **検索結果ページ** (`/search`): 全メインロジック
- **出典一覧ページ** (`/sources`): sources.json を読み込み、機関名・資料名・発行年・URLを表示。都道府県コード順ソート。フッターからリンク

### データ処理
- [x] 11ファイルの並列読み込み（sources.json + 10データJSON、Promise.all）
- [x] sources.json によるメタ情報一元管理（source_id をキーに publication_year 付与）
- [x] 和名ベースのグルーピング（学名の表記ゆれを吸収）
- [x] jurisdiction_type（national / prefecture / municipality）による階層管理
- [x] 別名（species_aliases）の正規化（`|`区切り文字列または配列に対応）
- [x] カテゴリ統一マッピング（EX, EW, CREN, VU, NT, DD, LP, OTHER）
- [x] JIS X 0401 都道府県コードによる並び順
- [x] original_name（出典上の和名）を Jurisdiction に保持
- [x] source_id・publication_year を Jurisdiction に保持

### 検索・フィルター
- [x] 和名 / 別名 / 学名の横断検索
- [x] カテゴリフィルター（EX/EW/CREN/VU/NT/DD/LP/OTHER）
- [x] 都道府県フィルター
- [x] 市町村フィルター（都道府県選択後に動的表示）
- [x] 分類群フィルター
- [x] 複合フィルター（カテゴリ＋都道府県＋市町村の組み合わせ）

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
- 「和名」列：`original_name`（出典上の記載名）を表示
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

※ koka・hikone（市町村）は sources.json 未登録

---

## 既知の課題

### 優先度高
- [ ] `gifu.json` の `category_unified` が空欄の種がある（VU相当のデータ）→ データ修正要
- [ ] `koka.json` / `hikone.json` を sources.json に追加（municipality 対応）
- [ ] モーダルの機関名を sources.json の URL でリンク化（タスク4の残作業）

### 優先度低・将来
- [ ] 市町村フィルターは滋賀県選択時のみ機能（甲賀市・彦根市のみ対応）
- [ ] `PreloadTopoJson.tsx` の削除
- [ ] Supabaseデータベース移行（データが増えたタイミング）
- [ ] Geolonia SVGのライセンス（GFDL）→ 商用化時に自作SVGへ切り替え検討

---

## 次回作業計画

### 完了済みタスク

- [x] **タスク1**：各データJSONの原典チェック（下記参照）
- [x] **タスク2**：`sources.json` の作成と実装（source_id 設計・loadData 統合）
- [x] **タスク3**：モーダルの指定状況テーブルに発行年・和名（出典）列を追加
- [x] **タスク4**：出典一覧ページ `/sources` の実装・フッターにリンク追加

### 残作業順序

```
① モーダルの機関名を URL リンク化（タスク4の残作業・小規模）
      ↓
② gifu.json の category_unified 空欄を修正
      ↓
③ synonyms.json を作成（タスク5）
      ↓
④ loadData に synonyms.json の読み込みを追加
      ↓
⑤ groupBySpecies に synonyms による正規名変換を組み込む
      ↓
⑥ ordinance.json を作成（タスク6）
      ↓
⑦ loadData に ordinance.json の読み込みを追加
      ↓
⑧ UI に条例指定バッジ・フィルターを追加
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

### タスク5：synonyms.jsonの作成とシノニム統合

地域によって異なる名前で登録されている同一種を、正規名に統一してグループ化するためのマスターファイル。

```json
// public/data/synonyms.json
{
  "ミカワタヌキモ": "イトタヌキモ",
  "ホソバノキミズ": "キミズ"
}
```

- **キー**：各JSONに記載されている表記（非正規名）
- **値**：統一する正規名（基本的に環境省の表記に合わせる）
- 環境省に掲載がない種は、より広く使われている表記を正規名とする
- タスク1（原典チェック）で同一種と判明したものを随時追記していく

#### loadData への組み込みイメージ

```typescript
const synonyms: Record<string, string> = await fetch("/data/synonyms.json")
  .then((r) => r.json())
  .catch(() => ({}));

// groupBySpecies内で正規名に変換してからキーにする
const key = synonyms[item.species_name] ?? item.species_name;
```

#### モーダル指定状況テーブルへの影響

シノニム統合後、「和名」列の `original_name` には出典上の記載名がそのまま残るため、
どの自治体がどの名前で登録しているかが確認できる（統合後も元の表記が失われない）。

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
  },
  {
    "species_name": "オビトカゲモドキ",
    "scientific_name": "Goniurosaurus kuroiwae splendens",
    "jurisdiction_name": "鹿児島県",
    "designation_name": "指定希少野生動植物",
    "ordinance_name": "鹿児島県希少野生動植物保護条例",
    "designated_year": 2004,
    "note": "2015年に種の保存法・国内希少野生動植物種に格上げのため実質移行"
  }
]
```

#### 結合キーの設計

- `species_name`（和名）× `jurisdiction_name` の組み合わせで種データと結合
- 条例指定種は数が少ないため、synonym の揺れは手動で名寄せして対応
- 将来的には `scientific_name` を補助キーとして活用できるよう `note` に記録しておく

#### loadData への組み込みイメージ

```typescript
// ordinance.json を他ファイルと並列read込みに追加
const [sourcesRes, ordinanceRes, ...dataResponses] = await Promise.all([
  fetch("/data/sources.json"),
  fetch("/data/ordinance.json").catch(() => null),
  ...dataFiles.map((f) => fetch(f.path).catch(() => null)),
]);

const ordinanceList: OrdinanceRecord[] = ordinanceRes
  ? await ordinanceRes.json().catch(() => [])
  : [];

// (jurisdiction_name::species_name) → OrdinanceRecord のマップ
const ordinanceMap = new Map<string, OrdinanceRecord>();
for (const rec of ordinanceList) {
  const key = `${rec.jurisdiction_name}::${rec.species_name}`;
  ordinanceMap.set(key, rec);
}

// groupBySpecies 内で各 jurisdiction に付与
speciesMap[key].jurisdictions.push({
  // ... 既存フィールド ...
  ordinance: ordinanceMap.get(
    `${item.jurisdiction_name}::${item.species_name}`
  ) ?? null,  // null = 条例指定なし
});
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