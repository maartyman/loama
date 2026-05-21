<template>
    <div class="container" v-if="podStore.selectedEntry">
        <header>
            <ExplorerEntity :is-container="podStore.selectedEntry.isContainer">
                {{ podStore.selectedEntry.name }}
            </ExplorerEntity>
            <PhXCircle :size="40" @click="$emit('close')" class="clickable" />
        </header>
        <section class="entry-info">
            <div class="list-header">
                <h3>Subjects with permissions:</h3>
                <div class="list-actions">
                    <LoButton :left-icon="PhPencil" @click="() => permissionDrawerVisible = true">Edit</LoButton>
                    <LoButton :left-icon="PhGlobe" :disabled="isMakingPublic" @click="makeSelectedEntryPublic">
                        Make public
                    </LoButton>
                    <LoButton :left-icon="PhEye" @click="watchSelectedResource">
                        Watch resource
                    </LoButton>
                </div>
            </div>
            <div class="access-request-switch">
                <ToggleSwitch :modelValue="podStore.selectedEntry.canRequestAccess"
                    @update:modelValue="handleSubjectRequestAccess" />
                <span>Can people ask access to this resource?</span>
            </div>
            <p>Subjects with access:</p>
            <ul data-testid="sidepanel-permission-list">
                <li :key="controllerStore.currentController.getLabelForSubject(permission.subject)"
                    v-for="permission in podStore.selectedEntry.permissionsPerSubject">
                    {{ controllerStore.currentController.getLabelForSubject(permission.subject) }}
                </li>
            </ul>
        </section>
        <Drawer v-model:visible="permissionDrawerVisible" header="Edit permissions" position="right"
            class="permission-drawer">
            <SubjectPermissionTable />
        </Drawer>
    </div>
    <p v-else>No entry selected in the resource explorer, this shouldn't be possible!</p>
</template>

<script setup lang="ts">
import { usePodStore } from '@/lib/state';
import ExplorerEntity from './ExplorerEntity.vue';
import { PhEye, PhGlobe, PhPencil, PhXCircle } from '@phosphor-icons/vue';
import LoButton from '../LoButton.vue';
import { ref } from 'vue';
import Drawer from 'primevue/drawer';
import SubjectPermissionTable from './SubjectPermissionTable.vue';
import ToggleSwitch from 'primevue/toggleswitch';
import { useControllerStore } from '@/stores/useControllerStore';
import { Permission } from 'loama-controller';
import { useToast } from 'primevue/usetoast';

const podStore = usePodStore();
const controllerStore = useControllerStore();
const toast = useToast();

defineEmits<{ close: [] }>()

const permissionDrawerVisible = ref(false);
const isMakingPublic = ref(false);

const handleSubjectRequestAccess = (canRequest: boolean) => {
    if (!podStore.selectedEntry) {
        throw new Error('No entry selected, this should not be possible');
    }
    if (canRequest) {
        controllerStore.currentController.AccessRequest().allowAccessRequest(podStore.selectedEntry.resourceUrl)
    } else {
        controllerStore.currentController.AccessRequest().disallowAccessRequest(podStore.selectedEntry.resourceUrl)
    }

    podStore.refreshRequestAccessAllowance(controllerStore.currentController);
}

const makeSelectedEntryPublic = async () => {
    if (!podStore.selectedEntry) {
        throw new Error('No entry selected, this should not be possible');
    }

    try {
        isMakingPublic.value = true;
        await controllerStore.currentController.addPermission(podStore.selectedEntry.resourceUrl, Permission.Read, {
            type: 'public'
        });
        await podStore.refreshEntryPermissions(controllerStore.currentController);
        toast.add({ severity: 'success', summary: 'Resource is public', detail: 'Public read access was granted.', life: 2000 });
    } catch (error) {
        console.error('Failed to make resource public', error);
        toast.add({
            severity: 'error',
            summary: 'Failed to make public',
            detail: error instanceof Error ? error.message : 'Unknown error occurred',
        });
    } finally {
        isMakingPublic.value = false;
    }
}

const watchSelectedResource = () => {
    if (!podStore.selectedEntry) {
        throw new Error('No entry selected, this should not be possible');
    }

    window.open(podStore.selectedEntry.resourceUrl, '_blank', 'noopener,noreferrer');
}
</script>

<style scoped>
form {
    margin-top: calc(var(--base-unit) * 2);
}

section {
    background-color: var(--off-white);
    border-radius: var(--base-corner);
    height: 100%;
    padding: 2rem;
}

header {
    display: flex;
    color: var(--off-white);
    flex-grow: 1;
    padding: 2rem;
}

h3 {
    font-size: calc(var(--base-unit) * 2);
}

a {
    text-decoration: none;
}

.clickable {
    cursor: pointer;
}

.container {
    background-color: var(--solid-purple);
}

.entry-info>* {
    margin: .5rem auto;
}

.list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.list-actions {
    display: flex;
    gap: .5rem;
}

.access-request-switch {
    display: flex;
    flex-direction: row;
    gap: .5rem;
}
</style>
<style>
.permission-drawer {
    width: 90vw !important;
}
</style>
