<template>
    <Suspense>
        <HeaderBase>
            <HeaderTab class="header-tab" href="/home/" tooltip="manage your resources" active>Resources</HeaderTab>
            <HeaderTab class="header-tab" href="/access-requests/" tooltip="manage incoming access requests and grant access to your resources" active>Access Requests</HeaderTab>
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
