document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  document.getElementById("suspendAll").addEventListener("click", async () => {
    const btn = document.getElementById("suspendAll");
    btn.textContent = "⏳ Working..."; btn.disabled = true;
    chrome.runtime.sendMessage({ action: "suspend_all" }, () => {
      setTimeout(() => { loadDashboard(); btn.textContent = "⚡ Suspend All Inactive"; btn.disabled = false; }, 400);
    });
  });
  document.getElementById("resumeAll").addEventListener("click", async () => {
    const btn = document.getElementById("resumeAll");
    btn.textContent = "⏳ Working..."; btn.disabled = true;
    chrome.runtime.sendMessage({ action: "resume_all" }, () => {
      setTimeout(() => { loadDashboard(); btn.textContent = "↩️ Resume All"; btn.disabled = false; }, 400);
    });
  });
  document.getElementById("upgradeBtn").addEventListener("click", () => {
    alert("Replace this with your ExtensionPay checkout URL");
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "stats_updated") loadDashboard();
});

function loadDashboard() {
  chrome.runtime.sendMessage({ action: "get_dashboard" }, (data) => {
    if (chrome.runtime.lastError) return;
    document.getElementById("activeCount").textContent = data.active;
    document.getElementById("suspendedCount").textContent = data.suspended;
    const mem = data.stats?.totalMemorySavedMB || 0;
    document.getElementById("memorySaved").textContent = mem > 1000 ? `${(mem/1000).toFixed(1)} GB` : `${mem} MB`;
  });
}