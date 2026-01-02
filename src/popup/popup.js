const statusEl = document.getElementById("status");
const sessionsEl = document.getElementById("sessions");
const searchInputEl = document.getElementById("searchInput");
const sessionNameInputEl = document.getElementById("sessionNameInput");
const saveBtnEl = document.getElementById("saveBtn");
const metaEl = document.getElementById("meta");

let allSessions = [];

function setStatus(text) {
  statusEl.textContent = text || "";
}

function formatDate(ms) {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "";
  }
}

function safeHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function countTabs(session) {
  return (session.windows || []).reduce((acc, w) => acc + ((w.tabs || []).length), 0);
}

function sessionMatches(session, q) {
  const query = q.trim().toLowerCase();
  if (!query) {
    return { match: true, count: 0 };
  }

  let matches = 0;
  for (const w of session.windows || []) {
    for (const t of w.tabs || []) {
      const url = String(t.url || "").toLowerCase();
      const title = String(t.title || "").toLowerCase();
      const domain = safeHostname(t.url || "").toLowerCase();
      if (url.includes(query) || title.includes(query) || domain.includes(query)) {
        matches += 1;
      }
    }
  }

  return { match: matches > 0, count: matches };
}

function renderSessions() {
  const q = searchInputEl.value || "";
  const filtered = [];

  for (const s of allSessions) {
    const res = sessionMatches(s, q);
    if (res.match) {
      filtered.push({ session: s, matchCount: res.count });
    }
  }

  sessionsEl.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.textContent = q.trim().length > 0 ? "No matches" : "No saved sessions";
    sessionsEl.appendChild(empty);
  } else {
    for (const item of filtered) {
      const s = item.session;
      const card = document.createElement("div");
      card.className = "card";

      const top = document.createElement("div");
      top.className = "cardTop";

      const title = document.createElement("div");
      title.className = "cardTitle";
      title.textContent = s.name || "(unnamed)";

      const meta = document.createElement("div");
      meta.className = "cardMeta";

      const tabs = countTabs(s);
      const dateText = formatDate(s.updatedAt || s.createdAt);
      const matchText = (q.trim().length > 0) ? ` • ${item.matchCount} matches` : "";
      meta.textContent = `${dateText} • ${tabs} tabs${matchText}`;

      top.appendChild(title);
      top.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "actions";

      const restoreBtn = document.createElement("button");
      restoreBtn.className = "btn";
      restoreBtn.textContent = "Restore";
      restoreBtn.addEventListener("click", async () => {
        await onRestore(s.id);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btnDanger";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        await onDelete(s.id);
      });

      const updateBtn = document.createElement("button");
      updateBtn.className = "btn";
      updateBtn.textContent = "Update";
      updateBtn.addEventListener("click", async () => {
        await onUpdate(s.id);
      });

      actions.appendChild(restoreBtn);
      actions.appendChild(updateBtn);
      actions.appendChild(deleteBtn);

      card.appendChild(top);
      card.appendChild(actions);

      sessionsEl.appendChild(card);
    }
  }

  metaEl.textContent = `Saved sessions: ${allSessions.length}`;
}

async function sendMessage(message) {
  return await chrome.runtime.sendMessage(message);
}

async function refreshSessions() {
  const res = await sendMessage({ type: "GET_SESSIONS" });
  if (!res || !res.ok) {
    throw new Error((res && res.error) || "Failed to load sessions");
  }
  allSessions = Array.isArray(res.sessions) ? res.sessions : [];
  renderSessions();
}

async function onUpdate(sessionId) {
  setStatus("");
  const ok = window.confirm("Update this saved session with your current windows/tabs?");
  if (!ok) return;

  try {
    const name = (sessionNameInputEl && sessionNameInputEl.value) ? sessionNameInputEl.value : "";
    const res = await sendMessage({ type: "UPDATE_SESSION", sessionId, name });
    if (!res || !res.ok) {
      throw new Error((res && res.error) || "Update failed");
    }
    await refreshSessions();
    if (sessionNameInputEl) sessionNameInputEl.value = "";
    setStatus("Updated");
  } catch (e) {
    setStatus(e instanceof Error ? e.message : String(e));
  }
}

async function onSave() {
  setStatus("");
  saveBtnEl.disabled = true;
  try {
    const name = (sessionNameInputEl && sessionNameInputEl.value) ? sessionNameInputEl.value : "";
    const res = await sendMessage({ type: "SAVE_CURRENT_SESSION", name });
    if (!res || !res.ok) {
      throw new Error((res && res.error) || "Save failed");
    }
    await refreshSessions();
    if (sessionNameInputEl) sessionNameInputEl.value = "";
    setStatus("Saved");
  } finally {
    saveBtnEl.disabled = false;
  }
}

async function onRestore(sessionId) {
  setStatus("");
  try {
    const res = await sendMessage({ type: "RESTORE_SESSION", sessionId });
    if (!res || !res.ok) {
      throw new Error((res && res.error) || "Restore failed");
    }
    setStatus(`Restored: ${res.result.restoredTabs} tabs`);
  } catch (e) {
    setStatus(e instanceof Error ? e.message : String(e));
  }
}

async function onDelete(sessionId) {
  setStatus("");
  const ok = window.confirm("Delete this session?");
  if (!ok) return;

  try {
    const res = await sendMessage({ type: "DELETE_SESSION", sessionId });
    if (!res || !res.ok) {
      throw new Error((res && res.error) || "Delete failed");
    }
    await refreshSessions();
    setStatus("Deleted");
  } catch (e) {
    setStatus(e instanceof Error ? e.message : String(e));
  }
}

saveBtnEl.addEventListener("click", async () => {
  try {
    await onSave();
  } catch (e) {
    setStatus(e instanceof Error ? e.message : String(e));
  }
});

if (sessionNameInputEl) {
  sessionNameInputEl.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    try {
      await onSave();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  });
}

searchInputEl.addEventListener("input", () => {
  renderSessions();
});

(async () => {
  try {
    await refreshSessions();
  } catch (e) {
    setStatus(e instanceof Error ? e.message : String(e));
  }
})();
