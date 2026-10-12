// Redirect interstitial: theme sync + 5s auto-continue (cancellable).
(function () {
  try {
    const t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}

  const target = document.body.dataset.target;
  const num = document.getElementById("countNum");
  const fill = document.getElementById("countFill");
  const TOTAL = 5;
  let n = TOTAL;
  let done = false;

  function paint() {
    if (num) num.textContent = String(n);
    if (fill) fill.style.width = ((TOTAL - n) / TOTAL) * 100 + "%";
  }

  function go() {
    if (done || !target) return;
    done = true;
    window.location.href = target;
  }

  paint();
  const iv = setInterval(() => {
    n -= 1;
    if (n <= 0) {
      clearInterval(iv);
      go();
      return;
    }
    paint();
  }, 1000);

  // staying cancels the countdown
  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest("[data-stay]")) clearInterval(iv);
  });
})();
