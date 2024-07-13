import '@quilted/quilt/globals';
import {RequestRouter} from '@quilted/quilt/request-router';
import {renderToResponse} from '@quilted/quilt/server';
import {Router} from '@quilted/quilt/navigate';
import {BrowserAssets} from 'quilt:module/assets';

import type {AppContext} from '~/shared/context.ts';

import {App} from './App.tsx';

const router = new RequestRouter();
const assets = new BrowserAssets();

router.get('/service-worker.js', async (request) => {
  const originalResponse = await fetch(
    new URL('/assets/service-worker.js', request.url),
  );

  const headers = new Headers(originalResponse.headers);
  headers.set('Cache-Control', 'no-cache');

  return new Response(originalResponse.body, {
    status: originalResponse.status,
    statusText: originalResponse.statusText,
    headers,
  });
});

// For all GET requests, render our React application.
router.get(async (request) => {
  const context = {
    router: new Router(request.url),
  } satisfies AppContext;

  const response = await renderToResponse(<App context={context} />, {
    request,
    assets,
  });

  return response;
});

export default router;
