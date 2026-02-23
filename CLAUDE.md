# CLAUDE.md — トンマナビジュアライザー

## プロジェクト概要

Webページのトーン＆マナー（色・タイポグラフィ・スペーシング・装飾）を自動解析し、サイドパネルに可視化する Chrome 拡張機能。Manifest V3 準拠。

## 技術スタック

- **言語**: TypeScript (strict mode)
- **UI**: React 18 + CSS（ライブラリなし）
- **ビルド**: Vite 5.4
- **ランタイム**: Chrome Extension Manifest V3
- **外部依存**: なし（React/ReactDOM のみ）

## コマンド

```bash
npm run build      # TypeScript 型チェック + Vite ビルド → dist/
npm run dev        # Vite watch モード（開発中に使用）
npm run typecheck  # tsc --noEmit（型チェックのみ）
```

ビルド成果物は `dist/` に出力される。Chrome の「パッケージ化されていない拡張機能を読み込む」で `dist/` を指定して開発する。

## アーキテクチャ

```
┌─────────────┐     message      ┌──────────────┐     message      ┌─────────────┐
│  Side Panel  │ ←──────────────→ │  Background   │ ←──────────────→ │   Content    │
│  (React UI)  │                  │  (Service SW) │                  │  (DOM解析)   │
└─────────────┘                  └──────────────┘                  └─────────────┘
```

### 3つのコンテキスト

1. **Content Script** (`src/content/`): 対象ページの DOM を走査し、スタイル情報を抽出
2. **Background Service Worker** (`src/background/`): メッセージルーティング、content script の注入、解析タイムアウト管理
3. **Side Panel** (`src/sidepanel/`): React UI。解析結果の表示、比較、エクスポート

### メッセージフロー

```
SidePanel → Background: START_ANALYSIS { tabId }
Background → Content:   START_ANALYSIS
Content → Background:   ANALYSIS_PROGRESS { phase, percent }
Content → Background:   ANALYSIS_RESULT { ...AnalysisResult }
Background → SidePanel: （上記をリレー）
```

## ディレクトリ構成

```
src/
├── shared/types.ts           # 全コンテキスト共通の型定義
├── background/index.ts       # Service Worker（メッセージ中継・script注入）
├── content/
│   ├── index.ts              # 解析オーケストレーター
│   ├── utils/
│   │   ├── color-math.ts     # CIEDE2000 色差計算、RGB↔Lab変換
│   │   └── dom-walker.ts     # DOM走査ユーティリティ
│   └── extractors/
│       ├── colors.ts         # 色抽出（背景・文字・ボーダー・アウトライン・シャドウ）
│       ├── typography.ts     # フォント抽出 + ソース検出（Google/Adobe/System/Self-hosted）
│       ├── spacing.ts        # margin/padding 解析
│       ├── gradients.ts      # グラデーション検出（linear/radial/conic）
│       ├── decorations.ts    # border-radius / box-shadow
│       ├── content-width.ts  # width/max-width パターン
│       └── tone-classifier.ts # トーン自動分類（ミニマル/ポップ/ダーク等）
└── sidepanel/
    ├── App.tsx               # メインコンポーネント（状態管理・タブ追跡）
    ├── main.tsx              # React エントリポイント
    ├── config.ts             # IS_PRO フラグ（フリーミアムモデル）
    ├── styles/global.css     # 全CSS（約800行）
    ├── utils/export.ts       # JSON/CSS/PDF エクスポート
    └── components/
        ├── AnalyzeButton.tsx  # 解析開始/停止ボタン
        ├── StyleDNA.tsx       # スタイルDNA概要カード + トーン分類表示
        ├── ColorPalette.tsx   # カテゴリ別カラーパレット
        ├── Gradients.tsx      # グラデーションプレビュー
        ├── ContrastChecker.tsx # WCAGコントラスト比チェック
        ├── Typography.tsx     # フォント一覧 + ソースバッジ
        ├── Spacing.tsx        # スペーシング値一覧
        ├── ContentWidth.tsx   # コンテンツ幅パターン
        ├── Decorations.tsx    # 角丸・シャドウ
        ├── CompareView.tsx    # 2サイト比較ビュー
        ├── ExportButtons.tsx  # エクスポートボタン（Pro版のみ有効）
        └── CopyableValue.tsx  # コピー可能な値コンポーネント
```

## 重要な設計判断

### フリーミアムモデル（IS_PRO フラグ）

`src/sidepanel/config.ts` の `IS_PRO` で制御。

- `IS_PRO = false`（デフォルト）: エクスポート機能（PDF/JSON/CSS）が無効。テザーメッセージを表示
- `IS_PRO = true`: 全エクスポート機能が有効

Pro 版としてリリースする際は `IS_PRO = true` に変更するだけでよい。

### タブ切り替え時の自動再解析

`App.tsx` で `chrome.tabs.onActivated` を監視。一度でも解析済みなら、別タブに切り替えた際に自動的に再解析を実行する。初回は手動解析が必要。

### パーミッション

`manifest.json` で以下を設定：

- `activeTab`: ユーザーが明示的にアクションを実行したタブへのアクセス
- `tabs`: タブ情報（URL、タイトル）の取得。タブ切り替え検出に必要
- `scripting`: content script の動的注入
- `sidePanel`: サイドパネル UI
- `host_permissions: ["http://*/*", "https://*/*"]`: 任意のタブへの content script 注入（タブ切り替え後の自動解析に必要）

### PDF エクスポート

外部ライブラリを使わず、HTML テンプレートを `window.open()` で新しいウィンドウに書き出し、`window.print()` でブラウザのPDF保存機能を利用する。

### 色の類似度判定

CIEDE2000 アルゴリズム（`color-math.ts`）を使用。単純なRGB距離ではなく、人間の知覚に近い色差を計算して類似色をマージする。

### トーン分類

`tone-classifier.ts` がヒューリスティックベースで以下を分析：
- 色の彩度・明度分布
- ダークモード検出
- フォントサイズの範囲
- border-radius の平均値
- シャドウ・グラデーション数

結果として primary tone（ミニマル/ポップ/コーポレート等）、secondary impression、タグを生成。

## 解析パイプライン

Content Script の `runAnalysis()` は以下の順で実行：

1. **DOM 走査** — 全可視要素の `getComputedStyle()` を収集
2. **色抽出** — 背景色・文字色・ボーダー色をカテゴリ分類、CIEDE2000 でマージ
3. **タイポグラフィ抽出** — フォント情報 + Google Fonts/Adobe Fonts のソース検出
4. **スペーシング抽出** — margin/padding の値を集計
5. **グラデーション検出** — `backgroundImage` から gradient を正規表現でパース
6. **装飾抽出** — border-radius, box-shadow の集計
7. **コンテンツ幅抽出** — width/max-width パターンの検出
8. **コントラスト比計算** — 背景色×文字色の組み合わせを WCAG 基準で評価
9. **StyleDNA 構築** — 上記を要約した概要データ
10. **トーン分類** — StyleDNA + 色データからトーンを自動分類

各ステップ間で `ANALYSIS_PROGRESS` メッセージを送信し、UI にプログレスバーを表示する。

## 開発ワークフロー

```bash
# 1. 依存インストール
npm install

# 2. ビルド
npm run build

# 3. Chrome にロード
#    chrome://extensions → デベロッパーモード ON → 「パッケージ化されていない拡張機能を読み込む」→ dist/ を選択

# 4. 開発中は watch モード
npm run dev
# コード変更後、Chrome の拡張機能ページで「更新」ボタンを押す

# 5. 型チェック
npm run typecheck
```

## 注意事項

- `dist/` は `.gitignore` に含まれる。ビルド成果物はコミットしない
- Chrome 内部ページ（`chrome://`、`about:`、PDF 等）は解析不可。Background スクリプトで URL を検証してブロックする
- UI のテキストは日本語。国際化（i18n）は未対応
- テストフレームワークは未導入
- CSS は `global.css` に一括管理（CSS Modules / CSS-in-JS 未使用）
