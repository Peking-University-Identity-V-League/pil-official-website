import sharp from 'sharp';

// Preserve the supplied code's pixels and its complete white identification
// area. Only the neutral gray background connected to the crop's edges is
// made transparent; the enclosed gray code marks remain untouched.
const { data, info } = await sharp('assets/source/douyin-share.jpg')
  .extract({ left: 185, top: 208, width: 710, height: 710 })
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const visited = new Uint8Array(width * height);
const queue = new Uint32Array(width * height);
let head = 0;
let tail = 0;
function enqueue(pixel) {
  if (visited[pixel]) return;
  visited[pixel] = 1;
  const offset = pixel * 4;
  const channels = [data[offset], data[offset + 1], data[offset + 2]];
  if (Math.max(...channels) >= 245 || Math.max(...channels) - Math.min(...channels) > 12) return;
  queue[tail++] = pixel;
}
for (let x = 0; x < width; x++) {
  enqueue(x);
  enqueue((height - 1) * width + x);
}
for (let y = 0; y < height; y++) {
  enqueue(y * width);
  enqueue(y * width + width - 1);
}
while (head < tail) {
  const pixel = queue[head++];
  const x = pixel % width;
  const y = Math.floor(pixel / width);
  data[pixel * 4 + 3] = 0;
  if (x > 0) enqueue(pixel - 1);
  if (x < width - 1) enqueue(pixel + 1);
  if (y > 0) enqueue(pixel - width);
  if (y < height - 1) enqueue(pixel + width);
}
await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile('public/assets/qr/douyin.png');
console.log(`Cropped supplied Douyin code; removed ${tail} outer background pixels without changing enclosed code pixels.`);
