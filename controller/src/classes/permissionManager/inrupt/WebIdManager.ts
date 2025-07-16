import { getDefaultSession } from "@inrupt/solid-client-authn-browser";
import { BaseSubject, IndexItem, Permission, SubjectPermissions } from "../../../types";
import { IPermissionManager, SubjectKey } from "../../../types/modules";
import { InruptPermissionManager } from "./InruptPermissionManager";
import { setAgentAccess } from "@inrupt/solid-client/universal";
import { AccessModes, } from "@inrupt/solid-client";
import { PolicyParser } from "../../utils/PolicyParser";


export class WebIdManager<T extends Record<keyof T, BaseSubject<keyof T & string>>> extends InruptPermissionManager<T> implements IPermissionManager<T> {
    private async updateACL<K extends SubjectKey<T>>(resource: string, subject: T[K], accessModes: Partial<AccessModes>) {
        const session = getDefaultSession();
        if (!subject.selector?.url) {
            throw new Error("Missing url selector on WebID subject")
        }
        await setAgentAccess(resource, subject.selector.url, accessModes, {
            fetch: session.fetch
        })
    }
    //. NOTE: Currently, it doesn't do any recursive permission setting on containers
    async createPermissions<K extends SubjectKey<T>>(resource: string, subject: T[K], permissions: Permission[]): Promise<void> {
        const accessModes = this.permissionsToAccessModes(permissions, []);
        await this.updateACL(resource, subject, accessModes)
    }

    async deletePermissions<K extends SubjectKey<T>>(resource: string, subject: T[K]) {
        await this.updateACL(resource, subject, {});
    }

    async editPermissions<K extends SubjectKey<T>>(resource: string, item: IndexItem, subject: T[K], permissions: Permission[]) {
        const accessModes = this.editPermissionsToAccessModes(item, permissions);
        await this.updateACL(resource, subject, accessModes)
    }

    async getRemotePermissions<K extends SubjectKey<T>>(resourceUrl: string): Promise<SubjectPermissions<T[K]>[]> {
        // Extract our webID
        const session = getDefaultSession();
        const webId = session.info.webId;

        // We must be logged on
        if (!webId) {
            throw new Error("User not logged in");
        }

        // Temporal
        const url = "http://localhost:4000/uma/policies";

        // Get all our policies
        const response = await fetch(url, {
            headers: {
                "Authorization": webId,
                "Accept": "text/turtle"
            }
        });

        const turtleText = await response.text();
        console.log("Retrieved Turtle:", turtleText);

        // Use parser to extract an N3 Store
        const parser = new PolicyParser();
        const store = parser.parseText(turtleText);

        // Parse to SubjectPermissions
        const targets = parser.ownedPoliciesToObject(store);

        // Do we even need different subject types when always working with policy targets.....
        return targets.map(target => ({
            subject: {
                type: "webId",
                selector: { url: target.uri },
            } as unknown as T[K],
            permissions: [...target.permissions],
            isEnabled: true
        }));
    }

    type = 'webID';
}
