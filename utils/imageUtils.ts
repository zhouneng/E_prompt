// Simple PNG metadata writer for client-side usage
// Adds a tEXt chunk with key "Parameters" (common in AI art) or "Description"

const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

export async function addMetadataToBase64Image(base64: string, prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Decode Base64
      const binaryString = atob(base64.split(',')[1]);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Check for PNG signature
      const signature = [137, 80, 78, 71, 13, 10, 26, 10];
      for (let i = 0; i < 8; i++) {
        if (bytes[i] !== signature[i]) throw new Error("Not a valid PNG");
      }

      // Prepare tEXt chunk
      // Keyword: "Parameters" (used by Automatic1111) or "Description"
      const keyword = "Description";
      const textData = keyword + "\0" + prompt;
      const textEncoder = new TextEncoder();
      const textBytes = textEncoder.encode(textData);
      
      const chunkLength = textBytes.length;
      const chunkType = new Uint8Array([116, 69, 88, 116]); // "tEXt"
      
      // Calculate CRC
      const crcBuffer = new Uint8Array(4 + chunkLength);
      crcBuffer.set(chunkType, 0);
      crcBuffer.set(textBytes, 4);
      const crcVal = crc32(crcBuffer);
      
      const lenBuffer = new Uint8Array(4);
      new DataView(lenBuffer.buffer).setUint32(0, chunkLength, false); // Big endian
      
      const crcOutBuffer = new Uint8Array(4);
      new DataView(crcOutBuffer.buffer).setUint32(0, crcVal, false);

      // Construct new file
      // Insert after IHDR (usually ends at byte 33)
      let pos = 8;
      while (pos < bytes.length) {
        const len = new DataView(bytes.buffer).getUint32(pos, false);
        const type = String.fromCharCode(bytes[pos+4], bytes[pos+5], bytes[pos+6], bytes[pos+7]);
        if (type === 'IHDR') {
          pos += 12 + len; // Length(4) + Type(4) + Data(len) + CRC(4)
          break;
        }
        pos += 12 + len;
      }

      const newBytes = new Uint8Array(bytes.length + 12 + chunkLength);
      newBytes.set(bytes.slice(0, pos), 0);
      
      // Insert Chunk
      let offset = pos;
      newBytes.set(lenBuffer, offset); offset += 4;
      newBytes.set(chunkType, offset); offset += 4;
      newBytes.set(textBytes, offset); offset += chunkLength;
      newBytes.set(crcOutBuffer, offset); offset += 4;
      
      newBytes.set(bytes.slice(pos), offset);

      // Re-encode to Base64
      let binary = '';
      const newLen = newBytes.byteLength;
      // Use a chunked approach to avoid call stack limits on large images
      for (let i = 0; i < newLen; i+=1024) {
          binary += String.fromCharCode.apply(null, Array.from(newBytes.slice(i, Math.min(i+1024, newLen))));
      }
      
      resolve(`data:image/png;base64,${btoa(binary)}`);

    } catch (e) {
      reject(e);
    }
  });
}
