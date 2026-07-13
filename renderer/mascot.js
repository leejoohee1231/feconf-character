'use strict';

// ===========================================================================
// 픽셀아트 마스코트 — 코드로 그리는 분홍 달팽이 (빌드/dev 메이트)
// 상태: idle / walking / working / happy / notify / sleeping
//   working = 빌드 중(집중) · happy = 빌드 성공 · notify = 빌드 실패/알림
// ===========================================================================

const cv = document.getElementById('cat');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

const bubble = document.getElementById('bubble');
const bTitle = document.getElementById('bubble-title');
const bMsg = document.getElementById('bubble-msg');
const dndBadge = document.getElementById('dnd-badge');
const shadow = document.getElementById('shadow');

// ---- 팔레트 (첨부 SVG의 마젠타/핑크 계열) ----------------------------------
const C = {
  outline: '#3a0a1e', // 진한 자두빛 외곽선
  body: '#FF6590', // 몸통(발) 밝은 핑크
  bodyShade: '#FF2260', // 몸통 그림자
  sole: '#FFC2D4', // 발바닥 하이라이트
  shell: '#FF2260', // 껍데기 본색
  shellDark: '#CF003B', // 껍데기 나선 홈/테두리
  shellLite: '#FF89AB', // 껍데기 하이라이트
  pink: '#FFC2D4', // 볼터치
  white: '#ffffff',
  eye: '#141116', // 눈 (검은 더듬이 끝)
  mouth: '#CF003B',
  red: '#E8433B', // 느낌표
  z: '#FF89AB', // Zzz
};

// ---- 그리기 헬퍼 (논리 좌표 = 64x64) ---------------------------------------
function fill(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}
function clr(x, y, w, h) {
  ctx.clearRect(x | 0, y | 0, w | 0, h | 0);
}
// 1px 어두운 외곽선이 있는 블록
function block(x, y, w, h, c) {
  fill(x, y, w, h, C.outline);
  fill(x + 1, y + 1, w - 2, h - 2, c);
}
// 채워진 픽셀 원
function disc(cx, cy, r, c) {
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    fill(cx - w, cy + dy, w * 2 + 1, 1, c);
  }
}

// ---- 상태 관리 --------------------------------------------------------------
let baseState = 'idle'; // idle | sleeping | walking | working (지속 상태)
let temp = null; // { state, until }  (일시 상태)
let lastLook = { t: 0, dx: 0 };
let walkDir = -1; // 걷는 방향(-1 왼쪽, +1 오른쪽)
const BASE_STATES = ['idle', 'sleeping', 'walking', 'working'];

function effectiveState() {
  if (temp && performance.now() < temp.until) return temp.state;
  temp = null;
  return baseState;
}

function setTemp(state, ttl) {
  temp = { state, until: performance.now() + (ttl || 3000) };
}

// ===========================================================================
// 캐릭터 렌더링 — 달팽이
// ===========================================================================
function drawSnail(now) {
  const t = now / 1000;
  const state = effectiveState();
  ctx.clearRect(0, 0, 64, 64);

  // --- 상태별 모션 파라미터 ---
  let bobSpeed = 1.4,
    bobAmp = 1,
    swaySpeed = 1.3,
    swayAmp = 1.5,
    stalkScale = 1, // 더듬이 길이 배율 (sleeping 시 수축)
    stalkLean = 0, // 더듬이 좌우 기울기
    mouth = 'smile';

  if (state === 'happy') {
    bobSpeed = 7; bobAmp = 3; swaySpeed = 6; swayAmp = 2.2; stalkScale = 1.05; mouth = 'open';
  } else if (state === 'working') {
    bobSpeed = 5; bobAmp = 0.7; swaySpeed = 2.4; swayAmp = 0.6; stalkScale = 0.82; stalkLean = -2; mouth = 'mm';
  } else if (state === 'notify') {
    bobSpeed = 9; bobAmp = 3.4; swaySpeed = 8; swayAmp = 2.6; stalkScale = 1.05; mouth = 'open';
  } else if (state === 'sleeping') {
    bobSpeed = 0.9; bobAmp = 0.7; swaySpeed = 0.5; swayAmp = 0.4; stalkScale = 0.16; mouth = 'line';
  } else if (state === 'walking') {
    bobSpeed = 3; bobAmp = 1; swaySpeed = 2; swayAmp = 1.2; stalkScale = 1; stalkLean = walkDir * 3; mouth = 'smile';
  }

  const bob = Math.round(Math.sin(t * bobSpeed) * bobAmp);
  const sway = Math.sin(t * swaySpeed) * swayAmp;
  // 걷기: 발이 앞뒤로 수축·이완(연동 파동)
  const crawl = state === 'walking' ? Math.round(Math.sin(t * 3) * 1.5) : 0;

  ctx.save();
  ctx.translate(0, bob);

  // 그림자 반응
  const sScale = 1 - bob * 0.03;
  shadow.style.transform = `scaleX(${sScale.toFixed(3)})`;

  // ============ 발(몸통) ============
  // 바닥에 붙은 길쭉한 캡슐. 오른쪽 끝은 뾰족한 꼬리.
  const footY = 47;
  block(8 - crawl, footY, 44, 9, C.body);
  clr(8 - crawl, footY, 2, 2);
  clr(50, footY, 2, 2);
  clr(8 - crawl, footY + 7, 2, 2);
  clr(50, footY + 7, 2, 2);
  // 꼬리 뾰족하게
  fill(51, footY + 3, 3, 3, C.outline);
  fill(51, footY + 4, 2, 1, C.bodyShade);
  // 발바닥 하이라이트
  fill(11 - crawl, footY + 6, 38, 2, C.sole);

  // ============ 머리(앞쪽, 왼쪽) ============
  const hx = 6 - crawl;
  block(hx, 38, 15, 16, C.body);
  clr(hx, 38, 2, 2);
  clr(hx + 13, 38, 2, 2);
  clr(hx, 52, 2, 1);
  // 볼터치
  fill(hx + 1, 46, 3, 2, C.pink);

  // ============ 껍데기(뒤쪽, 나선) ============
  const cx = 36,
    cy = 26;
  disc(cx, cy, 16, C.shellDark); // 테두리
  disc(cx, cy, 15, C.shell); // 본색
  // 나선 홈
  for (let a = 0; a < Math.PI * 4.2; a += 0.2) {
    const rr = 2 + a * 1.55;
    if (rr > 13) break;
    fill(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), 2, 2, C.shellDark);
  }
  // 상단-좌측 하이라이트 아크
  for (let a = Math.PI * 0.78; a < Math.PI * 1.45; a += 0.12) {
    fill(Math.round(cx + Math.cos(a) * 13), Math.round(cy + Math.sin(a) * 13), 2, 1, C.shellLite);
  }
  fill(cx - 1, cy - 1, 2, 2, C.shellLite); // 나선 중심

  // ============ 더듬이(눈) ============
  const blink =
    (state === 'idle' || state === 'working' || state === 'walking') && t % 4.2 < 0.14;
  const closed = state === 'sleeping' || blink;
  // 시선 방향 (idle 두리번)
  if (state === 'idle' && t - lastLook.t > 2.5) {
    lastLook = { t, dx: [0, 0, 1, -1, 0][Math.floor(t) % 5] };
  }
  const look = state === 'idle' ? lastLook.dx : 0;
  const baseY = 40;
  // 왼쪽(앞) 더듬이 — 짧음
  stalk(hx + 5, baseY, hx + 3 + stalkLean + sway + look, baseY - 18 * stalkScale, closed, look);
  // 오른쪽(뒤) 더듬이 — 긺
  stalk(hx + 10, baseY, hx + 11 + stalkLean + sway * 1.1 + look, baseY - 23 * stalkScale, closed, look);

  // ============ 입 ============
  drawMouth(mouth, hx);

  ctx.restore();

  // ============ 상태 이펙트 (껍데기 위) ============
  ctx.save();
  ctx.translate(0, bob);
  if (state === 'sleeping') drawZzz(t);
  else if (state === 'notify') drawBang(t);
  else if (state === 'working') drawDots(t);
  else if (state === 'happy') drawSparkle(t);
  ctx.restore();
}

// 더듬이 한 개: 밑동(bx,by) → 끝(tipX,tipY), 끝에 검은 눈알
function stalk(bx, by, tipX, tipY, closed, look) {
  const steps = 11;
  for (let i = 0; i <= steps; i++) {
    const x = bx + (tipX - bx) * (i / steps);
    const y = by + (tipY - by) * (i / steps);
    fill(Math.round(x), Math.round(y), 2, 2, C.body);
  }
  const ex = Math.round(tipX) - 1;
  const ey = Math.round(tipY) - 2;
  block(ex, ey, 4, 5, C.eye); // 눈알(더듬이 끝)
  if (closed) {
    fill(ex, ey + 2, 4, 1, C.shellLite); // 감은 눈꺼풀 라인
  } else {
    fill(ex + 1 + (look > 0 ? 1 : 0), ey + 1, 1, 1, C.white); // 반사광
  }
}

function drawMouth(kind, hx) {
  const mx = hx + 3;
  if (kind === 'open') {
    block(mx, 48, 5, 4, C.mouth);
    fill(mx + 1, 50, 2, 1, C.pink); // 혀
  } else if (kind === 'mm') {
    fill(mx + 1, 50, 3, 1, C.outline);
  } else if (kind === 'line') {
    fill(mx, 50, 4, 1, C.outline);
  } else {
    // smile ‿
    fill(mx, 49, 1, 1, C.outline);
    fill(mx + 1, 50, 3, 1, C.outline);
    fill(mx + 4, 49, 1, 1, C.outline);
  }
}

// ---- 이펙트 -----------------------------------------------------------------
function drawZzz(t) {
  const zs = [
    { s: 4, ph: 0 },
    { s: 3, ph: 1 },
    { s: 2, ph: 2 },
  ];
  zs.forEach(({ s, ph }) => {
    const p = (t * 0.6 + ph) % 3;
    const x = 44 + p * 3;
    const y = 12 - p * 4;
    ctx.globalAlpha = Math.max(0, 1 - p / 3);
    drawZ(x, y, s, C.z);
  });
  ctx.globalAlpha = 1;
}
function drawZ(x, y, s, c) {
  fill(x, y, s, 1, c);
  fill(x + s - Math.ceil(s / 2), y + 1, 1, 1, c);
  fill(x, y + 2, s, 1, c);
}
function drawBang(t) {
  const b = Math.abs(Math.sin(t * 8)) * 3;
  const y = 1 - b;
  fill(35, y, 2, 5, C.red);
  fill(35, y + 6, 2, 2, C.red);
}
function drawDots(t) {
  const n = Math.floor((t * 3) % 4); // 0,1,2,3
  for (let i = 0; i < 3; i++) {
    fill(30 + i * 4, 6, 2, 2, i < n ? C.shellDark : C.shellLite);
  }
}
function drawSparkle(t) {
  const tw = (Math.sin(t * 9) + 1) / 2;
  ctx.globalAlpha = 0.5 + tw * 0.5;
  const x = 50,
    y = 10;
  fill(x, y - 2, 1, 5, C.shellLite);
  fill(x - 2, y, 5, 1, C.shellLite);
  ctx.globalAlpha = 1;
}

// ===========================================================================
// 알림 말풍선
// ===========================================================================
let bubbleTimer = null;
const LEVEL_ICON = { info: '💬', success: '✅', warn: '⚠️', urgent: '🚨' };

function showBubble({ title, message, level }) {
  bubble.className = 'level-' + (level || 'info');
  bTitle.innerHTML = '';
  const icon = document.createElement('span');
  icon.textContent = LEVEL_ICON[level] || '💬';
  const txt = document.createElement('span');
  txt.textContent = title || '알림';
  bTitle.appendChild(icon);
  bTitle.appendChild(txt);
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
  window.mascot.onState(({ state, ttl, dir }) => {
    if (dir != null) walkDir = dir;
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
// 드래그 이동 & 클릭
// ===========================================================================
let dragging = false;
let moved = 0;
let last = { x: 0, y: 0 };

cv.addEventListener('mousedown', (e) => {
  dragging = true;
  moved = 0;
  last = { x: e.screenX, y: e.screenY };
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
    // 클릭 → 인사
    setTemp('happy', 1800);
    if (baseState === 'sleeping') baseState = 'idle';
    if (window.mascot) window.mascot.click();
  }
  dragging = false;
});

// ===========================================================================
// 애니메이션 루프
// ===========================================================================
function loop(now) {
  drawSnail(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
