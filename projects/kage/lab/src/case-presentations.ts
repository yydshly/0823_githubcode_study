export type CasePreviewKind = 'subject' | 'environment'

export interface CasePresentation {
  assetUrl: string
  kind: CasePreviewKind
  fit: 'contain' | 'cover'
  position: string
  opacity: number
  tone: string
}

const presentations: Record<string, CasePresentation> = {
  'dedicated-ba4e9d10caaa-depth-field': {
    assetUrl: '/creative-assets/fashion-fluid-couture-cutout-v2.png',
    kind: 'subject',
    fit: 'contain',
    position: '82% 50%',
    opacity: 0.92,
    tone: 'radial-gradient(circle at 78% 35%, #493a66 0%, #191321 45%, #09080d 100%)',
  },
  'dedicated-r36-delivery-final': {
    assetUrl: '/creative-assets/biomaterial-mature-greenhouse-v1.png',
    kind: 'environment',
    fit: 'cover',
    position: '64% 50%',
    opacity: 0.86,
    tone: 'linear-gradient(135deg, #10231c 0%, #172b23 46%, #080e0c 100%)',
  },
  'dedicated-896cfb7e6657': {
    assetUrl: '/creative-assets/observatory-approach-v1.png',
    kind: 'environment',
    fit: 'cover',
    position: '66% 48%',
    opacity: 0.88,
    tone: 'linear-gradient(135deg, #31343b 0%, #5e655f 50%, #15191d 100%)',
  },
  'dedicated-1edb98865f4c': {
    assetUrl: '/creative-assets/acoustic-resonance-instrument-v1.png',
    kind: 'subject',
    fit: 'contain',
    position: '81% 52%',
    opacity: 0.94,
    tone: 'radial-gradient(circle at 79% 48%, #384c48 0%, #12201e 48%, #080d0c 100%)',
  },
  'dedicated-1b9f0b05107b': {
    assetUrl: '/creative-assets/rain-window-environment-v1.png',
    kind: 'environment',
    fit: 'cover',
    position: '58% 50%',
    opacity: 0.88,
    tone: 'linear-gradient(135deg, #111b20 0%, #344650 52%, #0c1418 100%)',
  },
  'dedicated-8574ee46ab16': {
    assetUrl: '/creative-assets/dream-room-awakening-v1.png',
    kind: 'environment',
    fit: 'cover',
    position: '64% 50%',
    opacity: 0.82,
    tone: 'linear-gradient(135deg, #272624 0%, #626056 52%, #171715 100%)',
  },
}

export const casePresentation = (caseId: string): CasePresentation | null => presentations[caseId] ?? null

export const CASE_PRESENTATION_IDS = Object.freeze(Object.keys(presentations))
