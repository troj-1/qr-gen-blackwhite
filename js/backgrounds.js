/* ============================================================
   INTERACTIVE BACKGROUNDS — 3 designs for QR Generator
   ============================================================
   Design 1: Particle Network
   Design 2: Floating Geometry
   Design 3: Digital QR Field
   ============================================================ */

(function() {
  'use strict';

  /* ---- CONFIG ---- */
  var CFG = {
    particleCount: 80,
    particleCountMobile: 40,
    connectionDist: 140,
    mouseRadius: 250,
    mouseForce: 0.08,
    parallaxStrength: 0.035,
    lerpSpeed: 0.06,
    accent: 'rgba(255,255,255,',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };

  /* ---- SHARED STATE ---- */
  var canvas, ctx, W, H, dpr;
  var mouseX = 0.5, mouseY = 0.5;
  var smoothMouseX = 0.5, smoothMouseY = 0.5;
  var currentBg = null;
  var running = false;
  var rafId = null;
  var lastTime = 0;

  /* ---- UTILITIES ---- */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function dist(x1, y1, x2, y2) {
    var dx = x1 - x2, dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (currentBg && currentBg.resize) currentBg.resize();
  }

  function onPointerMove(e) {
    mouseX = (e.clientX || 0) / W;
    mouseY = (e.clientY || 0) / H;
  }

  function onVisibilityChange() {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    loop();
  }

  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function loop() {
    if (!running) return;
    var now = performance.now();
    var dt = Math.min((now - lastTime) / 16.67, 3);
    lastTime = now;

    smoothMouseX = lerp(smoothMouseX, mouseX, CFG.lerpSpeed * dt);
    smoothMouseY = lerp(smoothMouseY, mouseY, CFG.lerpSpeed * dt);

    ctx.clearRect(0, 0, W, H);

    if (currentBg && currentBg.draw) {
      currentBg.draw(dt, smoothMouseX, smoothMouseY);
    }

    rafId = requestAnimationFrame(loop);
  }

  /* ==========================================================
     DESIGN 1 — PARTICLE NETWORK
     ========================================================== */
  var ParticleNetwork = (function() {
    var particles = [];

    function init() {
      particles = [];
      var count = W < 600 ? CFG.particleCountMobile : CFG.particleCount;
      for (var i = 0; i < count; i++) {
        particles.push({
          x: rand(0, W),
          y: rand(0, H),
          vx: rand(-0.3, 0.3),
          vy: rand(-0.3, 0.3),
          size: rand(1, 2.5),
          depth: rand(0.3, 1),
          alpha: rand(0.15, 0.5)
        });
      }
    }

    function resize() { init(); }

    function draw(dt, mx, my) {
      var cx = mx * W;
      var cy = my * H;

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];

        if (!CFG.reducedMotion) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          var dx = p.x - cx;
          var dy = p.y - cy;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < CFG.mouseRadius && d > 0) {
            var force = (1 - d / CFG.mouseRadius) * CFG.mouseForce * p.depth;
            p.vx += (dx / d) * force;
            p.vy += (dy / d) * force;
          }

          p.vx *= 0.99;
          p.vy *= 0.99;

          if (p.x < -10) p.x = W + 10;
          if (p.x > W + 10) p.x = -10;
          if (p.y < -10) p.y = H + 10;
          if (p.y > H + 10) p.y = -10;
        }

        var parallaxX = (mx - 0.5) * CFG.parallaxStrength * W * (1 - p.depth);
        var parallaxY = (my - 0.5) * CFG.parallaxStrength * H * (1 - p.depth);
        var drawX = p.x + parallaxX;
        var drawY = p.y + parallaxY;

        ctx.beginPath();
        ctx.arc(drawX, drawY, p.size, 0, Math.PI * 2);
        ctx.fillStyle = CFG.accent + (p.alpha * p.depth) + ')';
        ctx.fill();

        for (var j = i + 1; j < particles.length; j++) {
          var p2 = particles[j];
          var p2x = p2.x + (mx - 0.5) * CFG.parallaxStrength * W * (1 - p2.depth);
          var p2y = p2.y + (my - 0.5) * CFG.parallaxStrength * H * (1 - p2.depth);
          var dd = dist(drawX, drawY, p2x, p2y);
          if (dd < CFG.connectionDist) {
            var lineAlpha = (1 - dd / CFG.connectionDist) * 0.12 * Math.min(p.depth, p2.depth);
            ctx.beginPath();
            ctx.moveTo(drawX, drawY);
            ctx.lineTo(p2x, p2y);
            ctx.strokeStyle = CFG.accent + lineAlpha + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    return { init: init, resize: resize, draw: draw, name: 'Particle Network' };
  })();

  /* ==========================================================
     DESIGN 2 — FLOATING GEOMETRY
     ========================================================== */
  var FloatingGeometry = (function() {
    var shapes = [];
    var SHAPE_TYPES = ['ring', 'triangle', 'hexagon', 'diamond', 'cross'];

    function createShape() {
      return {
        x: rand(0, W),
        y: rand(0, H),
        vx: rand(-0.15, 0.15),
        vy: rand(-0.1, 0.1),
        rotSpeed: rand(-0.005, 0.005),
        rot: rand(0, Math.PI * 2),
        size: rand(15, 55),
        depth: rand(0.2, 1),
        type: SHAPE_TYPES[Math.floor(rand(0, SHAPE_TYPES.length))],
        alpha: rand(0.03, 0.12),
        sides: 0
      };
    }

    function init() {
      shapes = [];
      var count = W < 600 ? 12 : 25;
      for (var i = 0; i < count; i++) {
        shapes.push(createShape());
      }
    }

    function resize() { init(); }

    function drawShape(x, y, size, rot, type, alpha) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.strokeStyle = CFG.accent + alpha + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();

      switch (type) {
        case 'ring':
          ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
          break;
        case 'triangle':
          for (var i = 0; i < 3; i++) {
            var a = (i / 3) * Math.PI * 2 - Math.PI / 2;
            var px = Math.cos(a) * size * 0.4;
            var py = Math.sin(a) * size * 0.4;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          break;
        case 'hexagon':
          for (var i = 0; i < 6; i++) {
            var a = (i / 6) * Math.PI * 2;
            var px = Math.cos(a) * size * 0.4;
            var py = Math.sin(a) * size * 0.4;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          break;
        case 'diamond':
          ctx.moveTo(0, -size * 0.4);
          ctx.lineTo(size * 0.25, 0);
          ctx.lineTo(0, size * 0.4);
          ctx.lineTo(-size * 0.25, 0);
          ctx.closePath();
          break;
        case 'cross':
          var s = size * 0.15;
          var l = size * 0.35;
          ctx.moveTo(-s, -l); ctx.lineTo(s, -l);
          ctx.lineTo(s, -s); ctx.lineTo(l, -s);
          ctx.lineTo(l, s); ctx.lineTo(s, s);
          ctx.lineTo(s, l); ctx.lineTo(-s, l);
          ctx.lineTo(-s, s); ctx.lineTo(-l, s);
          ctx.lineTo(-l, -s); ctx.lineTo(-s, -s);
          ctx.closePath();
          break;
      }

      ctx.stroke();
      ctx.restore();
    }

    function draw(dt, mx, my) {
      for (var i = 0; i < shapes.length; i++) {
        var s = shapes[i];

        if (!CFG.reducedMotion) {
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.rot += s.rotSpeed * dt;

          var dx = s.x - mx * W;
          var dy = s.y - my * H;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < CFG.mouseRadius * 1.5 && d > 0) {
            var push = (1 - d / (CFG.mouseRadius * 1.5)) * 0.3 * s.depth;
            s.x += (dx / d) * push;
            s.y += (dy / d) * push;
          }

          if (s.x < -60) s.x = W + 60;
          if (s.x > W + 60) s.x = -60;
          if (s.y < -60) s.y = H + 60;
          if (s.y > H + 60) s.y = -60;
        }

        var px = (mx - 0.5) * CFG.parallaxStrength * W * (1 - s.depth);
        var py = (my - 0.5) * CFG.parallaxStrength * H * (1 - s.depth);

        drawShape(s.x + px, s.y + py, s.size, s.rot, s.type, s.alpha * s.depth);
      }
    }

    return { init: init, resize: resize, draw: draw, name: 'Floating Geometry' };
  })();

  /* ==========================================================
     DESIGN 3 — DIGITAL QR FIELD
     ========================================================== */
  var DigitalQrField = (function() {
    var cells = [];
    var scanY = 0;
    var pulsePhase = 0;

    function init() {
      cells = [];
      var gridSize = W < 600 ? 50 : 35;
      var cols = Math.ceil(W / gridSize) + 2;
      var rows = Math.ceil(H / gridSize) + 2;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (Math.random() > 0.7) {
            cells.push({
              x: c * gridSize + rand(-5, 5),
              y: r * gridSize + rand(-5, 5),
              size: rand(3, 12),
              depth: rand(0.2, 1),
              alpha: rand(0.02, 0.1),
              phase: rand(0, Math.PI * 2),
              speed: rand(0.005, 0.02),
              isCorner: Math.random() > 0.85
            });
          }
        }
      }
    }

    function resize() { init(); }

    function drawCornerBracket(x, y, size, alpha) {
      var s = size;
      var t = Math.max(1, s * 0.15);
      ctx.strokeStyle = CFG.accent + alpha + ')';
      ctx.lineWidth = t;
      ctx.beginPath();
      ctx.moveTo(x - s / 2, y - s / 2 + s * 0.3);
      ctx.lineTo(x - s / 2, y - s / 2);
      ctx.lineTo(x - s / 2 + s * 0.3, y - s / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + s / 2, y - s / 2 + s * 0.3);
      ctx.lineTo(x + s / 2, y - s / 2);
      ctx.lineTo(x + s / 2 - s * 0.3, y - s / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - s / 2, y + s / 2 - s * 0.3);
      ctx.lineTo(x - s / 2, y + s / 2);
      ctx.lineTo(x - s / 2 + s * 0.3, y + s / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + s / 2, y + s / 2 - s * 0.3);
      ctx.lineTo(x + s / 2, y + s / 2);
      ctx.lineTo(x + s / 2 - s * 0.3, y + s / 2);
      ctx.stroke();
    }

    function draw(dt, mx, my) {
      pulsePhase += 0.008 * dt;
      scanY += 0.4 * dt;
      if (scanY > H + 40) scanY = -40;

      var cx = mx * W;
      var cy = my * H;

      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];

        var pulse = Math.sin(pulsePhase + c.phase) * 0.5 + 0.5;
        var fadeAlpha = c.alpha * (0.5 + pulse * 0.5);

        var dx = c.x - cx;
        var dy = c.y - cy;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < CFG.mouseRadius && d > 0) {
          var boost = (1 - d / CFG.mouseRadius) * 0.15;
          fadeAlpha += boost;
        }

        var scanDist = Math.abs(c.y - scanY);
        if (scanDist < 60) {
          fadeAlpha += (1 - scanDist / 60) * 0.12;
        }

        var px = (mx - 0.5) * CFG.parallaxStrength * W * (1 - c.depth);
        var py = (my - 0.5) * CFG.parallaxStrength * H * (1 - c.depth);
        var drawX = c.x + px;
        var drawY = c.y + py;

        if (c.isCorner) {
          drawCornerBracket(drawX, drawY, c.size * 1.5, fadeAlpha * c.depth);
        } else {
          var s = c.size * (0.8 + pulse * 0.2);
          ctx.fillStyle = CFG.accent + (fadeAlpha * c.depth) + ')';
          ctx.fillRect(drawX - s / 2, drawY - s / 2, s, s);
        }
      }

      ctx.fillStyle = CFG.accent + '0.025)';
      ctx.fillRect(0, scanY - 1, W, 2);
    }

    return { init: init, resize: resize, draw: draw, name: 'Digital QR Field' };
  })();

  /* ==========================================================
     BACKGROUND SELECTOR & CONTROLLER
     ========================================================== */
  var backgrounds = [ParticleNetwork, FloatingGeometry, DigitalQrField];
  var currentIndex = 0;

  function setBackground(index) {
    currentIndex = index;
    currentBg = backgrounds[index];
    currentBg.init();
    localStorage.setItem('qrc-bg', index);
    updateSelectorUI();
  }

  function cycleBackground() {
    setBackground((currentIndex + 1) % backgrounds.length);
  }

  function updateSelectorUI() {
    var btn = document.getElementById('bg-selector-btn');
    var label = document.getElementById('bg-selector-label');
    if (btn && label) {
      label.textContent = currentBg.name;
    }
  }

  function createSelector() {
    var wrap = document.createElement('div');
    wrap.id = 'bg-selector';
    wrap.innerHTML =
      '<button id="bg-selector-btn" title="Switch background style">' +
      '<span id="bg-selector-label">Particle Network</span>' +
      '<span class="bg-selector-hint">click to cycle</span>' +
      '</button>';
    document.body.appendChild(wrap);

    document.getElementById('bg-selector-btn').addEventListener('click', cycleBackground);
  }

  /* ==========================================================
     INIT
     ========================================================== */
  function boot() {
    canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    createSelector();

    var saved = parseInt(localStorage.getItem('qrc-bg'), 10);
    if (isNaN(saved) || saved < 0 || saved >= backgrounds.length) saved = 0;

    resize();
    setBackground(saved);

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
