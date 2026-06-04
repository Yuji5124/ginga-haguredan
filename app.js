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
    remove(o) {
      this.children = this.children.filter(child => child !== o);
      return this;
    }
  }
  class Scene extends Obj3D {
    constructor() { super(); this.userData = {}; }
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
          : type === "crystal" ? (o.userData.kind === "heal" ? "#66ff99" : (o.userData.kind === "big" ? "#ffd35a" : "#66e8ff"))
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

const TOTAL_CHARACTERS = 60;
const ALLY_IMAGE_IMPLEMENTED_COUNT = 20;
const FINAL_BOSS_UNLOCK_COUNT = 50;
const MAX_ALLY_RARITY = 10;

// レア度ごとのスカウト設定（必要クリスタル / 基本成功率）
const RARITY = {
  1:  { cost: 10,  baseRate: 0.85 },
  2:  { cost: 14,  baseRate: 0.75 },
  3:  { cost: 18,  baseRate: 0.65 },
  4:  { cost: 25,  baseRate: 0.55 },
  5:  { cost: 32,  baseRate: 0.48 },
  6:  { cost: 40,  baseRate: 0.42 },
  7:  { cost: 50,  baseRate: 0.36 },
  8:  { cost: 60,  baseRate: 0.30 },
  9:  { cost: 70,  baseRate: 0.24 },
  10: { cost: 80,  baseRate: 0.18 },
};
const LOW_RARITY_MAX = 3;

// 航行ボーナスの定義（8種）。レア度に応じて各仲間へ自動割当
const NAV_DEFS = {
  fireRate:     { type: "fireRate",     label: "射撃速度アップ" },
  crystalUp:    { type: "crystalUp",    label: "クリスタル獲得 +10%" },
  rockGuard:    { type: "rockGuard",    label: "隕石ダメージ 低確率で無効" },
  killCrystal:  { type: "killCrystal",  label: "敵撃破で +1💎" },
  bigUp:        { type: "bigUp",        label: "大クリスタル +2" },
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

// 仲間60人の正式カタログ。ID/名前/レア度/ロールはここを正とする
const CHARACTER_CATALOG = [
  { id: "c1", name: "ロボ太", rarity: 1, role: "balanced" },
  { id: "c2", name: "ねこ船長", rarity: 1, role: "attacker" },
  { id: "c3", name: "おばけ", rarity: 1, role: "trick" },
  { id: "c4", name: "ミドリ星人", rarity: 1, role: "support" },
  { id: "c5", name: "タコすけ", rarity: 1, role: "defender" },
  { id: "c6", name: "コドラゴ", rarity: 1, role: "attacker" },
  { id: "c7", name: "ポンコ", rarity: 1, role: "balanced" },
  { id: "c8", name: "ミミズク星人", rarity: 1, role: "support" },
  { id: "c9", name: "ノロリン", rarity: 1, role: "defender" },
  { id: "c10", name: "ヒョロ丸", rarity: 1, role: "speed" },
  { id: "c11", name: "まいごロボ・ピノ", rarity: 2, role: "support" },
  { id: "c12", name: "ほしクズくん", rarity: 2, role: "trick" },
  { id: "c13", name: "宇宙バイトのミナ", rarity: 2, role: "balanced" },
  { id: "c14", name: "ねむりネジ", rarity: 2, role: "debuff" },
  { id: "c15", name: "プカプカさん", rarity: 2, role: "support" },
  { id: "c16", name: "チリトリ星人", rarity: 2, role: "cleaner" },
  { id: "c17", name: "ヨワシ", rarity: 2, role: "weak" },
  { id: "c18", name: "ボタン係ポチ", rarity: 2, role: "support" },
  { id: "c19", name: "ひびわれ卵モン", rarity: 2, role: "growth" },
  { id: "c20", name: "カサネコ", rarity: 2, role: "trick" },
  { id: "c21", name: "ブリキ船長", rarity: 4, role: "defender" },
  { id: "c22", name: "メテオ配達員ジン", rarity: 4, role: "speed" },
  { id: "c23", name: "からくり姫ネネ", rarity: 4, role: "support" },
  { id: "c24", name: "バブル医師ポワ", rarity: 4, role: "healer" },
  { id: "c25", name: "黒ねじのガンマ", rarity: 4, role: "attacker" },
  { id: "c26", name: "コイン占い師ルゥ", rarity: 4, role: "luck" },
  { id: "c27", name: "グラタン星人", rarity: 4, role: "defender" },
  { id: "c28", name: "フードの少年シロ", rarity: 4, role: "mystery" },
  { id: "c29", name: "ぷち重力くん", rarity: 4, role: "debuff" },
  { id: "c30", name: "ネオンスケーター", rarity: 4, role: "speed" },
  { id: "c31", name: "スター消防士レン", rarity: 6, role: "defender" },
  { id: "c32", name: "ホログラム姉妹", rarity: 6, role: "trick" },
  { id: "c33", name: "銀河薬売りモンド", rarity: 6, role: "healer" },
  { id: "c34", name: "コスモ大工ゲン", rarity: 6, role: "defender" },
  { id: "c35", name: "ロケット僧サン", rarity: 6, role: "support" },
  { id: "c36", name: "ゼリー騎士プルン", rarity: 6, role: "defender" },
  { id: "c37", name: "ビーム書道家スミ", rarity: 6, role: "attacker" },
  { id: "c38", name: "パラボラ少女エコ", rarity: 6, role: "support" },
  { id: "c39", name: "砂時計ロボ・チク", rarity: 6, role: "time" },
  { id: "c40", name: "スターモグラ隊長", rarity: 6, role: "attacker" },
  { id: "c41", name: "旧銀河軍のアイン", rarity: 8, role: "attacker" },
  { id: "c42", name: "星を読む少女ノルン", rarity: 8, role: "support" },
  { id: "c43", name: "宇宙墓守グレイ", rarity: 8, role: "debuff" },
  { id: "c44", name: "機械天使メル", rarity: 8, role: "healer" },
  { id: "c45", name: "青炎のオルカ", rarity: 8, role: "attacker" },
  { id: "c46", name: "記録者ログ", rarity: 8, role: "support" },
  { id: "c47", name: "双子衛星ルル・ララ", rarity: 8, role: "trick" },
  { id: "c48", name: "黒箱の少年ノイズ", rarity: 8, role: "mystery" },
  { id: "c49", name: "星海の巫女セナ", rarity: 8, role: "healer" },
  { id: "c50", name: "銀河裁縫師イト", rarity: 8, role: "support" },
  { id: "c51", name: "はぐれ王ギン", rarity: 10, role: "leader" },
  { id: "c52", name: "ノヴァちゃん", rarity: 10, role: "attacker" },
  { id: "c53", name: "アステラ", rarity: 10, role: "support" },
  { id: "c54", name: "ブラックホールくん", rarity: 10, role: "debuff" },
  { id: "c55", name: "プロト・ワン", rarity: 10, role: "balanced" },
  { id: "c56", name: "エーテル姫", rarity: 10, role: "healer" },
  { id: "c57", name: "バグの神様グリッチ", rarity: 10, role: "trick" },
  { id: "c58", name: "ラストコメット", rarity: 10, role: "attacker" },
  { id: "c59", name: "迷子の創造主コドモ", rarity: 10, role: "creator" },
  {
    id: "c60",
    name: "はぐれ飛行船オルカ号",
    rarity: 10,
    role: "ship",
    description: "仲間たちを乗せて銀河を進む、はぐれ団の飛行船。",
  },
];

const CHARACTER_FACE_BY_ID = {
  c1: "🤖", c2: "🐈", c3: "👻", c4: "👽", c5: "🐙", c6: "🐲", c7: "🔧", c8: "🦉", c9: "🐌", c10: "💨",
  c11: "🤖", c12: "✨", c13: "🧑", c14: "🔩", c15: "👨‍🚀", c16: "👽", c17: "🐟", c18: "🔘", c19: "🥚", c20: "🐈",
  c21: "🚢", c22: "☄️", c23: "👸", c24: "🫧", c25: "🌑", c26: "🪙", c27: "🍲", c28: "🧥", c29: "🌀", c30: "🛹",
  c31: "🧯", c32: "👯", c33: "🧪", c34: "🔨", c35: "🧘", c36: "🍮", c37: "🖌️", c38: "🛰️", c39: "⏳", c40: "🦡",
  c41: "🪖", c42: "🔮", c43: "🪦", c44: "👼", c45: "🔥", c46: "📚", c47: "🌗", c48: "📦", c49: "🌌", c50: "🧵",
  c51: "👑", c52: "💥", c53: "🌟", c54: "🕳️", c55: "🤖", c56: "🧚", c57: "🪲", c58: "💫", c59: "🧒", c60: "🚀",
};

const ROLE_DEFS = {
  balanced: { label: "バランス", setting: "攻守のバランスがよく、どの航路にもなじむ仲間", skill: "状況に合わせて攻撃と支援をこなす", tags: ["はぐれもの"] },
  attacker: { label: "攻撃", setting: "正面から敵に向かう攻撃役", skill: "敵にダメージを与える", tags: ["攻撃"] },
  trick: { label: "トリック", setting: "予想外の動きで敵のペースを乱す仲間", skill: "不思議な手で戦況を変える", tags: ["不思議"] },
  support: { label: "支援", setting: "仲間を助け、航路を支えるサポート役", skill: "味方の行動を助ける", tags: ["はぐれもの"] },
  defender: { label: "守り", setting: "打たれ強く、仲間を守る防御役", skill: "守りを固めて被害を減らす", tags: ["守り"] },
  speed: { label: "スピード", setting: "素早い移動と先手が得意な仲間", skill: "先に動いて流れを作る", tags: ["攻撃"] },
  debuff: { label: "妨害", setting: "敵の力や動きを鈍らせる妨害役", skill: "敵を弱らせる", tags: ["不思議"] },
  cleaner: { label: "掃除", setting: "散らかった宇宙をきれいにする働き者", skill: "状態の乱れを整える", tags: ["回復"] },
  weak: { label: "弱さ", setting: "弱そうだが、土壇場で意地を見せる仲間", skill: "ピンチの時にふんばる", tags: ["はぐれもの"] },
  growth: { label: "成長", setting: "まだ未完成だが、大きく伸びる可能性がある仲間", skill: "戦いながら成長する", tags: ["動物"] },
  healer: { label: "回復", setting: "傷ついた仲間を支える回復役", skill: "味方を回復する", tags: ["回復"] },
  luck: { label: "幸運", setting: "運とひらめきで道を開く仲間", skill: "幸運でチャンスを作る", tags: ["不思議"] },
  mystery: { label: "謎", setting: "正体のつかめない不思議な仲間", skill: "謎の力で状況を動かす", tags: ["不思議"] },
  time: { label: "時間", setting: "時間の流れに敏感な仲間", skill: "行動順やタイミングを支える", tags: ["機械", "不思議"] },
  leader: { label: "リーダー", setting: "仲間を束ねる存在感を持つ仲間", skill: "味方を導いて力を引き出す", tags: ["はぐれもの", "守り"] },
  creator: { label: "創造", setting: "銀河の仕組みに近いところへ触れている仲間", skill: "不思議な奇跡を起こす", tags: ["精霊", "不思議"] },
  ship: { label: "船", setting: "仲間たちを乗せて銀河を進む、はぐれ団の飛行船。", skill: "航路を守り、仲間を運ぶ", tags: ["宇宙人", "守り", "はぐれもの"] },
};

function roleDef(role) {
  return ROLE_DEFS[role] || ROLE_DEFS.balanced;
}

// 戦闘スキル定義（8種）。kind で効果を分岐。element は弱点/耐性判定に使用（攻撃系のみ）
const SKILLS = {
  slash:  { name: "スラッシュ",   kind: "atk1",        power: 1.5, element: "物理", desc: "単体に物理攻撃" },
  burst:  { name: "バースト",     kind: "atkAll",      power: 0.85, element: "炎",  desc: "敵全体に炎攻撃" },
  heal:   { name: "ヒール",       kind: "heal",        power: 26,  desc: "味方1人を回復" },
  guard:  { name: "ガードアップ", kind: "defUp",       power: 8,   desc: "味方全体の防御UP" },
  weaken: { name: "ウィークン",   kind: "enemyAtkDown",power: 0.65, desc: "敵の攻撃力ダウン" },
  crit:   { name: "クリティカル", kind: "crit",        power: 2.4, element: "光",  desc: "光の会心の一撃" },
  cheer:  { name: "エール",       kind: "buffNext",    power: 1.5, desc: "全体の次の攻撃強化" },
  gamble: { name: "いちかばちか", kind: "bigRandom",   power: 4.0, element: "闇",  desc: "闇の低確率大ダメージ" },
};
const SKILL_KEYS = Object.keys(SKILLS);
function allySkillSet(no, primarySkill) {
  const skills = [primarySkill];
  let offset = 0;
  while (skills.length < 2 && offset < SKILL_KEYS.length * 2) {
    const key = SKILL_KEYS[(no + offset) % SKILL_KEYS.length];
    if (!skills.includes(key)) skills.push(key);
    offset++;
  }
  return skills;
}
// 攻撃属性（弱点/耐性に使う）。たたかう=物理
const ELEMENTS = ["物理", "炎", "氷", "電気", "光", "闇"];

// パッシブ定義。戦闘開始時にステータスへ反映
const PASSIVES = [
  { id: "tough", label: "打たれ強い（防御+2）",   def: 2 },
  { id: "power", label: "攻撃的（攻撃+3）",        atk: 3 },
  { id: "swift", label: "俊敏（素早さ+4）",        spd: 4 },
  { id: "vital", label: "生命力（最大HP+10）",     hp: 10 },
  { id: "lucky", label: "幸運（会心率+12%）",      crit: 0.12 },
];

function tagsForAlly(entry, skillKey, face, setting, skill) {
  const rarity = entry.rarity;
  const role = roleDef(entry.role);
  const tags = new Set();
  role.tags.forEach(tag => tags.add(tag));
  tags.add(role.label);
  const text = `${entry.name} ${face} ${setting} ${skill} ${entry.role}`;
  if (rarity <= LOW_RARITY_MAX) tags.add("低レア");

  if (/はぐれ|迷子|壊れ|ボロ|弱|忘れ|ノイズ|バグ|怪盗|脱走|失った|逃げた/.test(text)) tags.add("はぐれもの");
  if (/ロボ|AI|機械|ネジ|電池|メカ|ボタン|ブリキ|アンドロイド|兵|時計|鉄|タワン|プロト|コア|アンテナ|歯車/.test(text) || /🤖|🔩|⚙️|🔋|🛞|🦾|🕰️|📡|🛰️/.test(face)) tags.add("機械");
  if (/犬|猫|魚|鳥|うさぎ|きつね|モグラ|竜|獣|狼|ペリカン|卵|モンスター|生物|ベビー/.test(text) || /🐟|🐈|🐇|🐕|🦊|🦡|🐲|🐺|🐉|🥚|🕊️/.test(face)) tags.add("動物");
  if (/星|精霊|魔女|巫女|守護|妖精|神|天使|月|彗星|太陽|重力|ブラックホール|エーテル|星雲|星屑|星くず/.test(text) || /✨|🌟|🌌|💫|🧚|👼|🔮|🌑|🕳️/.test(face)) tags.add("精霊");
  if (/宇宙人|星人|銀河|ノヴァ|コスモ|エーテル|宇宙|宇宙服|オルカ号/.test(text) || /👽|👨‍🚀|🚀|🛰️|📡/.test(face)) tags.add("宇宙人");

  if (skillKey === "heal" || /回復|治療|医|薬|看護|料理|ヒール|修理|直す/.test(text)) tags.add("回復");
  if (skillKey === "guard" || /防御|守|騎士|鎧|盾|バリア|かばう|ガード/.test(text)) tags.add("守り");
  if (["slash", "burst", "crit", "gamble"].includes(skillKey) || /攻撃|火力|斬|剣|射撃|火|雷|武器|体当たり|必殺/.test(text)) tags.add("攻撃");
  if (["weaken", "cheer"].includes(skillKey) || /ランダム|バグ|奇跡|記憶|時間|未来|占い|魔法|予測|重力|ルール|コピー/.test(text)) tags.add("不思議");

  if (tags.size < 2) tags.add("はぐれもの");
  if (tags.size < 2) tags.add("不思議");
  return Array.from(tags).slice(0, 3);
}

// カタログから実データへ展開（表示名・レア度・ロールを正として、既存戦闘用フィールドを補完）
const ALLIES = CHARACTER_CATALOG
  .filter(entry => isRosterAllyId(entry.id))
  .map(entry => {
  const no = Number(entry.id.slice(1));
  const id = entry.id;
  const rarity = entry.rarity;
  const role = roleDef(entry.role);
  const face = CHARACTER_FACE_BY_ID[id] || role.face || "⭐";
  const setting = entry.description || role.setting;
  const skill = role.skill;
  const skillKey = SKILL_KEYS[(no - 1) % SKILL_KEYS.length];
  const tags = tagsForAlly(entry, skillKey, face, setting, skill);
  const skills = allySkillSet(no, skillKey);
  return {
    id, name: entry.name, face, img: id, rarity, role: entry.role, roleLabel: role.label, setting, description: setting, skill,
    tag: tags.join(" / "),
    tags,
    hp: 30 + rarity * 14,               // レア度でHP自動算出
    atk: 8 + rarity * 4,                // レア度で攻撃力自動算出
    def: 2 + Math.round(rarity * 1.4),  // 防御
    spd: 8 + rarity * 2 + (no % 5),     // 素早さ
    level: rarity,                      // レベル＝レア度（編成の強さの目安）
    skillKey,
    skills,                              // 戦闘で選べるスキル一覧
    bskill: SKILLS[skillKey],           // 戦闘スキル（シグネチャ）
    passive: PASSIVES[(no - 1) % PASSIVES.length],
    navBonus: NAV_DEFS[NAV_ORDER[(no - 1) % NAV_ORDER.length]],
    voice: voiceForRarity(rarity),
  };
});

const STARTER_ID = "c1"; // 初期メンバー（ロボ太）

// 敵の系統ラベル
const ENEM_CAT = { bio: "宇宙生物系", robo: "ロボ・AI系", villain: "悪人系", concept: "概念系" };

// ステージごとの疑似AI風3D背景テーマ（画像差し替え時は bgImage を追加する想定）
const STAGE_THEMES = [
  { key: "scrap",       label: "スクラップ星雲", primary: 0x8c7aa8, secondary: 0x60506f, accent: 0xc266ff, css: "#1a1328", prop: "crate",  particle: 0xb8a6ff },
  { key: "checkpoint",  label: "検問ゲート",     primary: 0x2f8dff, secondary: 0x123b78, accent: 0xffdd66, css: "#071b32", prop: "ring",   particle: 0x66ccff },
  { key: "thief",       label: "星くず盗賊道",   primary: 0xffb13b, secondary: 0x4a1828, accent: 0xff4b6a, css: "#1d0b18", prop: "gem",    particle: 0xffd36a },
  { key: "merchant",    label: "ネオン商港",     primary: 0xffd45a, secondary: 0x663b14, accent: 0x66e8ff, css: "#1d1308", prop: "coin",   particle: 0xffdc66 },
  { key: "gear",        label: "ねじまき工場",   primary: 0xd57931, secondary: 0x5d3926, accent: 0xffb347, css: "#1b120c", prop: "gear",   particle: 0xff9f4a },
  { key: "meteor",      label: "流星荒野",       primary: 0xbc7550, secondary: 0x3a1e18, accent: 0xff4d2e, css: "#180b09", prop: "rock",   particle: 0xffaa6a },
  { key: "scanner",     label: "迷子スキャン域", primary: 0xff3158, secondary: 0x24143c, accent: 0x66ccff, css: "#100818", prop: "beam",   particle: 0xff6688 },
  { key: "office",      label: "暗黒オフィス網", primary: 0x4a6f99, secondary: 0x0b1628, accent: 0x8aa8ff, css: "#060b14", prop: "grid",   particle: 0x789cff },
  { key: "circus",      label: "星くずサーカス", primary: 0xff66cc, secondary: 0x342058, accent: 0xffdd66, css: "#160d2a", prop: "ring",   particle: 0xff88ee },
  { key: "pirate",      label: "黒赤海賊宙域",   primary: 0xd6333a, secondary: 0x130912, accent: 0xffd35a, css: "#080306", prop: "crate",  particle: 0xff5555 },
  { key: "rust",        label: "廃兵器残骸",     primary: 0x99754f, secondary: 0x32241a, accent: 0x7dd7ff, css: "#120e0a", prop: "pillar", particle: 0xb08a62 },
  { key: "mirror",      label: "偽りの白金神殿", primary: 0xe8e6ff, secondary: 0x495078, accent: 0xffe89a, css: "#101226", prop: "pillar", particle: 0xffffff },
  { key: "data",        label: "運命データ空間", primary: 0x66d9ff, secondary: 0x09244a, accent: 0xb8f7ff, css: "#061426", prop: "grid",   particle: 0x77eaff },
  { key: "nebula",      label: "星喰い暗黒星雲", primary: 0x61418f, secondary: 0x0a0613, accent: 0xff5b99, css: "#07040d", prop: "rock",   particle: 0x8b62dd },
  { key: "court",       label: "銀河法廷光柱",   primary: 0xffdf85, secondary: 0x263052, accent: 0x9fd4ff, css: "#101425", prop: "pillar", particle: 0xffe6a3 },
  { key: "memory",      label: "記憶ノイズ波",   primary: 0x3a3a66, secondary: 0x05050a, accent: 0xc266ff, css: "#05050a", prop: "wave",   particle: 0x8c7cff },
  { key: "gravity",     label: "無重力リング",   primary: 0x8ca6ff, secondary: 0x121436, accent: 0xd0e2ff, css: "#090b20", prop: "ring",   particle: 0xaec2ff },
  { key: "recycler",    label: "回収機関艦隊",   primary: 0xff9a3d, secondary: 0x26333f, accent: 0xff3344, css: "#10181c", prop: "beam",   particle: 0xffb36a },
  { key: "perfect",     label: "白き完成都市",   primary: 0xf6fbff, secondary: 0x6d7d94, accent: 0x66ccff, css: "#111923", prop: "pillar", particle: 0xffffff },
  { key: "lastgear",    label: "ラストギア星図", primary: 0xff3344, secondary: 0x150309, accent: 0xffd35a, css: "#070105", prop: "gear",   particle: 0xff4455 },
];

const stageTheme = (stage) => STAGE_THEMES[(stage - 1) % STAGE_THEMES.length];
const hexCss = (color) => `#${color.toString(16).padStart(6, "0")}`;
function rgbaCss(color, alpha) {
  const n = Number(color) || 0;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
function stagePatternLayer(theme) {
  const accent = rgbaCss(theme.accent, 0.24);
  if (theme.prop === "grid") return `linear-gradient(90deg, ${accent} 1px, transparent 1px), linear-gradient(0deg, ${accent} 1px, transparent 1px)`;
  if (theme.prop === "beam") return `linear-gradient(112deg, transparent 0 32%, ${accent} 33% 34%, transparent 35% 100%)`;
  if (theme.prop === "ring") return `radial-gradient(circle at 76% 26%, transparent 0 18%, ${accent} 19% 20%, transparent 21% 100%)`;
  if (theme.prop === "wave") return `repeating-radial-gradient(circle at 48% 28%, transparent 0 18px, ${accent} 19px 20px)`;
  if (theme.prop === "gear") return `repeating-conic-gradient(from 12deg at 72% 22%, ${accent} 0 8deg, transparent 8deg 24deg)`;
  return `linear-gradient(145deg, transparent 0 42%, ${accent} 43% 44%, transparent 45% 100%)`;
}
function stageBackgroundSize(theme) {
  if (theme.prop === "grid") return "42px 42px, 42px 42px, auto, auto, auto, auto";
  if (theme.prop === "gear") return "130px 130px, auto, auto, auto, auto";
  return "auto";
}
function stageSpaceBackground(theme, focus = "50% 20%") {
  return [
    stagePatternLayer(theme),
    `radial-gradient(circle at ${focus}, ${rgbaCss(theme.primary, 0.48)}, transparent 30%)`,
    `radial-gradient(circle at 18% 72%, ${rgbaCss(theme.secondary, 0.46)}, transparent 34%)`,
    `radial-gradient(circle at 82% 68%, ${rgbaCss(theme.accent, 0.30)}, transparent 32%)`,
    `linear-gradient(180deg, ${theme.css} 0%, #02020a 74%)`,
  ].join(",");
}

const BOSS_IMAGE_BY_STAGE = {
  1: "enemies/st01_space_junk_storm",
  2: "enemies/st02_checkpoint_robot",
  3: "enemies/st03_star_thief",
  4: "enemies/st04_gamel_merchant",
  5: "enemies/st05_spring_banchou",
  6: "enemies/st06_meteor_wolf",
  7: "enemies/st07_lost_hunter_drone",
  8: "enemies/st08_black_company_manager",
  9: "enemies/st09_stardust_circus_master",
  10: "enemies/st10_captain_zaba",
  11: "enemies/st11_rusted_giant_gordon",
  12: "enemies/st12_false_hero_mirror",
  13: "enemies/st13_luckless_ai",
  14: "enemies/st14_glaton",
  15: "enemies/st15_judgem",
  16: "enemies/st16_memory_noise",
  17: "enemies/st17_gravity_king_gravis",
  18: "enemies/st18_captain_raid",
  19: "enemies/st19_perfect_hero_orden",
  20: "enemies/st20_lastgear",
};

const BOSS_ULTIMATE_PLAN = [
  { stage: 1,  bossName: "宇宙海賊キャプテン・ザバ",       name: "ギャラクシーキャノン" },
  { stage: 2,  bossName: "サビつき巨兵ゴルドン",           name: "アイアンフォール" },
  { stage: 3,  bossName: "偽りの勇者ミラー",               name: "ヒーローコピー" },
  { stage: 4,  bossName: "星屑魔導師ネブラ",               name: "メテオレイン" },
  { stage: 5,  bossName: "深海惑星の主アビス",             name: "アビスウェーブ" },
  { stage: 6,  bossName: "反転王リバース",                 name: "リバースワールド" },
  { stage: 7,  bossName: "星盗賊クロウ",                   name: "スターリーパー" },
  { stage: 8,  bossName: "機械獣ギガファング",             name: "ギガクラッシュ" },
  { stage: 9,  bossName: "夢喰いバクーン",                 name: "ドリームイーター" },
  { stage: 10, bossName: "古代衛星アーク",                 name: "アークジャッジ" },
  { stage: 11, bossName: "AI司祭エクレア",                 name: "ロストプロトコル" },
  { stage: 12, bossName: "偽神デウス",                     name: "ゴッドエラー" },
  { stage: 13, bossName: "運命管理AIラックレス",           name: "運命最適化" },
  { stage: 14, bossName: "星喰い幼獣グラトン",             name: "スターデヴォア" },
  { stage: 15, bossName: "銀河裁判官ジャッジム",           name: "不要判定" },
  { stage: 16, bossName: "記憶ぬすみノイズ",               name: "メモリーイート" },
  { stage: 17, bossName: "無重力の王グラビス",             name: "ゼログラビティ" },
  { stage: 18, bossName: "銀河回収機関の艦長レイド",       name: "ターゲット回収" },
  { stage: 19, bossName: "完成された勇者オルデン",         name: "パーフェクトソウル" },
  { stage: 20, bossName: "運命固定装置ラストギア",         name: "ラストシミュレーション" },
];
const normalizeBossName = (name) => String(name || "").replace(/[\s　・]/g, "");
const BOSS_ULTIMATE_BY_NAME = Object.fromEntries(
  BOSS_ULTIMATE_PLAN.map(ultimate => [normalizeBossName(ultimate.bossName), ultimate])
);
function bossUltimateForName(name) {
  const ultimate = BOSS_ULTIMATE_BY_NAME[normalizeBossName(name)];
  return ultimate ? { name: ultimate.name, plannedStage: ultimate.stage, bossName: ultimate.bossName } : null;
}

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
  const bossImage = BOSS_IMAGE_BY_STAGE[stage] || null;
  const bossImagePath = bossImage ? `assets/${bossImage}.png` : null;
  const ultimate = bossUltimateForName(eName);
  const boss = stage === 20;
  // 各仲間が2スキルから選べる分、序盤は練習しやすく、終盤は少し粘る調整。
  const battleScale = stage <= 6 ? 0.92 : (stage <= 12 ? 1.0 : 1.08);
  const hp = Math.round((18 + stage * 10 + stage * stage * 2.6) * battleScale * (boss ? 1.68 : 1));
  const atkScale = stage <= 6 ? 0.9 : (stage <= 12 ? 1.0 : 1.07);
  const atk = Math.round((4 + stage * 1.2 + stage * stage * 0.18) * atkScale * (boss ? 1.48 : 1));
  // 推奨戦力と危険度（ワールドマップ表示用）
  const danger = Math.min(5, Math.ceil(stage / 4));
  const recommend = stage <= 1 ? "仲間1人〜"
    : stage <= 3 ? "仲間2人以上"
    : stage <= 6 ? "仲間3人以上"
    : stage <= 12 ? "4人編成"
    : "4人＋回復/スキル";
  const reward = boss ? 80 : 3 + stage * 2;
  const center = Math.ceil(stage / 2);
  const rMin = Math.max(1, Math.min(MAX_ALLY_RARITY, center - 1));
  const rMax = Math.max(rMin, Math.min(MAX_ALLY_RARITY, center + 1));
  const theme = stageTheme(stage);
  // 系統ごとの弱点・耐性（弱点は攻撃スキルで突けるもの＝物理/炎/光/闇 に限定）
  const WR = {
    robo:    { weak: "炎",   resist: "物理" },
    villain: { weak: "光",   resist: "闇" },
    bio:     { weak: "闇",   resist: "炎" },
    concept: { weak: "物理", resist: "光" },
  };
  const wr = WR[cat] || { weak: "物理", resist: "氷" };
  const elevel = Math.ceil(stage / 2); // 2ステージごとに敵Lv+1（表示は控えめ）
  ENEMIES[eid] = { name: eName, face: eFace, img: eid, image: bossImage, imagePath: bossImagePath, ultimate, hp, atk, cat: ENEM_CAT[cat], catKey: cat, gimmick: gim, boss, weak: wr.weak, resist: wr.resist, level: elevel };
  STARS.push({ id, name: sName, icon: sIcon, desc: gim, enemy: eid, enemyImage: bossImage, enemyImagePath: bossImagePath, enemyUltimate: ultimate, reward, rMin, rMax, cat: ENEM_CAT[cat], catKey: cat, boss, stage, theme, danger, recommend });
});

// ラスボスの登場セリフ
const BOSS_QUOTE = "お前たちのような、弱く、未完成で、偶然集まった者たちに、銀河を変える資格はない";

const allyById = (id) => ALLIES.find(a => a.id === id);

function allyNoFromId(id) {
  const m = /^c([1-9]\d*)$/.exec(String(id || ""));
  return m ? Number(m[1]) : null;
}
function isRosterAllyId(id) {
  const no = allyNoFromId(id);
  return no !== null && no <= TOTAL_CHARACTERS;
}
function isImplementedAllyImageId(id) {
  const no = allyNoFromId(id);
  return no !== null && no <= ALLY_IMAGE_IMPLEMENTED_COUNT;
}
function allyImagePath(allyOrId) {
  const id = typeof allyOrId === "string" ? allyOrId : (allyOrId?.img || allyOrId?.id);
  return isImplementedAllyImageId(id) ? `characters/${id}` : null;
}

// 航行ミッション（開始時に1つ提示。成功で戦闘/スカウト用ボーナス）
// bonus.type: enemyHp(-10%) / scoutRate(+5%) / crystal(+20) / allyHp(+1)
const MISSIONS = [
  { id: "c5",    type: "crystals", goal: 5,  desc: "クリスタルを5個 集めろ",      bonus: { type: "crystal",   label: "クリスタル +10" } },
  { id: "nohit", type: "nohit",    goal: 10, desc: "10秒間 ノーダメージで耐えろ", bonus: { type: "allyHp",    label: "味方HP +1" } },
  { id: "big1",  type: "big",      goal: 1,  desc: "大クリスタルを1個 拾え",      bonus: { type: "scoutRate", label: "スカウト成功率 +5%" } },
  { id: "e3",    type: "enemies",  goal: 3,  desc: "敵を3体 倒せ",                bonus: { type: "enemyHp",   label: "敵HP -10%" } },
];

const ITEM_DEFS = {
  smallHeal:   { id: "smallHeal",   name: "小回復カプセル", price: 10, icon: "🧪", desc: "戦闘中、HPが少ない味方1人を20回復", use: "battle" },
  allHeal:     { id: "allHeal",     name: "全体回復パック", price: 25, icon: "🎒", desc: "戦闘中、味方全員のHPを10回復", use: "battle" },
  barrierOrb:  { id: "barrierOrb",  name: "バリアオーブ",   price: 30, icon: "🟣", desc: "戦闘中、次に受けるダメージを1軽減", use: "battle" },
  scoutBeacon: { id: "scoutBeacon", name: "スカウトビーコン", price: 40, icon: "📡", desc: "次のスカウト挑戦の成功率 +10%", use: "auto" },
  spareEnergy: { id: "spareEnergy", name: "予備エネルギー", price: 20, icon: "🔋", desc: "次の航行開始時、飛行船HP +1", use: "auto" },
};
const ITEM_ORDER = ["smallHeal", "allHeal", "barrierOrb", "scoutBeacon", "spareEnergy"];
const defaultItems = () => Object.fromEntries(ITEM_ORDER.map(id => [id, 0]));

// 直前の航行で獲得したボーナス（次の戦闘/スカウトに反映）。なければ null
let stageBonus = null;

const SYNERGY_DEFS = [
  { id: "machine", tag: "機械", min: 2, name: "機械リンク", desc: "防御 +10%", apply: e => { e.defMul *= 1.10; } },
  { id: "animal", tag: "動物", min: 2, name: "動物の勘", desc: "回避率 +8%", apply: e => { e.evasion += 0.08; } },
  { id: "spirit", tag: "精霊", min: 2, name: "星霊の余韻", desc: "戦闘後に全員少し回復", apply: e => { e.postBattleHeal += 8; } },
  { id: "alien", tag: "宇宙人", min: 2, name: "宇宙人ネット", desc: "航行クリスタル +10%", apply: e => { e.crystalMul *= 1.10; } },
  { id: "stray", tag: "はぐれもの", min: 2, name: "はぐれものの絆", desc: "スカウト率 +5%", apply: e => { e.scoutRate += 0.05; } },
  { id: "heal", tag: "回復", min: 1, name: "回復役の見守り", desc: "ターン終了時に低HPを回復", apply: e => { e.turnHeal += 6; } },
  { id: "attack", tag: "攻撃", min: 2, name: "攻撃陣形", desc: "通常攻撃 +8%", apply: e => { e.normalAtkMul *= 1.08; } },
  { id: "guard", tag: "守り", min: 2, name: "守りの構え", desc: "戦闘開始バリア ×1", apply: e => { e.battleBarrier += 1; } },
  { id: "mystery", tag: "不思議", min: 2, name: "不思議な追い風", desc: "ミッション報酬を強化", apply: e => { e.missionBoost = true; } },
  { id: "low", tag: "低レア", min: 2, name: "小さな意地", desc: "低レアHP +10%", apply: e => { e.lowRarityHpMul *= 1.10; } },
];

function baseSynergyEffects() {
  return {
    defMul: 1, evasion: 0, postBattleHeal: 0, crystalMul: 1, scoutRate: 0,
    turnHeal: 0, normalAtkMul: 1, battleBarrier: 0, missionBoost: false,
    lowRarityHpMul: 1,
  };
}

function computePartyTagCounts(partyIds = save.party) {
  const counts = {};
  (partyIds || []).slice(0, 4).forEach(id => {
    const a = allyById(id);
    (a?.tags || []).forEach(tag => { counts[tag] = (counts[tag] || 0) + 1; });
  });
  return counts;
}

function computeSynergies(partyIds = save.party) {
  const counts = computePartyTagCounts(partyIds);
  const effects = baseSynergyEffects();
  const active = [];
  SYNERGY_DEFS.forEach(def => {
    const count = counts[def.tag] || 0;
    if (count < def.min) return;
    def.apply(effects);
    active.push({ id: def.id, tag: def.tag, count, name: def.name, desc: def.desc });
  });
  return { counts, active, effects };
}

function renderSynergyPanel(synergy = computeSynergies(save.party), title = "発動中シナジー") {
  const active = synergy.active || [];
  const body = active.length
    ? active.map(s => `<span class="synergy-pill"><b>${s.name}</b>${s.desc}</span>`).join("")
    : `<span class="synergy-empty">発動中のシナジーなし</span>`;
  return `
    <div class="synergy-panel">
      <div class="synergy-title">${title}</div>
      <div class="synergy-tags">${body}</div>
    </div>
  `;
}

// パーティ構成から航行（シューティング）効果を集約
function computeNavEffects(partyIds = save.party) {
  const e = {
    fireRateMul: 1, crystalMul: 1, rockGuardChance: 0, killBonus: 0,
    bigBonus: 0, shields: 0, hazardSpeedMul: 1, missionBoost: false, labels: [],
  };
  const synergy = computeSynergies(partyIds);
  partyIds.forEach(id => {
    const a = allyById(id);
    if (!a || !a.navBonus) return;
    switch (a.navBonus.type) {
      case "fireRate":     e.fireRateMul *= 0.85; break;
      case "crystalUp":    e.crystalMul *= 1.10; break;
      case "rockGuard":    e.rockGuardChance = Math.min(0.6, e.rockGuardChance + 0.20); break;
      case "killCrystal":  e.killBonus += 1; break;
      case "bigUp":        e.bigBonus += 2; break;
      case "shield":       e.shields += 1; break;
      case "slow":         e.hazardSpeedMul *= 0.90; break;
      case "missionBoost": e.missionBoost = true; break;
    }
    e.labels.push({ name: a.name, img: a.img, face: a.face, label: a.navBonus.label });
  });
  e.synergy = synergy;
  e.crystalMul *= synergy.effects.crystalMul;
  if (synergy.effects.missionBoost) e.missionBoost = true;
  e.fireRateMul = Math.max(0.4, e.fireRateMul);     // 上限（速くなりすぎない）
  e.hazardSpeedMul = Math.max(0.7, e.hazardSpeedMul);
  return e;
}

// （敵データ ENEMIES は上の RAW_STAGES から自動生成）

// -------------------------------------------------------------
// セーブデータ（localStorage）
// -------------------------------------------------------------
const SAVE_KEY = "ginga-haguredan-save-v1";

const DEX_STAT_KEYS = [
  "foundCount",
  "scoutSuccessCount",
  "scoutFailCount",
  "skipCount",
  "partedCount",
  "lastMetStar",
  "lastPartyStar",
  "clearMemberCount",
  "firstMetStar",
];
const DEX_STAT_ALIASES = {
  found: "foundCount",
  discover: "foundCount",
  discovered: "foundCount",
  success: "scoutSuccessCount",
  scoutSuccess: "scoutSuccessCount",
  fail: "scoutFailCount",
  scoutFail: "scoutFailCount",
  skip: "skipCount",
  skipped: "skipCount",
  parted: "partedCount",
  clear: "clearMemberCount",
  clearMember: "clearMemberCount",
};

function defaultDexStat() {
  return {
    foundCount: 0,
    scoutSuccessCount: 0,
    scoutFailCount: 0,
    skipCount: 0,
    partedCount: 0,
    lastMetStar: null,
    lastPartyStar: null,
    clearMemberCount: 0,
    firstMetStar: null,
  };
}

function normalizeDexStat(raw = {}) {
  const stat = Object.assign(defaultDexStat(), raw || {});
  ["foundCount", "scoutSuccessCount", "scoutFailCount", "skipCount", "partedCount", "clearMemberCount"]
    .forEach(key => { stat[key] = Math.max(0, Number(stat[key]) || 0); });
  ["lastMetStar", "lastPartyStar", "firstMetStar"]
    .forEach(key => { stat[key] = stat[key] || null; });
  return stat;
}

function starterDexStats() {
  const stat = defaultDexStat();
  stat.foundCount = 1;
  stat.scoutSuccessCount = 1;
  stat.firstMetStar = "初期メンバー";
  stat.lastPartyStar = "初期メンバー";
  return { [STARTER_ID]: stat };
}

const defaultSave = () => ({
  crystals: 0,
  cleared: [],                  // クリア済み星ID
  party: [STARTER_ID],          // 初期メンバー
  discovered: [STARTER_ID],     // 図鑑：発見済み（出会った）仲間ID
  recruited: [STARTER_ID],      // 図鑑：加入済み（スカウト成功）仲間ID
  dexStats: starterDexStats(),   // 図鑑：出会い・成功・別れなどの記録
  items: defaultItems(),         // ショップで購入したアイテム所持数
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
      // 60人ロスターに合わせ、存在しない仲間IDを除去し、初期メンバーを保証
      const valid = new Set(ALLIES.map(a => a.id));
      data.party = (data.party || []).filter(id => valid.has(id));
      data.discovered = (data.discovered || []).filter(id => valid.has(id));
      data.recruited = (data.recruited || []).filter(id => valid.has(id));
      if (data.party.length === 0) data.party = [STARTER_ID];
      if (!data.discovered.includes(STARTER_ID)) data.discovered.push(STARTER_ID);
      if (!data.recruited.includes(STARTER_ID)) data.recruited.push(STARTER_ID);
      ensureDexStats(data);
      data.items = Object.assign(defaultItems(), data.items || {});
      return data;
    }
  } catch (e) { console.warn("save load failed", e); }
  const fresh = defaultSave();
  ensureDexStats(fresh);
  return fresh;
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
  catch (e) { console.warn("save failed", e); }
}
function resetSave() {
  save = defaultSave();
  ensureDexStats(save);
  persist();
}

function ensureDexStats(data = save) {
  const valid = new Set(ALLIES.map(a => a.id));
  const source = data.dexStats && typeof data.dexStats === "object" ? data.dexStats : {};
  const next = {};
  Object.keys(source).forEach(id => {
    if (valid.has(id)) next[id] = normalizeDexStat(source[id]);
  });
  data.dexStats = next;

  (data.discovered || []).forEach(id => {
    if (!valid.has(id)) return;
    const stat = dexStat(id, data);
    if (stat.foundCount <= 0) stat.foundCount = 1;
    if (id === STARTER_ID && !stat.firstMetStar) stat.firstMetStar = "初期メンバー";
  });
  (data.recruited || []).forEach(id => {
    if (!valid.has(id)) return;
    const stat = dexStat(id, data);
    if (stat.scoutSuccessCount <= 0) stat.scoutSuccessCount = 1;
  });
  return data.dexStats;
}

function dexStat(id, data = save) {
  if (!data.dexStats || typeof data.dexStats !== "object") data.dexStats = {};
  data.dexStats[id] = normalizeDexStat(data.dexStats[id]);
  return data.dexStats[id];
}

function resolveDexStatKey(key) {
  return DEX_STAT_ALIASES[key] || key;
}

function addDexStat(id, key, amount = 1) {
  const stat = dexStat(id);
  const resolved = resolveDexStatKey(key);
  if (!DEX_STAT_KEYS.includes(resolved) || typeof stat[resolved] !== "number") {
    console.warn("unknown numeric dex stat", key);
    return stat;
  }
  stat[resolved] += amount;
  return stat;
}

function starRecordLabel(star = currentStar) {
  return star ? `${star.stage}. ${star.name}` : null;
}

// 図鑑（発見済み）に登録された正式仲間ID c1〜c60 の人数。重複は元々なし／データ無しでも0
function heroCount() {
  return (save.discovered || []).filter(isRosterAllyId).length;
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
function escAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function assetImageHTML(path, fallback = "", className = "") {
  const cls = className ? ` class="${escAttr(className)}"` : "";
  return `<img src="assets/${path}.png" alt=""${cls} data-fallback="${escAttr(fallback)}" onerror="this.replaceWith(document.createTextNode(this.dataset.fallback))">`;
}
// 絵文字 or 画像のHTMLを返す（画像が読めなければ絵文字を表示）
function faceHTML(emoji, path) {
  if (!path) return emoji;
  const probe = tryImage(path);
  if (probe.complete && probe.naturalWidth <= 0) return emoji;
  return assetImageHTML(path, emoji);
}

// 装飾用PNGスロット：画像があれば表示しフォールバックを隠す（無ければ従来表示のまま）
function setBgImage(selector, path) {
  const el = document.querySelector(selector);
  if (!el) return;
  const img = tryImage(path);
  const apply = () => {
    if (img.naturalWidth > 0) {
      el.style.backgroundImage = `url(assets/${path}.png)`;
      el.classList.add("has-bg-img");
    }
  };
  if (img.complete) apply(); else img.addEventListener("load", apply, { once: true });
}
function setSlotImage(selector, paths) {
  const el = document.querySelector(selector);
  if (!el) return;
  const list = Array.isArray(paths) ? paths : [paths];
  let done = false;
  list.forEach(path => {
    const img = tryImage(path);
    const apply = () => {
      if (done || img.naturalWidth <= 0) return;
      done = true;
      let slot = el.querySelector(":scope > .asset-img");
      if (!slot) { slot = document.createElement("img"); slot.className = "asset-img"; slot.alt = ""; el.appendChild(slot); }
      slot.src = `assets/${path}.png`;
      el.classList.add("has-img");
    };
    if (img.complete) apply(); else img.addEventListener("load", apply, { once: true });
  });
}
// 各画面の装飾PNGを反映（PNGが無ければ何もしない＝従来表示）
function applyAssetImages() {
  setBgImage(".title-bg", "backgrounds/title_space_vertical");
  // ロゴは仕様の logo/ を優先、無ければ title/ も試す
  setSlotImage(".game-logo", ["logo/logo_main", "title/logo_main"]);
  setSlotImage(".ship-character", "ships/ship_default");
  setSlotImage(".weak-hero", "title/hero_main");
  setSlotImage(".wm-ship", "ships/ship_default");
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
  if (name === "title") updateTitleSaveState();
  if (name === "worldmap") { startWorldmap(); renderStarList(); refreshCrystals(); }
  else { stopWorldmap(); }
  if (name === "dex") renderDex();
  if (name === "shop") renderShop();
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
  const shopCrystals = document.getElementById("shop-crystals");
  if (shopCrystals) shopCrystals.textContent = `💎 ${save.crystals}`;
}

function itemCount(id) {
  save.items = Object.assign(defaultItems(), save.items || {});
  return save.items[id] || 0;
}
function changeItem(id, delta) {
  save.items = Object.assign(defaultItems(), save.items || {});
  save.items[id] = Math.max(0, (save.items[id] || 0) + delta);
}
function consumeItem(id) {
  if (itemCount(id) <= 0) return false;
  changeItem(id, -1);
  persist();
  return true;
}

function renderShop() {
  const list = document.getElementById("shop-list");
  if (!list) return;
  refreshCrystals();
  list.innerHTML = ITEM_ORDER.map(id => {
    const item = ITEM_DEFS[id];
    const count = itemCount(id);
    const enough = save.crystals >= item.price;
    return `
      <div class="shop-row ${enough ? "" : "short"}">
        <div class="shop-icon">${item.icon}</div>
        <div class="shop-info">
          <div class="shop-name">${item.name}</div>
          <div class="shop-desc">${item.desc}</div>
          <div class="shop-owned">所持 ×${count}</div>
        </div>
        <button class="btn shop-buy" data-buy-item="${id}" ${enough ? "" : "disabled"}>💎${item.price}</button>
      </div>`;
  }).join("");
}

function buyItem(id) {
  const item = ITEM_DEFS[id];
  if (!item) return;
  if (save.crystals < item.price) { toast("クリスタルが足りない"); return; }
  save.crystals -= item.price;
  changeItem(id, 1);
  persist();
  renderShop();
  toast(`${item.name}を買った`);
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
// セーブデータが存在するか（現行キー＋旧キー）
function hasSavedGame() {
  return !!(
    localStorage.getItem(SAVE_KEY) ||
    localStorage.getItem("gingaHaguredanSave") ||
    localStorage.getItem("saveData")
  );
}

function updateTitleSaveState() {
  const hasStoredSave = hasSavedGame();
  document.body.classList.toggle("has-save", hasStoredSave);
  const continueButton = document.getElementById("continue-game-btn");
  if (continueButton) {
    continueButton.setAttribute("aria-disabled", String(!hasStoredSave));
    continueButton.title = hasStoredSave ? "保存データから再開" : "保存データがありません";
  }
}

document.querySelector("#screen-title").addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  switch (el.dataset.action) {
    case "start-game":    startIntro(); break;
    case "continue":
      if (hasSavedGame()) show("worldmap");
      else toast("セーブデータがありません");
      break;
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
  const synergy = computeSynergies(save.party);
  list.innerHTML = renderSynergyPanel(synergy) + save.party.map(id => {
    const a = allyById(id); if (!a) return "";
    return `
      <div class="party-row">
        <div class="pr-face">${faceHTML(a.face, allyImagePath(a))}</div>
        <div class="pr-info">
          <div class="pr-name">${a.name} <span class="rarity">★${a.rarity}</span></div>
          <div class="pr-tags">${a.tags.map(tag => `<span class="tag-chip">${tag}</span>`).join("")}</div>
          <div class="pr-sub">ロール：${a.roleLabel}</div>
          <div class="pr-sub">${a.setting}</div>
          <div class="pr-sub">Lv.${a.level} ／ HP${a.hp} ／ 攻${a.atk} ／ 防${a.def} ／ 速${a.spd}</div>
          <div class="pr-sub">スキル：${a.bskill.name}（${a.bskill.desc}）</div>
          <div class="pr-sub">パッシブ：${a.passive.label}</div>
          <div class="pr-sub">得意：${a.skill}</div>
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

document.querySelectorAll('[data-action="open-shop"]').forEach(b =>
  b.addEventListener("click", () => show("shop")));

document.querySelector("#screen-shop").addEventListener("click", (e) => {
  const actionEl = e.target.closest("[data-action]");
  if (actionEl?.dataset.action === "close-shop") return show("worldmap");
  const buyEl = e.target.closest("[data-buy-item]");
  if (buyEl) buyItem(buyEl.dataset.buyItem);
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

  const themeGroup = new THREE.Group();
  wmScene.add(themeGroup);
  wmScene.userData.themeGroup = themeGroup;

  wmScene.add(new THREE.AmbientLight(0x8899ff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(5, 10, 8);
  wmScene.add(dir);
}

function nextWorldmapStar() {
  return STARS.find(star => !save.cleared.includes(star.id)) || STARS[STARS.length - 1];
}

function setMaterialColor(material, color) {
  if (!material) return;
  if (material.color?.setHex) material.color.setHex(color);
  else material.color = color;
}

function setupWorldmapTheme() {
  if (!wmScene) return;
  const star = nextWorldmapStar();
  const theme = star.theme || stageTheme(star.stage);
  const host = document.getElementById("worldmap-space");
  host.style.background = stageSpaceBackground(theme, "60% 25%");
  host.style.backgroundSize = stageBackgroundSize(theme);
  if (wmScene.userData.planet) {
    setMaterialColor(wmScene.userData.planet.material, theme.secondary);
  }
  const group = wmScene.userData.themeGroup;
  clearGroup(group);
  for (let i = 0; i < 7; i++) {
    const ring = new THREE.Mesh(
      i % 2 === 0
        ? new THREE.TorusGeometry(10 + i * 3.1, 0.04 + i * 0.006, 8, 42)
        : new THREE.IcosahedronGeometry(0.8 + i * 0.12, 0),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? theme.accent : theme.primary, transparent: true, opacity: 0.45 })
    );
    ring.position.set((i - 3) * 5, (Math.random() - 0.5) * 24, -18 - i * 3);
    ring.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    ring.userData = { spin: 0.0015 + i * 0.0004 };
    group.add(ring);
  }
}

function startWorldmap() {
  if (!wmRenderer) initWorldmap();
  setupWorldmapTheme();
  resizeRenderer(wmRenderer, document.getElementById("worldmap-space"));
  const loop = () => {
    wmStars.rotation.y += 0.0004;
    wmStars.rotation.x += 0.0002;
    if (wmScene.userData.planet) wmScene.userData.planet.rotation.y += 0.003;
    if (wmScene.userData.themeGroup) {
      wmScene.userData.themeGroup.rotation.z += 0.0008;
      wmScene.userData.themeGroup.children.forEach(o => {
        o.rotation.x += o.userData.spin || 0.001;
        o.rotation.y += (o.userData.spin || 0.001) * 0.7;
      });
    }
    wmRenderer.render(wmScene, wmCamera);
    wmRAF = requestAnimationFrame(loop);
  };
  cancelAnimationFrame(wmRAF);
  loop();
}
function stopWorldmap() { cancelAnimationFrame(wmRAF); }

function renderStarList() {
  const list = document.getElementById("star-list");
  const synergy = computeSynergies(save.party);
  list.innerHTML = renderSynergyPanel(synergy);
  const nextIndex = STARS.findIndex(star => !save.cleared.includes(star.id));
  const hc = heroCount();
  STARS.forEach((star, i) => {
    const cleared = save.cleared.includes(star.id);
    // 直前の星をクリアしていれば解放（最初の星は常に解放）
    const prevCleared = i === 0 || save.cleared.includes(STARS[i-1].id);
    let unlocked = prevCleared;
    // ラスボス：直前クリア済みでも必要人数未満なら挑戦不可（理由を表示しタップ可）
    let heroGate = false;
    if (star.boss && prevCleared && hc < FINAL_BOSS_UNLOCK_COUNT) { heroGate = true; unlocked = false; }
    const card = document.createElement("div");
    const current = unlocked && !cleared && (nextIndex === -1 ? i === STARS.length - 1 : i === nextIndex);
    card.className = "star-card"
      + (!unlocked && !heroGate ? " locked" : "")
      + (cleared ? " cleared" : "")
      + (current ? " current" : "")
      + ` cat-${star.catKey || ""}`;
    card.style.setProperty("--star-color", hexCss(star.theme.primary));
    card.style.setProperty("--star-accent", hexCss(star.theme.accent));
    if (heroGate) { card.style.opacity = "0.9"; card.style.borderColor = "rgba(255,120,120,.5)"; }

    let descHtml, badgeHtml;
    if (star.boss && heroGate) {
      descHtml = `<span class="star-cat">${star.cat}</span> 🔒 ラスボスに挑むには${FINAL_BOSS_UNLOCK_COUNT}人のはぐれ者の力が必要 ／ <b style="color:#fd6">現在 ${hc} / ${FINAL_BOSS_UNLOCK_COUNT}人</b>`;
      badgeHtml = `<span class="star-badge" style="background:rgba(255,90,90,.18);color:#f88">🔒</span>`;
    } else if (star.boss && unlocked && !cleared) {
      descHtml = `<span class="star-cat">${star.cat}</span> ⚡ ${FINAL_BOSS_UNLOCK_COUNT}人のはぐれ者が集まった！ ラストギアへの航路が開いた！`;
      badgeHtml = `<span class="star-badge" style="background:rgba(255,216,90,.2);color:var(--gold)">挑戦可</span>`;
    } else {
      descHtml = `<span class="star-cat">${star.cat}</span> <span class="star-theme">${star.theme.label}</span> ${star.desc}`;
      badgeHtml = cleared ? '<span class="star-badge">クリア済</span>' : `<span class="star-badge" style="background:rgba(110,200,255,.18);color:var(--accent)">💎${star.reward}</span>`;
    }

    const dangerStars = "★".repeat(star.danger) + "☆".repeat(5 - star.danger);
    const recoHtml = (!star.boss || (star.boss && !heroGate))
      ? `<div class="star-reco">推奨：${star.recommend}　危険度：<span class="star-danger">${dangerStars}</span>${cleared ? "　🔁再挑戦OK" : ""}</div>`
      : "";
    const iconHtml = star.enemyImage
      ? `<div class="star-boss-thumb">${faceHTML(star.icon, star.enemyImage)}</div>`
      : `<div class="star-icon">${star.icon}</div>`;
    card.innerHTML = `
      <div class="star-route"></div>
      ${iconHtml}
      <div class="star-info">
        <div class="star-name">${star.boss ? "👑 " : ""}${star.stage}. ${star.name}</div>
        <div class="star-desc">${descHtml}</div>
        ${recoHtml}
      </div>
      ${badgeHtml}
    `;
    if (heroGate) {
      card.addEventListener("click", () =>
        toast(`まだ仲間が足りない… あと ${FINAL_BOSS_UNLOCK_COUNT - hc} 人。銀河中のはぐれ者をもっと探そう`));
    } else if (unlocked) {
      card.addEventListener("click", () => startStage(star));
    }
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
  const bossEl = document.getElementById("preflight-boss");
  if (bossEl) {
    bossEl.hidden = !star.enemyImage;
    bossEl.innerHTML = star.enemyImage ? faceHTML(star.icon, star.enemyImage) : "";
  }
  const list = document.getElementById("preflight-list");
  const navHtml = eff.labels.length
    ? eff.labels.map(l => `
        <div class="pf-row">
          <span class="pf-face">${faceHTML(l.face, allyImagePath(l))}</span>
          <span class="pf-name">${l.name}</span>
          <span class="pf-eff">${l.label}</span>
        </div>`).join("")
    : `<div class="pf-row"><span class="pf-eff">特別な効果なし</span></div>`;
  list.innerHTML = navHtml + renderSynergyPanel(eff.synergy);
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
const SHIP_R = 0.34; // 飛行船の当たり判定半径（見た目より小さめ）
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
  ship: null, wingL: null, wingR: null, stageBg: null,
  bullets: [], rocks: [], enemies: [], crystals: [],
  hp: MAX_HP, maxHp: MAX_HP, gained: 0, timeLeft: STAGE_TIME, lastShot: 0, lastSpawn: 0,
  running: false, targetX: 0, targetY: 0, startT: 0,
  keyDir: 0, lastManualShot: 0,
  // アーケードHUD：スコア＆チェイン＆ボム
  score: 0, chain: 0, chainExpire: 0, bombs: 3, lastSpeech: 0, speechIdx: 0,
  // 航行スタッツ＆ミッション
  dmgTaken: 0, kills: 0, bigPicked: 0,
  mission: null, missionProgress: 0, missionDone: false, missionFailed: false,
  // 仲間の航行効果
  nav: null, shieldLeft: 0,
  // 被弾無敵時間（i-frames）
  invulnUntil: 0,
};
const INVULN_MS = 800; // 被弾後の無敵時間
// クリスタル獲得量（経済バランスはここで一括調整）
const CRYSTAL_NORMAL_MIN = 1;
const CRYSTAL_NORMAL_MAX = 1;   // 通常クリスタルは +1（貴重な資源に）
const CRYSTAL_BIG_MIN = 6;
const CRYSTAL_BIG_MAX = 8;      // 大クリスタルは +6〜8

const CHAIN_WINDOW = 2600; // チェイン継続時間(ms)
const SPEECH_LINES = [
  "よしよし！ この調子だ！", "銀河の平和は オイラたちが守るぜ！", "クリスタル、いただきっ！",
  "敵が来るぞ、気をつけろ！", "まだまだ いけるさ！", "次の星まで あと少し！",
];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

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
  SH.stageBg = new THREE.Group();
  SH.scene.add(SH.stageBg);

  // ライト
  SH.scene.add(new THREE.AmbientLight(0xaabbff, 0.7));
  const dl = new THREE.DirectionalLight(0xffffff, 1);
  dl.position.set(2, 5, 6);
  SH.scene.add(dl);

  // プレイヤー飛行船：c60「はぐれ飛行船オルカ号」
  SH.ship = createPlayerShip();
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


const ORCA_DARK = 0x172033;
const ORCA_BLACK = 0x0b1020;
const ORCA_WHITE = 0xe8eef5;
const ORCA_GRAY = 0x6f7f91;
const COCKPIT_BLUE = 0x39c8ff;
const THRUSTER_BLUE = 0x42dfff;
const WARM_LIGHT = 0xffb347;
const FLAG_RED = 0xb84a4a;
const PATCH_BRASS = 0xb98a45;

function createPlayerShip() {
  return createOrcaShip();
}

function orcaMaterial(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0.22,
    metalness: opts.metalness ?? 0.32,
    roughness: opts.roughness ?? 0.58,
    flatShading: true,
    transparent: opts.opacity != null,
    opacity: opts.opacity ?? 1,
  });
}

function placeShipPart(group, mesh, { name, position, rotation, scale } = {}) {
  if (name) mesh.name = name;
  if (position) mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  if (scale) mesh.scale.set(...scale);
  group.add(mesh);
  return mesh;
}

// c60「はぐれ飛行船オルカ号」：ローポリでかわいいシャチ型の母艦。
function createOrcaShip() {
  const g = new THREE.Group();
  const darkMat = orcaMaterial(ORCA_DARK, { emissive: ORCA_BLACK, emissiveIntensity: 0.16, metalness: 0.42 });
  const blackMat = orcaMaterial(ORCA_BLACK, { emissive: 0x050811, emissiveIntensity: 0.18, metalness: 0.38 });
  const whiteMat = orcaMaterial(ORCA_WHITE, { emissive: 0x24313c, emissiveIntensity: 0.16, metalness: 0.2 });
  const grayMat = orcaMaterial(ORCA_GRAY, { metalness: 0.55, roughness: 0.45 });
  const brassMat = orcaMaterial(PATCH_BRASS, { emissive: 0x2b1600, emissiveIntensity: 0.12, metalness: 0.5 });
  const cockpitMat = new THREE.MeshStandardMaterial({
    color: COCKPIT_BLUE,
    emissive: COCKPIT_BLUE,
    emissiveIntensity: 0.85,
    metalness: 0.15,
    roughness: 0.2,
    flatShading: true,
  });
  const lightMat = new THREE.MeshBasicMaterial({ color: WARM_LIGHT });
  const flameMat = new THREE.MeshBasicMaterial({ color: THRUSTER_BLUE, transparent: true, opacity: 0.85 });
  const flagMat = orcaMaterial(FLAG_RED, { emissive: 0x260808, emissiveIntensity: 0.2, roughness: 0.68 });

  placeShipPart(g, new THREE.Mesh(new THREE.SphereGeometry(0.52, 24, 16), darkMat), {
    name: "mainBody",
    scale: [1.24, 0.78, 0.72],
  });
  placeShipPart(g, new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 14), blackMat), {
    name: "darkTop",
    position: [0, 0.15, 0.04],
    scale: [1.18, 0.5, 0.66],
  });
  placeShipPart(g, new THREE.Mesh(new THREE.CircleGeometry(0.38, 24), whiteMat), {
    name: "whiteBelly",
    position: [0, -0.16, 0.54],
    scale: [1.42, 0.66, 1],
  });
  placeShipPart(g, new THREE.Mesh(new THREE.CircleGeometry(0.2, 18), whiteMat), {
    name: "orcaCheekLeft",
    position: [-0.28, 0.06, 0.56],
    rotation: [0, 0, -0.16],
    scale: [1.1, 0.6, 1],
  });
  placeShipPart(g, new THREE.Mesh(new THREE.CircleGeometry(0.2, 18), whiteMat), {
    name: "orcaCheekRight",
    position: [0.28, 0.06, 0.56],
    rotation: [0, 0, 0.16],
    scale: [1.1, 0.6, 1],
  });

  placeShipPart(g, new THREE.Mesh(new THREE.CircleGeometry(0.21, 24), cockpitMat), {
    name: "cockpit",
    position: [0, 0.18, 0.62],
    scale: [1.62, 0.62, 1],
  });
  [-0.18, 0.18].forEach((x, i) => {
    placeShipPart(g, new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), lightMat), {
      name: `warmCabinLight${i + 1}`,
      position: [x, -0.02, 0.66],
    });
  });

  placeShipPart(g, new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 3), blackMat), {
    name: "dorsalFin",
    position: [0, 0.53, 0.02],
    rotation: [0, 0, Math.PI],
    scale: [0.9, 1, 0.7],
  });
  placeShipPart(g, new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), blackMat), {
    name: "sideFinLeft",
    position: [-0.58, -0.05, 0.08],
    rotation: [0, 0, -0.28],
    scale: [1.55, 0.42, 0.46],
  });
  placeShipPart(g, new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), blackMat), {
    name: "sideFinRight",
    position: [0.58, -0.05, 0.08],
    rotation: [0, 0, 0.28],
    scale: [1.55, 0.42, 0.46],
  });

  const thrusters = [];
  [-0.45, 0.45].forEach((x, i) => {
    placeShipPart(g, new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.34, 12), grayMat), {
      name: i === 0 ? "engineLeft" : "engineRight",
      position: [x, -0.36, 0.18],
      rotation: [0, 0, Math.PI / 2],
      scale: [1.08, 0.9, 1],
    });
    placeShipPart(g, new THREE.Mesh(new THREE.CircleGeometry(0.12, 14), blackMat), {
      name: i === 0 ? "engineNozzleLeft" : "engineNozzleRight",
      position: [x, -0.5, 0.42],
      scale: [1.1, 0.72, 1],
    });
    const flame = placeShipPart(g, new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.42, 12), flameMat), {
      name: i === 0 ? "thrusterLeft" : "thrusterRight",
      position: [x, -0.66, 0.34],
      rotation: [0, 0, Math.PI],
      scale: [0.9, 1, 0.9],
    });
    flame.userData.baseScale = { x: 0.9, y: 1, z: 0.9 };
    thrusters.push(flame);
  });

  placeShipPart(g, new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.045, 0.035), grayMat), {
    name: "hullBelt",
    position: [0, -0.03, 0.66],
    rotation: [0, 0, 0.04],
  });
  [
    [-0.31, -0.25, 0.66, 0.18, 0.07, -0.18, "patchPartsLeft"],
    [0.26, -0.27, 0.65, 0.16, 0.06, 0.22, "patchPartsRight"],
    [0.38, 0.03, 0.63, 0.13, 0.045, -0.08, "patchPartsTop"],
  ].forEach(([x, y, z, sx, sy, rz, name]) => {
    placeShipPart(g, new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.035), brassMat), {
      name,
      position: [x, y, z],
      rotation: [0, 0, rz],
      scale: [sx, sy, 1],
    });
  });

  placeShipPart(g, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 6), grayMat), {
    name: "smallFlagPole",
    position: [0.32, 0.55, 0.12],
  });
  const flag = placeShipPart(g, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.025), flagMat), {
    name: "smallFlag",
    position: [0.43, 0.66, 0.12],
    rotation: [0, 0, -0.08],
  });

  g.userData = {
    shipName: "はぐれ飛行船オルカ号",
    role: "playerShip",
    hitR: SHIP_R,
    thrusters,
    flag,
  };
  g.scale.set(1.15, 1.15, 1.15);
  g.position.set(0, FLIGHT_SHIP_Y, FLIGHT_OBJECT_Z);
  return g;
}

function animatePlayerShip(now) {
  if (!SH.ship?.userData) return;
  const pulse = 0.92 + Math.sin(now / 115) * 0.16 + Math.sin(now / 57) * 0.06;
  (SH.ship.userData.thrusters || []).forEach((flame, i) => {
    const base = flame.userData.baseScale || { x: 1, y: 1, z: 1 };
    const sidePulse = pulse + Math.sin(now / 170 + i) * 0.05;
    flame.scale.set(base.x * (1.02 - sidePulse * 0.05), base.y * sidePulse, base.z);
    if (flame.material) flame.material.opacity = clamp(0.62 + sidePulse * 0.22, 0.55, 0.95);
  });
  if (SH.ship.userData.flag) SH.ship.userData.flag.rotation.z = -0.08 + Math.sin(now / 230) * 0.08;
}

function clearGroup(group) {
  if (!group || !group.children) return;
  while (group.children.length) group.remove(group.children[0]);
}

function themedMaterial(color, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: 0.35,
    roughness: 0.65,
    metalness: 0.25,
    flatShading: true,
  });
}

function makeThemeProp(theme, i) {
  const kind = theme.prop;
  const color = i % 3 === 0 ? theme.accent : (i % 2 === 0 ? theme.primary : theme.secondary);
  let geo;
  if (kind === "gear" || kind === "ring") geo = new THREE.TorusGeometry(0.8 + (i % 3) * 0.28, 0.08 + (i % 2) * 0.04, 8, 18);
  else if (kind === "crate" || kind === "grid") geo = new THREE.BoxGeometry(0.9 + (i % 3) * 0.25, 0.35, 0.35);
  else if (kind === "pillar" || kind === "beam") geo = new THREE.CylinderGeometry(0.18, 0.28, 1.5 + (i % 4) * 0.45, 8);
  else if (kind === "coin") geo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 20);
  else if (kind === "gem") geo = new THREE.OctahedronGeometry(0.56 + (i % 2) * 0.16, 0);
  else if (kind === "wave") geo = new THREE.TorusGeometry(0.7 + (i % 3) * 0.32, 0.05, 8, 18);
  else geo = new THREE.IcosahedronGeometry(0.55 + (i % 3) * 0.18, 0);

  const mesh = new THREE.Mesh(geo, themedMaterial(color, theme.secondary));
  mesh.position.set((Math.random() - 0.5) * 10.5, FLIGHT_SPAWN_Y + i * 1.1, -1.5 - (i % 4) * 1.1);
  mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
  mesh.userData = {
    type: "themeProp",
    drift: 0.45 + (i % 4) * 0.12,
    spin: 0.004 + (i % 5) * 0.003,
    resetY: FLIGHT_SPAWN_Y + 9 + Math.random() * 4,
  };
  return mesh;
}

function setupStageFlightBackground(star) {
  if (!SH.stageBg) return;
  const theme = star.theme || stageTheme(star.stage);
  clearGroup(SH.stageBg);
  const host = document.getElementById("shooting-canvas");
  host.style.background = stageSpaceBackground(theme, "50% 20%");
  host.style.backgroundSize = stageBackgroundSize(theme);

  const geo = new THREE.BufferGeometry();
  const N = 190 + (star.stage % 5) * 28;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i*3] = (Math.random() - 0.5) * 14;
    pos[i*3+1] = FLIGHT_DESPAWN_Y + Math.random() * (FLIGHT_SPAWN_Y - FLIGHT_DESPAWN_Y + 9);
    pos[i*3+2] = -2 - Math.random() * 18;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: theme.particle, size: 0.24, transparent: true, opacity: 0.85 }));
  points.userData = { type: "themeParticles", speed: 1.2 };
  SH.stageBg.add(points);

  const propCount = star.boss ? 18 : 8 + (star.stage % 4);
  for (let i = 0; i < propCount; i++) SH.stageBg.add(makeThemeProp(theme, i));
}

function animateStageFlightBackground(dt, now) {
  if (!SH.stageBg) return;
  SH.stageBg.children.forEach((o, i) => {
    if (o.userData?.type === "themeParticles") {
      o.position.y -= o.userData.speed * dt;
      if (o.position.y < -10) o.position.y = 0;
      return;
    }
    if (o.userData?.type === "themeProp") {
      o.position.y -= o.userData.drift * dt;
      o.rotation.x += o.userData.spin;
      o.rotation.y += o.userData.spin * 0.7;
      o.rotation.z += o.userData.spin * 1.2;
      if (o.position.y < FLIGHT_DESPAWN_Y - 1.5) {
        o.position.y = o.userData.resetY;
        o.position.x = (Math.random() - 0.5) * 10.5;
      }
    }
  });
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
  m.userData = { type: "rock", r, hitR: r * 0.52, spin: (Math.random() - 0.5) * 0.08, dmg: red ? 2 : 1 };
  SH.scene.add(m); SH.rocks.push(m);
}

// クリスタルのPNGパス（あれば板ポリゴンにテクスチャ、無ければ従来の3D結晶）
const CRYSTAL_IMG = { normal: "ui/crystal_normal", big: "ui/crystal_big", heal: "ui/crystal_heal" };
function crystalTexture(kind) {
  const path = CRYSTAL_IMG[kind] || CRYSTAL_IMG.normal;
  const img = tryImage(path);
  if (img.complete && img.naturalWidth > 0 && THREE.Texture) {
    const t = new THREE.Texture(img); t.needsUpdate = true; return t;
  }
  return null;
}

// kind: "normal"(+1〜2💎) / "big"(+8〜10💎) / "heal"(HP+1)
function spawnCrystal(kind = "normal") {
  const r = kind === "big" ? 1.3 : kind === "heal" ? 0.9 : 0.82;
  let m;
  const tex = crystalTexture(kind);
  if (tex && THREE.PlaneGeometry) {
    // PNGあり：カメラを向く板ポリゴンに貼る
    m = new THREE.Mesh(
      new THREE.PlaneGeometry(r * 2.2, r * 2.2),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
  } else if (kind === "big") {
    m = new THREE.Mesh(new THREE.OctahedronGeometry(1.35, 0),
      new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0xffae00, emissiveIntensity: 0.9, metalness: 0.6 }));
  } else if (kind === "heal") {
    m = new THREE.Mesh(new THREE.OctahedronGeometry(0.92, 0),
      new THREE.MeshStandardMaterial({ color: 0x55ff8c, emissive: 0x22dd66, emissiveIntensity: 0.9, metalness: 0.2 }));
  } else {
    m = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0),
      new THREE.MeshStandardMaterial({ color: 0x7df0ff, emissive: 0x33c8ff, emissiveIntensity: 0.85, metalness: 0.4 }));
  }
  m.position.set(spawnX(), spawnTopY(), FLIGHT_OBJECT_Z);
  m.userData = { type: "crystal", kind, r, hitR: r + 0.15 };
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
  g.userData = { type: "enemy", r: 1.05, hitR: 0.76, hp: 2 };
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
  setupStageFlightBackground(star);
  // リセット
  [...SH.bullets, ...SH.rocks, ...SH.enemies, ...SH.crystals].forEach(o => SH.scene.remove(o));
  SH.bullets = []; SH.rocks = []; SH.enemies = []; SH.crystals = [];
  const spareEnergy = consumeItem("spareEnergy");
  SH.maxHp = MAX_HP + (spareEnergy ? 1 : 0);
  SH.hp = SH.maxHp; SH.gained = 0; SH.timeLeft = STAGE_TIME;
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
  clearFlightFeedback();
  bindBomb();
  if (spareEnergy) {
    setTimeout(() => {
      spawnPopup("予備エネルギー HP+1", "#7dffa0", { type: "heal" });
      showFlightNotice("START HP+1", "heal");
      pushFlightEvent("予備エネルギー HP+1", "heal");
      pulseHud("sh-hp", "get");
    }, 250);
  }

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
  animateStageFlightBackground(dt, now);

  // 船移動（縦型：画面下で左右移動中心）
  if (SH.keyDir) SH.targetX = clamp(SH.targetX + SH.keyDir * 8.5 * dt, -FLIGHT_X_LIMIT, FLIGHT_X_LIMIT);
  SH.ship.position.x += (SH.targetX - SH.ship.position.x) * Math.min(1, dt * 13);
  SH.ship.position.y = FLIGHT_SHIP_Y + Math.sin(now / 260) * 0.045;
  SH.ship.position.z = FLIGHT_OBJECT_Z;
  SH.ship.rotation.z = (SH.targetX - SH.ship.position.x) * -0.2;
  SH.ship.rotation.x = -0.14;
  animatePlayerShip(now);

  // 僚機は自機の左右に追従
  const wob = Math.sin(now / 300) * 0.1;
  if (SH.wingL.visible) SH.wingL.position.set(SH.ship.position.x - 1.25, FLIGHT_SHIP_Y - 0.2 + wob, FLIGHT_OBJECT_Z);
  if (SH.wingR.visible) SH.wingR.position.set(SH.ship.position.x + 1.25, FLIGHT_SHIP_Y - 0.2 - wob, FLIGHT_OBJECT_Z);

  // 自動弾＋タップ/SPACEの手動弾（ロボ太がいると発射間隔が短縮）
  if (now - SH.lastShot > 520 * SH.nav.fireRateMul) { fireBullet(); SH.lastShot = now; }

  // スポーン（種類ごとに出現率。クリスタルは貴重なので控えめ）
  if (now - SH.lastSpawn > 680) {
    const r = Math.random();
    if (r < 0.34)      spawnRock(false);   // 通常隕石（多め）
    else if (r < 0.46) spawnRock(true);    // 赤い隕石
    else if (r < 0.62) spawnCrystal("normal"); // 通常クリスタル（16%）
    else if (r < 0.65) spawnCrystal("big");    // 大クリスタル（3%・かなり低確率）
    else if (r < 0.67) spawnCrystal("heal");   // 回復クリスタル（2%・さらに低確率）
    else               spawnEnemy();           // 敵（多め）
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
  // クリスタル（通常 +1〜2 / 大 +8〜10 / 回復 HP+1）
  for (let i = SH.crystals.length - 1; i >= 0; i--) {
    const o = SH.crystals[i];
    o.position.y -= speed * 0.92 * dt;
    o.rotation.y += 0.08; o.rotation.z += 0.035;
    if (hitShip(o)) { collectCrystal(o.userData.kind, o.position); SH.scene.remove(o); SH.crystals.splice(i, 1); continue; }
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
          // 撃破ボーナスは小さく。航行効果があると +1 ずつ上乗せ
          const killAmt = 1 + SH.nav.killBonus;
          SH.gained += killAmt; SH.kills++; bumpMission("kill");
          addScore(300); bumpChain(performance.now());
          flashScreen("#ffd070");
          spawnPopup(`撃破 +${killAmt}💎`, "#ffcf66", { at: e.position, type: "kill" });
          showFlightNotice(`ENEMY DOWN +${killAmt}💎`, "kill");
          pushFlightEvent(`敵撃破 +${killAmt}💎`, "kill");
          pulseHud("sh-crystals", "get");
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
  showFlightNotice("BOMB CLEAR", "kill");
  pushFlightEvent("ボムで画面一掃", "kill");
  if (navigator.vibrate) navigator.vibrate(120);
  updateArcadeHUD();
}

function hitShip(o) {
  return o.position.distanceTo(SH.ship.position) < ((o.userData.hitR ?? o.userData.r) + SHIP_R);
}
function damageShip(amount = 1, isRock = false) {
  // 被弾無敵時間中は無効
  if (performance.now() < SH.invulnUntil) return;
  // おばけ：隕石ダメージを低確率で無効化
  if (isRock && SH.nav.rockGuardChance > 0 && Math.random() < SH.nav.rockGuardChance) {
    flashScreen("#9cf");
    spawnPopup("GUARD", "#9cf", { type: "guard" });
    showFlightNotice("GUARD", "guard");
    pushFlightEvent("隕石ダメージ無効", "guard");
    return;
  }
  // タコすけ：開始時バリアで1回ぶん肩代わり
  if (SH.shieldLeft > 0) {
    SH.shieldLeft--;
    flashScreen("#9cf");
    spawnPopup("BARRIER", "#9cf", { type: "guard" });
    showFlightNotice("BARRIER", "guard");
    pushFlightEvent("バリアで被弾を防いだ", "guard");
    SH.invulnUntil = performance.now() + INVULN_MS;
    updateShootingHUD();
    pulseHud("sh-hp", "get");
    return;
  }
  SH.hp = Math.max(0, SH.hp - amount);
  SH.score = Math.max(0, SH.score - amount * 120);
  SH.dmgTaken += amount;
  SH.chain = 0; // 被弾でチェイン途切れ
  SH.invulnUntil = performance.now() + INVULN_MS; // 0.8秒の無敵
  spawnPopup(`DAMAGE -${amount}HP`, "#ff6677", { type: "damage" });
  showFlightNotice(`DAMAGE -${amount}HP`, "damage");
  pushFlightEvent(`被弾 -${amount}HP`, "damage");
  pulseHud("sh-hp", "damage");
  showHitRing();
  shakeShootingScreen();
  // ノーダメージ系ミッションは被弾で失敗
  if (SH.mission && SH.mission.type === "nohit" && !SH.missionDone) SH.missionFailed = true;
  flashScreen("#f55");
  if (navigator.vibrate) navigator.vibrate(60);
  updateShootingHUD();
  updateMissionHUD();
}

let flightNoticeTimer = null;

function worldToHudPoint(pos) {
  const host = document.getElementById("shooting-canvas");
  if (!host || !pos) return null;
  const w = host.clientWidth || 1;
  const h = host.clientHeight || 1;
  const x = ((pos.x + FLIGHT_X_LIMIT) / (FLIGHT_X_LIMIT * 2)) * w;
  const y = (1 - (pos.y - FLIGHT_DESPAWN_Y) / (FLIGHT_SPAWN_Y - FLIGHT_DESPAWN_Y)) * h;
  return { x: clamp(x, 24, w - 24), y: clamp(y, 56, h - 80) };
}

function showFlightNotice(text, type = "get") {
  const el = document.getElementById("sh-center-notice");
  if (!el) return;
  clearTimeout(flightNoticeTimer);
  el.textContent = text;
  el.className = `sh-center-notice ${type}`;
  void el.offsetWidth;
  el.classList.add("show");
  flightNoticeTimer = setTimeout(() => el.classList.remove("show"), 850);
}

function pushFlightEvent(text, type = "get") {
  const feed = document.getElementById("sh-event-feed");
  if (!feed) return;
  const row = document.createElement("div");
  row.className = `sh-feed-row ${type}`;
  row.textContent = text;
  feed.prepend(row);
  while (feed.childElementCount > 5) feed.removeChild(feed.lastChild);
  setTimeout(() => row.remove(), 3200);
}

function pulseHud(id, type = "get") {
  const el = document.getElementById(id);
  if (!el) return;
  const cls = type === "damage" ? "hud-pulse-damage" : "hud-pulse-get";
  el.classList.remove("hud-pulse-get", "hud-pulse-damage");
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 260);
}

function clearFlightFeedback() {
  document.getElementById("sh-event-feed")?.replaceChildren();
  const notice = document.getElementById("sh-center-notice");
  if (notice) {
    notice.textContent = "";
    notice.className = "sh-center-notice";
  }
}

// 取得/被弾ポップ（イベント位置または飛行船付近に浮かぶ）
function spawnPopup(text, color, opts = {}) {
  const host = document.getElementById("shooting-canvas");
  if (!host) return;
  const el = document.createElement("div");
  el.className = `sh-popup ${opts.type || ""}`;
  el.textContent = text;
  el.style.color = color;
  const p = worldToHudPoint(opts.at);
  if (p) {
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
  } else {
    el.classList.add("screen-pop");
    el.style.left = (45 + Math.random() * 10) + "%";
    el.style.bottom = (24 + Math.random() * 8) + "%";
  }
  host.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}
// 当たり判定が分かる円形エフェクト
function showHitRing() {
  const host = document.getElementById("shooting-canvas");
  if (!host) return;
  const r = document.createElement("div");
  r.className = "sh-hitring";
  host.appendChild(r);
  setTimeout(() => r.remove(), 500);
}

function shakeShootingScreen() {
  const screen = document.getElementById("screen-shooting");
  if (!screen) return;
  screen.classList.remove("sh-damage-shake");
  void screen.offsetWidth;
  screen.classList.add("sh-damage-shake");
  setTimeout(() => screen.classList.remove("sh-damage-shake"), 260);
}

// クリスタル取得（種類ごとに効果。航行ボーナスで獲得量を少し底上げ）
function collectCrystal(kind, origin = null) {
  const mul = SH.nav.crystalMul;
  const now = performance.now();
  if (kind === "big") {
    const amt = Math.round((randInt(CRYSTAL_BIG_MIN, CRYSTAL_BIG_MAX) + SH.nav.bigBonus) * mul); SH.gained += amt; SH.bigPicked++;
    bumpMission("big"); bumpMission("crystal");
    addScore(500); bumpChain(now);
    spawnPopup(`BIG +${amt}💎`, "#ffd35a", { at: origin, type: "big" });
    showFlightNotice(`BIG CRYSTAL +${amt}💎`, "big");
    pushFlightEvent(`大クリスタル +${amt}💎`, "big");
    pulseHud("sh-crystals", "get");
  } else if (kind === "heal") {
    if (SH.hp < SH.maxHp) {
      SH.hp++;
      flashScreen("#6f9");
      spawnPopup("RECOVER HP+1", "#7dffa0", { at: origin, type: "heal" });
      showFlightNotice("RECOVER HP+1", "heal");
      pushFlightEvent("回復クリスタル HP+1", "heal");
      pulseHud("sh-hp", "get");
    } else {
      spawnPopup("HP FULL", "#7dffa0", { at: origin, type: "heal" });
      showFlightNotice("HP FULL", "heal");
      pushFlightEvent("回復クリスタル HP満タン", "heal");
    }
    addScore(50); bumpChain(now);
  } else {
    const amt = Math.max(1, Math.round(randInt(CRYSTAL_NORMAL_MIN, CRYSTAL_NORMAL_MAX) * mul)); SH.gained += amt; bumpMission("crystal");
    addScore(100); bumpChain(now);
    spawnPopup(`+${amt}💎`, "#8fe8ff", { at: origin, type: "get" });
    showFlightNotice(`CRYSTAL +${amt}💎`, "get");
    pushFlightEvent(`クリスタル +${amt}💎`, "get");
    pulseHud("sh-crystals", "get");
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
        <div class="sh-pm-face">${faceHTML(a.face, allyImagePath(a))}</div>
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
  document.getElementById("sh-speech-face").innerHTML = leader ? faceHTML(leader.face, allyImagePath(leader)) : "🐶";
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
  SH.crystals.forEach(o => {
    const color = o.userData.kind === "big" ? "#ffd35a" : (o.userData.kind === "heal" ? "#66ff99" : "#66e8ff");
    dot(o.position.x, o.position.y, color, o.userData.kind === "big" ? 4 : 3);
  });
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
  if (stageBonus && stageBonus.type === "crystal") reward += boosted ? 15 : 10;
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
  if (s.stage === 1) playPinoScene(s, PINO_PRE_BATTLE_LINES);
  else if (s.boss) playPinoScene(s, PINO_BOSS_LINES);   // ラスボス前のピノの口上
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
// ラスボス前のピノの口上（必要人数を集めて到達したとき）
const PINO_BOSS_LINES = [
  "みんな、そろいました",
  "弱くても、迷っても、ここまで来ました",
  `${FINAL_BOSS_UNLOCK_COUNT}人のはぐれ者の声が、オルカ号を動かしています`,
  "行きましょう。運命を、固定させないために",
];
let pinoSceneStar = null;
let pinoLineIndex = 0;
let pinoLines = PINO_PRE_BATTLE_LINES;

function playPinoScene(star, lines) {
  pinoSceneStar = star;
  pinoLines = lines || PINO_PRE_BATTLE_LINES;
  pinoLineIndex = 0;
  show("pino");
  const face = document.getElementById("pino-face");
  if (face) face.innerHTML = faceHTML("🤖", "characters/c1");
  renderPinoLine();
}

function renderPinoLine() {
  const el = document.getElementById("pino-line");
  el.textContent = pinoLines[pinoLineIndex] || "";
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  document.querySelector('[data-action="pino-next"]').textContent =
    pinoLineIndex >= pinoLines.length - 1 ? "戦闘へ" : "次へ";
  renderPinoBrief();
  renderPinoProgress();
}

function renderPinoBrief() {
  const el = document.getElementById("pino-brief");
  if (!el || !pinoSceneStar) return;
  const enemy = ENEMIES[pinoSceneStar.enemy];
  const danger = "★".repeat(pinoSceneStar.danger || 1) + "☆".repeat(5 - (pinoSceneStar.danger || 1));
  el.innerHTML = `
    <div><span>目的地</span><b>${pinoSceneStar.name}</b></div>
    <div><span>敵影</span><b>${enemy?.name || "不明"}</b></div>
    <div><span>危険度</span><b class="pino-danger">${danger}</b></div>
  `;
}

function renderPinoProgress() {
  const el = document.getElementById("pino-progress");
  if (!el) return;
  el.innerHTML = pinoLines.map((_, i) =>
    `<span class="${i === pinoLineIndex ? "active" : ""}"></span>`
  ).join("");
}

function advancePinoScene() {
  if (pinoLineIndex >= pinoLines.length - 1) return finishPinoScene();
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
const BT = {
  enemy: null, enemyHp: 0, enemyMaxHp: 0, party: [],
  turnLock: false, won: false,
  enemyUltimateShown: false,
  enemyAtkMul: 1, enemyDebuffTurns: 0, guardTurns: 0, barrier: 0, nextAttackMul: 1,
  synergy: null,
  actorIndex: 0,
};

// ラスボス最終演出フラグ（Part2の土台）
let isFinalBossBattle = false;
let finalPhase = false;

function startBattle(star) {
  show("battle");
  const def = ENEMIES[star.enemy];
  BT.enemy = def;
  isFinalBossBattle = !!def.boss;   // ステージ20のボス＝ラスボス
  finalPhase = false;
  const boosted = stageBonus && stageBonus.boosted;
  // 航行ボーナス：敵HP -10%（強化時 -15%）
  const enemyHpDown = stageBonus && stageBonus.type === "enemyHp";
  BT.enemyMaxHp = enemyHpDown ? Math.round(def.hp * (boosted ? 0.85 : 0.9)) : def.hp;
  BT.enemyHp = BT.enemyMaxHp;
  BT.won = false;
  BT.turnLock = false;
  BT.enemyUltimateShown = false;
  BT.enemyAtkMul = 1;
  BT.enemyDebuffTurns = 0;
  BT.guardTurns = 0;
  BT.synergy = computeSynergies(save.party);
  BT.barrier = BT.synergy.effects.battleBarrier;
  BT.nextAttackMul = 1;
  // 航行ボーナス：味方HP +1（強化時 +2）
  const allyHpUp = stageBonus && stageBonus.type === "allyHp";
  const hpPlus = allyHpUp ? (boosted ? 2 : 1) : 0;
  BT.party = save.party.slice(0, 4).map(id => {
    const a = ALLIES.find(x => x.id === id);
    return buildBattleMember(a, hpPlus, BT.synergy);
  });
  BT.actorIndex = firstAliveActorIndex();
  recordPartyVisit(star);
  persist();

  // 敵描画＋系統・ギミック・ボス表示
  document.getElementById("enemy-name").textContent = def.name;
  const enemyImage = def.image || (def.boss ? "enemies/final_boss" : `enemies/${def.img}`);
  document.getElementById("enemy-sprite").innerHTML = faceHTML(def.face, enemyImage);
  const catEl = document.getElementById("enemy-cat");
  catEl.textContent = def.cat;
  catEl.className = "enemy-cat cat-" + (def.catKey || "");
  document.getElementById("enemy-gimmick").textContent = `⚠ ${def.gimmick}`;
  const elemEl = document.getElementById("enemy-elem");
  if (elemEl) {
    const ultimateHtml = def.ultimate ? `　<span class="ew-ultimate">必殺：${def.ultimate.name}</span>` : "";
    elemEl.innerHTML = `<span class="ew-lv">Lv.${def.level}</span>　<span class="ew-weak">弱点：${def.weak}</span>　<span class="ew-resist">耐性：${def.resist}</span>${ultimateHtml}`;
  }
  const badge = document.getElementById("enemy-badge");
  badge.textContent = def.boss ? "★ B O S S ★" : "";
  const battleEnemyEl = document.getElementById("battle-enemy");
  battleEnemyEl.classList.toggle("is-boss", !!def.boss);
  battleEnemyEl.classList.toggle("has-enemy-image", !!def.image);
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
  if (BT.synergy.active.length) {
    log(`✦ シナジー：${BT.synergy.active.map(s => s.name).join(" / ")}`);
  }
  renderBattleCommands("main");
  setCommands(true);

  // Three.js 宇宙風の戦闘背景
  initBattleScene();
  updateBattleSceneEnemy(def);
  startBattleScene();
}

function buildBattleMember(a, hpPlus = 0, synergy = computeSynergies(save.party)) {
  const passive = a.passive || {};
  const lowRare = a.rarity <= LOW_RARITY_MAX || (a.tags || []).includes("低レア");
  const maxHp = Math.round((a.hp + (passive.hp || 0) + hpPlus) * (lowRare ? synergy.effects.lowRarityHpMul : 1));
  return {
    ...a,
    atk: a.atk + (passive.atk || 0),
    def: Math.round((a.def + (passive.def || 0)) * synergy.effects.defMul),
    spd: a.spd + (passive.spd || 0),
    critRate: passive.crit || 0,
    curHp: maxHp,
    maxHp,
    dead: false,
    skillUsed: false,
  };
}

function firstAliveActorIndex() {
  return Math.max(0, BT.party.findIndex(m => !m.dead));
}

function currentBattleActor() {
  return BT.party[BT.actorIndex] && !BT.party[BT.actorIndex].dead ? BT.party[BT.actorIndex] : null;
}

function resetBattleActor() {
  BT.actorIndex = firstAliveActorIndex();
}

function advanceBattleActor() {
  for (let i = BT.actorIndex + 1; i < BT.party.length; i++) {
    if (!BT.party[i].dead) {
      BT.actorIndex = i;
      return true;
    }
  }
  return false;
}

function renderParty() {
  const area = document.getElementById("party-area");
  area.innerHTML = "";
  BT.party.forEach((m, i) => {
    const el = document.createElement("div");
    el.className = "party-member" + (m.dead ? " dead" : "") + (i === BT.actorIndex && !m.dead ? " active" : "");
    el.id = `pm-${i}`;
    el.innerHTML = `
      <div class="pm-face">${faceHTML(m.face, allyImagePath(m))}</div>
      <div class="pm-name">${m.name}</div>
      <div class="pm-hp">${m.curHp}/${m.maxHp}</div>
      <div class="pm-meta">Lv.${m.level} / ★${m.rarity}</div>
      <div class="pm-skill">技${(m.skills || []).length}・${(m.skills || []).map(k => SKILLS[k]?.name).filter(Boolean).join("/")}</div>
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
  document.querySelectorAll("#battle-commands .cmd").forEach(b => {
    b.disabled = !on || b.dataset.locked === "true";
  });
}
function battleItemTotal() {
  return ["smallHeal", "allHeal", "barrierOrb"].reduce((sum, id) => sum + itemCount(id), 0);
}
function skillReadyCount() {
  return BT.party.filter(m => !m.dead && !m.skillUsed).length;
}
function renderBattleCommands(mode = "main", arg = null) {
  const area = document.getElementById("battle-commands");
  area.classList.toggle("item-mode", mode !== "main");
  const actor = currentBattleActor();
  if (mode === "items") {
    area.innerHTML = ["smallHeal", "allHeal", "barrierOrb"].map(id => {
      const item = ITEM_DEFS[id];
      const count = itemCount(id);
      return `<button class="btn cmd battle-item-btn" data-item="${id}" data-locked="${count > 0 ? "false" : "true"}" ${count > 0 ? "" : "disabled"}>${item.icon} ${item.name}<small>×${count}</small></button>`;
    }).join("") + `<button class="btn cmd battle-back" data-cmd="items-back">戻る</button>`;
    return;
  }
  // スキル：まず使うキャラを選ぶ
  if (mode === "skillMembers") {
    const buttons = BT.party.map((m, i) => ({ m, i })).filter(o => !o.m.dead).map(({ m, i }) =>
      `<button class="btn cmd skill-member-btn" data-cmd="skill-pick" data-mi="${i}">${m.face} ${m.name}<small>★${m.rarity}</small></button>`
    ).join("");
    area.innerHTML = buttons + `<button class="btn cmd battle-back" data-cmd="skill-back">戻る</button>`;
    return;
  }
  // 選んだキャラのスキル一覧から選ぶ
  if (mode === "skillList") {
    const m = BT.party[arg ?? BT.actorIndex];
    if (!m || m.dead) { renderBattleCommands("main"); return; }
    const list = (m.skills || [m.skillKey]).map(k => {
      const s = SKILLS[k]; if (!s) return "";
      return `<button class="btn cmd skill-use-btn" data-cmd="skill-use" data-mi="${BT.party.indexOf(m)}" data-sk="${k}">${s.name}<small>${s.element || s.desc}</small></button>`;
    }).join("");
    area.innerHTML = `<div class="skill-owner">${faceHTML(m.face, allyImagePath(m))} ${m.name}のスキル</div>` + list + `<button class="btn cmd battle-back" data-cmd="skill-back">戻る</button>`;
    return;
  }
  // メイン
  const canSkill = !!actor && (actor.skills || []).length;
  const actorTitle = actor ? `${faceHTML(actor.face, allyImagePath(actor))} ${actor.name}の行動` : "行動できる仲間がいない";
  area.innerHTML = `
    <div class="turn-owner">${actorTitle}</div>
    <button class="btn cmd" data-cmd="fight" ${actor ? "" : "disabled"}>たたかう<small>通常攻撃</small></button>
    <button class="btn cmd" data-cmd="skill" data-locked="${canSkill ? "false" : "true"}" ${canSkill ? "" : "disabled"}>スキル<small>2つから選択</small></button>
    <button class="btn cmd" data-cmd="item" ${actor ? "" : "disabled"}>どうぐ <small>${battleItemTotal()}</small></button>
    <button class="btn cmd" data-cmd="run">にげる<small>70%</small></button>
  `;
}
function setEnemyHpBar() {
  const hp = Math.max(0, BT.enemyHp);
  const maxHp = BT.enemyMaxHp || BT.enemy.hp;
  document.getElementById("enemy-hp-fill").style.width = `${hp / maxHp * 100}%`;
  const txt = document.getElementById("enemy-hp-text");
  if (txt) txt.textContent = `HP ${hp} / ${maxHp}`;
}

document.getElementById("battle-commands").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cmd], [data-item]");
  if (!btn || BT.turnLock) return;
  if (btn.dataset.item) return useBattleItem(btn.dataset.item);
  const cmd = btn.dataset.cmd;
  if (cmd === "skill-pick") return renderBattleCommands("skillList", Number(btn.dataset.mi));
  if (cmd === "skill-use") return doMemberSkill(Number(btn.dataset.mi), btn.dataset.sk);
  if (!cmd) return;
  handleCommand(cmd);
});

async function handleCommand(cmd) {
  if (cmd === "fight") return doFight();
  if (cmd === "skill") return renderBattleCommands("skillList", BT.actorIndex);
  if (cmd === "skill-back") return renderBattleCommands("main");
  if (cmd === "skill-members") return renderBattleCommands("skillMembers");
  if (cmd === "item") return doItem();
  if (cmd === "items-back") return renderBattleCommands("main");
  if (cmd === "run") return doRun();
}

// 選んだキャラが、選んだスキルを使う → 敵ターン
async function doMemberSkill(mi, skillKey) {
  const m = BT.party[mi ?? BT.actorIndex];
  if (!m || m.dead) { renderBattleCommands("main"); return; }
  const skill = SKILLS[skillKey] || m.bskill;
  BT.turnLock = true;
  renderBattleCommands("main"); setCommands(false);
  await useMemberSkill(m, skill);
  renderParty();
  if (BT.enemyHp <= 0) return enemyDefeated();
  maybeShowBossUltimateCue();
  await finishActorAction();
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));
function enemySprite() { return document.getElementById("battle-enemy"); }

async function playBattleAction(m, message, type = "attack") {
  const stage = document.getElementById("battle-action-stage");
  if (!stage || !m) return;
  clearTimeout(stage._timer);
  stage.className = `battle-action-stage show ${type}`;
  stage.innerHTML = `
    <div class="battle-action-card">
      <div class="battle-action-face">${faceHTML(m.face, allyImagePath(m))}</div>
      <div class="battle-action-text">${escAttr(message)}</div>
    </div>
  `;
  stage._timer = setTimeout(() => {
    stage.className = "battle-action-stage";
    stage.innerHTML = "";
  }, type === "skill" ? 820 : 640);
  await wait(type === "skill" ? 300 : 220);
}

async function doFight() {
  const m = currentBattleActor();
  if (!m) return;
  BT.turnLock = true;
  setCommands(false);
  const normalMul = ((BT.synergy && BT.synergy.effects.normalAtkMul) || 1);
  const { dmg, crit, buffed } = rollMemberDamage(m, normalMul);
  await applyEnemyDamage(m, dmg, "こうげき", crit, buffed);
  if (BT.enemyHp <= 0) return enemyDefeated();
  await finishActorAction();
}

async function finishActorAction() {
  renderParty();
  if (advanceBattleActor()) {
    BT.turnLock = false;
    renderParty();
    renderBattleCommands("main");
    setCommands(true);
    return;
  }
  await enemyTurn();
}

async function doSkill() {
  const actors = BT.party.filter(m => !m.dead && !m.skillUsed);
  if (actors.length === 0) { toast("使えるスキルがない"); return; }
  BT.turnLock = true; setCommands(false);
  for (const m of actors) {
    m.skillUsed = true;
    await useMemberSkill(m);
    renderParty();
    if (BT.enemyHp <= 0) return enemyDefeated();
  }
  maybeShowBossUltimateCue();
  await enemyTurn();
}

function rollMemberDamage(m, multiplier = 1) {
  const buff = BT.nextAttackMul || 1;
  BT.nextAttackMul = 1;
  let dmg = Math.max(1, Math.round((m.atk + randInt(-2, 3)) * multiplier * buff));
  const crit = Math.random() < (m.critRate || 0);
  if (crit) dmg = Math.round(dmg * 1.6);
  return { dmg, crit, buffed: buff > 1 };
}

// 属性相性：弱点×1.5 / 耐性×0.6
function elementResult(element) {
  if (!element || !BT.enemy) return { mult: 1, tag: "" };
  if (element === BT.enemy.weak) return { mult: 1.5, tag: " 弱点！" };
  if (element === BT.enemy.resist) return { mult: 0.6, tag: " 耐性…" };
  return { mult: 1, tag: "" };
}

function maybeShowBossUltimateCue() {
  const ultimate = BT.enemy?.ultimate;
  if (!ultimate || BT.enemyUltimateShown || BT.enemyHp <= 0) return;
  const maxHp = BT.enemyMaxHp || BT.enemy.hp || 1;
  if (BT.enemyHp > maxHp * 0.5) return;
  BT.enemyUltimateShown = true;
  log(`${BT.enemy.name}の必殺技！`);
  log(`${ultimate.name}！！`);
}

async function applyEnemyDamage(m, dmg, label, crit = false, buffed = false, element = "物理", showAction = true) {
  if (showAction) await playBattleAction(m, `${m.name}の攻撃！`, "attack");
  const { mult, tag } = elementResult(element);
  dmg = Math.max(1, Math.round(dmg * mult));
  BT.enemyHp -= dmg;
  log(`${m.name}の ${label}！ ${dmg} のダメージ${crit ? "（会心）" : ""}${buffed ? "（エール）" : ""}${tag}`);
  enemySprite().classList.add("hit");
  playBattleHitEffect();
  setEnemyHpBar();
  await wait(BATTLE_HIT_WAIT_MS);
  enemySprite().classList.remove("hit");
}

async function useMemberSkill(m, skill = m.bskill || SKILLS.slash) {
  log(`✦ ${m.name}のスキル「${skill.name}」を発動！`);
  await playBattleAction(m, `${m.name}のスキル「${skill.name}」を発動！`, "skill");
  playBattleSkillEffect();
  await wait(80);
  if (skill.kind === "heal") {
    const target = BT.party.filter(x => !x.dead).sort((a, b) => (a.curHp / a.maxHp) - (b.curHp / b.maxHp))[0];
    if (!target) return;
    const amount = skill.power + Math.round(m.rarity * 2);
    target.curHp = Math.min(target.maxHp, target.curHp + amount);
    log(`${target.name}を ${amount} 回復`);
    return wait(BATTLE_HIT_WAIT_MS);
  }
  if (skill.kind === "defUp") {
    BT.guardTurns = Math.max(BT.guardTurns, 2);
    log(`味方全員の防御が上がった（2ターン）`);
    return wait(BATTLE_HIT_WAIT_MS);
  }
  if (skill.kind === "enemyAtkDown") {
    BT.enemyAtkMul = Math.min(BT.enemyAtkMul, skill.power);
    BT.enemyDebuffTurns = Math.max(BT.enemyDebuffTurns, 3);
    log(`${BT.enemy.name}の攻撃力が下がった`);
    return wait(BATTLE_HIT_WAIT_MS);
  }
  if (skill.kind === "buffNext") {
    BT.nextAttackMul = Math.max(BT.nextAttackMul, skill.power);
    log(`次の攻撃が強くなる`);
    return wait(BATTLE_HIT_WAIT_MS);
  }
  if (skill.kind === "bigRandom") {
    if (Math.random() < 0.35) {
      const { dmg } = rollMemberDamage(m, skill.power);
      return applyEnemyDamage(m, dmg, skill.name, true, false, skill.element, false);
    }
    const { dmg } = rollMemberDamage(m, 0.35);
    return applyEnemyDamage(m, dmg, `${skill.name}（失敗）`, false, false, skill.element, false);
  }
  const mult = skill.kind === "crit" ? skill.power : (skill.kind === "atkAll" ? skill.power * 1.15 : skill.power);
  const { dmg, crit, buffed } = rollMemberDamage(m, mult);
  return applyEnemyDamage(m, dmg, skill.name, skill.kind === "crit" || crit, buffed, skill.element, false);
}

// 仲間が順番に攻撃
async function attackRound(multiplier, label) {
  BT.turnLock = true; setCommands(false);
  const normalMul = multiplier * ((BT.synergy && BT.synergy.effects.normalAtkMul) || 1);
  for (const m of BT.party) {
    if (m.dead) continue;
    const { dmg, crit, buffed } = rollMemberDamage(m, normalMul);
    await applyEnemyDamage(m, dmg, label, crit, buffed);
    if (BT.enemyHp <= 0) { return enemyDefeated(); }
  }
  maybeShowBossUltimateCue();
  await enemyTurn();
}

async function enemyTurn() {
  const alive = BT.party.filter(m => !m.dead);
  if (alive.length === 0) return; // 念のため
  const target = alive[Math.floor(Math.random() * alive.length)];
  if (BT.synergy && Math.random() < BT.synergy.effects.evasion) {
    log(`${target.name}は シナジーで回避！`);
    renderParty();
    await wait(BATTLE_TURN_WAIT_MS);
    tickBattleEffects();
    applyTurnSynergyHeal();
    resetBattleActor();
    renderParty();
    BT.turnLock = false; renderBattleCommands("main"); setCommands(true);
    return;
  }
  const raw = Math.max(1, Math.round((BT.enemy.atk + randInt(-2, 2)) * BT.enemyAtkMul));
  const mitigation = Math.floor((target.def || 0) / 3) + (BT.guardTurns > 0 ? 3 : 0);
  let dmg = Math.max(0, raw - mitigation);
  if (BT.barrier > 0) {
    BT.barrier--;
    dmg = Math.max(0, dmg - 1);
    log("バリアオーブが ダメージを軽減！");
  }
  target.curHp = Math.max(0, target.curHp - dmg);
  log(`${BT.enemy.name}の こうげき！ ${target.name}に ${dmg} のダメージ`);
  if (target.curHp <= 0) { target.dead = true; log(`${target.name}は たおれた…`); }
  renderParty();
  await wait(BATTLE_TURN_WAIT_MS);
  tickBattleEffects();
  applyTurnSynergyHeal();
  if (BT.party.every(m => m.dead)) return partyWipe();
  resetBattleActor();
  renderParty();
  BT.turnLock = false; renderBattleCommands("main"); setCommands(true);
}

function applyTurnSynergyHeal() {
  const amount = BT.synergy?.effects.turnHeal || 0;
  if (!amount) return;
  const target = BT.party
    .filter(m => !m.dead && m.curHp < m.maxHp)
    .sort((a, b) => (a.curHp / a.maxHp) - (b.curHp / b.maxHp))[0];
  if (!target) return;
  target.curHp = Math.min(target.maxHp, target.curHp + amount);
  log(`回復シナジー：${target.name} +${amount}`);
}

function applyPostBattleSynergyHeal() {
  const amount = BT.synergy?.effects.postBattleHeal || 0;
  if (!amount) return;
  let healed = 0;
  BT.party.forEach(m => {
    if (m.dead || m.curHp >= m.maxHp) return;
    m.curHp = Math.min(m.maxHp, m.curHp + amount);
    healed++;
  });
  if (healed) {
    renderParty();
    log(`星霊シナジー：味方${healed}人を少し回復`);
  }
}

function tickBattleEffects() {
  if (BT.guardTurns > 0) BT.guardTurns--;
  if (BT.enemyDebuffTurns > 0) {
    BT.enemyDebuffTurns--;
    if (BT.enemyDebuffTurns <= 0) {
      BT.enemyAtkMul = 1;
      log(`${BT.enemy.name}の弱体が切れた`);
    }
  }
}

function doItem() {
  renderBattleCommands("items");
}

async function useBattleItem(id) {
  const item = ITEM_DEFS[id];
  if (!item || item.use !== "battle") return;
  if (itemCount(id) <= 0) { toast("そのアイテムを持っていない"); return; }
  const alive = BT.party.filter(m => !m.dead);
  if (id === "smallHeal") {
    const target = alive.filter(m => m.curHp < m.maxHp).sort((a, b) => (a.curHp / a.maxHp) - (b.curHp / b.maxHp))[0];
    if (!target) { toast("回復する相手がいない"); return; }
    consumeItem(id);
    BT.turnLock = true; renderBattleCommands("main"); setCommands(false);
    target.curHp = Math.min(target.maxHp, target.curHp + 20);
    log(`どうぐ「${item.name}」！ ${target.name}を20回復`);
  } else if (id === "allHeal") {
    if (!alive.some(m => m.curHp < m.maxHp)) { toast("回復する相手がいない"); return; }
    consumeItem(id);
    BT.turnLock = true; renderBattleCommands("main"); setCommands(false);
    alive.forEach(m => { m.curHp = Math.min(m.maxHp, m.curHp + 10); });
    log(`どうぐ「${item.name}」！ 全員10回復`);
  } else if (id === "barrierOrb") {
    consumeItem(id);
    BT.turnLock = true; renderBattleCommands("main"); setCommands(false);
    BT.barrier++;
    log(`どうぐ「${item.name}」！ 次の被ダメージを1軽減`);
  }
  renderParty();
  await wait(BATTLE_TURN_WAIT_MS);
  await finishActorAction();
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

function recordPartyVisit(star = currentStar) {
  const label = starRecordLabel(star);
  save.party.slice(0, 4).forEach(id => {
    const stat = dexStat(id);
    if (label) stat.lastPartyStar = label;
  });
}

function recordClearMembers(star = currentStar) {
  const label = starRecordLabel(star);
  save.party.slice(0, 4).forEach(id => {
    const stat = dexStat(id);
    stat.clearMemberCount++;
    if (label) stat.lastPartyStar = label;
  });
}

function enemyDefeated() {
  setEnemyHpBar();
  // ラスボス戦：通常勝利ではなく「最終フェーズ」へ（仮）
  if (isFinalBossBattle) {
    log(`${BT.enemy.name}を たおした……かに見えた`);
    BT.turnLock = true; setCommands(false);
    setTimeout(() => enterFinalPhase(), 900);
    return;
  }
  log(`${BT.enemy.name}を たおした！`);
  BT.won = true;
  recordClearMembers(currentStar);
  applyPostBattleSynergyHeal();
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
// Three.js 宇宙風の戦闘背景（軽量：星粒子＋星雲＋敵オーラ）
// レンダラは1つだけ生成して再利用、戦闘以外ではループ自動停止
// -------------------------------------------------------------
const BS = { renderer: null, scene: null, camera: null, raf: null, stars: null, neb: [], aura: null, t: 0, w: 0, h: 0 };

function makeNebulaTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.4)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function initBattleScene() {
  if (BS.renderer) return;                 // 再利用（WebGLコンテキストを増やさない）
  const host = document.getElementById("battle-canvas");
  if (!host || typeof THREE === "undefined") return;
  BS.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  BS.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  BS.w = host.clientWidth || 360; BS.h = host.clientHeight || 640;
  BS.renderer.setSize(BS.w, BS.h, false);
  host.appendChild(BS.renderer.domElement);
  BS.scene = new THREE.Scene();
  BS.camera = new THREE.PerspectiveCamera(60, BS.w / BS.h, 0.1, 200);
  BS.camera.position.set(0, 0, 18);

  // 星粒子
  const geo = new THREE.BufferGeometry();
  const N = 500, p = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { p[i*3] = (Math.random()-0.5)*70; p[i*3+1] = (Math.random()-0.5)*70; p[i*3+2] = -Math.random()*60; }
  geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  BS.stars = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xbcd4ff, size: 0.18, transparent: true, opacity: 0.9 }));
  BS.scene.add(BS.stars);

  // ゆっくり動く星雲風グラデ（加算ブレンドの大きな半透明プレーン）
  const tex = makeNebulaTexture();
  [[-7, 3, -22, 0x5a3aa0], [8, -2, -26, 0x2a5aa0], [0, 7, -30, 0x803060]].forEach(([x, y, z, c]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(34, 34),
      new THREE.MeshBasicMaterial({ map: tex, color: c, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(x, y, z); BS.scene.add(m); BS.neb.push(m);
  });

  // 敵オーラ（中央上、敵の背後）
  BS.aura = new THREE.Mesh(new THREE.PlaneGeometry(9, 9),
    new THREE.MeshBasicMaterial({ map: tex, color: 0xff66cc, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  BS.aura.position.set(0, 3.5, -6); BS.scene.add(BS.aura);
}

// 敵に合わせてオーラ色／大きさを更新
function updateBattleSceneEnemy(enemy) {
  if (!BS.aura) return;
  const byCat = { bio: 0x66ff99, robo: 0x66ccff, villain: 0xff8a4a, concept: 0xc266ff };
  BS.aura.material.color.setHex((enemy && byCat[enemy.catKey]) || 0xff66cc);
  BS.auraBase = enemy && enemy.boss ? 2.35 : 1.15;
  BS.aura.scale.setScalar(BS.auraBase);
}

function renderBattleScene() {
  if (currentScreen !== "battle") { BS.raf = null; return; } // 戦闘以外では自動停止
  const host = document.getElementById("battle-canvas");
  if (host && (host.clientWidth !== BS.w || host.clientHeight !== BS.h) && host.clientWidth) {
    BS.w = host.clientWidth; BS.h = host.clientHeight;
    BS.renderer.setSize(BS.w, BS.h, false);
    BS.camera.aspect = BS.w / BS.h; BS.camera.updateProjectionMatrix();
  }
  BS.t += 0.016;
  BS.stars.rotation.z += 0.0006;
  BS.neb.forEach((m, i) => { m.rotation.z += 0.0008 * (i % 2 ? 1 : -1); m.material.opacity = 0.3 + 0.08 * Math.sin(BS.t * 0.5 + i); });
  if (BS.aura) { BS.aura.rotation.z += 0.01; BS.aura.material.opacity = 0.4 + 0.15 * Math.sin(BS.t * 1.5); }
  BS.renderer.render(BS.scene, BS.camera);
  BS.raf = requestAnimationFrame(renderBattleScene);
}

function startBattleScene() {
  if (!BS.renderer) return;
  cancelAnimationFrame(BS.raf);
  BS.raf = requestAnimationFrame(renderBattleScene);
}
function stopBattleScene() { cancelAnimationFrame(BS.raf); BS.raf = null; }

function flashBattle(color) {
  const host = document.getElementById("battle-canvas");
  if (!host) return;
  host.style.transition = "none"; host.style.boxShadow = `inset 0 0 100px ${color}`;
  requestAnimationFrame(() => { host.style.transition = "box-shadow .35s"; host.style.boxShadow = "inset 0 0 0 transparent"; });
}
function playBattleHitEffect() { if (BS.aura) BS.aura.material.opacity = 0.95; flashBattle("rgba(255,255,255,.5)"); }
function playBattleSkillEffect() { if (BS.aura) BS.aura.material.opacity = 1.0; flashBattle("rgba(150,200,255,.6)"); }

// 戦闘背景の完全破棄（必要時のみ。通常は再利用＋ループ停止で十分）
function disposeBattleScene() {
  stopBattleScene();
  if (BS.renderer) {
    BS.renderer.dispose();
    const el = BS.renderer.domElement;
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  BS.renderer = null; BS.scene = null; BS.stars = null; BS.neb = []; BS.aura = null;
}

// -------------------------------------------------------------
// ラスボス最終演出（本番寄り）
// テキスト＋CSSフェード＋背景変化（覚醒）でビート進行。PNGは後で差し替え可能
// -------------------------------------------------------------
const FINAL_SCOUT_LABELS = ["スカウト", "スカウ…", "ス…"]; // 崩れていくラベル
const ENDING_LINE = "固定された運命に、はぐれ者たちの航路が刻まれた";

// 演出ビート。kind: line(セリフ) / scout(崩れ) / awaken(覚醒) / hope(希望の選択)
const FINAL_SCRIPT = [
  { kind: "line", sp: "", text: "――運命固定装置 ラストギア。撃破した……かに見えた。" },
  { kind: "line", sp: "ラストギア", text: "弱い者に、未来を変える力などない" },
  { kind: "line", sp: "ラストギア", text: "迷う者、壊れた者、選ばれなかった者" },
  { kind: "line", sp: "ラストギア", text: "それらはすべて、銀河の誤差だ" },
  { kind: "line", sp: "仲間たち", text: "ひとり、またひとりと、はじき出されていく――" },
  { kind: "line", sp: "", text: "主人公だけが、残されようとしている。" },
  { kind: "scout" }, // 弱いまま、それでも立ち上がり続ける（スカウトが崩れる）
  { kind: "line", sp: "はぐれ飛行船オルカ号", text: "――その身を、主人公の前へ滑り込ませた。" },
  { kind: "line", sp: "オルカ号", text: "航路確認" },
  { kind: "line", sp: "オルカ号", text: `${FINAL_BOSS_UNLOCK_COUNT}の声を受信` },
  { kind: "line", sp: "オルカ号", text: "はぐれ団、全員搭乗確認" },
  { kind: "line", sp: "オルカ号", text: "これより、運命固定装置へ突入します" },
  { kind: "awaken" }, // 必要人数の想いでオルカ号が覚醒（背景変化）
  { kind: "line", sp: "ピノ", text: "……ちがいます" },
  { kind: "line", sp: "ピノ", text: "ぼくたちは、たしかに迷いました" },
  { kind: "line", sp: "ピノ", text: "でも、ここまで来ました" },
  { kind: "line", sp: "ラストギア", text: "そんな未来を知っていれば、私にも……", demon: true },
  { kind: "hope" }, // 「はぐれ団」らしい希望の選択肢 → エンディング
];

let finalStep = 0;
let finalScoutPresses = 0;
let finalTimer = null;

function enterFinalPhase() {
  finalPhase = true;
  finalStep = 0;
  finalScoutPresses = 0;
  clearTimeout(finalTimer);
  // ステージ20到達＝クリア扱いにしておく
  if (currentStar && !save.cleared.includes(currentStar.id)) { save.cleared.push(currentStar.id); persist(); }
  document.getElementById("screen-final").classList.remove("awakening");
  show("final");
  renderFinalStep();
}

function setFadeText(el, text) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
}

function renderFinalStep() {
  const beat = FINAL_SCRIPT[finalStep];
  const sp = document.getElementById("final-speaker");
  const msg = document.getElementById("final-msg");
  const actions = document.getElementById("final-actions");
  if (!beat) { goEnding(); return; }

  if (beat.kind === "line") {
    sp.textContent = beat.sp || "";
    msg.className = "final-msg" + (beat.demon ? " demon" : "");
    setFadeText(msg, beat.text);
    actions.innerHTML = `<button class="btn final-next-btn" data-action="final-next">▶ つぎへ</button>`;
  } else if (beat.kind === "scout") {
    finalScoutPresses = 0;
    sp.textContent = "主人公";
    msg.className = "final-msg";
    setFadeText(msg, "主人公は「スカウト」しか できない。それでも、立ち上がる――");
    actions.innerHTML = `<button class="btn btn-primary final-scout-btn" id="final-scout-btn" data-action="final-scout">スカウト</button>`;
  } else if (beat.kind === "awaken") {
    sp.textContent = "";
    msg.className = "final-msg";
    setFadeText(msg, `${FINAL_BOSS_UNLOCK_COUNT}人のはぐれ者の想いが、オルカ号に流れ込む――`);
    document.getElementById("screen-final").classList.add("awakening");
    actions.innerHTML = `<div class="final-awaken-word">オルカ号 ―― 覚醒</div>`;
    clearTimeout(finalTimer);
    finalTimer = setTimeout(() => advanceFinal(), 2200); // タップでも進める
  } else if (beat.kind === "hope") {
    sp.textContent = "";
    msg.className = "final-msg";
    setFadeText(msg, "「はぐれ団」――選ばれなかった者たちの、最後の選択。");
    actions.innerHTML = `<button class="btn btn-primary final-hope-btn" data-action="final-hope">▶ みんなで、行く</button>`;
  }
}

function advanceFinal() {
  clearTimeout(finalTimer);
  finalStep++;
  if (finalStep >= FINAL_SCRIPT.length) { goEnding(); return; }
  renderFinalStep();
}

function pressFinalScout() {
  const btn = document.getElementById("final-scout-btn");
  if (!btn) return;
  finalScoutPresses++;
  if (finalScoutPresses < FINAL_SCOUT_LABELS.length) {
    btn.textContent = FINAL_SCOUT_LABELS[finalScoutPresses]; // スカウ… → ス…
  } else {
    // 崩れ切ったら次のビートへ
    btn.textContent = "ス…";
    advanceFinal();
  }
}

function goEnding() {
  finalPhase = false;
  clearTimeout(finalTimer);
  document.getElementById("screen-final").classList.remove("awakening");
  const lineEl = document.getElementById("ending-line");
  if (lineEl) lineEl.textContent = `「${ENDING_LINE}」`;
  show("ending");
}

document.querySelector("#screen-final").addEventListener("click", (e) => {
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (action === "final-next") return advanceFinal();
  if (action === "final-scout") return pressFinalScout();
  if (action === "final-hope") return goEnding();
  // ボタン以外のタップでも line / awaken は進める
  if (!e.target.closest("button")) {
    const beat = FINAL_SCRIPT[finalStep];
    if (beat && (beat.kind === "line" || beat.kind === "awaken")) advanceFinal();
  }
});
document.querySelector("#screen-ending").addEventListener("click", (e) => {
  if (e.target.closest('[data-action="ending-title"]')) show("title");
});

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
  const synergy = computeSynergies(save.party);
  const lowRareDiscount = ally.rarity <= LOW_RARITY_MAX || (ally.tags || []).includes("低レア");
  const cost = lowRareDiscount ? Math.max(5, Math.round(r.cost * 0.8)) : r.cost;
  let rate = r.baseRate;
  const hasBonus = stageBonus && stageBonus.type === "scoutRate";
  if (hasBonus) rate += stageBonus.boosted ? 0.08 : 0.05; // ミドリ星人で強化
  rate += synergy.effects.scoutRate;
  const beacon = itemCount("scoutBeacon") > 0;
  if (beacon) rate += 0.10;
  return {
    cost,
    rate: Math.min(0.99, rate),
    boosted: !!hasBonus,
    beacon,
    synergyScout: synergy.effects.scoutRate,
    lowRareDiscount,
  };
}

// 図鑑：発見済み登録
function markDiscovered(id, { countEncounter = true, doPersist = true } = {}) {
  if (!save.discovered.includes(id)) save.discovered.push(id);
  const stat = dexStat(id);
  const starLabel = starRecordLabel();
  if (countEncounter) stat.foundCount++;
  if (starLabel) {
    if (!stat.firstMetStar) stat.firstMetStar = starLabel;
    stat.lastMetStar = starLabel;
  }
  if (doPersist) persist();
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
  const { cost, rate, boosted, beacon, synergyScout, lowRareDiscount } = scoutInfo(ally);
  const enough = save.crystals >= cost;
  const replaceTarget = !save.party.includes(ally.id) && save.party.length >= 4 ? allyById(save.party[save.party.length - 1]) : null;
  document.getElementById("scout-result").innerHTML = `
    <div class="scout-face">${faceHTML(ally.face, allyImagePath(ally))}</div>
    <div class="cand-name">${ally.name}</div>
    <div class="cand-rarity">${"★".repeat(ally.rarity)}</div>
    <div class="scout-sub">ロール：${ally.roleLabel}</div>
    <div class="cand-tag">${ally.tags.map(tag => `<span class="tag-chip">${tag}</span>`).join("")}</div>
    <div class="cand-stats">
      <div class="cand-stat"><div class="k">必要💎</div><div class="v cost ${enough ? "" : "short"}">${cost}</div></div>
      <div class="cand-stat"><div class="k">成功率</div><div class="v rate">${Math.round(rate * 100)}%${(boosted || synergyScout) ? " ↑" : ""}</div></div>
      <div class="cand-stat"><div class="k">所持💎</div><div class="v">${save.crystals}</div></div>
    </div>
    ${enough ? "" : `<div class="scout-sub" style="color:var(--danger)">クリスタルが足りない…</div>`}
    ${beacon ? `<div class="scout-sub" style="color:var(--ok)">スカウトビーコン適用中：成功率 +10%</div>` : ""}
    ${synergyScout ? `<div class="scout-sub" style="color:var(--ok)">はぐれものの絆：成功率 +${Math.round(synergyScout * 100)}%</div>` : ""}
    ${lowRareDiscount ? `<div class="scout-sub" style="color:var(--gold)">低レア救済：スカウト費用を割引</div>` : ""}
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
  const { cost, rate, beacon } = scoutInfo(ally);
  if (save.crystals < cost) return; // 念のため
  if (beacon) consumeItem("scoutBeacon");
  if (Math.random() < rate) {
    addDexStat(ally.id, "scoutSuccessCount", 1);
    // パーティ満員かつ未加入なら、入れ替え選択画面へ
    if (!save.party.includes(ally.id) && save.party.length >= 4) {
      scoutPendingCost = cost; scoutPendingBeacon = beacon;
      persist();
      showScoutReplace(ally, cost, beacon);
      return;
    }
    save.crystals -= cost;          // 成功時のみ消費
    const recruitResult = recruit(ally); // パーティ加入＋「加入済み」記録
    showScoutResult(ally, "success", cost, recruitResult, beacon);
  } else {
    // 失敗：仲間にならない／消費なし（MVP）／図鑑は発見済みのまま
    addDexStat(ally.id, "scoutFailCount", 1);
    showScoutResult(ally, "fail", 0, {}, beacon);
  }
  persist();
}

let scoutPendingCost = 0, scoutPendingBeacon = false;

// パーティ満員時：新メンバーと現4人を見せ、誰と別れるか / 図鑑だけかを選ばせる
function showScoutReplace(ally, cost, beacon) {
  document.getElementById("scout-title").textContent = "パーティが満員！";
  const box = document.getElementById("scout-result");
  box.innerHTML = `
    <div class="scout-face">${faceHTML(ally.face, allyImagePath(ally))}</div>
    <div class="scout-voice ok">「${ally.voice.ok}」</div>
    <div class="scout-msg" style="color:var(--ok)">${ally.name}（★${ally.rarity}）を 仲間にできる！</div>
    <div class="scout-sub">誰かと別れて入れるか、図鑑にだけ残すか えらぼう（💎${cost}）</div>
  `;
  const memberBtns = save.party.map((id, i) => {
    const m = allyById(id);
    return `<button class="btn scout-replace-btn" data-action="scout-replace" data-idx="${i}">${m.face} ${m.name} とさよなら</button>`;
  }).join("");
  document.getElementById("scout-actions").innerHTML =
    memberBtns + `<button class="btn" data-action="scout-figure">加入せず 図鑑だけ登録</button>`;
}

// 指定スロットの仲間と別れて加入
function doReplace(idx) {
  const ally = scoutCandidate;
  const replacedId = save.party[idx];
  if (!ally || replacedId == null) return;
  save.crystals -= scoutPendingCost;
  if (!save.recruited.includes(ally.id)) save.recruited.push(ally.id);
  markDiscovered(ally.id, { countEncounter: false, doPersist: false });
  const replaced = allyById(replacedId);
  save.party[idx] = ally.id;
  addDexStat(replacedId, "partedCount", 1); // 別れた回数を記録（図鑑には残る）
  persist();
  showScoutResult(ally, "success", scoutPendingCost, { addedToParty: true, replaced }, scoutPendingBeacon);
}

// 加入せず図鑑だけ登録（費用なし・パーティ不変）
function doFigureOnly() {
  const ally = scoutCandidate;
  if (!ally) return;
  if (!save.recruited.includes(ally.id)) save.recruited.push(ally.id);
  markDiscovered(ally.id, { countEncounter: false, doPersist: false });
  persist();
  document.getElementById("scout-title").textContent = "図鑑に登録";
  document.getElementById("scout-result").innerHTML = `
    <div class="scout-face">${faceHTML(ally.face, allyImagePath(ally))}</div>
    <div class="scout-voice bye">「${ally.voice.bye}」</div>
    <div class="scout-msg">${ally.name} は 図鑑にだけ 記録された</div>
    <div class="scout-sub">パーティはそのまま（クリスタルは消費していない）</div>
  `;
  document.getElementById("scout-actions").innerHTML =
    `<button class="btn btn-primary" data-action="scout-continue">つづける</button>`;
}

// パーティ加入（4人を超える場合は末尾と入れ替え）
function recruit(ally) {
  const result = { addedToParty: false, alreadyInParty: false, replaced: null };
  if (!save.recruited.includes(ally.id)) save.recruited.push(ally.id);
  markDiscovered(ally.id, { countEncounter: false, doPersist: false });
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
    addDexStat(replacedId, "partedCount", 1);
  }
  return result;
}

function showScoutResult(ally, kind, cost, recruitResult = {}, beacon = false) {
  document.getElementById("scout-title").textContent = "スカウト結果";
  const box = document.getElementById("scout-result");
  if (kind === "success") {
    const partyNote = recruitResult.replaced
      ? `パーティ満員のため ${recruitResult.replaced.name} と入れ替え`
      : (recruitResult.alreadyInParty ? "すでにパーティにいる" : "パーティに編成");
    box.innerHTML = `
      <div class="scout-face">${faceHTML(ally.face, allyImagePath(ally))}</div>
      <div class="scout-voice ok">「${ally.voice.ok}」</div>
      <div class="scout-msg" style="color:var(--ok)">${ally.name} が なかまになった！</div>
      <div class="scout-sub">💎${cost} 消費${beacon ? " ／ ビーコン使用" : ""} ／ 図鑑に「加入」を記録 ／ ${partyNote}</div>
    `;
  } else {
    box.innerHTML = `
      <div class="scout-face">💨</div>
      <div class="scout-voice ng">「${ally.voice.ng}」</div>
      <div class="scout-msg">スカウト失敗…</div>
      <div class="scout-sub">${ally.name} は 去っていった${beacon ? "（ビーコン使用）" : ""}（図鑑には「発見」を記録）</div>
    `;
  }
  document.getElementById("scout-actions").innerHTML =
    `<button class="btn btn-primary" data-action="scout-continue">つづける</button>`;
}

// 「スルー」：消費なし・仲間にならない・図鑑は発見済みのまま
function skipScout(ally) {
  if (ally) {
    addDexStat(ally.id, "skipCount", 1);
    persist();
  }
  document.getElementById("scout-title").textContent = "スルー";
  document.getElementById("scout-result").innerHTML = `
    <div class="scout-face">${ally ? faceHTML(ally.face, allyImagePath(ally)) : "👋"}</div>
    <div class="scout-voice bye">「${ally ? ally.voice.bye : "またどこかで会おう"}」</div>
    <div class="scout-msg">見送った</div>
    <div class="scout-sub">${ally ? ally.name : "仲間候補"} とは また どこかで（図鑑には「発見」を記録）</div>
  `;
  document.getElementById("scout-actions").innerHTML =
    `<button class="btn btn-primary" data-action="scout-continue">つづける</button>`;
}

document.querySelector("#screen-scout").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const a = btn.dataset.action;
  if (a === "scout-do") attemptScout();
  else if (a === "scout-skip") skipScout(scoutCandidate);
  else if (a === "scout-replace") doReplace(Number(btn.dataset.idx));
  else if (a === "scout-figure") doFigureOnly();
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
  // 図鑑カウントは正式仲間ID c1〜c60 の収集数を表示
  document.getElementById("dex-total").textContent = TOTAL_CHARACTERS;
  document.getElementById("dex-count").textContent = heroCount();
  ALLIES.forEach((a, i) => {
    const found = save.discovered.includes(a.id);
    const joined = save.recruited.includes(a.id);
    const special = a.role === "ship";
    const cell = document.createElement("div");
    cell.className = "dex-cell" + (found ? "" : " unknown") + (joined ? " joined" : "") + (special ? " special" : "");
    const badge = !found ? "" : joined
      ? `<div class="dc-badge joined">${special ? "船枠・加入済み" : "加入済み"}</div>`
      : `<div class="dc-badge found">${special ? "船枠" : "発見済み"}</div>`;
    const stat = found ? dexStat(a.id) : null;
    const tagsHtml = found ? `<div class="dc-tags">${a.tags.map(tag => `<span>${tag}</span>`).join("")}</div>` : "";
    cell.innerHTML = `
      <div class="dc-head">
        <span class="dc-no">No.${String(i + 1).padStart(2, "0")}</span>
        ${found ? `<span class="dc-rarity">★${a.rarity}</span>` : `<span class="dc-rarity dc-secret">---</span>`}
      </div>
      <div class="dc-face">${found ? faceHTML(a.face, allyImagePath(a)) : "❔"}</div>
      <div class="dc-name">${found ? a.name : "？？？"}</div>
      ${found ? `<div class="dc-role">${a.roleLabel}</div>` : `<div class="dc-role unknown-role">未発見</div>`}
      ${tagsHtml}
      <div class="dc-bottom">
        ${found ? `<div class="dc-statline">発見 ${stat.foundCount} / 成功 ${stat.scoutSuccessCount}</div>` : `<div class="dc-statline">探索で発見しよう</div>`}
        ${badge}
      </div>
    `;
    if (found) cell.title = `${a.name}（★${a.rarity} / ${a.roleLabel}）\nタグ：${a.tags.join(" / ")}\n${a.setting}\n得意：${a.skill}\n発見：${stat.foundCount} / 成功：${stat.scoutSuccessCount}`;
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
applyAssetImages(); // 装飾PNGがあれば反映（無ければ従来のCSS/絵文字のまま）
console.log("銀河はぐれ団 起動 ✦", save);

// デバッグ用フック（コンソールから各シーンへ直接ジャンプ可能）
window.GAME = {
  get save() { return save; },
  show, toast,
  goShooting: (i = 0) => startStage(STARS[i]),
  goBattle: (i = 0) => { currentStar = STARS[i]; startBattle(STARS[i]); },
  winShooting: () => { if (SH.running) { SH.hp = SH.maxHp || MAX_HP; SH.startT = performance.now() - (STAGE_TIME + 1) * 1000; } },
  endShooting: () => { if (SH.running) { SH.hp = SH.maxHp || MAX_HP; endShooting(); } }, // 結果画面へ即遷移（デバッグ）
  completeMission: () => { if (SH.mission) { SH.missionDone = true; SH.missionFailed = false; updateMissionHUD(); } },
  setBonus: (type) => { stageBonus = (MISSIONS.find(m => m.bonus.type === type) || {}).bonus || null; return stageBonus; },
  get bonus() { return stageBonus; },
  characterCatalog: CHARACTER_CATALOG,
  allies: ALLIES,
  stars: STARS,
  bossUltimates: BOSS_ULTIMATE_PLAN,
  get sh() { return SH; },
  synergy: () => computeSynergies(save.party),
  dexStats: () => { ensureDexStats(save); return save.dexStats; },
  addDexStat: (id, key, amount = 1) => { const stat = addDexStat(id, key, amount); persist(); return stat; },
  constants: { TOTAL_CHARACTERS, ALLY_IMAGE_IMPLEMENTED_COUNT, FINAL_BOSS_UNLOCK_COUNT },
  get heroes() { return heroCount(); },                 // 現在の仲間収集数（c1〜c60）
  heroNeeded: () => Math.max(0, FINAL_BOSS_UNLOCK_COUNT - heroCount()),
  // デバッグ：No.1〜n を図鑑「発見済み」に登録（ラスボスゲート確認用）
  discoverHeroes: (n = FINAL_BOSS_UNLOCK_COUNT) => {
    for (let k = 1; k <= n; k++) {
      const id = "c" + k;
      if (!allyById(id)) continue;
      if (!save.discovered.includes(id)) save.discovered.push(id);
      const stat = dexStat(id);
      if (stat.foundCount <= 0) stat.foundCount = 1;
    }
    persist();
    return heroCount();
  },
  get finalPhase() { return finalPhase; },
  goFinalPhase: () => { currentStar = STARS[19]; isFinalBossBattle = true; enterFinalPhase(); }, // 最終演出へ直接（デバッグ）
  disposeBattleScene,
  reset: resetSave,
};
