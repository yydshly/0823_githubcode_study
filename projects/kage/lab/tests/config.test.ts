import { describe, expect, it } from 'vitest';
import { stories } from '../src/config/stories';
import { assertStoryConfig, type StoryConfig } from '../src/config/schema';

describe('story configuration', () => {
  it('validates every registered story and preserves different presets', () => {
    stories.forEach((story) => expect(assertStoryConfig(story)).toBe(story));
    expect(new Set(stories.map((story) => story.world.preset)).size).toBe(3);
    expect(stories.every((story) => story.chapters.length >= 4)).toBe(true);
  });

  it('rejects duplicate chapter ids', () => {
    const source = stories[0];
    const invalid: StoryConfig = {
      ...source,
      chapters: [source.chapters[0], source.chapters[0]]
    };
    expect(() => assertStoryConfig(invalid)).toThrow(/唯一/);
  });
});
