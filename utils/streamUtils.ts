import { Readable, Stream } from 'stream';

/**
 * @param binary Buffer
 * returns readableInstanceStream Readable
 */
export function bufferToStream(binary) {
  const readableInstanceStream = new Readable({
    read() {
      this.push(binary);
      this.push(null);
    },
  });

  return readableInstanceStream;
}

export async function stream2buffer(stream) {
  return new Promise((resolve, reject) => {
    const _buf = Array();

    stream.on('data', (chunk) => _buf.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(_buf)));
    stream.on('error', (err) => reject(`error converting stream - ${err}`));
  });
}
