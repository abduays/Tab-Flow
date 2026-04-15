const IDLE_THRESHOLD_MS = 10 * 60 * 1000;
const CHECK_INTERVAL_MIN = 5;
const EST_MEMORY_PER_TAB_MB = 15;
let tabLastActive = {};

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("tab-check", { periodInMinutes: CHECK_INTERVAL_MIN });
  loadTabActivity();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "tab-check") await suspendIdleTabs();
});

async function loadTabActivity() {
  const data = await chrome.storage.local.get("tabLastActive");
  tabLastActive = data.tabLastActive || {};
}

chrome.tabs.onActivated.addListener((info) => updateTabActivity(info.tabId));
chrome.tabs.onUpdated.addListener((id, change) => {
  if (change.status === "complete") updateTabActivity(id);
});
chrome.tabs.onRemoved.addListener((id) => {
  delete tabLastActive[id];
  chrome.storage.local.set({ tabLastActive }).catch(() => {});
});

function updateTabActivity(id) {
  tabLastActive[id] = Date.now();
  chrome.storage.local.set({ tabLastActive }).catch(() => {});
}

async function suspendIdleTabs() {
  await loadTabActivity();
  const now = Date.now();
  const tabs = await chrome.tabs.query({ status: "complete", discarded: false }).catch(() => []);
  let suspendedCount = 0;

  for (const tab of tabs) {
    const isSkip = tab.active || tab.pinned || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://");
    if (isSkip) continue;
    const lastActive = tabLastActive[tab.id] || now;
    if (now - lastActive > IDLE_THRESHOLD_MS) {
      try { await chrome.tabs.discard(tab.id); suspendedCount++; } catch (e) {}
    }
  }
  if (suspendedCount > 0) await updateStats(suspendedCount);
}

async function updateStats(newSuspended = 0) {
  try {
    const data = await chrome.storage.local.get("stats");
    const stats = data.stats || { totalSuspended: 0, totalMemorySavedMB: 0 };
    stats.totalSuspended += newSuspended;
    stats.totalMemorySavedMB += newSuspended * EST_MEMORY_PER_TAB_MB;
    await chrome.storage.local.set({ stats });
    chrome.runtime.sendMessage({ type: "stats_updated" }).catch(() => {});
  } catch (e) {}
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "get_dashboard") {
    chrome.tabs.query({}, async (tabs) => {
      const active = tabs.filter(t => t.active).length;
      const suspended = tabs.filter(t => t.discarded).length;
      const { stats } = await chrome.storage.local.get("stats");
      sendResponse({ active, suspended, stats: stats || { totalMemorySavedMB: 0 } });
    });
    return true;
  }
  if (request.action === "suspend_all") {
    chrome.tabs.query({ active: false, discarded: false }, async (tabs) => {
      for (const t of tabs) {
        if (t.url && !t.url.startsWith("chrome://") && !t.url.startsWith("chrome-extension://")) {
          try { await chrome.tabs.discard(t.id); } catch(e){}
        }
      }
      sendResponse({ success: true });
    });
    return true;
  }
  if (request.action === "resume_all") {
    chrome.tabs.query({ discarded: true }, async (tabs) => {
      for (const t of tabs) {
        try { await chrome.tabs.update(t.id, { active: true }); } catch(e){}
      }
      sendResponse({ success: true });
    });
    return true;
  }
});