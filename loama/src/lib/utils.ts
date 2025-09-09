import { Permission } from "loama-controller";

export const uriToName = (uri: string, isContainer: boolean) => {
    const splitted = uri.split('/');

    return isContainer ? splitted[splitted.length - 2] : splitted[splitted.length - 1];
}

export const debounce = (fn: Function, wait: number) => {
    let timer: NodeJS.Timeout;
    return function (...args: any[]) {
        if (timer) {
            clearTimeout(timer); // clear any pre-existing timer
        }
        // @ts-expect-error this is the current context
        const context = this; // get the current context
        timer = setTimeout(() => {
            fn.apply(context, args); // call the function if time expires
        }, wait);
    }
}

export const allPermissions = [
    Permission.Read,
    Permission.Write,
    Permission.Append,
    Permission.Control,
    Permission.Create,
];

export interface AccessRequest {
    uid: string
    target: string,
    action: string,
    requestingParty: string,
    status: string,
}

// TODO: create functions to transfer between `Store`s from n3js and the interface above
// TODO: make sure all code here is placed in the appropriate files

export const request: AccessRequest = {
    uid: "http://example.org/request",
    target: "http://localhost:3000/resources/resource.txt",
    action: "odrl:read",
    requestingParty: "https://solidweb.me/harrypodder/profile/card#me",
    status: "ex:requested"
}

export const acceptedRequest: AccessRequest = {
    uid: "http://example.org/acceptedRequest",
    target: "http://localhost:3000/resources/accepted_resource.txt",
    action: "odrl:read",
    requestingParty: "https://solidweb.me/harrypodder/profile/card#me",
    status: "ex:accepted"
}

export const deniedRequest: AccessRequest = {
    uid: "http://example.org/deniedRequest",
    target: "http://localhost:3000/resources/denied_resource.txt",
    action: "odrl:read",
    requestingParty: "https://solidweb.me/harrypodder/profile/card#me",
    status: "ex:denied"
}

