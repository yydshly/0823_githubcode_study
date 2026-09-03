import { describe, expect, it } from 'vitest';
import {
  evaluatePrincipleCombination,
  getProductionReadyRecipes,
  motionsitesCoverage,
  motionsitesPrinciples,
  motionsitesResearchCases,
  motionsitesSynthesisRecipes,
  researchCaseSchema,
  synthesisRecipeSchema
} from '../src/v2/motionsites-research.ts';

describe('V2 MotionSites research system', () => {
  it('keeps the first batch bounded, unique and schema-valid', () => {
    expect(motionsitesResearchCases).toHaveLength(34);
    expect(motionsitesCoverage.firstBatchCount).toBe(34);
    expect(motionsitesCoverage.publicCatalogTotal).toBeGreaterThan(motionsitesCoverage.firstBatchCount);
    expect(new Set(motionsitesResearchCases.map((item) => item.id)).size).toBe(motionsitesResearchCases.length);
    motionsitesResearchCases.forEach((item) => expect(researchCaseSchema.parse(item)).toEqual(item));
  });

  it('does not invent implementation facts for E1 catalog signals', () => {
    const inventoryOnly = motionsitesResearchCases.filter((item) => item.evidenceLevel === 'E1');
    expect(inventoryOnly.length).toBeGreaterThan(20);
    inventoryOnly.forEach((item) => expect(item.implementationFacts).toEqual([]));
  });

  it('keeps every synthesis recipe compatible and capped by its weakest principle', () => {
    motionsitesSynthesisRecipes.forEach((recipe) => {
      expect(synthesisRecipeSchema.parse(recipe)).toEqual(recipe);
      const evaluation = evaluatePrincipleCombination(recipe.principleIds);
      expect(evaluation.compatible).toBe(true);
      expect(evaluation.minimumEvidence).toBe(recipe.evidenceLevel);
    });
  });

  it('rejects an incompatible global scroll and free pointer combination', () => {
    const evaluation = evaluatePrincipleCombination(['global-scroll-timeline', 'free-pointer-navigation']);
    expect(evaluation.compatible).toBe(false);
    expect(evaluation.conflicts).toContain('free-pointer-navigation ↔ global-scroll-timeline');
  });

  it('promotes only the E4 validated recipe to production', () => {
    expect(motionsitesPrinciples.some((item) => item.state === 'research-target')).toBe(true);
    expect(getProductionReadyRecipes().map((recipe) => recipe.id)).toEqual(['editorial-memory-field']);
  });
});
