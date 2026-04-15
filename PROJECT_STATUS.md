# レッドリスト検索アプリ - プロジェクト現状

最終更新：2026年3月30日
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
│   └── components/
│       ├── SpeciesMap.tsx          # 地図コンポーネント（Geolonia SVG）
│       ├── CategoryStyles.tsx      # カテゴリ色をCSS変数として注入
│       └── PreloadTopoJson.tsx     # 不要（削除候補）
├── lib/
│   └── categoryConstants.ts        # カテゴリ色・定数・ユーティリティ関数の一元管理
└── public/
    ├── japan.topojson              # 日本地図データ（5%簡略化済み、40KB）
    ├── japan-map.svg               # Geolonia map-mobile.svg（地図表示用）
    └── data/
        ├── national.json           # 環境省（国）
        ├── sample.json             # 用途確認要（nationalと重複？）
        ├── shiga.json              # 滋賀県
        ├── kyoto.json              # 京都府
        ├── osaka.json              # 大阪府
        ├── aichi.json              # 愛知県
        ├── hiroshima.json          # 広島県
        ├── koka.json               # 甲賀市
        └── hikone.json             # 彦根市
```

---

## 実装済み機能

### ページ構成
- **トップページ** (`/`): 検索条件を入力 → URLパラメータで `/search` に遷移
- **検索結果ページ** (`/search`): 全メインロジック

### データ処理
- [x] 9ファイルの並列読み込み（Promise.all）
- [x] 和名ベースのグルーピング（学名の表記ゆれを吸収）
- [x] jurisdiction_type（national / prefecture / municipality）による階層管理
- [x] 別名（species_aliases）の正規化（`|`区切り文字列または配列に対応）
- [x] カテゴリ統一マッピング（EX, EW, CR, EN, CR+EN, VU, NT, DD, OTHER）
- [x] JIS X 0401 都道府県コードによる並び順

### 検索・フィルター
- [x] 和名 / 別名 / 学名の横断検索
- [x] カテゴリフィルター（9段階 + OTHER）
- [x] 都道府県フィルター
- [x] 市町村フィルター（都道府県選択後に動的表示）
- [x] 分類群フィルター
- [x] 複合フィルター（カテゴリ＋都道府県＋市町村の組み合わせ）

### UI
- [x] オートコンプリート（↑↓・Enter・Escキーボード操作対応）
- [x] 検索クリアボタン（×）
- [x] ソート（種名・カテゴリ希少性順・指定箇所数・学名）
- [x] カード表示（国 / 都道府県 / 市町村を階層別に表示）
- [x] カテゴリ別色分けバッジ（EX/EW/CR/EN/VU/NT/DD/OTHER）
- [x] モーダル詳細表示（学名・分類群・指定状況テーブル）
- [x] 地図表示（都道府県データがある種のみ、モーダル内）

### 地図
- [x] Geolonia map-mobile.svg による地図表示（react-simple-maps廃止）
- [x] 都道府県ごとのカテゴリ色塗り分け
- [x] 凡例（地図下部に横並び表示）
- [x] SVGモジュールレベルキャッシュ（2回目以降のモーダル開閉でfetchゼロ）

### パフォーマンス
- [x] TopoJSONローカル配信・5%簡略化（415KB → 40KB）※現在はjapan-map.svgを使用
- [x] 都道府県→カラーマップのメモ化（useMemo）

### スタイル・コード品質
- [x] CSS変数による色の一元管理（globals.css の `:root`）
- [x] ブランドカラーをフラット単色（`#4a6fa5`）に統一・グラデーション廃止
- [x] `categoryConstants.ts` でカテゴリ色・優先順位・マッピング・都道府県コードを一元管理
- [x] `CategoryStyles.tsx` でTS側の色定義をCSS変数として注入（二重管理の解消）

---

## データJSON構造

```json
{
  "species_name": "ヒモヅル",
  "species_aliases": "別名1|別名2",
  "scientific_name": "Lycopodium casuarinoides",
  "taxonomy": "維管束植物",
  "jurisdiction_name": "滋賀県",
  "jurisdiction_type": "prefecture",
  "parent_prefecture": null,
  "category": "絶滅(EX)",
  "category_unified": "絶滅（EX）"
}
```

---

## 既知の課題・次回作業候補

### 優先度高
- [x] `page.tsx` 内の `getCategoryClass` 関数を削除し `categoryConstants.ts` のimportに統一
- [x] `national.json` の `category_unified` が空欄 → データ修正が必要
- [x] 分類群フィルターの選択肢が「植物」だが、データは「維管束植物」→ 不一致

### 優先度中
- [x] `sample.json` の用途確認・削除（national.jsonと重複の可能性）
- [x] `PreloadTopoJson.tsx` の削除（Geolonia SVG移行後は不要）
- [x] 不要なVercelプロジェクトの削除（`ugck`、`vuz5`、`6pkh`）
- [x] TypeScriptの `any` 型が多用されている（型定義の整備）

### 優先度低・将来
- [ ] 市町村フィルターは滋賀県選択時のみ機能（甲賀市・彦根市のみ対応）
- [ ] データ拡充（新しい都道府県の追加）
- [ ] Supabaseデータベース移行（データが増えたタイミング）
- [ ] Geolonia SVGのライセンス（GFDL）→ 商用化時に自作SVGへ切り替え検討

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
  ↓ fetch & キャッシュ
SpeciesMap.tsx → DOMに挿入後 data-code属性でprefを特定
  ↓
categoryConstants.ts の CODE_TO_PREF & getCategoryColor で色を適用
```

### tsconfig.json のパス設定
```json
"paths": { "@/*": ["./*"] }
```
`lib/categoryConstants.ts` は `@/lib/categoryConstants` でimport可能。

---

## 次回作業計画

### 作業概要
1. 各データJSONの原典チェック
2. `sources.json` の作成と実装（source_id設計を含む）
3. モーダルの指定状況テーブルに発行年を表示
4. 出典一覧ページの実装
5. `synonyms.json` の作成とシノニム統合
6. 条例指定希少野生動植物の実装（`ordinance.json` 別ファイル管理）

---

### タスク1：各データJSONの原典チェック

各JSONを原典PDFと照合し、種名・学名・カテゴリの表記が原記載に忠実かを確認する。
**`publication_year` はJSONには追加しない**（`sources.json` で一元管理するため）。

対象ファイル：
`national.json` 済 / `shiga.json` 学名削除 / `kyoto.json` 済 / `osaka.json` / `aichi.json` 済 / `hiroshima.json` 済 / `koka.json` / `hikone.json`
`fukui.json` 追加 / `simane.json` 追加

---

### タスク2：sources.jsonの作成

各データソースのメタ情報を一元管理するファイル。**`id`（ファイル名ベース）をキー**として各JSONと紐づける。

#### source_id の設計方針

- `source_id` はJSONファイル名（拡張子なし）をそのまま使う（`"shiga"`、`"national"` など）
- **既存のJSONファイルは編集不要**。`loadData` がfetch時に付与する
- 将来同一都道府県の新版を追加する場合は `shiga_2025.json` など別ファイルとして追加し、`source_id: "shiga_2025"` で区別する

```json
// public/data/sources.json
[
  {
    "id": "national",
    "jurisdiction_name": "環境省",
    "jurisdiction_type": "national",
    "title": "環境省レッドリスト2020",
    "publication_year": 2020,
    "publisher": "環境省",
    "url": "https://www.env.go.jp/nature/kisho/hozen/redlist.html"
  },
  {
    "id": "shiga",
    "jurisdiction_name": "滋賀県",
    "jurisdiction_type": "prefecture",
    "title": "滋賀県レッドデータブック2020",
    "publication_year": 2020,
    "publisher": "滋賀県",
    "url": "https://..."
  }
]
```

#### loadData への組み込みイメージ

```typescript
// ファイルリストに id を持たせる
const dataFiles = [
  { id: "national", path: "/data/national.json" },
  { id: "shiga",    path: "/data/shiga.json" },
  // ...
];

// sources.jsonを並列読み込みに追加
const [sourcesRes, ...dataResponses] = await Promise.all([
  fetch("/data/sources.json"),
  ...dataFiles.map((f) => fetch(f.path).catch(() => null)),
]);
const sources = await sourcesRes.json();

// source_id → source のルックアップマップ
const sourceMap = Object.fromEntries(sources.map((s: any) => [s.id, s]));

// fetch時に source_id を付与（既存JSONの編集不要）
const allData = dataFiles.flatMap((file, i) => {
  const items = dataArrays[i] ?? [];
  return items.map((item) => ({
    ...item,
    source_id: file.id,
    species_aliases: normalizeAliases(item.species_aliases),
    publication_year: sourceMap[file.id]?.publication_year ?? null,
  }));
});
```

---

### タスク3：モーダルに発行年を表示

指定状況テーブルに発行年列を追加する。

**変更前：**
| 機関 | 学名 | カテゴリ |
|------|------|---------|

**変更後：**
| 機関 | 学名 | カテゴリ | 発行年 |
|------|------|---------|--------|

---

### タスク4：出典ページの実装

#### `/sources` ページ（新規作成）
`sources.json` を読み込み、一覧テーブルとして表示する。フッターにリンクを追加。

#### モーダル内の機関名にリンクを追加
指定状況テーブルの機関名セルを `<a href={source.url} target="_blank">` でラップし、元のレッドリストに直接アクセスできるようにする。

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

#### グループ化への組み込みイメージ

```typescript
const synonyms: Record<string, string> = await fetch("/data/synonyms.json")
  .then((r) => r.json())
  .catch(() => ({}));

// groupBySpecies内で正規名に変換してからキーにする
const key = synonyms[item.species_name] ?? item.species_name;
```

#### 運用ルール
- 正規名は原則として**環境省レッドリストの表記**を優先する
- 環境省に掲載がない種は、より広く使われている表記を正規名とする
- 原典チェック（タスク1）で同一種と判明したものを随時追記していく

#### モーダルの指定状況テーブル仕様変更

**変更後：**
| 機関 | 和名（出典） | 学名（出典） | カテゴリ | 発行年 |
|------|------------|------------|---------|--------|

- **和名（出典）**：`species_name`（出典名）と `species_aliases`（別名）を両方表示
- **学名（出典）**：`scientific_name`（記載なしの場合は空白）

#### groupBySpecies のデータ構造変更

```typescript
speciesMap[key].jurisdictions.push({
  jurisdiction_name: item.jurisdiction_name,
  jurisdiction_type: item.jurisdiction_type,
  parent_prefecture: item.parent_prefecture,
  category: item.category,
  category_unified: item.category_unified,
  scientific_name: item.scientific_name,
  source_id: item.source_id,              // ← 追加
  original_name: item.species_name,       // ← 追加（出典での和名）
  original_aliases: item.species_aliases, // ← 追加（出典での別名）
  publication_year: item.publication_year,// ← 追加（sources.jsonから付与）
});
```

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
// ordinance.jsonを並列読み込みに追加
const ordinanceRes = await fetch("/data/ordinance.json").catch(() => null);
const ordinanceList = ordinanceRes ? await ordinanceRes.json() : [];

// (jurisdiction_name + species_name) → OrdinanceRecord のマップ
const ordinanceMap = new Map<string, OrdinanceRecord>();
for (const rec of ordinanceList) {
  const key = `${rec.jurisdiction_name}::${rec.species_name}`;
  ordinanceMap.set(key, rec);
}

// groupBySpecies内で各jurisdictionにフラグを付与
speciesMap[key].jurisdictions.push({
  // ... 既存フィールド ...
  ordinance: ordinanceMap.get(
    `${item.jurisdiction_name}::${item.species_name}`
  ) ?? null,  // null = 条例指定なし
});
```

#### UI表示仕様

- **検索カード**：条例指定がある自治体が1つでもある種に「🔒 条例指定あり」バッジを表示
- **モーダル指定状況テーブル**：条例指定のある行に「🔒 条例指定」列を追加、条例名をツールチップまたは括弧書きで表示
- **フィルター**：「条例指定のみ表示」チェックボックスを追加（任意）

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
```

---

### 作業順序

```
1. sources.json の内容を確定（id・URL・発行年を各自治体分入力）
      ↓
2. 各JSONの原典チェック（表記の修正・シノニム候補の洗い出し）
      ↓
3. synonyms.json を作成（原典チェックで判明したシノニムを記載）
      ↓
4. loadData に sources.json・synonyms.json の読み込みを追加（source_id付与を含む）
      ↓
5. groupBySpecies に synonyms による正規名変換を組み込む
      ↓
6. モーダルのテーブルに発行年列・和名（出典）列を追加
      ↓
7. /sources ページを新規作成・フッターにリンク追加
      ↓
8. モーダルの機関名をURLリンク化
      ↓
9. ordinance.json を作成（各県の条例指定種データを収集・入力）
      ↓
10. loadData に ordinance.json の読み込みを追加
      ↓
11. UI に条例指定バッジ・フィルターを追加
```