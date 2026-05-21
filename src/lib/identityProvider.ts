export function normalizeIdentityProviderUrl(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error('Identity provider URL is empty.');
  }

  const valueWithProtocol = /^[a-z][a-z\d+.-]*:\/\//iu.test(trimmedValue)
    ? trimmedValue
    : `${isLocalhostUrl(trimmedValue) ? 'http' : 'https'}://${trimmedValue}`;
  const issuerUrl = new URL(valueWithProtocol);

  if (issuerUrl.protocol !== 'http:' && issuerUrl.protocol !== 'https:') {
    throw new Error(`Unsupported identity provider protocol: ${issuerUrl.protocol}`);
  }

  issuerUrl.hash = '';
  issuerUrl.search = '';

  return issuerUrl.toString().replace(/\/$/u, '');
}

function isLocalhostUrl(value: string): boolean {
  const host = value.split('/')[0].split('?')[0].split('#')[0];

  return host === 'localhost' || host.startsWith('localhost:') || host === '127.0.0.1' || host.startsWith('127.0.0.1:');
}
