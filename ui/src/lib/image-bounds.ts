export function getContainedImageRect(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number,
  padding = 24,
): { x: number; y: number; width: number; height: number } {
  const availW = containerW - padding * 2;
  const availH = containerH - padding * 2;
  const scale = Math.min(availW / imageW, availH / imageH);
  const width = imageW * scale;
  const height = imageH * scale;
  const x = padding + (availW - width) / 2;
  const y = padding + (availH - height) / 2;
  return { x, y, width, height };
}

export function stickerScreenRect(
  sticker: { x: number; y: number; width: number; aspectRatio: number },
  imageRect: { x: number; y: number; width: number; height: number },
  canvasW: number,
  canvasH: number,
): { x: number; y: number; width: number; height: number } {
  const stickerCanvasW = canvasW * sticker.width;
  const stickerCanvasH = stickerCanvasW * sticker.aspectRatio;
  const scaleX = imageRect.width / canvasW;
  const scaleY = imageRect.height / canvasH;

  return {
    x: imageRect.x + sticker.x * canvasW * scaleX,
    y: imageRect.y + sticker.y * canvasH * scaleY,
    width: stickerCanvasW * scaleX,
    height: stickerCanvasH * scaleY,
  };
}
