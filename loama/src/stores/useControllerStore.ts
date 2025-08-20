import { createBasicController, type IController, type PublicSubject, type WebIdSubject } from "loama-controller";
import { defineStore } from "pinia";

// This store holds all references to the controller the application needs.
// It holds a mapping of controller types to their respective controller.
// ATM it only holds one: specifically for ODRL.

// perhaps it would be wiser to make some enumeration of all supported AS types
export const useControllerStore = defineStore("controller", {
    state: () => ({
        controller: createBasicController() as IController<{ webId: WebIdSubject; public: PublicSubject }>,
        controllers: new Map<string, IController<{ webId: WebIdSubject; public: PublicSubject }>>([
            ["odrl", createBasicController()]
        ])
    }),
    getters: {
        currentController(state) {
            return state.controller;
        }
    },
    actions: {
        // switches the current controller out with the requested AS type controller
        switchTo(type: string) {
            if (this.controllers.has(type)) this.controller = this.controllers.get(type)!;
            else throw new Error("unrecognized AS type provided");
        }
    }
});
