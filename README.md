# lancers-cli

ランサーズの公開案件を検索・確認する TypeScript ツールです。

- **CLI**: ターミナルから案件検索・詳細表示
- **MCP (Cloudflare Workers)**: AI クライアント向けのリモート MCP サーバー

公式の第三者向け API はないため、公開の検索ページと案件詳細ページを取得してパースします。ログインや応募操作には対応していません。

## 必要環境

- Node.js 20 以上

## セットアップ

```bash
npm install
npm run build
npm run types   # Workers 用型生成（初回・wrangler 変更後）
```

## CLI

```bash
npm run dev -- search TypeScript
npm run dev -- show 5610630 --json
```

### 使い方

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

## MCP サーバー (Cloudflare Workers)

Agents SDK の `createMcpHandler` によるステートレス MCP サーバーです。エンドポイントは `/mcp`。
Worker は Lancers への取得を安定させるため、Cloudflare の配置ヒントで東京近辺のリージョンに配置します。

### 公開ツール

| Tool | 説明 |
| --- | --- |
| `search_jobs` | 案件検索（keyword / type / category / budget / page など） |
| `get_job_detail` | 案件詳細（work ID または URL） |

### ローカル起動

```bash
npm run types
npm run dev:worker
```

- ヘルス: `http://127.0.0.1:8787/`
- MCP: `http://127.0.0.1:8787/mcp`

### デプロイ

```bash
npm run deploy
```

デプロイ済みの MCP URL:

```text
https://lancers-mcp.namiyama814.workers.dev/mcp
```

Cursor などの MCP クライアントには、上記 URL を Streamable HTTP エンドポイントとして登録します。

ChatGPT で使う場合は開発者モードを有効にし、ChatGPT Plugins で公開 HTTPS URL の `/mcp` までを接続先に登録してください。新しい会話でその接続を選択してから検索を依頼します。認証設定は不要です。

`/mcp` をブラウザで直接開くと GET リクエストになり、`405 Method Not Allowed` が返ります。これはステートレス MCP の仕様です。MCP クライアントは同じ URL に POST で接続し、`search_jobs` を呼び出します。

## 取得できる情報

- `search` / `search_jobs`: ID / タイトル / 種別 / カテゴリ / 予算 / 当選者数・募集人数 / URL
- ページ情報: 現在ページ / 総ページ / 総件数 / 次・前ページ有無
- `show` / `get_job_detail`: タイトル / 業種 / 予算 / 募集期間 / 提案数 / 依頼概要 / URL
- 検索結果から「募集終了」は除外します（総件数はサイト表示値）

`--json` / MCP の検索結果は次の形です。

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
- MCP エンドポイントは認証なしで公開しています。URL を知っている人は誰でも検索・詳細取得ツールを利用できます。
