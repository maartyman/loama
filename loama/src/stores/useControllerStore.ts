import { createBasicController } from "loama-controller";
import { defineStore } from "pinia";

// This store holds all references to the controller the application needs.
// It holds a mapping of controller types to their respective controller.
// ATM it only holds one: specifically for ODRL
export const useControllerStore = defineStore("controller", {
    state: () => ({
        controller: createBasicController(),
    }),
    getters: {
        currentController(state) {
            return state.controller;
        }
    }
});
