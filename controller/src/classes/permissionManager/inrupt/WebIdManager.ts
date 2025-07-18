import { getDefaultSession } from "@inrupt/solid-client-authn-browser";
import { BaseSubject, IndexItem, Permission, ResourcePermissions, SubjectPermissions } from "../../../types";
import { IPermissionManager, SubjectKey } from "../../../types/modules";
import { InruptPermissionManager } from "./InruptPermissionManager";
import { ODRL, PolicyParser } from "../../utils/PolicyParser";

// Temporal

export class WebIdManager<T extends Record<keyof T, BaseSubject<keyof T & string>>> extends InruptPermissionManager<T> implements IPermissionManager<T> {

    //. NOTE: Currently, it doesn't do any recursive permission setting on containers
    async createPermissions<K extends SubjectKey<T>>(resource: string, subject: T[K], permissions: Permission[]): Promise<void> {
    }

    async deletePermissions<K extends SubjectKey<T>>(resource: string, subject: T[K]) {
    }

    async editPermissions<K extends SubjectKey<T>>(resource: string, item: IndexItem, subject: T[K], permissions: Permission[]) {
    }


    async getContainerPermissionList(containerUrl: string, resourceToSkip: string[] = []): Promise<ResourcePermissions<T[keyof T]>[]> {
        // Extract our webID
        const session = getDefaultSession();
        const webId = session.info.webId;
        console.log("webId", webId)

        // We must be logged on
        if (!webId) {
            throw new Error("User not logged in");
        }

        const store = await this.fetchPolicies(webId);

        // Collect target urls
        const targetUrls = Array.from(new Set(store.getQuads(null, ODRL('target'), null, null).map(q => q.object.id)));
        const resourcePermissions: ResourcePermissions<T[keyof T]>[] = []
        for (const targetUrl of targetUrls) {
            console.log(targetUrl)
            const perms = await this.getRemotePermissions(targetUrl);
            resourcePermissions.push({
                resourceUrl: targetUrl,
                canRequestAccess: true, // TODO: based on proper access logic
                permissionsPerSubject: perms
            })
        }

        return resourcePermissions;
    }
}
