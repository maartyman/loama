import { createBasicController, type IController, type PublicSubject, type WebIdSubject } from "loama-controller";
import { defineStore } from "pinia";

type ControllerType = 'drive' | 'odrl' | 'solid';
type Controller = IController<{ webId: WebIdSubject; public: PublicSubject }>

interface State {
    controllers: Map<ControllerType, Controller>;
    currentControllerType: ControllerType;
    authorizationServerURL: string;
}

export const useControllerStore = defineStore("controller", {
    state: (): State => ({
        controllers: new Map([ 
            [ 'odrl', createBasicController() ],
        ]),
        currentControllerType: 'odrl',
        authorizationServerURL: 'http://localhost:4000/'
    }),
    getters: {
        types(state) {
            return state.controllers.keys();
        },
        current(state): Controller {
            if (state.controllers.has(state.currentControllerType)) 
                return state.controllers.get(state.currentControllerType)!;
            else throw new Error("No controller selected");
        },
        type(state) {
            return state.currentControllerType;
        },
        authorizationServer(state) {
            return state.authorizationServerURL;
        }
    }
});
