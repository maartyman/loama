import { getDefaultSession } from "@inrupt/solid-client-authn-browser";
import { Permission } from "../../types/";
import { UMA_URL } from "../permissionManager/inrupt";
import { ODRL, PolicyParser } from "./PolicyParser";
import { DataFactory, Writer } from "n3"
const { namedNode } = DataFactory

export class PolicyEditor {
    constructor() { }

    private getRandomString(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            const randIndex = Math.floor(Math.random() * chars.length);
            result += chars[randIndex];
        }
        return result;
    }


    /**
     * Function to insert an action rule for each permission in the provided array. They will be inserted in a new policy, via POST and not PATCH.
     */
    public async insertActionRule(targetId: string, actions: Permission[], assignee: string = ""): Promise<void> {
        const webId = getDefaultSession().info.webId!

        const policyId: string = `http://example.org/policy${this.getRandomString(20)}`;

        for (const action of actions) {
            // We need a proper way to create new rules, probably better server side?
            const ruleId = `http://example.org/rule${this.getRandomString(20)}`;

            // Define the new triples in the rule
            const actionTriple = `odrl:action odrl:${action.toLowerCase()} ;`;
            const assigneeTriple = assignee
                ? `odrl:assignee <${assignee}> ;`
                : "";

            // The response contains the full and updated version of the policy, which we cannot return in this interface
            const response = await fetch(UMA_URL(/*`/${encodeURIComponent(policyId)}`*/), {
                method: 'POST',
                headers: {
                    'Authorization': webId,
                    'Content-type': 'text/turtle'
                    // 'Content-type': 'application/sparql-update'
                },
                // We need to make sure there's no way to have any injection...
                body: `@prefix odrl: <http://www.w3.org/ns/odrl/2/> .

<${policyId}> a odrl:Agreement ;
    odrl:permission <${ruleId}> .

<${ruleId}> a odrl:Permission ;
    odrl:target <${targetId}> ;
    ${actionTriple}
    ${assigneeTriple}
    odrl:assigner <${webId}> .
`
                // PATCH way of doing this
                //                 `PREFIX odrl: <http://www.w3.org/ns/odrl/2/>
                // INSERT {
                //     <${policyId}> odrl:permission <${ruleId}> .
                //     <${ruleId}> a odrl:Permission ;
                //             odrl:assigner <${webId}> ;
                //             odrl:target <${targetId}> .
                //     ${actionTriples}
                //     ${assigneeTriple}
                // }
                // WHERE {}`
            })
        }
    }

    /**
     * Funcion that searches every owned rule by the logged on client, finds the target 
     * of an assigner and deletes the actions on it
     */
    public async deleteActionRule(targetId: string, actions: Permission[], assignee: string = ""): Promise<void> {
        const session = getDefaultSession();
        const webId = session.info.webId!;

        // 1: Fetch the policy contents
        const response = await fetch(UMA_URL(), {
            headers: {
                Authorization: webId,
                Accept: "text/turtle"
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch policy: ${response.status}`);
        }

        const turtleText = await response.text();

        // 2: Parse into store
        const parser = new PolicyParser();
        const store = parser.parseText(turtleText);

        // 3: Find all rules with our target
        const targetRules = store.getQuads(null, ODRL("target"), namedNode(targetId), null);

        const policyIds = new Set<string>();
        targetRules.forEach(
            // Filter only the targets that have rules with us as assignee, or public if no assignee
            target => {
                // Search the rule of the target, and then the policy of the rule, only for permission (for now)
                console.log("target to be checked: ", target)
                const rule = target.subject;
                console.log("rule to be checked: ", rule.id)
                const matches = store.getQuads(null, ODRL("permission"), rule, null);
                if (matches.length === 0)
                    console.warn("out of bounds rule");
                const policyId = matches[0].subject.id;

                console.log(policyId)

                // We now have the policies that have our target, check if our assignee has an action to delete here
                if (assignee === "") {
                    // If no assignee specified, the rule is public and it has an action to be deleted, select it
                    if (store.getQuads(rule, ODRL("assignee"), null, null).length === 0) {
                        for (const action of actions)
                            if (store.getQuads(rule, ODRL("action"), ODRL(action.toLowerCase()), null).length > 0)
                                policyIds.add(policyId)
                    }
                } else {
                    // Do the same, with a check if the assignee is correct
                    if (store.getQuads(rule, ODRL("assignee"), namedNode(assignee), null).length >= 1) {
                        for (const action of actions) {
                            console.log(new Writer().quadsToString(store.getQuads(rule, ODRL("action"), ODRL(action.toLowerCase()), null)))
                            if (store.getQuads(rule, ODRL("action"), ODRL(action.toLowerCase()), null).length > 0)
                                policyIds.add(policyId)
                        }

                    }
                }
            }
        )

        // 4: Delete the rule that has the matching target and permission for the matching assignee
        for (const policyId of policyIds) {
            for (const action of actions) {
                const deleteResponse = await fetch(UMA_URL(`/${encodeURIComponent(policyId)}`), {
                    method: "PATCH",
                    headers: {
                        'Authorization': webId,
                        'Content-type': 'application/sparql-update',
                    },
                    body: `
    PREFIX odrl: <http://www.w3.org/ns/odrl/2/>

    DELETE {
    ?rule ?p ?o .
    <${policyId}> odrl:permission ?rule .
    }
    WHERE {
    ?rule odrl:action odrl:${action.toLowerCase()} .
    ?rule odrl:assigner <${webId}> .
    ?rule odrl:target <${targetId}> .

    ${assignee
                            ? `?rule odrl:assignee <${assignee}> .`
                            : `FILTER NOT EXISTS { ?rule odrl:assignee ?anyAssignee . }`}

    ?policy odrl:permission ?rule .
    }

                    `
                });

                if (!deleteResponse.ok) {
                    throw new Error(`Policy deletion failed: ${deleteResponse.status}`);
                }
            }
        }
    }
}