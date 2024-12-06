<template>
    <div class="container" v-if="podStore.selectedEntry">
        <header>
            <ExplorerEntity :is-container="podStore.selectedEntry.isContainer">
                {{ podStore.selectedEntry.name }}
            </ExplorerEntity>
            <div class="header-actions">
                <PhEye :size="40" class="clickable" @click="() => contentDrawerVisible = true" />
                <PhXCircle :size="40" @click="$emit('close')" class="clickable" />
            </div>
        </header>
        <section>
            <div class="list-header">
                <h3>Subjects with permissions:</h3>
                <LoButton :left-icon="PhPencil" @click="() => permissionDrawerVisible = true">Edit</LoButton>
            </div>
            <ul>
                <li :key="activeController.getLabelForSubject(permission.subject)"
                    v-for="permission in podStore.selectedEntry.permissionsPerSubject">
                    {{ activeController.getLabelForSubject(permission.subject) }}
                </li>
            </ul>
        </section>
        <Drawer v-model:visible="permissionDrawerVisible" header="Edit permissions" position="right"
            class="permission-drawer">
            <SubjectPermissionTable />
        </Drawer>
        <Drawer v-model:visible="contentDrawerVisible" header="View content" position="right" class="content-drawer">
            <div class="editor" ref="editorElement">
            </div>
        </Drawer>
    </div>
    <p v-else>No entry selected in the resource explorer, this shouldn't be possible!</p>
</template>

<script setup lang="ts">
import { usePodStore } from '@/lib/state';
import ExplorerEntity from './ExplorerEntity.vue';
import { PhEye, PhPencil, PhXCircle } from '@phosphor-icons/vue';
import { activeController } from 'loama-controller';
import LoButton from '../LoButton.vue';
import { ref, shallowRef, watch } from 'vue';
import Drawer from 'primevue/drawer';
import SubjectPermissionTable from './SubjectPermissionTable.vue';
import '@/lib/monacoUserWorker'
import * as monaco from 'monaco-editor';
import { getDefaultSession } from '@inrupt/solid-client-authn-browser';
import { getFile } from '@inrupt/solid-client';

const podStore = usePodStore();

defineEmits<{ close: [] }>()

const permissionDrawerVisible = ref(false);
const contentDrawerVisible = ref(false);
const editorElement = ref<HTMLElement | null>(null);
const editor = shallowRef<monaco.editor.IStandaloneCodeEditor | null>(null);

watch(editorElement, async () => {
    if (!editorElement.value) {
        editor.value?.dispose();
        return;
    };
    if (!podStore.selectedEntry?.resourceUrl) return;

    const resourceFile = await getFile(
        podStore.selectedEntry?.resourceUrl,
        { fetch: getDefaultSession().fetch }
    );

    editor.value = monaco.editor.create(editorElement.value, {
        value: await resourceFile.text(),
        readOnly: true,
    });

})

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

.list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-actions {
    display: flex;
    justify-content: space-between;
    gap: .5rem;
    align-items: center;
}

.editor {
    height: 100%;
}
</style>
<style>
.permission-drawer {
    width: 90vw !important;
}

.content-drawer {
    width: 70vw !important;
}
</style>
