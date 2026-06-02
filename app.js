// ===== 銀河はぐれ団 / メインロジック =====
import * as THREE from "three";

// -------------------------------------------------------------
// データ定義
// -------------------------------------------------------------

// レア度ごとのスカウト設定（必要クリスタル / 基本成功率）
const RARITY = {
  2: { cost: 20, baseRate: 0.70 },
  3: { cost: 35, baseRate: 0.55 },
  4: { cost: 60, baseRate: 0.40 },
  5: { cost: 90, baseRate: 0.30 },
};

// 仲間候補（戦闘勝利後にスカウト / 図鑑に登録）
// navBonus … 航行（シューティング）パートへの効果。voice … スカウト時の一言
const ALLIES = [
  { id: "robo",   name: "ロボ太",     face: "🤖", hp: 40, atk: 12, img: "robo",   rarity: 2, tag: "メカ族",
    navBonus: { type: "fireRate",    label: "射撃速度アップ" },
    voice: { ok: "いっしょに行こうぜ！", ng: "まだ準備不足かな…", bye: "またな、相棒！" } },
  { id: "neko",   name: "ねこ船長",   face: "🐱", hp: 32, atk: 14, img: "neko",   rarity: 2, tag: "ねこ族",
    navBonus: { type: "crystalUp",   label: "クリスタル獲得 +10%" },
    voice: { ok: "乗せてってやるにゃ！", ng: "気が向かないにゃ", bye: "またどこかで会おうにゃ" } },
  { id: "alien",  name: "ミドリ星人", face: "👽", hp: 30, atk: 13, img: "alien",  rarity: 3, tag: "宇宙人",
    navBonus: { type: "missionBoost", label: "ミッション報酬 強化" },
    voice: { ok: "ワレ、ナカマニ ナル！", ng: "マダ、ハヤイ…", bye: "マタ ドコカデ" } },
  { id: "ghost",  name: "おばけ",     face: "👻", hp: 28, atk: 16, img: "ghost",  rarity: 3, tag: "ゆうれい",
    navBonus: { type: "rockGuard",   label: "隕石ダメージ 低確率で無効" },
    voice: { ok: "ひゅ〜、ついてくよ〜", ng: "いまは むり〜", bye: "ばいば〜い" } },
  { id: "drago",  name: "コドラゴ",   face: "🐲", hp: 50, atk: 18, img: "drago",  rarity: 4, tag: "ドラゴン",
    navBonus: { type: "killCrystal", label: "敵撃破で +1💎" },
    voice: { ok: "燃えてきたぜ！", ng: "まだ認めねぇ！", bye: "また勝負だ！" } },
  { id: "star",   name: "スターちゃん",face: "⭐", hp: 26, atk: 20, img: "star",   rarity: 5, tag: "スター",
    navBonus: { type: "bigUp",       label: "大クリスタル +10" },
    voice: { ok: "キラッ☆ いいよ！", ng: "うーん、まだかな", bye: "また会おうね☆" } },
  { id: "octo",   name: "タコすけ",   face: "🐙", hp: 36, atk: 11, img: "octo",   rarity: 2, tag: "海洋生物",
    navBonus: { type: "shield",      label: "開始時バリア ×1" },
    voice: { ok: "8本うでで手伝うよ！", ng: "ちょっと無理かも", bye: "またね〜" } },
  { id: "pengin", name: "ペンペン",   face: "🐧", hp: 34, atk: 12, img: "pengin", rarity: 2, tag: "鳥類",
    navBonus: { type: "slow",        label: "隕石スピード -10%" },
    voice: { ok: "ぺんっ！行く！", ng: "さむいから今度ね", bye: "ぺんぺん、またね" } },
];

// 星（ステージ）。candidates = その星で出会える仲間候補
const STARS = [
  { id: "s1", name: "アオイ星",   icon: "🌍", desc: "はじまりの青い星",   enemy: "slime",  reward: 30,  candidates: ["neko", "ghost"] },
  { id: "s2", name: "サバク星",   icon: "🪐", desc: "砂嵐ふきあれる星",   enemy: "bug",    reward: 45,  candidates: ["alien", "octo"] },
  { id: "s3", name: "コオリ星",   icon: "❄️", desc: "こおりにとざされた星", enemy: "yeti",   reward: 60,  candidates: ["pengin"] },
  { id: "s4", name: "ヒノ星",     icon: "🔥", desc: "マグマもえさかる星", enemy: "demon",  reward: 80,  candidates: ["drago"] },
  { id: "s5", name: "ハグレ星雲", icon: "🌌", desc: "謎につつまれた最果て", enemy: "boss",   reward: 120, candidates: ["star"] },
];

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

// 敵（戦闘）
const ENEMIES = {
  slime: { name: "うちゅうスライム", face: "🟣", hp: 30,  atk: 6,  img: "slime" },
  bug:   { name: "メカバグ",         face: "🐛", hp: 45,  atk: 9,  img: "bug" },
  yeti:  { name: "ユキオトコ",       face: "🦣", hp: 60,  atk: 12, img: "yeti" },
  demon: { name: "ヒノデビル",       face: "😈", hp: 80,  atk: 16, img: "demon" },
  boss:  { name: "はぐれ王",         face: "👹", hp: 140, atk: 22, img: "boss" },
};

// -------------------------------------------------------------
// セーブデータ（localStorage）
// -------------------------------------------------------------
const SAVE_KEY = "ginga-haguredan-save-v1";

const defaultSave = () => ({
  crystals: 0,
  cleared: [],            // クリア済み星ID
  party: ["robo"],        // 初期メンバー
  discovered: ["robo"],   // 図鑑：発見済み（出会った）仲間ID
  recruited: ["robo"],    // 図鑑：加入済み（スカウト成功）仲間ID
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
// タイトル
// -------------------------------------------------------------
document.querySelector("#screen-title").addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  switch (el.dataset.action) {
    case "start-game":
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
          <div class="pr-name">${a.name} <span class="rarity">${"★".repeat(a.rarity)}</span></div>
          <div class="pr-sub">${a.tag} ／ HP${a.hp} こうげき${a.atk}</div>
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
        <div class="star-name">${star.name}</div>
        <div class="star-desc">${star.desc}</div>
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
const STAGE_TIME = 30; // シューティング1ステージの秒数

const MAX_HP = 3;
const SHIP_R = 0.48; // 飛行船の当たり判定半径（小さめの丸い船体に合わせる）

const SH = {
  renderer: null, scene: null, camera: null, raf: null,
  ship: null, bullets: [], rocks: [], enemies: [], crystals: [],
  hp: MAX_HP, gained: 0, timeLeft: STAGE_TIME, lastShot: 0, lastSpawn: 0,
  running: false, targetX: 0, targetY: 0, startT: 0,
  // 航行スタッツ＆ミッション
  dmgTaken: 0, kills: 0, bigPicked: 0,
  mission: null, missionProgress: 0, missionDone: false, missionFailed: false,
  // 仲間の航行効果
  nav: null, shieldLeft: 0,
};

function initShooting() {
  const host = document.getElementById("shooting-canvas");
  SH.renderer = new THREE.WebGLRenderer({ antialias: true });
  SH.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  resizeRenderer(SH.renderer, host);
  host.appendChild(SH.renderer.domElement);

  SH.scene = new THREE.Scene();
  SH.scene.fog = new THREE.FogExp2(0x05030f, 0.012);

  SH.camera = new THREE.PerspectiveCamera(60, host.clientWidth / host.clientHeight, 0.1, 200);
  SH.camera.position.set(0, 2.5, 12);
  SH.camera.lookAt(0, 0, -10);

  // 背景の星
  const starGeo = new THREE.BufferGeometry();
  const SN = 800;
  const sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) {
    sp[i*3]   = (Math.random() - 0.5) * 60;
    sp[i*3+1] = (Math.random() - 0.5) * 60;
    sp[i*3+2] = -Math.random() * 150;
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
  g.position.set(0, 0, 8);
  return g;
}

// 出現位置（上下左右に動けるよう縦範囲を広げる）
const spawnX = () => (Math.random() - 0.5) * 9;   // ≈ -4.5..4.5
const spawnY = () => -1.5 + Math.random() * 4;    // ≈ -1.5..2.5

// red=true で赤い隕石（ダメージ2・出現率低め）
function spawnRock(red = false) {
  const r = 0.6 + Math.random() * 1.2;
  const m = new THREE.Mesh(
    new THREE.IcosahedronGeometry(r, 0),
    new THREE.MeshStandardMaterial({
      color: red ? 0xff3322 : 0x887766,
      emissive: red ? 0x551100 : 0x000000,
      roughness: 1, flatShading: true,
    })
  );
  m.position.set(spawnX(), spawnY(), -90);
  m.userData = { type: "rock", r, spin: (Math.random() - 0.5) * 0.05, dmg: red ? 2 : 1 };
  SH.scene.add(m); SH.rocks.push(m);
}

// kind: "normal"(+5💎) / "big"(+20💎) / "heal"(HP+1)
function spawnCrystal(kind = "normal") {
  let geo, mat, r;
  if (kind === "big") {
    geo = new THREE.OctahedronGeometry(0.95, 0);
    mat = new THREE.MeshStandardMaterial({ color: 0xffd35a, emissive: 0xaa7711, metalness: 0.5 });
    r = 1.0;
  } else if (kind === "heal") {
    geo = new THREE.OctahedronGeometry(0.6, 0);
    mat = new THREE.MeshStandardMaterial({ color: 0x66ff99, emissive: 0x22aa55, metalness: 0.3 });
    r = 0.7;
  } else {
    geo = new THREE.OctahedronGeometry(0.5, 0);
    mat = new THREE.MeshStandardMaterial({ color: 0x88eeff, emissive: 0x2299cc, metalness: 0.4 });
    r = 0.6;
  }
  const m = new THREE.Mesh(geo, mat);
  m.position.set(spawnX(), spawnY(), -90);
  m.userData = { type: "crystal", kind, r };
  SH.scene.add(m); SH.crystals.push(m);
}
function spawnEnemy() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.3, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xff5588, emissive: 0x551122, flatShading: true })
  );
  g.add(core);
  g.position.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 2, -90);
  g.userData = { type: "enemy", r: 1.0, hp: 2 };
  SH.scene.add(g); SH.enemies.push(g);
}
function fireBullet() {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x66ffaa })
  );
  m.position.copy(SH.ship.position);
  m.position.z -= 1;
  m.userData = { type: "bullet", r: 0.3 };
  SH.scene.add(m); SH.bullets.push(m);
}

function startShooting(star) {
  if (!SH.renderer) initShooting();
  resizeRenderer(SH.renderer, document.getElementById("shooting-canvas"));
  // リセット
  [...SH.bullets, ...SH.rocks, ...SH.enemies, ...SH.crystals].forEach(o => SH.scene.remove(o));
  SH.bullets = []; SH.rocks = []; SH.enemies = []; SH.crystals = [];
  SH.hp = MAX_HP; SH.gained = 0; SH.timeLeft = STAGE_TIME;
  SH.ship.position.set(0, 0, 8); SH.targetX = 0; SH.targetY = 0;
  SH.lastSpawn = 0; SH.lastShot = 0; SH.running = true;
  SH.startT = performance.now();
  // 航行スタッツ＆ミッションをリセット
  SH.dmgTaken = 0; SH.kills = 0; SH.bigPicked = 0;
  SH.mission = MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
  SH.missionProgress = 0; SH.missionDone = false; SH.missionFailed = false;
  // 仲間の航行効果を反映
  SH.nav = computeNavEffects(save.party);
  SH.shieldLeft = SH.nav.shields;
  stageBonus = null; // 前回の航行ボーナスをクリア
  updateShootingHUD();
  updateMissionHUD();

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

  // 背景流れ
  SH.bgStars.position.z += 20 * dt;
  if (SH.bgStars.position.z > 60) SH.bgStars.position.z = 0;

  // 船移動（ドラッグ目標へ上下左右に補間）
  SH.ship.position.x += (SH.targetX - SH.ship.position.x) * Math.min(1, dt * 10);
  SH.ship.position.y += (SH.targetY - SH.ship.position.y) * Math.min(1, dt * 10);
  SH.ship.rotation.z = (SH.targetX - SH.ship.position.x) * -0.2;
  SH.ship.rotation.x = (SH.targetY - SH.ship.position.y) * 0.15; // 上下移動で軽くピッチ

  // 自動弾（ロボ太がいると発射間隔が短縮）
  if (now - SH.lastShot > 350 * SH.nav.fireRateMul) { fireBullet(); SH.lastShot = now; }

  // スポーン（種類ごとに出現率を設定）
  if (now - SH.lastSpawn > 600) {
    const r = Math.random();
    if (r < 0.30)      spawnRock(false);   // 通常隕石
    else if (r < 0.38) spawnRock(true);    // 赤い隕石（低確率）
    else if (r < 0.63) spawnCrystal("normal");
    else if (r < 0.69) spawnCrystal("big");  // 大クリスタル（低確率）
    else if (r < 0.77) spawnCrystal("heal"); // 回復クリスタル
    else               spawnEnemy();
    SH.lastSpawn = now;
  }

  // ノーダメージ系ミッションの達成判定（経過時間で成立）
  if (SH.mission && SH.mission.type === "nohit" && !SH.missionDone && !SH.missionFailed) {
    const elapsed = (now - SH.startT) / 1000;
    if (elapsed >= SH.mission.goal) { SH.missionDone = true; updateMissionHUD(); }
  }

  const speed = 28;
  // 弾
  for (let i = SH.bullets.length - 1; i >= 0; i--) {
    const b = SH.bullets[i];
    b.position.z -= speed * 1.6 * dt;
    if (b.position.z < -95) { SH.scene.remove(b); SH.bullets.splice(i, 1); }
  }
  // 隕石（通常 -1 / 赤 -2）。ペンペンがいると接近スピード低下
  for (let i = SH.rocks.length - 1; i >= 0; i--) {
    const o = SH.rocks[i];
    o.position.z += speed * SH.nav.hazardSpeedMul * dt;
    o.rotation.x += o.userData.spin; o.rotation.y += o.userData.spin;
    if (hitShip(o)) { damageShip(o.userData.dmg, true); SH.scene.remove(o); SH.rocks.splice(i, 1); continue; }
    if (o.position.z > 14) { SH.scene.remove(o); SH.rocks.splice(i, 1); }
  }
  // クリスタル（通常 +5 / 大 +20 / 回復 HP+1）
  for (let i = SH.crystals.length - 1; i >= 0; i--) {
    const o = SH.crystals[i];
    o.position.z += speed * dt;
    o.rotation.y += 0.06;
    if (hitShip(o)) { collectCrystal(o.userData.kind); SH.scene.remove(o); SH.crystals.splice(i, 1); continue; }
    if (o.position.z > 14) { SH.scene.remove(o); SH.crystals.splice(i, 1); }
  }
  // 敵（ペンペンがいると接近スピード低下）
  for (let i = SH.enemies.length - 1; i >= 0; i--) {
    const e = SH.enemies[i];
    e.position.z += speed * 0.8 * SH.nav.hazardSpeedMul * dt;
    e.rotation.z += 0.04;
    // 弾ヒット
    for (let j = SH.bullets.length - 1; j >= 0; j--) {
      if (SH.bullets[j].position.distanceTo(e.position) < e.userData.r + 0.3) {
        SH.scene.remove(SH.bullets[j]); SH.bullets.splice(j, 1);
        e.userData.hp--;
        if (e.userData.hp <= 0) {
          // コドラゴがいると撃破クリスタル +killBonus
          SH.gained += 8 + SH.nav.killBonus; SH.kills++; bumpMission("kill");
          updateShootingHUD();
          SH.scene.remove(e); SH.enemies.splice(i, 1);
        }
        break;
      }
    }
    if (SH.enemies[i] === e) {
      if (hitShip(e)) { damageShip(1, false); SH.scene.remove(e); SH.enemies.splice(i, 1); continue; }
      if (e.position.z > 14) { SH.scene.remove(e); SH.enemies.splice(i, 1); }
    }
  }

  updateShootingHUD();

  // 終了判定
  if (SH.timeLeft <= 0 || SH.hp <= 0) endShooting();
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
  SH.hp -= amount;
  SH.dmgTaken += amount;
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
  if (kind === "big") {
    SH.gained += Math.round((20 + SH.nav.bigBonus) * mul); SH.bigPicked++;
    bumpMission("big"); bumpMission("crystal");
  } else if (kind === "heal") {
    if (SH.hp < MAX_HP) { SH.hp++; flashScreen("#6f9"); }
  } else {
    SH.gained += Math.round(5 * mul); bumpMission("crystal");
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
  const el = document.getElementById("mission-banner");
  const m = SH.mission;
  if (!m) { el.textContent = ""; return; }
  let prog;
  if (m.type === "nohit") prog = SH.missionFailed ? "失敗" : (SH.missionDone ? "達成！" : "…");
  else prog = `${Math.min(SH.missionProgress, m.goal)} / ${m.goal}`;
  el.innerHTML = `<span>🎯 ${m.desc}</span><span class="mb-prog">${prog}</span>`;
  el.classList.toggle("done", SH.missionDone);
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

// 入力（ドラッグ位置に上下左右で追従）
let shootingBound = false;
function bindShootingInput() {
  if (shootingBound) return;
  shootingBound = true;
  const host = document.getElementById("shooting-canvas");
  const move = (clientX, clientY) => {
    const rect = host.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;        // -1..1
    const ny = (clientY - rect.top) / rect.height;                  // 0(上)..1(下)
    SH.targetX = nx * 5.5;
    SH.targetY = 3 - ny * 5;                                        // 上=3 .. 下=-2
  };
  host.addEventListener("touchmove", (e) => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
  host.addEventListener("touchstart", (e) => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  let dragging = false;
  host.addEventListener("mousedown", (e) => { dragging = true; move(e.clientX, e.clientY); });
  // PCはドラッグ中だけでなくマウス移動でも追従
  window.addEventListener("mousemove", (e) => { if (currentScreen === "shooting") move(e.clientX, e.clientY); });
  window.addEventListener("mouseup", () => dragging = false);
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
  if (resultCleared) startBattle(currentStar);   // 到達 → 戦闘へ（ボーナス反映）
  else { refreshCrystals(); show("worldmap"); }   // 墜落 → ワールドマップへ
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

  // 敵描画
  document.getElementById("enemy-name").textContent = def.name;
  document.getElementById("enemy-sprite").innerHTML = faceHTML(def.face, `enemies/${def.img}`);
  setEnemyHpBar();

  renderParty();
  clearLog();
  log(`${def.name} が あらわれた！`);
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
  if (txt) txt.textContent = `${hp} / ${BT.enemy.hp}`;
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
    await wait(240);
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
  await wait(320);
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
  await wait(320);
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
    await wait(320);
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
  setTimeout(() => offerScout(), 700);
}

function partyWipe() {
  log("パーティは ぜんめつした…");
  setTimeout(() => { toast("ぜんめつ… 拠点にもどる"); show("worldmap"); }, 1400);
}

// -------------------------------------------------------------
// スカウト（戦闘勝利後に出会った仲間候補をスカウトする）
// -------------------------------------------------------------
let dexReturn = "worldmap";
let scoutCandidate = null;

// その星の候補から1体（未加入を優先）
function pickCandidate() {
  const pool = (currentStar.candidates || []).map(allyById).filter(Boolean);
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
    recruit(ally);                  // パーティ加入＋「加入済み」記録
    showScoutResult(ally, "success", cost);
  } else {
    // 失敗：仲間にならない／消費なし（MVP）／図鑑は発見済みのまま
    showScoutResult(ally, "fail");
  }
  persist();
}

// パーティ加入（4人を超える場合は末尾と入れ替え）
function recruit(ally) {
  if (!save.recruited.includes(ally.id)) save.recruited.push(ally.id);
  markDiscovered(ally.id);
  if (save.party.includes(ally.id)) return;
  if (save.party.length < 4) save.party.push(ally.id);
  else save.party[save.party.length - 1] = ally.id; // 入れ替え
}

function showScoutResult(ally, kind, cost) {
  document.getElementById("scout-title").textContent = "スカウト結果";
  const box = document.getElementById("scout-result");
  if (kind === "success") {
    const joined = save.party.includes(ally.id);
    box.innerHTML = `
      <div class="scout-face">${faceHTML(ally.face, `characters/${ally.img}`)}</div>
      <div class="scout-voice ok">「${ally.voice.ok}」</div>
      <div class="scout-msg" style="color:var(--ok)">${ally.name} が なかまになった！</div>
      <div class="scout-sub">💎${cost} 消費 ／ 図鑑に「加入」を記録${joined ? "" : "（パーティ入れ替え）"}</div>
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
      <div class="dc-name">${found ? a.name : "？？？"}</div>
      <div class="dc-no">No.${String(i + 1).padStart(2, "0")}</div>
      ${badge}
    `;
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
  completeMission: () => { if (SH.mission) { SH.missionDone = true; SH.missionFailed = false; updateMissionHUD(); } },
  setBonus: (type) => { stageBonus = (MISSIONS.find(m => m.bonus.type === type) || {}).bonus || null; return stageBonus; },
  get bonus() { return stageBonus; },
  get sh() { return SH; },
  reset: resetSave,
};
