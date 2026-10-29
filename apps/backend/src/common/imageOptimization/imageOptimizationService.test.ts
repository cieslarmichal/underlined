import { describe, expect, it } from 'vitest';

import { ImageOptimizationService } from './imageOptimizationService.ts';

describe('ImageOptimizationService', () => {
  const service = new ImageOptimizationService();

  // Create a simple test image buffer (1x1 red pixel PNG)
  const createTestImage = (): Buffer => {
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
      'base64',
    );
  };

  describe('optimizeImage', () => {
    it('should optimize an image to WebP format', async () => {
      const testBuffer = createTestImage();

      const result = await service.optimizeImage(testBuffer, {
        quality: 85,
        format: 'webp',
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.mimeType).toBe('image/webp');
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should optimize an image to JPEG format', async () => {
      const testBuffer = createTestImage();

      const result = await service.optimizeImage(testBuffer, {
        quality: 85,
        format: 'jpeg',
      });

      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should resize image if larger than max dimensions', async () => {
      const testBuffer = createTestImage();

      const result = await service.optimizeImage(testBuffer, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 85,
        format: 'webp',
      });

      expect(result.width).toBeLessThanOrEqual(500);
      expect(result.height).toBeLessThanOrEqual(500);
    });

    it('should use default options when not specified', async () => {
      const testBuffer = createTestImage();

      const result = await service.optimizeImage(testBuffer);

      expect(result.mimeType).toBe('image/webp');
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should throw error for invalid image buffer', async () => {
      const invalidBuffer = Buffer.from('not an image');

      await expect(service.optimizeImage(invalidBuffer)).rejects.toThrow('Image optimization failed');
    });
  });

  describe('validateImage', () => {
    it('should validate a correct image', async () => {
      const testBuffer = createTestImage();

      const result = await service.validateImage(testBuffer);

      expect(result).toBe(true);
    });

    it('should throw error for oversized image', async () => {
      const testBuffer = createTestImage();
      const maxSize = 10; // Very small limit

      await expect(service.validateImage(testBuffer, maxSize)).rejects.toThrow('exceeds maximum allowed size');
    });

    it('should throw error for invalid image format', async () => {
      const invalidBuffer = Buffer.from('not an image');

      await expect(service.validateImage(invalidBuffer)).rejects.toThrow('Image validation failed');
    });

    it('should accept various image formats', async () => {
      const testBuffer = createTestImage();

      // PNG format (our test image)
      await expect(service.validateImage(testBuffer)).resolves.toBe(true);
    });
  });
});
