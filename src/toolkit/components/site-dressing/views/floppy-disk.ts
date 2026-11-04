import { Group, Mesh, PlaneGeometry, BoxGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { kitPaint } from '../../core/views/eighties-controls';
import { createPs1Material } from '../../core/parts/ps1-material';
import { createCanvasTexture } from '../../core/views/screens';

/**
 * A loose 3.5" floppy disk (the owner, 2026-11-04: "we make a builder for
 * floppy disks, so we can change what is on the label"). 90 × 94 × 3.3 mm,
 * the format's own size: a coloured shell, a silver metal shutter, the
 * central hub with its square drive window, and a paper label on top —
 * drawn per disk, so each shows its own text. Designed after the floppy
 * disks on the engineer's desk (`software-box.ts`, `createBoxContents`),
 * itself after a free model of the actual diskette (Sketchfab, blissful_
 * decay13, "Floppy Disk 3.5-inch", CC BY — credited in CREDITS.md and
 * doc/reuse-inventory.md).
 */
export function createFloppyDisk(
  kit: PanelKit,
  options: {
    /** Its label's first line, e.g. the program's title. */
    label?: string;
    /** Its label's second line, e.g. "Disk 1 of 3". */
    sub?: string;
    /** Its shell's colour, alternate when the box holds several. */
    colour?: string;
  } = {},
) {
  const group = new Group();
  group.name = '3.5" floppy disk';
  const shell = new Mesh(
    new BoxGeometry(0.09, 0.0033, 0.094),
    kitPaint(kit, options.colour ?? '#1d3f73'),
  );
  shell.position.y = 0.00165;
  group.add(shell);
  // The metal shutter near the write-protect edge.
  const shutter = new Mesh(
    new BoxGeometry(0.048, 0.0036, 0.03),
    kitPaint(kit, '#b9bcc0', 0.7),
  );
  shutter.position.set(0.004, 0.0018, -0.032);
  group.add(shutter);
  // The hub and its square drive window.
  const hub = new Mesh(
    new BoxGeometry(0.022, 0.004, 0.022),
    kitPaint(kit, '#9aa0a3', 0.5),
  );
  hub.position.set(0.01, 0.0018, 0.028);
  group.add(hub);
  // Its label, drawn for this disk (the part the builder varies).
  const w = 140;
  const h = 100;
  const { context, texture } = createCanvasTexture(w, h, 'printed');
  context.fillStyle = '#f7f4ea';
  context.fillRect(0, 0, w, h);
  context.fillStyle = '#1d1d1d';
  context.fillRect(0, 0, w, h * 0.2);
  context.fillStyle = '#1d1d1d';
  context.textAlign = 'center';
  context.font = `bold ${Math.round(h * 0.14)}px Arial, sans-serif`;
  context.fillText(options.label ?? 'DISK', w / 2, h * 0.45, w - 8);
  if (options.sub) {
    context.font = `${Math.round(h * 0.13)}px Arial, sans-serif`;
    context.fillText(options.sub, w / 2, h * 0.74, w - 8);
  }
  texture.needsUpdate = true;
  kit.textures.push(texture);
  const labelMat = createPs1Material({ map: texture, roughness: 0.7 });
  kit.materials.push(labelMat);
  const label = new Mesh(new PlaneGeometry(0.07, 0.05), labelMat);
  label.rotation.x = -Math.PI / 2;
  label.position.set(0, 0.0034, 0.017);
  group.add(label);
  return group;
}
