import { createBasicController, type IController, type PublicSubject, type WebIdSubject } from "loama-controller";
import { defineStore } from "pinia";

const defaultAuthorizationServer = 'http://localhost:4000/uma'

type ControllerType = 'drive' | 'odrl' | 'solid';
type Controller = IController<{ webId: WebIdSubject; public: PublicSubject }>
type ControllerConfiguration = string; // currently only the authorizationServerURL is passed for ODRL controllers
type ControllerFactory = (configuration: ControllerConfiguration) => Controller;

interface State {
    controllers: Map<ControllerType, ControllerFactory>; // map of type to factory
    currentController: Controller;
    currentControllerType: ControllerType;
    authorizationServerURL: string;
}

export const useControllerStore = defineStore("controller", {
    state: (): State => ({
        controllers: new Map([ 
            [ 'odrl', (authorizationServerURL: string) => createBasicController(authorizationServerURL) ],
        ]),
        currentController: createBasicController(defaultAuthorizationServer),
        currentControllerType: 'odrl',
        authorizationServerURL: defaultAuthorizationServer
    }),
    getters: {
        types(state) {
            return state.controllers.keys();
        },
        current(state): Controller {
            if (state.currentController) return state.currentController
            else throw new Error("No controller selected");
        },
        type(state) {
            return state.currentControllerType;
        },
        authorizationServer(state) {
            return state.authorizationServerURL;
        }
    },
    actions: {
        changeController(type: ControllerType, configuration: string) {
            if (this.controllers.has(type)) {
                this.currentControllerType = type;
                this.currentController = this.controllers.get(type)!(configuration);
            } else throw new Error(`No controller for type ${type} exists`);
        }
    }
});
