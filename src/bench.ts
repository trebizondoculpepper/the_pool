/**
 * The development benchmarks' page (`bench.html`, not part of the build):
 * `?bench=components` runs the component benchmark (mission 094,
 * `toolkit/gallery/views/component-bench.ts`); `?bench=lookables` the look
 * audit (mission 127, `toolkit/gallery/views/look-audit-page.ts`), one room
 * with `&room=<id>`, else every room's summary.
 */
const root = document.querySelector<HTMLElement>('#bench');
const which = new URLSearchParams(location.search).get('bench');
if (!import.meta.env.DEV) {
  if (root)
    root.textContent = 'The benchmarks run on the development server only.';
} else if (root && which === 'components') {
  const { runComponentBench } =
    await import('./toolkit/gallery/views/component-bench');
  await runComponentBench(root);
} else if (root && which === 'lookables') {
  const { runLookAuditPage } =
    await import('./toolkit/gallery/views/look-audit-page');
  await runLookAuditPage(root);
} else if (root) {
  const p = document.createElement('p');
  p.innerHTML =
    '<a href="?bench=components&slot=bench094">Run the component benchmark</a> · <a href="?bench=lookables">The look audit</a>';
  root.append(p);
}
