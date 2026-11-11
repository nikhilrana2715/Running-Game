// Opens the game in a full tab via keyboard shortcut (Alt+Shift+J). Reuses an existing tab if open.
async function openFull() {
  const url = chrome.runtime.getURL('index.html');
  const tabs = await chrome.tabs.query({ url });
  if (tabs.length) { await chrome.tabs.update(tabs[0].id, { active: true }); await chrome.windows.update(tabs[0].windowId, { focused: true }); }
  else await chrome.tabs.create({ url });
}
chrome.commands.onCommand.addListener((cmd) => { if (cmd === 'open-full') openFull(); });
