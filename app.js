// ===== 銀河はぐれ団 / メインロジック =====
let THREE = createThreeFallback();
let threeMode = "canvas-fallback";

import("https://unpkg.com/three@0.160.0/build/three.module.js")
  .then(mod => {
    THREE = mod;
    threeMode = "webgl";
  })
  .catch(err => {
    console.warn("Three.js CDN load failed. Using canvas fallback.", err);
  });

function createThreeFallback() {
  class Vec3 {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { return this.set(v.x, v.y, v.z); }
    distanceTo(v) {
      const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
      return Math.hypot(dx, dy, dz);
    }
    setScalar(v) { return this.set(v, v, v); }
  }
  class Obj3D {
    constructor() {
      this.position = new Vec3();
      this.rotation = new Vec3();
      this.scale = new Vec3(1, 1, 1);
      this.children = [];
      this.userData = {};
      this.visible = true;
    }
    add(o) { this.children.push(o); return this; }
  }
  class Scene extends Obj3D {
    constructor() { super(); this.userData = {}; }
    remove(o) {
      this.children = this.children.filter(child => child !== o);
      return this;
    }
  }
  class Group extends Obj3D {}
  class Mesh extends Obj3D {
    constructor(geometry, material = {}) { super(); this.geometry = geometry; this.material = material; }
  }
  class Points extends Mesh {}
  class Geometry {
    constructor(kind = "geometry", radius = 0.5) { this.kind = kind; this.radius = radius; this.attributes = {}; }
    setAttribute(name, attr) { this.attributes[name] = attr; return this; }
  }
  class BufferAttribute { constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; } }
  class Material { constructor(opts = {}) { Object.assign(this, opts); } }
  const colorToCss = (color, fallback = "#bcd4ff") => {
    if (typeof color === "number") return `#${color.toString(16).padStart(6, "0").slice(-6)}`;
    return color || fallback;
  };
  const eachObject = (root, fn, parent = { x: 0, y: 0, z: 0 }) => {
    if (!root || root.visible === false) return;
    const world = {
      x: parent.x + (root.position?.x || 0),
      y: parent.y + (root.position?.y || 0),
      z: parent.z + (root.position?.z || 0),
    };
    fn(root, world);
    (root.children || []).forEach(child => eachObject(child, fn, world));
  };
  class WebGLRenderer {
    constructor() {
      this.domElement = document.createElement("canvas");
      this.ctx = this.domElement.getContext("2d");
    }
    setPixelRatio() {}
    setSize(w, h) {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      this.domElement.style.width = `${w}px`;
      this.domElement.style.height = `${h}px`;
      this.domElement.width = Math.max(1, Math.floor(w * ratio));
      this.domElement.height = Math.max(1, Math.floor(h * ratio));
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    render(scene) {
      const w = this.domElement.clientWidth || this.domElement.width;
      const h = this.domElement.clientHeight || this.domElement.height;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.35, 10, w * 0.5, h * 0.5, h * 0.75);
      grad.addColorStop(0, "#151a3c");
      grad.addColorStop(1, "#05030f");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      eachObject(scene, (o, p) => {
        if (o instanceof Points) {
          const pos = o.geometry?.attributes?.position?.array || [];
          ctx.fillStyle = colorToCss(o.material?.color, "#bcd4ff");
          for (let i = 0; i < pos.length; i += 90) {
            const x = (w * 0.5 + pos[i] * 2 + p.x * 8) % w;
            const y = (h * 0.5 + pos[i + 1] * 2 + p.z * 0.8) % h;
            ctx.globalAlpha = 0.7;
            ctx.fillRect((x + w) % w, (y + h) % h, 1.5, 1.5);
          }
          ctx.globalAlpha = 1;
          return;
        }
        const type = o.userData?.type;
        const hasShape = o instanceof Mesh || type || (o instanceof Group && o.children.length);
        if (!hasShape) return;
        const sx = w * 0.5 + p.x * 28;
        const sy = h * 0.54 - p.y * 28 + p.z * 0.42;
        const baseR = o.userData?.r || o.geometry?.radius || (type ? 0.7 : 0.45);
        const r = Math.max(2, baseR * (type === "bullet" ? 5 : 10));
        const color = type === "rock" ? "#a48d72"
          : type === "crystal" ? (o.userData.kind === "heal" ? "#66ff99" : "#c266ff")
          : type === "enemy" ? "#ff5577"
          : type === "bullet" ? "#66ccff"
          : colorToCss(o.material?.color, "#66e0ff");
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = type ? 10 : 18;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }
  }
  class PerspectiveCamera extends Obj3D {
    constructor(fov, aspect, near, far) { super(); Object.assign(this, { fov, aspect, near, far }); }
    lookAt() {}
    updateProjectionMatrix() {}
  }
  class Light extends Obj3D { constructor(color, intensity) { super(); this.color = color; this.intensity = intensity; } }
  class FogExp2 { constructor(color, density) { this.color = color; this.density = density; } }
  return {
    WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry: Geometry, BufferAttribute,
    PointsMaterial: Material, MeshStandardMaterial: Material, MeshBasicMaterial: Material,
    Points, Mesh, Group, AmbientLight: Light, DirectionalLight: Light, FogExp2,
    SphereGeometry: class extends Geometry { constructor(r = 0.5) { super("sphere", r); } },
    CircleGeometry: class extends Geometry { constructor(r = 0.5) { super("circle", r); } },
    ConeGeometry: class extends Geometry { constructor(r = 0.5) { super("cone", r); } },
    CylinderGeometry: class extends Geometry { constructor(r = 0.5) { super("cylinder", r); } },
    IcosahedronGeometry: class extends Geometry { constructor(r = 0.5) { super("icosahedron", r); } },
    OctahedronGeometry: class extends Geometry { constructor(r = 0.5) { super("octahedron", r); } },
    TorusGeometry: class extends Geometry { constructor(r = 0.5) { super("torus", r); } },
    BoxGeometry: class extends Geometry { constructor(w = 0.5) { super("box", w); } },
  };
}

// -------------------------------------------------------------
// データ定義
// -------------------------------------------------------------

// レア度ごとのスカウト設定（必要クリスタル / 基本成功率）。レア度1〜10
const RARITY = {
  1:  { cost: 10,  baseRate: 0.85 },
  2:  { cost: 20,  baseRate: 0.75 },
  3:  { cost: 35,  baseRate: 0.65 },
  4:  { cost: 55,  baseRate: 0.55 },
  5:  { cost: 80,  baseRate: 0.48 },
  6:  { cost: 110, baseRate: 0.42 },
  7:  { cost: 150, baseRate: 0.36 },
  8:  { cost: 200, baseRate: 0.30 },
  9:  { cost: 280, baseRate: 0.24 },
  10: { cost: 400, baseRate: 0.18 },
};

// 航行ボーナスの定義（8種）。レア度に応じて各仲間へ自動割当
const NAV_DEFS = {
  fireRate:     { type: "fireRate",     label: "射撃速度アップ" },
  crystalUp:    { type: "crystalUp",    label: "クリスタル獲得 +10%" },
  rockGuard:    { type: "rockGuard",    label: "隕石ダメージ 低確率で無効" },
  killCrystal:  { type: "killCrystal",  label: "敵撃破で +1💎" },
  bigUp:        { type: "bigUp",        label: "大クリスタル +10" },
  shield:       { type: "shield",       label: "開始時バリア ×1" },
  slow:         { type: "slow",         label: "隕石スピード -10%" },
  missionBoost: { type: "missionBoost", label: "ミッション報酬 強化" },
};
const NAV_ORDER = ["fireRate", "crystalUp", "rockGuard", "killCrystal", "bigUp", "shield", "slow", "missionBoost"];

// スカウト時のボイス（レア度帯で口調を変える簡易版）
function voiceForRarity(r) {
  if (r <= 3) return { ok: "いっしょに行ってもいいよ！", ng: "ごめん、まだ行けない…", bye: "またどこかで会おう" };
  if (r <= 6) return { ok: "よし、仲間になろう！",       ng: "今回は見送るよ",         bye: "縁があったら また頼む" };
  if (r <= 8) return { ok: "面白い、ついて行こう",       ng: "まだ その時じゃない",     bye: "次に会う時を楽しみにな" };
  return       { ok: "我が力、貸し与えよう",           ng: "汝には まだ早い",         bye: "星々の彼方で 再び会おう" };
}

// 仲間100人（作り直し版）。[No, 名前, 絵文字, 見た目・設定, 得意なこと]
// レア度は No から自動（1〜10：各10人）。HP/攻撃・航行ボーナス・ボイスも自動算出
const RAW_ALLIES = [
  [1,"まいごロボ・ピノ","🤖","古い案内ロボ。道をよく間違える","たまに宝箱の場所を当てる"],
  [2,"ほしクズくん","✨","星のかけらみたいな小さい生物","敵に小ダメージ＋まれに目くらまし"],
  [3,"宇宙バイトのミナ","🧑","銀河コンビニで働いていた少女","アイテム使用効果アップ"],
  [4,"ねむりネジ","🔩","すぐ電源が落ちる小型ロボ","眠っている間だけ防御力アップ"],
  [5,"プカプカさん","👨‍🚀","宇宙服だけが漂っている謎の人","攻撃をたまに避ける"],
  [6,"チリトリ星人","👽","掃除好きの小さい宇宙人","状態異常を少し回復"],
  [7,"ヨワシ","🐟","弱そうな宇宙魚","HPが少ない時だけ回避率アップ"],
  [8,"ボタン係ポチ","🔘","ボタンを押すためだけのロボ","ランダムで何かが起きる"],
  [9,"ひびわれ卵モン","🥚","割れかけの卵型モンスター","低確率で大きく跳ねて攻撃"],
  [10,"カサネコ","🐈","傘を持った宇宙猫","雨・水系ステージで少し強い"],
  [11,"レシート博士","🧾","何でもレシートに記録する老人","戦闘後にもらえるお金が少し増える"],
  [12,"ころがり丸","⚙️","丸いメカ生物","体当たり。自分も少しダメージ"],
  [13,"宇宙郵便ペリカン","🕊️","星から星へ手紙を届ける鳥","控え仲間に経験値を少し渡す"],
  [14,"さびた騎士ドン","🛡️","鎧がサビた元騎士","味方をかばう"],
  [15,"プチコック","👨‍🍳","銀河食堂の見習い料理人","戦闘中に小回復料理を作る"],
  [16,"わすれんぼAI","💭","記憶容量が少ないAI","敵の技を1つだけ覚えることがある"],
  [17,"パタパタ電池","🔋","羽の生えた乾電池","味方1人のスキル回数を少し回復"],
  [18,"すなぼこり兄弟","🏜️","砂でできた双子","敵の命中率を下げる"],
  [19,"ガムテープマン","🩹","壊れたものを何でも貼る人","ロボ系の仲間を少し回復"],
  [20,"ミニアンテナ","📡","小さな通信生物","敵の次の行動をたまに予測"],
  [21,"はぐれ整備士ニコ","🔧","どの船にも乗せてもらえなかった整備士","飛行系・ロボ系を強化"],
  [22,"ドリル小僧ガリ","⛏️","頭にドリルがある少年","防御の高い敵に強い"],
  [23,"月面うさぎモチ","🐇","月で餅をついていた宇宙うさぎ","敵をスタンさせる"],
  [24,"ピクセル魔女ドット","👾","体がドット絵みたいな魔女","敵の能力を少しバグらせる"],
  [25,"スモーク忍者ケムリ","🥷","いつも煙に包まれている忍者","回避支援"],
  [26,"ジャンク犬ラフ","🐕","部品をくわえて走るメカ犬","戦闘後に素材を拾う"],
  [27,"フライパン王子","🍳","フライパンを武器にする王子","反撃が得意"],
  [28,"星くずアイドル・リリ","🎤","人気はないが一生懸命なアイドル","味方のやる気を上げる"],
  [29,"タイヤ星人クル","🛞","タイヤ型の宇宙人","素早さが高い"],
  [30,"ザコ将軍","🎖️","自分を強いと思っている弱い将軍","敵の注意を引きつける"],
  [31,"ブリキ船長","🚢","小さなブリキ宇宙船の船長","味方全体の防御アップ"],
  [32,"メテオ配達員ジン","☄️","隕石便を届ける配達員","先制攻撃しやすい"],
  [33,"からくり姫ネネ","👸","古い宮殿から逃げた機械姫","自動回復"],
  [34,"バブル医師ポワ","🫧","泡の中に住む医者","回復＋毒治療"],
  [35,"黒ねじのガンマ","🌑","黒いネジ型ロボ","単体火力が高い"],
  [36,"コイン占い師ルゥ","🪙","コインで未来を決める占い師","クリティカル率を操作"],
  [37,"グラタン星人","🍲","熱々の皿に乗った宇宙人","火属性攻撃"],
  [38,"フードの少年シロ","🧥","顔を隠した無口な少年","敵の強化を消す"],
  [39,"ぷち重力くん","🌀","小さなブラックホールの子ども","敵の素早さを下げる"],
  [40,"ネオンスケーター","🛹","宇宙道路を滑る少年","回避と連続攻撃"],
  [41,"ラジオ侍ゼンパ","📻","電波を刀にする侍","雷属性攻撃"],
  [42,"きつね技師コン","🦊","変装が得意な宇宙きつね","敵をだます"],
  [43,"アイス配達娘ユキ","🧊","冷凍惑星から来た配達員","氷属性＋速度低下"],
  [44,"片目のロボ兵ボイド","👁️","片目だけ光る旧型兵士","高命中射撃"],
  [45,"オルゴール少女ミミ","🎶","胸にオルゴールがある少女","味方全体を少し回復"],
  [46,"カミナリ太鼓ドン","🥁","雷太鼓を背負った大男","全体雷攻撃"],
  [47,"シール魔法使いペタ","🏷️","魔法をシールにして貼る","味方に一時強化"],
  [48,"宇宙漁師ハル","🎣","星雲で魚を釣る漁師","レア素材入手率アップ"],
  [49,"ボロマントのカイ","🗡️","破れたマントの剣士","HPが低いほど強い"],
  [50,"トランク博士","💼","トランクの中に研究所がある博士","ランダム発明品を使う"],
  [51,"スター消防士レン","🧯","星の火事を消す消防士","火属性ダメージを軽減"],
  [52,"ホログラム姉妹","👯","実体があるようでない双子","分身で攻撃回避"],
  [53,"銀河薬売りモンド","🧪","あやしい薬を売る旅人","強回復だが副作用あり"],
  [54,"コスモ大工ゲン","🔨","宇宙船を直す大工","防御バリアを作る"],
  [55,"ロケット僧サン","🧘","背中にロケットを背負った僧","回復＋素早さアップ"],
  [56,"ゼリー騎士プルン","🍮","ぷるぷるの鎧騎士","物理攻撃に強い"],
  [57,"ビーム書道家スミ","🖌️","光で文字を書く書道家","敵全体に封印効果"],
  [58,"パラボラ少女エコ","🛰️","大きなアンテナを持つ少女","敵のスキルを反射することがある"],
  [59,"砂時計ロボ・チク","⏳","時間管理ロボ","ターン順を少し操作"],
  [60,"スターモグラ隊長","🦡","星の地下を掘る隊長","防御無視攻撃"],
  [61,"赤マフラーのルカ","🧣","宇宙を歩いて渡る少年","高回避・高火力"],
  [62,"鉄塔ロボ・タワン","🗼","鉄塔みたいに巨大なロボ","味方全体を守る"],
  [63,"彗星ピエロ・ラフ","🤡","笑いながら隕石に乗る道化師","ランダム超効果"],
  [64,"星雲剣士ラグナ","⚔️","星雲から来た剣士","全体斬撃"],
  [65,"ダークナース・ノア","💉","闇医者のような看護師","回復と呪いを両方使う"],
  [66,"宇宙怪盗セブン","🎭","7つの星を盗んだ怪盗","レアアイテムを盗む"],
  [67,"白い獣人ミロク","🐺","月光を浴びる獣人","連続攻撃"],
  [68,"コアメイカー・リタ","⚛️","星の核を作る技師","味方の攻撃力を大きく上げる"],
  [69,"逆さ博士","🙃","逆さまに浮く研究者","敵味方の能力変化を反転"],
  [70,"ガラス竜リュカ","🐲","透明な体の小型竜","魔法攻撃に強い"],
  [71,"旧銀河軍のアイン","🪖","かつて軍にいた脱走兵","指揮能力が高い"],
  [72,"星を読む少女ノルン","🔮","未来の断片を見る少女","次ターンの結果を変える"],
  [73,"宇宙墓守グレイ","🪦","滅んだ星の墓を守る存在","倒れた仲間の力を引き継ぐ"],
  [74,"機械天使メル","👼","羽のあるロボット","全体回復＋防御"],
  [75,"青炎のオルカ","🔥","青い炎をまとった戦士","火と水の複合攻撃"],
  [76,"記録者ログ","📚","銀河の記憶を集める存在","戦闘データで強くなる"],
  [77,"双子衛星ルル・ララ","🌗","2つの小さな衛星生命体","2回行動支援"],
  [78,"黒箱の少年ノイズ","📦","記憶を失ったAI少年","敵の行動をコピー"],
  [79,"星海の巫女セナ","🌌","星の海と会話できる巫女","全体補助が強い"],
  [80,"銀河裁縫師イト","🧵","星の糸で服を縫う職人","防具強化・バリア"],
  [81,"はぐれ剣王ギル","🤺","王になれなかった剣士","単体最強級の剣技"],
  [82,"星喰いベビー","👶","星を食べる怪獣の赤ちゃん","戦闘が長いほど強くなる"],
  [83,"クロック・ゼロ","🕰️","壊れた時間兵器","敵の行動を1回遅らせる"],
  [84,"銀河魔女ステラ","🧙‍♀️","銀河の外から来た魔女","全体魔法が強い"],
  [85,"太陽炉ゴウマ","☀️","胸に小さな太陽炉がある巨人","HPを削って大火力"],
  [86,"アンドロイド・イヴァ","🦾","感情を学ぶ戦闘AI","敵の行動を学習して反撃"],
  [87,"黒星騎士バル","🖤","黒い星の鎧を着た騎士","防御と反撃が強い"],
  [88,"ミラクル商人ポル","🎩","奇跡を売る商人","低確率で戦況をひっくり返す"],
  [89,"白銀竜コメット","🐉","彗星から生まれた竜","高火力・高素早さ"],
  [90,"星屑賢者モル","🧙","星屑を集める小さな賢者","回復・攻撃・補助を万能に使う"],
  [91,"はぐれ王ギン","👑","王冠だけ立派な小さい王様","味方が倒れるほど強くなる"],
  [92,"ノヴァちゃん","💥","小さな超新星の子","一度だけ超火力爆発"],
  [93,"アステラ","🌟","星の守護者","味方全体を復活させる"],
  [94,"ブラックホールくん","🕳️","黒い丸顔の重力生物","敵全体を吸い込む"],
  [95,"プロト・ワン","🤖","最初に作られたロボ","ロボ系仲間を大幅強化"],
  [96,"エーテル姫","🧚","宇宙の気流に乗る姫","毎ターン全体回復"],
  [97,"バグの神様グリッチ","🪲","世界のルールから外れた存在","敵の行動を無効化することがある"],
  [98,"ラストコメット","💫","最後の彗星生命体","1戦に1回だけ超必殺"],
  [99,"迷子の創造主コドモ","🧒","銀河を作ったかもしれない子ども","ランダムで奇跡を起こす"],
  [100,"はぐれ飛行船オルカ号","🚀","4人乗れる小型飛行船。意思を持つ仲間","全体の回避・移動・支援。終盤で覚醒する"],
];

// RAW から実データへ展開（レア度・ステータス・航行効果・ボイスを自動算出）
const ALLIES = RAW_ALLIES.map(([no, name, face, setting, skill]) => {
  const rarity = Math.floor((no - 1) / 10) + 1;
  const id = "c" + no;
  return {
    id, name, face, img: id, rarity, setting, skill,
    tag: skill,                         // スカウト画面のタグ欄に「得意なこと」を表示
    hp: 30 + rarity * 14,               // レア度でHP自動算出
    atk: 8 + rarity * 4,                // レア度で攻撃力自動算出
    navBonus: NAV_DEFS[NAV_ORDER[(no - 1) % NAV_ORDER.length]],
    voice: voiceForRarity(rarity),
  };
});

const STARTER_ID = "c1"; // 初期メンバー（まいごロボ・ピノ）

// 敵の系統ラベル
const ENEM_CAT = { bio: "宇宙生物系", robo: "ロボ・AI系", villain: "悪人系", concept: "概念系" };

// 20ステージ：[stage, 星名, 星アイコン, 敵名, 敵絵文字, 系統, ギミック(説明)]
// 敵HP/攻撃・報酬・スカウト出現レア度帯は stage から自動算出
const RAW_STAGES = [
  [1, "宇宙のゴミ捨て場",       "🛰️", "宇宙ゴミあらし",             "🗑️", "robo",    "弱い。基本操作を覚える敵"],
  [2, "銀河検問ゲート",         "🚧", "カチカチ検問ロボ",           "🤖", "robo",    "防御が少し高い"],
  [3, "星くず街道",             "🌠", "スターどろぼう",             "🥷", "villain", "素早い。たまにアイテムを奪う"],
  [4, "商人の停泊地",           "🪐", "ひとりじめ商人ガメル",       "🤑", "villain", "お金を奪う攻撃"],
  [5, "スクラップ工場",         "⚙️", "ねじまき番長",               "🪛", "robo",    "攻撃力が高いが命中が低い"],
  [6, "流星の谷",               "☄️", "流星オオカミ",               "🐺", "bio",     "HPが減ると攻撃力アップ"],
  [7, "迷子の宙域",             "🌫️", "迷子狩りドローン",           "🛸", "robo",    "仲間1人を一時 行動不能にする"],
  [8, "ロボ管理区",             "🏭", "ブラック企業ロボ部長",       "👔", "robo",    "毎ターン スキル回数を削る"],
  [9, "サーカス衛星",           "🎪", "星くずサーカス団長",         "🎩", "villain", "ランダムな状態異常"],
  [10,"海賊の巣",               "🏴‍☠️","宇宙海賊キャプテン・ザバ",  "⚓", "villain", "高火力。仲間の支援が重要"],
  [11,"廃兵器の墓場",           "🪦", "サビつき巨兵ゴルドン",       "🗿", "robo",    "防御が非常に高い"],
  [12,"鏡張りの星",             "🪞", "偽りの勇者ミラー",           "🪞", "villain", "こちらの強化をコピーする"],
  [13,"運命管理塔",             "🎲", "運命管理AI ラックレス",      "🎯", "robo",    "クリティカルや回避を封じる"],
  [14,"喰われた小星団",         "🌑", "星喰い幼獣グラトン",         "🦖", "bio",     "毎ターン 少しずつ強くなる"],
  [15,"銀河法廷",               "⚖️", "銀河裁判官ジャッジム",       "👨‍⚖️","concept", "弱い仲間を狙ってくる"],
  [16,"記憶の渦",               "🌀", "記憶ぬすみノイズ",           "🕸️", "concept", "スキルを一時封印する"],
  [17,"無重力宮",               "🌌", "無重力の王グラビス",         "🪐", "concept", "素早さを大きく下げる"],
  [18,"回収機関ステーション",   "📡", "銀河回収機関の艦長レイド",   "🎖️", "villain", "仲間を1人ずつ弱体化"],
  [19,"人工勇者の城",           "🏰", "完成された勇者オルデン",     "🦸", "robo",    "全能力が高い。弱点が少ない"],
  [20,"運命固定装置・最深部",   "⚙️", "運命固定装置ラストギア",     "🕰️", "concept", "フェーズ制。最後のボス"],
];

// RAW_STAGES から STARS（ステージ）と ENEMIES（敵）を生成
const STARS = [];
const ENEMIES = {};
RAW_STAGES.forEach(([stage, sName, sIcon, eName, eFace, cat, gim]) => {
  const id = "s" + stage, eid = "e" + stage;
  const boss = stage === 20;
  const hp = Math.round((22 + stage * 14) * (boss ? 1.7 : 1));
  const atk = Math.round((5 + stage * 1.8) * (boss ? 1.4 : 1));
  const reward = boss ? 300 : 20 + stage * 10;
  const center = Math.ceil(stage / 2);
  const rMin = Math.max(1, center - 1);
  const rMax = Math.min(10, center + 1);
  ENEMIES[eid] = { name: eName, face: eFace, img: eid, hp, atk, cat: ENEM_CAT[cat], catKey: cat, gimmick: gim, boss };
  STARS.push({ id, name: sName, icon: sIcon, desc: gim, enemy: eid, reward, rMin, rMax, cat: ENEM_CAT[cat], boss, stage });
});

// ラスボスの登場セリフ
const BOSS_QUOTE = "お前たちのような、弱く、未完成で、偶然集まった者たちに、銀河を変える資格はない";

const allyById = (id) => ALLIES.find(a => a.id === id);

// 航行ミッション（開始時に1つ提示。成功で戦闘/スカウト用ボーナス）
// bonus.type: enemyHp(-10%) / scoutRate(+5%) / crystal(+20) / allyHp(+1)
const MISSIONS = [
  { id: "c5",    type: "crystals", goal: 5,  desc: "クリスタルを5個 集めろ",      bonus: { type: "crystal",   label: "クリスタル +20" } },
  { id: "nohit", type: "nohit",    goal: 10, desc: "10秒間 ノーダメージで耐えろ", bonus: { type: "allyHp",    label: "味方HP +1" } },
  { id: "big1",  type: "big",      goal: 1,  desc: "大クリスタルを1個 拾え",      bonus: { type: "scoutRate", label: "スカウト成功率 +5%" } },
  { id: "e3",    type: "enemies",  goal: 3,  desc: "敵を3体 倒せ",                bonus: { type: "enemyHp",   label: "敵HP -10%" } },
];

// 直前の航行で獲得したボーナス（次の戦闘/スカウトに反映）。なければ null
let stageBonus = null;

// パーティ構成から航行（シューティング）効果を集約
function computeNavEffects(partyIds) {
  const e = {
    fireRateMul: 1, crystalMul: 1, rockGuardChance: 0, killBonus: 0,
    bigBonus: 0, shields: 0, hazardSpeedMul: 1, missionBoost: false, labels: [],
  };
  partyIds.forEach(id => {
    const a = allyById(id);
    if (!a || !a.navBonus) return;
    switch (a.navBonus.type) {
      case "fireRate":     e.fireRateMul *= 0.85; break;
      case "crystalUp":    e.crystalMul *= 1.10; break;
      case "rockGuard":    e.rockGuardChance = Math.min(0.6, e.rockGuardChance + 0.20); break;
      case "killCrystal":  e.killBonus += 1; break;
      case "bigUp":        e.bigBonus += 10; break;
      case "shield":       e.shields += 1; break;
      case "slow":         e.hazardSpeedMul *= 0.90; break;
      case "missionBoost": e.missionBoost = true; break;
    }
    e.labels.push({ name: a.name, img: a.img, face: a.face, label: a.navBonus.label });
  });
  e.fireRateMul = Math.max(0.4, e.fireRateMul);     // 上限（速くなりすぎない）
  e.hazardSpeedMul = Math.max(0.7, e.hazardSpeedMul);
  return e;
}

// （敵データ ENEMIES は上の RAW_STAGES から自動生成）

// -------------------------------------------------------------
// セーブデータ（localStorage）
// -------------------------------------------------------------
const SAVE_KEY = "ginga-haguredan-save-v1";

const defaultSave = () => ({
  crystals: 0,
  cleared: [],                  // クリア済み星ID
  party: [STARTER_ID],          // 初期メンバー
  discovered: [STARTER_ID],     // 図鑑：発見済み（出会った）仲間ID
  recruited: [STARTER_ID],      // 図鑑：加入済み（スカウト成功）仲間ID
});

let save = loadSave();

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = Object.assign(defaultSave(), JSON.parse(raw));
      // 旧バージョン（dex）からの移行：dexは発見済み扱い、パーティ＝加入済み
      if (Array.isArray(data.dex)) {
        data.discovered = Array.from(new Set([...(data.discovered || []), ...data.dex]));
        data.recruited = Array.from(new Set([...(data.recruited || []), ...data.party]));
        delete data.dex;
      }
      // 100人ロスター化に伴う移行：存在しない仲間IDを除去し、初期メンバーを保証
      const valid = new Set(ALLIES.map(a => a.id));
      data.party = (data.party || []).filter(id => valid.has(id));
      data.discovered = (data.discovered || []).filter(id => valid.has(id));
      data.recruited = (data.recruited || []).filter(id => valid.has(id));
      if (data.party.length === 0) data.party = [STARTER_ID];
      if (!data.discovered.includes(STARTER_ID)) data.discovered.push(STARTER_ID);
      if (!data.recruited.includes(STARTER_ID)) data.recruited.push(STARTER_ID);
      return data;
    }
  } catch (e) { console.warn("save load failed", e); }
  return defaultSave();
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
  catch (e) { console.warn("save failed", e); }
}
function resetSave() {
  save = defaultSave();
  persist();
}

// -------------------------------------------------------------
// 画像アセット（PNGがあれば使う / なければ絵文字フォールバック）
// -------------------------------------------------------------
const imgCache = {};
// "characters/robo" などを試し、ロードできたら <img> を返す
function tryImage(path) {
  if (imgCache[path] !== undefined) return imgCache[path];
  const img = new Image();
  img.src = `assets/${path}.png`;
  imgCache[path] = img;
  return img;
}
// 絵文字 or 画像のHTMLを返す（画像が読めなければ絵文字を表示）
function faceHTML(emoji, path) {
  const probe = tryImage(path);
  // 読み込み済みかつ有効なら画像、それ以外は絵文字
  if (probe.complete && probe.naturalWidth > 0) {
    return `<img src="assets/${path}.png" alt="">`;
  }
  // 非同期で読めた場合に差し替えできるよう、絵文字を出しておく
  return emoji;
}

// -------------------------------------------------------------
// 画面管理
// -------------------------------------------------------------
const screens = {};
document.querySelectorAll(".screen").forEach(s => screens[s.id.replace("screen-", "")] = s);
let currentScreen = "title";

function show(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
  currentScreen = name;
  onEnter(name);
}

function onEnter(name) {
  if (name === "worldmap") { startWorldmap(); renderStarList(); refreshCrystals(); }
  else { stopWorldmap(); }
  if (name === "dex") renderDex();
  if (name === "party") renderPartyScreen();
  if (name === "settings") document.getElementById("settings-crystals").textContent = `💎 ${save.crystals}`;
}

// トースト
let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

function refreshCrystals() {
  document.getElementById("wm-crystals").textContent = save.crystals;
}

// -------------------------------------------------------------
// オープニング
// -------------------------------------------------------------
const INTRO_SCENES = [
  {
    type: "crawl",
    tone: "stars",
    title: "銀河はぐれ団",
    symbol: "✦",
    image: null,
    body: [
      "はるか銀河の片すみ。",
      "強い者だけが価値を持つ時代。",
      "弱い者、古い者、役目を失った者たちは",
      "「はぐれ者」と呼ばれていた。",
      "",
      "主人公の暮らす小さな星も、",
      "その流れにのみこまれようとしていた。",
      "",
      "まだ何者でもない旅。",
      "だがその出会いが、",
      "銀河の運命を変えることになる――",
    ],
  },
  {
    type: "text",
    tone: "danger",
    title: "襲撃",
    symbol: "🚨",
    image: null,
    body: [
      "警報――警報――",
      "居住区に被害発生。",
      "至急、避難してください。",
      "",
      "……ぼくの星が、なくなる。",
      "逃げなきゃ。",
    ],
  },
  {
    type: "text",
    tone: "escape",
    title: "小さな飛行船",
    symbol: "🚀",
    image: null,
    body: [
      "主人公は、古い飛行船に飛び乗った。",
      "あてもなく、宇宙へ飛び出す。",
      "",
      "行き先は、ただひとつ。",
      "生きのびること。",
    ],
  },
  {
    type: "text",
    tone: "trash",
    title: "宇宙のごみすてば",
    symbol: "🛰️",
    image: null,
    body: [
      "たどり着いた先は――",
      "宇宙のごみすてば。",
      "",
      "捨てられた機械。",
      "こわれた部品。",
      "だれにも選ばれなかったものたち。",
      "",
      "でも、そこで主人公は出会う。",
    ],
  },
  {
    type: "dialog",
    tone: "pino",
    title: "まいごロボ・ピノ",
    symbol: "🤖",
    image: null,
    body: [
      "「……みち、まちがえました」",
      "",
      "そこにいたのは、ちいさな案内ロボ。",
      "たよりない。弱そう。だけど――",
      "ひとりじゃなかった。",
      "",
      "「ぼく、ピノ。あんない……できないことも、あります」",
      "「でも、いっしょなら、どこかへ行けるかもしれません」",
      "「きぼう、って……そういうものですか？」",
    ],
  },
  {
    type: "text",
    tone: "hope",
    title: "旅のはじまり",
    symbol: "🌟",
    image: null,
    body: [
      "主人公は、ピノを乗せて飛行船を動かした。",
      "この出会いが、旅のはじまりになる。",
      "",
      "銀河には、まだたくさんの“はぐれ者”がいる。",
      "仲間を探しに行こう。",
      "",
      "最初の航行が始まる――",
    ],
  },
];

let introIndex = 0;

function startIntro() {
  introIndex = 0;
  show("intro");
  renderIntroScene();
}

function renderIntroScene() {
  const scene = INTRO_SCENES[introIndex];
  const stage = document.getElementById("intro-stage");
  const visual = document.getElementById("intro-visual");
  const title = document.getElementById("intro-title");
  const body = document.getElementById("intro-body");
  const next = document.querySelector('[data-action="intro-next"]');

  stage.className = `intro-stage is-${scene.type} tone-${scene.tone}`;
  visual.innerHTML = scene.image ? `<img src="${scene.image}" alt="">` : (scene.symbol || "");
  title.textContent = scene.title || "";
  body.innerHTML = scene.body.map(line => line ? `<p>${line}</p>` : `<p class="intro-gap"></p>`).join("");
  next.textContent = introIndex === INTRO_SCENES.length - 1 ? "航行開始" : "次へ";
}

function advanceIntro() {
  if (introIndex >= INTRO_SCENES.length - 1) return finishIntro();
  introIndex++;
  renderIntroScene();
}

function finishIntro() {
  currentStar = STARS[0];
  show("shooting");
  startShooting(currentStar);
}

document.querySelector("#screen-intro").addEventListener("click", (e) => {
  const actionEl = e.target.closest("[data-action]");
  if (actionEl?.dataset.action === "intro-skip") return finishIntro();
  if (actionEl?.dataset.action === "intro-next") return advanceIntro();
  if (!e.target.closest("button")) advanceIntro();
});

// -------------------------------------------------------------
// タイトル
// -------------------------------------------------------------
document.querySelector("#screen-title").addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  switch (el.dataset.action) {
    case "start-game":    startIntro(); break;
    case "continue":      show("worldmap"); break;
    case "open-dex-title": dexReturn = "title"; show("dex"); break;
    case "party":          show("party"); break;
    case "settings":       show("settings"); break;
    case "news":           toast("お知らせは準備中です"); break;
    case "gift":           toast("プレゼントは準備中です"); break;
  }
});

// パーティ / 設定 画面（タイトルのサブ画面）
function renderPartyScreen() {
  const list = document.getElementById("party-list");
  list.innerHTML = save.party.map(id => {
    const a = allyById(id); if (!a) return "";
    return `
      <div class="party-row">
        <div class="pr-face">${faceHTML(a.face, `characters/${a.img}`)}</div>
        <div class="pr-info">
          <div class="pr-name">${a.name} <span class="rarity">★${a.rarity}</span></div>
          <div class="pr-sub">${a.setting}</div>
          <div class="pr-sub">HP${a.hp} ／ こうげき${a.atk} ／ 得意：${a.skill}</div>
          <div class="pr-nav">航行：${a.navBonus.label}</div>
        </div>
      </div>`;
  }).join("");
}
document.querySelector("#screen-party").addEventListener("click", (e) => {
  if (e.target.closest('[data-action="close-sub"]')) show("title");
});
document.querySelector("#screen-settings").addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  if (el.dataset.action === "close-sub") show("title");
  else if (el.dataset.action === "reset-save") {
    if (confirm("セーブデータを消去しますか？")) {
      resetSave(); toast("データを消去しました");
      document.getElementById("settings-crystals").textContent = `💎 ${save.crystals}`;
    }
  }
});

// -------------------------------------------------------------
// ワールドマップ（Three.js 背景 + 星リスト）
// -------------------------------------------------------------
let wmRenderer, wmScene, wmCamera, wmStars, wmRAF;

function initWorldmap() {
  const host = document.getElementById("worldmap-space");
  wmRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  wmRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  resizeRenderer(wmRenderer, host);
  host.appendChild(wmRenderer.domElement);

  wmScene = new THREE.Scene();
  wmCamera = new THREE.PerspectiveCamera(60, host.clientWidth / host.clientHeight, 0.1, 1000);
  wmCamera.position.z = 50;

  // 星フィールド（奥行き表現）
  const geo = new THREE.BufferGeometry();
  const N = 1200;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 200;
    pos[i*3+1] = (Math.random() - 0.5) * 200;
    pos[i*3+2] = (Math.random() - 0.5) * 200;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xbcd4ff, size: 0.6, transparent: true, opacity: 0.9 });
  wmStars = new THREE.Points(geo, mat);
  wmScene.add(wmStars);

  // 中央に大きな惑星（演出）
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(8, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x4466cc, emissive: 0x112244, roughness: 0.7 })
  );
  planet.position.set(10, 12, -10);
  wmScene.add(planet);
  wmScene.userData.planet = planet;

  wmScene.add(new THREE.AmbientLight(0x8899ff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(5, 10, 8);
  wmScene.add(dir);
}

function startWorldmap() {
  if (!wmRenderer) initWorldmap();
  resizeRenderer(wmRenderer, document.getElementById("worldmap-space"));
  const loop = () => {
    wmStars.rotation.y += 0.0004;
    wmStars.rotation.x += 0.0002;
    if (wmScene.userData.planet) wmScene.userData.planet.rotation.y += 0.003;
    wmRenderer.render(wmScene, wmCamera);
    wmRAF = requestAnimationFrame(loop);
  };
  cancelAnimationFrame(wmRAF);
  loop();
}
function stopWorldmap() { cancelAnimationFrame(wmRAF); }

function renderStarList() {
  const list = document.getElementById("star-list");
  list.innerHTML = "";
  STARS.forEach((star, i) => {
    const cleared = save.cleared.includes(star.id);
    // 直前の星をクリアしていれば解放（最初の星は常に解放）
    const unlocked = i === 0 || save.cleared.includes(STARS[i-1].id);
    const card = document.createElement("div");
    card.className = "star-card" + (unlocked ? "" : " locked") + (cleared ? " cleared" : "");
    card.innerHTML = `
      <div class="star-icon">${star.icon}</div>
      <div class="star-info">
        <div class="star-name">${star.boss ? "👑 " : ""}${star.stage}. ${star.name}</div>
        <div class="star-desc"><span class="star-cat">${star.cat}</span> ${star.desc}</div>
      </div>
      ${cleared ? '<span class="star-badge">クリア済</span>' : `<span class="star-badge" style="background:rgba(110,200,255,.18);color:var(--accent)">💎${star.reward}</span>`}
    `;
    if (unlocked) card.addEventListener("click", () => startStage(star));
    list.appendChild(card);
  });
}

let currentStar = null;
function startStage(star) {
  currentStar = star;
  showPreflight(star);
}

// 航行前：今回の仲間効果を表示 → 「航行開始」で出発
function showPreflight(star) {
  const eff = computeNavEffects(save.party);
  document.getElementById("preflight-star").textContent = `${star.icon} ${star.name} へ`;
  const list = document.getElementById("preflight-list");
  list.innerHTML = eff.labels.length
    ? eff.labels.map(l => `
        <div class="pf-row">
          <span class="pf-face">${faceHTML(l.face, `characters/${l.img}`)}</span>
          <span class="pf-name">${l.name}</span>
          <span class="pf-eff">${l.label}</span>
        </div>`).join("")
    : `<div class="pf-row"><span class="pf-eff">特別な効果なし</span></div>`;
  show("preflight");
}

document.querySelector("#screen-preflight").addEventListener("click", (e) => {
  if (e.target.dataset.action === "launch") {
    show("shooting");
    startShooting(currentStar);
  }
});

// -------------------------------------------------------------
// Three.js 宇宙シューティング（最小版）
// -------------------------------------------------------------
const STAGE_TIME = 24; // シューティング1ステージの秒数

const MAX_HP = 3;
const SHIP_R = 0.58; // 飛行船の当たり判定半径（縦型フライト用）
const FLIGHT_X_LIMIT = 5.2;
const FLIGHT_SHIP_Y = -3.15;
const FLIGHT_SPAWN_Y = 4.55;
const FLIGHT_DESPAWN_Y = -4.65;
const FLIGHT_BULLET_TOP = 5.2;
const FLIGHT_OBJECT_Z = 0;
const MANUAL_SHOT_COOLDOWN = 130;
const ARRIVAL_STEP_MS = 850;
const BATTLE_HIT_WAIT_MS = 200;
const BATTLE_TURN_WAIT_MS = 260;
const VICTORY_TO_SCOUT_MS = 550;
const WIPE_RETURN_MS = 1100;

const SH = {
  renderer: null, scene: null, camera: null, raf: null,
  ship: null, wingL: null, wingR: null,
  bullets: [], rocks: [], enemies: [], crystals: [],
  hp: MAX_HP, gained: 0, timeLeft: STAGE_TIME, lastShot: 0, lastSpawn: 0,
  running: false, targetX: 0, targetY: 0, startT: 0,
  keyDir: 0, lastManualShot: 0,
  // アーケードHUD：スコア＆チェイン＆ボム
  score: 0, chain: 0, chainExpire: 0, bombs: 3, lastSpeech: 0, speechIdx: 0,
  // 航行スタッツ＆ミッション
  dmgTaken: 0, kills: 0, bigPicked: 0,
  mission: null, missionProgress: 0, missionDone: false, missionFailed: false,
  // 仲間の航行効果
  nav: null, shieldLeft: 0,
};

const CHAIN_WINDOW = 2600; // チェイン継続時間(ms)
const SPEECH_LINES = [
  "よしよし！ この調子だ！", "銀河の平和は オイラたちが守るぜ！", "クリスタル、いただきっ！",
  "敵が来るぞ、気をつけろ！", "まだまだ いけるさ！", "次の星まで あと少し！",
];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function initShooting() {
  const host = document.getElementById("shooting-canvas");
  SH.renderer = new THREE.WebGLRenderer({ antialias: true });
  SH.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  resizeRenderer(SH.renderer, host);
  host.appendChild(SH.renderer.domElement);

  SH.scene = new THREE.Scene();
  SH.scene.fog = new THREE.FogExp2(0x05030f, 0.012);

  SH.camera = new THREE.PerspectiveCamera(60, host.clientWidth / host.clientHeight, 0.1, 200);
  SH.camera.position.set(0, 0, 12);
  SH.camera.lookAt(0, 0, 0);

  // 背景の星
  const starGeo = new THREE.BufferGeometry();
  const SN = 800;
  const sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) {
    sp[i*3]   = (Math.random() - 0.5) * 38;
    sp[i*3+1] = (Math.random() - 0.5) * 70;
    sp[i*3+2] = -Math.random() * 90;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  SH.bgStars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x99bbff, size: 0.3 }));
  SH.scene.add(SH.bgStars);

  // ライト
  SH.scene.add(new THREE.AmbientLight(0xaabbff, 0.7));
  const dl = new THREE.DirectionalLight(0xffffff, 1);
  dl.position.set(2, 5, 6);
  SH.scene.add(dl);

  // 飛行船（簡易ジオメトリ：将来PNG/モデルに差し替え可）
  SH.ship = buildShip();
  SH.scene.add(SH.ship);

  // 左右の僚機（ウイングマン）：赤＝左 / 金＝右
  SH.wingL = buildWingman(0xff4466);
  SH.wingR = buildWingman(0xffcc44);
  SH.scene.add(SH.wingL); SH.scene.add(SH.wingR);
}

// 小型僚機（コーン）
function buildWingman(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.7, 8),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, metalness: 0.5, roughness: 0.4 })
  );
  body.rotation.x = -Math.PI / 2;
  g.add(body);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0x99ddff }));
  glow.position.z = 0.4;
  g.add(glow);
  return g;
}


// タイトルの中央宇宙船イメージ：丸っこいクリーム色の船体＋青い「n_n」顔
function buildShip() {
  const g = new THREE.Group();

  // 丸い船体（少し横ぶくれ）
  const hull = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 24, 18),
    new THREE.MeshStandardMaterial({ color: 0xe8dcc0, metalness: 0.5, roughness: 0.4, emissive: 0x2a2415 })
  );
  hull.scale.set(1.15, 0.9, 1.05);
  g.add(hull);

  // 顔パネル（カメラ側 +Z）
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 24),
    new THREE.MeshStandardMaterial({ color: 0x0a1430, emissive: 0x0a1430, roughness: 0.5 })
  );
  face.position.set(0, 0.06, 0.62);
  g.add(face);

  // 目（n_n）＝青く光る2つ
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x66e0ff });
  [-0.12, 0.12].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), eyeMat);
    eye.position.set(x, 0.07, 0.66);
    g.add(eye);
  });

  // 舷側のポッド（左右）
  const podMat = new THREE.MeshStandardMaterial({ color: 0xb9a888, metalness: 0.5, roughness: 0.5 });
  [-0.66, 0.66].forEach(x => {
    const pod = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), podMat);
    pod.position.set(x, -0.08, 0.05);
    pod.scale.set(1, 0.9, 1.3);
    g.add(pod);
  });

  // 青く光る舷窓（ポートホール）
  const portMat = new THREE.MeshBasicMaterial({ color: 0x59c8ff });
  [[-0.34, 0.18], [0.34, 0.18], [0, 0.34]].forEach(([x, y]) => {
    const port = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), portMat);
    port.position.set(x, y, 0.5);
    g.add(port);
  });

  // てっぺんの小さなアンテナ＋光
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.25, 6),
    new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  pole.position.set(0, 0.5, 0);
  g.add(pole);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd84a }));
  tip.position.set(0, 0.64, 0);
  g.add(tip);

  // エンジン光（後方＝画面奥 -Z へトレイル）
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x66ffff })
  );
  glow.position.set(0, -0.12, -0.5);
  glow.scale.set(1, 1, 1.8);
  g.add(glow);

  g.scale.setScalar(0.78); // 全体を少し小さく
  g.position.set(0, FLIGHT_SHIP_Y, FLIGHT_OBJECT_Z);
  return g;
}

// 縦型航行：画面上から下へ流れるレーン
const spawnX = () => (Math.random() - 0.5) * (FLIGHT_X_LIMIT * 1.8);
const spawnTopY = () => FLIGHT_SPAWN_Y + Math.random() * 0.9;

// red=true で赤い隕石（ダメージ2・出現率低め）
function spawnRock(red = false) {
  const r = red ? 0.85 + Math.random() * 0.45 : 0.7 + Math.random() * 0.55;
  const m = new THREE.Mesh(
    new THREE.IcosahedronGeometry(r, 0),
    new THREE.MeshStandardMaterial({
      color: red ? 0xff3b28 : 0x9a7658,
      emissive: red ? 0x771400 : 0x1f140c,
      roughness: 1, flatShading: true,
    })
  );
  m.position.set(spawnX(), spawnTopY(), FLIGHT_OBJECT_Z);
  m.userData = { type: "rock", r, spin: (Math.random() - 0.5) * 0.08, dmg: red ? 2 : 1 };
  SH.scene.add(m); SH.rocks.push(m);
}

// kind: "normal"(+5💎) / "big"(+20💎) / "heal"(HP+1)
function spawnCrystal(kind = "normal") {
  let geo, mat, r;
  if (kind === "big") {
    geo = new THREE.OctahedronGeometry(1.05, 0);
    mat = new THREE.MeshStandardMaterial({ color: 0xd86cff, emissive: 0x7a22aa, metalness: 0.5 });
    r = 1.05;
  } else if (kind === "heal") {
    geo = new THREE.OctahedronGeometry(0.78, 0);
    mat = new THREE.MeshStandardMaterial({ color: 0x66ff99, emissive: 0x22aa55, metalness: 0.3 });
    r = 0.78;
  } else {
    geo = new THREE.OctahedronGeometry(0.72, 0);
    mat = new THREE.MeshStandardMaterial({ color: 0x66e8ff, emissive: 0x2288cc, metalness: 0.4 });
    r = 0.72;
  }
  const m = new THREE.Mesh(geo, mat);
  m.position.set(spawnX(), spawnTopY(), FLIGHT_OBJECT_Z);
  m.userData = { type: "crystal", kind, r };
  SH.scene.add(m); SH.crystals.push(m);
}
function spawnEnemy() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.32, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xff5a26, emissive: 0x661500, flatShading: true })
  );
  g.add(core);
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffdd66 })
  );
  eye.position.z = 0.12;
  g.add(eye);
  g.position.set(spawnX(), spawnTopY(), FLIGHT_OBJECT_Z);
  g.userData = { type: "enemy", r: 1.05, hp: 2 };
  SH.scene.add(g); SH.enemies.push(g);
}
// 自機の青い極太レーザー＋僚機の細い弾
function fireBullet() {
  spawnLaser(SH.ship.position, 0.28, 0x66ccff, 6);   // メインの太レーザー
  if (SH.wingL && SH.wingL.visible) spawnLaser(SH.wingL.position, 0.14, 0xff7799, 4);
  if (SH.wingR && SH.wingR.visible) spawnLaser(SH.wingR.position, 0.14, 0xffdd66, 4);
}
function triggerManualShot(now = performance.now()) {
  if (!SH.running || now - SH.lastManualShot < MANUAL_SHOT_COOLDOWN) return;
  fireBullet();
  SH.lastManualShot = now;
  SH.lastShot = Math.max(SH.lastShot, now - 220 * SH.nav.fireRateMul);
}
function spawnLaser(pos, w, color, dmg) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, w, 1.6),
    new THREE.MeshBasicMaterial({ color })
  );
  m.position.copy(pos);
  m.position.y += 0.62;
  m.position.z = FLIGHT_OBJECT_Z;
  m.userData = { type: "bullet", r: 0.25, dmg };
  SH.scene.add(m); SH.bullets.push(m);
}

function startShooting(star) {
  if (!SH.renderer) initShooting();
  resizeRenderer(SH.renderer, document.getElementById("shooting-canvas"));
  // リセット
  [...SH.bullets, ...SH.rocks, ...SH.enemies, ...SH.crystals].forEach(o => SH.scene.remove(o));
  SH.bullets = []; SH.rocks = []; SH.enemies = []; SH.crystals = [];
  SH.hp = MAX_HP; SH.gained = 0; SH.timeLeft = STAGE_TIME;
  SH.ship.position.set(0, FLIGHT_SHIP_Y, FLIGHT_OBJECT_Z); SH.targetX = 0; SH.targetY = FLIGHT_SHIP_Y;
  SH.lastSpawn = 0; SH.lastShot = 0; SH.running = true;
  SH.keyDir = 0; SH.lastManualShot = 0;
  SH.startT = performance.now();
  // アーケードHUDのリセット
  SH.score = 0; SH.chain = 0; SH.chainExpire = 0; SH.bombs = 3;
  SH.lastSpeech = 0; SH.speechIdx = 0;
  // 航行スタッツ＆ミッションをリセット
  SH.dmgTaken = 0; SH.kills = 0; SH.bigPicked = 0;
  SH.mission = MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
  SH.missionProgress = 0; SH.missionDone = false; SH.missionFailed = false;
  // 仲間の航行効果を反映
  SH.nav = computeNavEffects(save.party);
  SH.shieldLeft = SH.nav.shields;
  stageBonus = null; // 前回の航行ボーナスをクリア

  // 目的地（星）への航行表示
  document.getElementById("sh-dest-name").textContent = star.name;

  // 僚機の表示（パーティ人数に応じて）
  SH.wingL.visible = save.party.length >= 2;
  SH.wingR.visible = save.party.length >= 3;

  // HUD初期化
  renderShootingParty();
  updatePowerPanel();
  document.getElementById("sh-mission-text").textContent = SH.mission.desc;
  updateShootingHUD();
  updateMissionHUD();
  updateArcadeHUD();
  bindBomb();

  const hint = document.getElementById("shooting-hint");
  hint.style.opacity = "1";
  setTimeout(() => hint.style.opacity = "0", 3000);

  bindShootingInput();
  cancelAnimationFrame(SH.raf);
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (SH.running) { updateShooting(dt, now); }
    SH.renderer.render(SH.scene, SH.camera);
    SH.raf = requestAnimationFrame(loop);
  };
  SH.raf = requestAnimationFrame(loop);
}

function updateShooting(dt, now) {
  // タイマー
  SH.timeLeft = Math.max(0, STAGE_TIME - (now - SH.startT) / 1000);

  // 背景流れ（上へ進んでいるように、星が下へ流れる）
  SH.bgStars.position.y -= 9 * dt;
  if (SH.bgStars.position.y < -60) SH.bgStars.position.y = 0;

  // 船移動（縦型：画面下で左右移動中心）
  if (SH.keyDir) SH.targetX = clamp(SH.targetX + SH.keyDir * 8.5 * dt, -FLIGHT_X_LIMIT, FLIGHT_X_LIMIT);
  SH.ship.position.x += (SH.targetX - SH.ship.position.x) * Math.min(1, dt * 13);
  SH.ship.position.y = FLIGHT_SHIP_Y + Math.sin(now / 260) * 0.045;
  SH.ship.position.z = FLIGHT_OBJECT_Z;
  SH.ship.rotation.z = (SH.targetX - SH.ship.position.x) * -0.2;
  SH.ship.rotation.x = -0.14;

  // 僚機は自機の左右に追従
  const wob = Math.sin(now / 300) * 0.1;
  if (SH.wingL.visible) SH.wingL.position.set(SH.ship.position.x - 1.25, FLIGHT_SHIP_Y - 0.2 + wob, FLIGHT_OBJECT_Z);
  if (SH.wingR.visible) SH.wingR.position.set(SH.ship.position.x + 1.25, FLIGHT_SHIP_Y - 0.2 - wob, FLIGHT_OBJECT_Z);

  // 自動弾＋タップ/SPACEの手動弾（ロボ太がいると発射間隔が短縮）
  if (now - SH.lastShot > 520 * SH.nav.fireRateMul) { fireBullet(); SH.lastShot = now; }

  // スポーン（種類ごとに出現率を設定）
  if (now - SH.lastSpawn > 650) {
    const r = Math.random();
    if (r < 0.27)      spawnRock(false);   // 通常隕石
    else if (r < 0.35) spawnRock(true);    // 赤い隕石（低確率）
    else if (r < 0.64) spawnCrystal("normal");
    else if (r < 0.71) spawnCrystal("big");  // 大クリスタル（低確率）
    else if (r < 0.78) spawnCrystal("heal"); // 回復クリスタル
    else               spawnEnemy();
    SH.lastSpawn = now;
  }

  // ノーダメージ系ミッションの達成判定（経過時間で成立）
  if (SH.mission && SH.mission.type === "nohit" && !SH.missionDone && !SH.missionFailed) {
    const elapsed = (now - SH.startT) / 1000;
    if (elapsed >= SH.mission.goal) { SH.missionDone = true; updateMissionHUD(); }
  }

  const speed = 4.25;
  // 自機弾
  for (let i = SH.bullets.length - 1; i >= 0; i--) {
    const b = SH.bullets[i];
    b.position.y += 15.5 * dt;
    b.rotation.z += 0.18;
    if (b.position.y > FLIGHT_BULLET_TOP) { SH.scene.remove(b); SH.bullets.splice(i, 1); }
  }
  // 隕石（通常 -1 / 赤 -2）。ペンペンがいると接近スピード低下
  for (let i = SH.rocks.length - 1; i >= 0; i--) {
    const o = SH.rocks[i];
    o.position.y -= speed * SH.nav.hazardSpeedMul * dt;
    o.rotation.x += o.userData.spin; o.rotation.y += o.userData.spin;
    if (hitShip(o)) { damageShip(o.userData.dmg, true); SH.scene.remove(o); SH.rocks.splice(i, 1); continue; }
    if (o.position.y < FLIGHT_DESPAWN_Y) { SH.scene.remove(o); SH.rocks.splice(i, 1); }
  }
  // クリスタル（通常 +5 / 大 +20 / 回復 HP+1）
  for (let i = SH.crystals.length - 1; i >= 0; i--) {
    const o = SH.crystals[i];
    o.position.y -= speed * 0.92 * dt;
    o.rotation.y += 0.08; o.rotation.z += 0.035;
    if (hitShip(o)) { collectCrystal(o.userData.kind); SH.scene.remove(o); SH.crystals.splice(i, 1); continue; }
    if (o.position.y < FLIGHT_DESPAWN_Y) { SH.scene.remove(o); SH.crystals.splice(i, 1); }
  }
  // 敵（ペンペンがいると接近スピード低下）
  for (let i = SH.enemies.length - 1; i >= 0; i--) {
    const e = SH.enemies[i];
    e.position.y -= speed * 0.82 * SH.nav.hazardSpeedMul * dt;
    e.rotation.z += 0.055;
    // 弾ヒット
    for (let j = SH.bullets.length - 1; j >= 0; j--) {
      if (SH.bullets[j].position.distanceTo(e.position) < e.userData.r + 0.3) {
        SH.scene.remove(SH.bullets[j]); SH.bullets.splice(j, 1);
        e.userData.hp--;
        if (e.userData.hp <= 0) {
          // コドラゴがいると撃破クリスタル +killBonus
          SH.gained += 8 + SH.nav.killBonus; SH.kills++; bumpMission("kill");
          addScore(300); bumpChain(performance.now());
          updateShootingHUD();
          SH.scene.remove(e); SH.enemies.splice(i, 1);
        }
        break;
      }
    }
    if (SH.enemies[i] === e) {
      if (hitShip(e)) { damageShip(1, false); SH.scene.remove(e); SH.enemies.splice(i, 1); continue; }
      if (e.position.y < FLIGHT_DESPAWN_Y) { SH.scene.remove(e); SH.enemies.splice(i, 1); }
    }
  }

  // チェイン切れ判定
  if (SH.chain > 0 && now > SH.chainExpire) { SH.chain = 0; }

  updateShootingHUD();
  updateArcadeHUD();
  drawMinimap();
  updateSpeech(now);

  // 終了判定
  if (SH.timeLeft <= 0 || SH.hp <= 0) endShooting();
}

// スコア＆チェイン
function addScore(base) {
  const mult = 1 + Math.min(SH.chain, 200) * 0.02; // チェインでスコア倍率上昇
  SH.score += Math.round(base * mult);
}
function bumpChain(now) {
  SH.chain++;
  SH.chainExpire = now + CHAIN_WINDOW;
}

// ボムボタン：画面の隕石・敵を一掃（緊急回避）
let bombBound = false;
function bindBomb() {
  if (bombBound) return; bombBound = true;
  document.getElementById("sh-bomb").addEventListener("click", useBomb);
}
function useBomb() {
  if (!SH.running || SH.bombs <= 0) return;
  SH.bombs--;
  SH.rocks.forEach(o => SH.scene.remove(o));
  SH.enemies.forEach(e => { SH.scene.remove(e); SH.kills++; bumpMission("kill"); addScore(150); });
  SH.rocks = []; SH.enemies = [];
  flashScreen("#ffffff");
  if (navigator.vibrate) navigator.vibrate(120);
  updateArcadeHUD();
}

function hitShip(o) {
  return o.position.distanceTo(SH.ship.position) < (o.userData.r + SHIP_R);
}
function damageShip(amount = 1, isRock = false) {
  // おばけ：隕石ダメージを低確率で無効化
  if (isRock && SH.nav.rockGuardChance > 0 && Math.random() < SH.nav.rockGuardChance) {
    flashScreen("#9cf"); // ガード演出
    return;
  }
  // タコすけ：開始時バリアで1回ぶん肩代わり
  if (SH.shieldLeft > 0) {
    SH.shieldLeft--;
    flashScreen("#9cf");
    updateShootingHUD();
    return;
  }
  SH.hp = Math.max(1, SH.hp - amount);
  SH.score = Math.max(0, SH.score - amount * 120);
  SH.dmgTaken += amount;
  SH.chain = 0; // 被弾でチェイン途切れ
  // ノーダメージ系ミッションは被弾で失敗
  if (SH.mission && SH.mission.type === "nohit" && !SH.missionDone) SH.missionFailed = true;
  flashScreen("#f55");
  if (navigator.vibrate) navigator.vibrate(60);
  updateShootingHUD();
  updateMissionHUD();
}

// クリスタル取得（種類ごとに効果。ねこ船長=獲得量+%、スターちゃん=大クリ価値+）
function collectCrystal(kind) {
  const mul = SH.nav.crystalMul;
  const now = performance.now();
  if (kind === "big") {
    SH.gained += Math.round((20 + SH.nav.bigBonus) * mul); SH.bigPicked++;
    bumpMission("big"); bumpMission("crystal");
    addScore(500); bumpChain(now);
  } else if (kind === "heal") {
    if (SH.hp < MAX_HP) { SH.hp++; flashScreen("#6f9"); }
    addScore(50); bumpChain(now);
  } else {
    SH.gained += Math.round(5 * mul); bumpMission("crystal");
    addScore(100); bumpChain(now);
  }
  updateShootingHUD();
}

// ミッション進捗を加算（達成したら done をロック）
function bumpMission(kind) {
  const m = SH.mission;
  if (!m || SH.missionDone) return;
  if ((kind === "crystal" && m.type === "crystals") ||
      (kind === "big" && m.type === "big") ||
      (kind === "kill" && m.type === "enemies")) {
    SH.missionProgress++;
    if (SH.missionProgress >= m.goal) SH.missionDone = true;
    updateMissionHUD();
  }
}

function updateMissionHUD() {
  const m = SH.mission;
  const txt = document.getElementById("sh-mission-text");
  if (!m) { if (txt) txt.textContent = "—"; return; }
  let prog;
  if (m.type === "nohit") prog = SH.missionFailed ? "失敗" : (SH.missionDone ? "達成！" : "…");
  else prog = `${Math.min(SH.missionProgress, m.goal)}/${m.goal}`;
  if (txt) {
    txt.textContent = `${m.desc}　[${prog}]`;
    txt.style.color = SH.missionDone ? "#9f9" : (SH.missionFailed ? "#f88" : "#dff");
  }
}
function flashScreen(color) {
  const host = document.getElementById("shooting-canvas");
  host.style.transition = "none";
  host.style.boxShadow = `inset 0 0 120px ${color}`;
  requestAnimationFrame(() => {
    host.style.transition = "box-shadow .4s";
    host.style.boxShadow = "inset 0 0 0 transparent";
  });
}

function updateShootingHUD() {
  document.getElementById("sh-crystals").textContent = SH.gained;
  document.getElementById("sh-timer").textContent = Math.ceil(SH.timeLeft);
  const hearts = "❤".repeat(Math.max(0, SH.hp)) || "💀";
  const shield = SH.shieldLeft > 0 ? " 🛡".repeat(SH.shieldLeft) : "";
  document.getElementById("sh-hp").textContent = hearts + shield;
  document.getElementById("sh-progress").style.width = `${(1 - SH.timeLeft / STAGE_TIME) * 100}%`;
}

// アーケードHUD（スコア・チェイン・ボスバー・ボム）
function updateArcadeHUD() {
  document.getElementById("sh-score").textContent = String(SH.score).padStart(8, "0");
  document.getElementById("sh-chain").textContent = SH.chain;
  const now = performance.now();
  const frac = SH.chain > 0 ? Math.max(0, (SH.chainExpire - now) / CHAIN_WINDOW) : 0;
  document.getElementById("sh-chain-fill").style.width = `${frac * 100}%`;
  document.getElementById("sh-bomb-n").textContent = SH.bombs;
  document.getElementById("sh-bomb").disabled = SH.bombs <= 0;
  // 目的地（星）への到達ゲージ＝時間経過の進捗
  document.getElementById("sh-dest-fill").style.width = `${(1 - SH.timeLeft / STAGE_TIME) * 100}%`;
}

// 左の 1P〜4P パーティ表示
const PM_COLORS = ["#6cf", "#f9a", "#fc6", "#9f9"];
function renderShootingParty() {
  const host = document.getElementById("sh-party");
  host.innerHTML = save.party.slice(0, 4).map((id, i) => {
    const a = allyById(id); if (!a) return "";
    const c = PM_COLORS[i % 4];
    return `
      <div class="sh-pm" style="border-left-color:${c}">
        <div class="sh-pm-face">${faceHTML(a.face, `characters/${a.img}`)}</div>
        <div class="sh-pm-info">
          <div class="sh-pm-name">${i + 1}P ${a.name}</div>
          <div class="sh-pm-gauge"><div style="background:${c}"></div></div>
        </div>
      </div>`;
  }).join("");
}

// パワーアップ表示（パーティの航行効果から擬似的にレベルを算出）
function updatePowerPanel() {
  const eff = SH.nav || computeNavEffects(save.party);
  const wide = save.party.length;                                  // 編成人数=WIDE
  const laser = Math.round((1 - eff.fireRateMul) / 0.15) + 1;      // 射撃速度→LASER
  const missile = eff.killBonus + 1;                               // 撃破ボーナス→MISSILE
  const shield = eff.shields + (eff.rockGuardChance > 0 ? 1 : 0);  // バリア/ガード→SHIELD
  document.getElementById("pw-wide").textContent = "Lv." + wide;
  document.getElementById("pw-laser").textContent = "Lv." + laser;
  document.getElementById("pw-missile").textContent = "Lv." + missile;
  document.getElementById("pw-shield").textContent = "Lv." + shield;
}

// 下部セリフを数秒ごとに切り替え
function updateSpeech(now) {
  if (now - SH.lastSpeech < 4200) return;
  SH.lastSpeech = now;
  SH.speechIdx = (SH.speechIdx + 1) % SPEECH_LINES.length;
  const leader = allyById(save.party[0]);
  document.getElementById("sh-speech-face").innerHTML = leader ? faceHTML(leader.face, `characters/${leader.img}`) : "🐶";
  document.getElementById("sh-speech-text").textContent = SPEECH_LINES[SH.speechIdx];
}

// MAPレーダー：自機・敵・隕石・クリスタル・ボスを点で表示
function drawMinimap() {
  const cv = document.getElementById("sh-map-canvas");
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, cv.width, cv.height);
  const W = cv.width, H = cv.height;
  // y[上..下] をミニマップ上→下、x[-limit..limit] を左→右
  const px = (x) => (x + FLIGHT_X_LIMIT) / (FLIGHT_X_LIMIT * 2) * W;
  const py = (y) => (1 - (y - FLIGHT_DESPAWN_Y) / (FLIGHT_SPAWN_Y - FLIGHT_DESPAWN_Y)) * H;
  const dot = (x, y, color, s = 2) => { ctx.fillStyle = color; ctx.fillRect(px(x) - s / 2, py(y) - s / 2, s, s); };
  SH.crystals.forEach(o => dot(o.position.x, o.position.y, o.userData.kind === "big" ? "#d86cff" : "#66e8ff", 3));
  SH.rocks.forEach(o => dot(o.position.x, o.position.y, "#aa7758", 3));
  SH.enemies.forEach(o => dot(o.position.x, o.position.y, "#ff5a26", 4));
  dot(SH.ship.position.x, SH.ship.position.y, "#66e0ff", 5); // 自機
}

// 入力（縦型フライト：ドラッグ/キーで左右移動、タップ/SPACEでショット）
let shootingBound = false;
function bindShootingInput() {
  if (shootingBound) return;
  shootingBound = true;
  const host = document.getElementById("shooting-canvas");
  const move = (clientX) => {
    const rect = host.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;        // -1..1
    SH.targetX = clamp(nx * FLIGHT_X_LIMIT, -FLIGHT_X_LIMIT, FLIGHT_X_LIMIT);
    SH.targetY = FLIGHT_SHIP_Y;
  };
  host.addEventListener("touchmove", (e) => { e.preventDefault(); move(e.touches[0].clientX); }, { passive: false });
  host.addEventListener("touchstart", (e) => { move(e.touches[0].clientX); triggerManualShot(); }, { passive: true });
  let dragging = false;
  host.addEventListener("mousedown", (e) => { dragging = true; move(e.clientX); triggerManualShot(); });
  window.addEventListener("mousemove", (e) => { if (currentScreen === "shooting" && dragging) move(e.clientX); });
  window.addEventListener("mouseup", () => dragging = false);
  window.addEventListener("keydown", (e) => {
    if (currentScreen !== "shooting") return;
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") { SH.keyDir = -1; e.preventDefault(); }
    else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") { SH.keyDir = 1; e.preventDefault(); }
    else if (e.code === "Space") { triggerManualShot(); e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => {
    if ((e.key === "ArrowLeft" || e.key.toLowerCase() === "a") && SH.keyDir < 0) SH.keyDir = 0;
    if ((e.key === "ArrowRight" || e.key.toLowerCase() === "d") && SH.keyDir > 0) SH.keyDir = 0;
  });
}

function endShooting() {
  SH.running = false;
  cancelAnimationFrame(SH.raf);

  const cleared = SH.hp > 0;                 // HPが残れば星に到達
  const missionOk = !!SH.missionDone;
  const boosted = !!(SH.nav && SH.nav.missionBoost); // ミドリ星人：ミッション報酬強化
  // ミッション成功なら次の戦闘/スカウト用ボーナスを獲得
  stageBonus = missionOk ? { ...SH.mission.bonus, boosted } : null;

  // 報酬：拾ったクリスタル + 到達ボーナス + ミッション(クリスタル系)ボーナス
  let reward = SH.gained;
  if (cleared) reward += currentStar.reward;
  if (stageBonus && stageBonus.type === "crystal") reward += boosted ? 30 : 20;
  save.crystals += reward;
  persist();

  // 評価ランク
  let rank;
  if (!cleared) rank = "C";
  else if (SH.dmgTaken === 0 && missionOk) rank = "S";
  else if (missionOk || SH.dmgTaken <= 1) rank = "A";
  else rank = "B";

  showResult({ cleared, missionOk, reward, rank, boosted });
}

const RANK_COMMENT = {
  S: "完璧な航行！", A: "いい航行だった！", B: "なんとか突破！", C: "船体ボロボロ…",
};

// -------------------------------------------------------------
// シューティング結果画面（戦闘の前に1枚はさむ）
// -------------------------------------------------------------
let resultCleared = false;
function showResult({ cleared, missionOk, reward, rank, boosted }) {
  resultCleared = cleared;
  show("result");
  document.getElementById("result-title").textContent = cleared ? "星に到達！" : "航行 失敗…";

  // 評価ランク＆一言コメント
  const rEl = document.getElementById("result-rank");
  rEl.className = `result-rank rank-${rank}`;
  rEl.innerHTML = `<span class="rank-letter">${rank}</span><span class="rank-comment">${RANK_COMMENT[rank]}</span>`;

  document.getElementById("result-stats").innerHTML = `
    <div class="result-row"><span>獲得クリスタル</span><span class="v" style="color:var(--crystal)">💎 ${reward}</span></div>
    <div class="result-row"><span>受けたダメージ</span><span class="v" style="color:var(--danger)">${SH.dmgTaken}</span></div>
    <div class="result-row"><span>倒した敵</span><span class="v">${SH.kills} 体</span></div>
    <div class="result-row"><span>到達</span><span class="v">${cleared ? "成功" : "墜落"}</span></div>
  `;
  const mEl = document.getElementById("result-mission");
  mEl.className = "result-mission " + (missionOk ? "ok" : "ng");
  mEl.textContent = `🎯 ${SH.mission.desc} … ${missionOk ? "ミッション成功！" : "失敗"}`;

  const bEl = document.getElementById("result-bonus");
  if (missionOk) {
    bEl.innerHTML = `ボーナス獲得：${SH.mission.bonus.label}${boosted ? ' <span class="boost-tag">強化↑</span>' : ""}`;
  } else {
    bEl.textContent = "ボーナスなし";
  }
}

document.querySelector("#screen-result").addEventListener("click", (e) => {
  if (e.target.dataset.action !== "result-next") return;
  if (resultCleared) playArrival(currentStar);    // 到達 → 到着演出 → 戦闘へ
  else { refreshCrystals(); show("worldmap"); }    // 墜落 → ワールドマップへ
});

// -------------------------------------------------------------
// 到着演出（航行→RPG戦闘）。CSSフェードで短いメッセージを順に表示
// -------------------------------------------------------------
let arrivalTimer = null, arrivalStar = null;
function playArrival(star) {
  arrivalStar = star;
  show("arrival");
  const enemy = ENEMIES[star.enemy];
  document.getElementById("arrival-star").textContent = `${star.icon} ${star.name}`;
  const msgs = [
    "目的地に到着！",
    `${star.name} に降下します…`,
    "敵影を確認！",
    `${star.boss ? "【ボス】" : ""}${enemy.name} が あらわれた！`,
  ];
  const el = document.getElementById("arrival-msg");
  let i = 0;
  const step = () => {
    if (i >= msgs.length) { finishArrival(); return; }
    el.textContent = msgs[i];
    el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); // アニメ再生
    i++;
    arrivalTimer = setTimeout(step, ARRIVAL_STEP_MS);
  };
  step();
}
function finishArrival() {
  if (!arrivalStar) return;        // 二重実行ガード
  clearTimeout(arrivalTimer);
  const s = arrivalStar; arrivalStar = null;
  if (s.stage === 1) playPinoScene(s);
  else startBattle(s);
}
// タップでスキップ
document.querySelector("#screen-arrival").addEventListener("click", finishArrival);

// -------------------------------------------------------------
// ピノの戦闘前会話（ステージ1）
// -------------------------------------------------------------
const PINO_PRE_BATTLE_LINES = [
  "……敵影、あります",
  "たぶん、こわいです。ぼくも、こわいです",
  "でも……ひとりじゃありません",
  "ぼく、道はよく間違えます",
  "でも、いっしょに進むことはできます",
  "行きましょう。最初の一歩です",
];
let pinoSceneStar = null;
let pinoLineIndex = 0;

function playPinoScene(star) {
  pinoSceneStar = star;
  pinoLineIndex = 0;
  show("pino");
  renderPinoLine();
}

function renderPinoLine() {
  const el = document.getElementById("pino-line");
  el.textContent = PINO_PRE_BATTLE_LINES[pinoLineIndex] || "";
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  document.querySelector('[data-action="pino-next"]').textContent =
    pinoLineIndex >= PINO_PRE_BATTLE_LINES.length - 1 ? "戦闘へ" : "次へ";
}

function advancePinoScene() {
  if (pinoLineIndex >= PINO_PRE_BATTLE_LINES.length - 1) return finishPinoScene();
  pinoLineIndex++;
  renderPinoLine();
}

function finishPinoScene() {
  if (!pinoSceneStar) return;
  const s = pinoSceneStar;
  pinoSceneStar = null;
  startBattle(s);
}

document.querySelector("#screen-pino").addEventListener("click", (e) => {
  const actionEl = e.target.closest("[data-action]");
  if (actionEl?.dataset.action === "pino-skip") return finishPinoScene();
  if (actionEl?.dataset.action === "pino-next") return advancePinoScene();
  if (!e.target.closest("button")) advancePinoScene();
});

// -------------------------------------------------------------
// RPG戦闘
// -------------------------------------------------------------
const BT = { enemy: null, enemyHp: 0, party: [], turnLock: false, won: false };

function startBattle(star) {
  show("battle");
  const def = ENEMIES[star.enemy];
  BT.enemy = def;
  const boosted = stageBonus && stageBonus.boosted;
  // 航行ボーナス：敵HP -10%（強化時 -15%）
  const enemyHpDown = stageBonus && stageBonus.type === "enemyHp";
  BT.enemyHp = enemyHpDown ? Math.round(def.hp * (boosted ? 0.85 : 0.9)) : def.hp;
  BT.won = false;
  BT.turnLock = false;
  // 航行ボーナス：味方HP +1（強化時 +2）
  const allyHpUp = stageBonus && stageBonus.type === "allyHp";
  const hpPlus = allyHpUp ? (boosted ? 2 : 1) : 0;
  BT.party = save.party.slice(0, 4).map(id => {
    const a = ALLIES.find(x => x.id === id);
    const maxHp = a.hp + hpPlus;
    return { ...a, curHp: maxHp, maxHp, dead: false };
  });

  // 敵描画＋系統・ギミック・ボス表示
  document.getElementById("enemy-name").textContent = def.name;
  document.getElementById("enemy-sprite").innerHTML = faceHTML(def.face, `enemies/${def.img}`);
  const catEl = document.getElementById("enemy-cat");
  catEl.textContent = def.cat;
  catEl.className = "enemy-cat cat-" + (def.catKey || "");
  document.getElementById("enemy-gimmick").textContent = `⚠ ${def.gimmick}`;
  const badge = document.getElementById("enemy-badge");
  badge.textContent = def.boss ? "★ B O S S ★" : "";
  document.getElementById("battle-enemy").classList.toggle("is-boss", !!def.boss);
  setEnemyHpBar();

  renderParty();
  clearLog();
  log(`${def.boss ? "【ボス】" : ""}${def.name} が あらわれた！`);
  if (def.boss) log(`「${BOSS_QUOTE}」`);
  log(`〔${def.cat}〕${def.gimmick}`); // 系統とギミックを提示
  // ボーナス反映の告知
  if (stageBonus && ["enemyHp", "allyHp", "scoutRate"].includes(stageBonus.type)) {
    log(`✦ 航行ボーナス：${stageBonus.label}${stageBonus.boosted ? "（強化）" : ""}`);
  }
  setCommands(true);
}

function renderParty() {
  const area = document.getElementById("party-area");
  area.innerHTML = "";
  BT.party.forEach((m, i) => {
    const el = document.createElement("div");
    el.className = "party-member" + (m.dead ? " dead" : "");
    el.id = `pm-${i}`;
    el.innerHTML = `
      <div class="pm-face">${faceHTML(m.face, `characters/${m.img}`)}</div>
      <div class="pm-name">${m.name}</div>
      <div class="pm-hp">${m.curHp}/${m.maxHp}</div>
      <div class="hpbar pm-hpbar"><div style="width:${m.curHp/m.maxHp*100}%"></div></div>
    `;
    area.appendChild(el);
  });
}

const LOG_MAX = 5; // 戦闘ログは最新5件だけ表示
function clearLog() { document.getElementById("battle-log").innerHTML = ""; }
function log(msg) {
  const el = document.getElementById("battle-log");
  const p = document.createElement("div");
  p.textContent = msg;
  el.appendChild(p);
  while (el.childElementCount > LOG_MAX) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}
function setCommands(on) {
  document.querySelectorAll("#battle-commands .cmd").forEach(b => b.disabled = !on);
}
function setEnemyHpBar() {
  const hp = Math.max(0, BT.enemyHp);
  document.getElementById("enemy-hp-fill").style.width = `${hp / BT.enemy.hp * 100}%`;
  const txt = document.getElementById("enemy-hp-text");
  if (txt) txt.textContent = `HP ${hp} / ${BT.enemy.hp}`;
}

document.getElementById("battle-commands").addEventListener("click", (e) => {
  const cmd = e.target.dataset.cmd;
  if (!cmd || BT.turnLock) return;
  handleCommand(cmd);
});

async function handleCommand(cmd) {
  if (cmd === "fight") return doFight();
  if (cmd === "skill") return doSkill();
  if (cmd === "item") return doItem();
  if (cmd === "run") return doRun();
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));
function enemySprite() { return document.getElementById("battle-enemy"); }

async function doFight() { return attackRound(1.0, "こうげき"); }

async function doSkill() {
  log("✦ ひっさつのスキル！");
  return attackRound(1.6, "スキル");
}

// 仲間が順番に攻撃（multiplier でスキルの威力を上げる）
async function attackRound(multiplier, label) {
  BT.turnLock = true; setCommands(false);
  for (const m of BT.party) {
    if (m.dead) continue;
    const base = m.atk + Math.floor(Math.random() * 6) - 2;
    const dmg = Math.max(1, Math.round(base * multiplier));
    BT.enemyHp -= dmg;
    log(`${m.name}の ${label}！ ${dmg} のダメージ`);
    enemySprite().classList.add("hit");
    setEnemyHpBar();
    await wait(BATTLE_HIT_WAIT_MS);
    enemySprite().classList.remove("hit");
    if (BT.enemyHp <= 0) { return enemyDefeated(); }
  }
  await enemyTurn();
}

async function enemyTurn() {
  const alive = BT.party.filter(m => !m.dead);
  if (alive.length === 0) return; // 念のため
  const target = alive[Math.floor(Math.random() * alive.length)];
  const dmg = BT.enemy.atk + Math.floor(Math.random() * 5) - 2;
  target.curHp = Math.max(0, target.curHp - dmg);
  log(`${BT.enemy.name}の こうげき！ ${target.name}に ${dmg} のダメージ`);
  if (target.curHp <= 0) { target.dead = true; log(`${target.name}は たおれた…`); }
  renderParty();
  await wait(BATTLE_TURN_WAIT_MS);
  if (BT.party.every(m => m.dead)) return partyWipe();
  BT.turnLock = false; setCommands(true);
}

async function doItem() {
  if (save.crystals < 10) { toast("クリスタルが足りない（10必要）"); return; }
  BT.turnLock = true; setCommands(false);
  save.crystals -= 10; persist();
  // 全員回復
  BT.party.forEach(m => { if (!m.dead) m.curHp = Math.min(m.maxHp, m.curHp + 20); });
  log("どうぐ「ほしのしずく」を つかった！ 全員20かいふく");
  renderParty();
  await wait(BATTLE_TURN_WAIT_MS);
  await enemyTurn();
}

async function doRun() {
  BT.turnLock = true; setCommands(false);
  if (Math.random() < 0.7) {
    log("うまく にげだした！");
    await wait(500);
    show("worldmap");
  } else {
    log("にげられなかった！");
    await wait(BATTLE_TURN_WAIT_MS);
    await enemyTurn();
  }
}

function enemyDefeated() {
  setEnemyHpBar();
  log(`${BT.enemy.name}を たおした！`);
  BT.won = true;
  // クリア登録
  if (!save.cleared.includes(currentStar.id)) save.cleared.push(currentStar.id);
  persist();
  // 勝利後はスカウトチャンス画面へ
  setTimeout(() => offerScout(), VICTORY_TO_SCOUT_MS);
}

function partyWipe() {
  log("パーティは ぜんめつした…");
  setTimeout(() => { toast("ぜんめつ… 拠点にもどる"); show("worldmap"); }, WIPE_RETURN_MS);
}

// -------------------------------------------------------------
// スカウト（戦闘勝利後に出会った仲間候補をスカウトする）
// -------------------------------------------------------------
let dexReturn = "worldmap";
let scoutCandidate = null;

// その星のレア度帯から候補を1体（未加入を優先）
function pickCandidate() {
  const pool = ALLIES.filter(a => a.rarity >= currentStar.rMin && a.rarity <= currentStar.rMax);
  if (pool.length === 0) return null;
  const fresh = pool.filter(a => !save.recruited.includes(a.id));
  const choose = fresh.length ? fresh : pool;
  return choose[Math.floor(Math.random() * choose.length)];
}

// レア度から必要クリスタル・成功率を取得（航行ボーナスで成功率+5%）
function scoutInfo(ally) {
  const r = RARITY[ally.rarity] || RARITY[2];
  let rate = r.baseRate;
  const hasBonus = stageBonus && stageBonus.type === "scoutRate";
  if (hasBonus) rate += stageBonus.boosted ? 0.08 : 0.05; // ミドリ星人で強化
  return { cost: r.cost, rate: Math.min(0.99, rate), boosted: !!hasBonus };
}

// 図鑑：発見済み登録
function markDiscovered(id) {
  if (!save.discovered.includes(id)) { save.discovered.push(id); persist(); }
}

// 戦闘勝利後：仲間候補と出会う → スカウト画面へ
function offerScout() {
  const ally = pickCandidate();
  scoutCandidate = ally;
  if (!ally) { setTimeout(() => show("worldmap"), 400); return; }
  // 出会った時点で図鑑に「発見済み」として登録
  markDiscovered(ally.id);
  showScoutOffer(ally);
}

// スカウト画面：候補情報＋[スカウトする][スルーする]
function showScoutOffer(ally) {
  show("scout");
  document.getElementById("scout-title").textContent = "仲間候補があらわれた！";
  const { cost, rate, boosted } = scoutInfo(ally);
  const enough = save.crystals >= cost;
  const replaceTarget = !save.party.includes(ally.id) && save.party.length >= 4 ? allyById(save.party[save.party.length - 1]) : null;
  document.getElementById("scout-result").innerHTML = `
    <div class="scout-face">${faceHTML(ally.face, `characters/${ally.img}`)}</div>
    <div class="cand-name">${ally.name}</div>
    <div class="cand-rarity">${"★".repeat(ally.rarity)}</div>
    <div class="cand-tag">${ally.tag}</div>
    <div class="cand-stats">
      <div class="cand-stat"><div class="k">必要💎</div><div class="v cost ${enough ? "" : "short"}">${cost}</div></div>
      <div class="cand-stat"><div class="k">成功率</div><div class="v rate">${Math.round(rate * 100)}%${boosted ? " ↑" : ""}</div></div>
      <div class="cand-stat"><div class="k">所持💎</div><div class="v">${save.crystals}</div></div>
    </div>
    ${enough ? "" : `<div class="scout-sub" style="color:var(--danger)">クリスタルが足りない…</div>`}
    ${replaceTarget ? `<div class="scout-sub scout-replace-note">成功時は4人目の ${replaceTarget.name} と入れ替え</div>` : ""}
  `;
  document.getElementById("scout-actions").innerHTML = `
    <button class="btn btn-primary" data-action="scout-do" ${enough ? "" : "disabled"}>スカウトする（💎${cost}）</button>
    <button class="btn" data-action="scout-skip">スルーする</button>
  `;
}

// 「スカウトする」：確率判定。成功時のみクリスタル消費
function attemptScout() {
  const ally = scoutCandidate;
  if (!ally) return show("worldmap");
  const { cost, rate } = scoutInfo(ally);
  if (save.crystals < cost) return; // 念のため
  if (Math.random() < rate) {
    save.crystals -= cost;          // 成功時のみ消費
    const recruitResult = recruit(ally); // パーティ加入＋「加入済み」記録
    showScoutResult(ally, "success", cost, recruitResult);
  } else {
    // 失敗：仲間にならない／消費なし（MVP）／図鑑は発見済みのまま
    showScoutResult(ally, "fail");
  }
  persist();
}

// パーティ加入（4人を超える場合は末尾と入れ替え）
function recruit(ally) {
  const result = { addedToParty: false, alreadyInParty: false, replaced: null };
  if (!save.recruited.includes(ally.id)) save.recruited.push(ally.id);
  markDiscovered(ally.id);
  if (save.party.includes(ally.id)) {
    result.alreadyInParty = true;
    return result;
  }
  if (save.party.length < 4) {
    save.party.push(ally.id);
    result.addedToParty = true;
  } else {
    const replacedId = save.party[save.party.length - 1];
    save.party[save.party.length - 1] = ally.id; // 入れ替え
    result.addedToParty = true;
    result.replaced = allyById(replacedId);
  }
  return result;
}

function showScoutResult(ally, kind, cost, recruitResult = {}) {
  document.getElementById("scout-title").textContent = "スカウト結果";
  const box = document.getElementById("scout-result");
  if (kind === "success") {
    const partyNote = recruitResult.replaced
      ? `パーティ満員のため ${recruitResult.replaced.name} と入れ替え`
      : (recruitResult.alreadyInParty ? "すでにパーティにいる" : "パーティに編成");
    box.innerHTML = `
      <div class="scout-face">${faceHTML(ally.face, `characters/${ally.img}`)}</div>
      <div class="scout-voice ok">「${ally.voice.ok}」</div>
      <div class="scout-msg" style="color:var(--ok)">${ally.name} が なかまになった！</div>
      <div class="scout-sub">💎${cost} 消費 ／ 図鑑に「加入」を記録 ／ ${partyNote}</div>
    `;
  } else {
    box.innerHTML = `
      <div class="scout-face">💨</div>
      <div class="scout-voice ng">「${ally.voice.ng}」</div>
      <div class="scout-msg">スカウト失敗…</div>
      <div class="scout-sub">${ally.name} は 去っていった（図鑑には「発見」を記録）</div>
    `;
  }
  document.getElementById("scout-actions").innerHTML =
    `<button class="btn btn-primary" data-action="scout-continue">つづける</button>`;
}

// 「スルー」：消費なし・仲間にならない・図鑑は発見済みのまま
function skipScout(ally) {
  document.getElementById("scout-title").textContent = "スルー";
  document.getElementById("scout-result").innerHTML = `
    <div class="scout-face">${ally ? faceHTML(ally.face, `characters/${ally.img}`) : "👋"}</div>
    <div class="scout-voice bye">「${ally ? ally.voice.bye : "またどこかで会おう"}」</div>
    <div class="scout-msg">見送った</div>
    <div class="scout-sub">${ally ? ally.name : "仲間候補"} とは また どこかで（図鑑には「発見」を記録）</div>
  `;
  document.getElementById("scout-actions").innerHTML =
    `<button class="btn btn-primary" data-action="scout-continue">つづける</button>`;
}

document.querySelector("#screen-scout").addEventListener("click", (e) => {
  const a = e.target.dataset.action;
  if (a === "scout-do") attemptScout();
  else if (a === "scout-skip") skipScout(scoutCandidate);
  else if (a === "scout-continue") { refreshCrystals(); show("worldmap"); }
});

// -------------------------------------------------------------
// 図鑑
// -------------------------------------------------------------
document.querySelectorAll('[data-action="open-dex-map"]').forEach(b =>
  b.addEventListener("click", () => { dexReturn = "worldmap"; show("dex"); }));

document.querySelector("#screen-dex").addEventListener("click", (e) => {
  if (e.target.dataset.action === "close-dex") show(dexReturn);
});

function renderDex() {
  const grid = document.getElementById("dex-grid");
  grid.innerHTML = "";
  document.getElementById("dex-total").textContent = ALLIES.length;
  document.getElementById("dex-count").textContent = save.discovered.length;
  ALLIES.forEach((a, i) => {
    const found = save.discovered.includes(a.id);
    const joined = save.recruited.includes(a.id);
    const cell = document.createElement("div");
    cell.className = "dex-cell" + (found ? "" : " unknown") + (joined ? " joined" : "");
    const badge = !found ? "" : joined
      ? `<div class="dc-badge joined">加入済み</div>`
      : `<div class="dc-badge found">発見済み</div>`;
    cell.innerHTML = `
      <div class="dc-face">${found ? faceHTML(a.face, `characters/${a.img}`) : "❔"}</div>
      <div class="dc-rarity">★${a.rarity}</div>
      <div class="dc-name">${found ? a.name : "？？？"}</div>
      <div class="dc-no">No.${String(i + 1).padStart(2, "0")}</div>
      ${badge}
    `;
    if (found) cell.title = `${a.name}（★${a.rarity}）\n${a.setting}\n得意：${a.skill}`;
    grid.appendChild(cell);
  });
}

// -------------------------------------------------------------
// リサイズ
// -------------------------------------------------------------
function resizeRenderer(renderer, host) {
  const w = host.clientWidth || window.innerWidth;
  const h = host.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
}
window.addEventListener("resize", () => {
  if (wmRenderer && currentScreen === "worldmap") {
    const host = document.getElementById("worldmap-space");
    resizeRenderer(wmRenderer, host);
    wmCamera.aspect = host.clientWidth / host.clientHeight; wmCamera.updateProjectionMatrix();
  }
  if (SH.renderer && currentScreen === "shooting") {
    const host = document.getElementById("shooting-canvas");
    resizeRenderer(SH.renderer, host);
    SH.camera.aspect = host.clientWidth / host.clientHeight; SH.camera.updateProjectionMatrix();
  }
});

// -------------------------------------------------------------
// 起動
// -------------------------------------------------------------
show("title");
console.log("銀河はぐれ団 起動 ✦", save);

// デバッグ用フック（コンソールから各シーンへ直接ジャンプ可能）
window.GAME = {
  get save() { return save; },
  show, toast,
  goShooting: (i = 0) => startStage(STARS[i]),
  goBattle: (i = 0) => { currentStar = STARS[i]; startBattle(STARS[i]); },
  winShooting: () => { if (SH.running) { SH.hp = MAX_HP; SH.startT = performance.now() - (STAGE_TIME + 1) * 1000; } },
  endShooting: () => { if (SH.running) { SH.hp = MAX_HP; endShooting(); } }, // 結果画面へ即遷移（デバッグ）
  completeMission: () => { if (SH.mission) { SH.missionDone = true; SH.missionFailed = false; updateMissionHUD(); } },
  setBonus: (type) => { stageBonus = (MISSIONS.find(m => m.bonus.type === type) || {}).bonus || null; return stageBonus; },
  get bonus() { return stageBonus; },
  get sh() { return SH; },
  reset: resetSave,
};
