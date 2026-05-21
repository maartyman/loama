import {
  createBasicController,
  type IController,
  type PublicSubject,
  type WebIdSubject
} from 'loama-controller'
import { defineStore } from 'pinia'

const defaultAuthorizationServer = 'http://localhost:4000/uma'
const controllerSettingsStorageKey = 'loama.controller-settings'

type ControllerType = 'drive' | 'odrl' | 'solid'
type Controller = IController<{ webId: WebIdSubject; public: PublicSubject }>
type ControllerConfiguration = string // currently only the authorizationServerURL is passed for ODRL controllers
type ControllerFactory = (configuration: ControllerConfiguration) => Controller

type StoredControllerSettings = {
  authorizationServerURL: string
  currentControllerType: ControllerType
  isManuallyConfigured: boolean
}

interface State {
  controllers: Map<ControllerType, ControllerFactory> // map of type to factory
  currentController: Controller
  currentControllerType: ControllerType
  authorizationServerURL: string
  isManuallyConfigured: boolean
}

const defaultControllerSettings: StoredControllerSettings = {
  authorizationServerURL: defaultAuthorizationServer,
  currentControllerType: 'odrl',
  isManuallyConfigured: false
}

function loadControllerSettings(): StoredControllerSettings {
  if (typeof window === 'undefined') return defaultControllerSettings

  const rawSettings = window.localStorage.getItem(controllerSettingsStorageKey)
  if (!rawSettings) return defaultControllerSettings

  try {
    const parsedSettings = JSON.parse(rawSettings) as Partial<StoredControllerSettings>
    return {
      authorizationServerURL: parsedSettings.authorizationServerURL || defaultAuthorizationServer,
      currentControllerType: parsedSettings.currentControllerType || 'odrl',
      isManuallyConfigured: parsedSettings.isManuallyConfigured ?? false
    }
  } catch {
    return defaultControllerSettings
  }
}

export const useControllerStore = defineStore('controller', {
  state: (): State => {
    const savedSettings = loadControllerSettings()

    return {
      controllers: new Map([
        ['odrl', (authorizationServerURL: string) => createBasicController(authorizationServerURL)]
      ]),
      currentController: createBasicController(savedSettings.authorizationServerURL),
      currentControllerType: savedSettings.currentControllerType,
      authorizationServerURL: savedSettings.authorizationServerURL,
      isManuallyConfigured: savedSettings.isManuallyConfigured
    }
  },
  getters: {
    types(state) {
      return state.controllers.keys()
    },
    current(state): Controller {
      if (state.currentController) return state.currentController
      else throw new Error('No controller selected')
    },
    type(state) {
      return state.currentControllerType
    },
    authorizationServer(state) {
      return state.authorizationServerURL
    },
    manuallyConfigured(state) {
      return state.isManuallyConfigured
    }
  },
  actions: {
    persistSettings() {
      if (typeof window === 'undefined') return

      const settings: StoredControllerSettings = {
        authorizationServerURL: this.authorizationServerURL,
        currentControllerType: this.currentControllerType,
        isManuallyConfigured: this.isManuallyConfigured
      }

      window.localStorage.setItem(controllerSettingsStorageKey, JSON.stringify(settings))
    },
    applyController(type: ControllerType, configuration: string, isManuallyConfigured: boolean) {
      if (this.controllers.has(type)) {
        this.authorizationServerURL = configuration
        this.currentControllerType = type
        this.currentController = this.controllers.get(type)!(configuration)
        this.isManuallyConfigured = isManuallyConfigured
        this.persistSettings()
      } else throw new Error(`No controller for type ${type} exists`)
    },
    changeController(type: ControllerType, configuration: string) {
      this.applyController(type, configuration, true)
    },
    autoConfigureController(type: ControllerType, configuration: string) {
      this.applyController(type, configuration, false)
    }
  }
})
