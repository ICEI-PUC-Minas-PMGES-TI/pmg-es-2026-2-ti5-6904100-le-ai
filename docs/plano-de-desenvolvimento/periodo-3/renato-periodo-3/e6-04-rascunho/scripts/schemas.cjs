const yaml = require(process.argv[2]); const fs = require('fs');
const want = process.argv.slice(4);
const d = yaml.load(fs.readFileSync(process.argv[3], 'utf8'));
function res(s, depth = 0) {
  if (!s || depth > 3) return s && s.$ref ? s.$ref.split('/').pop() : s;
  if (s.$ref) return res(d.components.schemas[s.$ref.split('/').pop()], depth + 1);
  if (s.properties) { const o = {}; for (const [k, v] of Object.entries(s.properties)) { const r = v.$ref ? res(v, depth+1) : v; o[k + ((s.required||[]).includes(k)?'*':'')] = r.enum ? r.enum.join('|') : (r.type === 'object' ? res(r, depth+1) : (r.type || (r.oneOf? 'oneOf': '?'))); } return o; }
  if (s.oneOf) return s.oneOf.map(x => res(x, depth+1));
  if (s.allOf) return s.allOf.map(x => res(x, depth+1));
  return s.type;
}
for (const [p, ops] of Object.entries(d.paths)) for (const [m, op] of Object.entries(ops)) {
  if (!['post','put','patch'].includes(m)) continue;
  if (want.length && !want.some(w => p.includes(w))) continue;
  const s = op.requestBody?.content?.['application/json']?.schema;
  console.log(m.toUpperCase(), p, JSON.stringify(res(s)));
}
