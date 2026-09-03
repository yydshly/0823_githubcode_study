import {
  v3VerifiedDeliveryRegistrationSchema,
  type V3VerifiedDeliveryRegistration
} from './direct-creative-v3-archive-gate.ts';

/**
 * Protocol V3 deliveries are registered separately from the frozen V2.5
 * collection. Every entry carries its preferred medium and actual renderer so
 * archive consumers cannot silently substitute a different execution path.
 */
export const V3_VERIFIED_DELIVERIES: readonly V3VerifiedDeliveryRegistration[] = [
  v3VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    archiveGateVersion: 3,
    baselineVersion: '3.0',
    creativeProtocolVersion: 3,
    deliveryId: 'stormglass-archive',
    route: './deliveries/stormglass-archive/',
    evidencePath: 'docs/v2-research/evidence/r134-stormglass-archive.direct-creative-run.json',
    runId: 'direct-r134-stormglass-archive',
    bundleHash: 'b518d1bcaeb0c4f4cba2267e29716337e1b1d07e09d1ab9006a704dace474591',
    macroStructure: 'spatial-journey',
    mediumRoute: 'webgl-procedural',
    renderingMedium: 'webgl-shader'
  }),
  v3VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    archiveGateVersion: 3,
    baselineVersion: '3.0',
    creativeProtocolVersion: 3,
    deliveryId: 'prism-seed-theatre',
    route: './deliveries/prism-seed-theatre/',
    evidencePath: 'docs/v2-research/evidence/r135-prism-seed-theatre.direct-creative-run.json',
    runId: 'direct-r135-prism-seed-theatre',
    bundleHash: 'd4ebe575019203c7335541c30d22e750be9d64ddf1663e127740f1f55ac6f739',
    macroStructure: 'spatial-journey',
    mediumRoute: 'generated-image',
    renderingMedium: 'raster-image'
  }),
  v3VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    archiveGateVersion: 3,
    baselineVersion: '3.0',
    creativeProtocolVersion: 3,
    deliveryId: 'film-camera-repair-paths',
    route: './deliveries/film-camera-repair-paths/',
    evidencePath: 'docs/v2-research/evidence/r136a-film-camera-repair-paths.direct-creative-run.json',
    runId: 'direct-r136a-film-camera-repair-paths',
    bundleHash: 'f4c32fc7300996f0fac8c9afa82aeac0c8c01e721ff42cd1fb7c88d2a1838977',
    macroStructure: 'branching-confluence',
    mediumRoute: 'code-native',
    renderingMedium: 'svg'
  }),
  v3VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    archiveGateVersion: 3,
    baselineVersion: '3.0',
    creativeProtocolVersion: 3,
    deliveryId: 'west-bund-meeting-points',
    route: './deliveries/west-bund-meeting-points/',
    evidencePath: 'docs/v2-research/evidence/r136b-west-bund-meeting-points.direct-creative-run.json',
    runId: 'direct-r136b-west-bund-meeting-points',
    bundleHash: '8112989e87b0046a51b3b4420a12555d160b7590b3adf929d79105a3998037e3',
    macroStructure: 'horizontal-panorama',
    mediumRoute: 'grounded-real-media',
    renderingMedium: 'raster-image'
  }),
  v3VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    archiveGateVersion: 3,
    baselineVersion: '3.0',
    creativeProtocolVersion: 3,
    deliveryId: 'fox-gait-observatory',
    route: './deliveries/fox-gait-observatory/',
    evidencePath: 'docs/v2-research/evidence/r137-fox-gait-observatory.direct-creative-run.json',
    runId: 'direct-r137-fox-gait-observatory',
    bundleHash: '7b234dd7c3d49d642a974b7e6797fb47d14967f9a9f34b6d1c93664b1c9f83e6',
    macroStructure: 'spatial-inspection',
    mediumRoute: 'threejs-spatial',
    renderingMedium: 'threejs-3d'
  }),
  v3VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    archiveGateVersion: 3,
    baselineVersion: '3.0',
    creativeProtocolVersion: 3,
    deliveryId: 'ten-second-callsign-decode',
    route: './deliveries/ten-second-callsign-decode/',
    evidencePath: 'docs/v2-research/evidence/r139-ten-second-callsign-decode.direct-creative-run.json',
    runId: 'direct-r139-ten-second-callsign-decode',
    bundleHash: 'bb1cbb3a06ea697d4f5dd2f00761ac5c9e445d31bd7e173f6f8c7cb76ab833d6',
    macroStructure: 'editorial-flow',
    mediumRoute: 'code-native',
    renderingMedium: 'dom-css'
  }),
  v3VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    archiveGateVersion: 3,
    baselineVersion: '3.0',
    creativeProtocolVersion: 3,
    deliveryId: 'folded-light-studio',
    route: './deliveries/folded-light-studio/',
    evidencePath: 'docs/v2-research/evidence/r140-folded-light-studio.direct-creative-run.json',
    runId: 'direct-r140-folded-light-studio',
    bundleHash: '752235b5c5303e616318a484f632bcd7f037d0841bc28469f15b433527f37f24',
    macroStructure: 'spatial-journey',
    mediumRoute: 'generated-image',
    renderingMedium: 'raster-image'
  }),
  v3VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    archiveGateVersion: 3,
    baselineVersion: '3.0',
    creativeProtocolVersion: 3,
    deliveryId: 'same-table-tonight',
    route: './deliveries/same-table-tonight/',
    evidencePath: 'docs/v2-research/evidence/r141-same-table-tonight.direct-creative-run.json',
    runId: 'direct-r141-same-table-tonight',
    bundleHash: '7c0783b971046e4a3d1aea74c2eca6c29d8d883b3abffb710917b3d654277666',
    macroStructure: 'editorial-flow',
    mediumRoute: 'generated-image',
    renderingMedium: 'raster-image'
  }),
  v3VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    archiveGateVersion: 3,
    baselineVersion: '3.0',
    creativeProtocolVersion: 3,
    deliveryId: 'modular-room-sound',
    route: './deliveries/modular-room-sound/',
    evidencePath: 'docs/v2-research/evidence/r142-modular-room-sound.direct-creative-run.json',
    runId: 'direct-r142-modular-room-sound',
    bundleHash: 'd652cca11f053aeb4879c33cd9f1a003e248b523a245f73e48bb872a0a0ff4a0',
    macroStructure: 'spatial-inspection',
    mediumRoute: 'threejs-spatial',
    renderingMedium: 'threejs-3d'
  }),
  v3VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    archiveGateVersion: 3,
    baselineVersion: '3.0',
    creativeProtocolVersion: 3,
    deliveryId: 'fridge-tonight',
    route: './deliveries/fridge-tonight/',
    evidencePath: 'docs/v2-research/evidence/r143-fridge-tonight.direct-creative-run.json',
    runId: 'direct-r143-fridge-tonight',
    bundleHash: 'c91dbd26982c8d8eddf7007c8ed1cf4fd162dd7cd92e568197774542221828b1',
    macroStructure: 'editorial-flow',
    mediumRoute: 'code-native',
    renderingMedium: 'dom-css'
  }),
  v3VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    archiveGateVersion: 3,
    baselineVersion: '3.0',
    creativeProtocolVersion: 3,
    deliveryId: 'eclipse-post-office',
    route: './deliveries/eclipse-post-office/',
    evidencePath: 'docs/v2-research/evidence/r149-eclipse-post-office.direct-creative-run.json',
    runId: 'direct-r149-eclipse-post-office',
    bundleHash: '8b33a2fbb920fbf3a62c325b8fd809edad21201c64c8583f9b5a16009f5d4ea8',
    macroStructure: 'spatial-journey',
    mediumRoute: 'generated-image',
    renderingMedium: 'raster-image'
  })
];
