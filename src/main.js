import { createApp } from 'vue'
import App from './App.vue'
import FileSearch from './FileSearch.vue'
import './tailwind.css'
import '../styles.css'

/* 파일 검색은 해시에 검색 조건을 쿼리로 싣는다(#file-search?q=...),
   그래서 정확 일치가 아니라 접두어로 판별해야 한다 */
const root = location.hash.startsWith('#file-search') ? FileSearch : App
createApp(root).mount('#app')
