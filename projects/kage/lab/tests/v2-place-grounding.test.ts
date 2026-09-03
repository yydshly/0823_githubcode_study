import { describe, expect, it } from 'vitest';
import { selectPlaceGroundingCapability } from '../src/v2/place-grounding-capability.ts';
import { selectReferenceEvidence } from '../src/v2/reference-intelligence.ts';

describe('V2 place-grounded experience capability', () => {
  it('requires real geography for location decisions while keeping business data honest', () => {
    const decision = selectPlaceGroundingCapability(
      '为城市公共饮水点设计地图，选择站点时更新水质、步行距离和开放状态，找到最近的饮水点。'
    );

    expect(decision).toMatchObject({
      selected: true,
      capabilityId: 'place-grounded-experience',
      strategy: 'real-geography-evidence',
      requirements: {
        geography: 'real-grounded',
        map: 'required'
      }
    });
    expect(decision.requirements.dataTruth).toContain('模拟业务点');
    expect(decision.requirements.creativeFreedom).toContain('不得改变地点坐标');
    expect(selectReferenceEvidence(
      '为城市公共饮水点设计地图，选择站点并比较路线和距离。',
      'editorial-field',
      3
    ).map((match) => match.reference.id)).toContain('kage-xuhui-place-evidence');
  });

  it('turns place history into narrative space instead of a standard map template', () => {
    const brief = '为一座城市逐渐消失的老电影院制作数字档案，沿真实街区发现不同时期的影院记忆。';
    const decision = selectPlaceGroundingCapability(brief);

    expect(decision.strategy).toBe('place-narrative');
    expect(decision.requirements.geography).toBe('real-reinterpreted');
    expect(decision.requirements.map).toBe('optional');
    expect(decision.requirements.creativeFreedom).toContain('不必复制标准地图界面');
    expect(selectReferenceEvidence(brief, 'editorial-field', 3).map((match) => match.reference.id))
      .toContain('kage-cinema-memory-archive');
  });

  it('does not read a rejected map interface as positive geographic evidence', () => {
    const decision = selectPlaceGroundingCapability(
      '为一座城市逐渐消失的老电影院制作数字档案网页。票根与立面沿同一街区的真实位置重叠，访客可以选择年代查看变化。不要标准地图界面、暗色电影海报或随机粒子。'
    );

    expect(decision.strategy).toBe('place-narrative');
    expect(decision.requirements.map).toBe('avoid');
    expect(decision.matchedSignals).not.toContain('地图');
  });

  it('uses place as atmosphere without forcing landmarks or maps', () => {
    const decision = selectPlaceGroundingCapability(
      '为产自海岸山谷的香氛品牌设计网页，提取湿润岩石、晨雾和海风的地方气质。'
    );

    expect(decision.strategy).toBe('place-atmosphere');
    expect(decision.requirements.geography).toBe('inspired-only');
    expect(decision.requirements.map).toBe('avoid');
    expect(decision.requirements.creativeFreedom).toContain('避免地标拼贴与伪地图');
  });

  it('rejects place decoration when the idea has no geographic responsibility', () => {
    const decision = selectPlaceGroundingCapability(
      '为帮助独立创作者整理声音灵感的产品设计安静、真实的发布网页。'
    );

    expect(decision.selected).toBe(false);
    expect(decision.strategy).toBe('none');
    expect(decision.capabilityId).toBeNull();
    expect(decision.requirements.map).toBe('avoid');
  });

  it('does not turn a narrative branch or listening route into real geography', () => {
    const relay = selectPlaceGroundingCapability(
      '为虚构城市接力演练设计网页，选择提前交棒或压线交棒路线并在终点汇合。'
    );
    const listening = selectPlaceGroundingCapability(
      '在明亮森林剖面中寻找声源，收集三个后形成自己的聆听路线。'
    );

    expect(relay).toMatchObject({ selected: false, strategy: 'none' });
    expect(listening).toMatchObject({
      selected: true,
      strategy: 'place-atmosphere',
      requirements: { map: 'avoid' }
    });
  });
});
