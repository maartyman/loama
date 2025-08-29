import { ODRLController } from "./classes/OdrlController";
import { PublicManager } from "./classes/permissionManager/odrl/PublicManager";
import { WebIdManager } from "./classes/permissionManager/odrl/WebIdManager";
import { InruptInboxStore } from "./classes/stores/InruptInboxStore";
import { InruptStore } from "./classes/stores/InruptStore";
import { PublicResolver } from "./classes/subjectResolvers/Public";
import { WebIdResolver } from "./classes/subjectResolvers/WebId";
import { PublicSubject, WebIdSubject } from "./types/subjects";

export const createBasicController = (authorizationServerURL: string) => {
    return new ODRLController<{
        webId: WebIdSubject,
        public: PublicSubject,
    }>(
        InruptStore,
        InruptInboxStore,
        {
            webId: {
                resolver: new WebIdResolver(),
                manager: new WebIdManager(authorizationServerURL)
            },
            public: {
                resolver: new PublicResolver(),
                manager: new PublicManager(authorizationServerURL),
            },
        }
    )
}
