<script setup lang="ts">
import {
  Permission,
  type IPolicy,
  type PublicSubject,
  type ResourceOwnerAsset,
  type SubjectPermissions,
  type WebIdSubject
} from 'loama-controller';
import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue';
import {
  PhCaretDown,
  PhCaretRight,
  PhFile,
  PhFolder,
  PhFolderOpen,
  PhPlus
} from '@phosphor-icons/vue';
import { useControllerStore } from '@/stores/useControllerStore';
import {
  buildAssetTree,
  findFirstAssetNode,
  flattenVisibleAssetTree,
  type AssetTreeNode
} from '@/lib/assetTree';

type PolicyRuleRow = IPolicy['rules'][number] & { policyId: string };

const controllerStore = useControllerStore();

const policies: Ref<IPolicy[]> = ref([]);
const assets: Ref<ResourceOwnerAsset[]> = ref([]);
const rootNodes: Ref<AssetTreeNode[]> = ref([]);
const selectedNode: Ref<AssetTreeNode | null> = ref(null);
const selectedPermissions: Ref<Array<SubjectPermissions<WebIdSubject | PublicSubject>>> = ref([]);
const selectedPermissionActions: Ref<Permission[]> = ref([Permission.Read]);

const isLoadingPolicies = ref(true);
const isLoadingAssets = ref(true);
const isAddingPolicy = ref(false);
const policyErrorMessage = ref('');
const assetErrorMessage = ref('');
const addPolicyErrorMessage = ref('');
const subjectType = ref<'public' | 'webId'>('public');
const webId = ref('');
let stopWatchingAssets: (() => void) | null = null;

const fallbackAssignablePermissions = [
  Permission.Read,
  Permission.Write,
  Permission.Append,
  Permission.Create,
  Permission.Control,
  Permission.Delete
];

const rules = computed<PolicyRuleRow[]>(() => policies.value.flatMap((policy) =>
  policy.rules.map((rule) => ({
    policyId: policy.id,
    ...rule
  }))
));

const selectedRules = computed(() => {
  if (!selectedNode.value) return rules.value;

  return rules.value.filter((rule) => rule.targets.some((target) => selectedNode.value!.targetAliases.includes(target)));
});

const visibleNodes = computed(() => flattenVisibleAssetTree(rootNodes.value));

const selectedResourceLabel = computed(() => selectedNode.value?.url ?? 'No resource selected');
const selectedAssetDescription = computed(() => selectedNode.value?.asset?.description?.description ?? '');

const assignablePermissions = computed(() => {
  const scopedPermissions = selectedNode.value?.asset?.description?.resource_scopes
    ?.map(scopeToPermission)
    .filter((permission): permission is Permission => Boolean(permission)) ?? [];

  return scopedPermissions.length > 0 ? scopedPermissions : fallbackAssignablePermissions;
});

const refreshPolicies = async () => {
  isLoadingPolicies.value = true;
  policyErrorMessage.value = '';

  try {
    policies.value = await controllerStore.current.getPolicies();
  } catch (error) {
    policyErrorMessage.value = error instanceof Error ? error.message : 'Failed to load ODRL policies';
  } finally {
    isLoadingPolicies.value = false;
  }
};

const refreshPage = async () => {
  await Promise.all([refreshPolicies(), refreshAssets()]);
};

const refreshSelectedPermissions = async () => {
  selectedPermissions.value = [];
  if (!selectedNode.value) return;

  if (!selectedNode.value.targetId) return;

  const resourcePermissions = await controllerStore.current.getResourcePermissionList(selectedNode.value.targetId);
  selectedPermissions.value = resourcePermissions.permissionsPerSubject;
};

const refreshAssets = async () => {
  isLoadingAssets.value = true;
  assetErrorMessage.value = '';

  try {
    const fetchedAssets = await controllerStore.current.getManageableAssets({
      include: ['description', 'scopes', 'policy_uri']
    });

    setAssets(fetchedAssets);
    selectedNode.value = findFirstAssetNode(rootNodes.value);
    updateSelectedPermissionActions();
    await refreshSelectedPermissions();
    startAssetWatcher();
  } catch (error) {
    assetErrorMessage.value = error instanceof Error ? error.message : 'Failed to load manageable assets';
  } finally {
    isLoadingAssets.value = false;
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
    syncSelectedNode();
  }, {
    include: ['description', 'scopes', 'policy_uri']
  });
};

const toggleNode = (node: AssetTreeNode) => {
  if (!node.isContainer) return;
  node.isExpanded = !node.isExpanded;
};

const selectNode = async (node: AssetTreeNode) => {
  if (node.isContainer) {
    toggleNode(node);
  }

  if (!node.targetId) return;

  selectedNode.value = node;
  addPolicyErrorMessage.value = '';
  updateSelectedPermissionActions();
  await refreshSelectedPermissions();
};

const addPolicyToSelectedResource = async () => {
  if (!selectedNode.value?.targetId) return;

  addPolicyErrorMessage.value = '';

  if (selectedPermissionActions.value.length === 0) {
    addPolicyErrorMessage.value = 'Select at least one action.';
    return;
  }

  if (subjectType.value === 'webId' && !webId.value.trim()) {
    addPolicyErrorMessage.value = 'Enter a WebID for this policy.';
    return;
  }

  const subject: PublicSubject | WebIdSubject = subjectType.value === 'public'
    ? { type: 'public' }
    : { type: 'webId', selector: { url: webId.value.trim() } };

  isAddingPolicy.value = true;

  try {
    for (const permission of selectedPermissionActions.value) {
      await controllerStore.current.addPermission(selectedNode.value.targetId, permission, subject);
    }

    await Promise.all([refreshPolicies(), refreshSelectedPermissions()]);
  } catch (error) {
    addPolicyErrorMessage.value = error instanceof Error ? error.message : 'Failed to add policy';
  } finally {
    isAddingPolicy.value = false;
  }
};

const togglePermission = (permission: Permission, enabled: boolean) => {
  if (enabled && !selectedPermissionActions.value.includes(permission)) {
    selectedPermissionActions.value = [...selectedPermissionActions.value, permission];
  } else if (!enabled) {
    selectedPermissionActions.value = selectedPermissionActions.value.filter((action) => action !== permission);
  }
};

const isPermissionSelected = (permission: Permission) => selectedPermissionActions.value.includes(permission);

const subjectLabel = (entry: SubjectPermissions<WebIdSubject | PublicSubject>) =>
  controllerStore.current.getLabelForSubject(entry.subject);

const shortId = (id: string) => id.split(/[\/#]/).at(-1) || id;
const joinValues = (values: string[], fallback = '-') => values.length > 0 ? values.join(', ') : fallback;

const scopeToPermission = (scope: string): Permission | null => {
  const normalizedScope = scope.toLowerCase();
  return fallbackAssignablePermissions.find((permission) => permission.toLowerCase() === normalizedScope) ?? null;
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

const syncSelectedNode = () => {
  if (!selectedNode.value?.targetId) {
    selectedNode.value = findFirstAssetNode(rootNodes.value);
    updateSelectedPermissionActions();
    void refreshSelectedPermissions();
    return;
  }

  const updatedSelection = findAssetNode(rootNodes.value, selectedNode.value.targetId);
  selectedNode.value = updatedSelection;
  updateSelectedPermissionActions();
  void refreshSelectedPermissions();
};

const findAssetNode = (nodes: AssetTreeNode[], assetId: string): AssetTreeNode | null => {
  for (const node of nodes) {
    if (node.targetId === assetId) return node;
    const childMatch = findAssetNode(node.children, assetId);
    if (childMatch) return childMatch;
  }

  return null;
};

const updateSelectedPermissionActions = () => {
  const permissions = assignablePermissions.value;
  selectedPermissionActions.value = permissions.includes(Permission.Read)
    ? [Permission.Read]
    : permissions.slice(0, 1);
};

onMounted(async () => {
  await refreshPage();
});

onUnmounted(() => stopWatchingAssets?.());
</script>

<template>
  <div class="container">
    <div class="header-card">
      <h2>ODRL policies</h2>
      <button @click="refreshPage" class="refresh-button">refresh</button>
    </div>

    <div class="workspace">
      <aside class="resource-browser">
        <div class="panel-title">Manageable assets</div>

        <div v-if="assetErrorMessage" class="message error-message">
          {{ assetErrorMessage }}
        </div>

        <div v-if="isLoadingAssets" class="message asset-message">
          Loading assets...
        </div>

        <div v-else-if="visibleNodes.length === 0" class="message asset-message">
          No manageable assets found.
        </div>

        <div v-else class="tree">
          <div
            v-for="node in visibleNodes"
            :key="node.id"
            :class="['tree-row', { selected: selectedNode?.url === node.url }]"
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
      </aside>

      <main class="policy-panel">
        <section class="selected-resource">
          <div>
            <h3>Selected asset</h3>
            <p :title="selectedResourceLabel">{{ selectedResourceLabel }}</p>
            <p v-if="selectedAssetDescription">{{ selectedAssetDescription }}</p>
          </div>
        </section>

        <section class="policy-editor">
          <h3>Add policy</h3>

          <div class="form-grid">
            <label for="subject-type">Subject</label>
            <select id="subject-type" v-model="subjectType" :disabled="isAddingPolicy">
              <option value="public">Public</option>
              <option value="webId">WebID</option>
            </select>

            <template v-if="subjectType === 'webId'">
              <label for="webid">WebID</label>
              <input id="webid" v-model="webId" type="url" placeholder="https://pod.example/profile/card#me" />
            </template>
          </div>

          <fieldset class="permissions">
            <legend>Actions</legend>
            <label v-for="permission in assignablePermissions" :key="permission">
              <input
                type="checkbox"
                :checked="isPermissionSelected(permission)"
                :disabled="isAddingPolicy"
                @change="togglePermission(permission, ($event.target as HTMLInputElement).checked)"
              />
              {{ permission }}
            </label>
          </fieldset>

          <div v-if="addPolicyErrorMessage" class="message error-message">
            {{ addPolicyErrorMessage }}
          </div>

          <button class="primary-button" :disabled="!selectedNode || isAddingPolicy" @click="addPolicyToSelectedResource">
            <PhPlus />
            {{ isAddingPolicy ? 'adding policy' : 'add policy' }}
          </button>
        </section>

        <section class="current-permissions">
          <h3>Current permissions</h3>
          <div v-if="selectedPermissions.length === 0" class="message">
            No permissions found for the selected asset.
          </div>
          <table v-else>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in selectedPermissions" :key="`${entry.subject.type}-${subjectLabel(entry)}`">
                <td :title="subjectLabel(entry)">{{ subjectLabel(entry) }}</td>
                <td>{{ entry.subject.type }}</td>
                <td>{{ entry.permissions.join(', ') }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="policy-list">
          <h3>{{ selectedNode ? 'Policies for selected asset' : 'Policies' }}</h3>

          <div v-if="isLoadingPolicies" class="message">
            Loading policies...
          </div>

          <div v-else-if="policyErrorMessage" class="message error-message">
            {{ policyErrorMessage }}
          </div>

          <div v-else-if="selectedRules.length === 0" class="message">
            No matching ODRL policies found.
          </div>

          <table v-else>
            <thead>
              <tr>
                <th>Policy</th>
                <th>Type</th>
                <th>Actions</th>
                <th>Assignees</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rule in selectedRules" :key="`${rule.policyId}-${rule.id}`">
                <td :title="rule.policyId">{{ shortId(rule.policyId) }}</td>
                <td>{{ rule.ruleType }}</td>
                <td>{{ joinValues(rule.permissions) }}</td>
                <td :title="joinValues(rule.assignees, 'Public')">{{ joinValues(rule.assignees, 'Public') }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 2rem;
  background-color: var(--off-white);
  min-height: calc(100vh - var(--base-unit) * 14);
}

.header-card,
.resource-browser,
.policy-panel > section {
  background-color: white;
  border-radius: var(--base-corner);
  box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.1);
}

.header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(18rem, 30%) 1fr;
  gap: 1.5rem;
  min-height: 40rem;
}

.resource-browser {
  min-width: 0;
  padding: 1rem 0;
  overflow: auto;
}

.panel-title {
  color: var(--off-black);
  font-weight: 700;
  padding: 0 1rem 1rem;
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
  min-height: 2.5rem;
  padding-right: 0.75rem;
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
  flex-shrink: 0;
}

.resource-name,
td {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-label {
  color: var(--off-black-50, rgba(23, 13, 51, 0.5));
  font-size: 0.8rem;
}

.asset-message {
  padding: 0 1rem 1rem;
}

.policy-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.policy-panel > section {
  padding: 1.5rem;
}

.selected-resource {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.selected-resource p {
  margin: 0.5rem 0 0;
  overflow-wrap: anywhere;
}

.form-grid {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr);
  gap: 0.75rem 1rem;
  align-items: center;
}

.permissions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 1rem 0;
  padding: 0;
  border: none;
}

.permissions legend {
  width: 100%;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.permissions label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

h2,
h3 {
  color: var(--solid-purple);
  font-weight: 700;
  margin: 0;
}

h2 {
  font-size: 1.25rem;
}

h3 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

button,
select,
input {
  font: inherit;
}

select,
input {
  padding: 0.6rem 0.75rem;
  border: 0.125rem solid var(--lama-gray);
  border-radius: var(--base-corner);
  background-color: var(--off-white);
}

.refresh-button,
.primary-button {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: var(--base-corner);
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.refresh-button {
  background-color: var(--lama-gray);
  color: var(--off-black);
}

.refresh-button:hover {
  background-color: #bfbfbf;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--solid-purple);
  color: var(--off-white);
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.message {
  color: var(--off-black);
}

.error-message {
  color: var(--lama-red);
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

th,
td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--lama-gray);
}

th {
  color: var(--off-black);
  font-weight: 700;
}

td {
  color: var(--off-black);
}

@media (max-width: 900px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}
</style>
