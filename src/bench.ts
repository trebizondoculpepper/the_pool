/**
 * The development benchmarks' page (`bench.html`, built beside the game since
 * mission 216, which links its index and simulation graph from the landing
 * page as behind-the-scenes views; the owner's brief promises no more than
 * that, and a page needing the dev server may say so):
 * `?bench=components` runs the component benchmark (mission 094,
 * `toolkit/gallery/views/component-bench.ts`); `?bench=lookables` the look
 * audit (mission 127, `toolkit/gallery/views/look-audit-page.ts`), one room
 * with `&room=<id>`, else every room's summary; `?bench=room-audit&room=<id>`
 * the room audit (mission 129, `toolkit/gallery/views/room-audit-page.ts`);
 * `?bench=item-audit&kind=<kind>` the item audit, `?bench=trait-audit[&trait=<t>]`
 * the trait audit (mission 174), `?bench=magic-room&kind=…`
 * its magic room and `?bench=magic-page&kind=…` its magic page (mission 130,
 * `toolkit/gallery/views/item-audit-page.ts`, `magic-room.ts`);
 * `?bench=brand-audit&brand=<id>` a brand's audit (every brand without
 * `brand`) and `?bench=unbranded` the unbranded goods (mission 136,
 * `toolkit/gallery/views/brand-audit-page.ts`). With no `bench=`, the
 * bench index (mission 137, `toolkit/gallery/views/bench-index-page.ts`):
 * every page registered in `logic/page-registry.ts` as one tree.
 */
const root = document.querySelector<HTMLElement>('#bench');
const which = new URLSearchParams(location.search).get('bench');
if (root && which === 'components') {
  const { runComponentBench } =
    await import('./toolkit/gallery/views/component-bench');
  await runComponentBench(root);
} else if (root && which === 'lookables') {
  const { runLookAuditPage } =
    await import('./toolkit/gallery/views/look-audit-page');
  await runLookAuditPage(root);
} else if (root && which === 'room-audit') {
  const { runRoomAuditPage } =
    await import('./toolkit/gallery/views/room-audit-page');
  await runRoomAuditPage(root);
} else if (root && which === 'item-audit') {
  // Mission 133's CAD views register their section first.
  await import('./toolkit/gallery/views/cad-views');
  const { runItemAuditPage } =
    await import('./toolkit/gallery/views/item-audit-page');
  await runItemAuditPage(root);
} else if (root && which === 'magic-page') {
  const { runMagicPage } =
    await import('./toolkit/gallery/views/item-audit-page');
  await runMagicPage(root);
} else if (root && which === 'magic-room') {
  const { runMagicRoom } = await import('./toolkit/gallery/views/magic-room');
  runMagicRoom(root);
} else if (root && which === 'brand-audit') {
  const { runBrandAuditPage } =
    await import('./toolkit/gallery/views/brand-audit-page');
  await runBrandAuditPage(root);
} else if (root && which === 'unbranded') {
  const { runUnbrandedPage } =
    await import('./toolkit/gallery/views/brand-audit-page');
  await runUnbrandedPage(root);
} else if (root && which === 'sim-node') {
  // Mission 138: a simulation node's page, every node, an architectural object.
  const { runSimNodePage } =
    await import('./toolkit/gallery/views/sim-node-page');
  runSimNodePage(root);
} else if (root && which === 'sim-graph') {
  const { runSimGraphPage } =
    await import('./toolkit/gallery/views/sim-node-page');
  runSimGraphPage(root);
} else if (root && which === 'sim-object') {
  const { runSimObjectPage } =
    await import('./toolkit/gallery/views/sim-node-page');
  await runSimObjectPage(root);
} else if (root && which === 'trait-audit') {
  // Mission 174: one trait, or every trait.
  const { runTraitAuditPage } =
    await import('./toolkit/gallery/views/trait-audit-page');
  runTraitAuditPage(root);
} else if (root && which === 'object-detail') {
  const { runObjectDetailPage } =
    await import('./toolkit/gallery/views/object-detail-page');
  runObjectDetailPage(root);
} else if (root) {
  const { runBenchIndex } =
    await import('./toolkit/gallery/views/bench-index-page');
  await runBenchIndex(root);
}

export {};
