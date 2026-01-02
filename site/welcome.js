const openOptionsBtn = document.getElementById("openOptions");
const openPopupTipBtn = document.getElementById("openPopupTip");
const pinTipEl = document.getElementById("pinTip");

openOptionsBtn.addEventListener("click", async () => {
  try {
    await chrome.runtime.openOptionsPage();
  } catch {
    // ignore
  }
});

openPopupTipBtn.addEventListener("click", () => {
  pinTipEl.hidden = !pinTipEl.hidden;
});
