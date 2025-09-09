<script setup lang="ts">
import { v4 as uuid } from 'uuid';
import { ref } from 'vue';
import { acceptedRequest, type AccessRequest, deniedRequest, request } from '@/lib/utils';
import AccessRequestEntry from './AccessRequestEntry.vue';

const accessRequests = ref([request, acceptedRequest, deniedRequest]);

const accessRequestParams = ref({
  uid: '',
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
  accessRequestParams.value = { uid: '', target: '', action: '' };
  mode.value = 'list';
  errors.value = { target: false, action: false };
};

const addAccessRequest = () => {
  if (!validate()) return;

  const newAccessRequest: AccessRequest = {
    uid: uuid(),
    target: accessRequestParams.value.target,
    action: accessRequestParams.value.action,
    requestingParty: 'https://solidweb.me/profile/card#me',
    status: 'ex:requested',
  };

  accessRequests.value.push(newAccessRequest);
  clear();
};
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
        </select>

        <div class="actions">
          <button class="primary" @click.prevent="addAccessRequest">request access</button>
          <button class="secondary" @click.prevent="clear">cancel</button>
        </div>
      </div>

      <div v-else key="list" class="card">
        <h2>Your access requests</h2>
        <AccessRequestEntry
          v-for="request in accessRequests"
          :request="request"
          :key="request.uid"
        />
        <div class="actions">
          <button class="primary" @click.prevent="mode = 'create'">new request</button>
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

h2 {
  color: var(--solid-purple);
  font-weight: 700;
  font-size: 1.25rem;
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

/* Buttons */
button {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: var(--base-corner);
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

button.primary {
  background-color: var(--solid-purple);
  color: white;
}
button.primary:hover {
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
