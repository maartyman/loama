<script setup lang="ts">
import { ref } from 'vue';
import { acceptedRequest, deniedRequest, request } from '@/lib/utils';
import AccessRequestEntry from '../access-requests/AccessRequestEntry.vue'

const accessRequests = ref([request, acceptedRequest, deniedRequest]);

function updateStatus(uid: string, status: 'ex:accepted' | 'ex:denied') {
  const req = accessRequests.value.find(r => r.uid === uid);
  if (req) {
    req.status = status;
  }
}
</script>

<template>
  <div class="container">
    <div class="card">
      <h2>Incoming access requests</h2>
      <div 
        v-for="request in accessRequests" 
        :key="request.uid" 
        class="access-request-item"
      >
        <AccessRequestEntry :request="request" />
        <div class="actions">
          <button 
            class="accept" 
            @click="updateStatus(request.uid, 'ex:accepted')"
          >
            Accept
          </button>
          <button 
            class="deny" 
            @click="updateStatus(request.uid, 'ex:denied')"
          >
            Deny
          </button>
        </div>
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

h2 {
  color: var(--solid-purple);
  font-weight: 700;
  font-size: 1.25rem;
}

/* Each request entry */
.access-request-item {
  display: flex;
  justify-content: space-between; /* puts actions at the side */
  align-items: center;
  gap: 1rem;
}

.access-request-item > :first-child {
  flex: 1; /* let entry expand, keep actions compact */
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

button.accept {
  background-color: #3cc46c;
  color: white;
}
button.accept:hover {
  background-color: #2fa158;
}

button.deny {
  background-color: #e74c3c;
  color: white;
}
button.deny:hover {
  background-color: #c0392b;
}
</style>
