import { BaseSubject, IndexItem, Permission, ResourcePermissions } from "../../../types";
import { IPermissionManager, SubjectKey } from "../../../types/modules";
import { InruptPermissionManager } from "./InruptPermissionManager";

export class PublicManager<T extends Record<keyof T, BaseSubject<keyof T & string>>> extends InruptPermissionManager<T> implements IPermissionManager<T> {

    //. NOTE: Currently, it doesn't do any recursive permission setting on containers
    async createPermissions<K extends SubjectKey<T>>(resource: string, subject: T[K], permissions: Permission[]): Promise<void> {
        console.log("public manager: create permissions")
    }

    async deletePermissions<K extends SubjectKey<T>>(resource: string, subject: T[K]) {
        console.log("public manager: delete permissions")
    }

    async editPermissions<K extends SubjectKey<T>>(resource: string, item: IndexItem, subject: T[K], permissions: Permission[]) {
        console.log("public manager: edit permissions")
    }



}
