// TabFlow - Smart Tab Manager with AI-powered suspension
// Quality hardened version with bug fixes and security improvements

const CONFIG = {
  IDLE_THRESHOLD_MS: 10 * 60 * 1000, // 10 minutes default
  CHECK_INTERVAL_MIN: 3,
  EST_MEMORY_PER_TAB_MB: 15,
  AUDIO_CHECK_INTERVAL_MS: 2000,
  SMART_LEARNING_ENABLED: true,
  MAX_HISTORY_ENTRIES: 1000, // Prevent memory leaks
  HISTORY_TTL_DAYS: 30, // Auto-cleanup old entries
  SAVE_DEBOUNCE_MS: 500 // Debounce storage saves
};

let tabLastActive = {};
let tabUsageHistory = {}; // For AI learning
let audioPlayingTabs = new Set();
let saveDebounceTimer = null;
let userSettings = {
  whitelist: ['docs.google.com', 'github.com', 'notion.so'],
  blacklist: [],
  smartSuspension: true,
  audioProtection: true,
  productivityTracking: true
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  try {
    await loadSettings();
    await chrome.storage.local.set({ 
      userSettings, 
      tabUsageHistory: {}, 
      stats: { totalSuspended: 0, totalMemorySavedMB: 0, sessionsImproved: 0 },
      productivityData: { domains: {}, daily: {} },
      lastCleanup: Date.now()
    });
    chrome.alarms.create("tab-check", { periodInMinutes: CONFIG.CHECK_INTERVAL_MIN });
    chrome.alarms.create("audio-check", { delayInMinutes: 0, periodInMinutes: 0.5 });
    chrome.alarms.create("cleanup", { delayInMinutes: 5, periodInMinutes: 60 });
    console.log('TabFlow v2.0.0 initialized with smart features');
  } catch (e) {
    console.error('TabFlow initialization failed:', e);
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "tab-check") await suspendIdleTabs();
  if (alarm.name === "audio-check") await checkAudioTabs();
  if (alarm.name === "cleanup") await cleanupOldData();
});

// Load user settings with error handling
async function loadSettings() {
  try {
    const data = await chrome.storage.local.get(['userSettings', 'tabLastActive', 'tabUsageHistory']);
    if (data.userSettings) userSettings = { ...userSettings, ...data.userSettings };
    if (data.tabLastActive) tabLastActive = data.tabLastActive;
    if (data.tabUsageHistory) tabUsageHistory = data.tabUsageHistory;
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

// Track tab activity with smart learning
chrome.tabs.onActivated.addListener((info) => {
  updateTabActivity(info.tabId);
  trackTabUsage(info.tabId);
});

chrome.tabs.onUpdated.addListener((id, change, tab) => {
  if (change.status === "complete") {
    updateTabActivity(id);
    trackTabUsage(id);
  }
  // Detect media playback - Firefox/Chrome compatible
  if (userSettings.audioProtection && change.mediaStatus) {
    if (change.mediaStatus === 'playing') {
      audioPlayingTabs.add(id);
    } else if (change.mediaStatus === 'paused' || change.mediaStatus === 'none') {
      audioPlayingTabs.delete(id);
    }
  }
  // Fallback for audible flag changes
  if (userSettings.audioProtection && typeof change.audible === 'boolean') {
    if (change.audible) {
      audioPlayingTabs.add(id);
    } else {
      audioPlayingTabs.delete(id);
    }
  }
});

chrome.tabs.onRemoved.addListener(async (id) => {
  delete tabLastActive[id];
  delete tabUsageHistory[id];
  audioPlayingTabs.delete(id);
  debouncedSave();
});

// Use webNavigation if available (not in all contexts)
if (chrome.webNavigation?.onCommitted) {
  chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId === 0) {
      updateTabActivity(details.tabId);
    }
  });
}

function updateTabActivity(id) {
  tabLastActive[id] = Date.now();
  debouncedSave();
}

// Debounced save to prevent storage quota issues
function debouncedSave() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(async () => {
    await saveState();
  }, CONFIG.SAVE_DEBOUNCE_MS);
}

function trackTabUsage(tabId) {
  if (!userSettings.smartSuspension) return;
  
  const now = Date.now();
  if (!tabUsageHistory[tabId]) {
    tabUsageHistory[tabId] = { visits: 0, lastVisit: now, activeDuration: 0, typicalSession: [] };
  }
  
  tabUsageHistory[tabId].visits++;
  tabUsageHistory[tabId].lastVisit = now;
  
  // Cleanup old entries periodically to prevent memory leaks
  const historyKeys = Object.keys(tabUsageHistory);
  if (historyKeys.length > CONFIG.MAX_HISTORY_ENTRIES) {
    // Remove oldest entries
    const sorted = historyKeys.sort((a, b) => tabUsageHistory[a].lastVisit - tabUsageHistory[b].lastVisit);
    const toRemove = sorted.slice(0, Math.floor(CONFIG.MAX_HISTORY_ENTRIES * 0.1));
    toRemove.forEach(key => delete tabUsageHistory[key]);
  }
  
  // Save periodically with debounce
  if (tabUsageHistory[tabId].visits % 5 === 0) {
    debouncedSave();
  }
}

async function saveState() {
  try {
    await chrome.storage.local.set({ tabLastActive, tabUsageHistory });
  } catch (e) {
    console.error('Failed to save state:', e);
    // Handle storage quota exceeded
    if (e.message?.includes('QUOTA_BYTES')) {
      console.warn('Storage quota exceeded, cleaning up old data...');
      await cleanupOldData();
    }
  }
}

// Cleanup old data to prevent storage bloat
async function cleanupOldData() {
  try {
    const now = Date.now();
    const ttlMs = CONFIG.HISTORY_TTL_DAYS * 24 * 60 * 60 * 1000;
    const keysToDelete = [];
    
    for (const [tabId, data] of Object.entries(tabUsageHistory)) {
      if (now - data.lastVisit > ttlMs) {
        keysToDelete.push(tabId);
      }
    }
    
    // Also clean tabLastActive for removed tabs
    const allTabs = await chrome.tabs.query({}).catch(() => []);
    const activeTabIds = new Set(allTabs.map(t => t.id));
    
    for (const tabId of Object.keys(tabLastActive)) {
      if (!activeTabIds.has(parseInt(tabId))) {
        delete tabLastActive[tabId];
      }
    }
    
    keysToDelete.forEach(id => delete tabUsageHistory[id]);
    
    if (keysToDelete.length > 0 || Object.keys(tabLastActive).length < Object.keys(tabLastActive)) {
      await chrome.storage.local.set({ tabLastActive, tabUsageHistory, lastCleanup: now });
      console.log(`TabFlow: Cleaned up ${keysToDelete.length} old history entries`);
    }
  } catch (e) {
    console.error('Cleanup failed:', e);
  }
}

// Check for audio-playing tabs
async function checkAudioTabs() {
  if (!userSettings.audioProtection) return;
  
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.audible) {
        audioPlayingTabs.add(tab.id);
      } else {
        audioPlayingTabs.delete(tab.id);
      }
    }
  } catch (e) {
    console.error('Audio check failed:', e);
  }
}

// Smart suspension with AI learning
async function suspendIdleTabs() {
  await loadSettings();
  const now = Date.now();
  const tabs = await chrome.tabs.query({ status: "complete", discarded: false }).catch(() => []);
  let suspendedCount = 0;
  let preventedCount = 0;

  for (const tab of tabs) {
    const shouldSkip = await shouldSkipSuspension(tab, now);
    
    if (shouldSkip.skip) {
      if (shouldSkip.reason) {
        preventedCount++;
      }
      continue;
    }
    
    const lastActive = tabLastActive[tab.id] || now;
    const idleTime = now - lastActive;
    
    // Smart threshold adjustment based on usage history
    let dynamicThreshold = CONFIG.IDLE_THRESHOLD_MS;
    if (userSettings.smartSuspension && tabUsageHistory[tab.id]) {
      const history = tabUsageHistory[tab.id];
      // Increase threshold for frequently visited tabs
      if (history.visits > 10) {
        dynamicThreshold *= 1.5;
      }
    }
    
    if (idleTime > dynamicThreshold) {
      try {
        await chrome.tabs.discard(tab.id);
        suspendedCount++;
        await recordSuspension(tab);
      } catch (e) {
        console.warn(`Failed to suspend tab ${tab.id}:`, e);
      }
    }
  }
  
  if (suspendedCount > 0) {
    await updateStats(suspendedCount);
    console.log(`TabFlow: Suspended ${suspendedCount} tabs, protected ${preventedCount} important tabs`);
  }
}

// Determine if a tab should be skipped for suspension
async function shouldSkipSuspension(tab, now) {
  // Always skip active, pinned, or special tabs
  if (tab.active || tab.pinned || !tab.url) {
    return { skip: true, reason: 'system' };
  }
  
  // Skip Chrome/Firefox internal pages
  if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || 
      tab.url.startsWith("about:") || tab.url.startsWith("moz-extension://")) {
    return { skip: true, reason: 'internal' };
  }
  
  // Audio protection - critical differentiator
  if (userSettings.audioProtection && audioPlayingTabs.has(tab.id)) {
    return { skip: true, reason: 'audio' };
  }
  
  // Check audible flag directly
  if (userSettings.audioProtection && tab.audible) {
    return { skip: true, reason: 'audible' };
  }
  
  // Whitelist check
  try {
    const domain = new URL(tab.url).hostname;
    if (userSettings.whitelist.some(w => domain.includes(w))) {
      return { skip: true, reason: 'whitelist' };
    }
    
    // Blacklist check (force suspend)
    if (userSettings.blacklist.some(b => domain.includes(b))) {
      return { skip: false };
    }
  } catch (e) {
    // Invalid URL, skip
    return { skip: true, reason: 'invalid_url' };
  }
  
  // Form detection - check for unsaved forms (simplified)
  // In production, would inject content script to detect forms
  
  return { skip: false };
}

// Record suspension for analytics
async function recordSuspension(tab) {
  if (!userSettings.productivityTracking) return;
  
  const domain = (() => {
    try { return new URL(tab.url).hostname; } catch { return 'unknown'; }
  })();
  
  const data = await chrome.storage.local.get('productivityData');
  const pdata = data.productivityData || { domains: {}, daily: {} };
  const today = new Date().toISOString().split('T')[0];
  
  if (!pdata.domains[domain]) {
    pdata.domains[domain] = { suspensions: 0, memorySaved: 0 };
  }
  pdata.domains[domain].suspensions++;
  pdata.domains[domain].memorySaved += CONFIG.EST_MEMORY_PER_TAB_MB;
  
  if (!pdata.daily[today]) {
    pdata.daily[today] = { suspensions: 0, memorySaved: 0 };
  }
  pdata.daily[today].suspensions++;
  pdata.daily[today].memorySaved += CONFIG.EST_MEMORY_PER_TAB_MB;
  
  await chrome.storage.local.set({ productivityData: pdata });
}

async function updateStats(newSuspended = 0) {
  try {
    const data = await chrome.storage.local.get("stats");
    const stats = data.stats || { totalSuspended: 0, totalMemorySavedMB: 0, sessionsImproved: 0 };
    stats.totalSuspended += newSuspended;
    stats.totalMemorySavedMB += newSuspended * CONFIG.EST_MEMORY_PER_TAB_MB;
    stats.sessionsImproved++;
    await chrome.storage.local.set({ stats });
    chrome.runtime.sendMessage({ type: "stats_updated" }).catch(() => {});
  } catch (e) {
    console.error('Stats update failed:', e);
  }
}

// Message handler for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Validate request to prevent injection attacks
  if (!request || typeof request.action !== 'string') {
    sendResponse({ error: 'Invalid request' });
    return false;
  }

  if (request.action === "get_dashboard") {
    Promise.all([
      chrome.tabs.query({}),
      chrome.storage.local.get(["stats", "productivityData", "userSettings"])
    ]).then(([tabs, storage]) => {
      const active = tabs.filter(t => t.active).length;
      const suspended = tabs.filter(t => t.discarded).length;
      const audible = tabs.filter(t => t.audible).length;
      const stats = storage.stats || { totalMemorySavedMB: 0 };
      const productivityData = storage.productivityData || null;
      
      sendResponse({ 
        active, 
        suspended, 
        audible,
        stats, 
        productivityData,
        settings: storage.userSettings || userSettings
      });
    }).catch(err => {
      console.error('Dashboard error:', err);
      sendResponse({ error: err.message });
    });
    return true;
  }
  
  if (request.action === "suspend_all") {
    chrome.tabs.query({ active: false, discarded: false }, async (tabs) => {
      try {
        for (const t of tabs) {
          const skip = await shouldSkipSuspension(t, Date.now());
          if (!skip.skip && t.url && !t.url.startsWith("chrome://") && !t.url.startsWith("chrome-extension://")) {
            try { await chrome.tabs.discard(t.id); } catch(e){}
          }
        }
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    });
    return true;
  }
  
  if (request.action === "resume_all") {
    chrome.tabs.query({ discarded: true }, async (tabs) => {
      try {
        for (const t of tabs) {
          try { await chrome.tabs.update(t.id, { active: true }); } catch(e){}
        }
        sendResponse({ success: true });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    });
    return true;
  }
  
  if (request.action === "update_settings") {
    // Validate settings keys to prevent arbitrary data injection
    const allowedKeys = ['whitelist', 'blacklist', 'smartSuspension', 'audioProtection', 'productivityTracking'];
    const sanitizedSettings = {};
    
    if (request.settings && typeof request.settings === 'object') {
      for (const [key, value] of Object.entries(request.settings)) {
        if (allowedKeys.includes(key)) {
          // Type validation
          if (key === 'whitelist' || key === 'blacklist') {
            if (Array.isArray(value)) {
              sanitizedSettings[key] = value.filter(v => typeof v === 'string' && v.length > 0 && v.length < 100);
            }
          } else if (['smartSuspension', 'audioProtection', 'productivityTracking'].includes(key)) {
            if (typeof value === 'boolean') {
              sanitizedSettings[key] = value;
            }
          }
        }
      }
    }
    
    userSettings = { ...userSettings, ...sanitizedSettings };
    chrome.storage.local.set({ userSettings }).then(() => {
      sendResponse({ success: true });
    }).catch(e => {
      sendResponse({ success: false, error: e.message });
    });
    return true;
  }
  
  if (request.action === "get_productivity_report") {
    chrome.storage.local.get('productivityData').then((data) => {
      sendResponse(data.productivityData || {});
    }).catch(e => {
      sendResponse({ error: e.message });
    });
    return true;
  }
  
  sendResponse({ error: 'Unknown action' });
  return false;
});