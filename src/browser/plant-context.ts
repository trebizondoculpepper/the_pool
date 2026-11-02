import type { WorldStore } from '../toolkit/save/world-store';
import {
  getPlantAlarm,
  getPlantConnections,
  getPlantEquipment,
  listPlantAlarms,
  listPlantEquipment,
  listPlantEvents,
  listPlantSystems,
  plantAlarmFacts,
  plantContextCoverage,
  plantEquipmentFacts,
  plantWashFacts,
} from '../game/diagnostics/plant-context';
import { INSTALLED_VALVES } from '../game/plant/installed-valves';
import { MOTOR_TAGS } from '../game/plant/motor-starters';
import type { World } from '../game/world';
import './plant-context.css';

const SETTING_KEY = 'pool-plant:ai-context';
const REPORT_HASH = '#plant-context-report';
let enabledOverride: boolean | null = null;

type PlantContextApi = ReturnType<typeof createPlantContextApi>;

declare global {
  interface Window {
    __poolDiagnostics?: PlantContextApi;
  }
}

function contextEnabled(): boolean {
  if (enabledOverride !== null) return enabledOverride;
  try {
    return localStorage.getItem(SETTING_KEY) !== 'off';
  } catch {
    return true;
  }
}

function setContextEnabled(enabled: boolean): void {
  enabledOverride = enabled;
  try {
    localStorage.setItem(SETTING_KEY, enabled ? 'on' : 'off');
  } catch {
    // Keep the in-page switch working where storage is unavailable.
  }
}

/** Live reads only; no store, World, or dispatch method is returned. */
export function createPlantContextApi(store: WorldStore) {
  const world = () => store.world.value;
  const on = <T>(read: (snapshot: World) => T): T | null => {
    if (!contextEnabled()) return null;
    return read(world());
  };
  return Object.freeze({
    schema: 1 as const,
    isEnabled: contextEnabled,
    listSystems: () =>
      on((snapshot) => ({
        schema: 1 as const,
        worldTime: snapshot.time,
        items: listPlantSystems(snapshot),
      })),
    listEquipment: (query?: Parameters<typeof listPlantEquipment>[1]) =>
      on((snapshot) => listPlantEquipment(snapshot, query)),
    getEquipment: (ref: string) =>
      on((snapshot) => ({
        schema: 1 as const,
        worldTime: snapshot.time,
        item: getPlantEquipment(snapshot, ref),
      })),
    getConnections: (ref: string) =>
      on((snapshot) => getPlantConnections(snapshot, ref)),
    listAlarms: (query?: Parameters<typeof listPlantAlarms>[1]) =>
      on((snapshot) => listPlantAlarms(snapshot, query)),
    getAlarm: (ref: string) =>
      on((snapshot) => ({
        schema: 1 as const,
        worldTime: snapshot.time,
        item: getPlantAlarm(snapshot, ref),
      })),
    getRecentEvents: (query?: Parameters<typeof listPlantEvents>[2]) =>
      on((snapshot) => listPlantEvents(snapshot, store.events.value, query)),
    getCoverage: () => on((snapshot) => plantContextCoverage(snapshot)),
    getWashState: () => on((snapshot) => plantWashFacts(snapshot)),
    getViewContext: () =>
      on((snapshot) => ({
        schema: 1 as const,
        worldTime: snapshot.time,
        room: new URLSearchParams(location.search).get('room'),
        inspectionRef: new URLSearchParams(location.search).get('look'),
      })),
  });
}

function summary(world: World): string {
  const view = new URLSearchParams(location.search);
  const running = MOTOR_TAGS.filter(
    (tag) => world.motors.starters[tag].running,
  );
  const tripped = MOTOR_TAGS.filter(
    (tag) => world.motors.starters[tag].tripped,
  );
  const abnormalValves = Object.values(INSTALLED_VALVES).filter((valve) => {
    const actual = world.installedValves[valve.assetId];
    return typeof actual === 'boolean' && actual !== (valve.normal === 'open');
  });
  const alarms = plantAlarmFacts(world).filter((alarm) => alarm.present);
  return [
    `The Pool plant model · schema 1 · world time ${Math.floor(world.time / 10) * 10} seconds (rounded down to 10 seconds).`,
    `Current room from page URL: ${view.get('room') ?? 'unavailable'}. Inspection ref from page URL: ${view.get('look') ?? 'none'}.`,
    `${running.length} known starter pumps running: ${running.join(', ') || 'none'}.`,
    `${tripped.length} known starter pumps tripped: ${tripped.join(', ') || 'none'}.`,
    `${abnormalValves.length} installed valves away from normal position.`,
    `${alarms.length} active location annunciator windows: ${alarms.map((alarm) => `${alarm.ref} ${alarm.label}`).join('; ') || 'none'}.`,
    'Read-only live queries are available at window.__poolDiagnostics: listSystems, listEquipment, getEquipment, getConnections, listAlarms, getAlarm, getRecentEvents, getCoverage, getWashState, getViewContext. Missing readings are marked unavailable.',
  ].join(' ');
}

const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
};

function reportText(store: WorldStore, search: string): string {
  const world = store.world.value;
  const wash = plantWashFacts(world);
  const equipment = plantEquipmentFacts(world);
  const alarms = plantAlarmFacts(world).filter(
    (alarm) => alarm.present || alarm.window !== 'off',
  );
  const needle = search.trim().toLowerCase();
  const matching = equipment.filter((fact) =>
    [fact.ref, fact.assetId ?? '', fact.name, fact.room ?? '', fact.kind]
      .join(' ')
      .toLowerCase()
      .includes(needle),
  );
  const lines = [
    `World time: ${Math.floor(world.time)} seconds`,
    `Current room from page URL: ${new URLSearchParams(location.search).get('room') ?? 'unavailable'}; inspection ref: ${new URLSearchParams(location.search).get('look') ?? 'none'}.`,
    `Wash-O-Tron: scheduler ${wash.schedulerEnabled ? 'AUTO' : 'MANUAL'}, HOLD ${wash.hold ? 'on' : 'off'}, active filter ${wash.activeFilter ?? 'none'}, step ${wash.step ?? 'idle'}, waiting ${wash.waiting ?? 'none'}.`,
    `Backwash pit ${wash.pit.volumeM3.toFixed(1)} m³; HIGH ${wash.pit.highM3.toFixed(1)} m³; inlet inhibit ${wash.pit.inletInhibited ? 'on' : 'off'}; circulation pumping ${wash.circulationPumping ? 'yes' : 'no'}.`,
    ...wash.filters.map(
      (filter) =>
        `Filter ${filter.number}: ${filter.mode}/${filter.phase}; AUTO ${filter.auto ? 'on' : 'off'}; lockout ${filter.lockout ? 'on' : 'off'}; bed flow ${filter.bedFlowM3h?.toFixed(1) ?? 'unavailable'} m³/h.`,
    ),
    `Equipment: ${equipment.length} catalogued; ${equipment.filter((fact) => fact.stateAvailable).length} with readable state.`,
    `Active or latched annunciator windows: ${alarms.length}.`,
    ...alarms.map(
      (alarm) =>
        `${alarm.ref} · ${alarm.label} · ${alarm.present ? 'active' : 'cleared'} · window ${alarm.window}${alarm.firstOut ? ' · first out' : ''}`,
    ),
    'Recent events (newest first, up to 10):',
    ...listPlantEvents(world, store.events.value, { limit: 10 }).items.map(
      (event) =>
        `${Math.floor(event.time)}s · ${event.subject || 'plant'} · ${event.severity} · ${event.text}`,
    ),
    `Equipment matching ${search ? JSON.stringify(search) : 'all'}: ${matching.length}; showing first 100.`,
    ...matching.slice(0, 100).map(
      (fact) =>
        `${fact.ref} · ${fact.name} · ${fact.room ?? 'room unavailable'} · ${fact.kind} · ${fact.status ?? 'state unavailable'}${
          fact.details
            ? ` · ${Object.entries(fact.details)
                .map(([key, value]) => `${key}=${value ?? 'none'}`)
                .join(', ')}`
            : ''
        }${fact.connection ? ` · ${fact.connection.medium} from ${fact.connection.from} to ${fact.connection.to}` : ''}`,
    ),
    ...(matching.length <= 5
      ? matching.flatMap((fact) => {
          const links = getPlantConnections(world, fact.ref)?.links ?? [];
          return links.length
            ? [
                `Schematic connections of ${fact.ref}:`,
                ...links
                  .slice(0, 30)
                  .map(
                    (link) =>
                      `${link.link} · ${link.medium} · ${link.from.name} [${link.from.refs.join(', ') || 'no equipment ref'}] → ${link.to.name} [${link.to.refs.join(', ') || 'no equipment ref'}]${link.valves.length ? ` · valves ${link.valves.map((valve) => `${valve.ref} ${valve.status ?? 'state unavailable'}`).join(', ')}` : ''}`,
                  ),
              ]
            : [];
        })
      : []),
  ];
  return lines.join('\n');
}

/** Install once beside the game canvas. The ordinary page gets only a short semantic index. */
export function installPlantContext(store: WorldStore): () => void {
  const api = createPlantContextApi(store);
  window.__poolDiagnostics = api;

  const context = element('section');
  context.className = 'visually-hidden';
  context.setAttribute('aria-label', 'Live plant model for assistive tools');
  context.dataset.schema = 'pool-plant-context-v1';
  const heading = element('h2', 'Live plant model');
  const summaryNode = element('p');
  const systemsNode = element('p');
  const reportLink = element('a', 'Open readable plant-state report');
  reportLink.href = REPORT_HASH;
  context.append(heading, summaryNode, systemsNode, reportLink);
  document.body.append(context);

  const report = element('section');
  report.id = REPORT_HASH.slice(1);
  report.className = 'plant-context-report';
  report.setAttribute('aria-label', 'Readable plant-state report');
  const reportHead = element('header');
  const title = element('h1', 'Live plant-state report');
  const close = element('a', 'Close');
  close.href = '#';
  reportHead.append(title, close);
  const explanation = element(
    'p',
    'This read-only report shows the game’s current engineering model. It contains no controls for changing the plant. A browser assistant allowed to read this page may send these facts to its service; use the switch below to turn this context off.',
  );
  const search = element('input');
  search.type = 'search';
  search.placeholder = 'Find a tag, room or kind';
  search.setAttribute('aria-label', 'Find equipment');
  const output = element('pre');
  const inspectionLinks = element('nav');
  inspectionLinks.setAttribute(
    'aria-label',
    'Inspect matching equipment in the game',
  );
  const copy = element('button', 'Copy report');
  copy.type = 'button';
  const toggle = element('button');
  toggle.type = 'button';
  const update = () => {
    const enabled = contextEnabled();
    toggle.textContent = enabled ? 'Turn AI context off' : 'Turn AI context on';
    const nextSummary = enabled
      ? summary(store.world.value)
      : 'Browser AI plant context is off.';
    if (summaryNode.textContent !== nextSummary)
      summaryNode.textContent = nextSummary;
    const nextSystems = enabled
      ? `Indexed rooms: ${listPlantSystems(store.world.value)
          .map(
            (system) =>
              `${system.room} (${system.readableStates}/${system.equipment} readable, ${system.activeAlarms} active alarms)`,
          )
          .join('; ')}.`
      : '';
    if (systemsNode.textContent !== nextSystems)
      systemsNode.textContent = nextSystems;
    if (location.hash !== REPORT_HASH) return;
    const nextReport = enabled
      ? reportText(store, search.value)
      : 'Browser AI plant context is off. Turn it on to read the plant state.';
    if (output.textContent !== nextReport) output.textContent = nextReport;
    const matches = enabled
      ? plantEquipmentFacts(store.world.value)
          .filter((fact) =>
            [
              fact.ref,
              fact.assetId ?? '',
              fact.name,
              fact.room ?? '',
              fact.kind,
            ]
              .join(' ')
              .toLowerCase()
              .includes(search.value.trim().toLowerCase()),
          )
          .filter((fact) => fact.lookUrl)
          .slice(0, 10)
      : [];
    const key = matches.map((fact) => fact.ref).join('|');
    if (inspectionLinks.dataset.refs !== key) {
      inspectionLinks.dataset.refs = key;
      inspectionLinks.replaceChildren(
        ...matches.map((fact) => {
          const link = element('a', `Inspect ${fact.ref} in ${fact.room}`);
          link.href = fact.lookUrl!;
          return link;
        }),
      );
    }
  };
  search.addEventListener('input', update);
  toggle.addEventListener('click', () => {
    setContextEnabled(!contextEnabled());
    update();
  });
  copy.addEventListener('click', () => {
    void navigator.clipboard.writeText(output.textContent ?? '').catch(() => {
      copy.textContent = 'Copy unavailable';
    });
  });
  report.append(
    reportHead,
    explanation,
    search,
    toggle,
    copy,
    inspectionLinks,
    output,
  );
  document.body.append(report);
  window.addEventListener('hashchange', update);
  update();
  const timer = window.setInterval(update, 1000);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('hashchange', update);
    context.remove();
    report.remove();
    delete window.__poolDiagnostics;
  };
}
