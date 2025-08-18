/**
 * This script serves to solve the cold start problem for LOAMA.
 * It is equivalent to a series of configurable cURL requests being sent towards the UMA AMA server
 * and thus entirely based on the examples provided in [the policy management endpoint documentation](https://github.com/SolidLabResearch/user-managed-access/blob/feat/policy-endpoint/documentation/policy-management.md)
 */

async function main() {
    // ask for user's webid
    const webid = "https://solidweb.me/harrypodder/profile/card#me";

    // collect input from user:
    //  - policy name
    const policyName = "policy";
    //  - permission name
    const permissionName = "permission"
    //  - action
    const action = "read";
    //  - target
    const target = "http://localhost:3000/harry/podder/resource.txt";
    //  - assignee
    const assignee = "https://example.pod.knows.idlab.ugent.be/profile/card#me";
    //  - assigner is just the WebID of the user
    const assigner = webid;
    
    const body = `@prefix ex: <http://example.org/>.
    @prefix odrl: <http://www.w3.org/ns/odrl/2/>.
    @prefix dct: <http://purl.org/dc/terms/> .
    
    ex:${policyName} a odrl:Agreement .
    ex:${policyName} odrl:permission ex:${permissionName} .

    ex:${permissionName} a odrl:Permission .
    ex:${permissionName} odrl:action odrl:${action} .
    ex:${permissionName} odrl:target <${target}> .
    ex:${permissionName} odrl:assignee <${assignee}> .
    ex:${permissionName} odrl:assigner <${assigner}> .`

    // setup fetch request
    const response = await fetch('http://localhost:4000/uma/policies', {
        method: 'POST',
        headers: {
            'Authorization': webid,
            'Content-Type': 'text/turtle'
        },
        body: body
    });

    // handle errors
    console.log(response.ok);
}

main();
