const DEFAULT_SETTINGS = {
  autosaveEnabled: false,
  autosaveIntervalMinutes: 1,
  maxSessions: 5,
};

const STORAGE_KEYS = {
  settings: "settings",
  sessions: "sessions",
};

const AUTOSAVE_ID = "autosave";
const AUTOSAVE_ALARM_NAME = "autosave";

const UNINSTALL_URL = "https://extenfo.github.io/session-saver-pro/uninstall.html";

let autosavePromise = null;
let lastAutosaveAttemptAt = 0;

function clampInt(value, min, max) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function now() {
  return Date.now();
}

function createId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function getSettings() {
  const res = await chrome.storage.local.get(STORAGE_KEYS.settings);
  const s = res[STORAGE_KEYS.settings] || {};
  const autosaveEnabled = Boolean(s.autosaveEnabled);
  const autosaveIntervalMinutes = clampInt(s.autosaveIntervalMinutes ?? DEFAULT_SETTINGS.autosaveIntervalMinutes, 1, 1440);
  const maxSessions = clampInt(s.maxSessions ?? DEFAULT_SETTINGS.maxSessions, 1, 200);
  return {
    autosaveEnabled,
    autosaveIntervalMinutes,
    maxSessions,
  };
}

async function setSettings(nextSettings) {
  const prev = await getSettings();
  const merged = {
    ...prev,
    ...nextSettings,
  };
  merged.autosaveEnabled = Boolean(merged.autosaveEnabled);
  merged.autosaveIntervalMinutes = clampInt(merged.autosaveIntervalMinutes, 1, 1440);
  merged.maxSessions = clampInt(merged.maxSessions, 1, 200);

  await chrome.storage.local.set({
    [STORAGE_KEYS.settings]: merged,
  });

  await ensureAutosaveAlarm(merged);

  return merged;
}

async function getSessions() {
  const res = await chrome.storage.local.get(STORAGE_KEYS.sessions);
  const sessions = Array.isArray(res[STORAGE_KEYS.sessions]) ? res[STORAGE_KEYS.sessions] : [];
  return sessions;
}

async function setSessions(sessions) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.sessions]: sessions,
  });
}

function tabToModel(tab) {
  return {
    url: tab.url || "",
    title: tab.title || "",
    pinned: Boolean(tab.pinned),
  };
}

function windowToModel(win) {
  const tabs = Array.isArray(win.tabs) ? win.tabs : [];
  return {
    focused: Boolean(win.focused),
    state: typeof win.state === "string" ? win.state : "normal",
    tabs: tabs.map(tabToModel).filter((t) => Boolean(t.url)),
  };
}

async function captureCurrentSession({ name, source }) {
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ["normal"] });
  const modeledWindows = windows.map(windowToModel).filter((w) => w.tabs.length > 0);

  const createdAt = now();
  const sessionName = (typeof name === "string" && name.trim().length > 0) ? name.trim() : new Date(createdAt).toLocaleString();

  return {
    id: createId(),
    name: sessionName,
    createdAt,
    updatedAt: createdAt,
    source: source === "auto" ? "auto" : "manual",
    windows: modeledWindows,
  };
}

function countTabsInSession(session) {
  return (session.windows || []).reduce((acc, w) => acc + ((w.tabs || []).length), 0);
}

function sortSessionsNewestFirst(sessions) {
  return [...sessions].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
}

function applySessionLimit({ sessions, maxSessions }) {
  const autosave = sessions.find((s) => s && s.id === AUTOSAVE_ID);
  const others = sessions.filter((s) => s && s.id !== AUTOSAVE_ID);

  const sortedOthers = sortSessionsNewestFirst(others);
  const limitForOthers = Math.max(0, maxSessions - (autosave ? 1 : 0));
  const trimmedOthers = sortedOthers.slice(0, limitForOthers);

  const result = autosave ? [autosave, ...trimmedOthers] : trimmedOthers;
  return sortSessionsNewestFirst(result);
}

async function saveManualSession({ name }) {
  const settings = await getSettings();
  const session = await captureCurrentSession({ name, source: "manual" });

  let sessions = await getSessions();
  sessions = [session, ...sessions];
  sessions = applySessionLimit({ sessions, maxSessions: settings.maxSessions });

  await setSessions(sessions);

  return session;
}

async function updateExistingSession({ sessionId, name }) {
  if (!sessionId || typeof sessionId !== "string") {
    throw new Error("Invalid sessionId");
  }

  if (sessionId === AUTOSAVE_ID) {
    const s = await upsertAutosaveSession();
    if (!s) throw new Error("Nothing to autosave");
    return s;
  }

  const settings = await getSettings();
  const sessions = await getSessions();
  const existing = sessions.find((s) => s && s.id === sessionId);
  if (!existing) {
    throw new Error("Session not found");
  }

  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ["normal"] });
  const modeledWindows = windows.map(windowToModel).filter((w) => w.tabs.length > 0);

  if (modeledWindows.length === 0) {
    return existing;
  }

  const nextName = (typeof name === "string" && name.trim().length > 0) ? name.trim() : (existing.name || "");
  const updatedAt = now();

  const updated = {
    ...existing,
    name: nextName,
    createdAt: existing.createdAt || existing.updatedAt || updatedAt,
    updatedAt,
    windows: modeledWindows,
  };

  let nextSessions = sessions.filter((s) => s && s.id !== sessionId);
  nextSessions = [updated, ...nextSessions];
  nextSessions = applySessionLimit({ sessions: nextSessions, maxSessions: settings.maxSessions });

  await setSessions(nextSessions);
  return updated;
}

function sessionUrlSet(session) {
  const urls = new Set();
  const windows = Array.isArray(session && session.windows) ? session.windows : [];
  for (const w of windows) {
    const tabs = Array.isArray(w && w.tabs) ? w.tabs : [];
    for (const t of tabs) {
      const url = t && t.url;
      if (typeof url === "string" && url.length > 0) urls.add(url);
    }
  }
  return urls;
}

async function addTabsToExistingSession({ sessionId }) {
  if (!sessionId || typeof sessionId !== "string") {
    throw new Error("Invalid sessionId");
  }

  if (sessionId === AUTOSAVE_ID) {
    throw new Error("Cannot add tabs to autosave session");
  }

  const settings = await getSettings();
  const sessions = await getSessions();
  const existing = sessions.find((s) => s && s.id === sessionId);
  if (!existing) {
    throw new Error("Session not found");
  }

  const existingUrls = sessionUrlSet(existing);

  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ["normal"] });
  const modeledWindows = windows
    .map(windowToModel)
    .map((w) => {
      const tabs = Array.isArray(w.tabs) ? w.tabs : [];
      const uniqueTabs = [];
      for (const t of tabs) {
        const url = t && t.url;
        if (!url || existingUrls.has(url)) continue;
        existingUrls.add(url);
        uniqueTabs.push(t);
      }
      return {
        ...w,
        tabs: uniqueTabs,
      };
    })
    .filter((w) => (w.tabs || []).length > 0);

  const addedTabs = modeledWindows.reduce((acc, w) => acc + ((w.tabs || []).length), 0);
  if (addedTabs === 0) {
    return { session: existing, addedTabs: 0 };
  }

  const updatedAt = now();
  const updated = {
    ...existing,
    createdAt: existing.createdAt || existing.updatedAt || updatedAt,
    updatedAt,
    windows: [...(Array.isArray(existing.windows) ? existing.windows : []), ...modeledWindows],
  };

  let nextSessions = sessions.filter((s) => s && s.id !== sessionId);
  nextSessions = [updated, ...nextSessions];
  nextSessions = applySessionLimit({ sessions: nextSessions, maxSessions: settings.maxSessions });

  await setSessions(nextSessions);
  return { session: updated, addedTabs };
}

async function upsertAutosaveSession() {
  const settings = await getSettings();
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ["normal"] });
  const modeledWindows = windows.map(windowToModel).filter((w) => w.tabs.length > 0);

  if (modeledWindows.length === 0) {
    const sessions = await getSessions();
    const existing = sessions.find((s) => s && s.id === AUTOSAVE_ID);
    return existing || null;
  }

  const existingSessions = await getSessions();
  const existingAutosave = existingSessions.find((s) => s && s.id === AUTOSAVE_ID);

  const t = now();
  const autosaveSession = {
    id: AUTOSAVE_ID,
    name: "Auto-saved",
    createdAt: existingAutosave ? (existingAutosave.createdAt || t) : t,
    updatedAt: t,
    source: "auto",
    windows: modeledWindows,
  };

  let sessions = existingSessions.filter((s) => s && s.id !== AUTOSAVE_ID);
  sessions = [autosaveSession, ...sessions];
  sessions = applySessionLimit({ sessions, maxSessions: settings.maxSessions });

  await setSessions(sessions);
  return autosaveSession;
}

async function deleteSession(sessionId) {
  const sessions = await getSessions();
  const next = sessions.filter((s) => s && s.id !== sessionId);
  await setSessions(next);
  return { deleted: sessions.length - next.length };
}

async function restoreSession(sessionId) {
  const sessions = await getSessions();
  const session = sessions.find((s) => s && s.id === sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const windows = Array.isArray(session.windows) ? session.windows : [];

  for (const w of windows) {
    const tabs = Array.isArray(w.tabs) ? w.tabs : [];
    const urls = tabs.map((t) => t.url).filter(Boolean);
    if (urls.length === 0) continue;

    let createdWindow;
    try {
      const desiredState = (typeof w.state === "string") ? w.state : "normal";
      const state = ["normal", "maximized", "minimized", "fullscreen"].includes(desiredState) ? desiredState : "normal";
      createdWindow = await chrome.windows.create({
        url: urls[0],
        focused: Boolean(w.focused),
        state,
      });
    } catch {
      try {
        createdWindow = await chrome.windows.create({ url: urls[0] });
      } catch {
        continue;
      }
    }

    const windowId = createdWindow && createdWindow.id;
    if (!windowId) continue;

    for (let i = 1; i < urls.length; i += 1) {
      try {
        await chrome.tabs.create({ windowId, url: urls[i], active: false });
      } catch {
        // ignore
      }
    }

    try {
      const desiredState = (typeof w.state === "string") ? w.state : "normal";
      const state = ["normal", "maximized", "minimized", "fullscreen"].includes(desiredState) ? desiredState : "normal";
      await chrome.windows.update(windowId, {
        focused: Boolean(w.focused),
        state,
      });
    } catch {
      // ignore
    }

    const pinnedTabs = tabs
      .map((t, idx) => ({ ...t, idx }))
      .filter((t) => t.pinned && Boolean(t.url));

    if (pinnedTabs.length > 0) {
      try {
        const currentTabs = await chrome.tabs.query({ windowId });
        for (const pt of pinnedTabs) {
          const match = currentTabs.find((ct) => ct.url === pt.url);
          if (match && match.id) {
            try {
              await chrome.tabs.update(match.id, { pinned: true });
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return {
    restoredWindows: (session.windows || []).length,
    restoredTabs: countTabsInSession(session),
  };
}

async function ensureAutosaveAlarm(settings) {
  const s = settings || (await getSettings());

  if (!s.autosaveEnabled) {
    await chrome.alarms.clear(AUTOSAVE_ALARM_NAME);
    return;
  }

  const periodInMinutes = clampInt(s.autosaveIntervalMinutes, 1, 1440);
  const existing = await chrome.alarms.get(AUTOSAVE_ALARM_NAME);

  if (!existing || existing.periodInMinutes !== periodInMinutes) {
    await chrome.alarms.create(AUTOSAVE_ALARM_NAME, {
      periodInMinutes,
    });
  }
}

async function bestEffortAutosave(_reason) {
  const t = now();
  if (t - lastAutosaveAttemptAt < 3000) return null;
  lastAutosaveAttemptAt = t;

  if (autosavePromise) return autosavePromise;

  autosavePromise = (async () => {
    const settings = await getSettings();
    if (!settings.autosaveEnabled) return null;
    return await upsertAutosaveSession();
  })();

  try {
    return await autosavePromise;
  } finally {
    autosavePromise = null;
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  await setSettings(await getSettings());

  try {
    chrome.runtime.setUninstallURL(UNINSTALL_URL);
  } catch {
    // ignore
  }

  if (details && details.reason === "install") {
    try {
      await chrome.tabs.create({ url: chrome.runtime.getURL("site/welcome.html") });
    } catch {
      // ignore
    }
  }
});

chrome.runtime.onStartup?.addListener(async () => {
  await ensureAutosaveAlarm();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm || alarm.name !== AUTOSAVE_ALARM_NAME) return;
  const settings = await getSettings();
  if (!settings.autosaveEnabled) return;
  await upsertAutosaveSession();
});

chrome.runtime.onSuspend?.addListener(() => {
  bestEffortAutosave("suspend");
});

chrome.windows.onRemoved?.addListener(() => {
  bestEffortAutosave("window_removed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (!message || typeof message !== "object") {
        throw new Error("Invalid message");
      }

      switch (message.type) {
        case "GET_SETTINGS": {
          const settings = await getSettings();
          sendResponse({ ok: true, settings });
          break;
        }
        case "SET_SETTINGS": {
          const settings = await setSettings(message.settings || {});
          sendResponse({ ok: true, settings });
          break;
        }
        case "GET_SESSIONS": {
          const sessions = sortSessionsNewestFirst(await getSessions());
          sendResponse({ ok: true, sessions });
          break;
        }
        case "SAVE_CURRENT_SESSION": {
          const session = await saveManualSession({ name: message.name });
          sendResponse({ ok: true, session });
          break;
        }
        case "UPDATE_SESSION": {
          const session = await updateExistingSession({ sessionId: message.sessionId, name: message.name });
          sendResponse({ ok: true, session });
          break;
        }
        case "ADD_TABS_TO_SESSION": {
          const result = await addTabsToExistingSession({ sessionId: message.sessionId });
          sendResponse({ ok: true, result });
          break;
        }
        case "RESTORE_SESSION": {
          const result = await restoreSession(message.sessionId);
          sendResponse({ ok: true, result });
          break;
        }
        case "DELETE_SESSION": {
          const result = await deleteSession(message.sessionId);
          sendResponse({ ok: true, result });
          break;
        }
        default:
          throw new Error("Unknown message type");
      }
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  })();

  return true;
});
