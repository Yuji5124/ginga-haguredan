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
| 敵 | 512×512 | `assets/enemies/stNN_slug.png` |
| 星 / ステージ背景 | 1536×1024 以上 | `assets/stars/<stage>.png` |
| 飛行船 | 768×512 | `assets/ships/<name>.png` |
| タイトル主人公 | 768×1024 | `assets/title/<name>.png` |
| UI / シューティング素材 | 任意 | `assets/ui/` `assets/shooting/` |

## 実装済みの差し替えスロット（PNGを置けば自動で表示／無ければ従来表示）

| 画面 | 役割 | ファイル |
|------|------|----------|
| タイトル | 背景 | `assets/backgrounds/title_space_vertical.png` |
| タイトル | ロゴ | `assets/title/logo_main.png` |
| タイトル | 主人公 | `assets/title/hero_main.png` |
| タイトル | 飛行船 | `assets/characters/c60.png` |
| ワールドマップ | 飛行船 | `assets/characters/c60.png` |
| シューティング | 自機オルカ号 | `assets/ships/player_hagure_airship_orca.png` |
| ワールドマップ / 航行前 / 航行中 / 到着 | 星画像 | `assets/stars/1.png` … `assets/stars/20.png` |
| RPG戦闘 / スカウト / 図鑑 | 仲間キャラ | `assets/characters/c1.png` … `c60.png` |
| RPG戦闘 / ワールドマップ / 航行前 | ST1〜ST20敵 | `assets/enemies/st01_space_junk_storm.png` … `st20_lastgear.png` |
| ラスボス戦 | 予備ボス画像 | `assets/enemies/final_boss.png`（明示画像が無い場合のフォールバック） |
| シューティング | 通常クリスタル | `assets/ui/crystal_normal.png` |
| シューティング | 大クリスタル | `assets/ui/crystal_big.png` |
| シューティング | 回復クリスタル | `assets/ui/crystal_heal.png` |

> いずれも **PNGが無ければ従来のテキスト・絵文字・CSS/3D表示にフォールバック**します。
> まずはこの一覧が差し替え対象。仲間は正式ID `c1`〜`c60` を使います。

## ファイル名と読み込み規則

- 仲間キャラのIDは `app.js` の `ALLIES`（正式ID `c1`〜`c60`）。
  読み込みパスは **`assets/characters/<id>.png`**（例：`c1.png`, `c2.png`, `c20.png`）。
- 現在コードで画像を有効化している仲間は `c1`〜`c60` です。PNGが無い場合のみ絵文字フォールバックで表示します。
- 敵IDは `e1`〜`e20`。画像は `app.js` の `BOSS_IMAGE_BY_STAGE` で **`assets/enemies/stNN_slug.png`** に対応付けます。
- 星画像はステージ番号をそのまま使い、読み込みは **`assets/stars/<stage>.png`** です。
  例：1つ目の星は `assets/stars/1.png`、20個目の星は `assets/stars/20.png`。
  画像が無いステージは、ボス画像または従来の絵文字・CSS背景にフォールバックします。
- ST1〜ST20の敵画像は、敵IDではなく **`assets/enemies/stNN_slug.png`** 形式で管理します。
  `NN` は2桁ステージ番号、`slug` は英小文字・数字・アンダースコアの説明名です。
  例：`st01_space_junk_storm.png`, `st10_captain_zaba.png`, `st20_lastgear.png`。
  対応表は `app.js` の `BOSS_IMAGE_BY_STAGE` に追加します。
- 例として今回用意するプロンプトと想定ファイル名は `docs/image_prompts.md` を参照。

> 注：古い画像生成例では `c001.png` のようなゼロ埋め名も挙げていましたが、
> 現状のローダーは **`c1.png` 形式**を読みます。差し替え時はこの形式に合わせてください
> （ゼロ埋めにする場合は `app.js` の `img` 生成箇所の変更が必要）。

## 生成プロンプト

主人公・飛行船・仲間3体の日本語プロンプトは **`docs/image_prompts.md`** にまとめています。
ChatGPT等で生成 → 上記パスに配置 → リロードで反映されます。

## 差し替えルール（まとめ）

- 画像はすべて **PNG 推奨**
- **背景透明**
- **ファイル名はコード側のIDと一致させる**（仲間：`c1`〜`c60` → `assets/characters/c1.png` …、敵：`stNN_slug.png`）
- ST1〜ST20の敵画像は `stNN_slug.png` 形式を使い、`app.js` の `BOSS_IMAGE_BY_STAGE` で対応付ける
- 画像がない場合は **絵文字・CSS表示にフォールバック**（無くても動作する）
- **主な差し替え対象**：
  - `assets/title/hero_main.png`
  - `assets/characters/c60.png`
  - `assets/characters/c1.png`〜`assets/characters/c60.png`
- 生成プロンプトは `docs/image_prompts.md` を参照（Claude Code 側では画像生成は行わない）
