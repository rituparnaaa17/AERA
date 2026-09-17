import { STRIDE, WINDOW_SIZE } from '@/utils/constants';

export type SensorSample = {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  timestamp: number;
};

export class SensorWindowBuffer {
  private buffer: SensorSample[] = [];

  push(sample: SensorSample): number[][][] {
    this.buffer.push(sample);
    if (this.buffer.length < WINDOW_SIZE) return [];
    const window = this.buffer.slice(0, WINDOW_SIZE).map(({ ax, ay, az, gx, gy, gz }) => [ax, ay, az, gx, gy, gz]);
    this.buffer = this.buffer.slice(STRIDE);
    return [window];
  }

  clear() {
    this.buffer = [];
  }
}