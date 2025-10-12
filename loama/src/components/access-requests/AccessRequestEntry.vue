<script setup lang="ts">
import type { AccessRequest } from 'loama-controller';

const props = withDefaults(defineProps<{
  request: AccessRequest,
  showId?: boolean
}>(), {
  showId: true
});

</script>

<template>
  <div class="access-request-entry">
    <div class="request-info">
      <a :href="props.request.uid" target="_blank" class="request-uid">
          {{ props.request.uid }}
      </a>
      <template v-if="props.showId">
        <div class="requesting-party">
          <span class="label">by:</span>
          <span class="value">{{ props.request.requestingParty }}</span>
        </div>
      </template>

      <div class="request-details">
        <span class="label">target:</span>
        <span class="value">{{ props.request.target }}</span>
        <span class="label">action:</span>
        <span class="value action">{{ props.request.action }}</span>
      </div>
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
  background-color: var(--off-white);
  gap: 1rem;
}

.request-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-width: 70%;
}

.request-uid {
  color: var(--solid-purple);
  font-weight: 600;
  text-decoration: none;
  word-break: break-all;
}
.request-uid:hover {
  text-decoration: underline;
}

.requesting-party {
  font-size: 0.95rem;
  color: var(--off-black);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.request-details {
  font-size: 0.95rem;
  color: var(--off-black);
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.request-details .label,
.requesting-party .label {
  font-weight: 600;
  color: var(--solid-purple);
}

.request-details .value,
.requesting-party .value {
  font-family: monospace;
  color: var(--off-black);
}

.request-details .action {
  text-transform: uppercase;
  background-color: var(--off-white);
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.9rem;
}

.status-badge {
  padding: 0.6rem 1rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
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
