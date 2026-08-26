import { assetProductionReportSchema, type AssetProductionReport, type AssetProductionRequest } from './asset-production';

export async function requestAssetProduction(request: AssetProductionRequest): Promise<AssetProductionReport> {
  const response = await fetch('/api/creative/assets/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  const body = await response.json() as { report?: unknown; error?: string };
  if (!response.ok || !body.report) throw new Error(body.error || `素材服务返回 HTTP ${response.status}`);
  return assetProductionReportSchema.parse(body.report);
}
