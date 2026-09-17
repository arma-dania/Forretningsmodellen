// Står i stedet for @netlify/blobs under afprøvning. Samme lille flade,
// men alt ligger i hukommelsen.
const butikker = new Map();
export function getStore(){
  const m = butikker.get("std") ?? (butikker.set("std", new Map()), butikker.get("std"));
  return {
    async get(n){ const v = m.get(n); return v === undefined ? null : JSON.parse(v); },
    async setJSON(n, v){ m.set(n, JSON.stringify(v)); },
    async delete(n){ m.delete(n); },
    async list({ prefix = "" } = {}){
      return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).sort().map(key => ({ key })) };
    },
  };
}
export const _ryd = () => butikker.clear();
