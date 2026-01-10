import { createApp } from "vue"
import App from "./App.vue"
import pinia from "./stores"

// Import styles
import "./styles/themes.css"
import "./styles/main.css"
import "./styles/cartoon.css"
import "./styles/animations.css"

const app = createApp(App)

app.use(pinia)

app.mount("#app")

// Initialize theme after app is mounted
import { useThemeStore } from "./stores/theme"
const themeStore = useThemeStore()
themeStore.initTheme()

// Load settings (including theme color)
import { useSettingsStore } from "./stores/settings"
const settingsStore = useSettingsStore()
settingsStore.loadSettings()

// 禁用右键菜单
window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});
