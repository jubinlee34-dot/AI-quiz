// AI 프롬프트 퀴즈 - 로직 (드래그앤드롭 / 화면 전환 / 효과음)

const state = {
  difficulty: null,
  index: 0,
  solved: false,
};

let ALL_QUESTIONS = [];
let ASSET_BASE = "";
let dragState = null;
let hoveredBlank = null;
let audioCtx = null;

// 화면의 난이도 버튼 값 ↔ 문제팩의 difficulty 표기
const DIFF_LABEL = { beginner: "초급", intermediate: "중급", advanced: "심화" };

async function loadQuestions() {
  const res = await fetch("./questions.json");
  if (!res.ok) throw new Error(`questions.json 로드 실패 (${res.status})`);
  const pack = await res.json();
  ASSET_BASE = pack.assetBase || "";
  ALL_QUESTIONS = [...pack.items].sort((a, b) => a.order - b.order);
}

// 이미지는 assetBase 폴더에 평면으로 저장하므로 파일명만 떼어 경로를 만든다.
function resolveSrc(src) {
  return ASSET_BASE + String(src).split("/").pop();
}

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
  return ALL_QUESTIONS.filter((q) => q.difficulty === DIFF_LABEL[state.difficulty]);
}

function currentQuestion() {
  return currentList()[state.index];
}

/* ---------------- 문제 로드 ---------------- */

function loadQuestion() {
  state.solved = false;
  const list = currentList();
  const q = currentQuestion();

  document.getElementById("badge-diff").textContent = DIFF_LABEL[state.difficulty];
  document.getElementById("badge-cat").textContent = q.category;
  document.getElementById("progress-text").textContent = `문제 ${state.index + 1} / ${list.length}`;
  document.getElementById("progress-fill").style.width = `${((state.index + 1) / list.length) * 100}%`;
  document.getElementById("btn-next").textContent = state.index + 1 === list.length ? "결과 보기" : "다음 문제";

  renderOriginal(q.original);
  renderPrompt(q);
  renderResultPanel(q, state.difficulty === "beginner");
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
  const diffLabel = DIFF_LABEL[state.difficulty];
  document.getElementById("complete-title").textContent = `${diffLabel} 완료!`;
  document.getElementById("complete-text").textContent = `${diffLabel} ${currentList().length}문제를 모두 풀었어요.`;
  showScreen("screen-complete");
}

/* ---------------- 렌더링: 원본 ---------------- */

function renderOriginal(original) {
  const el = document.getElementById("panel-original");
  switch (original.type) {
    case "image": {
      el.innerHTML = original.src
        ? `<div class="original-image"><img src="${resolveSrc(original.src)}" alt="${
            original.alt || ""
          }" loading="lazy" onerror="handleImgError(this)" /></div>`
        : `<div class="mock-photo"><span>${original.alt || ""}</span></div>`;
      break;
    }
    case "text": {
      el.innerHTML = `<div class="orig-caption">📄 ${original.title || ""}</div><div class="text-block">${
        original.content || ""
      }</div>`;
      break;
    }
    case "table": {
      const caption = original.title
        ? `<div class="orig-caption">🗂 ${original.title}${original.unit ? ` (단위: ${original.unit})` : ""}</div>`
        : "";
      el.innerHTML = caption + renderTable(original.headers, original.rows);
      break;
    }
  }
}

function handleImgError(imgEl) {
  const wrap = imgEl.closest(".original-image, .result-image");
  if (wrap) {
    wrap.classList.add("img-broken");
    wrap.innerHTML = `<div class="img-broken-msg">이미지를 불러올 수 없습니다</div>`;
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

  // template의 [①]…[⑤] 자리표시자를 순서대로 slots와 짝지어 빈칸으로 바꾼다.
  let blankIndex = 0;
  q.prompt.template.split(/(\[[^\]]*\])/).forEach((part) => {
    if (!part) return;
    if (/^\[[^\]]*\]$/.test(part)) {
      const slot = q.prompt.slots[blankIndex];
      const span = document.createElement("span");
      span.className = "blank";
      span.dataset.answerId = slot.id;
      span.textContent = CIRCLED[blankIndex] || "○";
      blankIndex++;
      wrap.appendChild(span);
    } else {
      wrap.appendChild(document.createTextNode(part));
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
  const caption = result.title ? `<div class="orig-caption">${result.title}</div>` : "";
  const summary = result.summary ? `<div class="result-summary">${result.summary}</div>` : "";

  switch (result.type) {
    case "image":
      return (
        caption +
        `<div class="result-image"><img src="${resolveSrc(result.src)}" alt="${
          result.alt || ""
        }" loading="lazy" onerror="handleImgError(this)" /></div>` +
        summary
      );
    case "bullets":
      return (
        caption +
        `<ul class="bullet-list">${result.items.map((i) => `<li>${i}</li>`).join("")}</ul>` +
        summary
      );
    case "table": {
      // notes: 표 아래에 덧붙는 선택적 분석 문장
      const notes = result.notes
        ? `<ul class="result-notes">${result.notes.map((n) => `<li>${n}</li>`).join("")}</ul>`
        : "";
      return caption + renderTable(result.headers, result.rows) + notes + summary;
    }
    case "text":
      return caption + `<div class="text-block">${result.content || ""}</div>` + summary;
    case "cardnews":
      return (
        caption +
        `<div class="cardnews-grid">${result.cards
          .map(
            (c) =>
              `<div class="cardnews-card"><span class="num">${c.page}장</span><strong>${c.title}</strong><span class="card-body">${c.content}</span></div>`
          )
          .join("")}</div>` +
        summary
      );
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
  // 정답 블록은 slot의 id를 그대로 물려받아 ID 기준으로 판정한다.
  const answers = q.prompt.slots.map((s) => ({ id: s.id, text: s.answer }));
  const distractors = q.prompt.distractorBlocks.map((text, i) => ({ id: `d${i + 1}`, text }));
  const all = shuffle([...answers, ...distractors]);

  all.forEach((block, i) => {
    const chip = document.createElement("div");
    chip.className = "block-chip";
    chip.textContent = block.text;
    chip.dataset.text = block.text;
    chip.dataset.answerId = block.id;
    chip.dataset.uid = `${q.id}-${i}`;
    attachDrag(chip);
    tray.appendChild(chip);
  });
}

function attachDrag(chip) {
  chip.addEventListener("pointerdown", (e) => {
    if (chip.classList.contains("used")) return;
    e.preventDefault();
    dragState = { chip, text: chip.dataset.text, answerId: chip.dataset.answerId };
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
  ghost.style.transform = `translate(${x - ghost.offsetWidth / 2}px, ${y - ghost.offsetHeight / 2}px)`;
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

  const expected = blank.dataset.answerId;
  if (dragState.answerId === expected) {
    blank.textContent = `✓ ${dragState.text}`;
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
  if (hoveredBlank) {
    hoveredBlank.classList.remove("drop-hover");
    hoveredBlank = null;
  }
  if (dragState) dragState.chip.classList.remove("dragging");
  ghost.classList.remove("active");
  dragState = null;
}

function checkComplete() {
  const blanks = document.querySelectorAll("#panel-prompt .blank");
  const allFilled = [...blanks].every((b) => b.classList.contains("filled"));
  if (allFilled) onAllCorrect();
}

function onAllCorrect() {
  if (state.solved) return;
  state.solved = true;
  const q = currentQuestion();

  if (state.difficulty !== "beginner") {
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

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("btn-home").addEventListener("click", goHome);
  document.getElementById("btn-next").addEventListener("click", nextQuestion);
  document.getElementById("btn-retry").addEventListener("click", retryQuestion);
  document.getElementById("btn-restart-diff").addEventListener("click", () => startDifficulty(state.difficulty));
  document.getElementById("btn-other-diff").addEventListener("click", goHome);
  document.getElementById("btn-to-start").addEventListener("click", goHome);

  try {
    await loadQuestions();
    document.querySelectorAll("[data-difficulty]").forEach((btn) => {
      btn.addEventListener("click", () => startDifficulty(btn.dataset.difficulty));
    });
  } catch (e) {
    document.querySelector("#screen-start .lead").textContent =
      "문제 데이터를 불러오지 못했습니다. questions.json 파일과 실행 환경(로컬 서버)을 확인해 주세요.";
    document.querySelectorAll("[data-difficulty]").forEach((btn) => (btn.disabled = true));
  }
});
