export type CasePreviewKind = 'subject' | 'environment'

export interface CasePresentation {
  assetUrl: string
  kind: CasePreviewKind
  fit: 'contain' | 'cover'
  position: string
  opacity: number
  tone: string
}

export interface PresentableCase {
  presentation?: CasePresentation
}

export const casePresentation = (entry: PresentableCase): CasePresentation | null => {
  const value = entry.presentation
  if (!value || !value.assetUrl.startsWith('/creative-assets/')) return null
  return value
}
