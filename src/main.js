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
