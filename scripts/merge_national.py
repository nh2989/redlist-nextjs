"""
national.json に追加データをマージするスクリプト

使い方:
    python scripts/merge_national.py <追加ファイル>

例:
    python scripts/merge_national.py national_additional.json

追加ファイルは national.json と同じスキーマのJSON配列であること。
実行後は national.json が上書きされる。
"""

import json
import sys
from pathlib import Path

NATIONAL_JSON = Path(__file__).parent.parent / 'public' / 'data' / 'redlist' / 'national.json'

def main():
    if len(sys.argv) < 2:
        print('使い方: python scripts/merge_national.py <追加ファイル>')
        sys.exit(1)

    additional_path = Path(sys.argv[1])
    if not additional_path.exists():
        print(f'エラー: {additional_path} が見つかりません')
        sys.exit(1)

    with open(NATIONAL_JSON, encoding='utf-8') as f:
        existing = json.load(f)

    with open(additional_path, encoding='utf-8') as f:
        additional = json.load(f)

    merged = existing + additional

    with open(NATIONAL_JSON, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f'{len(existing)} + {len(additional)} = {len(merged)} 件 → {NATIONAL_JSON}')

if __name__ == '__main__':
    main()