<script setup lang="ts">
import { ref } from 'vue';
import { acceptedRequest, deniedRequest, request, type AccessRequest } from '../access-requests/util';
import AccessRequestEntry from '../access-requests/AccessRequestEntry.vue'

// Pretend we receive these from somewhere (props or an API)


const accessRequests = ref([request, acceptedRequest, deniedRequest]);

function updateStatus(uid: string, status: 'ex:accepted' | 'ex:denied') {
  const req = accessRequests.value.find(r => r.uid === uid);
  if (req) {
    req.status = status;
  }
}
</script>

<template>
  <div class="access-requests-container">
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
</template>

<style scoped>
.access-requests-container {
  background-color: white;
  padding: 1.5rem;
  border-radius: var(--base-corner);
  box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.access-requests-container h2 {
  color: var(--solid-purple);
  font-weight: 700;
}

.access-request-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 0.125rem solid var(--lama-gray);
  border-radius: calc(var(--base-corner) - 2px);
  padding: 1rem;
  background-color: var(--off-white);
  gap: 1rem; /* spacing between entry and buttons */
}

.access-request-item > :first-child {
  flex: 1; /* let AccessRequestEntry take all remaining width */
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0; /* don’t let buttons squish */
}

button.accept {
  padding: 0.5rem 1rem;
  background-color: #3cc46c;
  color: white;
  border: none;
  border-radius: var(--base-corner);
  cursor: pointer;
  font-weight: 600;
}

button.accept:hover {
  background-color: #2fa158;
}

button.deny {
  padding: 0.5rem 1rem;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: var(--base-corner);
  cursor: pointer;
  font-weight: 600;
}

button.deny:hover {
  background-color: #c0392b;
}
</style>
