import {
  masterOpen,
  linePressure,
  portPressure,
} from '../plant/co2-distribution';
import type { Co2PortId } from '../plant/co2-distribution';
import { farSide } from '../plant/water-treatment';
import {
  POOL_IDS,
  poolArea,
  poolTankCapacity,
  poolVolume,
} from '../plant/pools';
import type { PoolId } from '../plant/pools';
import { readings } from '../water/pool-chemistry';
import type { PoolChemistry } from '../water/pool-chemistry';
import type { World } from '../world';

export interface WaterBodyFact {
  ph: number;
  alkalinityMgL: number;
  freeChlorineMgL: number;
  combinedChlorineMgL: number;
  totalChlorineMgL: number;
  calciumHardnessMgL: number;
  totalDissolvedSolidsMgL: number;
  sulphateMgL: number;
  chlorateMgL: number;
  cyanuricAcidMgL: number;
  temperatureC: number | null;
  volumeM3: number;
  level: number;
  levelUnit: 'm relative to overflow lip' | '% full';
}

export interface PoolProcessFact {
  pool: PoolId;
  mainPool: WaterBodyFact;
  balanceTank: WaterBodyFact;
  circulationFlowM3h: number;
  makeUpOpen: boolean;
  drainDownOpen: boolean;
  waterTemperatureSetpointC: number;
  heatInputKw: number;
  pumpTripped: boolean;
  co2: {
    controllerRef: string;
    measuredPh: number;
    sampleFlowLh: number;
    sampleFlowing: boolean;
    setpointPh: number;
    targetPhLow: number;
    targetPhHigh: number;
    selector: string;
    inhibit: string | null;
    release: boolean;
    controllerDemandFraction: number;
    controllerAtMaximum: boolean;
    controllerRequestedGh: number;
    channelStatus: string;
    panelMode: string;
    panelAskedGh: number;
    deliveredGh: number;
    panelFault: string | null;
    panelPowered: boolean;
    dosingValveOpen: boolean;
    valveOverride: string;
    supplyIsolationOpen: boolean;
    masterValveOpen: boolean;
    wallPortOpen: boolean;
    linePressureBar: number;
    portPressureBar: number;
  } | null;
}

export interface PlantProcessFact {
  schema: 1;
  worldTime: number;
  pools: PoolProcessFact[];
  wetHall: {
    breakTankM3: number;
    backwashPitM3: number;
    pitInletInhibited: boolean;
    makeUpFlowM3h: number;
    boosterRunning: boolean;
    boosterTripped: boolean;
    pitPumpsRunning: [boolean, boolean];
  };
  heating: {
    headerFlowC: number;
    headerReturnC: number;
    setpointC: number;
    pumpsRunning: boolean;
    boilerSupplyKw: number;
    demandKw: number;
    deliveredKw: number;
    boilerFiring: boolean;
    sequencerEnable: string;
    boilersCalled: number;
    alarms: string[];
  };
}

function body(
  water: PoolChemistry,
  temperatureC: number,
  volumeM3: number,
  level: number,
  levelUnit: WaterBodyFact['levelUnit'],
  temperatureAvailable: boolean,
): WaterBodyFact {
  const derived = readings(water, temperatureC);
  return {
    ph: water.ph,
    alkalinityMgL: water.alkalinity,
    freeChlorineMgL: water.freeChlorine,
    combinedChlorineMgL: derived.combinedChlorine,
    totalChlorineMgL: derived.totalChlorine,
    calciumHardnessMgL: water.hardness,
    totalDissolvedSolidsMgL: water.tds,
    sulphateMgL: water.sulphate,
    chlorateMgL: water.chlorate,
    cyanuricAcidMgL: water.cyanuric,
    temperatureC: temperatureAvailable ? temperatureC : null,
    volumeM3,
    level,
    levelUnit,
  };
}

/** Model-backed process readings. No scene object, save state or action escapes. */
export function plantProcessFacts(world: World): PlantProcessFact {
  const pools = POOL_IDS.map((id): PoolProcessFact => {
    const pool = world.pools[id];
    const circuit = world.treatment.circuits[id];
    const port: Co2PortId | null =
      id === 'pool_01' || id === 'pool_02' ? `plant_${id}` : null;
    const trio =
      id === 'pool_01' || id === 'pool_02' ? world.aqualis[id] : null;
    const panel = port ? world.co2.dosers[port] : null;
    const channel = trio?.channels.co2;
    const distribution = world.co2.distribution;
    return {
      pool: id,
      mainPool: body(
        farSide(circuit),
        pool.temperature,
        Math.max(0, poolVolume(id) + pool.level * poolArea(id)),
        pool.level,
        'm relative to overflow lip',
        true,
      ),
      balanceTank: body(
        circuit.tank,
        pool.temperature,
        poolTankCapacity(id) * pool.balance,
        pool.balance * 100,
        '% full',
        false,
      ),
      circulationFlowM3h: pool.flow,
      makeUpOpen: pool.makeUp,
      drainDownOpen: pool.drainDown,
      waterTemperatureSetpointC: pool.setpoint,
      heatInputKw: pool.heating,
      pumpTripped: pool.tripped,
      co2:
        trio && panel && channel && port
          ? {
              controllerRef: id === 'pool_01' ? 'PL1-CP2' : 'PL2-CP2',
              measuredPh: trio.readings.ph,
              sampleFlowLh: trio.sample.flowLh,
              sampleFlowing: trio.sample.flowing,
              setpointPh: trio.settings.targets.ph.set,
              targetPhLow: trio.settings.targets.ph.low,
              targetPhHigh: trio.settings.targets.ph.high,
              selector: trio.selector,
              inhibit: trio.inhibit,
              release: trio.release,
              controllerDemandFraction: channel.demand,
              controllerAtMaximum: channel.demand >= 0.999,
              controllerRequestedGh: channel.demandRate,
              channelStatus: channel.status.kind,
              panelMode: panel.mode,
              panelAskedGh: panel.asked,
              deliveredGh: panel.delivering,
              panelFault: panel.fault,
              panelPowered: panel.powered,
              dosingValveOpen: panel.open,
              valveOverride: panel.override,
              supplyIsolationOpen: distribution.supply.isolation,
              masterValveOpen: masterOpen(distribution),
              wallPortOpen: distribution.ports[port].open,
              linePressureBar: linePressure(distribution),
              portPressureBar: portPressure(distribution, port),
            }
          : null,
    };
  });
  const sequencer = world.boilerHouse.sequencer;
  return {
    schema: 1,
    worldTime: world.time,
    pools,
    wetHall: {
      breakTankM3: world.wetHall.breakTank,
      backwashPitM3: world.wetHall.backwashTank,
      pitInletInhibited: world.wetHall.inhibit,
      makeUpFlowM3h: world.wetHall.flow,
      boosterRunning: world.wetHall.boosterRunning,
      boosterTripped: world.wetHall.boosterTripped,
      pitPumpsRunning: [...world.wetHall.pitPumps.running],
    },
    heating: {
      headerFlowC: world.lthw.flow,
      headerReturnC: world.lthw.return,
      setpointC: sequencer.setpoint,
      pumpsRunning: world.lthw.pumps,
      boilerSupplyKw: world.lthw.supply,
      demandKw: world.lthw.demand,
      deliveredKw: world.lthw.delivered,
      boilerFiring: world.lthw.firing,
      sequencerEnable: sequencer.enable,
      boilersCalled: sequencer.called.length,
      alarms: Object.entries(sequencer.alarms)
        .filter(([, lamp]) => lamp !== 'off')
        .map(([id]) => id),
    },
  };
}

export interface PoolTrend {
  pool: PoolId;
  fromSeconds: number | null;
  toSeconds: number;
  mainPoolPhPerMinute: number | null;
  balanceTankPhPerMinute: number | null;
  mainPoolAlkalinityMgLPerMinute: number | null;
  balanceTankAlkalinityMgLPerMinute: number | null;
  mainPoolPhStart: number | null;
  balanceTankPhStart: number | null;
}

/** A bounded observation window of projected facts, never the World. */
export class PlantProcessHistory {
  private samples: { time: number; pools: PoolProcessFact[] }[] = [];

  observe(fact: PlantProcessFact): void {
    const last = this.samples.at(-1);
    if (last && fact.worldTime < last.time) this.samples = [];
    const newest = this.samples.at(-1);
    if (newest && fact.worldTime - newest.time < 30) return;
    this.samples.push({ time: fact.worldTime, pools: fact.pools });
    while (
      this.samples.length > 21 ||
      fact.worldTime - this.samples[0].time > 600
    )
      this.samples.shift();
  }

  trends(fact: PlantProcessFact): PoolTrend[] {
    const first = this.samples[0];
    const enough = first && fact.worldTime - first.time >= 60;
    return fact.pools.map((pool, index) => {
      const previous = enough ? first.pools[index] : null;
      const minutes = enough ? (fact.worldTime - first.time) / 60 : 0;
      return {
        pool: pool.pool,
        fromSeconds: previous ? first.time : null,
        toSeconds: fact.worldTime,
        mainPoolPhPerMinute: previous
          ? (pool.mainPool.ph - previous.mainPool.ph) / minutes
          : null,
        balanceTankPhPerMinute: previous
          ? (pool.balanceTank.ph - previous.balanceTank.ph) / minutes
          : null,
        mainPoolAlkalinityMgLPerMinute: previous
          ? (pool.mainPool.alkalinityMgL - previous.mainPool.alkalinityMgL) /
            minutes
          : null,
        balanceTankAlkalinityMgLPerMinute: previous
          ? (pool.balanceTank.alkalinityMgL -
              previous.balanceTank.alkalinityMgL) /
            minutes
          : null,
        mainPoolPhStart: previous?.mainPool.ph ?? null,
        balanceTankPhStart: previous?.balanceTank.ph ?? null,
      };
    });
  }
}

const number = (value: number, places = 2) => value.toFixed(places);
const yesNo = (value: boolean) => (value ? 'yes' : 'no');

/** Shared plain-text rendering for the semantic page region and full report. */
export function plantProcessLines(
  fact: PlantProcessFact,
  trends: readonly PoolTrend[],
): string[] {
  const lines = [
    `Process snapshot at simulation time ${number(fact.worldTime, 1)} s.`,
  ];
  for (const pool of fact.pools) {
    const trend = trends.find((item) => item.pool === pool.pool);
    const waterLine = (name: string, water: WaterBodyFact) =>
      `${pool.pool} ${name}: pH ${number(water.ph, 3)}; total alkalinity ${number(water.alkalinityMgL, 1)} mg/L as CaCO₃; free chlorine ${number(water.freeChlorineMgL, 2)} mg/L as Cl₂; combined chlorine ${number(water.combinedChlorineMgL, 2)} mg/L as Cl₂; total chlorine ${number(water.totalChlorineMgL, 2)} mg/L as Cl₂; calcium hardness ${number(water.calciumHardnessMgL, 1)} mg/L as CaCO₃; TDS ${number(water.totalDissolvedSolidsMgL, 1)} mg/L; sulphate ${number(water.sulphateMgL, 1)} mg/L as SO₄; chlorate ${number(water.chlorateMgL, 1)} mg/L as ClO₃; cyanuric acid ${number(water.cyanuricAcidMgL, 1)} mg/L; temperature ${water.temperatureC === null ? 'unavailable (not separately modelled)' : `${number(water.temperatureC, 1)} °C`}; volume ${number(water.volumeM3, 1)} m³; level ${number(water.level, water.levelUnit === '% full' ? 1 : 3)} ${water.levelUnit}.`;
    lines.push(waterLine('main pool (far-side cell)', pool.mainPool));
    lines.push(waterLine('balance tank', pool.balanceTank));
    lines.push(
      `${pool.pool} circulation: ${number(pool.circulationFlowM3h, 1)} m³/h; make-up valve open ${yesNo(pool.makeUpOpen)}; drain-down open ${yesNo(pool.drainDownOpen)}; pump tripped ${yesNo(pool.pumpTripped)}; water temperature setpoint ${number(pool.waterTemperatureSetpointC, 1)} °C; pool and hall heat input ${number(pool.heatInputKw, 1)} kW.`,
    );
    lines.push(
      trend?.fromSeconds === null || !trend
        ? `${pool.pool} chemistry trend: unavailable until 60 simulated seconds have been observed in this browser session.`
        : `${pool.pool} chemistry trend from ${number(trend.fromSeconds, 1)} s to ${number(trend.toSeconds, 1)} s: main pool pH ${number(trend.mainPoolPhStart!, 3)} → ${number(pool.mainPool.ph, 3)} (${number(trend.mainPoolPhPerMinute!, 4)} pH/min); balance tank pH ${number(trend.balanceTankPhStart!, 3)} → ${number(pool.balanceTank.ph, 3)} (${number(trend.balanceTankPhPerMinute!, 4)} pH/min); main pool alkalinity ${number(trend.mainPoolAlkalinityMgLPerMinute!, 2)} mg/L/min; balance tank alkalinity ${number(trend.balanceTankAlkalinityMgLPerMinute!, 2)} mg/L/min.`,
    );
    if (pool.co2) {
      const co2 = pool.co2;
      lines.push(
        `${pool.pool} CO₂ ${co2.controllerRef}: sample pH ${number(co2.measuredPh, 3)} at ${number(co2.sampleFlowLh, 1)} L/h (flowing ${yesNo(co2.sampleFlowing)}); setpoint ${number(co2.setpointPh, 2)}, target band ${number(co2.targetPhLow, 2)}–${number(co2.targetPhHigh, 2)}; selector ${co2.selector}, inhibit ${co2.inhibit ?? 'none'}, release ${yesNo(co2.release)}; channel ${co2.channelStatus}; controller demand ${number(co2.controllerDemandFraction * 100, 1)}% (${number(co2.controllerRequestedGh, 1)} g/h), at maximum ${yesNo(co2.controllerAtMaximum)}; panel mode ${co2.panelMode}; panel asked ${number(co2.panelAskedGh, 1)} g/h; actual delivered ${number(co2.deliveredGh, 1)} g/h; panel fault ${co2.panelFault ?? 'none'}; panel powered ${yesNo(co2.panelPowered)}; dosing valve open ${yesNo(co2.dosingValveOpen)}; override ${co2.valveOverride}; supply isolation open ${yesNo(co2.supplyIsolationOpen)}; master valve open ${yesNo(co2.masterValveOpen)}; wall port open ${yesNo(co2.wallPortOpen)}; line pressure ${number(co2.linePressureBar, 2)} bar gauge; port pressure ${number(co2.portPressureBar, 2)} bar gauge.`,
      );
    }
  }
  const wet = fact.wetHall;
  lines.push(
    `Wet hall hydraulics: break tank ${number(wet.breakTankM3, 2)} m³; backwash pit ${number(wet.backwashPitM3, 2)} m³; pit inlet inhibited ${yesNo(wet.pitInletInhibited)}; fresh-water make-up ${number(wet.makeUpFlowM3h, 1)} m³/h; booster running ${yesNo(wet.boosterRunning)}, tripped ${yesNo(wet.boosterTripped)}; pit pumps running ${wet.pitPumpsRunning.map(yesNo).join(', ')}.`,
  );
  const heat = fact.heating;
  lines.push(
    `LTHW heating: header flow ${number(heat.headerFlowC, 1)} °C; return ${number(heat.headerReturnC, 1)} °C; setpoint ${number(heat.setpointC, 1)} °C; pumps running ${yesNo(heat.pumpsRunning)}; boiler supply ${number(heat.boilerSupplyKw, 1)} kW; demand ${number(heat.demandKw, 1)} kW; delivered ${number(heat.deliveredKw, 1)} kW; boiler firing ${yesNo(heat.boilerFiring)}; sequencer ${heat.sequencerEnable}; boilers called ${heat.boilersCalled}; sequencer alarms ${heat.alarms.join(', ') || 'none'}.`,
  );
  return lines;
}
