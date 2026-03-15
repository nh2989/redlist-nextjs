# レッドリスト検索アプリ - プロジェクト現状

最終更新：2026年3月15日
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
- [ ] TypeScriptの `any` 型が多用されている（型定義の整備）

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