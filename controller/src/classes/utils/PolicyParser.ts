import { Permission } from "../../types/";
import { IPolicy, ISpecificTargetInfo, TargetSubjects } from "../../types/modules";
import { DataFactory, Parser, Store } from "n3";

const { namedNode } = DataFactory

export const ODRL = (something: string) => namedNode(`http://www.w3.org/ns/odrl/2/${something}`);


export class PolicyParser {

    public constructor() { }

    private fromODRL = (odrlString: string) => odrlString.split('/')[6];
    private defaultTarget = (uri: string, subject: string = ""): ISpecificTargetInfo => ({ uri: uri, permissions: new Set(), subject: subject, public: subject === "" })

    public parseText = (text: string): Store => {
        const parser = new Parser({ format: 'text/turtle' });
        const quads = parser.parse(text);
        return new Store(quads);
    }

    /**
     * Extract the quads of one subject, and recursively add whatever their object is referring to
     * @param store store to extract subject from
     * @param subjectIRI 
     * @param existing IDs that have already been added to the store
     * @returns detailed store of the original subject and all of their children
     */
    private extractQuadsRecursive(store: Store, subjectIRI: string, existing: Set<string> = new Set([subjectIRI])): Store {
        // Add the direct quads to the store
        const result = new Store();
        const subjectQuads = store.getQuads(subjectIRI, null, null, null);
        result.addQuads(subjectQuads);

        // If objects are not already added, add their quads and their children
        for (const quad of subjectQuads) {
            if (!existing.has(quad.object.id)) {
                existing.add(quad.object.id);
                result.addQuads(this.extractQuadsRecursive(store, quad.object.id, existing).getQuads(null, null, null, null));
            }
        }
        return result;
    }

    /**
     * Function that returns the stored Target objects without sanitization
     * This function assumes all policies are correct, and only contains information for the logged on client
     * 
     * Currently, it does not check the rule type (permission, prohibition, duty) and it assumes permission
     * @param store the owned policies in a store
     * @returns the target -> subjects -> permissions relation for all owned targets
     */
    public ownedPoliciesToObject = (store: Store, specifiedTarget: string = ""): TargetSubjects[] => {

        // 1. Get every <rule> odrl:target <target> . quad, or only the rules targetting the specified target
        // Note that multiple rules can refer to the same target, and one rule can refer to multiple targets
        const relevantRuleSet: Set<string> = new Set((specifiedTarget === ""
            ? store.getQuads(null, ODRL('target'), null, null)
            : store.getQuads(null, ODRL('target'), namedNode(specifiedTarget), null))
            .map(quad => quad.subject.id));

        // 2. Add permission information for every target we find
        // Every target ID corresponds with the subjects that each have some permissions etc.
        const idToTarget: Map<string, TargetSubjects> = new Map<string, TargetSubjects>();
        for (const ruleId of relevantRuleSet) {

            // 2.1 Get the every quad defined by the rule (and their children recursively)
            const ruleStore = this.extractQuadsRecursive(store, ruleId);

            // 2.2 List all relevant actions for this rule
            const permissions = [];
            for (const quad of ruleStore.getQuads(null, ODRL('action'), null, null)) {
                // TODO: find a way to categorize all actions as one of the Permission types 
                const action = this.fromODRL(quad.object.id).toLowerCase();
                console.log('action', action)

                switch (action) {
                    case "read":
                        permissions.push(Permission.Read);
                        break;

                    case "write":
                        permissions.push(Permission.Write);
                        break;

                    case "append":
                        permissions.push(Permission.Append);
                        break;

                    case "control":
                        permissions.push(Permission.Control);
                        break;

                    default:
                        console.warn(`Unrecognized ODRL action: ${action}`);
                }

            }

            // Get assigner ID
            const assigner = ruleStore.getQuads(null, ODRL('assigner'), null, null)[0].object.id;
            if (!assigner) throw new Error("Corrupted Policy");

            // Get assignee IDs
            const subjects: string[] = ruleStore.getQuads(null, ODRL('assignee'), null, null).map(quad => quad.object.id);

            for (const target of ruleStore.getQuads(null, ODRL('target'), null, null).map(quad => quad.object.id)) {
                // 2.3 Set the target's assigner if not already done
                if (!idToTarget.get(target)) idToTarget.set(target, { assigner: assigner, targetUrl: target });

                // 2.4 Add the private assignee information for every target in the rule
                for (const subject of subjects) {
                    // If target does not have subjects yet, set a default object
                    if (!idToTarget.get(target)!.private)
                        idToTarget.get(target)!.private = new Map<string, ISpecificTargetInfo>();

                    // If subject is new to the target, set its permissions to a new set
                    if (!idToTarget.get(target)!.private!.has(subject))
                        idToTarget.get(target)!.private!.set(subject, { uri: target, subject: subject, public: false, permissions: new Set() });

                    // Add the permissions of this rule to the subject
                    const targetObject: ISpecificTargetInfo = idToTarget.get(target)!.private!.get(subject)!;
                    permissions.forEach(p => targetObject.permissions.add(p));
                }

                if (subjects.length === 0) {
                    // If there is no public permission set, add one
                    if (!idToTarget.get(target)!.public)
                        idToTarget.get(target)!.public = { uri: target, public: true, subject: "", permissions: new Set() };

                    // Add the permissions to the set
                    const publicPermissions: Set<Permission> = idToTarget.get(target)!.public!.permissions;
                    permissions.forEach(p => publicPermissions.add(p));
                }
            }
        }

        // Return the list of target info objects
        return Array.from(idToTarget.values());
    }

    // Return the subject -> permissions relation for a target
    public permissionsForOneResource(resourceUrl: string, store: Store): TargetSubjects[] {
        return this.ownedPoliciesToObject(store, resourceUrl);
    }
}