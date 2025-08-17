// --- Debug: prove worker is alive ---
console.log("🚀 Background service worker loaded");

// Default state on install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log("⚡ Extension installed/updated");
  chrome.storage.local.set({
    studyMode: false,
    startTime: "08:00",
    endTime: "22:00",
    blockedSites: ["facebook.com", "youtube.com"],
    quotes: [
      "Push yourself, because no one else will do it for you.",
      "Success is the sum of small efforts repeated daily.",
      "Stay focused and never give up.",
      "Dream big, start small, act now.",
      "Stay focused and never give up.",
  "One step at a time, one day at a time.",
  "Your hard work today builds your tomorrow.",
  "Discipline is the bridge between goals and achievement.",
  "Dream big, start small, act now.",
  "Consistency beats intensity.",
  "Success is the sum of small efforts repeated daily.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Small progress each day adds up to big results.",
  "Don't stop until you're proud.",
  "Your only limit is your mind.",
  "Doubt kills more dreams than failure ever will.",
  "Focus on progress, not perfection.",
  "Believe you can, and you're halfway there."

    ]
  });

  // Always schedule 60-min repeating alarm for quotes
  chrome.alarms.create("motivationQuote", { delayInMinutes: 1, periodInMinutes: 60 });
});

// --- Quote Notifications ---
function showQuote() {
  chrome.storage.local.get("quotes", (data) => {
    if (!data.quotes || data.quotes.length === 0) return;
    const q = data.quotes[Math.floor(Math.random() * data.quotes.length)];

    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title: "Aspire Mode ✨",
      message: q,
      priority: 2
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("Notification error:", chrome.runtime.lastError);
      } else {
        console.log("✅ Notification shown:", q);
      }
    });
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "motivationQuote") showQuote();
});

// ------ Midnight-safe progress helper ------
function getWindowForNow(startTime, endTime, now = new Date()) {
  if (!startTime || !endTime) return null;

  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  const startToday = new Date(now); startToday.setHours(sh, sm, 0, 0);
  let end = new Date(now); end.setHours(eh, em, 0, 0);

  if (end <= startToday) end.setDate(end.getDate() + 1); // overnight window

  let start = new Date(startToday);
  const duration = end - startToday;
  if (now < startToday && duration > 0) {
    const prevEnd = new Date(startToday);
    const prevStart = new Date(prevEnd.getTime() - duration);
    start = prevStart;
    end = prevEnd;
  }
  return { start, end, duration: end - start };
}

function getDayProgress(startTime, endTime) {
  const now = new Date();
  const win = getWindowForNow(startTime, endTime, now);
  if (!win || win.duration <= 0) return 0;
  if (now <= win.start) return 0;
  if (now >= win.end) return 100;
  return Math.floor(((now - win.start) / win.duration) * 100);
}

// ------ Messages from popup ------
chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  if (req.action === "showQuote") {
    showQuote();
  }

  if (req.action === "updateBlocking") {
    updateBlockingRules(!!req.enabled, req.sites || [])
      .then(() => sendResponse({ ok: true }))
      .catch(err => {
        console.log("🧱 DNR update error:", err?.message || err);
        sendResponse({ ok: false, error: String(err) });
      });
    return true; // async
  }

  if (req.action === "getProgress") {
    chrome.storage.local.get(["startTime", "endTime"], (data) => {
      const percent = getDayProgress(data.startTime, data.endTime);
      sendResponse({ progress: percent });
    });
    return true; // async
  }
});

// ------ Declarative Net Request (site blocking) ------
async function updateBlockingRules(enabled, blockedSites) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  if (existing.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existing.map(r => r.id)
    });
    console.log("🗑️ Removed old rules:", existing.map(r => r.id));
  }

  if (enabled && blockedSites.length > 0) {
    const rules = blockedSites.map((site, index) => ({
      id: index + 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { extensionPath: "/blocked.html" }
      },
      condition: {
        urlFilter: `*://*.${site}/*`,
        resourceTypes: ["main_frame"]
      }
    }));

    await chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules });
    console.log("✅ Blocking rules applied:", blockedSites);
  } else {
    console.log("🟢 Study mode OFF → no rules active");
  }
}
