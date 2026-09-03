import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { captureDedicatedVisualReview, cleanupCapturedVisualReview } from '../server/dedicated-visual-review.ts';

const projectRoot = resolve(process.cwd());
const outputDirectory = join(projectRoot, '.artifacts', 'r82-tree-canopy-final');
const plan = {
  schemaVersion: 1,
  source: 'creative-contract',
  journeyMode: 'scroll-timeline',
  rendererRoute: 'dom-three-hybrid',
  checkpoints: [
    { id: 'opening', label: '桌面全屏真实树冠开场', progress: 0, surface: 'desktop', quality: 'high', reducedMotion: false, action: 'none', expectSceneChange: false, expectSubjectChange: false, expectMobileTaskPath: false },
    { id: 'driver', label: '播放、滚轮与直接控件共享状态', progress: .5, surface: 'desktop', quality: 'high', reducedMotion: false, action: 'driver-probe', expectSceneChange: true, expectSubjectChange: false, expectMobileTaskPath: false },
    { id: 'final', label: '桌面方案保存收束', progress: 1, surface: 'desktop', quality: 'high', reducedMotion: false, action: 'none', expectSceneChange: false, expectSubjectChange: false, expectMobileTaskPath: false },
    { id: 'mobile', label: '移动端控件、结果与最终行动', progress: .46, surface: 'mobile', quality: 'low', reducedMotion: true, action: 'semantic-probe', expectSceneChange: false, expectSubjectChange: false, expectMobileTaskPath: true },
  ],
};

const review = await captureDedicatedVisualReview('dedicated-tree-canopy-final-r82', 'http://127.0.0.1:8146', process.env, plan);
await mkdir(outputDirectory, { recursive: true });
for (const imagePath of review.imagePaths) {
  await copyFile(imagePath, join(outputDirectory, basename(imagePath)));
}
await writeFile(join(outputDirectory, 'visual-review.json'), `${JSON.stringify({ plan: review.plan, evidence: review.evidence, assessment: review.assessment }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ directory: outputDirectory, assessment: review.assessment, browserErrors: review.evidence.browserErrors, frames: review.evidence.frames }, null, 2));
await cleanupCapturedVisualReview(review);
