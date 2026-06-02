# assets/ 画像差し替えガイド

ゲームは画像が無くても絵文字フォールバックで動作します。PNGを置くと自動で使われます。

## 画像仕様（共通）

- 形式：**PNG（背景透明）**
- 用途：スマホ縦画面のHTMLゲーム
- 画風：**少年誌・コロコロ風／明るい宇宙冒険／AIDA TOYシリーズらしい**
- かわいいが、少しクセがある
- HTMLゲーム内で使いやすい**シンプルで分かりやすいシルエット**
- 余白は詰める（被写体を中央に、トリミングしやすく）
- 強い影や複雑な背景は入れない（透明背景）

## 推奨サイズの目安

| 種別 | 目安サイズ | 置き場所 |
|------|-----------|----------|
| 仲間キャラ（アイコン/図鑑） | 512×512 | `assets/characters/<id>.png` |
| 敵 | 512×512 | `assets/enemies/<id>.png` |
| 飛行船 | 768×512 | `assets/ships/<name>.png` |
| タイトル主人公 | 768×1024 | `assets/title/<name>.png` |
| UI / シューティング素材 | 任意 | `assets/ui/` `assets/shooting/` |

## ファイル名と読み込み規則

- 仲間キャラのIDは `app.js` の `ALLIES`（`c1`〜`c100`）。
  読み込みパスは **`assets/characters/<id>.png`**（例：`c1.png`, `c2.png`, `c100.png`）。
- 敵IDは `e1`〜`e20`。読み込みは `assets/enemies/<id>.png`。
- 例として今回用意するプロンプトと想定ファイル名は `docs/image_prompts.md` を参照。

> 注：画像生成例では `c001.png` のようなゼロ埋め名も挙げていますが、
> 現状のローダーは **`c1.png` 形式**を読みます。差し替え時はこの形式に合わせてください
> （ゼロ埋めにする場合は `app.js` の `img` 生成箇所の変更が必要）。

## 生成プロンプト

主人公・飛行船・仲間3体の日本語プロンプトは **`docs/image_prompts.md`** にまとめています。
ChatGPT等で生成 → 上記パスに配置 → リロードで反映されます。

## 差し替えルール（まとめ）

- 画像はすべて **PNG 推奨**
- **背景透明**
- **ファイル名はコード側のIDと一致させる**（仲間：`c1`〜`c100` → `assets/characters/c1.png` …、敵：`e1`〜`e20`）
- 画像がない場合は **絵文字・CSS表示にフォールバック**（無くても動作する）
- **まずは5枚のみ差し替え対象**：
  - `assets/title/hero_main.png`
  - `assets/ships/ship_default.png`
  - `assets/characters/c1.png`（c001／ロボ太）
  - `assets/characters/c2.png`（c002／ねこ船長）
  - `assets/characters/c3.png`（c003／おばけ）
- **100体全員分は後回し**
- 生成プロンプトは `docs/image_prompts.md` を参照（Claude Code 側では画像生成は行わない）
