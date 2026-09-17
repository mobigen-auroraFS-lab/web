import { createApp } from 'vue'
import App from './App.vue'
import FileSearch from './pages/FileSearch/FileSearch.vue'
import './tailwind.css'
import '../styles.css'

const root = location.hash === '#file-search' ? FileSearch : App
createApp(root).mount('#app')
