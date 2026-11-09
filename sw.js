const CACHE='mi-botonera-v2';
const DATOS_CACHE='mi-botonera-datos';
const FILES=['./','./index.html','./src/main.js','./src/styles.css','./manifest.webmanifest','./icon.svg'];

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));

self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE && key!==DATOS_CACHE).map(key=>caches.delete(key))))));

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;

  const url=new URL(event.request.url);

  // datos.json: estrategia network-first (siempre intenta red, si falla usa la última copia cacheada)
  if(url.pathname.endsWith('/datos.json')){
    event.respondWith(
      fetch(event.request).then(response=>{
        if(response && response.status===200){
          const copy=response.clone();
          caches.open(DATOS_CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      }).catch(()=>caches.match(event.request))
    );
    return;
  }

  // Resto de recursos: cache-first habitual
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;})));
});