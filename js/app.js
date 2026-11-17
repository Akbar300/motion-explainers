/* From a Fraction to a Percent — motion explainer */
(() => {
  const $ = (id) => document.getElementById(id);
  const stage = $("stage");
  const callout = $("callout");
  const caption = $("caption");
  const dotsEl = $("dots");
  const btnPlay = $("btn-play");
  const btnBack = $("btn-back");
  const btnNext = $("btn-next");
  const btnReplay = $("btn-replay");
  const btnSpeed = $("btn-speed");

  const SPEEDS = [1, 1.5, 2];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (t, a = 0, b = 1) => Math.max(a, Math.min(b, t));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
  const easeOut = (t) => 1 - (1 - t) ** 3;
  const easeOutBack = (t) => {
    const c = 1.70158;
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
  };
  const span = (t, a, b) => clamp((t - a) / Math.max(0.001, b - a));

  function frac(n, d, cls = "") {
    return `<span class="frac ${cls}" aria-label="${n} over ${d}"><span class="n">${n}</span><span class="d">${d}</span></span>`;
  }

  const SCENES = [
    {
      id: "three-fourths",
      duration: 3600,
      caption: `This is ${frac(3, 4)} of the whole.`,
    },
    {
      id: "hundred",
      duration: 5600,
      caption: "The same amount, cut into 100 equal squares.",
    },
    {
      id: "morph",
      duration: 4600,
      caption: "Multiply top and bottom by 25.",
    },
    {
      id: "percent",
      duration: 4400,
      caption: "Per cent means per 100.",
    },
    {
      id: "more",
      duration: 6200,
      caption: "More fractions, same idea.",
    },
    {
      id: "try",
      duration: 1100,
      caption: "Tap an answer.",
    },
  ];

  const state = {
    scene: 0,
    time: 0,
    playing: true,
    waiting: false,
    speed: 1,
    last: 0,
    raf: 0,
    answer: null,
    built: -1,
  };

  let cells = [];
  let gridEl = null;
  let crustEl = null;
  let plusEl = null;
  let countEl = null;
  let resizeObs = null;

  function duration(i = state.scene) {
    return reduced ? 160 : SCENES[i].duration;
  }

  /* ---------- grid math ---------- */
  function quadrantOn(i) {
    const r = Math.floor(i / 10);
    const c = i % 10;
    // Shade 3 of 4 quadrants; leave bottom-right empty
    if (r < 5 && c < 5) return true;
    if (r < 5 && c >= 5) return true;
    if (r >= 5 && c < 5) return true;
    return false;
  }
  function regroupIndex(i) {
    // Map original index to packed 75-then-25 layout
    const shaded = [];
    const empty = [];
    for (let k = 0; k < 100; k++) (quadrantOn(k) ? shaded : empty).push(k);
    const map = new Array(100);
    shaded.forEach((src, dest) => { map[src] = dest; });
    empty.forEach((src, j) => { map[src] = 75 + j; });
    return map[i];
  }
  const REGROUP = Array.from({ length: 100 }, (_, i) => regroupIndex(i));

  function gridMetrics() {
    if (!gridEl) return { size: 10, gap: 0, s: 0 };
    const w = gridEl.clientWidth;
    // Scene 1: no gap (solid pizza slices). Scene 2+: thin gap.
    let gapT = 0;
    if (state.scene === 1) {
      gapT = easeInOut(span(state.time, 700, 1700));
    } else if (state.scene > 1) {
      gapT = 1;
    }
    const gap = (w / 10) * 0.08 * gapT;
    const size = (w - gap * 9) / 10;
    return { size, gap, s: w };
  }

  function cellSlot(index, size, gap, total) {
    const r = Math.floor(index / 10);
    const c = index % 10;
    const x = c * (size + gap);
    const y = r * (size + gap);
    const w = c === 9 ? Math.max(size, total - x) : size;
    const h = r === 9 ? Math.max(size, total - y) : size;
    return { x, y, w, h };
  }

  function paintGrid(t) {
    if (!cells.length) return;
    const { size, gap } = gridMetrics();
    let pack = 0;
    if (state.scene === 1) pack = easeInOut(span(t, 2800, 5000));
    else if (state.scene > 1) pack = 1;

    let fillWave = 1;
    if (state.scene === 0) fillWave = span(t, 1100, 2800);

    const total = gridEl.clientWidth;
    // Slight overlap hides antialiased seams while the pizza is still whole
    const overlap = gap < 0.5 ? 0.9 : 0;
    cells.forEach((el, i) => {
      const from = cellSlot(i, size, gap, total);
      const to = cellSlot(REGROUP[i], size, gap, total);
      const x = lerp(from.x, to.x, pack);
      const y = lerp(from.y, to.y, pack);
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.width = lerp(from.w, to.w, pack) + overlap + "px";
      el.style.height = lerp(from.h, to.h, pack) + overlap + "px";
      // Fill the three quadrants, one after another
      let on = false;
      if (quadrantOn(i)) {
        const r = Math.floor(i / 10);
        const c = i % 10;
        let q = 0;
        if (r < 5 && c < 5) q = 0;
        else if (r < 5 && c >= 5) q = 1;
        else q = 2;
        const local = span(fillWave, q / 3, (q + 1) / 3);
        // ripple inside the quadrant
        const lr = r % 5;
        const lc = c % 5;
        const ripple = (lr * 5 + lc) / 25;
        on = local > ripple * 0.85;
        if (state.scene > 0) on = true;
      }
      el.classList.toggle("on", on);
    });

    if (crustEl) {
      const toSquare = state.scene === 0 ? 0 : state.scene === 1 ? easeInOut(span(t, 0, 800)) : 1;
      crustEl.classList.toggle("is-square", toSquare > 0.55);
      crustEl.style.borderRadius = lerp(50, 16, toSquare) + "%";
      if (toSquare > 0.55) crustEl.style.borderRadius = 16 + "px";
    }
    if (plusEl) {
      plusEl.style.opacity = state.scene === 0 ? String(easeOut(span(t, 400, 900))) : String(1 - easeInOut(span(t, 700, 1400)));
    }
    if (countEl) {
      const show = (state.scene === 1 && t > 1700) || (state.scene > 1 && state.scene < 3);
      countEl.style.opacity = show ? "1" : "0";
      if (state.scene === 1) {
        if (t < 2600) {
          countEl.textContent = "100 squares";
        } else {
          const packed = Math.round(lerp(0, 75, easeOut(span(t, 2800, 5000))));
          countEl.textContent = packed + " of 100";
        }
        if (t > 5000) callout.innerHTML = frac(75, 100, "xl");
      } else if (state.scene > 1) {
        countEl.textContent = "75 of 100";
      }
    }
  }

  function buildGridScene(withBadge) {
    stage.innerHTML = "";
    const scene = document.createElement("div");
    scene.className = "scene";
    scene.innerHTML = `
      <div class="whole">
        <div class="crust" id="crust">
          <div class="grid" id="grid">
            <div class="plus" id="plus" aria-hidden="true"><i class="h"></i><i class="v"></i></div>
          </div>
        </div>
      </div>
      ${withBadge ? '<div class="count-badge" id="count-badge" style="opacity:0">100 squares</div>' : ""}
    `;
    stage.appendChild(scene);
    gridEl = scene.querySelector("#grid");
    crustEl = scene.querySelector("#crust");
    plusEl = scene.querySelector("#plus");
    countEl = scene.querySelector("#count-badge");
    cells = [];
    for (let i = 0; i < 100; i++) {
      const d = document.createElement("i");
      d.className = "cell";
      gridEl.appendChild(d);
      cells.push(d);
    }
    if (resizeObs) resizeObs.disconnect();
    resizeObs = new ResizeObserver(() => paintGrid(state.time));
    resizeObs.observe(gridEl);
  }

  /* ---------- scene builders ---------- */
  function buildScene(i) {
    state.built = i;
    state.answer = null;
    cells = [];
    gridEl = crustEl = plusEl = countEl = null;
    if (i === 0) {
      buildGridScene(false);
      callout.innerHTML = frac(3, 4, "xl");
    } else if (i === 1) {
      buildGridScene(true);
      callout.innerHTML = frac(3, 4, "xl");
    } else if (i === 2) {
      stage.innerHTML = `
        <div class="scene">
          <div class="eq" id="eq"></div>
        </div>`;
      callout.innerHTML = "";
    } else if (i === 3) {
      stage.innerHTML = `
        <div class="scene">
          <div class="percent-story" id="pstory"></div>
        </div>`;
      callout.innerHTML = "";
    } else if (i === 4) {
      stage.innerHTML = `
        <div class="scene">
          <div class="bars" id="bars">
            ${barRow(1, 2, 50, "a")}
            ${barRow(1, 5, 20, "b")}
            ${barRow(2, 5, 40, "c")}
          </div>
        </div>`;
      callout.innerHTML = "";
    } else if (i === 5) {
      stage.innerHTML = `
        <div class="scene">
          <div class="quiz" id="quiz">
            <h2>What percent is ${frac(3, 10, "lg")}?</h2>
            <div class="tens" aria-hidden="true">${Array.from({ length: 10 }, (_, k) => `<i class="${k < 3 ? "on" : ""}"></i>`).join("")}</div>
            <div class="opts" role="group" aria-label="Answers">
              <button type="button" class="opt" data-ok="no">3%</button>
              <button type="button" class="opt" data-ok="yes">30%</button>
              <button type="button" class="opt" data-ok="no">13%</button>
            </div>
            <div class="quiz-fb" id="quiz-fb" aria-live="polite"></div>
          </div>
        </div>`;
      callout.innerHTML = frac(3, 10, "xl");
      stage.querySelectorAll(".opt").forEach((btn) => {
        btn.addEventListener("click", () => onAnswer(btn));
      });
    }
    caption.innerHTML = SCENES[i].caption;
  }

  function barRow(n, d, pct, id) {
    return `<div class="bar-row" id="bar-${id}">
      ${frac(n, d, "lg")}
      <div class="bar-track"><div class="bar-fill" id="fill-${id}"></div></div>
      <div class="bar-pct" id="pct-${id}"></div>
    </div>`;
  }

  function fracTimes(n, d, timesOpacity) {
    const tStyle = `opacity:${clamp(timesOpacity)};transform:scale(${0.7 + 0.3 * clamp(timesOpacity)})`;
    return `<span class="frac-eq" aria-label="${n} times 25 over ${d} times 25">
      <span class="n"><span>${n}</span><span class="times" style="${tStyle}">× 25</span></span>
      <span class="d"><span>${d}</span><span class="times" style="${tStyle}">× 25</span></span>
    </span>`;
  }

  function paintMorph(t) {
    const eq = $("eq");
    if (!eq) return;
    const showMid = easeOut(span(t, 600, 1300));
    const showTimes = easeOutBack(span(t, 800, 1500));
    const showRight = easeOut(span(t, 2200, 3200));
    eq.innerHTML = `
      <div class="piece">${frac(3, 4, "xl")}</div>
      <div class="arrow" style="opacity:${showMid}">→</div>
      <div class="piece" style="opacity:${showMid}">${fracTimes(3, 4, showTimes)}</div>
      <div class="arrow" style="opacity:${showRight}">→</div>
      <div class="piece" style="opacity:${showRight}">${frac(75, 100, "xl")}</div>
    `;
    if (showRight > 0.6) callout.innerHTML = frac(75, 100, "xl");
    else callout.innerHTML = frac(3, 4, "xl");
  }

  function paintPercent(t) {
    const el = $("pstory");
    if (!el) return;
    const showNote = easeOut(span(t, 900, 1600));
    const morph = easeInOut(span(t, 2300, 3600));
    const mid = `75 out of 100`;
    // Morph "out of 100" into a percent sign. Avoid writing a slashed fraction.
    const outOpacity = 1 - morph;
    const pctScale = easeOutBack(span(t, 2500, 3800));
    if (morph < 0.55) {
      el.innerHTML = `
        <div class="big-line" id="words">
          <span>75</span>
          <span style="opacity:${outOpacity}"> out of 100</span>
        </div>
        <div class="per-note" style="opacity:${showNote};transform:translateY(${(1 - showNote) * 10}px)">
          per cent = per 100
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="big-line" style="transform:scale(${0.7 + 0.3 * pctScale})">75%</div>
        <div class="per-note" style="opacity:1">per cent = per 100</div>
      `;
      callout.innerHTML = `<span style="font-family:var(--display);font-weight:700">75%</span>`;
    }
    if (morph < 0.55) callout.innerHTML = "75 out of 100";
  }

  function paintBars(t) {
    const rows = [
      { id: "a", start: 200, end: 1600, pct: 50 },
      { id: "b", start: 2000, end: 3400, pct: 20 },
      { id: "c", start: 3800, end: 5200, pct: 40 },
    ];
    rows.forEach((row) => {
      const p = easeOut(span(t, row.start, row.end));
      const fill = $("fill-" + row.id);
      const label = $("pct-" + row.id);
      if (fill) fill.style.width = p * row.pct + "%";
      if (label) label.textContent = p > 0.08 ? Math.round(p * row.pct) + "%" : "";
    });
    if (t > 5200) callout.innerHTML = "50%, 20%, 40%";
  }

  function paintQuiz(t) {
    const quiz = $("quiz");
    if (!quiz) return;
    const enter = easeOut(span(t, 0, 900));
    quiz.style.opacity = String(enter);
    quiz.style.transform = `translateY(${(1 - enter) * 12}px)`;
  }

  function onAnswer(btn) {
    if (state.scene !== 5) return;
    const ok = btn.dataset.ok === "yes";
    const fb = $("quiz-fb");
    stage.querySelectorAll(".opt").forEach((b) => {
      if (b !== btn && ok) b.disabled = true;
    });
    if (ok) {
      btn.classList.add("right");
      btn.classList.remove("wrong");
      state.answer = "right";
      if (fb) fb.innerHTML = `Yes! ${frac(3, 10)} is 30 out of 100, so 30%.`;
      stage.querySelectorAll(".opt").forEach((b) => { b.disabled = true; });
    } else {
      btn.classList.add("wrong");
      state.answer = "wrong";
      if (fb) fb.textContent = "Not quite. Try another.";
    }
  }

  function paint(t) {
    const i = state.scene;
    if (i === 0 || i === 1) paintGrid(t);
    else if (i === 2) paintMorph(t);
    else if (i === 3) paintPercent(t);
    else if (i === 4) paintBars(t);
    else if (i === 5) paintQuiz(t);
  }

  /* ---------- player ---------- */
  function renderDots() {
    dotsEl.innerHTML = SCENES.map((s, i) =>
      `<button type="button" role="tab" aria-label="Scene ${i + 1}" aria-current="${i === state.scene ? "true" : "false"}" data-i="${i}"></button>`
    ).join("");
    dotsEl.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => goTo(+b.dataset.i));
    });
  }

  function syncButtons() {
    const last = state.scene === SCENES.length - 1;
    const first = state.scene === 0;
    btnBack.disabled = first;
    btnNext.disabled = last && state.waiting;
    const label = state.playing && !state.waiting ? "Pause" : "Play";
    btnPlay.textContent = label;
    btnPlay.setAttribute("aria-label", label);
    btnSpeed.textContent = String(state.speed).replace(/\.0$/, "") + "×";
    btnSpeed.setAttribute("aria-label", `Playback speed, currently ${state.speed} times`);
    renderDots();
  }

  function stopRaf() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
  }

  function tick(now) {
    if (!state.playing || state.waiting) return;
    if (!state.last) state.last = now;
    const dt = (now - state.last) * state.speed;
    state.last = now;
    state.time = Math.min(duration(), state.time + dt);
    paint(state.time);
    if (state.time >= duration()) {
      state.waiting = true;
      state.playing = false;
      paint(duration());
      syncButtons();
      return;
    }
    state.raf = requestAnimationFrame(tick);
  }

  function play() {
    if (state.waiting) {
      if (state.scene < SCENES.length - 1) {
        goTo(state.scene + 1);
        return;
      }
      // Last scene is finished: Play starts the story over.
      goTo(0);
      return;
    }
    state.playing = true;
    state.last = 0;
    syncButtons();
    stopRaf();
    state.raf = requestAnimationFrame(tick);
  }

  function pause() {
    state.playing = false;
    stopRaf();
    syncButtons();
  }

  function togglePlay() {
    if (state.playing && !state.waiting) pause();
    else play();
  }

  function goTo(i, atEnd = false) {
    state.scene = clamp(i, 0, SCENES.length - 1);
    state.time = atEnd || reduced ? duration(state.scene) : 0;
    state.waiting = atEnd || reduced;
    state.playing = !state.waiting;
    state.last = 0;
    buildScene(state.scene);
    // Allow layout to settle so grid metrics are correct
    requestAnimationFrame(() => {
      paint(state.time);
      syncButtons();
      if (state.playing) {
        stopRaf();
        state.raf = requestAnimationFrame(tick);
      }
    });
  }

  function replay() {
    goTo(state.scene, false);
  }

  function cycleSpeed() {
    const idx = SPEEDS.indexOf(state.speed);
    state.speed = SPEEDS[(idx + 1) % SPEEDS.length];
    syncButtons();
  }

  btnPlay.addEventListener("click", togglePlay);
  btnBack.addEventListener("click", () => goTo(state.scene - 1));
  btnNext.addEventListener("click", () => {
    if (state.scene < SCENES.length - 1) goTo(state.scene + 1);
  });
  btnReplay.addEventListener("click", replay);
  btnSpeed.addEventListener("click", cycleSpeed);

  document.addEventListener("keydown", (e) => {
    if (e.target && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    } else if (e.key === "ArrowRight") {
      if (state.scene < SCENES.length - 1) goTo(state.scene + 1);
    } else if (e.key === "ArrowLeft") {
      if (state.scene > 0) goTo(state.scene - 1);
    } else if (e.key === "r" || e.key === "R") {
      replay();
    }
  });

  window.__motion = {
    get state() {
      return {
        scene: state.scene,
        time: state.time,
        playing: state.playing,
        waiting: state.waiting,
        speed: state.speed,
        answer: state.answer,
        reduced,
      };
    },
    goTo,
    play,
    pause,
    replay,
    finish() {
      state.time = duration();
      state.waiting = true;
      state.playing = false;
      stopRaf();
      paint(state.time);
      syncButtons();
    },
    setSpeed(s) {
      state.speed = s;
      syncButtons();
    },
  };

  goTo(0);
})();
