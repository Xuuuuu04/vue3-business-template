export class ResponseLimitExceeded extends Error {}

export async function readResponse(
  reply: Response,
  limit: number,
): Promise<Blob> {
  const declared = Number(reply.headers.get("Content-Length"));
  if (declared > limit) {
    await reply.body?.cancel();
    throw new ResponseLimitExceeded();
  }
  const reader = reply.body?.getReader();
  const chunks: BlobPart[] = [];
  let bytes = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > limit) throw new ResponseLimitExceeded();
        chunks.push(value as Uint8Array<ArrayBuffer>);
      }
    } catch (error) {
      await reader.cancel().catch(() => undefined);
      throw error;
    } finally {
      reader.releaseLock();
    }
  }
  return new Blob(chunks, { type: reply.headers.get("Content-Type") ?? "" });
}
