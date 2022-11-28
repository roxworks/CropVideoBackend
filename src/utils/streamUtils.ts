import { Readable, Stream } from 'stream';

/**
 * @param binary Buffer
 * returns readableInstanceStream Readable
 */
export function bufferToStream(binary: any) {
  const readableInstanceStream = new Readable({
    read() {
      this.push(binary);
      this.push(null);
    },
  });

  return readableInstanceStream;
}

export async function stream2buffer(stream: Stream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    // eslint-disable-next-line no-underscore-dangle
    const _buf = [];

    stream.on('data', (chunk) => _buf.push(chunk));
    // @ts-ignore
    stream.on('end', () => resolve(Buffer.concat(_buf)));
    stream.on('error', (err) => reject(err));
  });
}
