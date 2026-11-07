/** Round a channel to the 16 levels of a four-bit handset DAC. */
export function fourBitChannel(value: number): number {
  return Math.round(Math.max(0, Math.min(255, value)) / 17) * 17;
}

/** Quantise an RGBA canvas buffer in place; alpha remains unchanged. */
export function quantiseRgb444(data: Uint8ClampedArray): void {
  for (let index = 0; index < data.length; index += 4) {
    data[index] = fourBitChannel(data[index]);
    data[index + 1] = fourBitChannel(data[index + 1]);
    data[index + 2] = fourBitChannel(data[index + 2]);
  }
}
