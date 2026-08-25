const threeUrl = new URL('../upstream/vendor/three.module.js', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return { url: threeUrl, shortCircuit: true };
  return nextResolve(specifier, context);
}
