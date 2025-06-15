class DigitalDevToolsExtension {
  constructor() {
    this.apiUrl = "https://digitaldevtools-backend.onrender.com/tools"
    this.tags = []
    this.currentMetadata = null
    this.categories = []

    this.init()
  }

  async init() {
    this.bindEvents()
    await this.loadCategories()
    this.loadCurrentTab()
  }

  async loadCategories() {
    try {
      const response = await fetch(this.apiUrl)
      if (response.ok) {
        const tools = await response.json()

        // Extract unique categories from the tools
        const uniqueCategories = [...new Set(tools.map((tool) => tool.category).filter(Boolean))]
        this.categories = uniqueCategories.sort()

        this.populateCategoryDropdown()
      } else {
        // Fallback categories if API fails
        this.categories = [
          "Javascript Notes",
          "CSS Tools",
          "React Resources",
          "Node.js Tools",
          "Design Tools",
          "Testing Tools",
          "DevOps Tools",
          "Learning Resources",
        ]
        this.populateCategoryDropdown()
      }
    } catch (error) {
      console.error("Error loading categories:", error)
      // Use fallback categories
      this.categories = [
        "Javascript Notes",
        "CSS Tools",
        "React Resources",
        "Node.js Tools",
        "Design Tools",
        "Testing Tools",
        "DevOps Tools",
        "Learning Resources",
      ]
      this.populateCategoryDropdown()
    }
  }

  populateCategoryDropdown() {
    const categorySelect = document.getElementById("categorySelect")

    // Clear existing options except the first one
    while (categorySelect.children.length > 1) {
      categorySelect.removeChild(categorySelect.lastChild)
    }

    // Add categories from API
    this.categories.forEach((category) => {
      const option = document.createElement("option")
      option.value = category
      option.textContent = category
      categorySelect.appendChild(option)
    })
  }

  bindEvents() {
    // Close button
    document.getElementById("closeBtn").addEventListener("click", () => {
      window.close()
    })

    // Form submission
    document.getElementById("toolForm").addEventListener("submit", (e) => {
      e.preventDefault()
      this.submitTool()
    })

    // URL input change event
    const urlInput = document.getElementById("urlInput")
    let debounceTimer
    urlInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        this.handleUrlChange(e.target.value)
      }, 500)
    })

    // Tags input
    const tagsInput = document.getElementById("tagsInput")
    tagsInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault()
        this.addTag(tagsInput.value.trim())
        tagsInput.value = ""
      }
    })

    // Priority toggle
    const priorityToggle = document.getElementById("priorityToggle")
    const priorityValue = document.getElementById("priorityValue")

    priorityToggle.addEventListener("change", () => {
      priorityValue.textContent = priorityToggle.checked ? "High" : "Low"
    })

    // Add category button
    document.getElementById("addCategoryBtn").addEventListener("click", () => {
      this.showAddCategoryDialog()
    })
  }

  async loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab && tab.url && !tab.url.startsWith("chrome://")) {
        document.getElementById("urlInput").value = tab.url
        await this.fetchMetadataFromCurrentTab(tab.id)
      }
    } catch (error) {
      console.log("Could not access current tab:", error)
    }
  }

  async handleUrlChange(url) {
    if (!url || !this.isValidUrl(url)) {
      this.hidePreview()
      return
    }

    try {
      // Check if it's the current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab && tab.url === url) {
        await this.fetchMetadataFromCurrentTab(tab.id)
      } else {
        await this.fetchMetadataFromUrl(url)
      }
    } catch (error) {
      console.error("Error fetching metadata:", error)
      this.showPreviewError()
    }
  }

  async fetchMetadataFromCurrentTab(tabId) {
    try {
      const metadata = await chrome.tabs.sendMessage(tabId, { action: "getMetadata" })
      this.displayPreview(metadata)
    } catch (error) {
      console.error("Error getting metadata from current tab:", error)
      this.showPreviewError()
    }
  }

  async fetchMetadataFromUrl(url) {
    try {
      // For external URLs, we'll use a simple fetch approach
      // Note: This has CORS limitations, but works for many sites
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`)
      const data = await response.json()

      if (data.contents) {
        const parser = new DOMParser()
        const doc = parser.parseFromString(data.contents, "text/html")

        const metadata = {
          title: doc.title || new URL(url).hostname,
          description: this.extractDescription(doc),
          favicon: this.extractFavicon(doc, url),
          url: url,
        }

        this.displayPreview(metadata)
      } else {
        throw new Error("Could not fetch page content")
      }
    } catch (error) {
      // Fallback to basic URL parsing
      const urlObj = new URL(url)
      const metadata = {
        title: urlObj.hostname.replace("www.", ""),
        description: `Website: ${urlObj.hostname}`,
        favicon: `${urlObj.origin}/favicon.ico`,
        url: url,
      }
      this.displayPreview(metadata)
    }
  }

  extractDescription(doc) {
    const descMeta =
      doc.querySelector('meta[name="description"]') ||
      doc.querySelector('meta[property="og:description"]') ||
      doc.querySelector('meta[name="twitter:description"]')

    return descMeta ? descMeta.getAttribute("content") : "No description available"
  }

  extractFavicon(doc, baseUrl) {
    const faviconLink =
      doc.querySelector('link[rel="icon"]') ||
      doc.querySelector('link[rel="shortcut icon"]') ||
      doc.querySelector('link[rel="apple-touch-icon"]')

    if (faviconLink) {
      const href = faviconLink.getAttribute("href")
      return href.startsWith("http") ? href : new URL(href, baseUrl).href
    }

    return new URL("/favicon.ico", baseUrl).href
  }

  displayPreview(metadata) {
    this.currentMetadata = metadata

    const previewSection = document.getElementById("previewSection")
    const previewTitle = document.getElementById("previewTitle")
    const previewDescription = document.getElementById("previewDescription")
    const previewFavicon = document.getElementById("previewFavicon")
    const urlInput = document.getElementById("urlInput")

    previewTitle.textContent = metadata.title || "No title available"
    previewDescription.textContent = metadata.description || "No description available"
    previewFavicon.src = metadata.favicon
    previewFavicon.style.display = "block"

    previewSection.style.display = "block"
    urlInput.classList.add("has-preview")

    // Remove loading state
    previewSection.classList.remove("preview-loading")
  }

  showPreviewError() {
    const previewSection = document.getElementById("previewSection")
    const previewTitle = document.getElementById("previewTitle")
    const previewDescription = document.getElementById("previewDescription")

    previewTitle.textContent = "Could not load preview"
    previewTitle.className = "preview-error"
    previewDescription.textContent = "Unable to fetch page information"
    previewDescription.className = "preview-error"

    previewSection.style.display = "block"
    previewSection.classList.remove("preview-loading")
  }

  hidePreview() {
    const previewSection = document.getElementById("previewSection")
    const urlInput = document.getElementById("urlInput")

    previewSection.style.display = "none"
    urlInput.classList.remove("has-preview")
    this.currentMetadata = null
  }

  isValidUrl(string) {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  addTag(tagText) {
    if (!tagText || this.tags.includes(tagText)) return

    this.tags.push(tagText)
    this.renderTags()
  }

  removeTag(tagText) {
    this.tags = this.tags.filter((tag) => tag !== tagText)
    this.renderTags()
  }

  renderTags() {
    const tagsList = document.getElementById("tagsList")
    tagsList.innerHTML = ""

    this.tags.forEach((tag) => {
      const tagElement = document.createElement("div")
      tagElement.className = "tag"
      tagElement.innerHTML = `
        ${tag}
        <button type="button" class="tag-remove" data-tag="${tag}">×</button>
      `

      tagElement.querySelector(".tag-remove").addEventListener("click", () => {
        this.removeTag(tag)
      })

      tagsList.appendChild(tagElement)
    })
  }

  showAddCategoryDialog() {
    const newCategory = prompt("Enter new category name:")
    if (newCategory && newCategory.trim()) {
      const trimmedCategory = newCategory.trim()

      // Add to categories array if not already present
      if (!this.categories.includes(trimmedCategory)) {
        this.categories.push(trimmedCategory)
        this.categories.sort()
      }

      const categorySelect = document.getElementById("categorySelect")
      const option = document.createElement("option")
      option.value = trimmedCategory
      option.textContent = trimmedCategory
      categorySelect.appendChild(option)
      categorySelect.value = trimmedCategory
    }
  }

  async submitTool() {
    const submitBtn = document.getElementById("submitBtn")
    const urlInput = document.getElementById("urlInput")
    const categorySelect = document.getElementById("categorySelect")
    const priorityToggle = document.getElementById("priorityToggle")

    // Validate form
    if (!urlInput.value || !categorySelect.value) {
      this.showError("Please fill in all required fields.")
      return
    }

    // Show loading state
    submitBtn.classList.add("loading")
    submitBtn.disabled = true

    try {
      const toolData = {
        name: this.currentMetadata?.title || new URL(urlInput.value).hostname.replace("www.", ""),
        description: this.currentMetadata?.description || `Tool from ${new URL(urlInput.value).hostname}`,
        url: urlInput.value,
        category: categorySelect.value,
        tags: this.tags,
        priority: priorityToggle.checked,
      }

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toolData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log("Tool added successfully:", result)

      this.showSuccess()
      this.resetForm()

      // Close extension after 2 seconds
      setTimeout(() => {
        window.close()
      }, 2000)
    } catch (error) {
      console.error("Error adding tool:", error)
      this.showError("Failed to add tool. Please check your connection and try again.")
    } finally {
      submitBtn.classList.remove("loading")
      submitBtn.disabled = false
    }
  }

  showSuccess() {
    const successMessage = document.getElementById("successMessage")
    const errorMessage = document.getElementById("errorMessage")

    errorMessage.classList.remove("show")
    successMessage.classList.add("show")

    setTimeout(() => {
      successMessage.classList.remove("show")
    }, 3000)
  }

  showError(message) {
    const errorMessage = document.getElementById("errorMessage")
    const successMessage = document.getElementById("successMessage")
    const errorText = document.getElementById("errorText")

    successMessage.classList.remove("show")
    errorText.textContent = `❌ ${message}`
    errorMessage.classList.add("show")

    setTimeout(() => {
      errorMessage.classList.remove("show")
    }, 5000)
  }

  resetForm() {
    document.getElementById("toolForm").reset()
    this.tags = []
    this.renderTags()
    document.getElementById("priorityValue").textContent = "Low"
  }
}

// Initialize the extension when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new DigitalDevToolsExtension()
})
