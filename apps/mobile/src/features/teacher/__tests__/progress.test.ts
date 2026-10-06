import { completion, pageCount, pageLabel } from '../progress';

describe('completion', () => {
  it('is Not Started when nothing is submitted', () => {
    expect(completion(0, 20)).toEqual({ percent: 0, status: 'NOT_STARTED', label: 'Not Started', tone: 'neutral' });
  });

  it('is Needs Attention below 80%', () => {
    expect(completion(15, 20)).toEqual({ percent: 75, status: 'NEEDS_ATTENTION', label: 'Needs Attention', tone: 'danger' });
  });

  it('is Almost Complete from 80% to 99%', () => {
    expect(completion(18, 20)).toEqual({ percent: 90, status: 'ALMOST_COMPLETE', label: 'Almost Complete', tone: 'warning' });
  });

  it('is Complete only when everyone required has submitted', () => {
    expect(completion(20, 20)).toEqual({ percent: 100, status: 'COMPLETE', label: 'Complete', tone: 'success' });
  });

  it('never rounds a partial result up to 100% or a started one down to 0%', () => {
    expect(completion(199, 200).percent).toBe(99);
    expect(completion(1, 300).percent).toBe(1);
  });

  it('matches the PRD example: 20 enrolled, 2 exempt, 18 submitted is complete', () => {
    expect(completion(18, 20 - 2).status).toBe('COMPLETE');
  });

  it('treats an assessment with nobody required as Not Started', () => {
    expect(completion(0, 0)).toMatchObject({ percent: 0, status: 'NOT_STARTED' });
  });
});

describe('pagination', () => {
  it('counts pages of 20', () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(20)).toBe(1);
    expect(pageCount(86)).toBe(5);
  });

  it('describes the visible range', () => {
    expect(pageLabel(0, 86)).toBe('Showing 1-20 of 86');
    expect(pageLabel(4, 86)).toBe('Showing 81-86 of 86');
    expect(pageLabel(0, 0)).toBe('Showing 0 of 0');
  });
});
