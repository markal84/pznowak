/** `heic-decode` (libheif w WebAssembly) nie ma własnych typów; tylko to, czego używa src/lib/attachments/image.ts. */
declare module 'heic-decode' {
  type DecodedImage = { width: number; height: number; data: Uint8ClampedArray }
  type HeicImage = { width: number; height: number; decode: () => Promise<DecodedImage> }
  type Decode = ((input: { buffer: Uint8Array }) => Promise<DecodedImage>) & {
    all: (input: { buffer: Uint8Array }) => Promise<HeicImage[]>
  }
  const decode: Decode
  export default decode
}
