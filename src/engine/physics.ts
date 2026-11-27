import { ObjectPhysicsConfig, ScenePhysicsConfig } from '../types/frontscript';

export interface RigidBodyState {
  varName: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  angularVelocity: number;
  halfW: number;
  halfH: number;
  config: ObjectPhysicsConfig;
}

/**
 * Compact 2D rigid-body physics world: gravity, restitution (bounce),
 * friction, stage wall bounds, and pairwise impulse collisions.
 */
export class PhysicsWorld {
  gravityX: number;
  gravityY: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  bodies: Map<string, RigidBodyState> = new Map();

  constructor(
    config: ScenePhysicsConfig,
    bounds = { minX: -260, maxX: 260, minY: -150, maxY: 160 }
  ) {
    this.gravityX = config.gravityX;
    this.gravityY = config.gravityY;
    this.bounds = bounds;
  }

  upsertBody(
    varName: string,
    x: number,
    y: number,
    rotation: number,
    scale: number,
    config: ObjectPhysicsConfig
  ) {
    if (config.bodyType === 'none') {
      this.bodies.delete(varName);
      return;
    }
    const existing = this.bodies.get(varName);
    const halfW = 36 * Math.max(0.3, scale);
    const halfH = 24 * Math.max(0.3, scale);
    if (existing) {
      existing.config = config;
      existing.halfW = halfW;
      existing.halfH = halfH;
      if (config.bodyType === 'static') {
        existing.x = x;
        existing.y = y;
        existing.vx = 0;
        existing.vy = 0;
        existing.rotation = rotation;
      }
      return;
    }
    this.bodies.set(varName, {
      varName,
      x,
      y,
      vx: 0,
      vy: 0,
      rotation,
      angularVelocity: 0,
      halfW,
      halfH,
      config,
    });
  }

  step(dt: number) {
    const safeDt = Math.min(0.04, Math.max(0.001, dt));
    const list = Array.from(this.bodies.values());

    for (const b of list) {
      if (b.config.bodyType === 'static') continue;
      if (b.config.bodyType === 'dynamic') {
        b.vx += this.gravityX * safeDt;
        b.vy += this.gravityY * safeDt;
      }
      b.x += b.vx * safeDt;
      b.y += b.vy * safeDt;
      b.rotation += b.angularVelocity * safeDt;
      b.angularVelocity *= Math.max(0, 1 - b.config.friction * 0.8 * safeDt);
    }

    for (const b of list) {
      if (b.config.bodyType !== 'dynamic') continue;
      const e = Math.max(0, Math.min(1, b.config.restitution));
      const f = Math.max(0, Math.min(1, b.config.friction));

      if (b.y + b.halfH > this.bounds.maxY) {
        b.y = this.bounds.maxY - b.halfH;
        if (b.vy > 0) b.vy = -b.vy * e;
        b.vx *= Math.max(0, 1 - f * 0.25);
        if (Math.abs(b.vy) < 12) b.vy = 0;
      }
      if (b.y - b.halfH < this.bounds.minY) {
        b.y = this.bounds.minY + b.halfH;
        if (b.vy < 0) b.vy = -b.vy * e;
      }
      if (b.x + b.halfW > this.bounds.maxX) {
        b.x = this.bounds.maxX - b.halfW;
        if (b.vx > 0) b.vx = -b.vx * e;
        b.angularVelocity += b.vy * 0.12;
      }
      if (b.x - b.halfW < this.bounds.minX) {
        b.x = this.bounds.minX + b.halfW;
        if (b.vx < 0) b.vx = -b.vx * e;
        b.angularVelocity -= b.vy * 0.12;
      }
    }

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.config.bodyType === 'static' && b.config.bodyType === 'static') continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const overlapX = a.halfW + b.halfW - Math.abs(dx);
        const overlapY = a.halfH + b.halfH - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;

        const invMassA = a.config.bodyType === 'static' ? 0 : 1 / Math.max(0.1, a.config.density);
        const invMassB = b.config.bodyType === 'static' ? 0 : 1 / Math.max(0.1, b.config.density);
        const totalInv = invMassA + invMassB;
        if (totalInv === 0) continue;

        const e = Math.min(a.config.restitution, b.config.restitution);
        if (overlapX < overlapY) {
          const nx = dx >= 0 ? 1 : -1;
          const sep = overlapX / totalInv;
          a.x -= nx * sep * invMassA;
          b.x += nx * sep * invMassB;
          const rvx = b.vx - a.vx;
          if (rvx * nx < 0) {
            const jImp = (-(1 + e) * rvx * nx) / totalInv;
            a.vx -= nx * jImp * invMassA;
            b.vx += nx * jImp * invMassB;
          }
        } else {
          const ny = dy >= 0 ? 1 : -1;
          const sep = overlapY / totalInv;
          a.y -= ny * sep * invMassA;
          b.y += ny * sep * invMassB;
          const rvy = b.vy - a.vy;
          if (rvy * ny < 0) {
            const jImp = (-(1 + e) * rvy * ny) / totalInv;
            a.y -= ny * 0.01;
            a.vy -= ny * jImp * invMassA;
            b.vy += ny * jImp * invMassB;
          }
        }
      }
    }
  }
}
