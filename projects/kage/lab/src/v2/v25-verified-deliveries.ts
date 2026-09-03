import {
  v25VerifiedDeliveryRegistrationSchema,
  type V25VerifiedDeliveryRegistration
} from './direct-creative-archive-gate.ts';

export const V25_VERIFIED_DELIVERIES: readonly V25VerifiedDeliveryRegistration[] = [
  v25VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    baselineVersion: '2.5',
    deliveryId: 'ice-core-letters',
    route: './deliveries/ice-core-letters/',
    evidencePath: 'docs/v2-research/evidence/r125-ice-core-letters.direct-creative-run.json',
    runId: 'direct-r125-ice-core-letters',
    bundleHash: 'de2fe28ea88ca9d6c238947c634ccbe92f11793422c31f448c2c310d0a94f031',
    macroStructure: 'spatial-journey'
  }),
  v25VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    baselineVersion: '2.5',
    deliveryId: 'roof-water-route',
    route: './deliveries/roof-water-route/',
    evidencePath: 'docs/v2-research/evidence/r127-roof-water-route.direct-creative-run.json',
    runId: 'direct-r127-roof-water-route',
    bundleHash: 'c41783ee2c07301fd996e92dd300618c9c019a93f74c358c8a0f36c8cb6effce',
    macroStructure: 'spatial-journey'
  }),
  v25VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    baselineVersion: '2.5',
    deliveryId: 'night-reflective-catalog',
    route: './deliveries/night-reflective-catalog/',
    evidencePath: 'docs/v2-research/evidence/r128-night-reflective-catalog.direct-creative-run.json',
    runId: 'direct-r128-night-reflective-catalog',
    bundleHash: 'ef0ae71482af63a997095d6398b03f806833a418593d1ac46b8d0e709faca379',
    macroStructure: 'catalog'
  }),
  v25VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    baselineVersion: '2.5',
    deliveryId: 'color-relay-branching',
    route: './deliveries/color-relay-branching/',
    evidencePath: 'docs/v2-research/evidence/r129-color-relay-branching.direct-creative-run.json',
    runId: 'direct-r129-color-relay-branching',
    bundleHash: '1ccc53197308a7f6411a1157774b65980284dab773c50c8189f7210195c7e2cc',
    macroStructure: 'branching-confluence'
  }),
  v25VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    baselineVersion: '2.5',
    deliveryId: 'forest-sound-route',
    route: './deliveries/forest-sound-route/',
    evidencePath: 'docs/v2-research/evidence/r131-forest-sound-route.direct-creative-run.json',
    runId: 'direct-r131-forest-sound-route',
    bundleHash: '2a8112069032c41fa4ecdc12fc90e981fa0adf14be73e9a53ca1dd22cb4b0906',
    macroStructure: 'single-stage'
  }),
  v25VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    baselineVersion: '2.5',
    deliveryId: 'moonlit-tidepool-panorama',
    route: './deliveries/moonlit-tidepool-panorama/',
    evidencePath: 'docs/v2-research/evidence/r132-moonlit-tidepool-panorama.direct-creative-run.json',
    runId: 'direct-r132-moonlit-tidepool-panorama',
    bundleHash: 'afd279d0604da135c9b764feb3f987ee086f67525685a56f040bf9e293a43026',
    macroStructure: 'horizontal-panorama'
  })
];
