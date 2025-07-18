import { Access, AccessModes, getSolidDataset, getThingAll } from "@inrupt/solid-client";
import { SubjectPermissions, BaseSubject, IndexItem, Permission, ResourcePermissions } from "../../../types";
import { SubjectKey, TargetSubjects } from "../../../types/modules";
import { getDefaultSession } from "@inrupt/solid-client-authn-browser";
import { PolicyParser } from "../../../classes/utils/PolicyParser";
import { Store } from "n3";
import { PolicyEditor } from "../../../classes/utils/PolicyEditor";

const ACCESS_MODES_TO_PERMISSION_MAPPING: Record<keyof (AccessModes & Access), Permission> = {
    read: Permission.Read,
    write: Permission.Write,
    append: Permission.Append,
    control: Permission.Control,
    controlRead: Permission.Control,
    controlWrite: Permission.Control,
}

export const UMA_URL = (encodedId: string = "") => `http://localhost:4000/uma/policies${encodedId}`

/**
 * A permission manager implementation using the inrupt sdk to actually update the ACL
 * The "Inrupt" prefix is to indicate the usage of the inrupt sdk
 * This permission manager can be used without the the InruptStore
*/
export abstract class InruptPermissionManager<T extends Record<keyof T, BaseSubject<keyof T & string>>> {

    protected AccessModesToPermissions(accessModes: AccessModes | Access): Permission[] {
        const permissions = new Set<Permission>();
        Object.entries(accessModes).forEach(([mode, isActive]) => {
            if (isActive) {
                permissions.add(ACCESS_MODES_TO_PERMISSION_MAPPING[mode as keyof (AccessModes & Access)])
            }
        })
        return [...permissions];
    }

    protected permissionsToAccessModes(addedPermissions: Iterable<Permission>, removedPermissions: Iterable<Permission>): Partial<AccessModes> {
        const accessModes: Partial<AccessModes> = {};
        const addToAccessModes = (permission: Permission, hasAccess: boolean) => {
            switch (permission) {
                case Permission.Append:
                    accessModes.append = hasAccess;
                    break;
                case Permission.Control:
                    accessModes.controlRead = hasAccess;
                    accessModes.controlWrite = hasAccess;
                    break;
                case Permission.Read:
                    accessModes.read = hasAccess;
                    break;
                case Permission.Write:
                    // Setting Write also enables Append, so we make append inherintly true
                    // This will also disable append when write is taken away
                    accessModes.write = hasAccess;
                    accessModes.append = hasAccess;
                    break;
            }
        }

        // First the removed ones so we can e.g. remove write and add append
        for (const permission of removedPermissions) {
            addToAccessModes(permission, false);
        }
        for (const permission of addedPermissions) {
            addToAccessModes(permission, true);
        }

        return accessModes;
    }


    protected editPermissionsToAccessModes(item: IndexItem, permissions: Permission[]) {
        const oldPermissionsSet = [...new Set(item.permissions)];
        const newPermissionsSet = [...new Set(permissions)];
        const addedPermissions = newPermissionsSet.filter(p => !oldPermissionsSet.includes(p));
        const removedPermissions = oldPermissionsSet.filter(p => !newPermissionsSet.includes(p));

        const accessModes = this.permissionsToAccessModes(addedPermissions, removedPermissions);
        return accessModes;
    }

    protected async fetchPolicies(webId: string) {

        // Get all our policies
        const response = await fetch(UMA_URL(), {
            headers: {
                "Authorization": webId,
                "Accept": "text/turtle"
            }
        });

        // Extract the target Ids
        const turtleText = await response.text();
        console.log("Retrieved Turtle:", turtleText);

        // Use parser to extract an N3 Store
        const parser = new PolicyParser();
        return parser.parseText(turtleText);
    }


    public async getRemotePermissions<K extends SubjectKey<T>>(resourceUrl: string): Promise<SubjectPermissions<T[K]>[]> {
        // Extract our webID
        const session = getDefaultSession();
        const webId = session.info.webId;
        console.log("webId", webId)

        // We must be logged on
        if (!webId) {
            throw new Error("User not logged in");
        }
        const store = await this.fetchPolicies(webId)

        // Use parser to extract an N3 Store
        const parser = new PolicyParser();

        // Parse to SubjectPermissions
        const targets: TargetSubjects[] = parser.permissionsForOneResource(resourceUrl, store);

        const subjectPermissions: SubjectPermissions<T[K]>[] = [];
        targets.forEach(target => {
            // Add the owner information
            subjectPermissions.push({
                subject: {
                    type: "webId",
                    selector: { url: target.assigner }
                } as unknown as T[K],
                permissions: [Permission.Append, Permission.Control, Permission.Read, Permission.Write],
                isEnabled: true,
                targetId: target.targetUrl
            })

            // Add the public information
            if (target.public) subjectPermissions.push({
                subject: {
                    type: "public",
                } as unknown as T[K],
                permissions: Array.from(target.public.permissions),
                isEnabled: true, // Not yet implemented
                targetId: target.targetUrl
            })

            // Add the private subjects
            if (target.private) target.private.forEach(subject => subjectPermissions.push({
                subject: {
                    type: "webId",
                    selector: { url: subject.subject }
                } as unknown as T[K],
                permissions: Array.from(subject.permissions),
                isEnabled: true, // Not yet implemented
                targetId: target.targetUrl
            }))
        }
        );

        return subjectPermissions;
    }


    async getContainerPermissionList(containerUrl: string, resourceToSkip: string[] = []): Promise<ResourcePermissions<T[keyof T]>[]> {
        return [];
    }

    shouldDeleteOnAllRevoked() { return true }
}
