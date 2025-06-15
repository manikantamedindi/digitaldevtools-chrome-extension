// Content script to extract meta information from web pages
function extractPageMetadata() {
  const metadata = {
    title: "",
    description: "",
    favicon: "",
    url: window.location.href,
  }

  // Get title
  metadata.title = document.title || ""

  // Get description from meta tags
  const descriptionMeta =
    document.querySelector('meta[name="description"]') ||
    document.querySelector('meta[property="og:description"]') ||
    document.querySelector('meta[name="twitter:description"]')

  if (descriptionMeta) {
    metadata.description = descriptionMeta.getAttribute("content") || ""
  }

  // Get favicon
  const faviconLink =
    document.querySelector('link[rel="icon"]') ||
    document.querySelector('link[rel="shortcut icon"]') ||
    document.querySelector('link[rel="apple-touch-icon"]')

  if (faviconLink) {
    metadata.favicon = new URL(faviconLink.href, window.location.origin).href
  } else {
    // Fallback to default favicon location
    metadata.favicon = new URL("/favicon.ico", window.location.origin).href
  }

  return metadata
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getMetadata") {
    const metadata = extractPageMetadata()
    sendResponse(metadata)
  }
})
