import sharp from 'sharp';
const [saida, ...arqs] = process.argv.slice(2);
const W = 720, H = 450;
const comp = [];
for (let i = 0; i < arqs.length; i++) {
  const img = await sharp('out/' + arqs[i] + '.png').resize(W, H, { fit: 'contain', background: '#888' }).toBuffer();
  comp.push({ input: img, left: (i % 2) * W, top: Math.floor(i / 2) * H });
}
await sharp({ create: { width: 2 * W, height: Math.ceil(arqs.length / 2) * H, channels: 3, background: '#888' } }).composite(comp).png().toFile('out/_' + saida + '.png');
