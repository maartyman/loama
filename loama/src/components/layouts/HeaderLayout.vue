<template>
    <Suspense>
        <HeaderBase>
            <HeaderTab class="header-tab" href="/home/" active>Resources</HeaderTab>
            <HeaderTab class="header-tab" href="/access-requests/" active>Request Access</HeaderTab>
            <HeaderTab class="header-tab" href="/access-grants/" active>Grant Access</HeaderTab>
        </HeaderBase>
    </Suspense>
    <router-view />
</template>

<script setup lang='ts'>
import HeaderTab from "@/components/header/HeaderTab.vue";
import HeaderBase from '@/components/header/HeaderBase.vue'
</script>

<style scoped>
.header-tab {
    margin: 0 0.5rem 0;
}
</style>
