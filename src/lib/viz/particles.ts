
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class ParticleEngine {
  private particles: Particle[] = [];

  // Configuration
  private readonly DRAG = 0.96;
  private readonly GRAVITY = -0.02; // Slight upward drift like smoke

  constructor() {}

  emit(x: number, y: number, color: string, count: number = 20) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2;
        this.particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            maxLife: 1.0 + Math.random(), // Variance in life
            color,
            size: 2 + Math.random() * 4
        });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];

        p.x += p.vx;
        p.y += p.vy;

        p.vx *= this.DRAG;
        p.vy *= this.DRAG;
        p.vy += this.GRAVITY; // Upward drift

        // Turbulence / Brownian motion
        p.vx += (Math.random() - 0.5) * 0.1;
        p.vy += (Math.random() - 0.5) * 0.1;

        p.life -= 0.01; // Decay

        if (p.life <= 0) {
            this.particles.splice(i, 1);
        }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    // additive blending for nice glowing effects
    ctx.globalCompositeOperation = 'lighter';

    for (const p of this.particles) {
        ctx.globalAlpha = p.life * 0.6; // Fade out
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
  }
}
