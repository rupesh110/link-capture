const captureButton = document.getElementById("captureButton");
const copyButton = document.getElementById("copyButton");
const downloadButton = document.getElementById("downloadButton");
const statusElement = document.getElementById("status");
const summaryElement = document.getElementById("summary");
const outputElement = document.getElementById("output");

let capturedLinks = [];

captureButton.addEventListener("click", async () => {
  setStatus("Capturing links...");
  setButtons(false);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || typeof tab.id !== "number") {
      throw new Error("No active tab found.");
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const links = Array.from(document.querySelectorAll("a[href]"))
          .map((anchor) => anchor.href.trim())
          .filter(Boolean);

        return Array.from(new Set(links)).sort((left, right) => left.localeCompare(right));
      }
    });

    capturedLinks = Array.isArray(result) ? result : [];
    outputElement.value = capturedLinks.join("\n");
    summaryElement.textContent = `${capturedLinks.length} unique link${capturedLinks.length === 1 ? "" : "s"} found.`;
    setStatus(capturedLinks.length ? "Capture complete." : "No links found on this page.");
    setButtons(capturedLinks.length > 0);
  } catch (error) {
    capturedLinks = [];
    outputElement.value = "";
    summaryElement.textContent = "No links captured yet.";
    setStatus(error.message || "Unable to capture links from this page.");
    setButtons(false);
  }
});

copyButton.addEventListener("click", async () => {
  if (!capturedLinks.length) {
    return;
  }

  try {
    await navigator.clipboard.writeText(capturedLinks.join("\n"));
    setStatus("Copied links to clipboard.");
  } catch (error) {
    setStatus(error.message || "Unable to copy links.");
  }
});

downloadButton.addEventListener("click", async () => {
  if (!capturedLinks.length) {
    return;
  }

  const blob = new Blob([capturedLinks.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  try {
    await chrome.downloads.download({
      url,
      filename: "captured-links.txt",
      saveAs: true
    });
    setStatus("Download started.");
  } catch (error) {
    setStatus(error.message || "Unable to download links.");
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
});

function setStatus(message) {
  statusElement.textContent = message;
}

function setButtons(enabled) {
  copyButton.disabled = !enabled;
  downloadButton.disabled = !enabled;
}
