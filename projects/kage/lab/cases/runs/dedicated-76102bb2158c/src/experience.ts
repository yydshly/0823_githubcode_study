import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { CinemaScene } from './scene';
import { ArchiveDirector } from './director';

let scene: CinemaScene | null = null;
let director: ArchiveDirector | null = null;
let root: HTMLElement | null = null;
let cleanup: Array<() => void> = [];

const eraNames = ['1986', '2003', '今天'] as const;

function createPage(container: HTMLElement): HTMLElement {
  const page = document.createElement('main');
  page.className = 'archive-page';
  page.innerHTML = `
    <header class="archive-masthead" aria-label="城市放映档案">
      <a class="archive-mark" href="#opening" aria-label="回到开场">城市放映档案 <span>示意记录 069</span></a>
      <p>同一街角 · 三段时间</p>
    </header>
    <section class="archive-opening" id="opening" aria-labelledby="archive-title">
      <div class="opening-copy">
        <p class="eyebrow">一座虚构社区影院的艺术化档案演绎</p>
        <h1 id="archive-title">最后亮着的<br>老招牌</h1>
        <p class="dek">当电影院从街区里慢慢退场，招牌、门廊和一张张票根，仍替同一个地点保存着光。</p>
        <a class="text-link" href="#evidence">沿同一街角查看年代 <span aria-hidden="true">↓</span></a>
      </div>
      <aside class="sign-note" aria-label="当前档案状态">
        <span class="pulse" aria-hidden="true"></span>
        <strong>今日仍亮</strong>
        <small>最后一块旧招牌</small>
      </aside>
    </section>
    <section class="archive-evidence" id="evidence" aria-labelledby="evidence-title">
      <div class="evidence-intro">
        <p class="eyebrow">同址比对</p>
        <h2 id="evidence-title">时间没有换一座建筑，<br>只反复覆盖它。</h2>
        <p>选择年代。立面色彩、票根痕迹和放映声的文字记录会在同一机位对齐显影。</p>
      </div>
      <div class="era-panel" aria-live="polite">
        <nav class="era-nav" aria-label="选择查看年代">
          <button type="button" data-era="0">1986</button>
          <button type="button" data-era="1">2003</button>
          <button type="button" data-era="2" aria-current="true">今天</button>
        </nav>
        <div class="evidence-readout">
          <p class="place-code">示意地点 / 街角 069</p>
          <p class="era-large" data-era-label>今天</p>
          <dl>
            <div><dt>立面</dt><dd data-facade>浅色外墙，门廊仍在</dd></div>
            <div><dt>票根</dt><dd data-ticket>仅存私人收藏扫描记录</dd></div>
            <div><dt>放映声</dt><dd data-sound>“机器停了，招牌每晚仍亮。”</dd></div>
          </dl>
        </div>
      </div>
      <p class="disclosure">边界说明：画面为同一虚构社区影院的艺术化连续演绎，并非特定城市、影院或公共设施的真实历史证据。</p>
    </section>
    <section class="archive-resolution" id="save" aria-labelledby="save-title">
      <div class="resolution-copy">
        <p class="eyebrow">让街角继续被看见</p>
        <h2 id="save-title">保存一段<br>城市放映记忆</h2>
        <p>留下一句你记得的散场时刻。它不会替代史料，但能成为下一次寻找的线索。</p>
        <button class="save-action" type="button">保存一段城市放映记忆</button>
        <p class="save-status" role="status" aria-live="polite"></p>
      </div>
      <div class="final-caption" aria-hidden="true">
        <span>街角 069</span><span>同址留存</span><span>今天</span>
      </div>
    </section>`;
  container.appendChild(page);
  return page;
}

startExperience(defineExperience({
  mount(context) {
    root = createPage(context.container);
    scene = new CinemaScene(context.canvas, context.viewport, context.quality);
    director = new ArchiveDirector(scene, context.reducedMotion);

    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-era]'));
    const label = root.querySelector<HTMLElement>('[data-era-label]');
    const facade = root.querySelector<HTMLElement>('[data-facade]');
    const ticket = root.querySelector<HTMLElement>('[data-ticket]');
    const sound = root.querySelector<HTMLElement>('[data-sound]');
    const save = root.querySelector<HTMLButtonElement>('.save-action');
    const status = root.querySelector<HTMLElement>('.save-status');
    const records = [
      ['1986', '米黄色瓷砖，手绘片名牌', '晚场票 · 0.35 元 · 纸边磨损', '“开场铃响，木门一起合上。”'],
      ['2003', '雨棚翻新，售票窗缩小', '录像厅联票 · 日期章褪色', '“胶片换盘声混进街边车流。”'],
      ['今天', '浅色外墙，门廊仍在', '仅存私人收藏扫描记录', '“机器停了，招牌每晚仍亮。”']
    ] as const;

    const selectEra = (index: number): void => {
      director?.selectEra(index);
      buttons.forEach((button, buttonIndex) => {
        if (buttonIndex === index) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
      const record = records[index];
      if (label) label.textContent = record[0];
      if (facade) facade.textContent = record[1];
      if (ticket) ticket.textContent = record[2];
      if (sound) sound.textContent = record[3];
    };

    buttons.forEach((button) => {
      const handler = (): void => selectEra(Number(button.dataset.era));
      button.addEventListener('click', handler);
      cleanup.push(() => button.removeEventListener('click', handler));
    });

    const saveHandler = (): void => {
      if (status) status.textContent = `${eraNames[director?.getSelectedEra() ?? 2]}年的街角记忆已在本次浏览中保存。`;
      save?.classList.add('is-saved');
      scene?.setSaved(true);
    };
    save?.addEventListener('click', saveHandler);
    cleanup.push(() => save?.removeEventListener('click', saveHandler));
  },
  update(frame) {
    director?.update(frame.progress, frame.pointer.x, frame.pointer.y, frame.elapsed, frame.delta);
    scene?.render();
  },
  resize(viewport) {
    scene?.resize(viewport);
  },
  dispose() {
    cleanup.forEach((release) => release());
    cleanup = [];
    director?.dispose();
    scene?.dispose();
    root?.remove();
    director = null;
    scene = null;
    root = null;
  }
}));
