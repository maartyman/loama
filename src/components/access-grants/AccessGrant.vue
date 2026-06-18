<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import AccessRequestEntry from '../access-requests/AccessRequestEntry.vue';
import type { AccessRequest } from 'loama-controller';
import { useControllerStore } from '@/stores/useControllerStore';
import { buildAssetLabelMap } from '@/lib/assetTree';

const controllerStore = useControllerStore();
const accessRequests: Ref<AccessRequest[]> = ref([]);
const resourceLabels: Ref<Map<string, string>> = ref(new Map());

const updateStatus = async (requestID: string, status: 'accepted' | 'denied') => {
  await controllerStore.current.handleAccessRequest(requestID, status);
  accessRequests.value = accessRequests.value.map((request) =>
    request.uid === requestID ? { ...request, status } : request
  );
};

const fetchAccessRequests = async (onlyRequested = false) => {
  const requests = (await controllerStore.current.getAccessRequests()).asResourceOwner;
  accessRequests.value = onlyRequested ? requests.filter(isRequested) : requests;

  try {
    const assets = await controllerStore.current.getManageableAssets({
      include: ['description', 'scopes', 'policy_uri']
    });
    resourceLabels.value = buildAssetLabelMap(assets);
  } catch (error) {
    console.error('Failed to load manageable asset names for access requests', error);
  }
};

const statusLabel = (request: AccessRequest) => request.status.split(':').pop();
const statusClass = (request: AccessRequest) => request.status.toLowerCase();
const isRequested = (request: AccessRequest) => statusClass(request).includes('requested');
const targetName = (request: AccessRequest) => resourceLabels.value.get(request.target) ?? request.target;

let interval: NodeJS.Timeout;

onMounted(async () => {
  await fetchAccessRequests(true);
  interval = setInterval(fetchAccessRequests, 10 ** 4);
});

onBeforeUnmount(() => {
  clearInterval(interval);
  accessRequests.value = accessRequests.value.filter(isRequested);
});
</script>

<template>
  <div class="container">
    <div class="card header-card">
      <h2>Incoming access requests</h2>
      <button @click="fetchAccessRequests()" class="refresh-button">refresh</button>
    </div>

    <div class="card">
      <div v-if="accessRequests.length" class="access-request-list">
        <div
          v-for="request in accessRequests"
          :key="request.uid"
          class="access-request-item"
        >
          <AccessRequestEntry :request="request" :target-name="targetName(request)" :show-status="false">
            <div v-if="isRequested(request)" class="actions">
              <button class="accept" @click="updateStatus(request.uid, 'accepted')">
                Accept
              </button>
              <button class="deny" @click="updateStatus(request.uid, 'denied')">Deny</button>
            </div>
            <span
              v-else
              class="status-badge"
              :class="{
                accepted: statusClass(request).includes('accepted'),
                denied: statusClass(request).includes('denied'),
              }"
            >
              {{ statusLabel(request) }}
            </span>
          </AccessRequestEntry>
        </div>
      </div>
      <div v-else class="no-requests-message">
        No access requests at the moment.
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
  background-color: var(--off-white);
  min-height: calc(100vh - var(--base-unit) * 14);
}

/* Shared card style */
.card {
  background-color: white;
  padding: 1.5rem;
  border-radius: var(--base-corner);
  box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.header-card {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

h2 {
  color: var(--solid-purple);
  font-weight: 700;
  font-size: 1.25rem;
  margin: 0;
}

/* Each request entry */
.access-request-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.access-request-item {
  padding: 0.5rem 0;
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0; /* prevent buttons from squishing */
}

/* Buttons */
button {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: var(--base-corner);
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.refresh-button {
  background-color: var(--lama-gray);
  color: var(--off-black);
}
.refresh-button:hover {
  background-color: #bfbfbf;
}

button.accept {
  background-color: #d4edda;
  color: #155724;
}
button.accept:hover {
  background-color: #c2e0c9;
}

button.deny {
  background-color: #f8d7da;
  color: #721c24;
}
button.deny:hover {
  background-color: #f5c6cb;
}

.status-badge {
  padding: 0.6rem 1rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
}

.status-badge.accepted {
  background-color: #d4edda;
  color: #155724;
}

.status-badge.denied {
  background-color: #f8d7da;
  color: #721c24;
}

.no-requests-message {
  color: var(--off-black);
  font-style: italic;
  text-align: center;
  padding: 1rem;
}
</style>
