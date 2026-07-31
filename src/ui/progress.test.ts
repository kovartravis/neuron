import { describe, it, expect, vi } from 'vitest';
import { ScanProgressBar } from './progress.js';
import { PassThrough } from 'node:stream';

describe('ScanProgressBar', () => {
  it('formats block progress bar and writes to stream', () => {
    let output = '';
    const mockStream = new PassThrough();
    (mockStream as any).isTTY = true;
    mockStream.on('data', chunk => {
      output += chunk.toString();
    });

    const progressBar = new ScanProgressBar({ stream: mockStream as any, enabled: true });
    progressBar.update({
      phase: 'Analyzing files',
      percent: 50,
      currentItem: 'src/index.ts',
      totalItems: 10,
      currentStep: 5
    });

    expect(output).toContain('\r\x1b[K');
    expect(output).toContain('[██████████░░░░░░░░░░] 50%');
    expect(output).toContain('Analyzing files (5/10): src/index.ts');
  });

  it('suppresses output when disabled or stream is not TTY', () => {
    let output = '';
    const mockStream = new PassThrough();
    (mockStream as any).isTTY = false;
    mockStream.on('data', chunk => {
      output += chunk.toString();
    });

    const progressBar = new ScanProgressBar({ stream: mockStream as any, enabled: true });
    progressBar.update({
      phase: 'Analyzing files',
      percent: 50
    });

    expect(output).toBe('');
  });

  it('clears the line on clear()', () => {
    let output = '';
    const mockStream = new PassThrough();
    (mockStream as any).isTTY = true;
    mockStream.on('data', chunk => {
      output += chunk.toString();
    });

    const progressBar = new ScanProgressBar({ stream: mockStream as any, enabled: true });
    progressBar.clear();

    expect(output).toBe('\r\x1b[K');
  });
});
