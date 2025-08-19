/**
 * This script serves to solve the cold start problem for LOAMA.
 * It is equivalent to a series of configurable cURL requests being sent towards the UMA AMA server
 * and thus entirely based on the examples provided in [the policy management endpoint documentation](https://github.com/SolidLabResearch/user-managed-access/blob/feat/policy-endpoint/documentation/policy-management.md)
 */

import { Permission } from "../controller/dist/types";
import * as readline from 'node:readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askBasicQuestion = (question: string) => {
    return new Promise((resolve) => {
        rl.question(question, (answer: string) => resolve(answer));
    });
}

const askWebId = () => askBasicQuestion('Please provide your own WebID for authorization: ');
const askPolicyName = () => askBasicQuestion('What do you want to name your policy? ');
const askRuleName = () => askBasicQuestion('What do you want your rule to be named? ');
const askTargetURL = () => askBasicQuestion('Please enter the URL to the resource: ')
const askAssigneeId = () => askBasicQuestion('Please provide the WebID for the assignee: ');

const selectAction = () => {
    return new Promise((resolve, reject) => {
        rl.question(
            'What action do you want to associate? Choose one below: \n\t- read    [1]\n\t- write   [2]\n\t- append  [3]\n\t- create  [4]\n\t- control [5]\n',
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
    // ask user for webid, policy and rule names, target, associated action and assignee
    const webid = await askWebId();
    const policy = await askPolicyName();
    const rule = await askRuleName();
    const action = await selectAction();
    const target = await askTargetURL();
    const assignee = await askAssigneeId();
    rl.close();

    // make POST request to the API
    const body = `@prefix ex: <http://example.org/>.
        @prefix odrl: <http://www.w3.org/ns/odrl/2/> .
        @prefix dct: <http://purl.org/dc/terms/>.

        ex:${policy} a odrl:Agreement .
        ex:${policy} odrl:permission ex:${rule} .
        ex:${rule} a odrl:Permission .
        ex:${rule} odrl:action odrl:${action} .
        ex:${rule} odrl:target <${target}> .
        ex:${rule} odrl:assignee <${assignee}> .
        ex:${rule} odrl:assigner <${webid}> .'
    `

    const response = await fetch('http://localhost:4000/uma/policies', {
        method: 'POST',
        headers: {
            'Authorization': `${webid}`,
            'Content-Type': 'text/turtle'
        }
    });

    if (response.ok) {
        console.log('Policy added succesfully');
    } else {
        console.log('Something went wrong! Try again.');
    }
}

main()
