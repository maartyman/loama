<template>
    <div class="panel-container">
        <div class="left-panel">
            <div class="explorer-header">
                <h2>Resources</h2>
                <Button @click="refresh">Refresh</Button>
            </div>

            <div v-if="errorMessage" class="error-message">
                {{ errorMessage }}
            </div>

            <div class="tree">
                <div
                    v-for="node in visibleNodes"
                    :key="node.id"
                    :class="['tree-row', { selected: node.targetId && podStore.selectedEntry?.resourceUrl === node.targetId }]"
                    :style="{ paddingLeft: `${node.depth * 1.25 + 0.75}rem` }"
                    @click="selectNode(node)"
                >
                    <button
                        v-if="node.isContainer"
                        class="icon-button"
                        :aria-label="node.isExpanded ? 'Close folder' : 'Open folder'"
                        @click.stop="toggleNode(node)"
                    >
                        <PhCaretDown v-if="node.isExpanded" />
                        <PhCaretRight v-else />
                    </button>
                    <span v-else class="icon-spacer"></span>

                    <PhFolderOpen v-if="node.isContainer && node.isExpanded" class="resource-icon" />
                    <PhFolder v-else-if="node.isContainer" class="resource-icon" />
                    <PhFile v-else class="resource-icon" />

                    <span class="resource-name" :title="node.url">{{ node.label }}</span>
                    <span v-if="node.isLoading" class="loading-label">loading</span>
                </div>
            </div>
        </div>
        <div class="right-panel">
            <div class="default-panel-container" v-if="!podStore.selectedEntry">
                <div class="default-panel">
                    <img class="side-image" src="/vault.svg" />
                    <p><strong>No resource selected!</strong></p>
                    <i>Select one to get started</i>
                </div>
            </div>
            <SelectedEntry v-else @close="() => changeSelectedEntry(null)" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { PhCaretDown, PhCaretRight, PhFile, PhFolder, PhFolderOpen } from '@phosphor-icons/vue';
import Button from 'primevue/button';
import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue';
import type { ResourceOwnerAsset, ResourcePermissions, PublicSubject, WebIdSubject } from 'loama-controller';
import type { Entry } from "@/lib/types";
import { usePodStore } from '@/lib/state';
import SelectedEntry from './SelectedEntry.vue';
import { useControllerStore } from '@/stores/useControllerStore';
import {
    buildAssetTree,
    flattenVisibleAssetTree,
    type AssetTreeNode
} from '@/lib/assetTree';

const podStore = usePodStore();
const controllerStore = useControllerStore();
const rootNodes: Ref<AssetTreeNode[]> = ref([]);
const assets: Ref<ResourceOwnerAsset[]> = ref([]);
const errorMessage = ref('');
let stopWatchingAssets: (() => void) | null = null;

const visibleNodes = computed(() => flattenVisibleAssetTree(rootNodes.value));

const changeSelectedEntry = (entry: Entry | null) => podStore.selectedEntry = entry;

const refresh = async () => {
    errorMessage.value = '';
    podStore.selectedEntry = null;

    try {
        const assets = await controllerStore.current.getManageableAssets({
            include: ['description', 'scopes', 'policy_uri']
        });
        setAssets(assets);
        startAssetWatcher();
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : 'Failed to load manageable assets';
    }
};

const startAssetWatcher = () => {
    stopWatchingAssets?.();
    stopWatchingAssets = controllerStore.current.watchManageableAssets((event) => {
        if (event.type === 'snapshot') {
            setAssets(event.assets);
        } else if (event.type === 'asset-created' || event.type === 'asset-updated') {
            upsertAsset(event.asset);
        } else if (event.type === 'asset-deleted') {
            removeAsset(event.asset._id);
        }
    }, {
        include: ['description', 'scopes', 'policy_uri']
    });
};

const toggleNode = (node: AssetTreeNode) => {
    if (!node.isContainer) return;
    node.isExpanded = !node.isExpanded;
};

const selectNode = async (node: AssetTreeNode) => {
    if (!node.targetId) return;

    await selectResourceNode(node);
};

const selectResourceNode = async (node: AssetTreeNode) => {
    if (!node.targetId) return;

    try {
        const resourcePermissions = await getResourcePermissions(node.targetId);
        podStore.selectedEntry = {
            isContainer: node.isContainer,
            name: node.label,
            resourceUrl: resourcePermissions.resourceUrl,
            canRequestAccess: resourcePermissions.canRequestAccess,
            permissionsPerSubject: resourcePermissions.permissionsPerSubject
        };
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : `Failed to load permissions for ${node.url}`;
    }
};

const getResourcePermissions = async (url: string): Promise<Entry> => {
    const result = await controllerStore.current.getResourcePermissionList(url) as ResourcePermissions<WebIdSubject | PublicSubject>;

    return {
        isContainer: false,
        name: url,
        ...result
    };
};

const setAssets = (nextAssets: ResourceOwnerAsset[]) => {
    assets.value = nextAssets;
    rootNodes.value = buildAssetTree(nextAssets);
};

const upsertAsset = (asset: ResourceOwnerAsset) => {
    setAssets([
        ...assets.value.filter((currentAsset) => currentAsset._id !== asset._id),
        asset,
    ]);
};

const removeAsset = (assetId: string) => {
    setAssets(assets.value.filter((asset) => asset._id !== assetId));
};

onMounted(refresh);
onUnmounted(() => stopWatchingAssets?.());
</script>

<style scoped>
.side-image {
    margin-bottom: calc(var(--base-unit)*2);
}

strong {
    color: var(--off-black-50, rgba(23, 13, 51, 0.50));
    text-align: center;
    font-size: 16px;
    font-weight: 700;
}

i {
    color: var(--off-black-50, rgba(23, 13, 51, 0.50));
    text-align: center;
    font-size: 16px;
    font-style: italic;
    font-weight: 400;
}

.panel-container {
    display: flex;
    height: calc(100vh - var(--base-unit)*14);
    width: 100%;
}

.left-panel,
.right-panel {
    display: flex;
    height: 100%;
    flex-direction: column;
}

.left-panel {
    flex: 3;
    padding: 2rem 0 0;
    background-color: var(--off-white);
    border-right: 0.25rem solid var(--solid-purple);
    overflow: auto;
}

.right-panel {
    flex: 2;
}

.explorer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0 1.5rem 1.5rem 2rem;
}

h2 {
    color: var(--solid-purple);
    font-size: 1.25rem;
    margin: 0;
}

.tree {
    display: flex;
    flex-direction: column;
}

.tree-row {
    display: grid;
    grid-template-columns: 1.5rem 1.5rem minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    padding-right: 1rem;
    color: var(--off-black);
    cursor: pointer;
}

.tree-row:hover,
.tree-row.selected {
    background-color: var(--lama-gray);
}

.icon-button {
    width: 1.5rem;
    height: 1.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    background-color: transparent;
    color: inherit;
    cursor: pointer;
}

.icon-spacer {
    width: 1.5rem;
}

.resource-icon {
    width: 1.25rem;
    height: 1.25rem;
}

.resource-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 700;
}

.loading-label {
    color: var(--off-black-50, rgba(23, 13, 51, 0.5));
    font-size: 0.8rem;
}

.error-message {
    color: var(--lama-red);
    padding: 0 1.5rem 1rem 2rem;
}

.default-panel-container {
    padding-left: 0.5rem;
    width: 100%;
    height: 100%;
    background-color: var(--lama-gray);
    justify-content: center;
    align-items: center;
    display: flex;
}

.default-panel {
    align-items: center;
    display: flex;
    flex-direction: column;
}
</style>
