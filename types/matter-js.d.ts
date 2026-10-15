// Minimal typings for the parts of matter-js this site uses.
// Kept local so we don't need an extra @types dependency.
declare module "matter-js" {
  export interface Vector {
    x: number;
    y: number;
  }

  export interface Body {
    id: number;
    position: Vector;
    angle: number;
    velocity: Vector;
    label: string;
  }

  export interface IBodyDefinition {
    label?: string;
    isStatic?: boolean;
    angle?: number;
    restitution?: number;
    friction?: number;
    frictionAir?: number;
    density?: number;
    chamfer?: { radius: number };
    collisionFilter?: { group?: number; category?: number; mask?: number };
  }

  export interface Engine {
    world: World;
    gravity: Vector & { scale: number };
  }

  export interface World {
    bodies: Body[];
  }

  export const Engine: {
    create(options?: { gravity?: Partial<Vector & { scale: number }> }): Engine;
    update(engine: Engine, delta?: number): void;
    clear(engine: Engine): void;
  };

  export const Bodies: {
    rectangle(x: number, y: number, w: number, h: number, options?: IBodyDefinition): Body;
  };

  export const Body: {
    setVelocity(body: Body, velocity: Vector): void;
    setAngularVelocity(body: Body, velocity: number): void;
  };

  export const Composite: {
    add(world: World, body: Body | Body[]): void;
    clear(world: World, keepStatic: boolean): void;
  };

  const Matter: {
    Engine: typeof Engine;
    Bodies: typeof Bodies;
    Body: typeof Body;
    Composite: typeof Composite;
  };
  export default Matter;
}
