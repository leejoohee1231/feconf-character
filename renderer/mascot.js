'use strict';

// ===========================================================================
// 데스크탑 마스코트 — 업로드된 달팽이 SVG(snail.svg)를 그대로 사용
// 상태별 표정 대신 "전체 움직임 + 위쪽 이펙트(💤 ❗ 💭 ✨)"로 반응해요.
//   working = 빌드 중 · happy = 빌드 성공 · notify = 빌드 실패/알림
// ===========================================================================

const cv = document.getElementById('cat'); // 달팽이 이미지 (드래그/클릭 대상)
const charEl = document.getElementById('char'); // 움직임을 적용할 래퍼
const fxEl = document.getElementById('fx'); // 상태 이펙트
const bubble = document.getElementById('bubble');
const bTitle = document.getElementById('bubble-title');
const bMsg = document.getElementById('bubble-msg');
const dndBadge = document.getElementById('dnd-badge');
const shadow = document.getElementById('shadow');

// ---- 상태 관리 --------------------------------------------------------------
let baseState = 'idle'; // idle | sleeping | walking | working (지속 상태)
let temp = null; // { state, until }  (일시 상태)
const BASE_STATES = ['idle', 'sleeping', 'walking', 'working'];

function effectiveState() {
  if (temp && performance.now() < temp.until) return temp.state;
  temp = null;
  return baseState;
}
function setTemp(state, ttl) {
  temp = { state, until: performance.now() + (ttl || 3000) };
}

// ---- 상태별 이펙트(이모지) ---------------------------------------------------
const FX = {
  working: { t: '💭', c: 'fx-think' }, // 빌드 중 — 골똘히
  happy: { t: '✨', c: 'fx-spark' }, // 성공 — 반짝
  notify: { t: '❗', c: 'fx-bang' }, // 실패/알림 — 놀람
  sleeping: { t: '💤', c: 'fx-sleep' }, // 잠자기
};
let lastFxState = null;
function setFx(state) {
  if (state === lastFxState) return; // 매 프레임 애니메이션 재시작 방지
  lastFxState = state;
  const f = FX[state];
  if (!f) {
    fxEl.className = 'hidden';
    fxEl.textContent = '';
    return;
  }
  fxEl.textContent = f.t;
  fxEl.className = f.c; // hidden 제거 + 해당 애니메이션 클래스
}

// ---- 상태별 몸 움직임 --------------------------------------------------------
function applyMotion(state, t) {
  let ty = 0,
    rot = 0,
    sx = 0,
    scale = 1;

  if (state === 'happy') {
    ty = -Math.abs(Math.sin(t * 7)) * 8;
    scale = 1 + Math.abs(Math.sin(t * 7)) * 0.04;
  } else if (state === 'working') {
    ty = Math.sin(t * 5) * 1.6;
    rot = Math.sin(t * 4) * 0.8;
  } else if (state === 'notify') {
    ty = -Math.abs(Math.sin(t * 9)) * 6;
    sx = Math.sin(t * 22) * 2; // 파르르 흔들림
  } else if (state === 'sleeping') {
    scale = 1 + Math.sin(t * 0.9) * 0.02; // 숨쉬기
    ty = Math.sin(t * 0.9) * 1;
  } else if (state === 'walking') {
    rot = Math.sin(t * 3) * 3; // 느릿느릿 기어감
    sx = Math.sin(t * 3) * 2;
    ty = Math.abs(Math.sin(t * 6)) * 1.5;
  } else {
    // idle — 달팽이처럼 좌우로 아주 느리게 왔다 갔다 (+ 진행방향으로 살짝 기울임)
    sx = Math.sin(t * 0.5) * 7;
    rot = Math.cos(t * 0.5) * 1.6;
    ty = Math.sin(t * 1.6) * 2;
  }

  charEl.style.transform = `translate(${sx.toFixed(2)}px, ${ty.toFixed(2)}px) rotate(${rot.toFixed(
    2
  )}deg) scale(${scale.toFixed(3)})`;
  shadow.style.transform = `scaleX(${(1 - ty * 0.012).toFixed(3)})`;
}

// ===========================================================================
// 애니메이션 루프
// ===========================================================================
function loop(now) {
  const t = now / 1000;
  const state = effectiveState();
  applyMotion(state, t);
  setFx(state);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ===========================================================================
// 알림 말풍선
// ===========================================================================
let bubbleTimer = null;
const LEVEL_ICON = { info: '💬', success: '✅', warn: '⚠️', urgent: '🚨' };

function showBubble({ title, message, level }) {
  // D-day 클릭 팝업이 떠 있으면 먼저 빠르게 닫고, 사라진 뒤 상태메시지 표시
  if (clickBubble && !clickBubble.classList.contains('hidden')) {
    clickBubble.classList.add('closing');
    setTimeout(() => {
      clickBubble.classList.add('hidden');
      clickBubble.classList.remove('closing');
      showBubble({ title, message, level });
    }, 160);
    return;
  }

  bubble.className = 'level-' + (level || 'info');
  // 제목을 쓴 그대로 표시 (이모지는 문구에 직접 넣기)
  bTitle.textContent = title || '알림';
  bMsg.textContent = message || '';
  bMsg.style.display = message ? 'block' : 'none';
  bubble.classList.remove('hidden');
  // 리플로우로 애니메이션 재시작
  void bubble.offsetWidth;

  if (bubbleTimer) clearTimeout(bubbleTimer);
  const dur = level === 'urgent' ? 12000 : 6500;
  bubbleTimer = setTimeout(hideBubble, dur);

  // 캐릭터 반응 — 성공/정보는 기뻐하고, 실패/경고는 계속 놀란 표정 유지
  setTemp('notify', 1600);
  if (level === 'urgent' || level === 'warn') {
    setTimeout(() => setTemp('notify', 2800), 1600);
  } else {
    setTimeout(() => setTemp('happy', 1800), 1600);
  }
}
function hideBubble() {
  bubble.classList.add('hidden');
}
bubble.addEventListener('click', hideBubble);

// ===========================================================================
// 메인 프로세스 이벤트 연결
// ===========================================================================
if (window.mascot) {
  window.mascot.onNotify((d) => showBubble(d));
  window.mascot.onState(({ state, ttl }) => {
    if (!ttl && BASE_STATES.includes(state)) {
      baseState = state; // 지속 상태 전환
    } else {
      setTemp(state, ttl || 3000);
      if (baseState === 'sleeping') baseState = 'idle'; // 깨우기
    }
  });
  window.mascot.onDnd(({ dnd }) => {
    dndBadge.classList.toggle('hidden', !dnd);
  });
}

// ===========================================================================
// 클릭 팝업 — Frame1 말풍선 안에 D-day + 디스코드 바로가기 (창 안 오버레이)
// ===========================================================================
const clickBubble = document.getElementById('click-bubble');
const cbDday = document.getElementById('cb-dday');
const cbDiscord = document.getElementById('cb-discord');
const cbClose = document.getElementById('cb-close');
if (cbClose) {
  cbClose.addEventListener('click', (e) => {
    e.stopPropagation();
    clickBubble.classList.add('hidden');
  });
}

function startOfDay(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
// "행사까지 D-XX" (D-XX만 핑크) / 당일 "행사까지 D-DAY" / 이후 "행사 종료ㅠㅠ"
function setDdayContent(conf, now) {
  const s = conf.startDate || conf.date;
  if (!s) {
    cbDday.textContent = '';
    return;
  }
  const diff = Math.round((startOfDay(new Date(s).getTime()) - startOfDay(now)) / 86400000);
  if (diff > 0) {
    cbDday.innerHTML = 'FECONF까지 <span class="dday-num">D-' + diff + '</span>';
  } else if (diff === 0) {
    cbDday.innerHTML = 'FECONF까지 <span class="dday-num">D-DAY</span>';
  } else {
    cbDday.textContent = 'FECONF 종료ㅠㅠ';
  }
}
async function toggleClickBubble() {
  if (!clickBubble.classList.contains('hidden')) {
    clickBubble.classList.add('hidden');
    return;
  }
  let data = { conference: {}, now: Date.now() };
  if (window.mascot && window.mascot.guideGetData) {
    try {
      const d = await window.mascot.guideGetData();
      if (d) data = d;
    } catch (_) {}
  }
  const conf = data.conference || {};
  setDdayContent(conf, data.now || Date.now());
  if (cbDiscord) {
    const url = conf.discord && conf.discord.url;
    if (url) {
      cbDiscord.style.display = '';
      cbDiscord.onclick = (e) => {
        e.stopPropagation();
        if (window.mascot && window.mascot.openExternal) window.mascot.openExternal(url);
      };
    } else {
      cbDiscord.style.display = 'none';
    }
  }
  clickBubble.classList.remove('hidden');
  void clickBubble.offsetWidth; // pop 애니메이션 재생
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') clickBubble.classList.add('hidden');
});

// ===========================================================================
// 드래그 이동 & 클릭
// ===========================================================================
let dragging = false;
let moved = 0;
let last = { x: 0, y: 0 };

cv.addEventListener('mousedown', (e) => {
  dragging = true;
  moved = 0;
  last = { x: e.screenX, y: e.screenY };
  e.preventDefault();
});
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const dx = e.screenX - last.x;
  const dy = e.screenY - last.y;
  moved += Math.abs(dx) + Math.abs(dy);
  last = { x: e.screenX, y: e.screenY };
  if (window.mascot) window.mascot.drag(dx, dy);
});
window.addEventListener('mouseup', () => {
  if (dragging && moved < 4) {
    // 클릭 → 인사 + 팝업 토글
    setTemp('happy', 1800);
    if (baseState === 'sleeping') baseState = 'idle';
    toggleClickBubble();
    if (window.mascot) window.mascot.click();
  }
  dragging = false;
});

// ===========================================================================
// 클릭 통과 — 달팽이/말풍선 위에서만 마우스를 받고, 그 밖은 뒤쪽 창으로 통과
// ===========================================================================
let ignoring = null;
function isInteractiveAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return !!(el && el.closest && el.closest('#char, #bubble, #click-bubble'));
}
function updateClickThrough(x, y) {
  if (dragging) return; // 드래그 중엔 계속 받기
  const shouldIgnore = !isInteractiveAt(x, y);
  if (shouldIgnore === ignoring) return;
  ignoring = shouldIgnore;
  if (window.mascot && window.mascot.setIgnoreMouse) window.mascot.setIgnoreMouse(shouldIgnore);
}
window.addEventListener('mousemove', (e) => updateClickThrough(e.clientX, e.clientY));
// 시작 시엔 클릭 통과(뒤쪽 창 사용 가능), 커서가 올라오면 forward 로 감지해 켬
if (window.mascot && window.mascot.setIgnoreMouse) window.mascot.setIgnoreMouse(true);
