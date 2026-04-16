// TabFlow - Smart Popup with Feature Toggles and Analytics
// Quality hardened version with error handling and security improvements

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadDashboard();
    await loadSettings();
    setupEventListeners();
  } catch (e) {
    console.error('Popup initialization failed:', e);
    showError('Failed to initialize TabFlow. Please reload the extension.');
  }
});

// Listen for background updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "stats_updated") {
    loadDashboard().catch(console.error);
  }
});

function setupEventListeners() {
  // Suspend/Resume buttons with debouncing
  let isProcessing = false;
  
  const suspendBtn = document.getElementById("suspendAll");
  const resumeBtn = document.getElementById("resumeAll");
  
  if (suspendBtn) {
    suspendBtn.addEventListener("click", async () => {
      if (isProcessing) return;
      isProcessing = true;
      
      const originalText = suspendBtn.textContent;
      suspendBtn.textContent = "⏳ Working..."; 
      suspendBtn.disabled = true;
      
      try {
        await chrome.runtime.sendMessage({ action: "suspend_all" });
        setTimeout(() => { 
          loadDashboard().catch(console.error); 
          suspendBtn.textContent = originalText; 
          suspendBtn.disabled = false; 
          isProcessing = false;
        }, 400);
      } catch (e) {
        showError('Failed to suspend tabs');
        suspendBtn.textContent = originalText;
        suspendBtn.disabled = false;
        isProcessing = false;
      }
    });
  }
  
  if (resumeBtn) {
    resumeBtn.addEventListener("click", async () => {
      if (isProcessing) return;
      isProcessing = true;
      
      const originalText = resumeBtn.textContent;
      resumeBtn.textContent = "⏳ Working..."; 
      resumeBtn.disabled = true;
      
      try {
        await chrome.runtime.sendMessage({ action: "resume_all" });
        setTimeout(() => { 
          loadDashboard().catch(console.error); 
          resumeBtn.textContent = originalText; 
          resumeBtn.disabled = false; 
          isProcessing = false;
        }, 400);
      } catch (e) {
        showError('Failed to resume tabs');
        resumeBtn.textContent = originalText;
        resumeBtn.disabled = false;
        isProcessing = false;
      }
    });
  }
  
  // Feature toggles with error handling
  const smartToggle = document.getElementById("smartSuspensionToggle");
  const audioToggle = document.getElementById("audioProtectionToggle");
  const prodToggle = document.getElementById("productivityToggle");
  
  if (smartToggle) {
    smartToggle.addEventListener("change", (e) => {
      updateSetting('smartSuspension', e.target.checked).catch(console.error);
    });
  }
  
  if (audioToggle) {
    audioToggle.addEventListener("change", (e) => {
      updateSetting('audioProtection', e.target.checked).catch(console.error);
    });
  }
  
  if (prodToggle) {
    prodToggle.addEventListener("change", (e) => {
      updateSetting('productivityTracking', e.target.checked).catch(console.error);
    });
  }
  
  // Domain management
  const addDomainBtn = document.getElementById("addDomainBtn");
  const newDomainInput = document.getElementById("newDomain");
  
  if (addDomainBtn) {
    addDomainBtn.addEventListener("click", () => addDomain().catch(console.error));
  }
  
  if (newDomainInput) {
    newDomainInput.addEventListener("keypress", (e) => {
      if (e.key === 'Enter') {
        addDomain().catch(console.error);
      }
    });
  }
  
  // Upgrade button
  const upgradeBtn = document.getElementById("upgradeBtn");
  if (upgradeBtn) {
    upgradeBtn.addEventListener("click", () => {
      showError("🚀 Pro Features Coming Soon!\n\n• Cross-browser sync\n• Advanced analytics dashboard\n• Team collaboration\n• Custom rules engine\n\nReplace with your payment URL.");
    });
  }
}

function showError(message) {
  console.error(message);
  // Could show a toast notification here
}

async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ action: "get_dashboard" });
    if (!response || response.error) {
      console.warn('Failed to load settings:', response?.error);
      return;
    }
    
    const settings = response.settings || {};
    
    const smartToggle = document.getElementById("smartSuspensionToggle");
    const audioToggle = document.getElementById("audioProtectionToggle");
    const prodToggle = document.getElementById("productivityToggle");
    
    if (smartToggle) smartToggle.checked = settings.smartSuspension !== false;
    if (audioToggle) audioToggle.checked = settings.audioProtection !== false;
    if (prodToggle) prodToggle.checked = settings.productivityTracking !== false;
    
    // Load whitelist
    renderWhitelist(settings.whitelist || []);
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

async function updateSetting(key, value) {
  try {
    const response = await chrome.runtime.sendMessage({ 
      action: "update_settings", 
      settings: { [key]: value } 
    });
    
    if (response && !response.success) {
      console.error('Failed to update setting:', response.error);
    }
  } catch (e) {
    console.error('Failed to update setting:', e);
  }
}

function renderWhitelist(domains) {
  const container = document.getElementById("whitelistDisplay");
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!Array.isArray(domains) || domains.length === 0) {
    container.innerHTML = '<span style="color: var(--muted); font-size: 11px;">No protected domains yet</span>';
    return;
  }
  
  domains.forEach(domain => {
    if (typeof domain !== 'string') return; // Skip invalid entries
    
    const tag = document.createElement('div');
    tag.className = 'domain-tag';
    tag.innerHTML = `
      <span>🛡️ ${escapeHtml(domain)}</span>
      <span class="remove" role="button" tabindex="0" aria-label="Remove ${escapeHtml(domain)}">×</span>
    `;
    
    // Add click handler for remove button
    const removeBtn = tag.querySelector('.remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => removeDomain(domain).catch(console.error));
      removeBtn.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          removeDomain(domain).catch(console.error);
        }
      });
    }
    
    container.appendChild(tag);
  });
}

// XSS prevention helper
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function addDomain() {
  const input = document.getElementById("newDomain");
  const domain = input.value.trim().toLowerCase();
  
  if (!domain) return;
  
  // Validate domain format
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
  if (!domainRegex.test(domain)) {
    showError('Please enter a valid domain (e.g., example.com)');
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({ action: "get_dashboard" });
    const currentWhitelist = response.settings?.whitelist || [];
    
    if (!currentWhitelist.includes(domain)) {
      const newWhitelist = [...currentWhitelist, domain];
      await chrome.runtime.sendMessage({ 
        action: "update_settings", 
        settings: { whitelist: newWhitelist } 
      });
      renderWhitelist(newWhitelist);
      input.value = '';
    }
  } catch (e) {
    console.error('Failed to add domain:', e);
  }
}

async function removeDomain(domain) {
  try {
    const response = await chrome.runtime.sendMessage({ action: "get_dashboard" });
    const currentWhitelist = response.settings?.whitelist || [];
    const newWhitelist = currentWhitelist.filter(d => d !== domain);
    
    await chrome.runtime.sendMessage({ 
      action: "update_settings", 
      settings: { whitelist: newWhitelist } 
    });
    renderWhitelist(newWhitelist);
  } catch (e) {
    console.error('Failed to remove domain:', e);
  }
}

async function loadDashboard() {
  try {
    const data = await chrome.runtime.sendMessage({ action: "get_dashboard" });
    
    if (data.error) {
      console.error('Dashboard error:', data.error);
      return;
    }
    
    // Update stats
    document.getElementById("activeCount").textContent = data.active || 0;
    document.getElementById("suspendedCount").textContent = data.suspended || 0;
    document.getElementById("audibleCount").textContent = data.audible || 0;
    
    const mem = data.stats?.totalMemorySavedMB || 0;
    const memElement = document.getElementById("memorySaved");
    memElement.textContent = mem > 1000 ? `${(mem/1000).toFixed(1)} GB` : `${mem} MB`;
    
    // Update productivity data
    updateProductivitySnapshot(data.productivityData);
    
  } catch (e) {
    console.error('Failed to load dashboard:', e);
  }
}

function updateProductivitySnapshot(productivityData) {
  const today = new Date().toISOString().split('T')[0];
  const daily = productivityData?.daily?.[today] || { suspensions: 0, memorySaved: 0 };
  
  document.getElementById("todaySuspensions").textContent = daily.suspensions || 0;
  const memSaved = daily.memorySaved || 0;
  document.getElementById("todayMemory").textContent = memSaved > 1000 
    ? `${(memSaved/1000).toFixed(1)} GB` 
    : `${memSaved} MB`;
}

// Make removeDomain globally accessible
window.removeDomain = removeDomain;