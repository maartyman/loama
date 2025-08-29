/**
 * This script serves to solve the cold start problem for LOAMA.
 * It is equivalent to a series of configurable cURL requests being sent towards the UMA AMA server
 * and thus entirely based on the examples provided in [the policy management endpoint documentation](https://github.com/SolidLabResearch/user-managed-access/blob/feat/policy-endpoint/documentation/policy-management.md)
 */

import { Permission } from "../controller/src/types";
import { v4 as uuidv4 } from 'uuid';
import * as readline from 'node:readline';

const defaultAssignee = "https://example.pod.knows.idlab.ugent.be/profile/card#me"

const getRandomName = () => uuidv4();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askBasicQuestion = async (question: string) => {
    return new Promise((resolve) => {
        rl.question(question, (answer: string) => resolve(answer));
    });
}

const askWebId = async () => askBasicQuestion('Please provide your own WebID for authorization: ');
const askPolicyName = async () => askBasicQuestion('What do you want to name your policy? ');
const askRuleName = async () => askBasicQuestion('What do you want your rule to be named? ');
const askTargetURL = async () => askBasicQuestion('Please enter the URL to the resource: ');
const askAssigneeId = async () => askBasicQuestion(`Please provide the WebID for the assignee (default: ${defaultAssignee}): `);

const selectAction = () => {
    return new Promise((resolve, reject) => {
        rl.question(
            'What action do you want to associate? Choose one below: \n\t- read    [1]\n\t- write   [2]\n\t- append  [3]\n\t- create  [4]\n\t- control [5]\ndefault is read [1]',
            (answer) => {
                let choice = parseInt(answer, 10);
                if (choice < 1 || choice > 5) reject("No valid option provided");

                let permission: Permission;
                
                switch (choice) {
                    case 1 : { 
                        permission = Permission.Read;
                        break;
                    } case 2 : {
                        permission = Permission.Write;
                        break;
                    } case 3 : {
                        permission = Permission.Append;
                        break;
                    } case 4 : {
                        permission = Permission.Create;
                        break;
                    } case 5 : {
                        permission = Permission.Control;
                        break;
                    } default : {
                        permission = Permission.Read;
                        break;
                    }
                }

                resolve(permission.toLowerCase());
            }
        );
    });
}

const main = async () => {
    console.log("To use default ENV vars, leave empty.")
    
    // ask user for webid, policy and rule names, target, associated action and assignee
    const webid = await askWebId() || process.env.ASSIGNER_IRI;
    const policy = await askPolicyName() || getRandomName();
    const rule = await askRuleName() || getRandomName();
    const action = await selectAction();
    const target = await askTargetURL();
    const assignee = await askAssigneeId() || defaultAssignee;
    rl.close();

    // make POST request to the API
    const body = `
        @prefix ex: <http://example.org/>.
        @prefix odrl: <http://www.w3.org/ns/odrl/2/> .
        @prefix dct: <http://purl.org/dc/terms/>.

        ex:${policy} a odrl:Agreement ;
                     odrl:uid ex:${policy} ;
                     odrl:permission ex:${rule} .
        ex:${rule} a odrl:Permission ;
                   odrl:action odrl:${action} ;
                   odrl:target <${target}> ;
                   odrl:assignee <${assignee}> ;
                   odrl:assigner <${webid}> .
    `

    console.log(`\nPOST request with body\n${body}`);

    const response = await fetch(`${process.env.AUTHORIZATION_SERVER}/uma/policies`, {
        method: 'POST',
        headers: {
            'Authorization': `${webid}`,
            'Content-Type': 'text/turtle'
        },
        body: body
    });

    if (response.ok) {
        console.log('Policy added succesfully');
    } else {
        console.log('Something went wrong! Try again.', response.status);
    }
}

main()
