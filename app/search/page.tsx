'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// カテゴリマッピング（同じ意味のカテゴリをグループ化）
const CATEGORY_MAPPINGS: { [key: string]: string[] } = {
  'EX': ['絶滅（EX）', '絶滅', 'EX', '絶滅種'],
  'EW': ['野生絶滅（EW）', '野生絶滅', 'EW'],  // ← 追加
  'CR': [
    '絶滅危惧ⅠA類(CR)', '絶滅危惧ⅠA類（CR）',
    '絶滅危惧ⅠA類', 'ⅠA類', 'CR'
  ],
  'EN': [
    '絶滅危惧ⅠB類(EN)', '絶滅危惧ⅠB類（EN）',
    '絶滅危惧ⅠB類', 'ⅠB類', 'EN'
  ],
  'CR+EN': [
    '絶滅危惧Ⅰ類（CR+EN）', '絶滅危惧Ⅰ類', 'Ⅰ類'
  ],
  'VU': [
    '絶滅危惧Ⅱ類（VU）', '絶滅危惧Ⅱ類', 
    'Ⅱ類', 'VU', '絶滅危機増大種'
  ],
  'NT': [
    '準絶滅危惧（NT）', '準絶滅危惧', 
    '準絶滅危惧種', '希少種', 'NT'
  ],
  'DD': [
    '情報不足（DD）', '情報不足', 'DD'
  ],
  'OTHER': [
    'その他重要種', '要注目種', '分布上重要種',
    '地域個体群', 'LP'
  ]
}

// 都道府県コード（JIS X 0401）
const PREFECTURE_CODES: { [key: string]: number } = {
  '北海道': 1, '青森県': 2, '岩手県': 3, '宮城県': 4, '秋田県': 5,
  '山形県': 6, '福島県': 7, '茨城県': 8, '栃木県': 9, '群馬県': 10,
  '埼玉県': 11, '千葉県': 12, '東京都': 13, '神奈川県': 14, '新潟県': 15,
  '富山県': 16, '石川県': 17, '福井県': 18, '山梨県': 19, '長野県': 20,
  '岐阜県': 21, '静岡県': 22, '愛知県': 23, '三重県': 24, '滋賀県': 25,
  '京都府': 26, '大阪府': 27, '兵庫県': 28, '奈良県': 29, '和歌山県': 30,
  '鳥取県': 31, '島根県': 32, '岡山県': 33, '広島県': 34, '山口県': 35,
  '徳島県': 36, '香川県': 37, '愛媛県': 38, '高知県': 39, '福岡県': 40,
  '佐賀県': 41, '長崎県': 42, '熊本県': 43, '大分県': 44, '宮崎県': 45,
  '鹿児島県': 46, '沖縄県': 47
}

// カテゴリが同じグループかチェックする関数
function isSameCategory(category: string, filterCategory: string): boolean {
  if (!category || !filterCategory) return false
  if (category === filterCategory) return true
  
  for (let group in CATEGORY_MAPPINGS) {
    const variations = CATEGORY_MAPPINGS[group]
    const catInGroup = variations.includes(category)
    const filterInGroup = variations.includes(filterCategory)
    if (catInGroup && filterInGroup) {
      return true
    }
  }
  return false
}

// 別名を正規化する関数
function normalizeAliases(aliases: any): string[] {
  if (!aliases) return []
  if (aliases === '') return []
  
  if (Array.isArray(aliases)) {
    return aliases.filter(a => a && a.trim() !== '')
  }
  
  if (typeof aliases === 'string') {
    return aliases.split('|')
      .map(a => a.trim())
      .filter(a => a !== '')
  }
  
  return []
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URLパラメータから初期値を取得
  const initialSearchTerm = searchParams.get('q') || ''
  const initialCategory = searchParams.get('category') || ''
  const initialPrefecture = searchParams.get('prefecture') || ''
  const initialMunicipality = searchParams.get('municipality') || ''
  const initialTaxonomy = searchParams.get('taxonomy') || ''
  const initialSort = searchParams.get('sort') || 'name'

  // State（状態管理）
  const [allSpeciesData, setAllSpeciesData] = useState<any[]>([])
  const [groupedData, setGroupedData] = useState<any[]>([])
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [displayData, setDisplayData] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [categoryFilter, setCategoryFilter] = useState(initialCategory)
  const [prefectureFilter, setPrefectureFilter] = useState(initialPrefecture)
  const [municipalityFilter, setMunicipalityFilter] = useState(initialMunicipality)
  const [taxonomyFilter, setTaxonomyFilter] = useState(initialTaxonomy)
  const [sortOrder, setSortOrder] = useState(initialSort)
  const [loading, setLoading] = useState(true)
  const [selectedSpecies, setSelectedSpecies] = useState<any>(null)
  
  // 市町村リスト（選択された都道府県に応じて変化）
  const [availableMunicipalities, setAvailableMunicipalities] = useState<string[]>([])
  
  // オートコンプリート用
  const [autocompleteItems, setAutocompleteItems] = useState<any[]>([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // データ読み込み（初回のみ）
  useEffect(() => {
    loadData()
  }, [])

  // データ読み込み関数
  async function loadData() {
    setLoading(true)
    try {
      const dataFiles = [
        '/data/national.json',
        '/data/sample.json',
        '/data/shiga.json',
        '/data/kyoto.json',
        '/data/osaka.json',
        '/data/aichi.json',
        '/data/hiroshima.json',
      ]
      
      const responses = await Promise.all(
        dataFiles.map(file => fetch(file).catch(() => null))
      )
      
      const dataArrays = await Promise.all(
        responses.map(response => response ? response.json().catch(() => []) : [])
      )
      
      // データを正規化
      const allData = dataArrays.flat().map(item => ({
        ...item,
        species_aliases: normalizeAliases(item.species_aliases)
      }))
      
      setAllSpeciesData(allData)
      
      // グループ化
      const grouped = groupBySpecies(allData)
      setGroupedData(grouped)
      
    } catch (error) {
      console.error('データ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // グループ化関数（和名でグループ化）
  function groupBySpecies(data: any[]) {
    const speciesMap: any = {}
    
    data.forEach(item => {
      const key = item.species_name
      
      if (!speciesMap[key]) {
        speciesMap[key] = {
          species_name: item.species_name,
          species_aliases: item.species_aliases || [],
          scientific_name: item.scientific_name,
          taxonomy: item.taxonomy,
          jurisdictions: []
        }
      }
      
      speciesMap[key].jurisdictions.push({
        jurisdiction_name: item.jurisdiction_name,
        jurisdiction_type: item.jurisdiction_type,
        parent_prefecture: item.parent_prefecture,
        category: item.category,
        category_unified: item.category_unified,
        scientific_name: item.scientific_name
      })
    })
    
    // 各種の自治体を並べ替え
    Object.values(speciesMap).forEach((species: any) => {
      species.jurisdictions.sort((a: any, b: any) => {
        // 種別順: national -> prefecture -> municipality
        const typeOrder: any = { national: 0, prefecture: 1, municipality: 2 }
        if (typeOrder[a.jurisdiction_type] !== typeOrder[b.jurisdiction_type]) {
          return typeOrder[a.jurisdiction_type] - typeOrder[b.jurisdiction_type]
        }
        
        // 都道府県コード順
        const codeA = PREFECTURE_CODES[a.jurisdiction_name] || 999
        const codeB = PREFECTURE_CODES[b.jurisdiction_name] || 999
        return codeA - codeB
      })
    })
    
    return Object.values(speciesMap)
  }

  // 都道府県が変更されたら市町村リストを更新
  useEffect(() => {
    if (prefectureFilter) {
      const municipalities = allSpeciesData
        .filter(item => 
          item.jurisdiction_type === 'municipality' && 
          item.parent_prefecture === prefectureFilter
        )
        .map(item => item.jurisdiction_name)
      
      const uniqueMunicipalities = Array.from(new Set(municipalities)).sort()
      setAvailableMunicipalities(uniqueMunicipalities)
    } else {
      setAvailableMunicipalities([])
      setMunicipalityFilter('')
    }
  }, [prefectureFilter, allSpeciesData])

  // フィルタリング処理
  useEffect(() => {
    filterResults()
  }, [searchTerm, categoryFilter, prefectureFilter, municipalityFilter, taxonomyFilter, groupedData])

  function filterResults() {
    let filtered = groupedData

    // 検索テキスト（和名・別名・学名）
    if (searchTerm) {
      filtered = filtered.filter(species => {
        const searchLower = searchTerm.toLowerCase()
        
        const matchName = species.species_name.toLowerCase().includes(searchLower)
        const matchAlias = species.species_aliases.length > 0 &&
          species.species_aliases.some((alias: string) => 
            alias.toLowerCase().includes(searchLower)
          )
        const matchScientific = species.scientific_name.toLowerCase().includes(searchLower)
        
        return matchName || matchAlias || matchScientific
      })
    }

    // カテゴリ＋都道府県＋市町村の複合フィルター
    if (categoryFilter && prefectureFilter && municipalityFilter) {
      filtered = filtered.filter(species => 
        species.jurisdictions.some((j: any) => 
          j.jurisdiction_name === municipalityFilter &&
          isSameCategory(j.category_unified || j.category, categoryFilter)
        )
      )
    }
    // カテゴリ＋都道府県
    else if (categoryFilter && prefectureFilter) {
      filtered = filtered.filter(species => 
        species.jurisdictions.some((j: any) => 
          j.jurisdiction_name === prefectureFilter &&
          isSameCategory(j.category_unified || j.category, categoryFilter)
        )
      )
    }
    // カテゴリのみ
    else if (categoryFilter) {
      filtered = filtered.filter(species => 
        species.jurisdictions.some((j: any) => 
          isSameCategory(j.category_unified || j.category, categoryFilter)
        )
      )
    }
    // 都道府県＋市町村
    else if (prefectureFilter && municipalityFilter) {
      filtered = filtered.filter(species => 
        species.jurisdictions.some((j: any) => 
          j.jurisdiction_name === municipalityFilter
        )
      )
    }
    // 都道府県のみ
    else if (prefectureFilter) {
      filtered = filtered.filter(species => 
        species.jurisdictions.some((j: any) => 
          j.jurisdiction_name === prefectureFilter
        )
      )
    }

    // 分類フィルター
    if (taxonomyFilter) {
      filtered = filtered.filter(species => species.taxonomy === taxonomyFilter)
    }

    setFilteredData(filtered)
  }

  // 並び替え処理
  useEffect(() => {
    sortResults()
  }, [filteredData, sortOrder])

  function sortResults() {
    let sorted = [...filteredData]
    
    if (sortOrder === 'name') {
      sorted.sort((a, b) => a.species_name.localeCompare(b.species_name, 'ja'))
    } else if (sortOrder === 'jurisdiction-desc') {
      sorted.sort((a, b) => b.jurisdictions.length - a.jurisdictions.length)
    } else if (sortOrder === 'jurisdiction-asc') {
      sorted.sort((a, b) => a.jurisdictions.length - b.jurisdictions.length)
    } else if (sortOrder === 'scientific') {
      sorted.sort((a, b) => a.scientific_name.localeCompare(b.scientific_name))
    }
    
    setDisplayData(sorted)
  }

  // オートコンプリート候補を生成
  useEffect(() => {
    if (searchTerm.length >= 1) {
      const candidates = groupedData.filter(species => {
        const searchLower = searchTerm.toLowerCase()
        return (
          species.species_name.toLowerCase().includes(searchLower) ||
          species.species_aliases.some((alias: string) => 
            alias.toLowerCase().includes(searchLower)
          ) ||
          species.scientific_name.toLowerCase().includes(searchLower)
        )
      }).slice(0, 8)
      
      setAutocompleteItems(candidates)
      setShowAutocomplete(candidates.length > 0)
    } else {
      setShowAutocomplete(false)
    }
  }, [searchTerm, groupedData])

  // オートコンプリート項目を選択
  function selectAutocompleteItem(species: any) {
    setSearchTerm(species.species_name)
    setShowAutocomplete(false)
    setAutocompleteIndex(-1)
  }

  // キーボード操作
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showAutocomplete) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAutocompleteIndex(prev => 
        prev < autocompleteItems.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAutocompleteIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (autocompleteIndex >= 0) {
        selectAutocompleteItem(autocompleteItems[autocompleteIndex])
      }
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false)
      setAutocompleteIndex(-1)
    }
  }

  // 検索ボックスクリア
  function clearSearch() {
    setSearchTerm('')
    setShowAutocomplete(false)
    searchInputRef.current?.focus()
  }

  // トップページに戻る
  function goToTop() {
    router.push('/')
  }

  // カテゴリに応じたCSSクラス
  function getCategoryClass(category: string) {
    if (category.includes('絶滅（EX）') || category.includes('EX')) return 'category-ex'
    if (category.includes('野生絶滅') || category.includes('EW')) return 'category-ew'  // ← 追加
    if (category.includes('Ⅰ') || category.includes('CR') || category.includes('寸前') || category.includes('EN') || category.includes('絶滅危惧種')) return 'category-en'
    if (category.includes('Ⅱ類') || category.includes('VU') ||  category.includes('増大')) return 'category-vu'
    if (category.includes('準') || category.includes('NT') ||  category.includes('希少')) return 'category-nt'
    if (category.includes('情報不足') || category.includes('要注目種') ||  category.includes('DD')) return 'category-dd'
    return 'category-other'
  }

  // 自治体種別のアイコン
  function getJurisdictionIcon(type: string) {
    if (type === 'national') return '🏛️'
    if (type === 'prefecture') return '🗾'
    if (type === 'municipality') return '🏘️'
    return '📍'
  }

  // モーダルを開く
  function openModal(species: any) {
    setSelectedSpecies(species)
  }

  // モーダルを閉じる
  function closeModal() {
    setSelectedSpecies(null)
  }

  // 読み込み中
  if (loading) {
    return (
      <div className="loading">読み込み中...</div>
    )
  }

    // 表示用に自治体をフィルタリングする関数
  function filterJurisdictionsForDisplay(jurisdictions: any[]) {
    let filtered = jurisdictions

    // カテゴリフィルターが選択されている場合
    if (categoryFilter) {
      filtered = filtered.filter((j: any) => 
        isSameCategory(j.category_unified || j.category, categoryFilter)
      )
    }

    // 都道府県フィルターが選択されている場合
    if (prefectureFilter) {
      filtered = filtered.filter((j: any) => 
        j.jurisdiction_name === prefectureFilter || 
        j.parent_prefecture === prefectureFilter
      )
    }

    // 市町村フィルターが選択されている場合
    if (municipalityFilter) {
      filtered = filtered.filter((j: any) => 
        j.jurisdiction_name === municipalityFilter
      )
    }

    return filtered
  }


  // 自治体を階層別に分類
  function groupJurisdictionsByType(jurisdictions: any[]) {
    const national = jurisdictions.filter(j => j.jurisdiction_type === 'national')
    const prefecture = jurisdictions.filter(j => j.jurisdiction_type === 'prefecture')
    const municipality = jurisdictions.filter(j => j.jurisdiction_type === 'municipality')
    
    return { national, prefecture, municipality }
  }

  return (
    <>
      <div className="container">
        <header>
          <h1>🌿 レッドデータ検索システム</h1>
          <p className="subtitle">検索結果</p>
          <button 
            onClick={goToTop}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ← トップページに戻る
          </button>
        </header>

        <div className="search-section">
          <div className="search-box-wrapper">
            <input 
              ref={searchInputRef}
              type="text" 
              id="searchBox"
              placeholder="種名・別名・学名で検索..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={clearSearch}
                aria-label="検索クリア"
              >
                ×
              </button>
            )}
            
            {/* オートコンプリート */}
            {showAutocomplete && (
              <div className="autocomplete-list">
                {autocompleteItems.map((species, index) => (
                  <div
                    key={index}
                    className={`autocomplete-item ${index === autocompleteIndex ? 'active' : ''}`}
                    onClick={() => selectAutocompleteItem(species)}
                  >
                    <div className="autocomplete-name">
                      {species.species_name}
                      {species.species_aliases.length > 0 && (
                        <span style={{ fontSize: '0.85em', color: '#999', marginLeft: '8px' }}>
                          （別名: {species.species_aliases.join(', ')}）
                        </span>
                      )}
                    </div>
                    <div className="autocomplete-scientific">{species.scientific_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="filters">
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">カテゴリ：すべて</option>
              <option value="絶滅（EX）">絶滅（EX）</option>
              <option value="野生絶滅（EW）">野生絶滅（EW）</option>  {/* ← 追加 */}
              <option value="絶滅危惧ⅠA類（CR）">絶滅危惧ⅠA類（CR）</option>
              <option value="絶滅危惧ⅠB類（EN）">絶滅危惧ⅠB類（EN）</option>
              <option value="絶滅危惧Ⅰ類">絶滅危惧Ⅰ類（CR+EN）</option>
              <option value="絶滅危惧Ⅱ類（VU）">絶滅危惧Ⅱ類（VU）</option>
              <option value="準絶滅危惧（NT）">準絶滅危惧（NT）</option>
              <option value="情報不足（DD）">情報不足（DD）</option>
              <option value="その他重要種">その他</option>
            </select>
            
            <select 
              value={prefectureFilter}
              onChange={(e) => setPrefectureFilter(e.target.value)}
            >
              <option value="">都道府県：すべて</option>
              <option value="滋賀県">滋賀県</option>
              <option value="京都府">京都府</option>
              <option value="大阪府">大阪府</option>
              <option value="愛知県">愛知県</option>
              <option value="広島県">広島県</option>
            </select>

            {availableMunicipalities.length > 0 && (
              <select 
                value={municipalityFilter}
                onChange={(e) => setMunicipalityFilter(e.target.value)}
              >
                <option value="">市町村：すべて</option>
                {availableMunicipalities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            )}
            
            <select 
              value={taxonomyFilter}
              onChange={(e) => setTaxonomyFilter(e.target.value)}
            >
              <option value="">分類：すべて</option>
              <option value="植物">植物</option>
              <option value="動物">動物</option>
            </select>

            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="name">種名順（あいうえお順）</option>
              <option value="jurisdiction-desc">指定箇所が多い順</option>
              <option value="jurisdiction-asc">指定箇所が少ない順</option>
              <option value="scientific">学名順（アルファベット順）</option>
            </select>
          </div>
          
          <div className="result-count">
            {displayData.length}件の種が見つかりました
          </div>
        </div>
        
        <div className="results">
          {displayData.length === 0 ? (
            <div className="no-results">該当する種が見つかりませんでした。</div>
          ) : (
            displayData.map((species, index) => {
              // フィルター条件に合致する自治体のみ表示
              const visibleJurisdictions = filterJurisdictionsForDisplay(species.jurisdictions)
              const { national, prefecture, municipality } = groupJurisdictionsByType(visibleJurisdictions)
              return (
                <div 
                  key={index} 
                  className="species-card"
                  onClick={() => openModal(species)}
                >
                  <h3>
                    {species.species_name}
                    {species.species_aliases.length > 0 && (
                      <span style={{ fontSize: '0.7em', color: '#999', fontWeight: 'normal', marginLeft: '8px' }}>
                        （別名: {species.species_aliases.join(', ')}）
                      </span>
                    )}
                      <span className="scientific"> {species.scientific_name} </span>
                  </h3>
                  
                  {/* 国 */}
                  {national.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '4px' }}>
                        🏛️ 国
                      </div>
                      <div className="prefecture-badges">
                        {national.map((j: any, i: number) => (
                          <span key={i} className={`category ${getCategoryClass(j.category)}`}>
                            {j.jurisdiction_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 都道府県 */}
                  {prefecture.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '4px' }}>
                        🗾 都道府県
                      </div>
                      <div className="prefecture-badges">
                        {prefecture.map((j: any, i: number) => (
                          <span key={i} className={`category ${getCategoryClass(j.category)}`}>
                            {j.jurisdiction_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 市町村 */}
                  {municipality.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '4px' }}>
                        🏘️ 市町村
                      </div>
                      <div className="prefecture-badges">
                        {municipality.map((j: any, i: number) => (
                          <span key={i} className={`category ${getCategoryClass(j.category)}`}>
                            {j.jurisdiction_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="meta-info">
                    <span className="meta-item">🔬 {species.taxonomy}</span>
                    <span className="meta-item">📍 計{species.jurisdictions.length}箇所で指定</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <footer>
        <p>データ出典：環境省・都道府県・市町村レッドリスト</p>
      </footer>

      {/* モーダル */}
      {selectedSpecies && (() => {
        // フィルター条件に合致する自治体のみ表示
        const visibleJurisdictions = filterJurisdictionsForDisplay(selectedSpecies.jurisdictions)
        const { national, prefecture, municipality } = groupJurisdictionsByType(visibleJurisdictions)
        return (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeModal}>×</button>
              
              <h2>
                {selectedSpecies.species_name}
                {selectedSpecies.species_aliases.length > 0 && (
                  <span style={{ fontSize: '0.6em', color: '#999', fontWeight: 'normal', marginLeft: '8px' }}>
                    （別名: {selectedSpecies.species_aliases.join(', ')}）
                  </span>
                )}
              </h2>
              <p className="scientific">{selectedSpecies.scientific_name}</p>
              <p className="taxonomy-label">分類：{selectedSpecies.taxonomy}</p>
              
              <h3>指定状況</h3>
              
              {/* 国 */}
              {national.length > 0 && (
                <>
                  <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#2c5f2d' }}>
                    🏛️ 国
                  </h4>
                  <table className="prefecture-table">
                    <thead>
                      <tr>
                        <th>機関</th>
                        <th>学名</th>
                        <th>カテゴリ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {national.map((j: any, i: number) => (
                        <tr key={i}>
                          <td>{j.jurisdiction_name}</td>
                          <td className="scientific-cell">{j.scientific_name}</td>
                          <td>
                            <span className={`category ${getCategoryClass(j.category)}`}>
                              {j.category}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              
              {/* 都道府県 */}
              {prefecture.length > 0 && (
                <>
                  <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#2c5f2d' }}>
                    🗾 都道府県
                  </h4>
                  <table className="prefecture-table">
                    <thead>
                      <tr>
                        <th>都道府県</th>
                        <th>学名</th>
                        <th>カテゴリ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prefecture.map((j: any, i: number) => (
                        <tr key={i}>
                          <td>{j.jurisdiction_name}</td>
                          <td className="scientific-cell">{j.scientific_name}</td>
                          <td>
                            <span className={`category ${getCategoryClass(j.category)}`}>
                              {j.category}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              
              {/* 市町村 */}
              {municipality.length > 0 && (
                <>
                  <h4 style={{ marginTop: '20px', marginBottom: '10px', color: '#2c5f2d' }}>
                    🏘️ 市町村
                  </h4>
                  <table className="prefecture-table">
                    <thead>
                      <tr>
                        <th>市町村</th>
                        <th>学名</th>
                        <th>カテゴリ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {municipality.map((j: any, i: number) => (
                        <tr key={i}>
                          <td>
                            {j.jurisdiction_name}
                            {j.parent_prefecture && (
                              <span style={{ fontSize: '0.85em', color: '#999', marginLeft: '4px' }}>
                                （{j.parent_prefecture}）
                              </span>
                            )}
                          </td>
                          <td className="scientific-cell">{j.scientific_name}</td>
                          <td>
                            <span className={`category ${getCategoryClass(j.category)}`}>
                              {j.category}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        )
      })()}
    </>
  )
}