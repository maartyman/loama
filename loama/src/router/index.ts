import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import RequestView from '@/views/RequestView.vue'
import { store } from 'loama-app'
import { listPodUrls } from 'loama-common'
import HeaderLayout from '@/components/layouts/HeaderLayout.vue'
import InboxView from '@/views/InboxView.vue'
import { useControllerStore } from '@/stores/useControllerStore'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: `/`,
            name: 'login',
            component: LoginView
        },
        {
            path: "/",
            component: HeaderLayout,
            children: [
                {
                    path: `/home/:filePath(.*)`,
                    name: 'home',
                    component: HomeView
                },
                {
                    path: "/request",
                    name: "request",
                    component: RequestView,
                },
                {
                    path: "/inbox",
                    name: "inbox",
                    component: InboxView,
                }
            ]
        }
    ]
})

router.beforeEach(async (to) => {
    // don't move this call to outside this function, as this function is only ran after app.use pinia has had the change to run
    const controllerStore = useControllerStore();

    if (!store.session.info.isLoggedIn) {
        await store.session.handleIncomingRedirect({
            restorePreviousSession: true,
        })
        if (store.session.info.isLoggedIn) {
            // Default to the first pod
            const currentPodUrl = (await listPodUrls(store.session))[0]
            await controllerStore.current.setPodUrl(currentPodUrl);
            store.setUsedPod(currentPodUrl)
        }
        if (!store.session.info.isLoggedIn && to.name !== 'login') {
            return { name: 'login', query: { "next": to.name?.toString() } }
        }
    }
})

export default router
