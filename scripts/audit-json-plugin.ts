import { runnerImport } from 'vite-plus';
import type { Plugin, ViteDevServer } from 'vite-plus';

/**
 * The audits' JSON exports (mission 167; the owner approved the plugin,
 * 2026-11-04): `audit/index.json`, `audit/room/<id>.json` and
 * `audit/kind/<kind>.json`, real JSON with its content type, served by the
 * dev server from the pure audit model and written into the static build
 * beside the pages (relative paths, `base: './'`). No scene is built and
 * no tracked file is written.
 */

const MODEL = '/src/toolkit/gallery/logic/audit-export/audit-export.ts';

type Model =
  typeof import('../src/toolkit/gallery/logic/audit-export/audit-export.ts');
type Doc = { path: string; text: string };

const ROUTE = /^\/audit\/(?:(index)|room\/([^/]+)|kind\/([^/]+))\.json$/;

/** The document a request path asks for, or none. */
function documentFor(model: Model, path: string): Doc | undefined {
  const m = ROUTE.exec(path);
  if (!m) return undefined;
  const [, index, room, kind] = m;
  const doc = index
    ? model.auditIndex()
    : room
      ? model.roomAudit(decodeURIComponent(room))
      : model.kindAudit(decodeURIComponent(kind));
  return { path: path.slice(1), text: model.auditJson(doc) };
}

/** Every document the build writes: the index, each room, each kind. */
function allDocuments(model: Model): Doc[] {
  const index = model.auditIndex();
  const docs: Doc[] = [
    { path: model.auditJsonPath.index(), text: model.auditJson(index) },
  ];
  for (const r of index.rooms)
    docs.push({
      path: r.links.json,
      text: model.auditJson(model.roomAudit(r.id)),
    });
  for (const k of index.kinds)
    docs.push({
      path: k.links.json,
      text: model.auditJson(model.kindAudit(k.id)),
    });
  return docs;
}

export function auditJsonPlugin(): Plugin {
  let root = process.cwd();
  return {
    name: 'pool-plant-audit-json',
    configResolved(config) {
      root = config.root;
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0];
        if (!ROUTE.test(path)) return next();
        server
          .ssrLoadModule(MODEL)
          .then((model) => {
            const doc = documentFor(model as Model, path);
            if (!doc) return next();
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.end(doc.text);
          })
          .catch((error: unknown) => {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(`${JSON.stringify({ error: String(error) })}\n`);
          });
      });
    },
    async generateBundle() {
      const { module } = await runnerImport<Model>(`${root}${MODEL}`, {
        root,
        configFile: false,
        logLevel: 'error',
      });
      for (const doc of allDocuments(module))
        this.emitFile({ type: 'asset', fileName: doc.path, source: doc.text });
    },
  };
}
