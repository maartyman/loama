import { BaseSubject, IndexItem, Permission } from "../../../types";
import { IPermissionManager, SubjectKey } from "../../../types/modules";
import { InruptPermissionManager } from "./InruptPermissionManager";
import { PolicyEditor } from "../../../classes/utils/PolicyEditor";

export class WebIdManager<T extends Record<keyof T, BaseSubject<keyof T & string>>> extends InruptPermissionManager<T> implements IPermissionManager<T> {

    // Create an action for this resource and this subject with the given permissions
    async createPermissions<K extends SubjectKey<T>>(resource: string, subject: T[K], permissions: Permission[]): Promise<void> {
        new PolicyEditor().insertActionRule(resource, permissions, subject.selector!.url);
    }

    async deletePermissions<K extends SubjectKey<T>>(resource: string, subject: T[K], permissions: Permission[]) {
        new PolicyEditor().deleteActionRule(resource, permissions, subject.selector!.url)
    }

    async editPermissions<K extends SubjectKey<T>>(resource: string, item: IndexItem, subject: T[K], permissions: Permission[]) {
    }

    type = "webId"
}
