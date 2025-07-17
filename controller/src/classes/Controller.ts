import { BaseSubject, Index, IndexItem, Permission, ResourcePermissions, Resources, SubjectPermissions } from "../types";
import { IAccessRequest, IController, IInboxConstructor, IStore, IStoreConstructor, SubjectConfig, SubjectConfigs, SubjectKey, SubjectType } from "../types/modules";
import { AccessRequest } from "./accessRequests/AccessRequest";
import { InruptAccessRequest } from "./accessRequests/InruptAccessRequest";
import { WebIdManager } from "./permissionManager/inrupt";
import { Mutex } from "./utils/Mutex";

export class Controller<T extends Record<keyof T, BaseSubject<keyof T & string>>> extends Mutex implements IController<T> {
    private index: IStore<Index<T[keyof T & string]>>;
    private resources: IStore<Resources>;
    private accessRequest: AccessRequest;
    private subjectConfigs: SubjectConfigs<T>;

    // TODO : Find a better way of constructing the controller with all the different modules
    constructor(storeConstructor: IStoreConstructor, inboxConstructor: IInboxConstructor, subjects: SubjectConfigs<T>) {
        super();
        // There is currently no "easy" solution to get around the as IStore...
        this.index = new storeConstructor("index.json", () => ({ id: "", items: [] })) as IStore<Index<T[keyof T & string]>>;
        this.resources = new storeConstructor("resources.json", () => ({ id: "", items: [] })) as IStore<Resources>;;
        this.accessRequest = new InruptAccessRequest(this as unknown as Controller<{}>, inboxConstructor, this.resources);
        this.subjectConfigs = subjects;
    }

    private getSubjectConfig<K extends SubjectKey<T>>(subject: T[K]): SubjectConfig<T, T[K]> {
        console.log('Controller.getSubjectConfig called');
        console.log('Arguments:', { subject });
        const subjectConfig = this.subjectConfigs[subject.type];
        if (!subjectConfig) {
            throw new Error(`No config found for subject type ${subject.type}`);
        }
        return subjectConfig as SubjectConfig<T, T[K]>
    }

    private async getExistingRemotePermissions<K extends SubjectKey<T>>(resourceUrl: string, subject: T[K]): Promise<Permission[]> {
        console.log('Controller.getExistingRemotePermissions called');
        console.log('Arguments:', { resourceUrl, subject });
        const subjectConfig = this.getSubjectConfig(subject)
        const subjects = await subjectConfig.manager.getRemotePermissions<K>(resourceUrl);
        const subjectPermission = subjects.find(entry => subjectConfig.resolver.checkMatch(entry.subject, subject))

        return [...subjectPermission?.permissions ?? []]
    }


    private async getExistingPermissions<K extends SubjectKey<T>>(resourceUrl: string, subject: T[K]): Promise<Permission[]> {
        console.log('Controller.getExistingPermissions called');
        console.log('Arguments:', { resourceUrl, subject });
        const item = await this.getItem(resourceUrl, subject);
        if (item) {
            // Makeing sure the array is not a reference to the one stored in the index
            return [...item.permissions]
        }
        return this.getExistingRemotePermissions(resourceUrl, subject);
    }

    private async updateItem<K extends SubjectKey<T>>(resourceUrl: string, subject: SubjectType<T, K>, permissions: Permission[], alwaysKeepItem = false) {
        console.log('Controller.updateItem called');
        console.log('Arguments:', { resourceUrl, subject, permissions, alwaysKeepItem });
        let item = await this.getItem(resourceUrl, subject);
        const { manager } = this.getSubjectConfig(subject)

        if (item) {
            await manager.editPermissions(resourceUrl, item, subject, permissions);
        } else {
            await manager.createPermissions(resourceUrl, subject, permissions);

            item = {
                id: crypto.randomUUID(),
                requestId: crypto.randomUUID(),
                isEnabled: true,
                permissions: permissions,
                resource: resourceUrl,
                subject: subject,
            }

            const index = await this.index.getCurrent();
            index.items.push(item);
        }

        if (!alwaysKeepItem && permissions.length === 0 && manager.shouldDeleteOnAllRevoked()) {
            const index = await this.index.getCurrent();
            const idx = index.items.findIndex(i => i.id === item.id);
            index.items.splice(idx, 1);
        } else {
            item.permissions = permissions;

            // The SOLID server OR the SDK does not directly push the update to the acl files for some reason
            // Here we give it some time to save/push the changes
            await new Promise(res => setTimeout(res, 500));
            // extra check what the ACL currently has stored as info. Will decrease the chance of the index going out of sync with the ACL file
            const remotePermissions = await this.getExistingRemotePermissions(resourceUrl, subject);
            if (remotePermissions !== permissions) {
                console.debug("Permissions in index are out of sync with remote, updating index...", subject);
                item.permissions = remotePermissions;
            }
        }

        await this.index.saveToRemote();
    }

    AccessRequest(): IAccessRequest {
        console.log('Controller.AccessRequest called');
        console.log('Arguments:', {});
        return this.accessRequest;
    }

    async setPodUrl(podUrl: string) {
        console.log('Controller.setPodUrl called');
        console.log('Arguments:', { podUrl });
        this.index.setPodUrl(podUrl);
        this.resources.setPodUrl(podUrl);
        await this.accessRequest.setPodUrl(podUrl)
    }

    unsetPodUrl() {
        console.log('Controller.unsetPodUrl called');
        console.log('Arguments:', {});
        this.index.unsetPodUrl();
        this.resources.unsetPodUrl();
        this.accessRequest.unsetPodUrl();
    }

    async getOrCreateIndex() {
        console.log('Controller.getOrCreateIndex called');
        console.log('Arguments:', {});
        return this.index.getOrCreate();
    }

    getLabelForSubject<K extends SubjectKey<T>>(subject: T[K]): string {
        console.log('Controller.getLabelForSubject called');
        console.log('Arguments:', { subject });
        const { resolver } = this.getSubjectConfig(subject);
        return resolver.toLabel(subject);
    }

    async getItem<K extends SubjectKey<T>>(resourceUrl: string, subject: SubjectType<T, K>): Promise<IndexItem<T[K]> | undefined> {
        console.log('Controller.getItem called');
        console.log('Arguments:', { resourceUrl, subject });
        const { resolver } = this.getSubjectConfig<K>(subject);

        const index = await this.index.getCurrent() as Index<T[K]>;
        return resolver.getItem(index, resourceUrl, subject.selector)
    }

    async addPermission<K extends SubjectKey<T>>(resourceUrl: string, addedPermission: Permission, subject: SubjectType<T, K>) {
        console.log('Controller.addPermission called');
        console.log('Arguments:', { resourceUrl, addedPermission, subject });
        const release = await this.acquire();
        try {
            let permissions = await this.getExistingPermissions(resourceUrl, subject);

            if (permissions.indexOf(addedPermission) !== -1) {
                console.error("Permission already granted")
                return permissions;
            }

            permissions.push(addedPermission)

            await this.updateItem(resourceUrl, subject, permissions)
            return permissions;
        } catch (e) {
            throw e;
        } finally {
            release();
        }
    }

    async removeSubject<K extends SubjectKey<T>>(resourceUrl: string, subject: SubjectType<T, K>) {
        console.log('Controller.removeSubject called');
        console.log('Arguments:', { resourceUrl, subject });
        await this.updateItem(resourceUrl, subject, []);

        const subjectConfig = this.getSubjectConfig(subject);
        const index = await this.index.getCurrent() as Index<T[K]>;

        const item = subjectConfig.resolver.getItem(index, resourceUrl, subject.selector);
        if (!item) return;

        await subjectConfig.manager.deletePermissions(resourceUrl, subject);

        const idx = index.items.findIndex(i => subjectConfig.resolver.checkMatch(i.subject, subject));
        index.items.splice(idx, 1);

        await this.index.saveToRemote();
    }

    async removePermission<K extends SubjectKey<T>>(resourceUrl: string, removedPermission: Permission, subject: SubjectType<T, K>) {
        console.log('Controller.removePermission called');
        console.log('Arguments:', { resourceUrl, removedPermission, subject });
        const release = await this.acquire();
        try {
            let oldPermissions = await this.getExistingPermissions(resourceUrl, subject);
            let newPermissions = oldPermissions.filter((p) => p !== removedPermission);

            if (newPermissions.length === oldPermissions.length) {
                console.error("Permission not found")
                return oldPermissions;
            }

            await this.updateItem(resourceUrl, subject, newPermissions)
            return newPermissions;
        } catch (e) {
            throw e;
        } finally {
            release();
        }
    }

    async enablePermissions<K extends SubjectKey<T>>(resource: string, subject: SubjectType<T, K>) {
        console.log('Controller.enablePermissions called');
        console.log('Arguments:', { resource, subject });
        let item = await this.getItem(resource, subject);
        if (!item) {
            // This point should never be reached
            throw new Error("Item not found to enable permissions from")
        }

        const { manager } = this.getSubjectConfig(subject)
        await manager.createPermissions(resource, subject, item.permissions);

        item.isEnabled = true;
        await this.index.saveToRemote()
    }

    async disablePermissions<K extends SubjectKey<T>>(resourceUrl: string, subject: SubjectType<T, K>) {
        console.log('Controller.disablePermissions called');
        console.log('Arguments:', { resourceUrl, subject });
        let item = await this.getItem(resourceUrl, subject);
        if (!item) {
            throw new Error("Item not found to disable permissions from")
        }

        const { manager } = this.getSubjectConfig(subject)
        await manager.editPermissions(resourceUrl, item, subject, []);

        item.isEnabled = false;

        await this.index.saveToRemote()
    }

    async getContainerPermissionList(containerUrl: string): Promise<ResourcePermissions<T[keyof T]>[]> {
        console.log('Controller.getContainerPermissionList called');
        console.log('Arguments:', { containerUrl });

        // Use the subjectConfigs to get permissions for the container
        // For each subjectConfig, call its manager.getRemotePermissions for the containerUrl

        // Eventually, we would only need to use the webIDManager...
        const configs: SubjectConfig<T>[] = Object.values(this.subjectConfigs);
        const results = await Promise.all(
            configs.map(c => c.manager.getRemotePermissions<keyof T & string>(containerUrl))
        );
        // Flatten the results and process as needed
        const targets = results.flat();
        const resourcePermissions: ResourcePermissions<T[keyof T]>[] = [];

        targets.forEach(async result => {
            console.log("result", result)
            resourcePermissions.push(
                {
                    resourceUrl: result.targetId ?? "if you see this, something went wrong",
                    canRequestAccess: await this.accessRequest.canRequestAccessToResource(result.subject.selector?.url),
                    permissionsPerSubject: [{ subject: result.subject, permissions: result.permissions, isEnabled: result.isEnabled }]
                })
        });

        console.log(resourcePermissions)

        return resourcePermissions
    }

    // NOTE: Do we want to force this to only use the index stored in the store?
    async getResourcePermissionList(resourceUrl: string) {
        console.log('Controller.getResourcePermissionList called');
        console.log('Arguments:', { resourceUrl });
        // Need to put it in a variable because the type declaration vanishes
        const configs: SubjectConfig<T>[] = Object.values(this.subjectConfigs);
        const index = await this.index.getCurrent();
        const results = await Promise.allSettled(configs.map(c => c.manager.getRemotePermissions<keyof T & string>(resourceUrl)))

        let permissionsPerSubject = index.items.filter(i => i.resource === resourceUrl)

        return {
            resourceUrl,
            canRequestAccess: await this.accessRequest.canRequestAccessToResource(resourceUrl),
            permissionsPerSubject: results.reduce<SubjectPermissions<T[keyof T & string]>[]>((arr, v) => {
                if (v.status === "fulfilled") {
                    v.value.forEach(remotePps => {
                        const { resolver } = this.getSubjectConfig(remotePps.subject);
                        const indexItem = arr.find(pps => resolver.checkMatch(remotePps.subject, pps.subject));

                        if (indexItem) {
                            if (indexItem.isEnabled) {
                                indexItem.permissions = remotePps.permissions;
                            }
                        } else {
                            arr.push(remotePps)
                        }
                    })
                }
                return arr;
            }, permissionsPerSubject)
        }
    }

    isSubjectSupported<K extends string, B extends BaseSubject<K>>(subject: BaseSubject<K>): IController<Record<K, B>> {
        console.log('Controller.isSubjectSupported called');
        console.log('Arguments:', { subject });
        if (!this.subjectConfigs[subject.type as unknown as keyof T]) {

            throw new Error(`Subject type ${subject.type} is not supported`);
        }
        return this as unknown as IController<Record<K, B>>
    }
}
