# レッドリスト検索アプリ - プロジェクト現状

最終更新：2026年5月31日
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
│   ├── page.tsx                    # トップページ
│   ├── layout.tsx                  # 共通レイアウト（Footerコンポーネント含む）
│   ├── globals.css                 # グローバルスタイル（CSS変数で一元管理）
│   ├── favicon.ico
│   ├── search/
│   │   └── page.tsx                # 検索結果ページ（メインロジック）
│   ├── sources/
│   │   └── page.tsx                # 出典一覧ページ（Server Component）
│   └── components/
│       ├── SpeciesMap.tsx          # 地図コンポーネント（Geolonia SVG）
│       ├── CategoryStyles.tsx      # カテゴリ色をCSS変数として注入
│       └── PreloadTopoJson.tsx     # 不要（削除候補）
├── lib/
│   ├── categoryConstants.ts        # カテゴリ色・定数・ユーティリティ関数・分類群ドット色の一元管理
│   └── types.ts                    # 共通型定義（RawSpeciesRecord / Jurisdiction / SpeciesGroup / SourceRecord）
└── public/
    ├── japan.topojson              # 日本地図データ（5%簡略化済み、40KB）※現在未使用
    ├── japan-map.svg               # Geolonia map-mobile.svg（地図表示用）
    └── data/
        ├── sources.json            # 出典メタ情報（id・title・year・url・parent_prefecture を一元管理）
        ├── taxonomies.json         # 分類群正規名・別名マッピング（canonical / aliases）
        ├── synonyms.json           # 種名シノニムマッピング（非正規名 → 正規名）
        ├── national.json           # 環境省 第５次レッドリスト
        ├── shiga_2025.json         # 滋賀県 2025年版（全分類群対応済み）
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
- **トップページ** (`/`): 検索・フィルター入力 → `/search` へURLパラメータで遷移
- **検索結果ページ** (`/search`): 全メインロジック・フィルタリング・表示
- **出典一覧ページ** (`/sources`): sources.json を fs.readFile で読み込み、機関名・資料名・発行年・URLを表示。都道府県コード順ソート（市町村は親都道府県コードで並び替え）。フッターからリンク

### データ処理
- [x] 複数ファイルの並列読み込み（sources.json + データJSON、Promise.all）
- [x] sources.json によるメタ情報一元管理（source_id をキーに publication_year 付与）
- [x] sources.json に `parent_prefecture` フィールド追加（市町村エントリの親都道府県を記録）
- [x] taxonomies.json による分類群名の正規化（canonical / aliases マッピング）
- [x] synonyms.json による種名シノニム統合（非正規名 → 正規名に変換してグループ化）
- [x] 和名ベースのグルーピング（学名の表記ゆれを吸収）
- [x] jurisdiction_type（national / prefecture / municipality）による階層管理
- [x] 別名（species_aliases）の正規化（`|`区切り文字列または配列に対応）
- [x] カテゴリ統一マッピング（EX, EW, CR, EN, CREN, VU, NT, DD, LP, OTHER）
- [x] JIS X 0401 都道府県コードによる並び順
- [x] original_name（出典上の和名）を Jurisdiction に保持
- [x] source_id・publication_year を Jurisdiction に保持
- [x] `prefToMunicipalities` マップをデータから動的構築（都道府県 → 市町村リスト）

### 検索・フィルター
- [x] 和名 / 別名 / 学名の横断検索
- [x] カテゴリフィルター（複数選択ドロップダウン）
  - CREN（絶滅危惧Ⅰ類）を親、CR・EN を子として階層表示
  - CREN オン → CR・EN 自動オン / CREN オフ → CR・EN 自動オフ
  - CR か EN をオフ → CREN 自動オフ
  - CR・EN を手動で両方オンにしても CREN はオフのまま（Ⅰ類を分割している県のみ表示可能）
  - 全選択（すべてチェック）= フィルターなし、空選択 = 0件
- [x] 都道府県フィルター（複数選択ドロップダウン）
  - 市町村データがある都道府県の直下に市町村サブリストをインデント表示
  - 「市町村あり」バッジで存在を明示
  - 市町村はデフォルトoff（都道府県のみ選択が初期状態）
  - 市町村単独選択も可能（例：彦根市のみ）
  - 都道府県＋市町村の併用も可能（例：滋賀県＋彦根市）
  - 全選択（すべてチェック）= フィルターなし（市町村はリセット）、空選択 = 0件
- [x] 分類群フィルター（taxonomies.json の順序で表示）
- [x] 複合フィルター（カテゴリ＋都道府県＋市町村の組み合わせ）
- [x] フィルター初期状態：カテゴリ・都道府県ともに全選択（URLパラメータなし時）

### フィルター表示UI
- [x] ドロップダウンボタン：絞り込み中は青枠（`multi-select-btn--active`）＋件数バッジ
- [x] アクティブフィルタータグ：フィルターバー直下に横並びで表示
  - カテゴリタグ（青系）・都道府県タグ（緑系）・市町村タグ（茶系）で色分け
  - タグの ✕ クリックで個別解除
  - CRENオン時はCR・ENタグを非表示にしCRENタグのみ表示
- [x] 件数表示：「全○件を表示中」/ 「🔍 絞り込み中 — ○件」/ 「絞り込み条件が選択されていません」の3パターン

### UI
- [x] オートコンプリート（↑↓・Enter・Escキーボード操作対応）
- [x] 検索クリアボタン（×）
- [x] ソート（種名・カテゴリ希少性順・指定箇所数・学名）
- [x] 種カード：分類群グループ別表示（taxonomies.json の順序）
- [x] 種カード：2カラムレイアウト（左＝和名・学名、右＝指定状況）
- [x] 種カード：同一分類群をグループ外枠でまとめ、種間は横線区切りのみ
- [x] 指定状況ラベル（国・都道府県・市町村）を `text-align: justify` で縦揃え
- [x] カテゴリ別色分け短冊（背景色のみ、略字なし）
- [x] モーダル詳細表示（学名・分類群・環境省ステータス・指定状況テーブル）
- [x] 地図表示（都道府県データがある種のみ、モーダル内）

### 種カード設計（現行）

```
[分類群グループヘッダー ● 維管束植物]
┌─────────────────────────────────────────┐
│ 和名（学名）        │ 国       [環境省]  │
│                    │ 都道府県 [滋賀][京都]│
├─────────────────────────────────────────┤
│ 和名               │ 都道府県 [岐阜][三重]│
└─────────────────────────────────────────┘
```

- 学名は環境省エントリがある種のみ表示
- ラベル幅 `4em` + `text-align: justify` で「国」「市町村」「都道府県」の左端を縦揃え
- 分類群ドット色は `categoryConstants.ts` の `TAXONOMY_DOT_COLOR` で管理

### モーダル指定状況テーブル（現在の列構成）

**都道府県・市町村テーブル：**
| 機関 | 和名 | 学名 | 統一カテゴリ | 出典カテゴリ | 発行年 |
|------|------|------|------------|------------|--------|

---

## データファイル一覧

| ファイル | 機関 | 発行年 | 備考 |
|---------|------|--------|------|
| national.json | 環境省 | 2025-2026 | 第５次レッドリスト |
| shiga_2025.json | 滋賀県 | 2026 | 全分類群対応済み |
| kyoto.json | 京都府 | 2021-2025 | |
| aichi.json | 愛知県 | 2026 | |
| hiroshima.json | 広島県 | 2022 | |
| shimane.json | 島根県 | 2026 | |
| fukui.json | 福井県 | 2016 | |
| gifu.json | 岐阜県 | 2026 | |
| mie.json | 三重県 | 2024 | |
| koka.json | 甲賀市 | 2022 | municipality / parent_prefecture: 滋賀県 |
| hikone.json | 彦根市 | 2005 | municipality / parent_prefecture: 滋賀県 |

---

## 分類群マスター（taxonomies.json）

| canonical | 主なaliases |
|-----------|------------|
| 哺乳類 | |
| 鳥類 | |
| 爬虫類 | 爬虫類・両生類 |
| 両生類 | |
| 淡水魚類 | 汽水・淡水魚類、魚類 |
| 昆虫類 | |
| 甲殻類 | |
| 軟体動物 | 貝類、陸産貝類、淡水貝類 |
| その他無脊椎動物 | 陸域その他無脊椎動物、その他陸生無脊椎動物、その他水生無脊椎動物 |
| 維管束植物 | |
| 蘚苔類 | コケ植物 |
| 藻類 | |
| 地衣類 | |
| 菌類 | |

---

## 技術メモ

### 色管理の仕組み
```
categoryConstants.ts（CATEGORY_COLORS / TAXONOMY_DOT_COLOR）
  ↓ import
CategoryStyles.tsx → <style> タグで :root に CSS変数を注入
  ↓
globals.css の .category-* / .org-item.category-* クラスが var(--color-cat-*) を参照
```

### 分類群グループ化の仕組み
```
displayData（ソート済み）
  ↓ Map でグループ化（同一taxonomyをまとめる）
taxonomyGroups（taxonomy順に並べ直し）
  ↓
taxonomy-group-header + card-group でレンダリング
```

### ソート時の分類群順序
- `name` / `scientific` ソート：taxonomyList のインデックスを第一キーに使用
- `category` ソート：希少性優先度 → taxonomy順 → 種名順
- `jurisdiction-desc/asc` ソート：分類群をまたいで件数順

### sources.json の仕組み
```
public/data/sources.json
  ↓ loadData で並列fetch（search/page.tsx）
sourceMap（id → SourceRecord）を State に保持
  ↓
各レコードに source_id・publication_year を付与
  ↓
Jurisdiction.publication_year としてモーダルテーブルに表示
  ↓
/sources ページでも同 sources.json を fs.readFile で参照
  ↓
page.tsx（トップ）でも fetch して prefToMunicipalities を構築
```

### フィルターの状態管理設計
```
prefectureFilters: string[]
  都道府県名と市町村名が混在（例：["滋賀県", "彦根市", "京都府"]）

prefOnlyFilters = prefectureFilters.filter(p => !allMunicipalities.includes(p))
  都道府県のみ抽出

allMunicipalities = Object.values(prefToMunicipalities).flat()
  全市町村リスト（フィルタリング判定用）

フィルターロジック（filterResults / filterJurisdictionsForDisplay 共通）：
  市町村: prefectureFilters に明示的に含まれる場合のみマッチ
  都道府県・国: 全都道府県選択なら常にマッチ、絞り込み中なら prefectureFilters に含まれる場合のみ
```

### カテゴリフィルター連動ルール（CREN/CR/EN）
```
CREN オン → CR・EN も自動オン
CREN オフ → CR・EN も自動オフ
CR か EN をオフ → CREN も自動オフ
CR・EN を手動で両方オン → CREN はオフのまま
  （CRENはCR+ENまとめ表記なので、分離表記の都道府県のみ表示したい場合に有用）
```

### ページ間のデータ受け渡し
```
トップページ（/）
  → 検索条件をURLパラメータで渡す
  → /search?q=...&category=...&prefecture=...&taxonomy=...

search/page.tsx
  → useSearchParams() でパラメータを受け取り
  → loadData() で全JSONを再フェッチ
  → ステートは2ページ間で共有されない（URLのみが橋渡し）

全選択の場合：
  カテゴリ → URLに category パラメータを付けない（/search側で全選択として初期化）
  都道府県 → URLに prefecture パラメータを付けない（/search側で全選択として初期化）
  市町村選択がある場合 → prefecture パラメータに市町村名も含めて渡す
```

### BOM問題への対処
```
sources.json 等が UTF-8 with BOM で保存されると JSON.parse が失敗する
対処: json.replace(/^\uFEFF/, "") でBOMを除去
または VS Code で「エンコード付きで保存」→「UTF-8」（BOMなし）で保存
```

### Prettierの設定（.prettierrc）
```json
{ "quoteProps": "as-needed" }
```
`・`（中黒）等を含むオブジェクトキーのクォートを保持するために設定。

### tsconfig.json のパス設定
```json
"paths": { "@/*": ["./*"] }
```

---

## globals.css に追加が必要なクラス

以下のクラスが実装済みコードで使用されているが、globals.css への追加が必要：

```css
/* フィルター絞り込み中のボタン */
.multi-select-btn--active {
  border-color: var(--brand);
  border-width: 2px;
}

/* 件数バッジ */
.filter-badge {
  background: var(--brand);
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  padding: 1px 7px;
  min-width: 20px;
  text-align: center;
  flex-shrink: 0;
}

/* すべてチェックボックス */
.multi-select-option--all {
  font-weight: 600;
}

/* アクティブフィルタータグ */
.active-filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
.active-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 5px;
  font-size: 12px;
  padding: 3px 8px;
  cursor: pointer;
  border: none;
  white-space: nowrap;
  transition: opacity .15s;
}
.active-tag:hover { opacity: .7; }
.active-tag--cat  { background: #e8edf5; color: #2d4a7a; }
.active-tag--pref { background: #e8f0e8; color: #2d5c2e; }
.active-tag--muni { background: #f0ece8; color: #5c3a2d; }
```

---

## 既知の課題
### 優先度低・将来
- [ ] Supabaseデータベース移行（データが増えたタイミング）
- [ ] Geolonia SVGのライセンス（GFDL）→ 商用化時に自作SVGへ切り替え検討

---

## 次回作業候補

```
③ ordinance.json の作成（タスク6）
      ↓
④ UI に条例指定バッジ・フィルターを追加
      ↓
⑤ データ拡充（Excel入手可能な県を優先）
```

### データ拡充の優先順位

| 優先度 | 県 | 入手方法 |
|--------|-----|---------|
| 高 | 宮城・福島・栃木・埼玉・千葉・長野・静岡・高知・鹿児島 | Excel入手可能 |
| 中 | 東京・神奈川・兵庫 | PDF（構造化しやすい） |
| 低 | その他PDF県 | PDF（難度高） |

---

## 地図パフォーマンス改善候補

1. mapshaperでTopoJSON間引き（10〜20%に簡略化→ファイルサイズ・描画頂点数削減）
2. SVG→Canvas描画切り替え（DOM要素削減、ライブラリ変更必要）