import { getDefaultSession } from "@inrupt/solid-client-authn-browser";
import { BaseSubject, Index, IndexItem, Permission, ResourcePermissions, Resources } from "../types";
import { IAccessRequest, IController, IInboxConstructor, IStore, IStoreConstructor, SubjectConfig, SubjectConfigs, SubjectKey, SubjectType } from "../types/modules";
import { AccessRequest } from "./accessRequests/AccessRequest";
import { ODRLAccessRequest } from "./accessRequests/OdrlAccessRequest";
import { Mutex } from "./utils/Mutex";

/**
 * Controller which makes it calls to the backend AS through ODRL requests.
 * Makes use of the Inrupt SDK to authenticate users.
 */
export class ODRLController<T extends Record<keyof T, BaseSubject<keyof T & string>>> extends Mutex implements IController<T> {
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
        this.accessRequest = new ODRLAccessRequest(this as unknown as ODRLController<{}>, inboxConstructor, this.resources);
        this.subjectConfigs = subjects;
    }

    private getSubjectConfig<K extends SubjectKey<T>>(subject: T[K]): SubjectConfig<T, T[K]> {
        const subjectConfig = this.subjectConfigs[subject.type];
        if (!subjectConfig) {
            throw new Error(`No config found for subject type ${subject.type}`);
        }
        return subjectConfig as SubjectConfig<T, T[K]>
    }

    private async updateItem<K extends SubjectKey<T>>(resourceUrl: string, subject: SubjectType<T, K>, permissions: Permission[], alwaysKeepItem = false) {
    }

    AccessRequest(): IAccessRequest {
        return this.accessRequest;
    }

    async setPodUrl(podUrl: string) {
    }

    unsetPodUrl() {
    }

    async getOrCreateIndex() {
        return { id: "", items: [] }
    }

    getLabelForSubject<K extends SubjectKey<T>>(subject: T[K]): string {
        const { resolver } = this.getSubjectConfig(subject);
        return resolver.toLabel(subject);
    }

    /**
     * Assemble the information for a subject in a resource
     * @returns 
     */
    async getItem<K extends SubjectKey<T>>(resourceUrl: string, subject: SubjectType<T, K>): Promise<IndexItem<T[K]> | undefined> {
        const subjectConfig = this.getSubjectConfig(subject)
        const subjects = await subjectConfig.manager.getRemotePermissions<K>(resourceUrl);
        const subjectPermission = subjects.find(entry => subjectConfig.resolver.checkMatch(entry.subject, subject))
        if (!subjectPermission) return undefined
        return {
            id: "string",
            requestId: "string",
            isEnabled: subjectPermission.isEnabled,
            permissions: [...subjectPermission.permissions ?? []],
            resource: resourceUrl,
            subject: subject,
        } as IndexItem<T[K]>
    }

    async addPermission<K extends SubjectKey<T>>(resourceUrl: string, addedPermission: Permission, subject: SubjectType<T, K>) {
        const release = await this.acquire();
        try {

            // 1. Create a new permission for the subject
            await this.getSubjectConfig(subject).manager.createPermissions(resourceUrl, subject, [addedPermission])

            // 2. Let the manager add the permission, return the updated version
            const webId = getDefaultSession().info.webId!;
            const permissions = await this.getSubjectConfig(subject).manager.getTargetPermissionsForUser(webId, subject.selector?.url ?? "", resourceUrl);

            return permissions;
        } catch (e) {
            throw e;
        } finally {
            release();
        }
    }

    async removeSubject<K extends SubjectKey<T>>(resourceUrl: string, subject: SubjectType<T, K>) {
        const subjectConfig = this.getSubjectConfig(subject);
        const item = await this.getItem(resourceUrl, subject);

        await subjectConfig.manager.deletePermissions(resourceUrl, subject, item?.permissions ?? []);
    }

    async removePermission<K extends SubjectKey<T>>(resourceUrl: string, removedPermission: Permission, subject: SubjectType<T, K>) {
        const release = await this.acquire()
        try {

            // 1. Delete a permission for the subject
            await this.getSubjectConfig(subject).manager.deletePermissions(resourceUrl, subject, [removedPermission]);

            // 2. Let the manager delete the permission, return the updated version
            const webId = getDefaultSession().info.webId!;
            const permissions = await this.getSubjectConfig(subject).manager.getTargetPermissionsForUser(webId, subject.selector!.url, resourceUrl);

            return permissions

        } catch (error) {
            return []
        } finally {
            release();
        }
    }

    async enablePermissions<K extends SubjectKey<T>>(resource: string, subject: SubjectType<T, K>) {
        // won't fix
    }

    async disablePermissions<K extends SubjectKey<T>>(resourceUrl: string, subject: SubjectType<T, K>) {
        // won't fix
    }

    async getContainerPermissionList(containerUrl: string): Promise<ResourcePermissions<T[keyof T]>[]> {
        return this.getSubjectConfig({ type: "public" } as T[SubjectKey<T>]).manager.getContainerPermissionList(containerUrl);
    }

    // NOTE: Do we want to force this to only use the index stored in the store?
    async getResourcePermissionList(resourceUrl: string): Promise<ResourcePermissions<T[keyof T]>> {
        const result = await this.getSubjectConfig({ type: "public" } as T[SubjectKey<T>]).manager.getRemotePermissions(resourceUrl);

        return {
            resourceUrl,
            canRequestAccess: true, // TODO
            permissionsPerSubject: result
        };
    }

    isSubjectSupported<K extends string, B extends BaseSubject<K>>(subject: BaseSubject<K>): IController<Record<K, B>> {
        if (!this.subjectConfigs[subject.type as unknown as keyof T]) {

            throw new Error(`Subject type ${subject.type} is not supported`);
        }
        return this as unknown as IController<Record<K, B>>
    }
}
