# レッドリスト検索アプリ - プロジェクト現状

最終更新：2026年7月1日
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
│   └── types.ts                    # 共通型定義（RawSpeciesRecord / Jurisdiction / SpeciesGroup / SourceRecord / OrdinalRecord）
├── scripts/
│   ├── check_species.js            # 学名一致・和名相違チェック
│   ├── check_national.js           # national.json 掲載確認用アドホックスクリプト
│   ├── check_ylist.js              # YList CSVとの照合（非標準和名検出）
│   └── find_synonym_candidates.js  # シノニム候補検出（①②③の3カテゴリ、後述）
└── public/
    ├── japan.topojson              # 日本地図データ（5%簡略化済み、40KB）※現在未使用
    ├── japan-map.svg               # Geolonia map-mobile.svg（地図表示用・GFDLライセンス要確認）
    └── data/
        ├── redlist/                 # ← レッドリスト本体データ（旧: public/data/直下から移動）
        │   ├── sources.json         # 出典メタ情報（id・title・year・url・parent_prefecture を一元管理）
        │   ├── taxonomies.json      # 分類群正規名・別名マッピング（canonical / aliases）
        │   ├── synonyms.json        # 種名シノニムマッピング（非正規名 → 正規名）
        │   ├── national.json        # 環境省 第５次レッドリスト
        │   ├── shiga_2025.json      # 滋賀県 2025年版（全分類群対応済み）
        │   ├── kyoto.json           # 京都府
        │   ├── aichi.json           # 愛知県（2025年版・全分類群CSV確認済み）
        │   ├── hiroshima.json       # 広島県
        │   ├── shizuoka.json        # 静岡県（新規追加）
        │   ├── shimane.json         # 島根県
        │   ├── fukui.json           # 福井県
        │   ├── gifu.json            # 岐阜県（最新版=二次改訂版・2026年3月・PDFのみ）
        │   ├── mie.json             # 三重県（2024年版Excel。⚠️本文PDFとの学名差分要注意、後述）
        │   ├── koka.json            # 甲賀市（滋賀県）
        │   └── hikone.json          # 彦根市（滋賀県）
        └── ordinance/                # ← 条例・法令指定データ（新規セクション）
            ├── national.json        # 環境省・国内希少野生動植物種（種の保存法）
            └── shiga.json           # 滋賀県・指定希少野生動植物種（ふるさと滋賀の野生動植物との共生に関する条例）
```

**確定**：`osaka.json` はフォルダに存在しない（削除済み）。今後、大阪府データを再作成予定。`sample.json` はnational.jsonと重複のため削除済み。

---

## 実装済み機能

### ページ構成
- **トップページ** (`/`): 検索・フィルター入力 → `/search` へURLパラメータで遷移
- **検索結果ページ** (`/search`): 全メインロジック・フィルタリング・表示
- **出典一覧ページ** (`/sources`): sources.json を fs.readFile で読み込み、機関名・資料名・発行年・URLを表示。都道府県コード順ソート（市町村は親都道府県コードで並び替え）。フッターからリンク

### データ処理
- [x] 複数ファイルの並列読み込み（sources.json + データJSON + ordinanceJSON、Promise.all）
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
- [x] ordinance.json（national/shiga）の読み込み・種カードへの反映

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
- [x] **法令・条例指定フィルター（新規）**：「国内希少」「条例指定」を個別にON/OFF可能
- [x] 複合フィルター（カテゴリ＋都道府県＋市町村＋法令条例の組み合わせ）
- [x] フィルター初期状態：カテゴリ・都道府県ともに全選択（URLパラメータなし時）

### フィルター表示UI
- [x] ドロップダウンボタン：絞り込み中は青枠（`multi-select-btn--active`）＋件数バッジ
- [x] アクティブフィルタータグ：フィルターバー直下に横並びで表示
  - カテゴリタグ（青系）・都道府県タグ（緑系）・市町村タグ（茶系）で色分け
  - タグの ✕ クリックで個別解除
  - CRENオン時はCR・ENタグを非表示にしCRENタグのみ表示
  - 法令・条例タグ（グレー系：`active-tag--ord-nat` / `active-tag--ord-pref`）
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
- [x] **国内希少バッジ（`nat-ord-badge`）・条例指定バッジ（`pref-ord-badge`）を種カードに表示**
- [x] モーダル詳細表示（学名・分類群・環境省ステータス・指定状況テーブル、法令・条例詳細を該当する自治体行の下にインラインで表示）
- [x] 地図表示（都道府県データがある種のみ、モーダル内）

### 種カード設計（現行）

```
[分類群グループヘッダー ● 維管束植物]
┌─────────────────────────────────────────┐
│ 和名（学名）[国内希少] │ 国       [環境省]  │
│                      │ 都道府県 [滋賀][京都]│
├─────────────────────────────────────────┤
│ 和名 [条例指定]        │ 都道府県 [岐阜][三重]│
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

## データファイル一覧（redlist）

| ファイル | 機関 | 発行年 | 備考 |
|---------|------|--------|------|
| national.json | 環境省 | 2025-2026 | 第５次レッドリスト |
| shiga_2025.json | 滋賀県 | 2026 | 全分類群対応済み |
| kyoto.json | 京都府 | 2021-2025 | |
| aichi.json | 愛知県 | 2025 | 全分類群CSV確認済み |
| hiroshima.json | 広島県 | 2022 | |
| shizuoka.json | 静岡県 | - | 新規追加 |
| shimane.json | 島根県 | 2026 | |
| fukui.json | 福井県 | 2016 | |
| gifu.json | 岐阜県 | 2026 | 二次改訂版（最新）はPDFのみ |
| mie.json | 三重県 | 2024 | ⚠️Excel×PDF本文の学名差分あり（後述） |
| koka.json | 甲賀市 | 2022 | municipality / parent_prefecture: 滋賀県 |
| hikone.json | 彦根市 | 2005 | municipality / parent_prefecture: 滋賀県 |
| osaka.json | 大阪府 | - | **削除済み・未収録。今後再作成予定** |

## データファイル一覧（ordinance）

| ファイル | 機関 | 根拠法令・条例 |
|---------|------|--------------|
| national.json | 環境省 | 絶滅のおそれのある野生動植物の種の保存に関する法律（種の保存法） |
| shiga.json | 滋賀県 | ふるさと滋賀の野生動植物との共生に関する条例 |

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
| 蘚苔類 | コケ植物（YList標準名を正規、環境省名は別名として登録） |
| 藻類 | |
| 地衣類 | |
| 菌類 | |

---

## シノニム候補スクリーニングの進捗

`scripts/find_synonym_candidates.js` により3カテゴリで自動検出：

| カテゴリ | 内容 | 対応方針 |
|---------|------|---------|
| ① | 学名完全一致・和名相違 | 真のシノニム候補 → 個別判断のうえ synonyms.json へ登録 |
| ② | 属+種小名一致・和名相違（亜種・上位種候補） | 人間による個別レビューが必要。多数の項目が未レビュー |
| ③ | 種ランク vs 下位ランク（亜種・変種・地域集団）で和名相違 | シノニム統合の対象外。「種 vs 下位分類」の関係として個別に判断（自動統合しない） |

**運用ルール**：
- 地域個体群（例：ニホンザル(伊豆・愛鷹・熱海地域の個体群)）は独立エントリとして扱い、シノニム化しない
- 都道府県間で分類学的位置づけが一致しない種（例：ヒロハテンナンショウ／アシウテンナンショウ）は独立エントリのまま保持
- カテゴリ③は原則、人間の目視レビューが完了するまで自動統合しない

`synonym_candidates.md` に検出結果を出力済み（① 35件、②③多数）。② のレビューは継続中。

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
public/data/redlist/sources.json
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

## 既知の課題

### 優先度中
- [ ] `osaka.json` の再作成（データ入手方法から要検討。旧データは削除済みで復元不可）
- [ ] 動物各分類群（哺乳類・鳥類・爬虫類・両生類・汽水淡水魚類・昆虫類・クモ類・貝類・甲殻類・その他動物）のExcel×PDF本文学名照合（三重県：植物は完了、動物は未実施）
- [ ] シノニム候補②（属+種小名一致）の人間レビュー継続

### 優先度低・将来
- [ ] Supabaseデータベース移行（データが増えたタイミング）
- [ ] Geolonia SVGのライセンス（GFDL）→ 商用化時に自作SVGへ切り替え検討

---

## 次回作業候補

```
① osaka.json の再作成（入手方法検討から）
      ↓
② 動物分類群のExcel×PDF照合（三重県）
      ↓
③ シノニム候補②のレビュー継続
      ↓
④ データ拡充（Excel/CSV入手可能な県を優先、下表参照）
```

### データ拡充の優先順位（2026年7月・全都道府県一次確認済み）

⚠️ 以前の表（宮城・福島・栃木・埼玉・千葉・長野・静岡・高知・鹿児島＝高優先度、東京・神奈川・兵庫＝中優先度）は2016年頃の古い情報に基づいており不正確だったため全面的に置き換え。
確認方法：検索スニペットのみでなく、実際に公式ページをfetchして確認すること（スニペットだけの判断は誤りやすい。愛知県・岐阜県で誤判定した実例あり → 「データ入手方法確認の教訓」参照）

#### 高優先度：Excel/CSV入手可能（2026年7月・一次確認済み）

| 県 | 形式 | 備考 |
|----|------|------|
| 北海道 | XLS | オープンデータポータル |
| 岩手県 | Excel | 全分類群・2024年版 |
| 宮城県 | Excel | 全分類群 |
| 秋田県 | Excel | 2019年版（哺乳類・昆虫類） |
| 山形県 | Excel | 植物編 |
| 福島県 | Excel | 全分類群・全年版 |
| 茨城県 | Excel | 2012/2016/2020年版 |
| 群馬県 | Excel | 植物2012年版 |
| 長野県 | Excel | 植物2014・動物2015 |
| 東京都 | CSV+Excel | |
| 富山県 | Excel | 2025年版 |
| 石川県 | Excel | 2020年版（植物） |
| 山梨県 | Excel | 2018年版 |
| 三重県 | Excel | 2024年版・既存データ収録済み。⚠️「三重県：Excel×PDF本文の学名差分」参照 |
| 愛知県 | CSV | 2025年版・全分類群・既存データ収録済み |
| 高知県 | Excel/XLSX | 植物編2020年版（動物編は未確認） |
| 徳島県 | Excel | 昆虫・両生・爬虫・無脊椎・魚類・植物 |
| 愛媛県 | Excel | |
| 熊本県 | Excel | 2024年版（環境アセスメント用に掲載） |
| 大分県 | Excel | rdb-oita.jp |

#### 中〜低優先度：PDFのみ（Excel/CSV確認できず、2026年7月・一次確認済み）

**既存データ収録済み県（8県、Excel化済みでも今後の改訂時はPDF）**：
滋賀・京都・広島・静岡・岐阜・福井・島根

**未収録県（PDFのみ）**：
青森・栃木・埼玉・千葉・神奈川・新潟・鹿児島・和歌山・兵庫・奈良・鳥取・岡山・山口・香川・福岡（2024年版）・佐賀・長崎・宮崎・沖縄

**要検証（データ入手方法）**：
大阪府（`osaka.json`は削除済み・未収録が確定。再作成にあたり入手方法の確認が必要）
※岡山・山口・長崎・香川は簡易確認のみで確度がやや低い（要再検証）

---

## 学習事項

### 三重県：Excel×PDF本文の学名差分（教訓）

三重県のデータは以下の3層構造になっている：

| 段階 | 内容 | 学名の正確性 |
|---|---|---|
| ① 三重県レッドリスト2024（Excel） | 元データ | 基準（一部に誤りあり） |
| ② 三重県レッドデータブック2025 本文PDF | 解説書作成時に静かに修正 | ①より正確（修正箇所は明記なし） |
| ③ 正誤表（R8.4時点） | ①②とは別の誤りを後日公表 | ②に対する追加修正のみ。①→②の学名修正は含まれない |

**教訓**：Excel版リスト（種の一次データ）とPDF解説書本文の間で、正誤表に載らない学名修正が本文に直接（無言で）反映されている場合がある。正誤表だけを確認して安心してはいけない。Excelを流し込んだ後、必ず**PDF本文そのもの**で学名を照合する必要がある。

**進捗**：
- [x] 植物（維管束植物）：Excel×PDF本文の学名照合 実施済み
- [ ] 動物各分類群（哺乳類・鳥類・爬虫類・両生類・汽水淡水魚類・昆虫類・クモ類・貝類・甲殻類・その他動物）：未実施

### データ入手方法確認の教訓（全都道府県調査より）

検索結果のスニペットだけでExcel/CSVの有無を判断すると誤る（愛知県・岐阜県で実例あり）。

- **誤判定例1：愛知県** → スニペットで「PDF形式のファイルをご覧いただく場合には〜」という注記文言だけを見て誤ってPDFのみと判定。実際に公式ページ（`pref.aichi.jp/soshiki/shizen/redlist-aichi-2025.html`）をfetchしたら、全分類群（維管束植物・セン類・タイ類・哺乳類・鳥類・爬虫類・両生類・汽水淡水魚類・昆虫類・クモ類・貝類）がCSVで公開されていた。
- **誤判定例2：岐阜県** → 古い版（2015年頃・一次改訂版）のExcel付きページを最新版と誤認。実際の最新版（二次改訂版・2026年3月・`sources.json`が参照しているURL）はPDFのみだった。

**教訓**：Excel/CSVの有無を確認する際は、必ず実際のページをfetchして確認する。特に「最新版かどうか」（＝sources.jsonに記載のURLと一致するか）を必ず確認すること。古い版のページがまだ残っている自治体サイトは多いため、検索結果の複数リンクを鵜呑みにせず、公式サイトの一次ソースURLに直接アクセスして判断する。

### BOM・エンコーディング関連

- CSV: UTF-8 BOM（`utf-8-sig`）でExcel互換性を確保。`lineterminator='\r\n'`。`csv.reader`/`csv.writer`必須（`line.split(',')`不可、author文字列内の引用カンマに対応するため）
- 学名表記標準：岐阜県の慣例に準拠（`A.Lastname`のようにイニシャルと姓の間スペースなし、`var.`等の階級語の後はスペースあり、全角ピリオド不使用）
- OCRエラーの典型パターン：属名内の余分なスペース、`l`↔`I`↔`1`の誤認識、アクセント文字の欠落（Itô, Lév., Kudô, Čelak.）、キリル文字の混入、ページ境界での学名の欠落（前ページ末尾に学名が来る場合の抽出漏れ）

---

## 地図パフォーマンス改善候補

1. mapshaperでTopoJSON間引き（10〜20%に簡略化→ファイルサイズ・描画頂点数削減）
2. SVG→Canvas描画切り替え（DOM要素削減、ライブラリ変更必要）