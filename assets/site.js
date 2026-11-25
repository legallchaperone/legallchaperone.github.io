// Site behaviour. Every page works without it; this adds the mobile menu, the folding log,
// and on article pages the contents highlight, copy buttons and image zoom.

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // ---- Mobile menu ----
  const toggle = $(".nav-toggle");
  const nav = $("#site-nav");
  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };
    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener("click", (e) => {
      if (nav.classList.contains("open") && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
  }

  // ---- Folding log: <ul class="log" data-collapse="8"> shows 8 rows and a button for the rest ----
  $$("ul.log[data-collapse]").forEach((list) => {
    const keep = Number(list.dataset.collapse);
    const rows = $$(":scope > li", list);
    if (!keep || rows.length <= keep + 2) return;
    const foldedHeight = () => rows[keep].offsetTop - list.offsetTop + 36; // a fading sliver of the next row
    list.style.maxHeight = foldedHeight() + "px";
    list.classList.add("is-collapsed");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "log-toggle";
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = `Show ${rows.length - keep} earlier entries`;
    list.after(btn);
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      list.classList.toggle("is-collapsed", !open);
      list.style.maxHeight = open ? "none" : foldedHeight() + "px";
      btn.textContent = open ? "Show fewer" : `Show ${rows.length - keep} earlier entries`;
    });
  });

  // ---- Article pages ----
  const main = $(".ar-main");
  if (!main) return;

  // Contents highlight: the current section is the last heading that has passed the reading line.
  const links = $$(".ar-toc a, .ar-side a");
  const byId = new Map();
  for (const a of links) {
    const id = decodeURIComponent(a.hash.slice(1));
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(a);
  }
  const heads = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  if (heads.length) {
    const bar = $(".ar-toc ol");
    let current = null;
    const update = () => {
      const line = 120; // px below the top of the window
      let active = null;
      for (const h of heads) {
        if (h.getBoundingClientRect().top <= line) active = h;
        else break;
      }
      // at the very bottom the last section may never reach the line
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) active = heads[heads.length - 1];
      if (active === current) return;
      if (current) byId.get(current.id).forEach((a) => a.classList.remove("active"));
      current = active;
      if (!current) return;
      const on = byId.get(current.id);
      on.forEach((a) => a.classList.add("active"));
      // keep the active entry in view inside the horizontal bar and the rail, without moving the page
      for (const a of on) {
        const box = a.closest(".ar-toc") ? bar : a.closest(".ar-side");
        if (!box) continue;
        if (box === bar) {
          const left = a.offsetLeft - 24;
          const right = a.offsetLeft + a.offsetWidth + 24;
          if (left < box.scrollLeft) box.scrollLeft = left;
          else if (right > box.scrollLeft + box.clientWidth) box.scrollLeft = right - box.clientWidth;
        } else if (box.scrollHeight > box.clientHeight) {
          const top = a.offsetTop - 24;
          const bottom = a.offsetTop + a.offsetHeight + 24;
          if (top < box.scrollTop) box.scrollTop = top;
          else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
        }
      }
    };
    let queued = false;
    addEventListener(
      "scroll",
      () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          update();
        });
      },
      { passive: true }
    );
    addEventListener("resize", update);
    update();
  }

  // Copy buttons on code blocks.
  $$("pre", main).forEach((pre) => {
    const wrap = document.createElement("div");
    wrap.className = "pre-wrap";
    pre.replaceWith(wrap);
    wrap.append(pre);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pre-copy";
    btn.textContent = "Copy";
    wrap.append(btn);
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.innerText);
        btn.textContent = "Copied";
        btn.classList.add("done");
      } catch {
        btn.textContent = "Press ⌘C";
      }
      setTimeout(() => {
        btn.textContent = "Copy";
        btn.classList.remove("done");
      }, 1600);
    });
  });

  // Click an image to see it large; click again or press Escape to close.
  const zoomable = $$("img", main).filter((img) => !img.closest("a, .ar-authors, .tile-thumb"));
  if (zoomable.length) {
    const box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Enlarged image");
    const big = document.createElement("img");
    box.append(big);
    document.body.append(box);
    const close = () => box.classList.remove("open");
    box.addEventListener("click", close);
    document.addEventListener("keydown", (e) => e.key === "Escape" && close());
    zoomable.forEach((img) => {
      img.dataset.zoom = "";
      img.addEventListener("click", () => {
        big.src = img.currentSrc || img.src;
        big.alt = img.alt;
        box.classList.add("open");
      });
    });
  }
})();
