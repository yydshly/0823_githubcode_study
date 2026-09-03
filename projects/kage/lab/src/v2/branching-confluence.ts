const choiceSignal = /(?:选择|选定|二选一|choice|choose|select)/i;
const branchSignal = /(?:分支|分岔|岔路|两条(?:路线|路径)|两种(?:路线|路径)|不同(?:路线|路径)|多(?:条)?路径|branch(?:ing|ed)?|multi[-\s]?path|two\s+(?:routes?|paths?))/i;
const confluenceSignal = /(?:汇合|合流|重新汇合|再次汇合|汇入同一|回到同一|共同(?:结论|行动|终点)|同一(?:结论|行动|终点)|converg(?:e|es|ed|ence)|rejoin(?:s|ed)?|reunit(?:e|es|ed))/i;

/**
 * Product-level branching must be explicitly requested. A lone route, choice,
 * comparison, filter or final action is not enough: the brief must name a
 * choice, more than one path, and a shared confluence in its positive intent.
 */
export function hasExplicitBranchingConfluenceIntent(rawBrief: string): boolean {
  const brief = positiveIntentText(rawBrief);
  return choiceSignal.test(brief)
    && branchSignal.test(brief)
    && confluenceSignal.test(brief);
}

function positiveIntentText(brief: string): string {
  const negativeMarker = /(?:不要|避免|拒绝|禁止|不使用|无需|不需要|不能|不应)|\b(?:do not|don't|avoid|reject|forbid|without|no)\b/i;
  return brief
    .split(/[。；;\n]/)
    .map((clause) => {
      const marker = negativeMarker.exec(clause);
      return (marker ? clause.slice(0, marker.index) : clause).trim();
    })
    .filter(Boolean)
    .join('。');
}
