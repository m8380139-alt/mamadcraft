// MamadCraft modern layer: ورود تدریجی بخش‌ها + سایهٔ نوار بالا
(function () {
  try {
    var bar = document.querySelector(".topbar");
    if (bar) {
      var onScroll = function () { bar.classList.toggle("is-scrolled", window.scrollY > 20); };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
    if (!("IntersectionObserver" in window) ||
        (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) return;

    var sel = ".section-kicker,.section-heading,.feature-line,.gallery-item,.aparat-section,.capes-title,.capes-tabs,.dl-logo";
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("mc-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0, rootMargin: "0px 0px -4% 0px" });
    // محافظ: اگه چیزی به هر دلیل (مثلاً اسکرول افقی) ظاهر نشد، بعد از چند ثانیه نشونش بده
    setTimeout(function () {
      document.querySelectorAll(".mc-reveal:not(.mc-in)").forEach(function (el) { el.classList.add("mc-in"); });
    }, 3500);

    var seen = new WeakSet();
    function scan(root) {
      var i = 0;
      (root || document).querySelectorAll(sel).forEach(function (el) {
        if (seen.has(el)) return;
        seen.add(el);
        el.style.setProperty("--d", (i++ % 4) * 0.08 + "s");
        el.classList.add("mc-reveal");
        io.observe(el);
      });
    }
    scan();
    // کارت‌های کیپ بعد از لود داده‌ها ساخته می‌شن
    var mo = new MutationObserver(function () {
      document.querySelectorAll(".cape-card,.coll-card").forEach(function (el) {
        if (seen.has(el)) return;
        seen.add(el); el.classList.add("mc-reveal"); io.observe(el);
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  } catch (e) { /* ظاهر اختیاریه؛ نباید سایت رو خراب کنه */ }
})();
