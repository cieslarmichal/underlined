import sharp from 'sharp';

export interface OptimizedImage {
  readonly buffer: Buffer;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
  readonly size: number;
}

export interface ImageOptimizationOptions {
  readonly maxWidth?: number;
  readonly maxHeight?: number;
  readonly quality?: number;
  readonly format?: 'webp' | 'jpeg' | 'png';
}

export class ImageOptimizationService {
  public async optimizeImage(buffer: Buffer, options: ImageOptimizationOptions = {}): Promise<OptimizedImage> {
    const { maxWidth = 2048, maxHeight = 2048, quality = 85, format = 'webp' } = options;

    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Resize if needed
      if (metadata.width && metadata.height) {
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          image.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        }
      }

      // Convert to specified format with compression
      let processedImage = image;

      switch (format) {
        case 'webp':
          processedImage = image.webp({ quality, effort: 4 });
          break;
        case 'jpeg':
          processedImage = image.jpeg({ quality, mozjpeg: true });
          break;
        case 'png':
          processedImage = image.png({ quality, compressionLevel: 9 });
          break;
      }

      const optimizedBuffer = await processedImage.toBuffer();
      const optimizedMetadata = await sharp(optimizedBuffer).metadata();

      return {
        buffer: optimizedBuffer,
        mimeType: this.getMimeType(format),
        width: optimizedMetadata.width || 0,
        height: optimizedMetadata.height || 0,
        size: optimizedBuffer.length,
      };
    } catch (error) {
      throw new Error(`Image optimization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validates image format and size
   * @param buffer - Image buffer
   * @param maxSizeBytes - Maximum file size in bytes
   * @returns True if valid, throws error otherwise
   */
  public async validateImage(buffer: Buffer, maxSizeBytes = 10 * 1024 * 1024): Promise<boolean> {
    if (buffer.length > maxSizeBytes) {
      throw new Error(`Image size exceeds maximum allowed size of ${String(maxSizeBytes)} bytes`);
    }

    try {
      const metadata = await sharp(buffer).metadata();
      const format = metadata.format as string;

      const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
      if (!allowedFormats.includes(format.toLowerCase())) {
        throw new Error(`Unsupported image format: ${format}`);
      }

      return true;
    } catch (error) {
      throw new Error(`Image validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getMimeType(format: 'webp' | 'jpeg' | 'png'): string {
    const mimeTypes: Record<string, string> = {
      webp: 'image/webp',
      jpeg: 'image/jpeg',
      png: 'image/png',
    };

    return mimeTypes[format] ?? 'image/webp';
  }
}
