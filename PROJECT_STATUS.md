# レッドリスト検索アプリ - プロジェクト現状

最終更新：2026年2月25日
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
│   ├── globals.css                 # グローバルスタイル
│   ├── favicon.ico
│   ├── search/
│   │   └── page.tsx                # 検索結果ページ（メインロジック）
│   └── components/
│       ├── SpeciesMap.tsx          # 地図コンポーネント
│       └── PreloadTopoJson.tsx     # TopoJSON事前読み込み
└── public/
    ├── japan.topojson              # 日本地図データ（ローカル配信）
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
- [x] カテゴリ別色分けバッジ（EX/EW/CR/EN/VU/NT/DD）
- [x] モーダル詳細表示（学名・分類群・指定状況テーブル）
- [x] 地図表示（都道府県データがある種のみ、モーダル内）

### パフォーマンス
- [x] TopoJSONローカル配信（`/public/japan.topojson`、GitHub外部取得を廃止）
- [x] TopoJSONのモジュールレベルキャッシュ（2回目以降のモーダル開閉でfetchゼロ）
- [x] 地理データ分割・振り分けのキャッシュ（splitCache、初回1回のみ計算）
- [x] 都道府県→カラーマップのメモ化（useMemo）
- [x] GPU加速対応

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

## 既知の課題・要確認事項

- [ ] `sample.json` の用途が不明（national.jsonと内容が重複している可能性）
- [ ] 分類群フィルターの選択肢が「植物」だが、データは「維管束植物」→ 不一致
- [ ] TypeScriptの `any` 型が多用されている（型定義の整備が必要）
- [ ] `getCategoryClass` 関数内に文字化けあり（`野���絶滅`、`絶滅危惧Ⅱ���`）→ ソース確認要
- [ ] 市町村フィルターは滋賀県選択時のみ機能（甲賀市・彦根市のみ対応）

---

## 作業候補（地図パフォーマンスのさらなる改善）

- [ ] **TopoJSON簡略化**：mapshaperで地物を10〜20%に間引く
  - ファイルサイズ・描画頂点数が激減し、スマホでの描画が速くなる
  - 参考：https://mapshaper.org/
- [ ] **Canvas描画への切り替え**：react-simple-maps（SVG描画）から変更
  - 都道府県×島数分のDOM要素が激減する
  - ライブラリの変更が必要（deck.gl、Konvaなど）
