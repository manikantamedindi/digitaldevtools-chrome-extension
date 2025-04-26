chrome.action.onClicked.addListener((tab) => {
  const newUrl = `https://digitaldevtools.vercel.app/?url=${encodeURIComponent(tab.url)}`;

  chrome.tabs.query({ url: "https://digitaldevtools.vercel.app/*" }, (tabs) => {
    if (tabs.length > 0) {
      // If the tab is already open, update the URL
      chrome.tabs.update(tabs[0].id, { url: newUrl, active: true });
    } else {
      // If not open, create a new tab
      chrome.tabs.create({ url: newUrl });
    }
  });
});
