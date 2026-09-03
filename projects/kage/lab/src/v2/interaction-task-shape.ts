export type InteractionTaskKind =
  | 'grounded-physical-manipulation'
  | 'abstract-direct-manipulation'
  | 'other';

export interface InteractionTaskShape {
  kind: InteractionTaskKind;
  directManipulation: boolean;
  persistentPhysicalScene: boolean;
  movablePhysicalSubjects: boolean;
  spatialCausality: boolean;
  abstractCollection: boolean;
  requiresForeground: boolean;
  stateLayer: 'none' | 'depth-map' | 'state-mask' | 'shadow-mask';
  reason: string;
}

/**
 * Classifies the interaction semantics before renderer or asset selection.
 *
 * This deliberately describes a task shape rather than a page theme. A balcony,
 * packing table, kitchen counter or warehouse shelf can all be the same grounded
 * physical task; reordering book cards or data rows cannot. The classification
 * says that independent scene responsibilities are needed, not that Three.js is
 * required.
 */
export function classifyInteractionTaskShape(rawBrief: string): InteractionTaskShape {
  const brief = positiveBrief(rawBrief).toLowerCase();
  const directManipulation = includesAny(brief, [
    '拖动', '拖拽', '拖到', '移动', '移位', '放入', '取出', '挂到', '摆放', '挪动', '拉动',
    'drag', 'move', 'reposition', 'place', 'remove', 'hang', 'pull'
  ]);
  const groundedScene = includesAny(brief, [
    '真实', '实景', '同一', '持续存在', '始终保持', '自然光',
    'real ', 'same ', 'persistent', 'natural light'
  ]) && includesAny(brief, [
    '空间', '场景', '环境', '房间', '桌面', '工作区', '工作台', '阳台', '货架', '厨房',
    '工位', '墙面', '地面', '舞台', '展台', '容器', '箱内', '架上',
    'space', 'scene', 'environment', 'room', 'table', 'workspace', 'balcony', 'shelf',
    'counter', 'floor', 'stage', 'container'
  ]);
  const movablePhysicalSubjects = includesAny(brief, [
    '物件', '物品', '衣物', '衣服', '浴巾', '衬衫', '针织衫', '床单', '行李', '箱子',
    '器物', '设备', '构件', '零件', '家具', '工具', '杯子', '瓶子', '盒子', '包裹',
    '食材', '食品', '食物', '蔬菜', '水果', '香草', '商品', '货品',
    'parcel', 'object', 'item', 'clothing', 'garment', 'towel', 'shirt', 'sheet',
    'luggage', 'suitcase', 'device', 'component', 'furniture', 'tool', 'bottle', 'box',
    'ingredient', 'food', 'produce', 'vegetable', 'fruit', 'herb', 'product', 'goods'
  ]);
  const spatialCausality = includesAny(brief, [
    '位置', '占用关系', '占用', '遮挡', '载荷', '负载', '下垂', '超载', '重量', '阴影',
    '日照覆盖', '覆盖范围', '距离', '碰撞', '朝向', '角度', '落点', '受力', '空间关系',
    'position', 'occupancy', 'occlusion', 'load', 'sag', 'overload', 'weight', 'shadow',
    'coverage', 'distance', 'collision', 'orientation', 'angle', 'spatial relation'
  ]) && includesAny(brief, [
    '同步变化', '同步更新', '直接改变', '随', '重新计算', '改变', '更新',
    'sync', 'update', 'change', 'recalculate'
  ]);
  const abstractCollectionTerms = [
    '书卡', '书封', '引文卡', '卡片', '数据行', '标签', '文本块', '文档', '清单项', '记录项',
    '字段', '筛选', '排序', '看板', 'book card', 'quote card', 'card', 'data row', 'tag',
    'document', 'list item', 'field', 'filter', 'sort', 'kanban'
  ] as const;
  const abstractAction = '(?:拖动|拖拽|移动|重排|筛选|排序|选择|drag|move|reorder|filter|sort|select)';
  const abstractObject = '(?:书卡|书封|引文卡|卡片|数据行|标签|文本块|文档|清单项|记录项|字段|看板|book card|quote card|card|data row|tag|document|list item|field|kanban)';
  const abstractCollection = includesAny(brief, abstractCollectionTerms)
    && (new RegExp(`${abstractAction}[^。；;]{0,48}${abstractObject}`, 'i').test(brief)
      || new RegExp(`${abstractObject}[^。；;]{0,48}${abstractAction}`, 'i').test(brief));
  const explicitPhysicalEvidence = groundedScene && movablePhysicalSubjects && spatialCausality;
  const groundedPhysical = directManipulation
    && explicitPhysicalEvidence
    && (!abstractCollection || includesAny(brief, ['真实物件', '真实物品', '实体物件', 'physical object']));

  const requiresForeground = groundedPhysical && includesAny(brief, [
    '前景', '近景', '遮挡', '栏杆', '门框', '窗框', '遮雨檐', '屋檐', '边缘',
    'foreground', 'near field', 'occlusion', 'railing', 'door frame', 'window frame', 'awning'
  ]);
  const stateLayer = selectStateLayer(brief, groundedPhysical);

  if (groundedPhysical) {
    return {
      kind: 'grounded-physical-manipulation',
      directManipulation,
      persistentPhysicalScene: groundedScene,
      movablePhysicalSubjects,
      spatialCausality,
      abstractCollection,
      requiresForeground,
      stateLayer,
      reason: '直接操作发生在持续存在的真实物理场中，独立物件的位置关系会同步改变空间结果；需要可分离的环境、主体及必要遮挡/状态职责。'
    };
  }

  if (directManipulation && abstractCollection) {
    return {
      kind: 'abstract-direct-manipulation',
      directManipulation,
      persistentPhysicalScene: false,
      movablePhysicalSubjects: false,
      spatialCausality: false,
      abstractCollection,
      requiresForeground: false,
      stateLayer: 'none',
      reason: '交互对象是书卡、数据行或其他抽象集合项；语义 DOM 可以表达重排和结果，不应强制生成物理场景素材。'
    };
  }

  return {
    kind: 'other',
    directManipulation,
    persistentPhysicalScene: groundedScene,
    movablePhysicalSubjects,
    spatialCausality,
    abstractCollection,
    requiresForeground: false,
    stateLayer: 'none',
    reason: '当前描述没有同时证明持续物理场、可独立移动实体和空间因果结果；不新增场景素材阻断。'
  };
}

function selectStateLayer(
  brief: string,
  groundedPhysical: boolean
): InteractionTaskShape['stateLayer'] {
  if (!groundedPhysical) return 'none';
  if (includesAny(brief, [
    '阴影', '日照覆盖', '光照覆盖', '投影变化',
    'shadow', 'sunlight coverage', 'lighting coverage', 'projection change'
  ])) {
    return 'shadow-mask';
  }
  if (includesAny(brief, [
    '覆盖', '载荷', '负载', '下垂', '超载', '重量', '受力',
    'coverage', 'load', 'sag', 'overload', 'weight', 'force'
  ])) {
    return 'state-mask';
  }
  if (includesAny(brief, [
    '景深', '深度', '视差', '前后景', '遮挡', 'depth', 'parallax', 'occlusion'
  ])) {
    return 'depth-map';
  }
  return 'none';
}

function positiveBrief(brief: string): string {
  const negativeMarker = /(?:^|[，,：:\s])(?:不要|避免|拒绝|禁止|不使用|无需|不需要|不能|不应)/;
  return brief
    .split(/[。；;\n]/)
    .map((clause) => {
      const marker = negativeMarker.exec(clause);
      return (marker ? clause.slice(0, marker.index) : clause).trim();
    })
    .filter(Boolean)
    .join('。');
}

function includesAny(value: string, needles: readonly string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}
