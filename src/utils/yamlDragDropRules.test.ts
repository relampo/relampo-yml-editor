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

  it('allows data sources to move between the parsed root, steps, and requests', () => {
    expect(canContain('test', 'data_source')).toBe(true);
    expect(canContain('steps', 'data_source')).toBe(true);
    expect(canContain('request', 'data_source')).toBe(true);
    expect(canDrop('data_source', 'test', 'inside')).toBe(true);
    expect(canDrop('data_source', 'steps', 'inside')).toBe(true);
    expect(canDrop('data_source', 'request', 'inside')).toBe(true);
  });

  it('validates a parsed test tree with root and request data sources', () => {
    const result = validateTreeStructure({
      type: 'test',
      children: [
        { type: 'data_source' },
        {
          type: 'scenarios',
          children: [
            {
              type: 'scenario',
              children: [
                {
                  type: 'steps',
                  children: [{ type: 'request', children: [{ type: 'data_source' }] }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  describe('balanced controller containment (RLP-475)', () => {
    it('rejects think_time as a direct balanced child', () => {
      expect(canContain('balanced', 'think_time')).toBe(false);
    });

    it('rejects sql as a direct balanced child', () => {
      expect(canContain('balanced', 'sql')).toBe(false);
    });

    it('blocks dropping think_time inside a balanced controller', () => {
      expect(canDrop('think_time', 'balanced', 'inside')).toBe(false);
    });

    it('blocks dropping sql inside a balanced controller', () => {
      expect(canDrop('sql', 'balanced', 'inside')).toBe(false);
    });

    it('blocks dropping sql before or after an existing balanced child', () => {
      expect(canDrop('sql', 'get', 'before', 'balanced')).toBe(false);
      expect(canDrop('sql', 'get', 'after', 'balanced')).toBe(false);
    });

    it('does not list balanced as a valid container for think_time', () => {
      const targets = getValidDropTargets('think_time');
      expect(targets.containers).not.toContain('balanced');
    });

    it('allows valid step types inside balanced', () => {
      expect(canContain('balanced', 'get')).toBe(true);
      expect(canContain('balanced', 'post')).toBe(true);
      expect(canContain('balanced', 'group')).toBe(true);
      expect(canContain('balanced', 'transaction')).toBe(true);
      expect(canContain('balanced', 'loop')).toBe(true);
      expect(canContain('balanced', 'retry')).toBe(true);
      expect(canDrop('group', 'get', 'before', 'balanced')).toBe(true);
      expect(canDrop('retry', 'post', 'after', 'balanced')).toBe(true);
    });
  });
});
