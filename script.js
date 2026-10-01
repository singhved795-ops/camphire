/* Camphire — fire in the night
 * A self-contained animated campfire scene drawn on a single <canvas>.
 * No images, no libraries: stars, moon, mountains, pines and a live
 * particle campfire, all generated at runtime.
 */

(function () {
  "use strict";

  var canvas = document.getElementById("scene");
  var ctx = canvas.getContext("2d");

  var intro = document.getElementById("intro");
  var hud = document.getElementById("hud");
  var controls = document.getElementById("controls");
  var startBtn = document.getElementById("startBtn");
  var woodBtn = document.getElementById("woodBtn");
  var windBtn = document.getElementById("windBtn");
  var soundBtn = document.getElementById("soundBtn");
  var warmthFill = document.getElementById("warmthFill");

  var W = 0, H = 0, DPR = 1;
  var groundY = 0, fireX = 0, fireY = 0;

  var state = {
    started: false,
    intensity: 0.55,
    target: 0.55,
    flicker: 0,
    wind: 0,
    windTarget: 0,
    windMode: 0,
    pointer: { x: 0.5, y: 0.5 },
    look: { x: 0.5, y: 0.5 },
    t: 0
  };

  var WIND_MODES = [
    { label: "Calm", value: 0 },
    { label: "Breeze", value: 0.4 },
    { label: "Gust", value: 0.95 }
  ];

  var stars = [], trees = [], ridges = [];
  var flames = [], embers = [], smoke = [], sparks = [];

  /* ------------------------------------------------------------------ */
  /* Layout                                                              */
  /* ------------------------------------------------------------------ */

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    groundY = H * 0.8;
    fireX = W * 0.5;
    fireY = groundY;

    buildStars();
    buildTrees();
    buildRidges();
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function buildStars() {
    stars = [];
    var count = Math.round((W * H) / 6500);
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * groundY * 0.95,
        r: rand(0.4, 1.5),
        base: rand(0.25, 0.9),
        speed: rand(0.4, 1.6),
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.2 ? rand(190, 230) : rand(40, 60)
      });
    }
  }

  function buildTrees() {
    trees = [];
    var n = Math.round(W / 90);
    for (var i = 0; i <= n; i++) {
      var x = (i / n) * (W + 120) - 60 + rand(-18, 18);
      var h = rand(H * 0.1, H * 0.24);
      trees.push({ x: x, h: h, w: h * rand(0.32, 0.44), depth: rand(0.5, 1) });
    }
  }

  function buildRidges() {
    ridges = [];
    var depths = [0.25, 0.45, 0.65];
    for (var d = 0; d < depths.length; d++) {
      var pts = [];
      var seg = 8;
      for (var i = 0; i <= seg; i++) {
        pts.push({ x: (i / seg) * W, y: groundY - rand(H * 0.06, H * 0.2) });
      }
      ridges.push({ pts: pts, depth: depths[d] });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Spawning                                                            */
  /* ------------------------------------------------------------------ */

  function spawnFlame() {
    var spread = 14 + state.intensity * 26;
    var up = 2.2 + state.intensity * 3.4;
    flames.push({
      x: fireX + rand(-spread, spread),
      y: fireY - rand(0, 14),
      vx: rand(-0.4, 0.4),
      vy: -rand(up * 0.7, up),
      life: 0,
      max: rand(0.7, 1.4),
      r: rand(7, 16) * (0.7 + state.intensity * 0.6),
      seed: Math.random() * 100
    });
  }

  function spawnEmber() {
    embers.push({
      x: fireX + rand(-18, 18),
      y: fireY - rand(0, 10),
      vx: rand(-0.6, 0.6),
      vy: -rand(1.6, 3.6),
      life: 0,
      max: rand(1.6, 3.4),
      r: rand(0.9, 2.2)
    });
  }

  function spawnSmoke() {
    smoke.push({
      x: fireX + rand(-20, 20),
      y: fireY - rand(30, 70),
      vx: rand(-0.3, 0.3),
      vy: -rand(0.5, 1.1),
      life: 0,
      max: rand(3, 6),
      r: rand(16, 34)
    });
  }

  function burstSpark(n) {
    for (var i = 0; i < n; i++) {
      var a = rand(-Math.PI * 0.85, -Math.PI * 0.15);
      var sp = rand(2, 6.5);
      sparks.push({
        x: fireX + rand(-10, 10),
        y: fireY - 8,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        max: rand(0.6, 1.5),
        r: rand(0.8, 2)
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Update                                                              */
  /* ------------------------------------------------------------------ */

  function update(dt) {
    state.t += dt;
    state.flicker = 0.86 + 0.14 * Math.sin(state.t * 11) + 0.08 * Math.sin(state.t * 23.3);
    state.intensity += (state.target - state.intensity) * Math.min(1, dt * 2.2);
    state.wind += (state.windTarget - state.wind) * Math.min(1, dt * 1.6);

    state.look.x += (state.pointer.x - state.look.x) * Math.min(1, dt * 3);
    state.look.y += (state.pointer.y - state.look.y) * Math.min(1, dt * 3);

    var rate = state.intensity;
    var wind = state.wind;

    // flames
    var n = Math.min(12, Math.max(0, Math.round(rate * 6)));
    for (var i = 0; i < n; i++) spawnFlame();

    for (var f = flames.length - 1; f >= 0; f--) {
      var p = flames[f];
      p.life += dt;
      var turb = Math.sin(state.t * 4 + p.seed) * 0.9;
      p.vx += (turb + wind * 2.2) * dt * 6;
      p.vy -= 1.4 * dt;                 // buoyancy
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vx *= 0.97;
      if (p.life >= p.max) flames.splice(f, 1);
    }

    if (Math.random() < rate * 12 * dt) spawnEmber();
    for (var e = embers.length - 1; e >= 0; e--) {
      var q = embers[e];
      q.life += dt;
      q.vx += (Math.sin(state.t * 3 + q.x) * 0.6 + wind * 3) * dt * 6;
      q.vy -= 0.6 * dt;
      q.x += q.vx * dt * 60;
      q.y += q.vy * dt * 60;
      if (q.life >= q.max) embers.splice(e, 1);
    }

    if (Math.random() < rate * 4 * dt) spawnSmoke();
    for (var s = smoke.length - 1; s >= 0; s--) {
      var m = smoke[s];
      m.life += dt;
      m.vx += wind * 1.4 * dt * 6;
      m.x += m.vx * dt * 30;
      m.y += m.vy * dt * 30;
      m.r += 8 * dt;
      if (m.life >= m.max) smoke.splice(s, 1);
    }

    for (var k = sparks.length - 1; k >= 0; k--) {
      var sp = sparks[k];
      sp.life += dt;
      sp.vy += 6 * dt;                  // gravity
      sp.vx += wind * 2 * dt * 6;
      sp.x += sp.vx * dt * 60;
      sp.y += sp.vy * dt * 60;
      if (sp.life >= sp.max) sparks.splice(k, 1);
    }

    warmthFill.style.width = Math.round(state.intensity * 100) + "%";
  }

  /* ------------------------------------------------------------------ */
  /* Drawing                                                             */
  /* ------------------------------------------------------------------ */

  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, groundY);
    g.addColorStop(0, "#050510");
    g.addColorStop(0.45, "#0b1024");
    g.addColorStop(0.78, "#1a1533");
    g.addColorStop(1, "#2a1a2e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, groundY + 2);
  }

  function drawStars() {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = s.base * (0.6 + 0.4 * Math.sin(state.t * s.speed + s.phase));
      ctx.globalAlpha = tw;
      ctx.fillStyle = "hsl(" + s.hue + ",80%,88%)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMoon() {
    var mx = W * 0.8, my = H * 0.16, r = Math.min(W, H) * 0.05;
    var g = ctx.createRadialGradient(mx, my, r * 0.4, mx, my, r * 4);
    g.addColorStop(0, "rgba(230,236,255,0.28)");
    g.addColorStop(1, "rgba(230,236,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mx, my, r * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#eef1ff";
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(200,205,235,0.5)";
    ctx.beginPath();
    ctx.arc(mx - r * 0.3, my - r * 0.2, r * 0.16, 0, Math.PI * 2);
    ctx.arc(mx + r * 0.28, my + r * 0.24, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  function parallax(depth) {
    return (state.look.x - 0.5) * 40 * depth;
  }

  function drawRidges() {
    for (var i = 0; i < ridges.length; i++) {
      var r = ridges[i];
      ctx.save();
      ctx.translate(parallax(r.depth), 0);
      ctx.beginPath();
      ctx.moveTo(-60, groundY + 40);
      for (var p = 0; p < r.pts.length; p++) {
        ctx.lineTo(r.pts[p].x, r.pts[p].y);
      }
      ctx.lineTo(W + 60, groundY + 40);
      ctx.closePath();
      var shade = 12 + r.depth * 14;
      ctx.fillStyle = "rgb(" + (shade * 0.7) + "," + (shade * 0.6) + "," + (shade * 0.9) + ")";
      ctx.fill();
      ctx.restore();
    }
  }

  function drawGround() {
    var g = ctx.createLinearGradient(0, groundY - 10, 0, H);
    g.addColorStop(0, "#171326");
    g.addColorStop(1, "#07060d");
    ctx.fillStyle = g;
    ctx.fillRect(0, groundY - 4, W, H - groundY + 4);

    // warm pool of light from the fire on the ground
    var glow = ctx.createRadialGradient(fireX, fireY, 6, fireX, fireY, 260 + state.intensity * 260);
    var a = 0.34 * state.intensity * state.flicker;
    glow.addColorStop(0, "rgba(255,150,60," + a + ")");
    glow.addColorStop(0.5, "rgba(255,110,30," + a * 0.4 + ")");
    glow.addColorStop(1, "rgba(255,110,30,0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(fireX, fireY + 8, 340 + state.intensity * 260, 120 + state.intensity * 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  function drawTrees() {
    for (var i = 0; i < trees.length; i++) {
      var t = trees[i];
      ctx.save();
      ctx.translate(t.x + parallax(t.depth), 0);
      ctx.fillStyle = "rgba(5,4,12,0.94)";
      var baseY = groundY + 6;
      var topY = baseY - t.h;
      var layers = 4;
      for (var l = 0; l < layers; l++) {
        var ly = topY + (t.h / layers) * l;
        var lw = (t.w * 0.55) * (l + 1.3) / layers + t.w * 0.28;
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.lineTo(lw, ly + t.h / layers + 4);
        ctx.lineTo(-lw, ly + t.h / layers + 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillRect(-2, baseY - 10, 4, 12);
      ctx.restore();
    }
  }

  function drawLogs() {
    ctx.save();
    ctx.translate(fireX, fireY);

    // embers between the logs
    ctx.globalCompositeOperation = "lighter";
    var eg = ctx.createRadialGradient(0, -4, 2, 0, -4, 46);
    eg.addColorStop(0, "rgba(255,190,90," + (0.7 * state.flicker) + ")");
    eg.addColorStop(1, "rgba(255,120,30,0)");
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(0, -4, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    // crossed logs
    function log(rot, len, wid) {
      ctx.save();
      ctx.rotate(rot);
      var g = ctx.createLinearGradient(0, -wid, 0, wid);
      g.addColorStop(0, "#3a2418");
      g.addColorStop(0.5, "#241109");
      g.addColorStop(1, "#120804");
      ctx.fillStyle = g;
      roundRect(-len / 2, -wid / 2, len, wid, wid / 2);
      ctx.fill();
      ctx.restore();
    }
    log(-0.32, 150, 20);
    log(0.34, 140, 18);
    log(0.02, 118, 16);

    // glowing coals on top
    ctx.globalCompositeOperation = "lighter";
    for (var c = 0; c < 7; c++) {
      var cx = Math.sin(c * 2.1) * 34;
      var cy = -10 + Math.cos(c * 1.7) * 4;
      var cr = 3 + (c % 3);
      var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 3);
      cg.addColorStop(0, "rgba(255,210,130," + (0.8 * state.flicker) + ")");
      cg.addColorStop(1, "rgba(255,120,20,0)");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(cx, cy, cr * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawFlames() {
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < flames.length; i++) {
      var p = flames[i];
      var k = p.life / p.max;           // 0 at birth -> 1 at death
      var alpha = (1 - k) * 0.85 * state.flicker;
      var hue = 52 - k * 42;            // yellow -> orange -> red
      var light = 60 - k * 20;
      var r = p.r * (1 - k * 0.55);
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, "hsla(" + hue + ",100%," + light + "%," + alpha + ")");
      g.addColorStop(0.5, "hsla(" + (hue - 8) + ",100%," + (light - 12) + "%," + alpha * 0.5 + ")");
      g.addColorStop(1, "hsla(" + (hue - 16) + ",100%," + (light - 25) + "%,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function drawEmbersAndSparks() {
    ctx.globalCompositeOperation = "lighter";
    var all = embers.concat(sparks);
    for (var i = 0; i < all.length; i++) {
      var p = all[i];
      var k = p.life / p.max;
      var alpha = (1 - k) * 0.95;
      ctx.fillStyle = "rgba(255," + Math.round(170 - k * 90) + "," + Math.round(80 - k * 60) + "," + alpha + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function drawSmoke() {
    for (var i = 0; i < smoke.length; i++) {
      var m = smoke[i];
      var k = m.life / m.max;
      var alpha = 0.12 * (1 - k) * (0.5 + state.intensity * 0.5);
      var g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
      g.addColorStop(0, "rgba(120,116,130," + alpha + ")");
      g.addColorStop(1, "rgba(120,116,130,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawVignette() {
    var g = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.25, W / 2, H * 0.55, Math.max(W, H) * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawStars();
    drawMoon();
    drawRidges();
    drawGround();
    drawTrees();
    drawSmoke();
    drawLogs();
    drawFlames();
    drawEmbersAndSparks();
    drawVignette();
  }

  /* ------------------------------------------------------------------ */
  /* Loop                                                                */
  /* ------------------------------------------------------------------ */

  var last = 0;
  function frame(now) {
    if (!last) last = now;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.started) update(dt);
    else {
      // gentle idle motion behind the intro
      state.t += dt;
      state.flicker = 0.86 + 0.14 * Math.sin(state.t * 11);
      for (var i = 0; i < 3; i++) spawnFlame();
      for (var f = flames.length - 1; f >= 0; f--) {
        var p = flames[f];
        p.life += dt;
        p.vy -= 1.2 * dt;
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        if (p.life >= p.max) flames.splice(f, 1);
      }
    }
    render();
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ */
  /* Interaction                                                         */
  /* ------------------------------------------------------------------ */

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", function (ev) {
    state.pointer.x = ev.clientX / W;
    state.pointer.y = ev.clientY / H;
  });

  canvas.addEventListener("pointerdown", function (ev) {
    if (!state.started) return;
    var dx = ev.clientX - fireX;
    var dy = ev.clientY - fireY;
    if (Math.sqrt(dx * dx + dy * dy) < 160) {
      state.target = Math.min(1, state.target + 0.18);
      burstSpark(22);
    }
  });

  startBtn.addEventListener("click", function () {
    state.started = true;
    intro.classList.add("hidden");
    hud.classList.remove("hidden");
    controls.classList.remove("hidden");
    state.target = Math.max(state.target, 0.7);
    burstSpark(40);
    initAudio();
  });

  woodBtn.addEventListener("click", function () {
    state.target = Math.min(1, state.target + 0.28);
    burstSpark(46);
  });

  windBtn.addEventListener("click", function () {
    state.windMode = (state.windMode + 1) % WIND_MODES.length;
    var mode = WIND_MODES[state.windMode];
    state.windTarget = mode.value * (Math.random() < 0.5 ? 1 : -1);
    if (mode.value === 0) state.windTarget = 0;
    windBtn.textContent = "Wind: " + mode.label;
  });

  /* ------------------------------------------------------------------ */
  /* Sound — synthesised campfire crackle                                */
  /* ------------------------------------------------------------------ */

  var audio = null;

  function initAudio() {
    if (audio) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ac = new AC();

      // brown-ish noise bed
      var len = ac.sampleRate * 2;
      var buf = ac.createBuffer(1, len, ac.sampleRate);
      var data = buf.getChannelData(0);
      var l = 0;
      for (var i = 0; i < len; i++) {
        var white = Math.random() * 2 - 1;
        l = (l + 0.02 * white) / 1.02;
        data[i] = l * 3.2;
      }
      var src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      var lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;

      var bedGain = ac.createGain();
      bedGain.gain.value = 0.0;

      src.connect(lp).connect(bedGain).connect(ac.destination);
      src.start();

      audio = { ac: ac, bedGain: bedGain, on: false, timer: null, popTimer: null };
      soundBtn.textContent = "Sound: On";
      audio.on = true;
      bedGain.gain.setTargetAtTime(0.05, ac.currentTime, 0.5);
      schedulePops();
    } catch (e) {
      /* audio is a bonus; ignore failures */
    }
  }

  function schedulePops() {
    if (!audio || !audio.on) return;
    var delay = rand(0.08, 0.5);
    audio.popTimer = setTimeout(function () {
      pop();
      schedulePops();
    }, delay * 1000);
  }

  function pop() {
    if (!audio || !audio.on) return;
    var ac = audio.ac;
    var t = ac.currentTime;
    var len = Math.floor(ac.sampleRate * 0.03);
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    var s = ac.createBufferSource();
    s.buffer = buf;
    var hp = ac.createBiquadFilter();
    hp.type = "bandpass";
    hp.frequency.value = rand(900, 2600);
    var g = ac.createGain();
    g.gain.value = rand(0.06, 0.22) * (0.4 + state.intensity);
    s.connect(hp).connect(g).connect(ac.destination);
    s.start(t);
    s.stop(t + 0.05);
  }

  soundBtn.addEventListener("click", function () {
    if (!audio) { initAudio(); return; }
    audio.on = !audio.on;
    soundBtn.textContent = "Sound: " + (audio.on ? "On" : "Off");
    audio.bedGain.gain.setTargetAtTime(audio.on ? 0.05 : 0.0, audio.ac.currentTime, 0.2);
    if (audio.on) schedulePops();
    else if (audio.popTimer) clearTimeout(audio.popTimer);
  });

  /* ------------------------------------------------------------------ */

  resize();
  requestAnimationFrame(frame);
})();
