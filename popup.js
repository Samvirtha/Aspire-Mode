// Toggle Study Mode
document.getElementById("toggleMode").addEventListener("click", () => {
  chrome.storage.local.get(["studyMode", "blockedSites"], (data) => {
    const newMode = !data.studyMode;
    chrome.storage.local.set({ studyMode: newMode }, () => {
      document.getElementById("status").innerText =
        newMode ? "✅ Study Mode Activated" : "❌ Study Mode Off";
    });

    chrome.runtime.sendMessage({
      action: "updateBlocking",
      sites: data.blockedSites || [],
      enabled: newMode
    });

    document.getElementById("toggleMode").textContent = newMode
      ? "🚀 Study Mode ON"
      : "⏸️ Study Mode OFF";
  });
});

// Show Quote
document.getElementById("showQuote").addEventListener("click", () => {
  const quotes = [
    "Focus on progress, not perfection.",
    "Discipline is the bridge between goals and success.",
    "Your future depends on what you do today.",
    "Stay consistent, results will follow.",
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
  ];
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  document.getElementById("quoteBox").innerText = randomQuote;
});


// Save Settings
// Save Settings
document.getElementById("saveSettings").addEventListener("click", () => {
  const raw = document.getElementById("blockedSites").value;
  const sites = raw
    .split(/,|\n/).map(s => s.trim()).filter(Boolean);

  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;

  chrome.storage.local.get(["studyMode"], (data) => {
    chrome.storage.local.set({ blockedSites: sites, startTime: start, endTime: end }, () => {
      document.getElementById("status").innerText = "⚙️ Settings Saved!";

      // ✅ Only apply if studyMode is ON
      chrome.runtime.sendMessage({
        action: "updateBlocking",
        sites,
        enabled: data.studyMode || false
      });

      updateProgress();
    });
  });
});

// Load + keep progress updated
window.onload = () => {
  chrome.storage.local.get(["blockedSites", "startTime", "endTime", "studyMode"], (data) => {
    if (data.blockedSites) document.getElementById("blockedSites").value = data.blockedSites.join(", ");
    if (data.startTime) document.getElementById("startTime").value = data.startTime;
    if (data.endTime) document.getElementById("endTime").value = data.endTime;

    document.getElementById("status").innerText =
      data.studyMode ? "✅ Study Mode Activated" : "❌ Study Mode Off";

    document.getElementById("toggleMode").textContent =
      data.studyMode ? "🚀 Study Mode ON" : "⏸️ Study Mode OFF";

    updateProgress();
    setInterval(updateProgress, 60000); // update every minute
  });
};

// Midnight-safe progress for the popup display
function getWindowForNow(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const now = new Date();
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  const startToday = new Date(now); startToday.setHours(sh, sm, 0, 0);
  let end = new Date(now); end.setHours(eh, em, 0, 0);
  if (end <= startToday) end.setDate(end.getDate() + 1);

  let start = new Date(startToday);
  const duration = end - startToday;
  if (now < startToday) {
    const prevEnd = new Date(startToday);
    const prevStart = new Date(prevEnd.getTime() - duration);
    start = prevStart; end = prevEnd;
  }
  return { start, end, duration: end - start };
}

function updateProgress() {
  chrome.storage.local.get(["startTime", "endTime"], (data) => {
    if (!data.startTime || !data.endTime) return;

    const win = getWindowForNow(data.startTime, data.endTime);
    const now = new Date();

    if (!win || win.duration <= 0) {
      document.getElementById("progressText").innerText = "Set a valid start & end time.";
      document.getElementById("progressFill").style.width = "0%";
      return;
    }

    if (now <= win.start) {
      document.getElementById("progressText").innerText = "⏳ Day hasn't started yet.";
      document.getElementById("progressFill").style.width = "0%";
      return;
    }
    if (now >= win.end) {
      document.getElementById("progressText").innerText = "✅ Day Completed!";
      document.getElementById("progressFill").style.width = "100%";
      return;
    }

    const percent = Math.floor(((now - win.start) / win.duration) * 100);
    document.getElementById("progressText").innerText = `Day Progress: ${percent}%`;
    document.getElementById("progressFill").style.width = percent + "%";
  });
}
