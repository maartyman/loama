<script setup lang="ts">
import type { AccessRequest } from './util';

const props = defineProps<{
    request: AccessRequest
}>();
</script>

<template>
  <div class="access-request-entry">
    <div class="request-info">
      <a :href="props.request.uid" target="_blank" class="request-uid">
        {{ props.request.uid }}
      </a>
      <p class="request-target">Target: {{ props.request.target }}</p>
    </div>
    <span 
      class="status-badge" 
      :class="{
        requested: props.request.status.includes('requested'),
        accepted: props.request.status.includes('accepted'),
        denied: props.request.status.includes('denied'),
      }"
    >
      {{ props.request.status.split(':').pop() }}
    </span>
  </div>
</template>

<style scoped>
.access-request-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 0.125rem solid var(--lama-gray);
  border-radius: var(--base-corner);
  background-color: white;
  margin-bottom: 0.75rem;
}

.request-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.request-uid {
  color: var(--solid-purple);
  font-weight: 600;
  text-decoration: none;
}

.request-uid:hover {
  text-decoration: underline;
}

.request-target {
  font-size: calc(var(--base-unit)*2);
  color: var(--off-black);
}

.status-badge {
  padding: 0.6rem 1rem;
  border-radius: 0.5rem; /* less round */
  font-size: 1.1rem;     /* larger text */
  font-weight: 700;
  text-transform: capitalize;
}

.status-badge.requested {
  background-color: #fff3cd;
  color: #856404;
}

.status-badge.accepted {
  background-color: #d4edda;
  color: #155724;
}

.status-badge.denied {
  background-color: #f8d7da;
  color: #721c24;
}
</style>
