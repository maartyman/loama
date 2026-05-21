<template>
  <aside>
    <span>{{ store.usedPod }}</span>
    <div>
      <label for="pod">Selected Pod</label>
      <select v-model="selectedPod">
        <option v-for="pod in pods" :key="pod" :value="pod">{{ pod }}</option>
      </select>
    </div>
    <div>
      <label for="authorization-server-url">Select your Authorization Server</label>
      <input
        id="authorization-server-url"
        v-model.lazy.trim="authorizationServerURL"
        placeholder="Enter your AS's URL"
        @change="updateController"
      />
    </div>
    <div>
      <label for="authorization-server-type">Select the type of your Authorization Server</label>
      <select v-model="authorizationServerType" @change="updateController">
        <option v-for="type of types" :key="type">{{ type }}</option>
      </select>
    </div>

    <div>
      <button @click="updateController">Change Controller</button>
    </div>

    <a @click.prevent="logout">
      <PhSignOut />
      <span>Sign out</span>
    </a>
  </aside>
</template>

<script setup lang="ts">
import router from '@/router'
import { store } from 'loama-app'
import { PhSignOut } from '@phosphor-icons/vue'
import { listWebIdPodUrls } from 'loama-common'
import { useControllerStore } from '@/stores/useControllerStore'
import { computed, ref, watch } from 'vue'
import { getRedirectUrl, trustflowsAuth, trustflowsFetch } from '@/lib/trustflowsAuth'

const pods = trustflowsAuth.webId ? await listWebIdPodUrls(trustflowsAuth.webId, trustflowsFetch) : []
const controllerStore = useControllerStore()
const types = computed(() => Array.from(controllerStore.types))

const selectedPod = ref(store.usedPod || pods[0] || '')
const authorizationServerURL = ref(controllerStore.authorizationServerURL)
const authorizationServerType = ref(controllerStore.currentControllerType)
const lastDiscoveredAuthorizationServer = ref<string | null>(
  controllerStore.manuallyConfigured ? null : controllerStore.authorizationServerURL
)

if (selectedPod.value) {
  await setPod(selectedPod.value, { shouldDiscoverAuthorizationServer: false })
}

watch(selectedPod, async (nextPod, previousPod) => {
  if (!nextPod || nextPod === previousPod) return
  await setPod(nextPod)
})

async function setPod(
  podUrl: string,
  { shouldDiscoverAuthorizationServer = true }: { shouldDiscoverAuthorizationServer?: boolean } = {}
) {
  store.setUsedPod(podUrl)
  if (controllerStore.currentController) {
    await controllerStore.currentController.setPodUrl(podUrl)
  }
  if (!shouldDiscoverAuthorizationServer || controllerStore.manuallyConfigured) {
    return
  }
  const discoveredAuthorizationServer = await discoverAuthorizationServer(podUrl)
  if (discoveredAuthorizationServer) {
    const shouldUseDiscoveredAuthorizationServer =
      !controllerStore.manuallyConfigured ||
      !authorizationServerURL.value ||
      authorizationServerURL.value === lastDiscoveredAuthorizationServer.value

    lastDiscoveredAuthorizationServer.value = discoveredAuthorizationServer

    if (shouldUseDiscoveredAuthorizationServer) {
      authorizationServerURL.value = discoveredAuthorizationServer
    }

    if (
      shouldUseDiscoveredAuthorizationServer &&
      discoveredAuthorizationServer !== controllerStore.authorizationServerURL
    ) {
      controllerStore.autoConfigureController(
        authorizationServerType.value,
        discoveredAuthorizationServer
      )
      if (controllerStore.currentController) {
        await controllerStore.currentController.setPodUrl(podUrl)
      }
    }
  }
}

function parseAuthorizationServerUrl(authenticateHeader: string): string | null {
  const quotedAsUri = authenticateHeader.match(/as_uri\s*=\s*"([^"]+)"/i)
  if (quotedAsUri?.[1]) return quotedAsUri[1]
  const unquotedAsUri = authenticateHeader.match(/as_uri\s*=\s*([^,\s]+)/i)
  if (unquotedAsUri?.[1]) return unquotedAsUri[1]
  const anyUrl = authenticateHeader.match(/https?:\/\/[^\s,"]+/i)
  return anyUrl?.[0] ?? null
}

async function discoverAuthorizationServer(podUrl: string): Promise<string | null> {
  try {
    const response = await fetch(podUrl, { method: 'GET', credentials: 'omit' })
    const authenticateHeader =
      response.headers.get('www-authenticate') ?? response.headers.get('authorization')
    if (!authenticateHeader) return null
    return parseAuthorizationServerUrl(authenticateHeader)
  } catch (error) {
    return null
  }
}

async function updateController() {
  const nextAuthorizationServerURL = authorizationServerURL.value.trim()
  if (!nextAuthorizationServerURL) {
    authorizationServerURL.value = controllerStore.authorizationServerURL
    return
  }

  authorizationServerURL.value = nextAuthorizationServerURL
  controllerStore.changeController(authorizationServerType.value, nextAuthorizationServerURL)
  if (store.usedPod && controllerStore.currentController) {
    await controllerStore.currentController.setPodUrl(store.usedPod)
  }
}

async function logout() {
  if (controllerStore.current) controllerStore.current.unsetPodUrl('')
  await trustflowsAuth.logout(getRedirectUrl(''))
  router.push('/')
}
</script>

<style lang="css" scoped>
aside {
  z-index: 10;
  border-radius: 0.5rem;
  display: flex;
  flex-flow: column nowrap;
  border: 0.25rem solid var(--solid-purple);
  background-color: var(--off-white);
}

aside > div {
  padding: var(--base-unit);
}

label {
  color: var(--off-black);
  font-weight: 700;
  display: block;
}

select,
input {
  margin-bottom: var(--base-unit);
}

aside > span {
  background-color: var(--solid-purple);
  color: var(--off-white);
  font-family: Raleway;
  font-style: normal;
  font-weight: 700;
  line-height: normal;
  padding: var(--base-unit);
  margin-bottom: var(--base-unit);
}

a {
  display: flex;
  flex-flow: row nowrap;
  background-color: var(--lama-gray);
  padding: var(--base-unit);
  gap: var(--base-unit);
  align-items: center;
  font-style: normal;
  font-weight: 700;
}
</style>
