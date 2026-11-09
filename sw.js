const C='ep-v2',L='ep-libs-v1',F=['./','index.html','app.js','gen.js','manifest.json','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(F.map(u=>new Request(u,{cache:'reload'})))));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!==L).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const q=e.request;if(q.method!=='GET')return;const u=new URL(q.url);
  // Librerías del CDN (URLs con versión fija): primero caché, si no red y se guarda
  if(u.hostname==='cdn.jsdelivr.net'){e.respondWith(caches.open(L).then(c=>c.match(q).then(m=>m||fetch(q).then(r=>{if(r.ok||r.type==='opaque')c.put(q,r.clone());return r;}))));return;}
  if(u.origin!==location.origin)return;
  // App: primero red (sin caché HTTP); si falla o no es ok, la copia guardada
  e.respondWith(fetch(q,{cache:'no-store'}).then(r=>{if(!r.ok)return caches.match(q,{ignoreSearch:true}).then(m=>m||r);const c=r.clone();caches.open(C).then(x=>x.put(q,c));return r;}).catch(()=>caches.match(q,{ignoreSearch:true})));});
