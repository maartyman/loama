import { configureDefaultAuth, getDefaultAuth } from 'trustflows-client';

configureDefaultAuth({
  fetch: globalThis.fetch.bind(globalThis),
  persistTokens: true
});

export const trustflowsAuth = getDefaultAuth();
export const trustflowsFetch = trustflowsAuth.createAuthFetch();

export function getClientIdUrl(): string {
  return import.meta.env.VITE_CLIENT_ID_URL || new URL('client-id.jsonld', window.location.origin + import.meta.env.BASE_URL).toString();
}

export function getRedirectUrl(path = 'home'): string {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return new URL(normalizedPath ? `${basePath}${normalizedPath}/` : basePath, window.location.origin).toString();
}
