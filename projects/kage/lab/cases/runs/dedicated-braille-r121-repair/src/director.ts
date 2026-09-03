export type Letter = 'A' | 'L' | 'T';

export interface Pattern {
  letter: Letter;
  raised: readonly number[];
  route: readonly number[];
  title: string;
  detail: string;
  cue: string;
}

export const patterns: Record<Letter, Pattern> = {
  A: { letter: 'A', raised: [1], route: [1], title: 'A · 一颗起始星', detail: '只让左上第一点升起。轻触时，先辨认它在六点格中的位置。', cue: '第 1 点升起' },
  L: { letter: 'L', raised: [1, 2, 3], route: [1, 2, 3], title: 'L · 一条向下的星轨', detail: '左列三点依次升起，形成一条清晰的垂直触觉路径。', cue: '第 1、2、3 点升起' },
  T: { letter: 'T', raised: [2, 3, 4, 5], route: [2, 3, 5, 4], title: 'T · 交错的四点星座', detail: '中段四点同时升起；沿着光带感受它们如何跨列连接。', cue: '第 2、3、4、5 点升起' }
};

export const letters: readonly Letter[] = ['A', 'L', 'T'];
