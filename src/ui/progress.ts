import type { Writable } from 'node:stream';

export interface ScanProgress {
  phase: string;
  percent: number;
  currentItem?: string;
  totalItems?: number;
  currentStep?: number;
}

export interface ScanProgressBarOptions {
  enabled?: boolean;
  stream?: Writable & { isTTY?: boolean };
}

export class ScanProgressBar {
  private enabled: boolean;
  private stream: Writable & { isTTY?: boolean };
  private width: number;

  constructor(options: ScanProgressBarOptions = {}) {
    this.stream = options.stream || process.stderr;
    this.enabled = options.enabled ?? true;
    this.width = 20;
  }

  public update(progress: ScanProgress): void {
    const isTTY = this.stream.isTTY ?? false;
    if (!this.enabled || !isTTY) {
      return;
    }

    const clampedPercent = Math.max(0, Math.min(100, Math.round(progress.percent)));
    const filledCount = Math.round((clampedPercent / 100) * this.width);
    const emptyCount = this.width - filledCount;
    const bar = '█'.repeat(filledCount) + '░'.repeat(emptyCount);

    const percentStr = `${clampedPercent.toString().padStart(2, ' ')}%`;
    let detail = progress.phase;

    if (progress.currentStep !== undefined && progress.totalItems !== undefined) {
      detail += ` (${progress.currentStep}/${progress.totalItems})`;
    }

    if (progress.currentItem) {
      detail += `: ${progress.currentItem}`;
    }

    const line = `\r\x1b[KScanning: [${bar}] ${percentStr} | ${detail}`;
    this.stream.write(line);
  }

  public clear(): void {
    const isTTY = this.stream.isTTY ?? false;
    if (!this.enabled || !isTTY) {
      return;
    }
    this.stream.write('\r\x1b[K');
  }
}
