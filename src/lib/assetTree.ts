import type { ResourceOwnerAsset } from 'loama-controller';

export type AssetTreeNode = {
  id: string;
  url: string;
  label: string;
  depth: number;
  isContainer: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  asset?: ResourceOwnerAsset;
  targetId?: string;
  targetAliases: string[];
  children: AssetTreeNode[];
}

type FolderNode = AssetTreeNode & {
  isContainer: true;
}

export function buildAssetTree(assets: ResourceOwnerAsset[]): AssetTreeNode[] {
  const roots: AssetTreeNode[] = [];
  const folders = new Map<string, FolderNode>();
  const urlAssets: Array<{ asset: ResourceOwnerAsset; parsedUrl: URL; pathSegments: string[] }> = [];

  for (const asset of assets) {
    const assetUrl = getAssetResourceUrl(asset);

    if (!assetUrl) {
      roots.push(assetToNode(asset, asset._id, asset.description?.name || asset._id, 0));
      continue;
    }

    const parsedUrl = parseUrl(assetUrl);
    if (!parsedUrl) {
      roots.push(assetToNode(asset, asset._id, asset.description?.name || asset._id, 0));
      continue;
    }

    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0) {
      roots.push(assetToNode(asset, parsedUrl.toString().replace(/\/$/u, ''), parsedUrl.host, 0));
      continue;
    }

    urlAssets.push({ asset, parsedUrl, pathSegments });
  }

  for (const { parsedUrl, pathSegments } of urlAssets) {
    let siblings = roots;
    for (let index = 0; index < pathSegments.length - 1; index += 1) {
      const folderUrl = folderUrlFor(parsedUrl, pathSegments.slice(0, index + 1));
      let folder = folders.get(folderUrl);

      if (!folder) {
        folder = {
          id: `folder:${folderUrl}`,
          url: folderUrl,
          label: index === 0 ? folderUrl : pathSegments[index],
          depth: index,
          isContainer: true,
          isExpanded: true,
          isLoading: false,
          targetAliases: [],
          children: [],
        };
        folders.set(folderUrl, folder);
        siblings.push(folder);
      }

      siblings = folder.children;
    }
  }

  for (const { asset, parsedUrl, pathSegments } of urlAssets) {
    const folderUrl = folderUrlFor(parsedUrl, pathSegments);
    const matchingFolder = folders.get(folderUrl);

    if (matchingFolder) {
      attachAssetToNode(matchingFolder, asset);
      continue;
    }

    const siblings = pathSegments.length > 1
      ? folders.get(folderUrlFor(parsedUrl, pathSegments.slice(0, -1)))?.children ?? roots
      : roots;
    const leafLabel = pathSegments.at(-1) || asset.description?.name || asset._id;
    siblings.push(assetToNode(asset, parsedUrl.toString().replace(/\/$/u, ''), leafLabel, pathSegments.length - 1));
  }

  sortTree(roots);
  return roots;
}

export function flattenVisibleAssetTree(nodes: AssetTreeNode[]): AssetTreeNode[] {
  const result: AssetTreeNode[] = [];

  for (const node of nodes) {
    result.push(node);
    if (node.isContainer && node.isExpanded) {
      result.push(...flattenVisibleAssetTree(node.children));
    }
  }

  return result;
}

export function findFirstAssetNode(nodes: AssetTreeNode[]): AssetTreeNode | null {
  for (const node of nodes) {
    if (node.asset) return node;
    const childMatch = findFirstAssetNode(node.children);
    if (childMatch) return childMatch;
  }

  return null;
}

export function buildAssetLabelMap(assets: ResourceOwnerAsset[]): Map<string, string> {
  const labels = new Map<string, string>();

  for (const node of flattenVisibleAssetTree(buildAssetTree(assets))) {
    if (!node.targetId) continue;

    labels.set(node.targetId, node.label);
    for (const alias of node.targetAliases) {
      labels.set(alias, node.label);
    }
  }

  return labels;
}

function assetToNode(asset: ResourceOwnerAsset, url: string, label: string, depth: number): AssetTreeNode {
  return {
    id: `asset:${asset._id}:${url}`,
    url,
    label,
    depth,
    isContainer: false,
    isExpanded: false,
    isLoading: false,
    asset,
    targetId: asset._id,
    targetAliases: assetAliases(asset),
    children: [],
  };
}

function attachAssetToNode(node: AssetTreeNode, asset: ResourceOwnerAsset) {
  node.asset = asset;
  node.targetId = asset._id;
  node.targetAliases = assetAliases(asset, node.url);
}

function assetAliases(asset: ResourceOwnerAsset, nodeUrl?: string): string[] {
  const policyUri = asset.policy?.policy_uri;
  const resourceUrl = getAssetResourceUrl(asset);
  const nodeUrlWithoutTrailingSlash = nodeUrl?.replace(/\/$/u, '');

  return [
    asset._id,
    resourceUrl,
    resourceUrl?.replace(/\/$/u, ''),
    nodeUrl,
    nodeUrlWithoutTrailingSlash,
    policyUri,
  ].filter((value): value is string => Boolean(value));
}

function getAssetResourceUrl(asset: ResourceOwnerAsset): string | undefined {
  const description = asset.description ?? {};
  const candidates = [
    asset.url,
    asset.uri,
    asset.resource,
    asset.resource_url,
    asset.resource_uri,
    asset.resourceUrl,
    asset.resourceUri,
    description.url,
    description.uri,
    description.resource,
    description.resource_url,
    description.resource_uri,
    description.resourceUrl,
    description.resourceUri,
    asset._id,
  ];

  return candidates.find(isAbsoluteHttpUrl);
}

function isAbsoluteHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function folderUrlFor(url: URL, pathSegments: string[]): string {
  const folderUrl = new URL(url.origin);
  folderUrl.pathname = `${pathSegments.join('/')}/`;
  return folderUrl.toString();
}

function sortTree(nodes: AssetTreeNode[]) {
  nodes.sort((a, b) => {
    if (a.isContainer !== b.isContainer) return a.isContainer ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  for (const node of nodes) {
    sortTree(node.children);
  }
}
