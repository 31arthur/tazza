/// <reference types="node" />
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A small shared server so several computers can work on the same edition.
 *
 *   SYNC_TOKEN=secret node tools/syncServer.ts        (port 8787, data in ./.tazza-sync)
 *
 * It only stores and hands out documents (stories, editions, photo details) and photo files.
 * Merging happens on each computer; the server just refuses a change made on top of an out-of-date
 * revision, which tells that computer to pull, combine and try again. The token is one shared
 * secret: use HTTPS in front of it if it is reachable from outside your network.
 */

interface StoredDoc {
  rev: number;
  deleted: boolean;
  doc?: unknown;
}

interface Store {
  counter: number;
  docs: Record<string, StoredDoc>;
}

export interface SyncServerOptions {
  dataDir: string;
  token: string;
}

const KINDS = new Set(['article', 'edition', 'asset']);
const ASSET_ID = /^[A-Za-z0-9._-]+$/;

const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

const send = (res: ServerResponse, status: number, body: unknown, type = 'application/json') => {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.end(typeof body === 'string' || body instanceof Buffer ? body : JSON.stringify(body));
};

export function createSyncServer({ dataDir, token }: SyncServerOptions): Server {
  mkdirSync(join(dataDir, 'assets'), { recursive: true });
  const file = join(dataDir, 'state.json');
  const store: Store = existsSync(file)
    ? (JSON.parse(readFileSync(file, 'utf8')) as Store)
    : { counter: 0, docs: {} };

  const persist = () => {
    writeFileSync(`${file}.tmp`, JSON.stringify(store));
    renameSync(`${file}.tmp`, file);
  };

  return createServer((req, res) => {
    void (async () => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
      if (req.method === 'OPTIONS') return send(res, 204, '');

      if (token !== '' && req.headers.authorization !== `Bearer ${token}`) {
        return send(res, 401, { error: 'unauthorized' });
      }

      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = url.pathname;

      if (req.method === 'GET' && path === '/sync/ping') return send(res, 200, { ok: true });

      if (req.method === 'GET' && path === '/sync/changes') {
        const since = Number(url.searchParams.get('since') ?? '0');
        const changes = Object.entries(store.docs)
          .filter(([, d]) => d.rev > since)
          .map(([key, d]) => {
            const at = key.indexOf(':');
            return { kind: key.slice(0, at), id: key.slice(at + 1), rev: d.rev, deleted: d.deleted, doc: d.doc };
          })
          .sort((a, b) => a.rev - b.rev);
        return send(res, 200, { cursor: store.counter, changes });
      }

      if (req.method === 'POST' && path === '/sync/push') {
        const body = JSON.parse((await readBody(req)).toString('utf8')) as {
          kind: string;
          id: string;
          ifRev: number;
          deleted: boolean;
          doc?: unknown;
        };
        if (!KINDS.has(body.kind) || typeof body.id !== 'string' || body.id === '') {
          return send(res, 400, { error: 'bad request' });
        }
        const key = `${body.kind}:${body.id}`;
        if ((store.docs[key]?.rev ?? 0) !== body.ifRev) return send(res, 409, { conflict: true });
        store.counter += 1;
        store.docs[key] = { rev: store.counter, deleted: body.deleted === true, doc: body.doc };
        persist();
        return send(res, 200, { rev: store.counter });
      }

      const asset = /^\/sync\/assets\/([^/]+)$/.exec(path);
      if (asset) {
        const id = decodeURIComponent(asset[1] ?? '');
        if (!ASSET_ID.test(id)) return send(res, 400, { error: 'bad id' });
        const target = join(dataDir, 'assets', id);
        if (req.method === 'PUT') {
          writeFileSync(target, await readBody(req));
          writeFileSync(`${target}.type`, String(req.headers['content-type'] ?? 'application/octet-stream'));
          return send(res, 200, { ok: true });
        }
        if (req.method === 'GET') {
          if (!existsSync(target)) return send(res, 404, { error: 'not found' });
          const type = existsSync(`${target}.type`) ? readFileSync(`${target}.type`, 'utf8') : 'application/octet-stream';
          return send(res, 200, readFileSync(target), type);
        }
      }
      return send(res, 404, { error: 'not found' });
    })().catch((error: unknown) => send(res, 500, { error: String(error) }));
  });
}

// Run directly: `node tools/syncServer.ts`
const entry = process.argv[1] ?? '';
if (entry.replace(/\\/g, '/').endsWith('tools/syncServer.ts')) {
  const port = Number(process.env['PORT'] ?? 8787);
  const token = process.env['SYNC_TOKEN'] ?? '';
  const dataDir = process.env['SYNC_DATA'] ?? join(process.cwd(), '.tazza-sync');
  if (token === '') {
    console.warn('Warning: SYNC_TOKEN is not set, so anyone who can reach this server can read and change the data.');
  }
  createSyncServer({ dataDir, token }).listen(port, () => {
    console.log(`Tazza sync server on http://localhost:${port} (data in ${dataDir})`);
  });
}
