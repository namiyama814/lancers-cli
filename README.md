# lancers-cli

ランサーズの公開案件をターミナルから検索・確認する TypeScript CLI です。

公式の第三者向け API はないため、公開の検索ページと案件詳細ページを取得してパースします。ログインや応募操作には対応していません。

## 必要環境

- Node.js 20 以上

## セットアップ

```bash
npm install
npm run build
```

開発時はビルドなしで実行できます。

```bash
npm run dev -- search TypeScript
```

## 使い方

```bash
# 案件検索
lancers search [keyword] [options]

# 案件詳細
lancers show <workId|url> [--json]
```

### 例

```bash
# キーワード検索（新着順）
npx tsx src/index.ts search TypeScript --sort started

# プロジェクトのみ・予算帯・未提案
npx tsx src/index.ts search TypeScript \
  --type project \
  --budget-from 50000 \
  --budget-to 300000 \
  --without-proposal

# カテゴリパス指定（AI・システム開発）
npx tsx src/index.ts search --category system --page 2

# JSON（jobs + pageInfo）
npx tsx src/index.ts search Python --page 2 --json

# 案件詳細
npx tsx src/index.ts show 5610630
npx tsx src/index.ts show https://www.lancers.jp/work/detail/5610630 --json
```

ビルド後は次でも実行できます。

```bash
node dist/index.js search TypeScript
npm link   # 任意: `lancers` コマンドを PATH に追加
```

### `search` オプション

| オプション | 説明 |
| --- | --- |
| `-p, --page <n>` | ページ番号（デフォルト: 1） |
| `-s, --sort <sort>` | 並び順 |
| `-t, --type <type>` | 仕事種別（`project` / `task` / `competition` / `job`）。複数指定可 |
| `-c, --category <path>` | カテゴリパス（例: `system`, `system/cloud_engineering`） |
| `--budget-from <yen>` | 予算下限（円） |
| `--budget-to <yen>` | 予算上限（円） |
| `--without-proposal` | 提案ゼロの案件のみ |
| `--json` | JSON 出力 |

### `--sort` の選択肢

| 値 | 意味 |
| --- | --- |
| `started` | 新着順（デフォルト） |
| `budget` | 予算順 |
| `client` | クライアント評価順 |
| `deadlined` | 締切が近い順 |
| `proposal` | 提案数が多い順 |
| `proposal_asc` | 提案数が少ない順 |

### 取得できる情報

- `search`: ID / タイトル / 種別 / カテゴリ / 予算 / 当選者数・募集人数 / URL
- `search` ページ情報: 現在ページ / 総ページ / 総件数 / 次・前ページ有無
- `show`: タイトル / 業種 / 予算 / 募集期間 / 提案数 / 依頼概要 / URL
- 検索結果から「募集終了」は除外します（総件数はサイト表示値）

`--json` の検索結果は次の形です。

```json
{
  "jobs": [],
  "pageInfo": {
    "page": 1,
    "pageSize": 30,
    "totalCount": 3342,
    "totalPages": 9,
    "hasNext": true,
    "hasPrev": false
  },
  "url": "https://www.lancers.jp/work/search?..."
}
```

## 注意

- 公開ページの HTML を参照する非公式クライアントです。ランサーズの利用規約を確認し、過度な連続リクエストは避けてください。
- サイトの HTML 構造が変わるとパースに失敗する場合があります。
