import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import { store } from 'loama-app'
import { listWebIdPodUrls } from 'loama-common'
import HeaderLayout from '@/components/layouts/HeaderLayout.vue'
import { useControllerStore } from '@/stores/useControllerStore'
import AccessGrant from '@/components/access-grants/AccessGrant.vue'
import { trustflowsAuth, trustflowsFetch } from '@/lib/trustflowsAuth'

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
                    path: `/access-requests/`,
                    name: 'access-requests',
                    component: AccessGrant
                },
                {
                    path: '/access-grants/',
                    redirect: { name: 'access-requests' }
                }
            ]
        }
    ]
})

router.beforeEach(async (to) => {
    // don't move this call to outside this function, as this function is only ran after app.use pinia has had the change to run
    const controllerStore = useControllerStore();

    const handledRedirect = await trustflowsAuth.handleIncomingRedirect()
    const isLoggedIn = await trustflowsAuth.isLoggedIn()

    if (handledRedirect || (isLoggedIn && !store.usedPod)) {
        if (trustflowsAuth.webId) {
            // Default to the first pod
            const currentPodUrl = (await listWebIdPodUrls(trustflowsAuth.webId, trustflowsFetch))[0]
            await controllerStore.current.setPodUrl(currentPodUrl);
            store.setUsedPod(currentPodUrl)
        }
    }

    if (handledRedirect) {
        const { code, state, iss, ...query } = to.query

        return {
            path: to.path,
            query,
            hash: to.hash,
            replace: true
        }
    }

    if (!isLoggedIn && to.name !== 'login') {
        return { name: 'login', query: { "next": to.name?.toString() } }
    }
})

export default router
