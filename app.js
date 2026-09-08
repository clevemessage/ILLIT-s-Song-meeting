const screens = [...document.querySelectorAll(".screen")];
const playfield = document.querySelector("#playfield");
const targetZone = document.querySelector("#targetZone");
const levelPill = document.querySelector("#levelPill");
const heartsEl = document.querySelector("#hearts");
const toastEl = document.querySelector("#toast");
const targetHint = document.querySelector("#targetHint");
const resultSong = document.querySelector("#resultSong");
const resultMeta = document.querySelector("#resultMeta");
const rankList = document.querySelector("#rankList");
const shareRank = document.querySelector("#shareRank");
const targetWand = document.querySelector("#targetWand");
const targetPlayButton = document.querySelector("#targetPlay");
const resultPlayBtn = document.querySelector("#resultPlayBtn");
const resultPlayImg = document.querySelector("#resultPlayImg");
const statsTime = document.querySelector("#statsTime");
const ruleModal = document.getElementById("ruleModal");
const homeShareModal = document.getElementById("homeShareModal");
const ruleSlideImage = document.getElementById("ruleSlideImage");
const ruleDots = [...document.querySelectorAll(".rule-dots span")];
const splashIntro = document.getElementById("splashIntro");
const splashEnter = document.getElementById("splashEnter");
const splashProgress = document.getElementById("splashProgress");
const splashText = document.getElementById("splashText");
const skinPrevButtons = [...document.querySelectorAll("[data-skin-prev]")];
const skinNextButtons = [...document.querySelectorAll("[data-skin-next]")];
const skinSelector = document.querySelector(".skin-selector");

const ruleSlides = [
  { src: "./assets/rule_slide_01.png?v=20260720-rule-clean1", alt: "规则 1：听原声" },
  { src: "./assets/rule_slide_02.png?v=20260720-rule-clean1", alt: "规则 2：找演唱者" },
  { src: "./assets/rule_slide_03.png?v=20260720-rule-clean1", alt: "规则 3：拖到应援棒" },
];

const uiAudio = {
  button: new Audio("./assets/audio/ui/button.wav"),
  homeBgm: new Audio("./assets/audio/ui/home_bgm.mp3"),
  gameBgm: new Audio("./assets/audio/ui/bgm.mp3"),
  success: new Audio("./assets/audio/ui/success.mp3"),
  wrong: new Audio("./assets/audio/ui/wrong.mp3"),
  fail: new Audio("./assets/audio/ui/fail_wonhee.mp3"),
  failExtra: new Audio("./assets/audio/ui/fail_extra.mp3"),
};
uiAudio.homeBgm.loop = true;
uiAudio.gameBgm.loop = true;
Object.values(uiAudio).forEach((audio) => {
  audio.preload = "auto";
  audio.playsInline = true;
  audio.setAttribute?.("playsinline", "");
});
const HOME_BGM_VOLUME = 0.58;
const GAME_BGM_VOLUME = 0.035;

uiAudio.homeBgm.volume = HOME_BGM_VOLUME;
uiAudio.gameBgm.volume = GAME_BGM_VOLUME;
uiAudio.button.volume = 0.42;
uiAudio.success.volume = 0.86;
uiAudio.wrong.volume = 0.9;
uiAudio.fail.volume = 1;
uiAudio.failExtra.volume = 1;

const mediaClipCache = new Map();
const decodedClipCache = new Map();
const decodingClipPromises = new Map();
let audioEngineUnlocked = false;

const ASSET_VERSION = "20260720-run-timing1";
const SKIN_ASSET_VERSION = "20260908-doll-v6";
const SKIN_STORAGE_KEY = "liguo-listening-demo:skin";
const skinOptions = [
  {
    id: "default",
    root: "./assets",
    version: ASSET_VERSION,
    characters: [
      { id: "char01", name: "棕糖熊" },
      { id: "char02", name: "红结兔" },
      { id: "char03", name: "紫衣橙熊" },
      { id: "char04", name: "粉裙可可" },
      { id: "char05", name: "蓝结灰虎" },
    ],
  },
  {
    id: "doll-v1",
    root: "./assets/skins/doll-v1",
    version: SKIN_ASSET_VERSION,
    characters: [
      { id: "char03", name: "粉桃夜帽" },
      { id: "char01", name: "星麦金铃" },
      { id: "char04", name: "蓝云团团" },
      { id: "char02", name: "发卡栗栗" },
      { id: "char05", name: "蜜柚睡衣" },
    ],
  },
];

function findSkinOption(id) {
  return skinOptions.find((skin) => skin.id === id) || skinOptions[0];
}

function readStoredSkinId() {
  try {
    return localStorage.getItem(SKIN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function writeStoredSkinId(id) {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, id);
  } catch {
    // Some embedded browsers disable localStorage; the skin still applies for this session.
  }
}

const skinParam = new URLSearchParams(window.location.search).get("skin");
let activeSkinId = findSkinOption(skinParam || readStoredSkinId()).id;

function spriteSrcForSkin(skin, id, suffix) {
  return `${skin.root}/${id}_${suffix}.png?v=${skin.version}`;
}

function buildMascots(skinId = activeSkinId) {
  const skin = findSkinOption(skinId);
  return skin.characters.map((character) => {
    const { id, name } = character;
    const runFrames = (direction) =>
      Array.from({ length: 6 }, (__, frameIndex) => spriteSrcForSkin(skin, id, `run_${direction}_${String(frameIndex + 1).padStart(2, "0")}`));
    return {
      id,
      name,
      src: spriteSrcForSkin(skin, id, "front"),
      dragSrc: spriteSrcForSkin(skin, id, "front"),
      left: runFrames("left"),
      right: runFrames("right"),
    };
  });
}

function getSkinFrontSources(skinId) {
  return buildMascots(skinId).map((mascot) => mascot.src);
}

function preloadSkinPreview(skinId) {
  return Promise.allSettled(getSkinFrontSources(skinId).map(preloadImage));
}

const RUN_FRAME_MS = {
  char02: 155,
  char04: 165,
  char05: 92,
  default: 118,
};

const RUN_SPEED_MULTIPLIER = {
  char05: 1.12,
};

let mascots = buildMascots();

function syncStaticMascotImages() {
  document.body.dataset.skin = activeSkinId;
  document.querySelectorAll(".screen-home .mascot-band img").forEach((img, index) => {
    img.src = mascots[index % mascots.length].src;
    img.alt = mascots[index % mascots.length].name;
  });

  document.querySelectorAll(".result-mascots img").forEach((img, index) => {
    img.src = [mascots[0].src, mascots[3].src][index] || mascots[index % mascots.length].src;
    img.alt = [mascots[0].name, mascots[3].name][index] || mascots[index % mascots.length].name;
  });

  document.querySelectorAll(".screen-share .mascot-band.small img").forEach((img, index) => {
    img.src = [mascots[0].src, mascots[3].src][index] || mascots[index % mascots.length].src;
    img.alt = [mascots[0].name, mascots[3].name][index] || mascots[index % mascots.length].name;
  });

  document.querySelectorAll(".share-preview-mascots img").forEach((img, index) => {
    img.src = [mascots[1].src, mascots[2].src, mascots[4].src][index] || mascots[index % mascots.length].src;
    img.alt = [mascots[1].name, mascots[2].name, mascots[4].name][index] || mascots[index % mascots.length].name;
  });

  document.querySelectorAll(".sad-mascot").forEach((img) => {
    img.src = mascots[0].src;
    img.alt = mascots[0].name;
  });
}

function setActiveSkin(skinId, { persist = true } = {}) {
  activeSkinId = findSkinOption(skinId).id;
  mascots = buildMascots(activeSkinId);
  if (persist) writeStoredSkinId(activeSkinId);
  syncStaticMascotImages();
  renderRank();
  collectDeferredImageAssets().forEach((src) => {
    if (src.includes("/char") || src.includes("/assets/skins/")) preloadImage(src);
  });
  saveSession(document.querySelector(".screen.active")?.dataset.screen || "home");
}

let skinSwitchToken = 0;
async function cycleSkin(step) {
  const currentIndex = skinOptions.findIndex((skin) => skin.id === activeSkinId);
  const nextIndex = (currentIndex + step + skinOptions.length) % skinOptions.length;
  const nextSkinId = skinOptions[nextIndex].id;
  const token = ++skinSwitchToken;

  skinSelector?.classList.add("is-switching");
  [...skinPrevButtons, ...skinNextButtons].forEach((button) => {
    button.disabled = true;
  });
  await preloadSkinPreview(nextSkinId);
  if (token === skinSwitchToken) setActiveSkin(nextSkinId);
  if (token === skinSwitchToken) {
    skinSelector?.classList.remove("is-switching");
    [...skinPrevButtons, ...skinNextButtons].forEach((button) => {
      button.disabled = false;
    });
  }
}

const songs = GameAudioConfig.songs;
const clips = GameAudioConfig.clips || [];

const levelConfigs = [
  { candidates: 10, duration: 1.5, targetClipId: "level1", correctSongId: "magnetic", correctClipId: "magnetic-vocal-01", correctCount: 3, instrumentalRatio: 0 },
  { candidates: 11, duration: 1.5, targetClipId: "level2", correctSongId: "iconic-by-mistake", correctClipId: "iconic-by-mistake-vocal-02", correctCount: 2, instrumentalRatio: 0 },
  { candidates: 12, duration: 1.5, targetClipId: "level3", correctSongId: "toki-yo-tomare", correctClipId: "toki-yo-tomare-instrumental-02", correctCount: 1, instrumentalRatio: 0.5 },
  { candidates: 12, duration: 1.5, targetClipId: "level4", correctSongId: "iykyk", correctClipId: "iykyk-instrumental-02", correctCount: 1, instrumentalRatio: 0.75 },
  { candidates: 13, duration: 1.5, targetClipId: "level5", correctSongId: "not-cute-anymore", correctClipId: "not-cute-anymore-instrumental-02", correctCount: 1, instrumentalRatio: 0.75 },
];

let state = {
  level: 0,
  lives: 3,
  score: 0,
  mistakes: 0,
  revives: 0,
  hints: 0,
  startedAt: 0,
  currentSong: songs[0],
  candidateOrder: [],
  audio: null,
  mediaAudio: null,
  mediaStopTimer: 0,
  targetVisualTimer: 0,
  pendingFailTimer: 0,
  reviveTimer: 0,
  toneOscillators: new Set(),
  activeSongMaster: null,
  dragging: null,
  pendingDrag: null,
  activeMediaNode: null,
};

let movementFrame = 0;
let lastMoveAt = 0;
let statsTimer = 0;
let resultPlaying = false;
let resultPlaybackTimer = 0;
let ruleModalWasPaused = false;
let ruleSlideIndex = 0;
let ruleSwipeStartX = 0;
let homeBgmPending = false;
let shareReturnScreen = "home";
const SESSION_KEY = "liguo-listening-demo:session";
const RESTORABLE_SCREENS = new Set(["home", "game", "result", "fail", "rank", "share"]);
const DRAG_THRESHOLD = 6;
const TOUCH_BLOCK_SELECTOR = ".playfield, .pet-card";

function saveSession(activeScreen = document.querySelector(".screen.active")?.dataset.screen || "home") {
  if (!RESTORABLE_SCREENS.has(activeScreen)) return;
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        screen: activeScreen,
        returnScreen: shareReturnScreen,
        level: state.level,
        lives: state.lives,
        score: state.score,
        mistakes: state.mistakes,
        revives: state.revives,
        hints: state.hints,
        skinId: activeSkinId,
        currentSongId: state.currentSong?.id || songs[0]?.id,
        elapsedMs: state.startedAt ? Math.max(0, Date.now() - state.startedAt) : 0,
      }),
    );
  } catch {
    // Embedded browsers can disable sessionStorage; the game still runs without persistence.
  }
}

function readSession() {
  try {
    const data = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (!data || !RESTORABLE_SCREENS.has(data.screen)) return null;
    return data;
  } catch {
    return null;
  }
}

function setHomeBgmState(value) {
  document.body.dataset.homeBgm = value;
}

function disableNativeImageInteractions(root = document) {
  root.querySelectorAll?.("img").forEach((img) => {
    img.draggable = false;
    img.setAttribute("draggable", "false");
  });
}

function isTouchPointerEvent(event) {
  return event?.pointerType === "touch" || event?.pointerType === "pen";
}

function shouldSuppressNativeTouch(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target || target.closest(".splash-intro")) return false;
  if (target.closest(TOUCH_BLOCK_SELECTOR)) return true;
  if (target.tagName === "IMG" && !target.closest("button:not(.pet-card)")) return true;
  return false;
}

function suppressNativeTouch(event) {
  if (!event.cancelable || !shouldSuppressNativeTouch(event)) return;
  event.preventDefault();
}

function suppressNativeContext(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target?.closest(".app-shell, .splash-intro")) return;
  event.preventDefault();
}

function prewarmAudio() {
  unlockAudioEngine();
  Object.values(uiAudio).forEach((audio) => {
    try {
      audio.load();
    } catch {
      // WebViews may ignore eager media loading until the first user gesture.
    }
  });
  if (!state.mediaAudio) {
    state.mediaAudio = new Audio();
    state.mediaAudio.playsInline = true;
    state.mediaAudio.preload = "auto";
    state.mediaAudio.setAttribute?.("playsinline", "");
  }
}

function unlockAudioEngine() {
  try {
    const audio = ensureAudio();
    if (audioEngineUnlocked) return;
    const source = audio.createBufferSource();
    source.buffer = audio.createBuffer(1, 1, audio.sampleRate);
    source.connect(audio.destination);
    source.start(0);
    audioEngineUnlocked = true;
  } catch {
    // HTMLAudio fallback still works when WebAudio is unavailable.
  }
}

function preloadMediaClip(src) {
  if (!src) return null;
  const absoluteSrc = new URL(src, window.location.href).href;
  if (mediaClipCache.has(absoluteSrc)) return mediaClipCache.get(absoluteSrc);
  const audio = new Audio(absoluteSrc);
  audio.preload = "auto";
  audio.playsInline = true;
  audio.setAttribute?.("playsinline", "");
  audio.volume = 0.9;
  mediaClipCache.set(absoluteSrc, audio);
  try {
    audio.load();
  } catch {
    // Mobile WebViews may delay loading until the next user gesture.
  }
  return audio;
}

function preloadDecodedMediaClip(src) {
  if (!src || !/^https?:|^\.\//.test(src)) return null;
  return null;
}

function preloadLevelAudio() {
  const cfg = levelConfigs[state.level] || levelConfigs[0];
  const targetClip = GameAudioConfig.targetClips?.[cfg.targetClipId] || GameAudioConfig.targetClip;
  preloadMediaClip(targetClip?.src);
  preloadDecodedMediaClip(targetClip?.src);
  state.candidateOrder.forEach((clip) => {
    preloadMediaClip(clip.clipSrc);
    preloadDecodedMediaClip(clip.clipSrc);
  });
}

const rankSeeds = [
  ["1", 1, "5/5", "100%", "01:23", "0"],
  ["2", 2, "5/5", "96%", "01:35", "1"],
  ["3", 4, "5/5", "92%", "01:48", "0"],
  ["4", 3, "4/5", "88%", "01:52", "1"],
  ["5", 0, "4/5", "84%", "02:05", "2"],
];

function showScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === name);
  });
  if (name === "home") startHomeBgm();
  else if (name === "game") startGameBgm();
  else stopHomeBgm();
  if (name === "game") {
    startMovementLoop();
    startStatsTimer();
  } else {
    stopMovementLoop();
    stopStatsTimer();
    stopActiveSong();
    if (state.pendingFailTimer) {
      clearTimeout(state.pendingFailTimer);
      state.pendingFailTimer = 0;
    }
  }
  if (name !== "fail" && state.reviveTimer) {
    clearInterval(state.reviveTimer);
    state.reviveTimer = 0;
  }
  if (name === "rank") renderRank();
  if (name === "share") updateShareProgress();
  if (name !== "result") setResultPlaybackState(false);
  saveSession(name);
}

function resetPauseState() {
  document.querySelector(".hud-pause")?.classList.remove("is-paused");
  playfield.style.pointerEvents = "";
}

function setGamePaused(paused, { toast = true } = {}) {
  const btn = document.querySelector(".hud-pause");
  btn?.classList.toggle("is-paused", paused);
  playfield.style.pointerEvents = paused ? "none" : "";
  if (paused) {
    stopMovementLoop();
    stopActiveSong();
    stopHomeBgm(false);
  } else if (document.querySelector(".screen.active")?.dataset.screen === "game") {
    startMovementLoop();
    startGameBgm();
  }
  if (toast) showToast(paused ? "Demo：游戏已暂停，点击继续按钮恢复" : "Demo：游戏已继续");
}

function startGame() {
  resetPauseState();
  stopUiAudio(uiAudio.gameBgm);
  if (state.pendingFailTimer) clearTimeout(state.pendingFailTimer);
  if (state.reviveTimer) clearInterval(state.reviveTimer);
  state.pendingFailTimer = 0;
  state.reviveTimer = 0;
  state.level = 0;
  state.lives = 3;
  state.score = 0;
  state.mistakes = 0;
  state.revives = 0;
  state.hints = 0;
  state.startedAt = Date.now();
  saveSession("game");
  showScreen("game");
  loadLevel();
  playTarget();
}

function loadLevel() {
  const config = levelConfigs[state.level];
  state.lives = Math.max(state.lives, 3);
  state.currentSong = songs.find((song) => song.id === config.correctSongId) || songs[0];
  levelPill.textContent = `第 ${state.level + 1}/5 关`;
  targetHint.textContent = "任务：GILLIT，请找出正确哼唱这首歌的娃娃，把它拖动到应援棒身边！";
  stopTargetWandVisual();
  targetZone.classList.remove("ready");
  renderHearts();
  renderCandidates(config.candidates);
  preloadLevelAudio();
}

function renderHearts() {
  const slots = heartsEl.querySelectorAll(".hud-heart-slot");
  slots.forEach((slot, i) => {
    const alive = i < state.lives;
    if (alive) {
      slot.classList.remove("lost");
      slot.style.opacity = "";
      slot.style.transform = "";
    } else {
      slot.classList.add("lost");
    }
  });
}

/* 失去一条生命：从右到左触发消失动画 */
function loseHeartAnim() {
  const slots = Array.from(heartsEl.querySelectorAll(".hud-heart-slot"));
  // 找到当前最右侧还活着的爱心
  for (let i = slots.length - 1; i >= 0; i -= 1) {
    const slot = slots[i];
    if (!slot.classList.contains("lost")) {
      slot.classList.add("losing");
      setTimeout(() => {
        slot.classList.remove("losing");
        slot.classList.add("lost");
      }, 560);
      return;
    }
  }
}

function buildCandidates(config, count) {
  const clipPool = clips;
  const correctClip = clipPool.find((clip) => clip.id === config.correctClipId)
    || clipPool.find((clip) => clip.songId === config.correctSongId);
  const requestedCorrectCount = Math.max(1, config.correctCount || 1);
  const usedIds = new Set();
  const selected = [];
  if (correctClip) {
    selected.push({ ...correctClip, isCorrect: true });
    usedIds.add(correctClip.id);
  }
  selected.push(...takeUniqueClips(
    clipPool.filter((clip) => clip.songId === config.correctSongId),
    requestedCorrectCount - selected.length,
    usedIds,
  ).map((clip) => ({ ...clip, isCorrect: true })));

  const targetInstrumentalCount = Math.round(count * (config.instrumentalRatio || 0));
  const currentInstrumentalCount = selected.filter((clip) => clip.clipType === "instrumental").length;
  const neededInstrumentalDistractors = Math.max(0, targetInstrumentalCount - currentInstrumentalCount);
  const distractorPool = clipPool.filter((clip) => clip.songId !== config.correctSongId);
  const instrumentalDistractors = takeUniqueClips(
    distractorPool.filter((clip) => clip.clipType === "instrumental"),
    neededInstrumentalDistractors,
    usedIds,
  );
  selected.push(...instrumentalDistractors);

  const remaining = count - selected.length;
  const preferredVocalDistractors = takeUniqueClips(
    distractorPool.filter((clip) => clip.clipType === "vocal"),
    remaining,
    usedIds,
  );
  selected.push(...preferredVocalDistractors);

  if (selected.length < count) {
    selected.push(...takeUniqueClips(
      distractorPool,
      count - selected.length,
      usedIds,
    ));
  }

  const uniqueSelected = selected.slice(0, count);
  const correctCount = uniqueSelected.filter((clip) => clip.isCorrect).length;
  if (uniqueSelected.length < count || correctCount !== requestedCorrectCount) {
    console.warn("候选池不足，当前关卡未达到完整难度配置", { level: state.level + 1, count, uniqueSelected, correctCount });
  }
  return shuffle(uniqueSelected);
}

function takeUniqueClips(source, count, usedIds) {
  const picked = [];
  shuffle(source).forEach((clip) => {
    if (picked.length >= count) return;
    if (usedIds.has(clip.id)) return;
    usedIds.add(clip.id);
    picked.push(clip);
  });
  return picked;
}

function renderCandidates(count) {
  playfield.innerHTML = "";
  const config = levelConfigs[state.level] || levelConfigs[0];
  state.candidateOrder = buildCandidates(config, count);

  state.candidateOrder.forEach((song, index) => {
    const mascot = mascots[index % mascots.length];
    const direction = index % 2 ? "left" : "right";
    const button = document.createElement("button");
    const img = document.createElement("img");
    button.type = "button";
    button.className = "pet-card";
    button.dataset.songId = song.songId || song.id;
    button.dataset.clipId = song.id;
    button.dataset.correct = song.isCorrect ? "1" : "0";
    button.dataset.index = String(index);
    button.dataset.direction = direction;
    button.ariaLabel = `试听 ${mascot.name}`;
    button.frames = mascot[direction];
    button.frameIndex = index % button.frames.length;
    button.frameElapsed = 0;
    button.frameMs = getRunFrameMs(mascot.id);
    img.src = button.frames[button.frameIndex];
    img.alt = mascot.name;
    img.draggable = false;
    button.append(img);
    button.addEventListener("click", (event) => {
      if (state.dragging || button.dataset.suppressClick === "1") return;
      event.stopPropagation();
      playCandidate(button, song);
    });
    button.addEventListener("touchstart", (event) => {
      if (window.PointerEvent || state.dragging) return;
      if (event.cancelable) event.preventDefault();
      button.dataset.suppressClick = "1";
      setTimeout(() => {
        delete button.dataset.suppressClick;
      }, 260);
      playCandidate(button, song);
    }, { passive: false });
    button.addEventListener("pointerdown", (event) => startDrag(event, button, button.runner?.mascot || mascot));
    button.addEventListener("mousedown", (event) => startMouseDrag(event, button, button.runner?.mascot || mascot));
    playfield.append(button);
    setupRunner(button, index, direction);
  });
}

function startDrag(event, button, mascot) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  if (state.pendingDrag || state.dragging) cancelActiveDrag();
  if (isTouchPointerEvent(event) && event.cancelable) event.preventDefault();
  createDragGesture(event, button, mascot, event.pointerId);
  if (isTouchPointerEvent(event)) {
    const candidate = getCandidateForButton(button);
    if (candidate) {
      state.pendingDrag.auditionStarted = true;
      button.dataset.suppressClick = "1";
      setTimeout(() => {
        delete button.dataset.suppressClick;
      }, 260);
      playCandidate(button, candidate);
    }
  }
  button.setPointerCapture?.(event.pointerId);
  button.addEventListener("pointermove", dragMove);
  button.addEventListener("pointerup", endDrag, { once: true });
  button.addEventListener("pointercancel", endDrag, { once: true });
  button.addEventListener("lostpointercapture", cancelActiveDrag, { once: true });
  document.addEventListener("pointermove", dragMove);
  document.addEventListener("pointerup", endDrag, { once: true });
  document.addEventListener("pointercancel", endDrag, { once: true });
  window.addEventListener("blur", cancelActiveDrag, { once: true });
}

function startMouseDrag(event, button, mascot) {
  if (event.button !== 0 || state.pendingDrag || state.dragging) return;
  createDragGesture(event, button, mascot, "mouse");
  document.addEventListener("mousemove", mouseDragMove);
  document.addEventListener("mouseup", endMouseDrag, { once: true });
  window.addEventListener("blur", cancelActiveDrag, { once: true });
}

function createDragGesture(event, button, mascot, pointerId) {
  const rect = button.getBoundingClientRect();
  const playfieldRect = playfield.getBoundingClientRect();
  state.pendingDrag = {
    button,
    mascot,
    pointerId,
    moved: false,
    startClientX: event.clientX,
    startClientY: event.clientY,
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    playfieldLeft: playfieldRect.left,
    playfieldTop: playfieldRect.top,
  };
  state.pendingDrag.timeoutId = window.setTimeout(cancelActiveDrag, 8000);
}

function dragMove(event) {
  updateDragMove(event, event.pointerId);
}

function mouseDragMove(event) {
  updateDragMove(event, "mouse");
}

function updateDragMove(event, pointerId) {
  const drag = state.pendingDrag;
  if (!drag || drag.pointerId !== pointerId) return;
  const distance = Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY);
  if (!drag.moved && distance < DRAG_THRESHOLD) return;
  event.preventDefault();
  if (!drag.moved) {
    beginActiveDrag(drag);
  }
  const x = event.clientX - drag.playfieldLeft - drag.x;
  const y = event.clientY - drag.playfieldTop - drag.y;
  drag.button.style.left = `${x}px`;
  drag.button.style.top = `${y}px`;
  saveRunnerPosition(drag.button, x, y);
  const overTarget = intersects(drag.button.getBoundingClientRect(), targetZone.getBoundingClientRect());
  targetZone.classList.toggle("ready", overTarget);
}

function endDrag(event) {
  finishDrag(event, event.pointerId);
}

function endMouseDrag(event) {
  finishDrag(event, "mouse");
}

function finishDrag(event, pointerId) {
  const drag = state.pendingDrag;
  if (!drag || drag.pointerId !== pointerId) return;
  const { button, mascot } = drag;
  clearTimeout(drag.timeoutId);
  removeDragListeners(button);
  releasePointerCapture(button, drag.pointerId);
  button.classList.remove("dragging");
  targetZone.classList.remove("ready");
  state.pendingDrag = null;
  if (!drag.moved) {
    if (isTouchPointerEvent(event) && !drag.auditionStarted) {
      button.dataset.suppressClick = "1";
      setTimeout(() => {
        delete button.dataset.suppressClick;
      }, 220);
      const candidate = getCandidateForButton(button);
      if (candidate) playCandidate(button, candidate);
    }
    return;
  }

  button.dataset.suppressClick = "1";
  setTimeout(() => {
    delete button.dataset.suppressClick;
  }, 180);

  const playfieldRect = playfield.getBoundingClientRect();
  const rect = button.getBoundingClientRect();
  const x = rect.left - playfieldRect.left;
  const y = rect.top - playfieldRect.top;
  button.style.left = `${x}px`;
  button.style.top = `${y}px`;
  saveRunnerPosition(button, x, y);
  const isDrop = intersects(button.getBoundingClientRect(), targetZone.getBoundingClientRect());
  const direction = button.dataset.direction || "right";
  bindRunnerFrames(button, mascot, direction, button.frameIndex || 0);
  state.dragging = null;
  if (isDrop) judge(button.dataset.correct === "1");
}

function releasePointerCapture(button, pointerId) {
  if (!button || pointerId === "mouse") return;
  try {
    button.releasePointerCapture?.(pointerId);
  } catch {
    // The browser may already have released capture after a canceled gesture.
  }
}

function removeDragListeners(button) {
  button?.removeEventListener("pointermove", dragMove);
  button?.removeEventListener("pointerup", endDrag);
  button?.removeEventListener("pointercancel", endDrag);
  button?.removeEventListener("lostpointercapture", cancelActiveDrag);
  document.removeEventListener("pointermove", dragMove);
  document.removeEventListener("pointerup", endDrag);
  document.removeEventListener("pointercancel", endDrag);
  document.removeEventListener("mousemove", mouseDragMove);
  document.removeEventListener("mouseup", endMouseDrag);
  window.removeEventListener("blur", cancelActiveDrag);
}

function cancelActiveDrag() {
  const drag = state.pendingDrag;
  const button = drag?.button || state.dragging;
  if (drag) {
    releasePointerCapture(button, drag.pointerId);
    clearTimeout(drag.timeoutId);
    removeDragListeners(button);
  }
  button?.classList.remove("dragging");
  targetZone.classList.remove("ready");
  state.pendingDrag = null;
  state.dragging = null;
}

function getCandidateForButton(button) {
  const index = Number(button.dataset.index);
  return state.candidateOrder[index] || clips.find((clip) => clip.id === button.dataset.clipId);
}

function beginActiveDrag(drag) {
  const { button, mascot } = drag;
  const rect = button.getBoundingClientRect();
  const playfieldRect = playfield.getBoundingClientRect();
  drag.moved = true;
  state.dragging = button;
  clearPlaying(button);
  button.classList.add("dragging");
  button.querySelector("img").src = mascot.dragSrc;
  const x = rect.left - playfieldRect.left;
  const y = rect.top - playfieldRect.top;
  button.style.left = `${x}px`;
  button.style.top = `${y}px`;
  saveRunnerPosition(button, x, y);
}

function saveRunnerPosition(button, x, y) {
  if (!button.runner) return;
  button.runner.x = x;
  button.runner.y = y;
}

function setupRunner(button, index, direction) {
  const fieldWidth = Math.max(1, playfield.clientWidth);
  const fieldHeight = Math.max(1, playfield.clientHeight);
  const cardWidth = button.offsetWidth || 82;
  const cardHeight = button.offsetHeight || 98;
  const maxX = Math.max(8, fieldWidth - cardWidth - 8);
  const maxY = Math.max(10, fieldHeight - cardHeight - 12);
  const startX = 8 + Math.random() * Math.max(1, maxX - 8);
  const startY = 8 + Math.random() * Math.max(1, maxY - 8);
  const mascot = mascots[Number(button.dataset.index) % mascots.length];
  const speed = (86 + state.level * 18 + Math.random() * 68) * getRunSpeedMultiplier(mascot.id);
  const angle = Math.random() * Math.PI * 2;
  const pathType = Math.random() > 0.46 ? "curve" : "line";
  const sign = direction === "right" ? 1 : -1;
  const vx = Math.max(42, Math.abs(Math.cos(angle) * speed)) * sign;
  const vy = Math.sin(angle) * speed * 0.46;
  button.runner = {
    x: startX,
    y: startY,
    minX: 8,
    maxX,
    minY: 8,
    maxY,
    vx,
    vy,
    pathType,
    curveX: 5 + Math.random() * 14,
    curveY: 6 + Math.random() * 18,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.006 + Math.random() * 0.007,
    entering: false,
    mascot,
  };
  bindRunnerFrames(button, button.runner.mascot, direction, button.frameIndex || 0);
  button.style.left = `${startX}px`;
  button.style.top = `${startY}px`;
}

function startMovementLoop() {
  if (movementFrame) return;
  lastMoveAt = performance.now();
  movementFrame = requestAnimationFrame(moveRunners);
}

function stopMovementLoop() {
  if (!movementFrame) return;
  cancelAnimationFrame(movementFrame);
  movementFrame = 0;
}

/* ── 游戏计时器：仅更新时间数字 ── */
function startStatsTimer() {
  stopStatsTimer();
  updateStats();
  statsTimer = setInterval(updateStats, 500);
}

function stopStatsTimer() {
  if (statsTimer) { clearInterval(statsTimer); statsTimer = 0; }
}

function updateStats() {
  const seconds = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  if (statsTime) statsTime.textContent = `${mm}:${ss}`;
}

function getRunFrameMs(mascotId) {
  return RUN_FRAME_MS[mascotId] || RUN_FRAME_MS.default;
}

function getRunSpeedMultiplier(mascotId) {
  return RUN_SPEED_MULTIPLIER[mascotId] || 1;
}

function bindRunnerFrames(button, mascot, direction, frameIndex = 0) {
  const img = button.querySelector("img");
  button.dataset.direction = direction;
  button.ariaLabel = `试听 ${mascot.name}`;
  button.frames = mascot[direction];
  button.frameIndex = frameIndex % button.frames.length;
  button.frameElapsed = 0;
  button.frameMs = getRunFrameMs(mascot.id);
  img.src = button.frames[button.frameIndex];
  img.alt = mascot.name;
}

function advanceRunnerFrame(button, delta) {
  if (button.classList.contains("dragging") || !button.frames) return;
  button.frameElapsed = (button.frameElapsed || 0) + delta;
  const frameMs = button.frameMs || RUN_FRAME_MS.default;
  if (button.frameElapsed < frameMs) return;
  const steps = Math.floor(button.frameElapsed / frameMs);
  button.frameElapsed %= frameMs;
  button.frameIndex = (button.frameIndex + steps) % button.frames.length;
  button.querySelector("img").src = button.frames[button.frameIndex];
}


function moveRunners(now) {
  const delta = Math.min(48, now - lastMoveAt);
  lastMoveAt = now;
  [...playfield.children].forEach((button) => {
    if (!button.runner || button.classList.contains("dragging")) return;
    advanceRunnerFrame(button, delta);
    const runner = button.runner;

    // 正在执行退出动画：继续移动让娃娃滑出视野，但不重新检测边界
    if (button.dataset.exiting === "true") {
      runner.x += runner.vx * delta / 1000;
      runner.y += runner.vy * delta / 1000;
      runner.phase += delta * runner.phaseSpeed;
      const cx = runner.pathType === "curve" ? Math.cos(runner.phase * 0.9) * runner.curveX : 0;
      const cy = runner.pathType === "curve" ? Math.sin(runner.phase) * runner.curveY : 0;
      button.style.left = `${runner.x + cx}px`;
      button.style.top = `${runner.y + cy}px`;
      return;
    }

    runner.x += runner.vx * delta / 1000;
    runner.y += runner.vy * delta / 1000;
    runner.phase += delta * runner.phaseSpeed;

    const curveX = runner.pathType === "curve" ? Math.cos(runner.phase * 0.9) * runner.curveX : 0;
    const curveY = runner.pathType === "curve" ? Math.sin(runner.phase) * runner.curveY : 0;
    const drawX = runner.x + curveX;
    const drawY = runner.y + curveY;
    button.style.left = `${drawX}px`;
    button.style.top = `${drawY}px`;

    const card = {
      width: button.offsetWidth || 58,
      height: button.offsetHeight || 70,
    };
    const field = {
      width: playfield.clientWidth,
      height: playfield.clientHeight,
    };
    const hudHeight = document.querySelector('.game-hud')?.clientHeight || 56;
    const tzHeight = targetZone?.clientHeight || 200;
    // 娃娃需要几乎完全穿过上下区域才触发渐隐（约剩额头/脚尖才触发）
    const topMargin = hudHeight + 30;
    const bottomMargin = tzHeight + 40;
    if (runner.entering) {
      if (GameUtils.isIntersectingBounds({ x: drawX, y: drawY }, card, field, topMargin, bottomMargin)) {
        runner.entering = false;
        button.style.opacity = "1"; // 淡入出场
      }
      return;
    }
    if (!GameUtils.isOutsideBounds({ x: drawX, y: drawY }, card, field, topMargin, bottomMargin)) return;

    const exitSide = getExitSide(drawX, drawY, card, field, topMargin, bottomMargin);

    // 启动平滑退出动画：淡出 → 继续移动 → 重生到对侧 → 淡入
    button.dataset.exiting = "true";
    button.style.opacity = "0";

    setTimeout(() => {
      if (!button.runner) return;
      respawnRunner(button, exitSide, card, field);
      button.style.opacity = "0"; // 保持不可见，等 entering 结束后淡入
      button.dataset.exiting = "false";
    }, 350);
  });
  movementFrame = requestAnimationFrame(moveRunners);
}

function getExitSide(x, y, card, field, topMargin = 0, bottomMargin = 0) {
  if (x > field.width) return "right";
  if (x + card.width < 0) return "left";
  if (y > field.height + bottomMargin) return "bottom";
  return "top";
}

function respawnRunner(button, exitSide, card, field) {
  const plan = GameUtils.createRespawnPlan({
    exitSide,
    fieldWidth: field.width,
    fieldHeight: field.height,
    cardWidth: card.width,
    cardHeight: card.height,
    level: state.level,
    mascotCount: mascots.length,
  });
  const runner = button.runner;
  Object.assign(runner, plan);
  runner.entering = true;
  runner.minX = -card.width - 12;
  runner.maxX = field.width + 12;
  runner.minY = -card.height - 12;
  runner.maxY = field.height + 12;
  runner.mascot = mascots[plan.mascotIndex];
  const speedMultiplier = getRunSpeedMultiplier(runner.mascot.id);
  runner.vx *= speedMultiplier;
  runner.vy *= speedMultiplier;
  const direction = runner.vx >= 0 ? "right" : "left";
  bindRunnerFrames(button, runner.mascot, direction, Math.floor(Math.random() * runner.mascot[direction].length));
  button.style.left = `${runner.x}px`;
  button.style.top = `${runner.y}px`;
}

function setRunnerDirection(button, direction) {
  if (button.dataset.direction === direction) return;
  bindRunnerFrames(button, button.runner.mascot, direction, 0);
}

function judge(isCorrect) {
  if (isCorrect) {
    if (state.pendingFailTimer) {
      clearTimeout(state.pendingFailTimer);
      state.pendingFailTimer = 0;
    }
    state.score += 200 + state.level * 80 + state.lives * 30;
    targetWand.src = "./assets/wand_light_2.png";
    playSuccess();
    showResult();
  } else {
    state.mistakes += 1;
    state.lives -= 1;
    loseHeartAnim();
    playWrong({ fatal: state.lives <= 0 });
    if (state.lives <= 0) {
      if (state.pendingFailTimer) clearTimeout(state.pendingFailTimer);
      state.pendingFailTimer = window.setTimeout(() => {
        state.pendingFailTimer = 0;
        const activeScreen = document.querySelector(".screen.active")?.dataset.screen;
        if (activeScreen === "game" && state.lives <= 0) showScreen("fail");
      }, 600);
    } else {
      showToast("不是这首，再听听");
    }
  }
  saveSession(document.querySelector(".screen.active")?.dataset.screen || "game");
}

function showResult() {
  resultSong.textContent = state.currentSong.title;
  resultMeta.textContent = `${state.currentSong.artist} · 得分 +${200 + state.level * 80}`;
  // 设置专辑封面：优先使用 currentSong 的 albumArt，兜底用默认封面
  const cover = document.querySelector("#resultAlbumArt");
  if (cover) cover.src = state.currentSong.albumArt || "./assets/album_super_real_me.jpg";
  setResultPlaybackState(false);
  stopStatsTimer();
  stopActiveSong();
  showScreen("result");
  playResultPreviewOnce();
}

function nextLevel() {
  if (state.level >= 4) {
    showScreen("share");
    return;
  }
  state.level += 1;
  state.lives = 3;
  resetPauseState();
  showScreen("game");
  loadLevel();
  playTarget();
}

function updateShareProgress() {
  const passedLevel = Math.max(1, Math.min(5, state.level + 1));
  if (shareRank) shareRank.textContent = `我已通过第 ${passedLevel} 关`;
}

function openShareScreen() {
  const activeScreen = document.querySelector(".screen.active")?.dataset.screen;
  shareReturnScreen = activeScreen && activeScreen !== "share" ? activeScreen : "home";
  showScreen("share");
}

function returnFromShareScreen() {
  showScreen(shareReturnScreen || "home");
}

function revive() {
  if (state.reviveTimer) return;
  state.revives += 1;
  let count = 3;
  showToast(`广告播放中 ${count}s`);
  state.reviveTimer = setInterval(() => {
    count -= 1;
    if (count > 0) {
      showToast(`广告播放中 ${count}s`);
    } else {
      clearInterval(state.reviveTimer);
      state.reviveTimer = 0;
      state.lives = 2;
      resetPauseState();
      showScreen("game");
      renderHearts();
      showToast("复活成功，继续抓同歌");
    }
  }, 850);
}

function renderRank() {
  const ownScore = Math.max(state.score, 650);
  const rows = [
    ...rankSeeds.map(([rank, mascotIndex, levels, rate, time, revive]) => {
      const mascot = mascots[mascotIndex] || mascots[0];
      return [rank, mascot.src, mascot.name, levels, rate, time, revive];
    }),
    ["86", mascots[2].src, "我自己", `${Math.min(5, state.level + 1)}/5`, `${Math.max(68, 100 - state.mistakes * 8)}%`, elapsed(), String(state.revives)],
  ];
  rankList.innerHTML = rows
    .map(
      ([rank, avatar, name, levels, rate, time, revive]) => `
        <li class="${name === "我自己" ? "current" : ""}">
          <strong>${rank}</strong>
          <img src="${avatar}" alt="" />
          <span>${name}<small>${levels} · 正确率 ${rate}</small></span>
          <span>${time}<small>复活 ${revive}</small></span>
        </li>
      `,
    )
    .join("");
}

function elapsed() {
  if (!state.startedAt) return "00:00";
  const seconds = Math.max(1, Math.floor((Date.now() - state.startedAt) / 1000));
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function ensureAudio() {
  if (!state.audio) {
    state.audio = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (state.audio.state === "suspended") state.audio.resume();
  return state.audio;
}

function playUiAudio(audio, { restart = true, catchErrors = true } = {}) {
  if (!audio) return null;
  try {
    if (restart) {
      audio.pause();
      audio.currentTime = 0;
    }
    const playback = audio.play();
    if (catchErrors && playback && typeof playback.catch === "function") {
      playback.catch(() => {});
    }
    return playback;
  } catch {
    return null;
  }
}

function stopUiAudio(audio, reset = true) {
  if (!audio) return;
  audio.pause();
  if (reset) audio.currentTime = 0;
}

function startLoopingBgm(audio, volume, { restart = false } = {}) {
  if (!audio) return;
  if (!restart && !audio.paused) return;
  if (restart) {
    audio.pause();
    audio.currentTime = 0;
  }
  audio.volume = volume;
  if (document.hidden) {
    homeBgmPending = true;
    setHomeBgmState("pending");
    return;
  }
  setHomeBgmState("starting");
  const playback = playUiAudio(audio, { restart: false, catchErrors: false });
  if (playback && typeof playback.then === "function") {
    playback
      .then(() => {
        homeBgmPending = false;
        setHomeBgmState("playing");
      })
      .catch(() => {
        homeBgmPending = true;
        setHomeBgmState("blocked");
      });
  } else {
    homeBgmPending = !playback;
    setHomeBgmState(playback ? "playing" : "blocked");
  }
}

function startHomeBgm({ restart = false } = {}) {
  stopUiAudio(uiAudio.gameBgm);
  startLoopingBgm(uiAudio.homeBgm, HOME_BGM_VOLUME, { restart });
}

function startGameBgm() {
  stopUiAudio(uiAudio.homeBgm);
  startLoopingBgm(uiAudio.gameBgm, GAME_BGM_VOLUME);
}

function stopHomeBgm(reset = true) {
  homeBgmPending = false;
  setHomeBgmState("stopped");
  stopUiAudio(uiAudio.homeBgm, reset);
  stopUiAudio(uiAudio.gameBgm, reset);
}

function unlockHomeBgm() {
  if (document.body.classList.contains("splash-active") && !document.body.classList.contains("splash-entering")) return;
  const activeScreen = document.querySelector(".screen.active")?.dataset.screen;
  if (activeScreen === "game" && (homeBgmPending || uiAudio.gameBgm?.paused)) startGameBgm();
  else if (activeScreen === "home" && (homeBgmPending || uiAudio.homeBgm?.paused)) startHomeBgm();
}

function playButtonClickSfx() {
  playUiAudio(uiAudio.button);
}

function playTarget() {
  const cfg = levelConfigs[state.level] || levelConfigs[0];
  const targetClip = GameAudioConfig.targetClips?.[cfg.targetClipId] || GameAudioConfig.targetClip;
  const duration = targetClip?.duration || GameAudioConfig.targetClip.duration;
  playMediaClip(targetClip?.src || GameAudioConfig.targetClip.src, duration, targetClip?.start || 0);
  startTargetWandVisual(duration);
  targetHint.textContent = "任务：GILLIT，请找出正确哼唱这首歌的娃娃，把它拖动到应援棒身边！";
}

function startTargetWandVisual(duration) {
  if (!targetWand || !targetPlayButton) return;
  if (state.targetVisualTimer) clearTimeout(state.targetVisualTimer);
  targetWand.src = "./assets/wand_light_1.png";
  targetPlayButton.classList.remove("is-playing");
  void targetPlayButton.offsetWidth;
  targetPlayButton.classList.add("is-playing");
  state.targetVisualTimer = window.setTimeout(() => {
    stopTargetWandVisual();
  }, duration * 1000);
}

function stopTargetWandVisual() {
  if (state.targetVisualTimer) {
    clearTimeout(state.targetVisualTimer);
    state.targetVisualTimer = 0;
  }
  targetPlayButton?.classList.remove("is-playing");
  if (targetWand) targetWand.src = "./assets/wand_off.png";
}

function playMediaClip(src, duration, start = 0) {
  stopActiveSong();
  const absoluteSrc = new URL(src, window.location.href).href;
  if (start === 0 && playDecodedMediaClip(absoluteSrc, duration)) return;
  const media = (start === 0 && mediaClipCache.get(absoluteSrc)) || state.mediaAudio || new Audio();
  state.mediaAudio = media;
  media.playsInline = true;
  media.setAttribute?.("playsinline", "");
  media.preload = "auto";
  media.volume = 0.9;
  const shouldReload = media.src !== absoluteSrc;
  if (shouldReload) media.src = absoluteSrc;
  let seeked = false;
  const seekToStart = () => {
    if (seeked) return;
    seeked = true;
    try {
      media.currentTime = Math.max(0, start);
    } catch {
      // Some mobile browsers allow seeking only after playback has started.
    }
  };
  const beginPlayback = () => {
    seekToStart();
    media.muted = false;
    const playback = media.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => {
        try {
          media.load();
        } catch {
          // Ignore reload failures; the next user tap will retry playback.
        }
        showToast("音频暂时无法播放，请再点一次");
      });
    }
  };

  if (media.readyState >= 1 || start === 0) {
    beginPlayback();
  } else {
    media.addEventListener("loadedmetadata", beginPlayback, { once: true });
    const earlyPlayback = media.play();
    if (earlyPlayback && typeof earlyPlayback.catch === "function") {
      earlyPlayback.catch(() => {});
    }
    media.load();
  }
  state.mediaStopTimer = window.setTimeout(() => {
    media.pause();
    try {
      media.currentTime = Math.max(0, start);
    } catch {
      media.currentTime = 0;
    }
    state.mediaStopTimer = 0;
  }, duration * 1000);
}

function playDecodedMediaClip(src, duration) {
  const buffer = decodedClipCache.get(src);
  if (!buffer) return false;
  const audio = ensureAudio();
  const source = audio.createBufferSource();
  const gain = audio.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(0.9, audio.currentTime);
  source.connect(gain);
  gain.connect(audio.destination);
  state.activeMediaNode = { source, gain };
  source.addEventListener("ended", () => {
    if (state.activeMediaNode?.source === source) state.activeMediaNode = null;
    try {
      source.disconnect();
      gain.disconnect();
    } catch {
      // Node may already be disconnected by an explicit stop.
    }
  }, { once: true });
  try {
    source.start(0, 0, Math.min(duration, buffer.duration));
  } catch {
    return false;
  }
  state.mediaStopTimer = window.setTimeout(() => {
    try {
      source.stop();
    } catch {
      // Already stopped.
    }
    state.mediaStopTimer = 0;
  }, duration * 1000);
  return true;
}

function playSong(song, durationFactor = 1, offset = 0) {
  const audio = ensureAudio();
  stopActiveSong(audio);
  const now = audio.currentTime + 0.02;
  const master = audio.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
  master.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.36, durationFactor * 1.55));
  master.connect(audio.destination);
  state.activeSongMaster = master;
  const activeMaster = master;
  setTimeout(() => {
    if (state.activeSongMaster === activeMaster) state.activeSongMaster = null;
    try {
      activeMaster.disconnect();
    } catch {
      // It may have been faded out by a newer clip.
    }
  }, Math.max(420, durationFactor * 1700));

  const notes = song.notes.slice();
  const startIndex = Math.floor(offset * notes.length);
  notes.slice(startIndex).forEach((freq, index) => {
    const start = now + index * 0.22 * durationFactor;
    const stop = start + 0.18 * durationFactor;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = index % 2 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.65, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(stop + 0.03);
  });
}

function stopActiveSong(audio = state.audio) {
  clearResultPlaybackTimer();
  stopTargetWandVisual();
  if (state.mediaStopTimer) {
    clearTimeout(state.mediaStopTimer);
    state.mediaStopTimer = 0;
  }
  if (state.mediaAudio) {
    state.mediaAudio.pause();
    state.mediaAudio.currentTime = 0;
  }
  if (state.activeMediaNode) {
    try {
      state.activeMediaNode.source.stop();
    } catch {
      // Already stopped.
    }
    try {
      state.activeMediaNode.source.disconnect();
      state.activeMediaNode.gain.disconnect();
    } catch {
      // Already disconnected.
    }
    state.activeMediaNode = null;
  }
  state.toneOscillators.forEach((oscillator) => {
    try {
      oscillator.stop();
      oscillator.disconnect();
    } catch {
      // Oscillator may have already ended.
    }
  });
  state.toneOscillators.clear();

  if (!state.activeSongMaster || !audio) return;
  const master = state.activeSongMaster;
  const now = audio.currentTime;
  try {
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(0.0001, now, 0.018);
    setTimeout(() => master.disconnect(), 90);
  } catch {
    // The clip may already have finished and disconnected.
  }
  state.activeSongMaster = null;
}

function playSuccess() {
  stopUiAudio(uiAudio.wrong);
  stopUiAudio(uiAudio.fail);
  stopUiAudio(uiAudio.failExtra);
  const playback = playUiAudio(uiAudio.success, { catchErrors: false });
  if (playback && typeof playback.catch === "function") {
    playback.catch(() => playSuccessSynth());
  } else if (!playback) {
    playSuccessSynth();
  }
}

/* ── 庆祝通关兜底音效：上升琶音 + 钟声 ── */
function playSuccessSynth() {
  const audio = ensureAudio();
  const now = audio.currentTime;

  // 主旋律：C5 → E5 → G5 → C6 上升琶音
  const melody = [
    { freq: 523.25, time: 0 },
    { freq: 659.25, time: 0.10 },
    { freq: 783.99, time: 0.20 },
    { freq: 1046.50, time: 0.30 },
  ];

  melody.forEach(({ freq, time }) => {
    const t = now + time;

    // 主音：sine wave，模拟钟声
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    osc.connect(gain);
    gain.connect(audio.destination);
    state.toneOscillators.add(osc);
    osc.addEventListener("ended", () => state.toneOscillators.delete(osc), { once: true });
    osc.start(t);
    osc.stop(t + 0.44);

    // 泛音层：三角形波，1 倍频，增加亮度和存在感
    const osc2 = audio.createOscillator();
    const gain2 = audio.createGain();
    osc2.type = "triangle";
    osc2.frequency.value = freq * 2;
    gain2.gain.setValueAtTime(0.08, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc2.connect(gain2);
    gain2.connect(audio.destination);
    state.toneOscillators.add(osc2);
    osc2.addEventListener("ended", () => state.toneOscillators.delete(osc2), { once: true });
    osc2.start(t);
    osc2.stop(t + 0.34);
  });

  // 结尾高音点缀：C7 泛音闪烁
  const sparkle = audio.createOscillator();
  const sparkleGain = audio.createGain();
  sparkle.type = "sine";
  sparkle.frequency.value = 2093;
  sparkleGain.gain.setValueAtTime(0.10, now + 0.42);
  sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.82);
  sparkle.connect(sparkleGain);
  sparkleGain.connect(audio.destination);
  state.toneOscillators.add(sparkle);
  sparkle.addEventListener("ended", () => state.toneOscillators.delete(sparkle), { once: true });
  sparkle.start(now + 0.42);
  sparkle.stop(now + 0.84);
}

function playWrong({ fatal = false } = {}) {
  stopActiveSong();
  stopUiAudio(uiAudio.button);
  stopUiAudio(uiAudio.success);
  stopUiAudio(uiAudio.wrong);
  stopUiAudio(uiAudio.fail);
  stopUiAudio(uiAudio.failExtra);
  if (fatal) {
    stopHomeBgm();
    const fallback = () => playWrongSynth();
    const extraPlayback = playUiAudio(uiAudio.failExtra, { catchErrors: false });
    window.setTimeout(() => {
      const voicePlayback = playUiAudio(uiAudio.fail, { catchErrors: false });
      if (voicePlayback && typeof voicePlayback.catch === "function") voicePlayback.catch(fallback);
      else if (!voicePlayback && !extraPlayback) fallback();
    }, 90);
    if (extraPlayback && typeof extraPlayback.catch === "function") extraPlayback.catch(() => {});
    return;
  }
  const playback = playUiAudio(uiAudio.wrong, { catchErrors: false });
  if (playback && typeof playback.catch === "function") playback.catch(() => playWrongSynth());
  else if (!playback) {
    playWrongSynth();
  }
}

/* ── 失败兜底音效：下降 Buzzer ── */
function playWrongSynth() {
  const audio = ensureAudio();
  const now = audio.currentTime;

  // 下降三个半音：D4 → C#4 → C4，带低通滤波制造 buzzer 感
  const buzzNotes = [
    { freq: 293.66, time: 0 },
    { freq: 277.18, time: 0.09 },
  ];

  buzzNotes.forEach(({ freq, time }) => {
    const t = now + time;

    // 低频加厚层
    const oscLow = audio.createOscillator();
    const gainLow = audio.createGain();
    oscLow.type = "square";
    oscLow.frequency.value = freq * 0.5;
    gainLow.gain.setValueAtTime(0.08, t);
    gainLow.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    oscLow.connect(gainLow);
    gainLow.connect(audio.destination);
    state.toneOscillators.add(oscLow);
    oscLow.addEventListener("ended", () => state.toneOscillators.delete(oscLow), { once: true });
    oscLow.start(t);
    oscLow.stop(t + 0.16);

    // 主体：sawtooth + 低通滤波
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.12);
    filter.Q.value = 1.2;
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    state.toneOscillators.add(osc);
    osc.addEventListener("ended", () => state.toneOscillators.delete(osc), { once: true });
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

function playTone(notes, step, type, volume) {
  const audio = ensureAudio();
  notes.forEach((freq, index) => {
    const start = audio.currentTime + index * step;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + step);
    osc.connect(gain);
    gain.connect(audio.destination);
    state.toneOscillators.add(osc);
    osc.addEventListener("ended", () => state.toneOscillators.delete(osc), { once: true });
    osc.start(start);
    osc.stop(start + step + 0.02);
  });
}

function playCandidate(button, song) {
  document.querySelectorAll(".pet-card.playing").forEach((item) => {
    if (item !== button) clearPlaying(item);
  });
  const config = levelConfigs[state.level];
  const src = song.clipSrc;
  if (!src) return;
  playMediaClip(src, song.candidateDuration || config.duration, song.start || 0);
  flashPlaying(button, config.duration * 1000 + 120);
}

function flashPlaying(button, duration = 650) {
  clearPlaying(button);
  button.classList.add("playing");
  button.playingTimer = setTimeout(() => clearPlaying(button), duration);
}

function clearPlaying(button) {
  clearTimeout(button.playingTimer);
  button.classList.remove("playing");
}

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function shuffle(items) {
  return items
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

let toastTimer;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1400);
}

function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve();
      return;
    }
    const image = new Image();
    const done = () => resolve();
    const timer = window.setTimeout(done, 6500);
    image.onload = () => {
      clearTimeout(timer);
      if (image.decode) image.decode().catch(() => {}).finally(done);
      else done();
    };
    image.onerror = () => {
      clearTimeout(timer);
      done();
    };
    image.src = src;
  });
}

function collectSplashImageAssets() {
  const assets = new Set([
    "./assets/game_bg_storybook.png",
    "./assets/home_share_top.png",
    "./assets/home_title_illit.png?v=20260720-mainlogo1",
    "./assets/home_btn_start.png",
    "./assets/home_btn_rank.png",
    "./assets/home_footer_logo.png",
  ]);
  mascots.forEach((mascot) => assets.add(mascot.src));
  return [...assets];
}

function collectDeferredImageAssets() {
  const assets = new Set();
  assets.add("./assets/singing_bubble.png");
  document.querySelectorAll("img").forEach((img) => {
    if (img.closest(".preview-rail")) return;
    const src = img.getAttribute("src");
    if (src) assets.add(src);
  });
  [
    "./assets/game_bg_storybook.png",
    "./assets/game_bg_play.png",
    "./assets/rank_bg_soft_pink_blue.png",
    "./assets/rank_panel_bg_new.png",
    "./assets/fail_bg.png",
    "./assets/song_card.png",
    "./assets/share_modal_composite_base_layout2.png",
    "./assets/rule_modal_bg.png",
    "./assets/target_glow.png",
    "./assets/wand_off.png",
    "./assets/wand_light_1.png",
    "./assets/wand_light_2.png",
    "./assets/btn_play.png",
    "./assets/btn_pause.png",
    "./assets/fail_title.png",
  ].forEach((asset) => assets.add(asset));
  ruleSlides.forEach((slide) => assets.add(slide.src));
  mascots.forEach((mascot) => {
    assets.add(mascot.src);
    assets.add(mascot.dragSrc);
    mascot.left.forEach((src) => assets.add(src));
    mascot.right.forEach((src) => assets.add(src));
  });
  songs.forEach((song) => {
    if (song.albumArt) assets.add(song.albumArt);
  });
  return [...assets];
}

function preloadDeferredImages() {
  window.setTimeout(() => {
    collectDeferredImageAssets().forEach((src) => {
      preloadImage(src);
    });
  }, 450);
}

function waitForSplashAnimation() {
  return new Promise((resolve) => {
    if (!splashProgress) {
      resolve();
      return;
    }
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    splashProgress.addEventListener("animationend", done, { once: true });
    window.setTimeout(done, 8700);
  });
}

function dismissSplashImmediately() {
  splashIntro?.remove();
  document.body.classList.remove("splash-active", "splash-entering");
}

function enterFromSplash() {
  if (!splashIntro?.classList.contains("is-ready")) return;
  document.body.classList.add("splash-entering");
  prewarmAudio();
  startHomeBgm();
  splashIntro.classList.add("is-exiting");
  window.setTimeout(() => {
    dismissSplashImmediately();
    preloadDeferredImages();
  }, 760);
}

async function initSplashIntro() {
  if (!splashIntro || !splashEnter || !splashText) {
    return;
  }
  const imageReady = Promise.allSettled(collectSplashImageAssets().map(preloadImage));
  await Promise.all([waitForSplashAnimation(), imageReady]);
  splashText.textContent = "轻触进入";
  splashEnter.disabled = false;
  splashIntro.classList.add("is-ready");
  splashEnter.addEventListener("click", enterFromSplash, { once: true });
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  unlockHomeBgm();
  const button = target?.closest("button");
  if (!button) return;
  if (button.closest(".pet-card, .wand-play, .mini-replay")) return;
  playButtonClickSfx();
}, true);

document.addEventListener("pointerdown", unlockHomeBgm, { capture: true });
document.addEventListener("touchstart", unlockHomeBgm, { passive: true, capture: true });
document.addEventListener("touchstart", suppressNativeTouch, { passive: false, capture: true });
document.addEventListener("touchmove", suppressNativeTouch, { passive: false, capture: true });
document.addEventListener("touchend", suppressNativeTouch, { passive: false, capture: true });
document.addEventListener("touchcancel", suppressNativeTouch, { passive: false, capture: true });
document.addEventListener("keydown", unlockHomeBgm, { capture: true });
document.addEventListener("contextmenu", suppressNativeContext, { capture: true });
document.addEventListener("dragstart", suppressNativeContext, { capture: true });
document.addEventListener("selectstart", suppressNativeContext, { capture: true });

document.querySelectorAll(".start-game").forEach((button) => button.addEventListener("click", startGame));
// 注意：.to-home 绑定排除 .hud-back——后者有独立的弹窗确认流程
document.querySelectorAll(".to-home:not(.hud-back)").forEach((button) => button.addEventListener("click", () => showScreen("home")));
document.querySelectorAll(".open-rank").forEach((button) => button.addEventListener("click", () => showScreen("rank")));
document.querySelectorAll(".open-share").forEach((button) => button.addEventListener("click", openShareScreen));
skinPrevButtons.forEach((button) => button.addEventListener("click", () => cycleSkin(-1)));
skinNextButtons.forEach((button) => button.addEventListener("click", () => cycleSkin(1)));
document.querySelector(".share-return")?.addEventListener("click", returnFromShareScreen);
document.querySelector(".home-share-top")?.addEventListener("click", openHomeShareModal);
document.querySelector(".next-level").addEventListener("click", nextLevel);
document.querySelector(".listen-full").addEventListener("click", () => {
  showToast("Demo：这里会跳转 QQ音乐完整播放页");
  showScreen("rank");
});
document.querySelector(".retry-btn").addEventListener("click", startGame);
document.querySelector(".revive-btn").addEventListener("click", revive);
document.querySelector("#targetPlay").addEventListener("click", playTarget);
document.querySelector("#replayBtn").addEventListener("click", playTarget);
document.querySelector(".pause-btn").addEventListener("click", () => {
  const btn = document.querySelector(".hud-pause");
  setGamePaused(!btn?.classList.contains("is-paused"));
});
document.querySelector("#ruleBtn").addEventListener("click", () => {
  openRuleModal();
});

function clearResultPlaybackTimer() {
  if (!resultPlaybackTimer) return;
  clearTimeout(resultPlaybackTimer);
  resultPlaybackTimer = 0;
}

function setResultPlaybackState(isPlaying) {
  clearResultPlaybackTimer();
  resultPlaying = isPlaying;
  if (resultPlayBtn) {
    resultPlayBtn.dataset.state = isPlaying ? "play" : "pause";
    resultPlayBtn.classList.toggle("is-playing", isPlaying);
  }
  if (resultPlayImg) resultPlayImg.src = isPlaying ? "./assets/btn_pause.png" : "./assets/btn_play.png";
}

function playResultPreviewOnce() {
  const duration = state.currentSong.fullDuration || 15;
  const src = state.currentSong.fullSrc || GameAudioConfig.targetClip.src;
  playMediaClip(src, duration);
  setResultPlaybackState(true);
  resultPlaybackTimer = window.setTimeout(() => {
    setResultPlaybackState(false);
  }, duration * 1000 + 200);
}

/* ── 成功页 Play/Pause 按钮 ── */
if (resultPlayBtn) {
  resultPlayBtn.addEventListener("click", () => {
    if (resultPlaying) {
      stopActiveSong();
      setResultPlaybackState(false);
    } else {
      playResultPreviewOnce();
    }
  });
}

function openRuleModal() {
  if (!ruleModal) return;
  ruleModalWasPaused = document.querySelector(".hud-pause")?.classList.contains("is-paused") || false;
  setGamePaused(true, { toast: false });
  setRuleSlide(0);
  ruleModal.hidden = false;
  setTimeout(() => {
    ruleModal.querySelector('[data-action="rule-close"]')?.focus();
  }, 0);
}

function closeRuleModal() {
  if (!ruleModal) return;
  ruleModal.hidden = true;
  if (!ruleModalWasPaused) setGamePaused(false, { toast: false });
}

if (ruleModal) {
  ruleModal.addEventListener("click", (e) => {
    if (e.target === ruleModal) closeRuleModal();
  });
  ruleModal.querySelector('[data-action="rule-close"]')?.addEventListener("click", closeRuleModal);
  ruleModal.querySelector("[data-rule-prev]")?.addEventListener("click", () => changeRuleSlide(-1));
  ruleModal.querySelector("[data-rule-next]")?.addEventListener("click", () => changeRuleSlide(1));
  ruleModal.querySelector(".rule-carousel")?.addEventListener("pointerdown", (event) => {
    ruleSwipeStartX = event.clientX;
  });
  ruleModal.querySelector(".rule-carousel")?.addEventListener("pointerup", (event) => {
    const delta = event.clientX - ruleSwipeStartX;
    if (Math.abs(delta) < 28) return;
    changeRuleSlide(delta < 0 ? 1 : -1);
  });
}

function setRuleSlide(index) {
  if (!ruleSlideImage || ruleSlides.length === 0) return;
  ruleSlideIndex = (index + ruleSlides.length) % ruleSlides.length;
  const slide = ruleSlides[ruleSlideIndex];
  ruleSlideImage.src = slide.src;
  ruleSlideImage.alt = slide.alt;
  ruleDots.forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === ruleSlideIndex));
}

function changeRuleSlide(step) {
  setRuleSlide(ruleSlideIndex + step);
}

function openHomeShareModal() {
  if (!homeShareModal) return;
  const homeShareProgress = document.querySelector("#homeShareProgress");
  if (homeShareProgress) {
    homeShareProgress.textContent = "是ILLIT粉丝就来和我一起玩！";
  }
  homeShareModal.hidden = false;
  setTimeout(() => {
    homeShareModal.querySelector('[data-action="share-close"]')?.focus();
  }, 0);
}

function closeHomeShareModal() {
  if (homeShareModal) homeShareModal.hidden = true;
}

if (homeShareModal) {
  homeShareModal.addEventListener("click", (e) => {
    if (e.target === homeShareModal) closeHomeShareModal();
  });
  homeShareModal.querySelector('[data-action="share-close"]')?.addEventListener("click", closeHomeShareModal);
  homeShareModal.querySelectorAll(".share-mascot-btn").forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.remove("is-loved");
      void button.offsetWidth;
      button.classList.add("is-loved");
      setTimeout(() => button.classList.remove("is-loved"), 820);
    });
  });
}

/* 游戏中返回确认弹窗 */
const exitModal = document.getElementById("exitModal");
function openExitConfirm() {
  if (!exitModal) {
    showScreen("home");
    return;
  }
  exitModal.hidden = false;
  // 焦点移到取消按钮（默认安全选项）
  setTimeout(() => {
    const cancelBtn = exitModal.querySelector('[data-action="cancel"]');
    if (cancelBtn) cancelBtn.focus();
  }, 30);
}
function closeExitConfirm() {
  if (exitModal) exitModal.hidden = true;
}
function confirmExit() {
  closeExitConfirm();
  showScreen("home");
}
if (exitModal) {
  exitModal.addEventListener("click", (e) => {
    if (e.target === exitModal) closeExitConfirm(); // 点击遮罩关闭
  });
  exitModal.querySelectorAll(".modal-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      if (action === "confirm") confirmExit();
      else closeExitConfirm();
    });
  });
  // ESC 关闭
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (homeShareModal && !homeShareModal.hidden) closeHomeShareModal();
    else if (ruleModal && !ruleModal.hidden) closeRuleModal();
    else if (!exitModal.hidden) closeExitConfirm();
  });
}

const hudBack = document.querySelector(".hud-back");
if (hudBack) {
  // 移除默认的 .to-home 行为：游戏页点击改为弹窗确认
  hudBack.classList.remove("to-home");
  hudBack.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    openExitConfirm();
  });
}

function suspendGameActivity() {
  stopMovementLoop();
  stopActiveSong();
  stopUiAudio(uiAudio.button);
  stopUiAudio(uiAudio.success);
  stopUiAudio(uiAudio.wrong);
  stopUiAudio(uiAudio.fail);
  stopHomeBgm();
}

window.addEventListener("pagehide", suspendGameActivity);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    suspendGameActivity();
    return;
  }
  const activeScreen = document.querySelector(".screen.active")?.dataset.screen;
  const paused = document.querySelector(".hud-pause")?.classList.contains("is-paused");
  if (activeScreen === "game" && !paused) {
    startMovementLoop();
    startGameBgm();
  }
  if (activeScreen === "home") startHomeBgm();
});

function applyPreviewRoute() {
  const params = new URLSearchParams(window.location.search);
  const preview = params.get("preview");
  if (!preview) return false;

  dismissSplashImmediately();
  document.documentElement.classList.add("preview-capture");
  state.startedAt = Date.now() - 19000;
  state.level = Math.min(Math.max(Number(params.get("level") || 1) - 1, 0), levelConfigs.length - 1);
  state.lives = 3;
  state.score = 200;
  state.mistakes = 0;
  state.revives = 0;
  state.hints = 0;
  state.currentSong = songs[0];

  if (preview === "game") {
    showScreen("game");
    loadLevel();
    return true;
  }

  if (preview === "result") {
    state.currentSong = songs.find((song) => song.id === "magnetic") || songs[0];
    resultSong.textContent = state.currentSong.title || "Magnetic";
    resultMeta.textContent = `${state.currentSong.artist || "ILLIT"} · 得分 +200`;
    if (resultAlbumArt) resultAlbumArt.src = state.currentSong.albumArt || "./assets/album_super_real_me.jpg";
    showScreen("result");
    return true;
  }

  if (preview === "fail") {
    failCopy.textContent = "再听一次，差一点就抓到了！";
    showScreen("fail");
    return true;
  }

  if (preview === "rank") {
    state.level = 4;
    showScreen("rank");
    return true;
  }

  if (preview === "share") {
    showScreen("home");
    openHomeShareModal();
    return true;
  }

  showScreen("home");
  return true;
}

function applyStoredSession() {
  const saved = readSession();
  if (!saved) return false;

  if (saved.skinId && !skinParam) setActiveSkin(saved.skinId, { persist: true });
  dismissSplashImmediately();
  shareReturnScreen = saved.returnScreen && RESTORABLE_SCREENS.has(saved.returnScreen) && saved.returnScreen !== "share" ? saved.returnScreen : "home";
  state.level = Math.min(Math.max(Number(saved.level) || 0, 0), levelConfigs.length - 1);
  state.lives = Math.min(Math.max(Number(saved.lives) || 3, 0), 3);
  state.score = Math.max(Number(saved.score) || 0, 0);
  state.mistakes = Math.max(Number(saved.mistakes) || 0, 0);
  state.revives = Math.max(Number(saved.revives) || 0, 0);
  state.hints = Math.max(Number(saved.hints) || 0, 0);
  state.startedAt = Date.now() - Math.max(Number(saved.elapsedMs) || 0, 0);
  state.currentSong = songs.find((song) => song.id === saved.currentSongId) || songs[0];

  if (saved.screen === "game") {
    showScreen("game");
    loadLevel();
    return true;
  }

  if (saved.screen === "result") {
    showResult();
    return true;
  }

  if (saved.screen === "fail") {
    showScreen("fail");
    return true;
  }

  if (saved.screen === "rank") {
    showScreen("rank");
    return true;
  }

  if (saved.screen === "share") {
    showScreen("share");
    return true;
  }

  showScreen("home");
  return true;
}

disableNativeImageInteractions();
syncStaticMascotImages();
if (!applyPreviewRoute() && !applyStoredSession()) initSplashIntro();
