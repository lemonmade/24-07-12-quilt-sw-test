import {createThreadsFromServiceWorkerClients} from '@quilted/quilt/threads';

const serviceWorker = self as any as ServiceWorkerGlobalScope & Worker;

export interface ServiceWorkerThread {
  skipWaiting(): Promise<void>;
  checkingIn(): Promise<void>;
}

createThreadsFromServiceWorkerClients<ServiceWorkerThread>({
  expose: {
    async skipWaiting() {
      console.log('[service worker] skip waiting!!!');
      await serviceWorker.skipWaiting();
      await serviceWorker.clients.claim();
    },
    async checkingIn() {
      console.log(
        '[service worker] app checked in on installed service worker',
      );
    },
  },
});

serviceWorker.addEventListener('install', async (_event) => {
  console.log('[service worker] installed');
});

serviceWorker.addEventListener('activate', async (_event) => {
  console.log('[service worker] activated');
});

serviceWorker.addEventListener('fetch', (event) => {
  console.log('[service worker] fetched', event.request.url);
});
