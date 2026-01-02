import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const messages = {
  extName: {
    message: "Session Saver Pro — Tab & Window Manager",
  },
  extActionTitle: {
    message: "Session Saver Pro",
  },
  extDescription: {
    message: "Tab session manager: save tabs, restore windows. Search by URL, title, domain. Autosave. 100% offline.",
  },
  popupDocumentTitle: {
    message: "Session Saver Pro",
  },
  popupHeaderTitle: {
    message: "Session Saver Pro",
  },
  popupSessionNamePlaceholder: {
    message: "Session name (optional)",
  },
  popupSaveButton: {
    message: "Save Current Session",
  },
  popupSearchPlaceholder: {
    message: "Search by URL, title, domain",
  },
  popupEmptyNoMatches: {
    message: "No matches",
  },
  popupEmptyNoSavedSessions: {
    message: "No saved sessions",
  },
  popupUnnamedSession: {
    message: "(unnamed)",
  },
  popupMatchText: {
    message: " • $1 matches",
  },
  popupTabsWord: {
    message: "tabs",
  },
  popupSavedSessionsMeta: {
    message: "Saved sessions: $1",
  },
  popupBtnAdd: {
    message: "Add",
  },
  popupBtnOverwrite: {
    message: "Overwrite",
  },
  popupBtnRestore: {
    message: "Restore",
  },
  popupBtnDelete: {
    message: "Delete",
  },
  popupConfirmOverwrite: {
    message: "Overwrite this saved session with your current windows/tabs? This cannot be undone.",
  },
  popupConfirmDelete: {
    message: "Delete this session?",
  },
  popupStatusSaved: {
    message: "Saved",
  },
  popupStatusOverwritten: {
    message: "Overwritten",
  },
  popupStatusDeleted: {
    message: "Deleted",
  },
  popupStatusNoNewTabs: {
    message: "No new tabs to add",
  },
  popupStatusAddedTabs: {
    message: "Added $1 tabs",
  },
  popupStatusRestoredTabs: {
    message: "Restored: $1 tabs",
  },
  popupErrorFailedToLoadSessions: {
    message: "Failed to load sessions",
  },
  popupErrorSaveFailed: {
    message: "Save failed",
  },
  popupErrorOverwriteFailed: {
    message: "Overwrite failed",
  },
  popupErrorAddFailed: {
    message: "Add failed",
  },
  popupErrorRestoreFailed: {
    message: "Restore failed",
  },
  popupErrorDeleteFailed: {
    message: "Delete failed",
  },
  optionsDocumentTitle: {
    message: "Session Saver Pro — Options",
  },
  optionsPageTitle: {
    message: "Options",
  },
  optionsEnableAutosave: {
    message: "Enable autosave",
  },
  optionsAutosaveInterval: {
    message: "Autosave interval (minutes)",
  },
  optionsMaxSavedSessions: {
    message: "Max saved sessions",
  },
  optionsSaveButton: {
    message: "Save",
  },
  optionsStatusSaved: {
    message: "Saved",
  },
  optionsErrorFailedToLoad: {
    message: "Failed to load settings",
  },
  optionsErrorFailedToSave: {
    message: "Failed to save settings",
  },
};

const dir = join("_locales", "en");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "messages.json"), `${JSON.stringify(messages, null, 2)}\n`);
console.log("Generated _locales/en/messages.json");
