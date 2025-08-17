document.getElementById("save").addEventListener("click", () => {
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  const sites = document.getElementById("sites").value.split("\n");
  chrome.storage.local.set({ startTime, endTime, blockedSites: sites });
});
