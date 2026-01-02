const autosaveEnabledEl = document.getElementById("autosaveEnabled");
const autosaveIntervalEl = document.getElementById("autosaveInterval");
const maxSessionsEl = document.getElementById("maxSessions");
const saveBtnEl = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

function setStatus(text) {
  statusEl.textContent = text || "";
}

async function sendMessage(message) {
  return await chrome.runtime.sendMessage(message);
}

async function loadSettings() {
  const res = await sendMessage({ type: "GET_SETTINGS" });
  if (!res || !res.ok) {
    throw new Error((res && res.error) || "Failed to load settings");
  }
  const s = res.settings;
  autosaveEnabledEl.checked = Boolean(s.autosaveEnabled);
  autosaveIntervalEl.value = String(s.autosaveIntervalMinutes);
  maxSessionsEl.value = String(s.maxSessions);
}

async function saveSettings() {
  setStatus("");
  saveBtnEl.disabled = true;
  try {
    const next = {
      autosaveEnabled: autosaveEnabledEl.checked,
      autosaveIntervalMinutes: Number.parseInt(String(autosaveIntervalEl.value), 10),
      maxSessions: Number.parseInt(String(maxSessionsEl.value), 10),
    };

    const res = await sendMessage({ type: "SET_SETTINGS", settings: next });
    if (!res || !res.ok) {
      throw new Error((res && res.error) || "Failed to save settings");
    }

    setStatus("Saved");
  } finally {
    saveBtnEl.disabled = false;
  }
}

saveBtnEl.addEventListener("click", async () => {
  try {
    await saveSettings();
  } catch (e) {
    setStatus(e instanceof Error ? e.message : String(e));
  }
});

(async () => {
  try {
    await loadSettings();
  } catch (e) {
    setStatus(e instanceof Error ? e.message : String(e));
  }
})();
