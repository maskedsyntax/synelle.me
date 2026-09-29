(function () {
  const site = window.SYNELLE || { logs: [], lead: {} };
  const { Plate } = window.Halftone;
  const root = document.documentElement;
  const $ = (sel) => document.querySelector(sel);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const darkScheme = matchMedia("(prefers-color-scheme: dark)");

  // ------------------------------------------------------------- Editions

  const isNight = () => (root.dataset.theme ? root.dataset.theme === "dark" : darkScheme.matches);

  function inks() {
    const cs = getComputedStyle(root);
    const v = (name) => cs.getPropertyValue(name).trim();
    return { ink: v("--ink"), paper: v("--paper"), spot: v("--spot"), invert: isNight() };
  }

  // Every plate on the page, with a function that repaints it.
  const plates = new Set();

  function register(plate, render) {
    plate.theme = inks();
    const entry = { plate, render };
    plates.add(entry);
    new ResizeObserver(() => {
      plate.resize();
      render();
    }).observe(plate.canvas);
    return entry;
  }

  function reprint() {
    const theme = inks();
    plates.forEach(({ plate, render }) => {
      plate.theme = theme;
      render();
    });
  }

  const editionButton = $("#edition");

  function syncEditionButton() {
    editionButton.setAttribute("aria-pressed", String(isNight()));
  }

  editionButton.addEventListener("click", () => {
    const night = !isNight();
    root.dataset.theme = night ? "dark" : "light";
    try {
      localStorage.setItem("synelle-edition", night ? "night" : "day");
    } catch (e) {}
    syncEditionButton();
    reprint();
  });

  darkScheme.addEventListener("change", () => {
    if (!root.dataset.theme) {
      syncEditionButton();
      reprint();
    }
  });

  syncEditionButton();

  // ------------------------------------------------------ Dates and issue

  const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const plainDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const today = new Date();
  const todayEl = $("#today");
  todayEl.textContent = longDate.format(today);
  todayEl.dateTime = today.toISOString().slice(0, 10);

  const logs = (site.logs || []).slice().sort((a, b) => b.no - a.no);
  if (logs.length) {
    $("#issue").textContent = `No. ${logs[0].no}`;
    const first = logs.reduce((a, b) => (a.date < b.date ? a : b));
    $("#first-log").textContent = plainDate.format(new Date(`${first.date}T00:00`));
    $("#log-count").textContent = String(logs.length);
  }

  if (site.subjectUrl) $("#subject-link").href = site.subjectUrl;

  // ------------------------------------------------------ Front-page plate

  (function leadPlate() {
    const canvas = $("#lead-plate");
    const lead = site.lead || {};
    const plate = new Plate(canvas, { cell: 6.5, grain: 0.4 });
    let focus = null;
    let developing = true;
    let queued = false;

    $("#lead-caption").textContent = lead.caption || "";
    if (lead.image) canvas.setAttribute("aria-label", `Halftone photograph: ${lead.caption || "a frame from the footage"}`);

    const render = () => plate.draw({ focus: developing ? null : focus });
    register(plate, render);

    // One frame per pointer move is plenty.
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        render();
      });
    };

    function look(e) {
      const rect = canvas.getBoundingClientRect();
      focus = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        r: Math.min(rect.width, rect.height) * 0.19,
      };
      queue();
    }

    canvas.addEventListener("pointermove", look);
    canvas.addEventListener("pointerdown", look);
    canvas.addEventListener("pointerleave", () => {
      focus = null;
      queue();
    });

    plate.setSource({ image: lead.image, scene: lead.scene || "street" }).then(() => {
      if (reduceMotion.matches) {
        developing = false;
        render();
        return;
      }
      // The one bit of theatre on the page: ink rolls down the plate once.
      const start = performance.now();
      const duration = 1700;
      (function step(now) {
        const p = Math.min(1, (now - start) / duration);
        plate.draw({ progress: p });
        if (p < 1) requestAnimationFrame(step);
        else {
          developing = false;
          render();
        }
      })(start);
    });
  })();

  // ------------------------------------------------------------------ Logs

  (function logList() {
    const list = $("#log-list");
    const empty = $("#log-empty");
    const kinds = { travel: "Travel", work: "Work", hangout: "Hanging out", day: "Ordinary day" };

    const lazy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          lazy.unobserve(entry.target);
          const log = entry.target._log;
          const plate = new Plate(entry.target, { cell: 4.5, grain: 0.3 });
          const render = () => plate.draw({ seed: log.no });
          register(plate, render);
          plate.setSource({ image: log.image, scene: log.scene || "street" }).then(render);
        });
      },
      { rootMargin: "300px 0px" }
    );

    function el(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    }

    logs.forEach((log) => {
      const li = el("li", "log");
      li.dataset.kind = log.kind || "day";
      const titleId = `log-${log.no}-title`;
      li.setAttribute("aria-labelledby", titleId);

      const slug = el("p", "log__slug");
      slug.append(el("span", "log__no", `Log ${String(log.no).padStart(3, "0")}`));
      const when = new Date(`${log.date}T${log.time || "00:00"}`);
      const time = el("time", null, shortDate.format(when) + (log.time ? `, ${log.time}` : ""));
      time.dateTime = log.time ? `${log.date}T${log.time}` : log.date;
      slug.append(time);

      const figure = el("figure", "plate");
      const canvas = el("canvas", "plate__canvas");
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", `Halftone frame from log ${log.no}: ${log.title}`);
      canvas._log = log;
      figure.append(canvas);

      const title = el("h4", "log__title", log.title);
      title.id = titleId;
      const place = el("p", "log__place", [log.place, kinds[log.kind]].filter(Boolean).join(". "));

      const body = el("div", "log__body");
      String(log.body || "")
        .split(/\n\s*\n/)
        .forEach((para) => body.append(el("p", null, para.trim())));

      li.append(slug, figure, title, place, body);

      if (log.video) {
        const a = el("a", "log__video", "Watch the video");
        a.href = log.video;
        li.append(a);
      }

      list.append(li);
      lazy.observe(canvas);
    });

    const buttons = document.querySelectorAll(".filters button");

    function show(kind) {
      let shown = 0;
      list.querySelectorAll(".log").forEach((li) => {
        const match = kind === "all" || li.dataset.kind === kind;
        li.hidden = !match;
        if (match) shown++;
      });
      empty.hidden = shown > 0;
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === kind)));
    }

    document.querySelectorAll("[data-kind]").forEach((b) => {
      if (b.tagName === "BUTTON") b.addEventListener("click", () => show(b.dataset.kind));
    });

    if (!logs.length) {
      empty.hidden = false;
      empty.textContent = "No logs filed yet. The first one is on its way.";
    }
  })();

  // ---------------------------------------------------------- Vision room

  (function visionRoom() {
    const canvas = $("#vision-plate");
    const video = $("#vision-video");
    const status = $("#vision-status");
    const cameraButton = $("#vision-camera");
    const fileInput = $("#vision-file");
    const ctl = {
      cell: $("#ctl-cell"),
      angle: $("#ctl-angle"),
      contrast: $("#ctl-contrast"),
      grain: $("#ctl-grain"),
    };
    const angleOut = $("#ctl-angle-out");

    const plate = new Plate(canvas, readControls());
    let stream = null;
    let frame = 0;

    function readControls() {
      return {
        cell: Number(ctl.cell.value),
        angle: Number(ctl.angle.value),
        contrast: Number(ctl.contrast.value),
        grain: Number(ctl.grain.value),
      };
    }

    const render = () => plate.draw({ seed: 11 });
    register(plate, () => {
      if (!stream) render();
    });

    Object.values(ctl).forEach((input) =>
      input.addEventListener("input", () => {
        Object.assign(plate.opts, readControls());
        angleOut.textContent = `${ctl.angle.value}°`;
        if (!stream) render();
      })
    );

    plate.setSource({ scene: "rooftop" }).then(render);

    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      stopCamera(false);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        plate.opts.mirror = false;
        await plate.setSource({ element: img });
        URL.revokeObjectURL(url);
        canvas.setAttribute("aria-label", `Your photo, ${file.name}, printed as a halftone.`);
        render();
        status.textContent = "Printed. Adjust my eye below, or save the print.";
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        status.textContent = "I can't read that file. Try a JPG, PNG or WebP image.";
      };
      img.src = url;
      fileInput.value = "";
    });

    async function startCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = "The camera only works over a secure connection (https or localhost). Upload a photo instead.";
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        stream = null;
        status.textContent =
          err && err.name === "NotAllowedError"
            ? "Camera access was blocked. Allow it in your browser's site settings, or upload a photo instead."
            : "I couldn't find a camera to use. Upload a photo instead.";
        return;
      }
      video.srcObject = stream;
      await video.play();
      plate.opts.mirror = true;
      plate.source = { element: video };
      cameraButton.textContent = "Stop camera";
      cameraButton.setAttribute("aria-pressed", "true");
      canvas.setAttribute("aria-label", "Your camera, printed live as a halftone.");
      status.textContent = "Watching. Nothing is recorded or sent anywhere.";
      (function loop() {
        if (!stream) return;
        plate.sample();
        plate.draw({ seed: ++frame }); // fresh grain every frame, like film
        requestAnimationFrame(loop);
      })();
    }

    // Stops the camera. With keepFrame, the last thing seen stays on the plate.
    function stopCamera(keepFrame = true) {
      if (!stream) return;
      if (keepFrame && video.videoWidth) {
        const still = document.createElement("canvas");
        still.width = video.videoWidth;
        still.height = video.videoHeight;
        still.getContext("2d").drawImage(video, 0, 0);
        plate.source = { element: still };
        plate.sample();
      }
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
      video.srcObject = null;
      cameraButton.textContent = "Use my camera";
      cameraButton.setAttribute("aria-pressed", "false");
      if (keepFrame) {
        render();
        status.textContent = "Camera off. I kept the last frame.";
      }
    }

    cameraButton.addEventListener("click", () => (stream ? stopCamera() : startCamera()));

    $("#vision-save").addEventListener("click", () => {
      canvas.toBlob((blob) => {
        if (!blob) {
          status.textContent = "The print couldn't be saved. Try again.";
          return;
        }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "synelle-print.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        status.textContent = "Saved as synelle-print.png.";
      }, "image/png");
    });
  })();

  // --------------------------------------------------------------- Footage

  if (site.channelUrl) {
    const link = $("#channel-link");
    link.href = site.channelUrl;
    link.hidden = false;
  }
})();
