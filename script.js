// AI 프롬프트 퀴즈 - 로직 (드래그앤드롭 / 화면 전환 / 효과음)

const state = {
  difficulty: null,
  index: 0,
  solved: false,
};

let dragState = null;
let hoveredBlank = null;
let audioCtx = null;

const ghost = document.getElementById("drag-ghost");
const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥"];

/* ---------------- 화면 전환 ---------------- */

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function goHome() {
  showScreen("screen-start");
}

function startDifficulty(diff) {
  state.difficulty = diff;
  state.index = 0;
  showScreen("screen-quiz");
  loadQuestion();
}

function currentList() {
  return QUIZ_DATA[state.difficulty];
}

function currentQuestion() {
  return currentList()[state.index];
}

/* ---------------- 문제 로드 ---------------- */

function loadQuestion() {
  state.solved = false;
  const list = currentList();
  const q = currentQuestion();

  document.getElementById("badge-diff").textContent = state.difficulty === "beginner" ? "초급" : "중급";
  document.getElementById("badge-cat").textContent = q.category;
  document.getElementById("progress-text").textContent = `문제 ${state.index + 1} / ${list.length}`;
  document.getElementById("progress-fill").style.width = `${((state.index + 1) / list.length) * 100}%`;
  document.getElementById("btn-next").textContent = state.index + 1 === list.length ? "결과 보기" : "다음 문제";

  renderOriginal(q.original);
  renderPrompt(q);
  renderResultPanel(q, !q.result.locked);
  buildTray(q);

  document.getElementById("learning-point").classList.remove("show");
  document.querySelector(".panel-original").classList.remove("compare-glow");
  document.getElementById("panel-result-wrap").classList.remove("compare-glow");
}

function retryQuestion() {
  loadQuestion();
}

function nextQuestion() {
  const list = currentList();
  if (state.index + 1 < list.length) {
    state.index++;
    loadQuestion();
  } else {
    completeDifficulty();
  }
}

function completeDifficulty() {
  const diffLabel = state.difficulty === "beginner" ? "초급" : "중급";
  document.getElementById("complete-title").textContent = `${diffLabel} 완료!`;
  document.getElementById("complete-text").textContent = `${diffLabel} ${currentList().length}문제를 모두 풀었어요.`;
  document.getElementById("btn-other-diff").textContent =
    state.difficulty === "beginner" ? "중급 도전하기" : "초급 다시 보기";
  showScreen("screen-complete");
}

/* ---------------- 렌더링: 원본 ---------------- */

function renderOriginal(original) {
  const el = document.getElementById("panel-original");
  switch (original.type) {
    case "image": {
      let html = `<div class="mock-photo"><span>${original.caption}</span></div>`;
      if (original.items) {
        html += `<div class="original-note"><strong>조건</strong><ul>${original.items
          .map((i) => `<li>${i}</li>`)
          .join("")}</ul></div>`;
      }
      el.innerHTML = html;
      break;
    }
    case "image-table": {
      el.innerHTML = `<div class="mock-photo with-table"><span>${original.caption}</span>${renderTable(
        original.headers,
        original.rows
      )}</div>`;
      break;
    }
    case "text": {
      el.innerHTML = `<div class="orig-caption">📄 ${original.caption}</div><div class="text-block">${original.lines.join(
        "\n"
      )}</div>`;
      break;
    }
    case "bullets": {
      el.innerHTML = `<div class="orig-caption">🗂 ${original.caption}</div><ul class="bullet-list">${original.items
        .map((i) => `<li>${i}</li>`)
        .join("")}</ul>`;
      break;
    }
  }
}

function renderTable(headers, rows) {
  return `<table class="data-table"><thead><tr>${headers
    .map((h) => `<th>${h}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

/* ---------------- 렌더링: 프롬프트 빈칸 ---------------- */

function renderPrompt(q) {
  const container = document.getElementById("panel-prompt");
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "prompt-text";

  q.promptParts.forEach((part) => {
    if (part.text !== undefined) {
      wrap.appendChild(document.createTextNode(part.text));
    } else {
      const blank = q.blanks.find((b) => b.id === part.blank);
      const span = document.createElement("span");
      span.className = "blank";
      span.dataset.blankId = String(part.blank);
      span.dataset.answer = blank.answer;
      span.textContent = CIRCLED[part.blank] || "○";
      wrap.appendChild(span);
    }
  });

  container.appendChild(wrap);
}

/* ---------------- 렌더링: 결과 ---------------- */

function renderResultPanel(q, revealed) {
  const el = document.getElementById("panel-result");
  el.classList.remove("result-reveal");

  if (!revealed) {
    el.innerHTML = `
      <div class="result-locked">
        <div class="lock-icon">🔒</div>
        <div>프롬프트를 완성하면<br />결과가 공개됩니다.</div>
      </div>`;
    return;
  }

  el.innerHTML = renderResultHTML(q.result);
  void el.offsetWidth;
  el.classList.add("result-reveal");
}

function renderResultHTML(result) {
  switch (result.type) {
    case "bullets":
      return `<div class="orig-caption">${result.title}</div><ul class="bullet-list">${result.items
        .map((i) => `<li>${i}</li>`)
        .join("")}</ul>`;
    case "table":
      return `<div class="orig-caption">${result.title}</div>${renderTable(result.headers, result.rows)}`;
    case "text":
      return `<div class="orig-caption">${result.title}</div><div class="text-block">${result.lines.join(
        "\n"
      )}</div>`;
    case "checklist":
      return `<div class="orig-caption">${result.title}</div><ul class="checklist-list">${result.items
        .map((i) => `<li>${i}</li>`)
        .join("")}</ul>`;
    case "schedule":
      return `<div class="orig-caption">${result.title} · ${result.heading}</div><ul class="schedule-list">${result.items
        .map(([t, d]) => `<li><span class="schedule-time">${t}</span><span>${d}</span></li>`)
        .join("")}</ul>`;
    case "cardnews":
      return `<div class="orig-caption">${result.title}</div><div class="cardnews-grid">${result.cards
        .map((c, i) => `<div class="cardnews-card"><span class="num">${i + 1}장</span>${c}</div>`)
        .join("")}</div>`;
    default:
      return "";
  }
}

/* ---------------- 블록 트레이 & 드래그앤드롭 ---------------- */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTray(q) {
  const tray = document.getElementById("block-tray");
  tray.innerHTML = "";
  const answers = q.blanks.map((b) => b.answer);
  const all = shuffle([...answers, ...q.distractors]);

  all.forEach((text, i) => {
    const chip = document.createElement("div");
    chip.className = "block-chip";
    chip.textContent = text;
    chip.dataset.text = text;
    chip.dataset.uid = `${q.id}-${i}`;
    attachDrag(chip);
    tray.appendChild(chip);
  });
}

function attachDrag(chip) {
  chip.addEventListener("pointerdown", (e) => {
    if (chip.classList.contains("used")) return;
    e.preventDefault();
    dragState = { chip, text: chip.dataset.text };
    chip.classList.add("dragging");
    ghost.textContent = chip.dataset.text;
    ghost.classList.add("active");
    positionGhost(e.clientX, e.clientY);
    chip.setPointerCapture(e.pointerId);
  });

  chip.addEventListener("pointermove", (e) => {
    if (!dragState || dragState.chip !== chip) return;
    positionGhost(e.clientX, e.clientY);
    updateHover(e.clientX, e.clientY);
  });

  chip.addEventListener("pointerup", (e) => {
    if (!dragState || dragState.chip !== chip) return;
    handleDrop(e.clientX, e.clientY);
    endDrag();
  });

  chip.addEventListener("pointercancel", () => {
    endDrag();
  });
}

function positionGhost(x, y) {
  ghost.style.transform = `translate(${x - ghost.offsetWidth / 2}px, ${y - ghost.offsetHeight - 16}px)`;
}

function updateHover(x, y) {
  const el = document.elementFromPoint(x, y);
  const blank = el ? el.closest(".blank") : null;

  if (hoveredBlank && hoveredBlank !== blank) {
    hoveredBlank.classList.remove("drop-hover");
    hoveredBlank = null;
  }
  if (blank && !blank.classList.contains("filled")) {
    blank.classList.add("drop-hover");
    hoveredBlank = blank;
  }
}

function handleDrop(x, y) {
  const el = document.elementFromPoint(x, y);
  const blank = el ? el.closest(".blank") : null;

  if (hoveredBlank) {
    hoveredBlank.classList.remove("drop-hover");
    hoveredBlank = null;
  }
  if (!blank || blank.classList.contains("filled")) return;

  const expected = blank.dataset.answer;
  if (dragState.text === expected) {
    blank.textContent = dragState.text;
    blank.classList.add("filled");
    dragState.chip.classList.add("used");
    playSound("correct");
    checkComplete();
  } else {
    blank.classList.add("shake");
    setTimeout(() => blank.classList.remove("shake"), 350);
    playSound("wrong");
  }
}

function endDrag() {
  if (dragState) dragState.chip.classList.remove("dragging");
  ghost.classList.remove("active");
  dragState = null;
}

function checkComplete() {
  const q = currentQuestion();
  const allFilled = q.blanks.every((b) => {
    const span = document.querySelector(`.blank[data-blank-id="${b.id}"]`);
    return span && span.classList.contains("filled");
  });
  if (allFilled) onAllCorrect();
}

function onAllCorrect() {
  if (state.solved) return;
  state.solved = true;
  const q = currentQuestion();

  if (q.result.locked) {
    renderResultPanel(q, true);
  }
  document.querySelector(".panel-original").classList.add("compare-glow");
  document.getElementById("panel-result-wrap").classList.add("compare-glow");
  document.getElementById("learning-point-text").textContent = q.learningPoint;
  document.getElementById("learning-point").classList.add("show");
  setTimeout(() => playSound("complete"), 150);
}

/* ---------------- 효과음 (Web Audio API) ---------------- */

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    if (type === "complete") {
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = now + i * 0.12;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.14, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.3);
      });
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "correct") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === "wrong") {
      osc.type = "square";
      osc.frequency.setValueAtTime(180, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    }
  } catch (e) {
    /* 오디오를 지원하지 않는 환경은 무시 */
  }
}

/* ---------------- 초기화 ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-difficulty]").forEach((btn) => {
    btn.addEventListener("click", () => startDifficulty(btn.dataset.difficulty));
  });
  document.getElementById("btn-home").addEventListener("click", goHome);
  document.getElementById("btn-next").addEventListener("click", nextQuestion);
  document.getElementById("btn-retry").addEventListener("click", retryQuestion);
  document.getElementById("btn-restart-diff").addEventListener("click", () => startDifficulty(state.difficulty));
  document.getElementById("btn-other-diff").addEventListener("click", () =>
    startDifficulty(state.difficulty === "beginner" ? "intermediate" : "beginner")
  );
  document.getElementById("btn-to-start").addEventListener("click", goHome);
});
