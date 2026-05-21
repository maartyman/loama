import { getDefaultSession } from '@inrupt/solid-client-authn-browser';
import { trustflowsAuth } from '@/lib/trustflowsAuth';

export function getAuthenticatedWebId(): string {
    const webId = trustflowsAuth.webId ?? getDefaultSession().info.webId;

    if (!webId) {
        throw new Error('User not logged in');
    }

    return webId;
}

export async function getBearerAuthorizationHeader(): Promise<string> {
    await trustflowsAuth.ensureValidToken();

    if (!trustflowsAuth.accessToken) {
        throw new Error('User not logged in');
    }

    return `Bearer ${trustflowsAuth.accessToken}`;
}
