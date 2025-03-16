
class TabManager {
    constructor() {
        this.tabs = [];
        this.activeTab = null;
        this.tabCounter = 0;
        this.init();
    }

    init() {
        document
            .getElementById("newTab")
            .addEventListener("click", () => this.createTab());
        document
            .getElementById("urlBar")
            .addEventListener("keypress", (e) => {
                if (e.key === "Enter") this.navigateActiveTab(e.target.value);
            });
        // Add back and forward button event listeners
        document.getElementById("backBtn").addEventListener("click", () => this.goBack());
        document.getElementById("forwardBtn").addEventListener("click", () => this.goForward());

        // Keyboard shortcuts
        document.addEventListener("keydown", (e) => {
            if (e.altKey && e.key === "ArrowLeft") this.goBack();
            if (e.altKey && e.key === "ArrowRight") this.goForward();
        });

        // Load saved tabs
        const savedData = localStorage.getItem("tabs");
        if (savedData) {
            const { tabs: savedTabs, activeTabIndex } = JSON.parse(savedData);
            savedTabs.forEach((tab) => this.createTab(tab.url, tab.title));
            if (savedTabs.length > 0) {
                this.switchTab(this.tabs[activeTabIndex].id);
            }
        } else {
            this.createTab("https://www.google.com");
        }
    }

    // Navigate Back
    goBack() {
        if (this.activeTab && this.activeTab.webview.canGoBack()) {
            this.activeTab.webview.goBack();
        }
    }

    // Navigate Forward
    goForward() {
        if (this.activeTab && this.activeTab.webview.canGoForward()) {
            this.activeTab.webview.goForward();
        }
    }

    createTab(url) {
        const tabId = `tab-${this.tabCounter++}`;
        const tab = {
            id: tabId,
            url: url || "https://www.google.com",
            title: "New Tab",
            webview: null,
            element: null,
            isActive: false,
        };

        // Create tab element with Tailwind classes
        const tabElement = document.createElement("div");
        tabElement.className =
            "flex items-center py-2 px-4 bg-white border border-gray-300 rounded-t mr-1 cursor-pointer max-w-[200px] min-w-[100px]";
        tabElement.innerHTML = `
                  <span class="flex-1 truncate">${tab.title}</span>
                  <span class="ml-2 text-gray-500 px-1 hover:text-gray-700">×</span>
                `;
        // Close button click event
        tabElement
            .querySelector("span.ml-2")
            .addEventListener("click", (e) => {
                e.stopPropagation();
                this.closeTab(tabId);
            });
        // Switch tab on click
        tabElement.addEventListener("click", () => this.switchTab(tabId));
        document
            .getElementById("tabBar")
            .insertBefore(tabElement, document.getElementById("newTab"));

        // Create webview with Tailwind classes
        const webview = document.createElement("webview");
        webview.setAttribute("partition", "persist:custom-browser");
        webview.setAttribute("allowpopups", "on");
        webview.setAttribute("webpreferences", "nativeWindowOpen=no");
        webview.id = `webview-${tabId}`;
        // Start hidden; when active we’ll toggle to flex
        webview.className = "w-full h-full hidden";
        webview.src = tab.url;

        webview.addEventListener("new-window", (e) => {
            e.preventDefault();
            tabManager.createTab(e.url); // Open in a new tab instead of a new window
        });

        webview.addEventListener("did-navigate", (e) =>
            this.updateTabUrl(tabId, e.url)
        );
        webview.addEventListener("page-title-updated", (e) =>
            this.updateTabTitle(tabId, e.title)
        );

        document.getElementById("webviewsContainer").appendChild(webview);

        tab.element = tabElement;
        tab.webview = webview;
        this.tabs.push(tab);
        this.switchTab(tabId);
        return tab;
    }

    saveTabs() {
        const tabsData = this.tabs.map((tab) => ({
            url: tab.url,
            title: tab.title,
        }));
        const activeTabIndex = this.tabs.findIndex((tab) => tab.isActive);
        localStorage.setItem(
            "tabs",
            JSON.stringify({
                tabs: tabsData,
                activeTabIndex: activeTabIndex >= 0 ? activeTabIndex : 0,
            })
        );
    }

    switchTab(tabId) {
        this.tabs.forEach((tab) => {
            const isActive = tab.id === tabId;
            tab.isActive = isActive;
            // Update tab element styling: add extra classes if active
            if (isActive) {
                tab.element.classList.add("z-[1]", "border-b-white");
                tab.webview.classList.remove("hidden");
                tab.webview.classList.add("flex");
            } else {
                tab.element.classList.remove("z-[1]", "border-b-white");
                tab.webview.classList.remove("flex");
                tab.webview.classList.add("hidden");
            }
        });
        this.activeTab = this.tabs.find((tab) => tab.id === tabId);
        document.getElementById("urlBar").value = this.activeTab.url;
    }

    closeTab(tabId) {
        const index = this.tabs.findIndex((tab) => tab.id === tabId);
        if (index === -1) return;

        const tab = this.tabs[index];
        tab.element.remove();
        tab.webview.remove();
        this.tabs.splice(index, 1);

        if (this.tabs.length === 0) {
            this.createTab();
        } else if (tab.isActive) {
            this.switchTab(this.tabs[Math.max(0, index - 1)].id);
        }
        this.saveTabs();
    }

    navigateActiveTab(url) {
        if (!this.activeTab) return;
        const fullUrl = url.startsWith("http") ? url : `https://${url}`;
        this.activeTab.webview.src = fullUrl;
        this.activeTab.url = fullUrl;
        document.getElementById("urlBar").value = fullUrl;
        this.saveTabs();
    }

    updateTabUrl(tabId, url) {
        const tab = this.tabs.find((t) => t.id === tabId);
        if (tab) {
            tab.url = url;
            if (tab.isActive) document.getElementById("urlBar").value = url;
        }
    }

    updateTabTitle(tabId, title) {
        const tab = this.tabs.find((t) => t.id === tabId);
        if (tab) {
            tab.title = title;
            tab.element.querySelector("span.flex-1").textContent = title;
        }
    }
}

// Initialize tab manager
const tabManager = new TabManager();

// Save state before unload
window.addEventListener("beforeunload", () => {
    tabManager.saveTabs();
});

// Add hotkey for hiding/showing tab bar and URL bar
document.addEventListener("DOMContentLoaded", () => {
    const tabBar = document.getElementById("tabBar");
    const urlBar = document.getElementById("navContainer");

    // Load initial state
    const isHidden = localStorage.getItem("barsHidden") === "true";

    // Toggle function
    const toggleBars = () => {
        const currentlyHidden = tabBar.classList.contains("hidden");
        tabBar.classList.toggle("hidden");
        urlBar.classList.toggle("hidden");

        // Also toggle back and forward buttons
        
        document.getElementById("backBtn").classList.toggle("hidden");
        document.getElementById("forwardBtn").classList.toggle("hidden");

        localStorage.setItem("barsHidden", !currentlyHidden);
    };

    // Listen for IPC events from main process
    window.electronAPI.onToggleBars(toggleBars);

    window.electronAPI.openNewTab((url) => {
        tabManager.createTab(url);
    });

    // Optional: Keep local hotkey for non-webview areas
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === "H") {
            e.preventDefault();
            toggleBars();
        }
    });
});

