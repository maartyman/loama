<template>
  <RouterLink :to="href" active-class="active" class="tooltip">
    <slot />
    <span class="tooltip-text">{{ tooltip }}</span>
  </RouterLink>
</template>

<script setup lang="ts">
defineProps<{
  href: string
  tooltip?: string
}>()
</script>

<style scoped>
a {
  background-color: var(--lama-gray);
  color: var(--off-black);
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 700;
  font-size: calc(var(--base-unit) * 3);
  min-height: calc(var(--base-unit) * 8);
  border-radius: var(--base-corner) var(--base-corner) 0 0;
  min-width: calc(var(--base-unit) * 15);
  padding: 0 calc(var(--base-unit) * 3);
  text-decoration: none;
  position: relative;
}

.active {
  background-color: var(--solid-purple);
  color: var(--off-white);
}

.tooltip-text {
  visibility: hidden;
  opacity: 0;
  background-color: var(--off-black);
  color: var(--off-white);
  text-align: center;
  font-size: calc(var(--base-unit) * 2);
  padding: calc(var(--base-unit) * 0.5) calc(var(--base-unit) * 1.5);
  border-radius: var(--base-corner);
  position: absolute;
  top: 110%;
  left: 50%;
  transform: translateX(-50%);
  transition: opacity 0.2s ease-in-out;
  white-space: nowrap;
  z-index: 10;
}

a:hover .tooltip-text {
  visibility: visible;
  opacity: 1;
}
</style>
