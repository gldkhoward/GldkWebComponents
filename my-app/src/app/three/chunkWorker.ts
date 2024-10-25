/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

import { Chunk } from './chunk';

self.onmessage = (e: MessageEvent) => {
  if (e.data.type === 'generateChunk') {
    const { x, z, params } = e.data;
    
    const chunk = new Chunk(params.chunkSize, params);
    chunk.position.set(
      x * params.chunkSize,
      0,
      z * params.chunkSize
    );
    
    chunk.generate();
    
    self.postMessage({
      type: 'chunkGenerated',
      x,
      z,
      chunkData: chunk.serialize()
    });
  }
};