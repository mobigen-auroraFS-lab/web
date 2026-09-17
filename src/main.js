import { createApp } from 'vue'
import App from './App.vue'
import ProductApp from './ProductApp.vue'
import './tailwind.css'
import '../styles.css'

const root = location.hash === '#file-search' ? ProductApp : App
createApp(root).mount('#app')
