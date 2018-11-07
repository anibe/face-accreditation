(() => {
    navigator.serviceWorker && navigator.serviceWorker.register('/sw.js').then(function (registration) {
        console.log('Excellent, registered with scope: ', registration.scope);
    });

    function installSW() {
        const SW_CACHE_NAME = 'face-valiate-cache01';
        const filesToCache = [
            './',
            './javascripts/main.js',
            './stylessheets/styles.css',
            './images/camera.png',
            './images/inec-logo.png'
        ];

        self.addEventListener('install', (e) => {
            console.log('SW install');
            e.waitUntil(
                caches.open(SW_CACHE_NAME).then((cache) => {
                    console.log('SW caching app shell');
                    return cache.addAll(filesToCache);
                })
            );
        });
    }

    function activateSW() {
        self.addEventListener('activate', (e) => {
            console.log('SW Activate');
            e.waitUntil(
                caches.keys().then((keyList) => {
                  return Promise.all(keyList.map((key) => {
                    if (key !== cacheName) {
                      console.log('SW Removing old cache', key);
                      return caches.delete(key);
                    }
                  }));
                })
            );
        
            return self.clients.claim();
        });        
    }

    function init() {
        installSW();
        activateSW();
    }

    init();
})();