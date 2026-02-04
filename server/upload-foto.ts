import { storagePut } from './storage';

/**
 * Upload a photo for a parada to S3
 * @param file - Base64 encoded image data
 * @param cobertizoId - ID of the parada
 * @returns URL of the uploaded image
 */
export async function uploadParadaFoto(file: string, cobertizoId: string): Promise<string> {
  // Extract base64 data and mime type
  const matches = file.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image data');
  }
  
  const mimeType = matches[1];
  const base64Data = matches[2];
  
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Generate unique filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const extension = mimeType.split('/')[1];
  const fileKey = `paradas/${cobertizoId}-${timestamp}-${random}.${extension}`;
  
  // Upload to S3
  const result = await storagePut(fileKey, buffer, mimeType);
  
  return result.url;
}
