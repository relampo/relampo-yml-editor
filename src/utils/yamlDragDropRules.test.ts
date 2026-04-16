import { describe, expect, it } from 'vitest';
import { canContain, canDrop, getValidDropTargets, validateTreeStructure } from './yamlDragDropRules';

describe('yamlDragDropRules', () => {
  it('allows parallel controllers to contain step-level children', () => {
    expect(canContain('parallel', 'get')).toBe(true);
    expect(canContain('parallel', 'group')).toBe(true);
    expect(canContain('parallel', 'retry')).toBe(true);
  });

  it('accepts inside drops into parallel controllers', () => {
    expect(canDrop('get', 'parallel', 'inside')).toBe(true);
    expect(canDrop('loop', 'parallel', 'inside')).toBe(true);
  });

  it('reports parallel as a valid container for step-level targets', () => {
    const targets = getValidDropTargets('get');
    expect(targets.containers).toContain('parallel');
  });

  it('treats populated parallel nodes as valid tree structure', () => {
    const result = validateTreeStructure({
      type: 'parallel',
      children: [{ type: 'get' }],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
