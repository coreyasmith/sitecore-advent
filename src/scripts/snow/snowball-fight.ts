import type { Snowbank } from './snowbank';

type State = 'idle' | 'scoop' | 'windup' | 'throw' | 'hit' | 'duck' | 'cheer';

// Angles are in radians. Arms swing from pointing straight down (0) towards the front.
interface Pose {
  tilt: number;
  arm: number;
  backArm: number;
  crouch: number;
}

interface Look {
  coat: string;
  sleeve: string;
  hat: string;
  trim: string;
  scarf: string;
  skin: string;
}

interface Splat {
  x: number;
  y: number;
  size: number;
  age: number;
}

interface Person {
  team: 0 | 1;
  facing: 1 | -1;
  slot: number;
  look: Look;
  x: number;
  state: State;
  timer: number;
  elapsed: number;
  pose: Pose;
  hop: number;
  hasBall: boolean;
  target: Person | null;
  splats: Splat[];
  phase: number;
}

interface Snowball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
  thrower: Person;
  dodgeChecked: Set<Person>;
  done: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
}

const POSES: Record<State, Pose> = {
  idle: { tilt: 0, arm: 0.35, backArm: -0.25, crouch: 0 },
  scoop: { tilt: 0.55, arm: -0.3, backArm: 0, crouch: 0.6 },
  windup: { tilt: -0.15, arm: -2.3, backArm: 1.4, crouch: 0.1 },
  throw: { tilt: 0.25, arm: 1, backArm: -0.5, crouch: 0 },
  hit: { tilt: -0.35, arm: 2.6, backArm: 3.4, crouch: 0 },
  duck: { tilt: 0.6, arm: 1.9, backArm: 2.1, crouch: 0.8 },
  cheer: { tilt: -0.05, arm: 2.9, backArm: 3.3, crouch: 0 },
};

const DURATIONS: Record<Exclude<State, 'idle'>, number> = {
  scoop: 0.7,
  windup: 0.45,
  throw: 0.35,
  hit: 0.9,
  duck: 0.7,
  cheer: 0.8,
};

// Left team in warm colours, right team in cool ones
const LOOKS: Look[][] = [
  [
    { coat: '#d62839', sleeve: '#a71d2a', hat: '#1f8a70', trim: '#ffffff', scarf: '#ffd166', skin: '#f3c9a3' },
    { coat: '#f28c28', sleeve: '#c46d17', hat: '#3a86ff', trim: '#ffffff', scarf: '#d62839', skin: '#8d5524' },
    { coat: '#e85d9a', sleeve: '#b8437a', hat: '#ffd166', trim: '#ffffff', scarf: '#2ec4b6', skin: '#e0ac69' },
  ],
  [
    { coat: '#3a86ff', sleeve: '#2a63c0', hat: '#e63946', trim: '#ffffff', scarf: '#ffbe0b', skin: '#c68642' },
    { coat: '#2ec4b6', sleeve: '#1f9488', hat: '#8338ec', trim: '#ffffff', scarf: '#ff006e', skin: '#f1c27d' },
    { coat: '#8338ec', sleeve: '#6326b8', hat: '#fb5607', trim: '#ffffff', scarf: '#3a86ff', skin: '#a0663b' },
  ],
];

// Body measurements, in units scaled to the screen size
const LEG = 10;
const TORSO = 16;
const ARM = 11;
const HEAD = 7.5;
const HEAD_Y = -TORSO - 8.5;
const SHOULDER_Y = -TORSO + 3;
const BALL = 3.3;

const GRAVITY = 800;
// The throwing arm lets go of the snowball as it swings forward past this angle
const RELEASE_ANGLE = 2.2;

const random = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

// Two teams standing on the snowbank, throwing snowballs at each other
export class SnowballFight {
  private people: Person[] = [];
  private balls: Snowball[] = [];
  private particles: Particle[] = [];
  private width = 0;
  private height = 0;
  private scale = 1;

  constructor(private bank: Snowbank) {}

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.scale = width < 640 ? 0.85 : 1.1;

    const perTeam = width < 640 ? 1 : width < 1600 ? 2 : 3;
    if (this.people.length !== perTeam * 2) {
      this.balls = [];
      this.people = [0, 1].flatMap((team) =>
        Array.from({ length: perTeam }, (_, slot) => this.createPerson(team as 0 | 1, slot)),
      );
    }

    // Keep to the sides of the screen, clear of the page content where there's room
    const edge = Math.max(28, Math.min(90, width * 0.04));
    const gap = Math.max(46, Math.min(100, width * 0.055));
    for (const person of this.people) {
      const offset = edge + person.slot * gap;
      person.x = person.team === 0 ? offset : width - offset;
    }
  }

  update(dt: number) {
    for (const person of this.people) this.updatePerson(person, dt);
    for (const ball of this.balls) this.updateBall(ball, dt);
    this.balls = this.balls.filter((ball) => !ball.done);

    for (const particle of this.particles) {
      particle.vy += GRAVITY * 0.6 * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    for (const person of this.people) this.drawPerson(ctx, person, time);

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(140, 170, 200, 0.8)';
    ctx.lineWidth = 0.8;
    for (const ball of this.balls) {
      // A fading trail, so snowballs stand out from the falling snow
      ball.trail.forEach((point, i) => {
        const fade = (i + 1) / (ball.trail.length + 1);
        ctx.globalAlpha = fade * 0.45;
        ctx.beginPath();
        ctx.arc(point.x, point.y, BALL * this.scale * (0.4 + fade * 0.5), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL * this.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    for (const particle of this.particles) {
      ctx.globalAlpha = particle.life / particle.maxLife;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private createPerson(team: 0 | 1, slot: number): Person {
    return {
      team,
      facing: team === 0 ? 1 : -1,
      slot,
      look: LOOKS[team][slot],
      x: 0,
      state: 'idle',
      timer: random(0.3, 2.5),
      elapsed: 0,
      pose: { ...POSES.idle },
      hop: 0,
      hasBall: false,
      target: null,
      splats: [],
      phase: Math.random() * Math.PI * 2,
    };
  }

  private enter(person: Person, state: State) {
    person.state = state;
    person.elapsed = 0;
    person.timer = state === 'idle' ? random(1.2, 3.8) : DURATIONS[state];

    if (state === 'windup') {
      person.target = pick(this.people.filter((other) => other.team !== person.team));
    }
    // Swing over the top from the windup, rather than back down past the hip
    if (state === 'throw' && person.pose.arm < 0) {
      person.pose.arm += Math.PI * 2;
    }
    if (state === 'idle' && person.pose.arm > Math.PI) {
      person.pose.arm -= Math.PI * 2;
    }
  }

  private updatePerson(person: Person, dt: number) {
    person.timer -= dt;
    person.elapsed += dt;

    switch (person.state) {
      case 'idle':
        if (person.timer <= 0) this.enter(person, person.hasBall ? 'windup' : 'scoop');
        break;
      case 'scoop':
        if (person.timer <= 0) {
          person.hasBall = true;
          this.bank.remove(person.x + person.facing * 12 * this.scale, 50, 10);
          this.enter(person, 'windup');
        }
        break;
      case 'windup':
        if (person.timer <= 0) this.enter(person, 'throw');
        break;
      case 'throw':
        if (person.hasBall && person.pose.arm <= RELEASE_ANGLE) this.release(person);
        if (person.timer <= 0) this.enter(person, 'idle');
        break;
      default:
        if (person.timer <= 0) this.enter(person, 'idle');
    }

    const target = POSES[person.state];
    const ease = 1 - Math.exp(-dt * (person.state === 'throw' ? 22 : 9));
    person.pose.tilt += (target.tilt - person.pose.tilt) * ease;
    person.pose.arm += (target.arm - person.pose.arm) * ease;
    person.pose.backArm += (target.backArm - person.pose.backArm) * ease;
    person.pose.crouch += (target.crouch - person.pose.crouch) * ease;
    person.hop = person.state === 'cheer' ? Math.abs(Math.sin(person.elapsed * Math.PI * 2.5)) * 7 : 0;

    for (const splat of person.splats) splat.age += dt;
    person.splats = person.splats.filter((splat) => splat.age < 2.5);
  }

  private release(person: Person) {
    person.hasBall = false;
    const target = person.target;
    if (!target) return;

    const hand = this.toWorld(person, ...this.hand(person.pose.arm, ARM + 2.5));
    const aim = this.toWorld(target, 0, -TORSO * 0.6);
    // Not everyone's a good shot
    const dx = aim.x + random(-28, 28) * this.scale - hand.x;
    const lift = Math.min(this.height * 0.35, 50 + Math.abs(dx) * 0.2);
    const peak = Math.min(hand.y, aim.y) - lift;
    const up = Math.sqrt(2 * GRAVITY * (hand.y - peak));
    const flight = up / GRAVITY + Math.sqrt((2 * (aim.y - peak)) / GRAVITY);

    this.balls.push({
      x: hand.x,
      y: hand.y,
      vx: dx / flight,
      vy: -up,
      trail: [],
      thrower: person,
      dodgeChecked: new Set(),
      done: false,
    });
  }

  private updateBall(ball: Snowball, dt: number) {
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 6) ball.trail.shift();
    ball.vy += GRAVITY * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    for (const person of this.people) {
      if (person.team === ball.thrower.team) continue;
      this.maybeDuck(person, ball);
      const part = this.hitPart(person, ball);
      if (part) {
        this.hit(person, ball, part);
        return;
      }
    }

    if (ball.y + BALL * this.scale >= this.bank.surfaceAt(ball.x)) {
      this.burst(ball.x, ball.y, 6, ball.vx);
      this.bank.add(ball.x, 140, 14);
      ball.done = true;
    } else if (ball.x < -40 || ball.x > this.width + 40) {
      ball.done = true;
    }
  }

  private maybeDuck(person: Person, ball: Snowball) {
    if (ball.dodgeChecked.has(person)) return;
    const arrival = (person.x - ball.x) / ball.vx;
    if (arrival <= 0 || arrival > 0.3) return;
    ball.dodgeChecked.add(person);
    if ((person.state === 'idle' || person.state === 'scoop') && Math.random() < 0.3) {
      this.enter(person, 'duck');
    }
  }

  private hitPart(person: Person, ball: Snowball) {
    const reach = BALL * this.scale;
    const head = this.toWorld(person, 1, HEAD_Y);
    if (Math.hypot(ball.x - head.x, ball.y - head.y) < HEAD * this.scale + reach) return 'head';
    const body = this.toWorld(person, 0, -TORSO / 2);
    if (Math.hypot(ball.x - body.x, ball.y - body.y) < 9 * this.scale + reach) return 'body';
    return null;
  }

  private hit(person: Person, ball: Snowball, part: 'head' | 'body') {
    ball.done = true;
    person.splats.push(
      part === 'head'
        ? { x: random(3, 7), y: HEAD_Y + random(-3, 3), size: random(2.5, 3.5), age: 0 }
        : { x: random(2, 7), y: -TORSO * random(0.25, 0.85), size: random(3, 4.5), age: 0 },
    );
    this.burst(ball.x, ball.y, 10, ball.vx);
    this.enter(person, 'hit');

    const thrower = ball.thrower;
    if (thrower.state === 'idle' && Math.random() < 0.7) this.enter(thrower, 'cheer');
  }

  private burst(x: number, y: number, count: number, vx: number) {
    for (let i = 0; i < count; i++) {
      const life = random(0.35, 0.7);
      this.particles.push({
        x,
        y,
        vx: vx * 0.15 + random(-70, 70),
        vy: random(-160, -30),
        size: random(0.8, 2.2) * this.scale,
        life,
        maxLife: life,
      });
    }
  }

  private feet(person: Person) {
    return this.bank.surfaceAt(person.x) - person.hop * this.scale;
  }

  private hip(person: Person) {
    return -LEG * (1 - person.pose.crouch * 0.6);
  }

  private hand(angle: number, length = ARM): [number, number] {
    return [1 + Math.sin(angle) * length, SHOULDER_Y + Math.cos(angle) * length];
  }

  // Converts a point on the person's leaning upper body to screen coordinates
  private toWorld(person: Person, x: number, y: number) {
    const cos = Math.cos(person.pose.tilt);
    const sin = Math.sin(person.pose.tilt);
    return {
      x: person.x + person.facing * this.scale * (x * cos - y * sin),
      y: this.feet(person) + this.scale * (x * sin + y * cos + this.hip(person)),
    };
  }

  // Draws facing right, in body units, with the feet at the origin
  private drawPerson(ctx: CanvasRenderingContext2D, person: Person, time: number) {
    const { look, pose } = person;
    const hip = this.hip(person);

    ctx.save();
    ctx.translate(person.x, this.feet(person));
    ctx.scale(person.facing * this.scale, this.scale);
    ctx.lineCap = 'round';

    ctx.fillStyle = '#2b2d42';
    ctx.beginPath();
    ctx.roundRect(-5.5, hip, 4.5, -hip, 2);
    ctx.roundRect(1, hip, 4.5, -hip, 2);
    ctx.fill();
    ctx.fillStyle = '#5c3d2e';
    ctx.beginPath();
    ctx.ellipse(-2.8, -1.4, 3.6, 2.2, 0, 0, Math.PI * 2);
    ctx.ellipse(3.8, -1.4, 3.6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, hip);
    ctx.rotate(pose.tilt);

    this.drawArm(ctx, pose.backArm, look.sleeve, look.hat, false);

    ctx.fillStyle = look.coat;
    ctx.beginPath();
    ctx.roundRect(-7.5, -TORSO, 15, TORSO + 1, [5, 5, 3, 3]);
    ctx.fill();
    ctx.fillStyle = look.sleeve;
    ctx.fillRect(-7.5, -3, 15, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (const y of [-12, -8.5, -5]) {
      ctx.beginPath();
      ctx.arc(5, y, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Scarf, with its tail flapping out behind
    ctx.fillStyle = look.scarf;
    ctx.save();
    ctx.translate(-4, -TORSO + 1);
    ctx.rotate(0.6 + Math.sin(time * 6 + person.phase) * 0.25);
    ctx.beginPath();
    ctx.roundRect(-2, 0, 4, 8, 1.5);
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.roundRect(-6.5, -TORSO - 1.5, 13, 4, 2);
    ctx.fill();

    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.arc(1, HEAD_Y, HEAD, 0, Math.PI * 2);
    ctx.fill();
    this.drawFace(ctx, person);

    ctx.fillStyle = look.hat;
    ctx.beginPath();
    ctx.arc(1, HEAD_Y - 1, HEAD + 0.4, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.trim;
    ctx.beginPath();
    ctx.roundRect(-7.2, HEAD_Y - 2.6, 16.4, 3.4, 1.5);
    ctx.arc(-1.5 - Math.min(person.hop, 3), HEAD_Y - 9.8, 2.8, 0, Math.PI * 2);
    ctx.fill();

    for (const splat of person.splats) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.95, (2.5 - splat.age) / 1.5)})`;
      ctx.beginPath();
      ctx.arc(splat.x, splat.y, splat.size, 0, Math.PI * 2);
      ctx.arc(splat.x - splat.size * 0.8, splat.y + splat.size * 0.5, splat.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawArm(ctx, pose.arm, look.coat, look.hat, person.hasBall);
    ctx.restore();
  }

  private drawFace(ctx: CanvasRenderingContext2D, person: Person) {
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(3.6, HEAD_Y - 0.6, 0.95, 0, Math.PI * 2);
    ctx.arc(6.6, HEAD_Y - 0.6, 0.95, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 110, 110, 0.5)';
    ctx.beginPath();
    ctx.arc(6.2, HEAD_Y + 2.4, 1.6, 0, Math.PI * 2);
    ctx.fill();

    if (person.state === 'hit') {
      ctx.fillStyle = '#2b2b2b';
      ctx.beginPath();
      ctx.arc(5.4, HEAD_Y + 4, 1.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const grin = person.state === 'cheer' ? 2.4 : 1.8;
      ctx.strokeStyle = '#2b2b2b';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(5.2, HEAD_Y + 2.2, grin, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
    }
  }

  private drawArm(ctx: CanvasRenderingContext2D, angle: number, sleeve: string, mitten: string, holdingBall: boolean) {
    const [x, y] = this.hand(angle);
    ctx.strokeStyle = sleeve;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(1, SHOULDER_Y);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.fillStyle = mitten;
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();

    if (holdingBall) {
      const [bx, by] = this.hand(angle, ARM + 2.5);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx, by, BALL, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
