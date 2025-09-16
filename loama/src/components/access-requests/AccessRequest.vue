<script setup lang="ts">
import { onMounted, ref, type Ref } from 'vue';
import type { AccessRequest } from 'loama-controller';
import AccessRequestEntry from './AccessRequestEntry.vue';
import { useControllerStore } from '@/stores/useControllerStore';

const controllerStore = useControllerStore();

const accessRequests: Ref<AccessRequest[]> = ref([]);

const accessRequestParams = ref({
  target: '',
  action: '',
});

const mode = ref<'list' | 'create'>('list');

const errors = ref<{ target: boolean; action: boolean }>({
  target: false,
  action: false,
});

const validate = () => {
  errors.value.target = !accessRequestParams.value.target.trim();
  errors.value.action = !accessRequestParams.value.action.trim();
  return !(errors.value.target || errors.value.action);
};

const clear = () => {
  accessRequestParams.value = { target: '', action: '' };
  mode.value = 'list';
  errors.value = { target: false, action: false };
};

const addAccessRequest = async () => {
  if (!validate()) return;
  
  await controllerStore.current.requestAccess({
    action: accessRequestParams.value.action,
    resource: accessRequestParams.value.target
  });

  accessRequests.value = await findAccessRequests();
  mode.value = 'list';
};

const findAccessRequests = async (): Promise<AccessRequest[]> => {
  return (await controllerStore.current.getAccessRequests()).asRequestingParty;
}

onMounted(async () => {
  accessRequests.value = await findAccessRequests();
});
</script>

<template>
  <div class="container">
    <transition name="fade-slide" mode="out-in">
      <div v-if="mode === 'create'" key="create" class="card">
        <h2>Request access</h2>

        <label for="target">What resource do you want to request access to?</label>
        <input
          id="target"
          v-model="accessRequestParams.target"
          placeholder="enter resource url"
          :class="{ error: errors.target }"
        />

        <label for="action">What do you want to do with this resource?</label>
        <select
          id="action"
          v-model="accessRequestParams.action"
          :class="{ error: errors.action }"
        >
          <option value="" disabled>--pick a value--</option>
          <option value="read">read</option>
          <option value="write">write</option>
          <option value="append">append</option>
          <option value="create">create</option>
          <option value="control">control</option>
        </select>

        <div class="actions">
          <button class="primary" @click.prevent="addAccessRequest">request access</button>
          <button class="secondary" @click.prevent="clear">cancel</button>
        </div>
      </div>

      <div v-else key="list" class="requests-list">
        <div class="card header-card">
          <h2>Your access requests</h2>
          <button class="new-request-button" @click.prevent="mode = 'create'">new request</button>
        </div>

        <div class="card">
          <h3>Requested</h3>
          <div v-if="accessRequests.filter(r => r.status.toLowerCase() === 'requested').length">
            <div
              v-for="request in accessRequests.filter(r => r.status.toLowerCase() === 'requested')"
              :key="request.uid"
              class="access-request-item"
            >
              <AccessRequestEntry :request="request" />
            </div>
          </div>
          <div v-else class="no-requests-message">
            No pending requests at the moment.
          </div>
        </div>

        <div class="card">
          <h3>Accepted</h3>
          <div v-if="accessRequests.filter(r => r.status.toLowerCase() === 'accepted').length">
            <div
              v-for="request in accessRequests.filter(r => r.status.toLowerCase() === 'accepted')"
              :key="request.uid"
              class="access-request-item"
            >
              <AccessRequestEntry :request="request" />
            </div>
          </div>
          <div v-else class="no-requests-message">
            No accepted requests.
          </div>
        </div>

        <div class="card">
          <h3>Denied</h3>
          <div v-if="accessRequests.filter(r => r.status.toLowerCase() === 'denied').length">
            <div
              v-for="request in accessRequests.filter(r => r.status.toLowerCase() === 'denied')"
              :key="request.uid"
              class="access-request-item"
            >
              <AccessRequestEntry :request="request" />
            </div>
          </div>
          <div v-else class="no-requests-message">
            No denied requests.
          </div>
        </div>
      </div>
    </transition>
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

h3 {
  color: var(--off-black);
  font-weight: 600;
  font-size: 1.1rem;
  border-bottom: 1px solid var(--lama-gray);
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
}

label {
  font-size: calc(var(--base-unit) * 2);
  font-weight: 500;
  color: var(--off-black);
}

input,
select {
  padding: 0.75rem;
  border: 0.125rem solid var(--lama-gray);
  border-radius: var(--base-corner);
  font-size: calc(var(--base-unit) * 2);
  background-color: var(--off-white);
  transition: border-color 0.2s ease;
}

input:focus,
select:focus {
  border-color: var(--solid-purple);
  outline: none;
}

input.error,
select.error {
  border-color: var(--lama-red);
  background-color: #ffe6e9;
}

/* Each request entry */
.access-request-item {
  padding: 0.5rem 0;
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

button.primary,
.new-request-button {
  background-color: var(--solid-purple);
  color: white;
}
button.primary:hover,
.new-request-button:hover {
  background-color: #6b3be8;
}

button.secondary {
  background-color: var(--lama-gray);
  color: var(--off-black);
}
button.secondary:hover {
  background-color: #bfbfbf;
}

.actions {
  display: flex;
  gap: 1rem;
}

.requests-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.no-requests-message {
  color: var(--off-black);
  font-style: italic;
  text-align: center;
  padding: 1rem;
}

/* Transition styles */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
