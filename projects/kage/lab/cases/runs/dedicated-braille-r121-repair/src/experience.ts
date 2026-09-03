import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { createScene } from './scene';
import { letters, patterns, type Letter } from './director';

startExperience(defineExperience({
  mount(sdkContext) {
    const root = sdkContext.container;
    let current: Letter = 'A';
    let saved = false;
    const scene = createScene();
    root.innerHTML = `
      <main class="lesson" aria-labelledby="page-title">
        <header class="topline"><a class="brand" href="#practice">六点光穹</a><span>触觉星座 · 入门练习</span></header>
        <section class="hero" id="practice">
          <div class="intro"><p class="eyebrow">BRAILLE / 01</p><h1 id="page-title">把六个点，<br><em>读成一颗星。</em></h1><p class="lede">选择字母，看同一组六点圆顶如何升起、连成可记住的盲文构形。</p>
            <div class="chooser" role="group" aria-label="选择练习字母">
              ${letters.map((letter) => `<button type="button" data-letter="${letter}" aria-pressed="${letter === 'A'}"${letter === 'L' ? ' data-signal-primary-control' : ''}>${letter}</button>`).join('')}
            </div>
            <p class="keyhint">可用 ← → 方向键切换字母</p>
          </div>
          <section class="dome-card" aria-label="六点光穹点阵">
            <div class="card-head"><span>当前点阵</span><strong id="pattern-cue">第 1 点升起</strong></div>
            <div class="constellation" aria-hidden="true" data-signal-visual-anchor><svg viewBox="0 0 260 360" preserveAspectRatio="none"><path id="light-path" d="M78 66" /></svg><div class="dots">${[1,4,2,5,3,6].map((n) => `<div class="dot-slot"><i class="dome" data-dot="${n}"></i><b>${n}</b></div>`).join('')}</div></div>
            <div class="pattern-copy" data-signal-primary-result><h2 id="pattern-title">A · 一颗起始星</h2><p id="pattern-detail">只让左上第一点升起。轻触时，先辨认它在六点格中的位置。</p></div>
          </section>
        </section>
        <section class="closing"><div><p class="eyebrow">今日练习</p><h2>看见结构，<br>再把它带到指尖。</h2><p class="note">这是视觉教学演示，不能替代真实触读训练。</p></div><button class="save" type="button" data-signal-primary-action>保存今日点阵练习 <span>→</span></button><p class="saved" role="status" aria-live="polite"></p></section>
      </main>`;

    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-letter]'));
    const domes = Array.from(root.querySelectorAll<HTMLElement>('[data-dot]'));
    const cue = root.querySelector<HTMLElement>('#pattern-cue');
    const title = root.querySelector<HTMLElement>('#pattern-title');
    const detail = root.querySelector<HTMLElement>('#pattern-detail');
    const path = root.querySelector<SVGPathElement>('#light-path');
    const savedText = root.querySelector<HTMLElement>('.saved');
    const routes: Record<Letter, string> = { A: 'M78 66', L: 'M78 66 L78 180 L78 294', T: 'M182 66 L182 180 L78 180 L78 294' };
    const setLetter = (letter: Letter) => {
      current = letter;
      const pattern = patterns[letter];
      buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.letter === letter)));
      domes.forEach((dome) => dome.classList.toggle('raised', pattern.raised.includes(Number(dome.dataset.dot))));
      if (cue) cue.textContent = pattern.cue;
      if (title) title.textContent = pattern.title;
      if (detail) detail.textContent = pattern.detail;
      if (path) path.setAttribute('d', routes[letter]);
      saved = false;
      root.querySelector('.closing')?.classList.remove('is-saved');
      if (savedText) savedText.textContent = '';
    };
    buttons.forEach((button) => button.addEventListener('click', () => setLetter(button.dataset.letter as Letter)));
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const next = (letters.indexOf(current) + (event.key === 'ArrowRight' ? 1 : letters.length - 1)) % letters.length;
      setLetter(letters[next]);
      buttons[next].focus();
    });
    root.querySelector<HTMLButtonElement>('.save')?.addEventListener('click', () => {
      saved = true;
      if (savedText) savedText.textContent = `已保存：字母 ${current} 的六点练习。`;
      root.querySelector('.closing')?.classList.toggle('is-saved', saved);
    });
    setLetter(current);
    return { update: () => undefined, resize: () => scene.resize(), dispose: () => scene.dispose() };
  },
  update: () => undefined,
  resize: () => undefined,
  dispose: () => undefined
}));
