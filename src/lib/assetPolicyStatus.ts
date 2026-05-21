import type { IPolicy } from 'loama-controller';
import type { AssetTreeNode } from '@/lib/assetTree';

export function hasConfiguredPolicy(node: AssetTreeNode, policies: IPolicy[]): boolean {
  if (!node.targetAliases.length) return false;

  return policies.some((policy) =>
    policy.rules.some((rule) =>
      rule.targets.some((target) => node.targetAliases.includes(target) || node.targetAliases.includes(target.replace(/\/$/u, '')))
    )
  );
}

export function assetPolicyStatus(node: AssetTreeNode, policies: IPolicy[]): string | null {
  if (!node.asset) return null;
  if (hasConfiguredPolicy(node, policies)) return 'configured';

  return node.asset.policy?.status ?? (node.asset.is_new ? 'missing' : null);
}

export function assetPolicyStatusClass(status: string | null): string {
  return status === 'configured' ? 'configured' : 'needs-policy';
}
