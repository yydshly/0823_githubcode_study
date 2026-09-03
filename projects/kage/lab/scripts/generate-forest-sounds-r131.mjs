import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(root, 'pages/v2/deliveries/forest-sound-route/assets');
const sampleRate = 22050;

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff * 2 - 1;
  };
}

function softClip(value) {
  return Math.tanh(value * 1.35) * 0.78;
}

function writeWav(name, seconds, render) {
  const count = Math.floor(sampleRate * seconds);
  const samples = new Int16Array(count);
  for (let index = 0; index < count; index += 1) {
    const value = softClip(render(index / sampleRate, index, count));
    samples[index] = Math.max(-32768, Math.min(32767, Math.round(value * 32767)));
  }

  const buffer = Buffer.alloc(44 + samples.byteLength);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.byteLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.byteLength, 40);
  for (let index = 0; index < samples.length; index += 1) buffer.writeInt16LE(samples[index], 44 + index * 2);
  writeFileSync(resolve(outputDirectory, name), buffer);
}

mkdirSync(outputDirectory, { recursive: true });

{
  const noise = rng(13101);
  let low = 0;
  writeWav('leaf-canopy.wav', 3.2, (time) => {
    low = low * .92 + noise() * .08;
    const gust = .2 + Math.pow(Math.sin(time * Math.PI * .74) * .5 + .5, 2) * .72;
    const flicker = Math.sin(time * Math.PI * 16) * .035;
    return low * gust + flicker * gust;
  });
}

{
  const noise = rng(13102);
  writeWav('tree-hollow.wav', 3.6, (time) => {
    const body = Math.sin(time * Math.PI * 2 * 92) * .13 + Math.sin(time * Math.PI * 2 * 138) * .07;
    const knocks = [0.42, 1.18, 2.05, 2.82].reduce((sum, at) => {
      const age = time - at;
      if (age < 0 || age > .3) return sum;
      return sum + Math.sin(age * Math.PI * 2 * 176) * Math.exp(-age * 15) * .72;
    }, 0);
    return body * (.32 + Math.sin(time * 1.7) * .08) + knocks + noise() * .018;
  });
}

{
  const noise = rng(13103);
  let low = 0;
  let high = 0;
  writeWav('creek-stone.wav', 3.8, (time) => {
    const current = noise();
    low = low * .88 + current * .12;
    high = high * .42 + (current - low) * .58;
    const droplets = [0.31, .86, 1.41, 2.07, 2.59, 3.21].reduce((sum, at, index) => {
      const age = time - at;
      if (age < 0 || age > .12) return sum;
      return sum + Math.sin(age * Math.PI * 2 * (920 + index * 83)) * Math.exp(-age * 38) * .22;
    }, 0);
    return low * .2 + high * .26 + droplets;
  });
}

{
  const noise = rng(13104);
  writeWav('meadow-insect.wav', 3.4, (time) => {
    const pulseA = Math.max(0, Math.sin(time * Math.PI * 2 * 7.1));
    const pulseB = Math.max(0, Math.sin((time + .19) * Math.PI * 2 * 5.3));
    const chirp = Math.sin(time * Math.PI * 2 * (2380 + Math.sin(time * 3.2) * 190));
    const answer = Math.sin(time * Math.PI * 2 * 3120) * pulseB * .16;
    return chirp * Math.pow(pulseA, 8) * .34 + answer + noise() * .012;
  });
}

console.log('R131 forest sound asset batch generated:', outputDirectory);
