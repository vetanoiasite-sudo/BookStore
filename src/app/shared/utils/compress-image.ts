/**
 * Shrinks a photograph in the browser so it fits the upload limit. Phone cameras
 * produce files of several megabytes; a book listing needs nothing like that.
 *
 * The image is scaled so its longest edge is at most `maxEdge`, the size the server
 * would scale it to anyway, and then encoded as JPEG at falling quality until it
 * fits. A file that is already small enough and of a type the server reads is
 * returned untouched, so nothing is lost by re-encoding it for no reason.
 *
 * Throws when the browser cannot decode the file, or when even the lowest quality
 * is still too large.
 */
export async function compressImage(
  file: File,
  options: { maxBytes: number; maxEdge: number; acceptedTypes: readonly string[] },
): Promise<File> {
  if (file.size <= options.maxBytes && options.acceptedTypes.includes(file.type)) {
    return file;
  }

  // Applies the EXIF orientation, so a photograph taken sideways stays upright.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  try {
    let scale = Math.min(1, options.maxEdge / Math.max(bitmap.width, bitmap.height));

    // Lower quality first; only if that is not enough, a smaller image as well.
    for (let attempt = 0; attempt < 4; attempt++) {
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas is not available.');
      }

      // JPEG has no transparency; a transparent PNG would otherwise turn black.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      for (const quality of [0.85, 0.75, 0.65, 0.55]) {
        const blob = await toBlob(canvas, quality);

        if (blob.size <= options.maxBytes) {
          return new File([blob], renameToJpeg(file.name), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
        }
      }

      scale *= 0.75;
    }

    throw new Error('The image is still too large after compression.');
  } finally {
    bitmap.close();
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be encoded.'))),
      'image/jpeg',
      quality,
    ),
  );
}

/** The server checks the extension, so the name has to match the new content. */
function renameToJpeg(name: string): string {
  const dot = name.lastIndexOf('.');
  return `${dot > 0 ? name.slice(0, dot) : name || 'photo'}.jpg`;
}
