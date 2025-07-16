import { Permission } from "../../types/";
import { IPolicy, ITarget } from "../../types/modules";
import { DataFactory, Parser, Store } from "n3";

const { namedNode } = DataFactory


export class PolicyParser {

    public constructor() { }

    private ODRL = (something: string) => namedNode(`http://www.w3.org/ns/odrl/2/${something}`);
    private fromODRL = (odrlString: string) => odrlString.split('/')[6];
    private defaultTarget = (uri: string): ITarget => ({ uri: uri, rules: new Set(), permissions: new Set(), policies: new Set() })


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
     * @param store the owned policies in a store
     */
    public ownedPoliciesToObject = (store: Store): ITarget[] => {

        // 1. Find every target
        const ruleTargetQuads = store.getQuads(null, this.ODRL('target'), null, null);

        // 2. Inspect the Rule of each target
        const idToTarget = new Map<string, ITarget>();
        for (const targetQuad of ruleTargetQuads) {
            const rule = targetQuad.subject;

            // Find out in what policy this rule occurs
            // Since a valid policy only has unique ID's, we can just search for '<policy> <relation> <rule> .' quads on the entire store
            const policyIDs: Set<string> = new Set();
            for (const relation of ['permission', 'prohibition', 'duty'].map(x => this.ODRL(x)))
                store.getQuads(null, relation, rule, null).forEach(res => policyIDs.add(res.subject.id));
            if (policyIDs.size !== 1)
                console.warn("Corrupted Policy");
            console.log(policyIDs)
            const policyId = [...policyIDs][0];

            // Get all quads of this rule
            const ruleStore = this.extractQuadsRecursive(store, rule.id);

            // Find all permission information
            const permissions = [];
            for (const quad of ruleStore.getQuads(null, this.ODRL('action'), null, null)) {
                // TODO: find a way to categorize all actions as one of the Permission types
                const action = this.fromODRL(quad.object.id).toLowerCase();
                console.log('action', action)

                switch (action) {
                    case "use":
                    case "play":
                    case "read":
                        permissions.push(Permission.Read);
                        break;

                    case "write":
                    case "update":
                        permissions.push(Permission.Write);
                        break;

                    case "append":
                        permissions.push(Permission.Append);
                        break;

                    case "control":
                    case "manage":
                        permissions.push(Permission.Control);
                        break;

                    default:
                        console.warn(`Unrecognized ODRL action: ${action}`);
                }

            }

            // For every target in this store, add the permissions
            for (const quad of ruleStore.getQuads(null, this.ODRL('target'), null, null)) {
                // If target id is not yet handled, set it to a default target object
                if (!idToTarget.has(quad.object.id))
                    idToTarget.set(quad.object.id, this.defaultTarget(quad.object.id));

                const targetObject = idToTarget.get(quad.object.id);

                permissions.forEach(p => targetObject?.permissions.add(p));
                targetObject?.rules.add(rule.id);
                targetObject?.policies.add(policyId);
            }
        }

        return Array.from(idToTarget.values());
    }
}