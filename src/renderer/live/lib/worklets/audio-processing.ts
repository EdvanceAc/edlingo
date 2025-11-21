/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const AudioRecordingWorklet = `
class AudioProcessingWorklet extends AudioWorkletProcessor {
  // Output buffer: 1024 samples at target rate (~64ms at 16kHz)
  buffer = new Int16Array(1024);
  bufferWriteIndex = 0;

  // Resampling config
  inRate = sampleRate; // from AudioWorkletGlobalScope
  outRate = 16000;
  step = this.inRate / this.outRate;
  phase = 0;
  accum = 0;
  accumCount = 0;

  // Simple noise gate (RMS-based), very conservative
  sumSquares = 0;

  constructor(options) {
    super(options);
    const opts = options?.processorOptions || {};
    const desiredOut = Number(opts.targetSampleRate || 16000);
    // Do NOT upsample unnecessarily; clamp at input rate
    this.outRate = Math.min(this.inRate, desiredOut);
    this.step = this.inRate / this.outRate;
    this.buffer = new Int16Array(1024);
    this.bufferWriteIndex = 0;
    this.phase = 0;
    this.accum = 0;
    this.accumCount = 0;
    this.sumSquares = 0;
  }

  process(inputs) {
    if (inputs[0].length) {
      const channel0 = inputs[0][0];
      this.processChunk(channel0);
    }
    return true;
  }

  sendAndClearBuffer(){
    // Light gating: drop frames that are effectively silence
    const rms = Math.sqrt(this.sumSquares / Math.max(1, this.bufferWriteIndex)) / 32768;
    const isSilent = rms < 0.0025; // conservative threshold

    if (!isSilent && this.bufferWriteIndex > 0) {
      this.port.postMessage({
        event: "chunk",
        data: {
          int16arrayBuffer: this.buffer.slice(0, this.bufferWriteIndex).buffer,
        },
      });
    }
    this.bufferWriteIndex = 0;
    this.sumSquares = 0;
  }

  processChunk(float32Array) {
    const l = float32Array.length;

    for (let i = 0; i < l; i++) {
      const s = float32Array[i];
      this.accum += s;
      this.accumCount += 1;
      this.phase += 1;

      if (this.phase >= this.step) {
        // Average the accumulated input samples to create one output sample
        const averaged = this.accum / this.accumCount;
        const int16Value = Math.max(-32768, Math.min(32767, Math.round(averaged * 32768)));
        this.buffer[this.bufferWriteIndex++] = int16Value;
        this.sumSquares += int16Value * int16Value;
        // Prepare for next output sample
        this.phase -= this.step;
        this.accum = 0;
        this.accumCount = 0;

        if(this.bufferWriteIndex >= this.buffer.length) {
          this.sendAndClearBuffer();
        }
      }
    }

    if(this.bufferWriteIndex >= this.buffer.length) {
      this.sendAndClearBuffer();
    }
  }
}
`;

export default AudioRecordingWorklet;
