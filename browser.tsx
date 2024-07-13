import '@quilted/quilt/globals';
import {hydrate} from 'preact';
import {Browser, BrowserContext} from '@quilted/quilt/browser';
import {Router} from '@quilted/quilt/navigate';
import {on, NestedAbortController} from '@quilted/quilt/events';
import {createThreadFromServiceWorker} from '@quilted/quilt/threads';

import type {AppContext} from '~/shared/context.ts';

import {App} from './App.tsx';
import type {ServiceWorkerThread} from './service-worker.ts';

const element = document.querySelector('#app')!;
const browser = new Browser();

const context = {
  router: new Router(browser.request.url),
} satisfies AppContext;

// Makes key parts of the app available in the browser console
Object.assign(globalThis, {app: context});

hydrate(
  <BrowserContext browser={browser}>
    <App context={context} />
  </BrowserContext>,
  element,
);

installServiceWorker();

// Service worker helpers

async function installServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.register(
      '/service-worker.js',
      {scope: '/'},
    );

    skipWaitingForServiceWorker(registration);
    checkInWithActiveServiceWorker();
  }
}

async function checkInWithActiveServiceWorker() {
  if (navigator.serviceWorker.controller) {
    // Create a thread to communicate with the active service worker
    const thread = createThreadFromServiceWorker<{}, ServiceWorkerThread>(
      navigator.serviceWorker.controller,
    );

    await thread.checkingIn();
  }
}

async function skipWaitingForServiceWorker(
  registration: ServiceWorkerRegistration,
) {
  try {
    for await (const serviceWorker of onInstalledServiceWorker(registration)) {
      console.log('[app] newly installed service worker found', serviceWorker);

      // Create a thread to communicate with the service worker, and tell
      // the service worker to skip waiting
      const thread = createThreadFromServiceWorker<{}, ServiceWorkerThread>(
        serviceWorker,
      );

      await thread.skipWaiting();
    }
  } catch {}
}

async function* onInstalledServiceWorker(
  registration: ServiceWorkerRegistration,
  {signal}: {signal?: AbortSignal} = {},
) {
  try {
    let updateAbortController: AbortController | undefined;

    registration.addEventListener(
      'updatefound',
      () => {
        updateAbortController?.abort();
      },
      {signal},
    );

    // Wait until there is an update in the service worker registration
    for await (const _ of on(registration, 'updatefound', {signal})) {
      // Create a new abort controller for this iteration. The above
      // `addEventListener` will abort this controller if there is another update
      // found while dealing with the current one.
      updateAbortController = signal
        ? new NestedAbortController(signal)
        : new AbortController();

      // There should be an `installing` service worker now, return if not
      const serviceWorker = registration.installing;
      if (!serviceWorker) continue;

      // On each update to the service worker’s state, if it’s installed, yield
      // the service worker
      for await (const _ of on(serviceWorker, 'statechange', {
        signal: updateAbortController.signal,
      })) {
        if (serviceWorker.state !== 'installed') continue;
        yield serviceWorker as ServiceWorker & {state: 'installed'};
      }
    }
  } catch {}
}
