import { describe, expect, it } from 'vite-plus/test';
import { BoxGeometry, Group, Mesh, PerspectiveCamera, Scene } from 'three';
import { createInspector } from './inspect-pick';
import { markComponent } from '../../components/core/views/component-identity';
import { markEquipmentKind } from '../../components/core/views/equipment-kind';

/** A scene looking down −z from the origin, with a marked valve 2 m ahead. */
function scene() {
  const root = new Scene();
  const camera = new PerspectiveCamera(60, 1, 0.01, 100);
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);
  const valve = markComponent(new Group(), 'PL3-BT1-IV1');
  valve.position.z = -2;
  // Its lever, a child mesh: picked as the valve.
  const lever = new Mesh(new BoxGeometry(0.2, 0.2, 0.2));
  valve.add(lever);
  root.add(valve);
  const update = () => {
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
  };
  update();
  const inspect = createInspector({ root, camera, metre: 1 });
  return { root, camera, valve, inspect, update };
}

const wall = (z: number) => {
  const mesh = new Mesh(new BoxGeometry(4, 4, 0.1));
  mesh.position.z = z;
  return mesh;
};

describe('picking what is aimed at', () => {
  it('names the component a piece belongs to, up its parents', () => {
    const { inspect } = scene();
    expect(inspect(0, 0)?.title).toBe('PL3-BT1-IV1 (butterfly valve)');
    expect(inspect(0.9, 0.9)).toBeNull();
  });

  it('is blocked by the first surface, a wall or a closed door', () => {
    const s = scene();
    s.root.add(wall(-1));
    s.update();
    expect(s.inspect(0, 0)).toBeNull();
  });

  it('passes through hidden meshes, but not a deliberate pick mesh', () => {
    const s = scene();
    const hidden = wall(-1);
    hidden.visible = false;
    s.root.add(hidden);
    s.update();
    expect(s.inspect(0, 0)?.key).toBe('PL3-BT1-IV1');
    // A hidden pick mesh in front, owned by another component.
    const pick = markComponent(wall(-0.5), 'PL3-BT1');
    pick.visible = false;
    pick.userData.pick = true;
    s.root.add(pick);
    s.update();
    expect(s.inspect(0, 0)?.key).toBe('PL3-BT1');
  });

  it('reaches no further than its reach', () => {
    const s = scene();
    s.valve.position.z = -5;
    s.update();
    expect(s.inspect(0, 0)).toBeNull();
  });

  it('names the most specific owner: a marked part within a marked whole', () => {
    const s = scene();
    const tank = markComponent(new Group(), 'PL3-BT1');
    s.root.add(tank);
    tank.add(s.valve);
    s.update();
    expect(s.inspect(0, 0)?.key).toBe('PL3-BT1-IV1');
  });

  it('names a kind-only thing by its registered kind, not its absence of identity (160)', () => {
    const root = new Scene();
    const camera = new PerspectiveCamera(60, 1, 0.01, 100);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    // A software box: a kind mark but no component identity.
    const box = markEquipmentKind(new Group(), 'software-box', 'the-pool');
    box.position.z = -2;
    const shell = new Mesh(new BoxGeometry(0.2, 0.2, 0.1));
    box.add(shell);
    root.add(box);
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const inspect = createInspector({ root, camera, metre: 1 });
    const named = inspect(0, 0);
    // Named by the kind's type; its bound thing is its tag.
    expect(named?.title).toBe('Software box');
    expect(named?.key).toBe('thing:the-pool');
  });

  it('a kind-only thing with no bound instance is named by its kind, with the kind key (160)', () => {
    const root = new Scene();
    const camera = new PerspectiveCamera(60, 1, 0.01, 100);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    const shelf = markEquipmentKind(new Group(), 'office-shelf');
    shelf.position.z = -2;
    const board = new Mesh(new BoxGeometry(1, 0.05, 0.2));
    shelf.add(board);
    root.add(shelf);
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const inspect = createInspector({ root, camera, metre: 1 });
    expect(inspect(0, 0)).toEqual({
      key: 'kind:office-shelf',
      title: 'Office wall shelf',
    });
  });

  it('an unregistered, unidentified thing stays silent and still blocks (160)', () => {
    const root = new Scene();
    const camera = new PerspectiveCamera(60, 1, 0.01, 100);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);
    const thing = new Group();
    thing.position.z = -2;
    thing.add(new Mesh(new BoxGeometry(0.2, 0.2, 0.2)));
    root.add(thing);
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const inspect = createInspector({ root, camera, metre: 1 });
    expect(inspect(0, 0)).toBeNull();
  });
});
