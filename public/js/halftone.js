// Synelle's eye. Turns any picture into a rotated halftone dot screen on a canvas.
//
//   const plate = new Plate(canvas, { cell: 6, angle: 45 });
//   plate.setSource({ image: "assets/frames/0001.jpg", scene: "street" });
//   plate.draw();                          // full print
//   plate.draw({ progress: 0.4 });         // mid-way through inking
//   plate.draw({ focus: { x, y, r } });    // finer screen where she's looking

(function () {
  const SAMPLE = 2; // luminance is sampled every 2 CSS px

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const grey = (v, a = 1) => `rgba(${v},${v},${v},${a})`;

  // ---------------------------------------------------------------------------
  // Stand-in scenes, drawn in greyscale, for logs that don't have a frame yet.
  // Each takes (ctx, w, h, rand) and paints the whole area.

  function linear(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, v]) => g.addColorStop(o, grey(v)));
    return g;
  }

  function radial(ctx, x, y, r, stops) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([o, v, a = 1]) => g.addColorStop(o, grey(v, a)));
    return g;
  }

  function poly(ctx, pts, fill) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function ellipse(ctx, x, y, rx, ry, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  // A person, seen from behind, standing. (x, feet) is where they stand.
  function figure(ctx, x, feet, height, v, stride = 0) {
    const u = height / 10;
    ctx.fillStyle = grey(v);
    // legs
    poly(ctx, [[x - 1.1 * u, feet - 4.6 * u], [x - 0.1 * u, feet - 4.6 * u], [x - 0.3 * u - stride * u, feet], [x - 1.2 * u - stride * u, feet]], grey(v));
    poly(ctx, [[x + 0.1 * u, feet - 4.6 * u], [x + 1.1 * u, feet - 4.6 * u], [x + 1.2 * u + stride * u, feet], [x + 0.3 * u + stride * u, feet]], grey(v));
    // torso and shoulders
    ctx.beginPath();
    ctx.roundRect(x - 1.7 * u, feet - 8.3 * u, 3.4 * u, 4.1 * u, [1.2 * u, 1.2 * u, 0.4 * u, 0.4 * u]);
    ctx.fill();
    // neck and head
    ctx.fillRect(x - 0.4 * u, feet - 8.9 * u, 0.8 * u, 0.8 * u);
    ellipse(ctx, x, feet - 9.35 * u, 0.85 * u, 0.95 * u, grey(v));
  }

  // A person sitting, from the side-ish. (x, seat) is the seat level.
  function sitter(ctx, x, seat, height, v, lean = 0) {
    const u = height / 10;
    ctx.fillStyle = grey(v);
    ctx.beginPath();
    ctx.roundRect(x - 1.5 * u + lean * u, seat - 5.2 * u, 3 * u, 5.2 * u, [1.1 * u, 1.1 * u, 0.3 * u, 0.3 * u]);
    ctx.fill();
    poly(ctx, [[x - 1.5 * u, seat - 0.8 * u], [x + 3.2 * u, seat - 0.8 * u], [x + 3.4 * u, seat + 2.6 * u], [x + 2.4 * u, seat + 2.6 * u], [x + 2.2 * u, seat + 0.4 * u], [x - 1.5 * u, seat + 0.4 * u]], grey(v));
    ellipse(ctx, x + lean * u, seat - 6.2 * u, 0.85 * u, 0.95 * u, grey(v));
  }

  const SCENES = {
    street(ctx, w, h, rand) {
      const hz = h * 0.64;
      ctx.fillStyle = linear(ctx, 0, 0, 0, hz, [[0, 150], [0.7, 225], [1, 245]]);
      ctx.fillRect(0, 0, w, hz);
      ctx.fillStyle = radial(ctx, w * 0.6, hz - h * 0.05, h * 0.28, [[0, 255], [0.25, 250], [1, 240, 0]]);
      ctx.fillRect(0, 0, w, h);
      // far skyline
      let x = 0;
      while (x < w) {
        const bw = w * (0.03 + rand() * 0.05);
        const bh = h * (0.06 + rand() * 0.16);
        ctx.fillStyle = grey(125 + rand() * 25);
        ctx.fillRect(x, hz - bh, bw + 1, bh + 2);
        x += bw;
      }
      // road
      const vx = w * 0.56;
      ctx.fillStyle = linear(ctx, 0, hz, 0, h, [[0, 185], [0.4, 120], [1, 70]]);
      poly(ctx, [[vx - w * 0.02, hz], [vx + w * 0.02, hz], [w * 1.1, h], [-w * 0.1, h]], ctx.fillStyle);
      // sun glare on the road
      ctx.fillStyle = radial(ctx, w * 0.58, hz + h * 0.12, h * 0.3, [[0, 235, 0.9], [1, 200, 0]]);
      ctx.fillRect(0, hz, w, h - hz);
      // pavements and near buildings, in perspective
      poly(ctx, [[0, h * 0.08], [vx - w * 0.07, hz - h * 0.12], [vx - w * 0.07, hz], [0, h]], grey(45));
      poly(ctx, [[w, h * 0.02], [vx + w * 0.08, hz - h * 0.14], [vx + w * 0.08, hz], [w, h]], grey(38));
      // lit windows on the near buildings
      for (let i = 0; i < 70; i++) {
        const side = rand() < 0.5 ? -1 : 1;
        const t = rand();
        const edge = side < 0 ? 0 : w;
        const px = edge + (vx + side * w * 0.075 - edge) * t;
        const top = side < 0 ? h * 0.08 + (hz - h * 0.12 - h * 0.08) * t : h * 0.02 + (hz - h * 0.14 - h * 0.02) * t;
        const bottom = h + (hz - h) * t;
        const py = top + (bottom - top) * (0.1 + rand() * 0.55);
        const s = (1 - t) * w * 0.018 + 2;
        ctx.fillStyle = grey(170 + rand() * 80, 0.9);
        ctx.fillRect(px - s / 2, py, s, s * 1.4);
      }
      // street lamps
      ctx.strokeStyle = grey(30);
      for (let i = 0; i < 4; i++) {
        const t = i / 4;
        const px = w * 0.2 + (vx - w * 0.06 - w * 0.2) * t;
        const base = h * 0.92 + (hz - h * 0.92) * t;
        const len = (1 - t) * h * 0.55 + h * 0.06;
        ctx.lineWidth = (1 - t) * 5 + 1;
        ctx.beginPath();
        ctx.moveTo(px, base);
        ctx.lineTo(px, base - len);
        ctx.lineTo(px + len * 0.12, base - len);
        ctx.stroke();
        ctx.fillStyle = radial(ctx, px + len * 0.12, base - len + 4, len * 0.18, [[0, 255], [1, 255, 0]]);
        ctx.fillRect(px - len, base - len * 1.3, len * 2.4, len);
      }
      // the subject, walking ahead
      figure(ctx, w * 0.5, h * 0.93, h * 0.42, 22, 0.35);
    },

    desk(ctx, w, h, rand) {
      ctx.fillStyle = linear(ctx, 0, 0, w, h, [[0, 55], [1, 25]]);
      ctx.fillRect(0, 0, w, h);
      // night window, top right
      ctx.fillStyle = linear(ctx, 0, 0, 0, h * 0.5, [[0, 95], [1, 120]]);
      ctx.fillRect(w * 0.62, h * 0.04, w * 0.34, h * 0.42);
      ctx.fillStyle = grey(30);
      ctx.fillRect(w * 0.785, h * 0.04, w * 0.012, h * 0.42);
      ctx.fillRect(w * 0.62, h * 0.24, w * 0.34, h * 0.012);
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = grey(200, 0.7);
        ctx.fillRect(w * (0.64 + rand() * 0.3), h * (0.3 + rand() * 0.14), 3, 4);
      }
      // desk
      poly(ctx, [[0, h * 0.62], [w, h * 0.58], [w, h], [0, h]], linear(ctx, 0, h * 0.6, 0, h, [[0, 95], [1, 50]]));
      // screen glow falling on the desk
      ctx.fillStyle = radial(ctx, w * 0.42, h * 0.62, w * 0.45, [[0, 230, 0.55], [1, 200, 0]]);
      ctx.fillRect(0, 0, w, h);
      // laptop screen
      poly(ctx, [[w * 0.22, h * 0.18], [w * 0.62, h * 0.2], [w * 0.6, h * 0.6], [w * 0.24, h * 0.6]], grey(250));
      ctx.fillStyle = grey(175);
      for (let i = 0; i < 14; i++) {
        const y = h * (0.25 + i * 0.024);
        const indent = [0, 1, 1, 2, 2, 1, 0, 1, 2, 3, 2, 1, 0, 0][i];
        ctx.fillRect(w * (0.27 + indent * 0.02), y, w * (0.06 + rand() * 0.18), h * 0.009);
      }
      // laptop base
      poly(ctx, [[w * 0.24, h * 0.6], [w * 0.6, h * 0.6], [w * 0.68, h * 0.72], [w * 0.14, h * 0.72]], grey(110));
      // mug
      ctx.fillStyle = grey(150);
      ctx.fillRect(w * 0.76, h * 0.5, w * 0.07, h * 0.14);
      ellipse(ctx, w * 0.795, h * 0.64, w * 0.035, h * 0.015, grey(150));
      ellipse(ctx, w * 0.795, h * 0.5, w * 0.035, h * 0.015, grey(40));
      ctx.lineWidth = w * 0.008;
      ctx.strokeStyle = grey(150);
      ctx.beginPath();
      ctx.arc(w * 0.835, h * 0.565, h * 0.035, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      // his head and shoulder, in the foreground, lit from the screen
      ellipse(ctx, w * 0.08, h * 0.62, w * 0.1, h * 0.2, grey(18));
      poly(ctx, [[-w * 0.05, h * 0.8], [w * 0.2, h * 0.84], [w * 0.28, h], [-w * 0.05, h]], grey(18));
    },

    train(ctx, w, h, rand) {
      const hz = h * 0.48;
      ctx.fillStyle = linear(ctx, 0, 0, 0, hz, [[0, 205], [1, 245]]);
      ctx.fillRect(0, 0, w, hz);
      const hill = (base, amp, freq, phase, v) => {
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 6) {
          ctx.lineTo(x, base + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.7 + phase) * amp * 0.3);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = grey(v);
        ctx.fill();
      };
      hill(hz - h * 0.02, h * 0.05, 0.006, 1, 170);
      hill(hz + h * 0.08, h * 0.04, 0.011, 3, 128);
      hill(hz + h * 0.2, h * 0.03, 0.02, 5, 88);
      // telegraph poles, smeared by speed
      for (let i = 0; i < 5; i++) {
        const px = w * (0.1 + i * 0.22 + rand() * 0.05);
        for (let s = 0; s < 14; s++) {
          ctx.fillStyle = grey(40, 0.09);
          ctx.fillRect(px + s * 3, h * 0.12, w * 0.012, h * 0.7);
        }
      }
      // horizontal speed streaks
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = grey(rand() < 0.5 ? 220 : 60, 0.15);
        ctx.fillRect(rand() * w, hz + rand() * h * 0.4, w * (0.1 + rand() * 0.3), 2);
      }
      // his reflection on the glass
      ctx.globalAlpha = 0.18;
      ellipse(ctx, w * 0.3, h * 0.42, w * 0.06, h * 0.12, grey(20));
      poly(ctx, [[w * 0.16, h * 0.62], [w * 0.44, h * 0.62], [w * 0.5, h], [w * 0.1, h]], grey(20));
      ctx.globalAlpha = 1;
      // window frame
      ctx.fillStyle = grey(35);
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.roundRect(w * 0.07, h * 0.1, w * 0.86, h * 0.72, h * 0.08);
      ctx.fill("evenodd");
      ctx.fillStyle = grey(75);
      ctx.fillRect(0, h * 0.86, w, h * 0.14);
    },

    rooftop(ctx, w, h, rand) {
      const hz = h * 0.62;
      ctx.fillStyle = linear(ctx, 0, 0, 0, hz, [[0, 130], [0.6, 205], [1, 250]]);
      ctx.fillRect(0, 0, w, hz);
      ctx.fillStyle = radial(ctx, w * 0.7, hz, h * 0.35, [[0, 255], [0.2, 252], [1, 240, 0]]);
      ctx.fillRect(0, 0, w, hz);
      // distant city
      let x = 0;
      while (x < w) {
        const bw = w * (0.02 + rand() * 0.04);
        const bh = h * (0.03 + rand() * 0.1);
        ctx.fillStyle = grey(95 + rand() * 30);
        ctx.fillRect(x, hz - bh, bw + 1, bh + 1);
        x += bw;
      }
      // roof and railing
      ctx.fillStyle = linear(ctx, 0, hz, 0, h, [[0, 70], [1, 40]]);
      ctx.fillRect(0, hz, w, h - hz);
      ctx.fillStyle = grey(30);
      ctx.fillRect(0, hz - h * 0.05, w, h * 0.012);
      for (let i = 0; i < 24; i++) ctx.fillRect(i * (w / 23), hz - h * 0.05, 3, h * 0.05);
      // string lights
      for (let i = 0; i <= 28; i++) {
        const t = i / 28;
        const lx = t * w;
        const ly = h * 0.1 + Math.sin(t * Math.PI) * h * 0.14;
        ctx.fillStyle = radial(ctx, lx, ly, 10, [[0, 255], [1, 255, 0]]);
        ctx.fillRect(lx - 10, ly - 10, 20, 20);
      }
      ctx.strokeStyle = grey(40);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 28; i++) {
        const t = i / 28;
        ctx.lineTo(t * w, h * 0.1 + Math.sin(t * Math.PI) * h * 0.14 - 4);
      }
      ctx.stroke();
      // three friends, nobody watching the sun
      sitter(ctx, w * 0.18, h * 0.8, h * 0.36, 20, 0.4);
      figure(ctx, w * 0.42, h * 0.97, h * 0.5, 16, 0.1);
      sitter(ctx, w * 0.7, h * 0.82, h * 0.34, 24, -0.3);
    },

    sea(ctx, w, h, rand) {
      const hz = h * 0.5;
      ctx.fillStyle = linear(ctx, 0, 0, 0, hz, [[0, 170], [1, 238]]);
      ctx.fillRect(0, 0, w, hz);
      ctx.fillStyle = radial(ctx, w * 0.62, hz, h * 0.22, [[0, 255], [0.3, 250], [1, 235, 0]]);
      ctx.fillRect(0, 0, w, hz);
      ctx.fillStyle = linear(ctx, 0, hz, 0, h * 0.8, [[0, 175], [1, 105]]);
      ctx.fillRect(0, hz, w, h * 0.3);
      // the sun's path on the water
      for (let i = 0; i < 70; i++) {
        const t = rand();
        const y = hz + t * h * 0.3;
        const spread = w * (0.02 + t * 0.12);
        ctx.fillStyle = grey(250, 0.55);
        ctx.fillRect(w * 0.62 - spread / 2 + (rand() - 0.5) * spread, y, spread * (0.2 + rand() * 0.5), 1.5 + t * 2);
      }
      // wet sand, then dry
      ctx.fillStyle = linear(ctx, 0, h * 0.78, 0, h, [[0, 150], [0.3, 200], [1, 215]]);
      poly(ctx, [[0, h * 0.8], [w * 0.5, h * 0.78], [w, h * 0.81], [w, h], [0, h]], ctx.fillStyle);
      figure(ctx, w * 0.32, h * 0.9, h * 0.3, 25, 0);
    },

    cafe(ctx, w, h, rand) {
      ctx.fillStyle = grey(140);
      ctx.fillRect(0, 0, w, h);
      // wood grain
      for (let i = 0; i < 60; i++) {
        ctx.strokeStyle = grey(110 + rand() * 50, 0.5);
        ctx.lineWidth = 1 + rand() * 3;
        ctx.beginPath();
        const y0 = rand() * h;
        for (let x = 0; x <= w; x += 12) ctx.lineTo(x, y0 + Math.sin(x * 0.01 + i) * 8);
        ctx.stroke();
      }
      ctx.fillStyle = radial(ctx, w * 0.3, h * 0.2, w * 0.6, [[0, 220, 0.5], [1, 140, 0]]);
      ctx.fillRect(0, 0, w, h);
      const cx = w * 0.52;
      const cy = h * 0.52;
      const r = Math.min(w, h) * 0.3;
      ellipse(ctx, cx + r * 0.08, cy + r * 0.1, r * 1.35, r * 1.35, grey(60, 0.4)); // shadow
      ellipse(ctx, cx, cy, r * 1.3, r * 1.3, grey(228)); // saucer
      ellipse(ctx, cx, cy, r * 1.02, r * 1.02, grey(200));
      ellipse(ctx, cx, cy, r * 0.9, r * 0.9, grey(248)); // rim
      ellipse(ctx, cx, cy, r * 0.76, r * 0.76, radial(ctx, cx, cy, r * 0.76, [[0, 75], [0.8, 60], [1, 115]]));
      // latte heart
      ctx.fillStyle = grey(205);
      ctx.beginPath();
      const s = r * 0.32;
      ctx.moveTo(cx, cy + s * 0.9);
      ctx.bezierCurveTo(cx - s * 1.6, cy - s * 0.1, cx - s * 0.6, cy - s * 1.2, cx, cy - s * 0.35);
      ctx.bezierCurveTo(cx + s * 0.6, cy - s * 1.2, cx + s * 1.6, cy - s * 0.1, cx, cy + s * 0.9);
      ctx.fill();
      // spoon
      ctx.save();
      ctx.translate(cx + r * 1.05, cy + r * 0.2);
      ctx.rotate(0.5);
      ctx.fillStyle = grey(215);
      ctx.fillRect(0, -r * 0.035, r * 0.9, r * 0.07);
      ellipse(ctx, 0, 0, r * 0.15, r * 0.1, grey(225));
      ctx.restore();
      // his phone, face down
      ctx.save();
      ctx.translate(w * 0.1, h * 0.62);
      ctx.rotate(-0.25);
      ctx.fillStyle = grey(30);
      ctx.beginPath();
      ctx.roundRect(0, 0, r * 0.7, r * 1.4, r * 0.1);
      ctx.fill();
      ctx.restore();
      // the other cups, half out of frame
      ellipse(ctx, w * 0.93, h * 0.12, r * 0.8, r * 0.8, grey(235));
      ellipse(ctx, w * 0.93, h * 0.12, r * 0.55, r * 0.55, grey(120));
    },
  };

  function drawScene(name, ctx, w, h) {
    const scene = SCENES[name] || SCENES.street;
    ctx.save();
    scene(ctx, w, h, mulberry32(name.length * 7919 + 17));
    ctx.restore();
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // ---------------------------------------------------------------------------

  class Plate {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.opts = Object.assign({ cell: 6, angle: 45, contrast: 1.15, grain: 0.35, mirror: false }, opts);
      this.theme = { ink: "#1C1B19", paper: "#E6DFCC", spot: "#1D5E7A", invert: false };
      this.source = null;
      this.lum = null;
      this.sampler = document.createElement("canvas");
      this.sctx = this.sampler.getContext("2d", { willReadFrequently: true });
      this.resize();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.w = Math.max(1, Math.round(rect.width));
      this.h = Math.max(1, Math.round(rect.height));
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.sampler.width = Math.ceil(this.w / SAMPLE);
      this.sampler.height = Math.ceil(this.h / SAMPLE);
      if (this.source) this.sample();
    }

    // source: { image, scene } | { element } (a video, canvas or loaded image)
    async setSource(source) {
      if (source.image) {
        try {
          const img = await loadImage(source.image);
          this.source = { element: img, scene: source.scene };
          this.sample(); // falls back to the scene itself if the image can't be read
          return;
        } catch (e) {
          this.source = { scene: source.scene }; // missing file: use the scene
        }
      } else {
        this.source = source;
      }
      this.sample();
    }

    // Reads the current source into the luminance buffer. Returns false if the
    // source can't be read (e.g. a cross-origin image), after falling back to its scene.
    sample() {
      const { sctx, sampler } = this;
      const sw = sampler.width;
      const sh = sampler.height;
      const el = this.source.element;
      sctx.save();
      sctx.clearRect(0, 0, sw, sh);
      if (el) {
        const ew = el.videoWidth || el.naturalWidth || el.width;
        const eh = el.videoHeight || el.naturalHeight || el.height;
        if (!ew || !eh) {
          sctx.restore();
          return true;
        }
        const scale = Math.max(sw / ew, sh / eh);
        const dw = ew * scale;
        const dh = eh * scale;
        if (this.opts.mirror) {
          sctx.translate(sw, 0);
          sctx.scale(-1, 1);
        }
        sctx.drawImage(el, (sw - dw) / 2, (sh - dh) / 2, dw, dh);
      } else {
        drawScene(this.source.scene, sctx, sw, sh);
      }
      sctx.restore();
      let data;
      try {
        data = sctx.getImageData(0, 0, sw, sh).data;
      } catch (e) {
        this.source = { scene: this.source.scene };
        this.sample();
        return false;
      }
      const lum = this.lum && this.lum.length === sw * sh ? this.lum : new Float32Array(sw * sh);
      for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
        // Transparent pixels count as paper.
        const a = data[p + 3] / 255;
        const l = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
        lum[i] = l * a + (1 - a);
      }
      this.lum = lum;
      return true;
    }

    // Lays one screen of dots over the given rectangle (CSS px).
    screen(cell, rx, ry, rw, rh, progress) {
      const { ctx, lum, w, h } = this;
      const sw = this.sampler.width;
      const sh = this.sampler.height;
      const { contrast, angle } = this.opts;
      const invert = this.theme.invert;
      const a = (angle * Math.PI) / 180;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // Rectangle corners in grid space, to find which grid cells can land inside it.
      let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
      for (const [x, y] of [[rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh]]) {
        const u = (x * ca + y * sa) / cell;
        const v = (-x * sa + y * ca) / cell;
        umin = Math.min(umin, u); umax = Math.max(umax, u);
        vmin = Math.min(vmin, v); vmax = Math.max(vmax, v);
      }
      const maxR = cell * 0.74;
      ctx.beginPath();
      for (let i = Math.floor(umin); i <= Math.ceil(umax); i++) {
        for (let j = Math.floor(vmin); j <= Math.ceil(vmax); j++) {
          const x = (i * ca - j * sa) * cell;
          const y = (i * sa + j * ca) * cell;
          if (x < rx - maxR || x > rx + rw + maxR || y < ry - maxR || y > ry + rh + maxR) continue;
          const sx = clamp((x / SAMPLE) | 0, 0, sw - 1);
          const sy = clamp((y / SAMPLE) | 0, 0, sh - 1);
          const l = lum[sy * sw + sx];
          let d = invert ? l : 1 - l;
          d = clamp((d - 0.5) * contrast + 0.5, 0, 1);
          let r = Math.sqrt(d) * maxR;
          if (progress < 1) {
            // Ink rolls down the plate from the top.
            const t = clamp((progress * 1.6 - (y / h) * 0.6) / 1, 0, 1);
            r *= 1 - Math.pow(1 - t, 3);
          }
          if (r < 0.35) continue;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    }

    grain(rand, amount, x0, y0, w, h) {
      if (amount <= 0) return;
      const { ctx } = this;
      const n = Math.round(((w * h) / 90) * amount);
      ctx.fillStyle = this.theme.ink;
      for (let i = 0; i < n; i++) {
        const s = rand() < 0.9 ? 1 : 2;
        ctx.fillRect(x0 + rand() * w, y0 + rand() * h, s, s);
      }
      // Specks where the ink didn't take.
      ctx.fillStyle = this.theme.paper;
      for (let i = 0; i < n * 0.6; i++) {
        const s = rand() < 0.8 ? 1 : 2;
        ctx.fillRect(x0 + rand() * w, y0 + rand() * h, s, s);
      }
    }

    draw({ progress = 1, focus = null, seed = 7 } = {}) {
      if (!this.lum) return;
      const { ctx, w, h, theme } = this;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = theme.paper;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = theme.ink;
      this.screen(this.opts.cell, 0, 0, w, h, progress);
      this.grain(mulberry32(seed), this.opts.grain * progress, 0, 0, w, h);

      if (focus) {
        const { x, y, r } = focus;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = theme.paper;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.fillStyle = theme.ink;
        this.screen(Math.max(2.2, this.opts.cell * 0.42), x - r, y - r, r * 2, r * 2, 1);
        ctx.restore();
        // Her viewfinder: a registration mark in spot ink.
        ctx.strokeStyle = theme.spot;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        const t0 = r + 4;
        const t1 = r + 16;
        ctx.moveTo(x + t0, y); ctx.lineTo(x + t1, y);
        ctx.moveTo(x - t0, y); ctx.lineTo(x - t1, y);
        ctx.moveTo(x, y + t0); ctx.lineTo(x, y + t1);
        ctx.moveTo(x, y - t0); ctx.lineTo(x, y - t1);
        ctx.stroke();
      }
    }
  }

  window.Halftone = { Plate, drawScene, scenes: Object.keys(SCENES) };
})();
