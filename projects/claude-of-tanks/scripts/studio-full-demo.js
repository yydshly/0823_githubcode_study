(async () => {
  const studio = window.__STUDIO;
  if (!studio) throw new Error('Scene Studio API is unavailable');

  await studio.load({
    map: 'desert',
    seed: 8242026,
    actors: [
      {
        id: 't90m',
        name: 'red-lead',
        pos: [-12, -26],
        facingDeg: 28,
        turretDeg: -12,
        gunDeg: 2,
        camo: 'desert',
        state: 'intact',
      },
      {
        id: 'm1a2',
        name: 'blue-lead',
        pos: [14, 20],
        facingDeg: 206,
        turretDeg: 16,
        gunDeg: 1,
        camo: 'merdc',
        state: 'engine-smoking',
      },
    ],
    effects: [
      {
        type: 'fire',
        actor: 'red-lead',
        tMs: 900,
        params: { slot: 0, tracer: true, recoil: true },
      },
      {
        type: 'impact',
        actor: 'blue-lead',
        tMs: 1800,
        params: { kind: 'era', caliberMm: 125 },
      },
      {
        type: 'detrack',
        actor: 'blue-lead',
        tMs: 3100,
        params: { side: 'L' },
      },
      {
        type: 'tank_kill',
        actor: 'blue-lead',
        tMs: 5200,
        params: { cause: 'ammorack', pop: true },
      },
      {
        type: 'dust',
        actor: 'red-lead',
        tMs: 0,
        params: { count: 18, intensity: 1, dirDeg: 28 },
      },
    ],
    storyboard: {
      version: 1,
      durationMs: 8000,
      shots: [
        {
          id: 'wide',
          label: 'Establishing',
          tMs: 0,
          pos: [34, 11, -46],
          lookAt: [0, 2, 0],
          fov: 45,
          transition: 'smooth',
        },
        {
          id: 'impact',
          label: 'Impact',
          tMs: 4200,
          pos: [23, 5, 28],
          lookAt: [11, 2, 18],
          fov: 34,
          transition: 'cut',
        },
      ],
      actorTracks: [
        {
          actor: 'red-lead',
          keys: [
            {
              id: 'red-start',
              tMs: 0,
              pos: [-12, -26],
              facingDeg: 28,
              turretDeg: -12,
              gunDeg: 2,
              transition: 'smooth',
            },
            {
              id: 'red-end',
              tMs: 6200,
              pos: [-2, -8],
              facingDeg: 28,
              turretDeg: -5,
              gunDeg: 1,
              transition: 'smooth',
            },
          ],
        },
      ],
    },
    camera: {
      pos: [34, 11, -46],
      lookAt: [0, 2, 0],
      groundRel: true,
      fov: 45,
      mode: 'fly',
    },
    fxTime: 6200,
    timeScale: 0,
  });

  const state = studio.state();
  const frame = studio.capture({ width: 1280, height: 720, download: false });

  return JSON.stringify({
    active: studio.active,
    map: studio.mapId,
    actors: studio.listActors().map(({ name, id, state: actorState }) => ({
      name,
      id,
      state: actorState,
    })),
    effects: studio.listEffects().map(({ id, type, tMs }) => ({ id, type, tMs })),
    durationMs: state.storyboard.durationMs,
    shots: state.storyboard.shots.length,
    actorTracks: state.storyboard.actorTracks.length,
    fxTime: state.fxTime,
    capture: {
      width: frame.width,
      height: frame.height,
      dataUrlBytes: frame.dataURL.length,
    },
    performance: studio.performance(),
  });
})();
