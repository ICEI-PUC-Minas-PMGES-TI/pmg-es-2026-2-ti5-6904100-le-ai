import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import { initializeSession } from './session'
import './styles.css'

// Antes do mount, não dentro de App.vue: a guarda de rota (router/index.ts) lê getToken() na
// primeira navegação, que pode resolver antes do onMounted de App.vue rodar. initializeSession
// é síncrona (só lê localStorage), então isto garante a sessão já restaurada quando a guarda
// avaliar a rota inicial.
initializeSession()

createApp(App).use(router).mount('#app')
