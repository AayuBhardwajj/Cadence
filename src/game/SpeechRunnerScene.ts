import Phaser from "phaser";

export type RunnerState = "idle" | "running" | "coasting" | "stumble" | "success";

export class SpeechRunnerScene extends Phaser.Scene {
  private characterContainer!: Phaser.GameObjects.Container;
  private characterBody!: Phaser.GameObjects.Arc;
  private characterHead!: Phaser.GameObjects.Arc;
  private characterEye!: Phaser.GameObjects.Arc;
  private characterVisor!: Phaser.GameObjects.Rectangle;
  private characterMouth!: Phaser.GameObjects.Arc;
  private characterShadow!: Phaser.GameObjects.Ellipse;
  private auraRing!: Phaser.GameObjects.Arc;

  private currentState: RunnerState = "idle";
  private jawOpenVal: number = 0;

  // Background elements for parallax
  private bgStars: Phaser.GameObjects.Arc[] = [];
  private gridLines: Phaser.GameObjects.Line[] = [];
  private ground!: Phaser.GameObjects.Rectangle;
  private groundStripe!: Phaser.GameObjects.TileSprite;
  private speedLines: Phaser.GameObjects.Rectangle[] = [];
  private particles: Phaser.GameObjects.Arc[] = [];

  private animTimer: number = 0;
  private runStep: number = 0;

  constructor() {
    super({ key: "SpeechRunnerScene" });
  }

  create() {
    const { width, height } = this.scale;

    // 1. Background Gradient / Sky
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e1b4b, 0x311042, 1);
    bg.fillRect(0, 0, width, height);

    // 2. Distant ambient stars/nodes
    for (let i = 0; i < 30; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height - 90),
        Phaser.Math.FloatBetween(1, 2.5),
        0x818cf8,
        Phaser.Math.FloatBetween(0.3, 0.8)
      );
      this.bgStars.push(star);
    }

    // 3. Synthwave / Arcade Grid Lines (Perspective)
    const horizonY = height - 80;
    for (let i = 0; i < 8; i++) {
      const line = this.add.line(
        0,
        0,
        width * 0.5,
        horizonY,
        (i / 7) * width * 1.6 - width * 0.3,
        height,
        0x6366f1,
        0.25
      );
      this.gridLines.push(line);
    }

    // 4. Ground Runway
    this.ground = this.add.rectangle(width / 2, height - 40, width, 80, 0x090d16);
    this.ground.setStrokeStyle(2, 0x38bdf8, 0.6);

    // Speed lines for coasting/running
    for (let i = 0; i < 6; i++) {
      const sl = this.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(horizonY + 10, height - 10),
        Phaser.Math.Between(40, 100),
        2,
        0x38bdf8,
        0.5
      );
      sl.setVisible(false);
      this.speedLines.push(sl);
    }

    // 5. Character Setup
    const startX = width * 0.28;
    const startY = height - 95;

    this.characterShadow = this.add.ellipse(startX, startY + 45, 48, 14, 0x000000, 0.4);

    this.characterContainer = this.add.container(startX, startY);

    // Aura ring
    this.auraRing = this.add.circle(0, 0, 36, 0x38bdf8, 0.15);
    this.auraRing.setStrokeStyle(1.5, 0x38bdf8, 0.4);

    // Body (Robo-runner torso)
    this.characterBody = this.add.circle(0, 10, 20, 0x6366f1);
    this.characterBody.setStrokeStyle(2, 0xa5b4fc, 0.9);

    // Head
    this.characterHead = this.add.circle(0, -14, 15, 0x4f46e5);
    this.characterHead.setStrokeStyle(2, 0xc7d2fe, 1);

    // Visor / Face Display
    this.characterVisor = this.add.rectangle(4, -14, 16, 7, 0x38bdf8, 0.95);
    this.characterEye = this.add.circle(8, -14, 2.5, 0xffffff, 1);

    // Dynamic mouth flap for jawOpen blendshape
    this.characterMouth = this.add.circle(6, -8, 2, 0xec4899, 0.85);

    this.characterContainer.add([
      this.auraRing,
      this.characterBody,
      this.characterHead,
      this.characterVisor,
      this.characterEye,
      this.characterMouth,
    ]);

    // Particle pool for running dust / sparks
    for (let i = 0; i < 15; i++) {
      const p = this.add.circle(-100, -100, 3, 0x38bdf8, 0.8);
      p.setVisible(false);
      this.particles.push(p);
    }

    this.setState("idle");
  }

  public setState(state: RunnerState) {
    if (this.currentState === state) return;
    this.currentState = state;

    if (!this.characterContainer) return;

    // Reset tweens on state change
    this.tweens.killTweensOf(this.characterContainer);
    this.tweens.killTweensOf(this.auraRing);

    switch (state) {
      case "idle":
        this.speedLines.forEach((s) => s.setVisible(false));
        this.auraRing.setStrokeStyle(1.5, 0x6366f1, 0.4);
        this.characterBody.setFillStyle(0x6366f1);

        // Idle floating bob
        this.tweens.add({
          targets: this.characterContainer,
          y: this.scale.height - 98,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
        break;

      case "running":
        this.speedLines.forEach((s) => s.setVisible(true));
        this.auraRing.setStrokeStyle(2, 0x10b981, 0.8);
        this.characterBody.setFillStyle(0x059669);

        // Dynamic forward tilt
        this.characterContainer.setAngle(8);
        this.tweens.add({
          targets: this.characterContainer,
          y: this.scale.height - 92,
          duration: 180,
          yoyo: true,
          repeat: -1,
          ease: "Quad.easeInOut",
        });
        break;

      case "coasting":
        // Processing / awaiting verdict state: Smooth hover glide with speed lines
        this.speedLines.forEach((s) => s.setVisible(true));
        this.auraRing.setStrokeStyle(2.5, 0xf59e0b, 0.9);
        this.characterBody.setFillStyle(0xd97706);
        this.characterContainer.setAngle(2);

        this.tweens.add({
          targets: this.characterContainer,
          y: this.scale.height - 105,
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
        break;

      case "stumble":
        this.speedLines.forEach((s) => s.setVisible(false));
        this.auraRing.setStrokeStyle(2, 0xef4444, 0.9);
        this.characterBody.setFillStyle(0xdc2626);

        // Stumble backward recoil
        this.tweens.add({
          targets: this.characterContainer,
          x: this.scale.width * 0.22,
          angle: -14,
          duration: 220,
          yoyo: true,
          repeat: 1,
          ease: "Back.easeOut",
          onComplete: () => {
            this.characterContainer.setAngle(0);
            this.characterContainer.setX(this.scale.width * 0.28);
          },
        });
        break;

      case "success":
        this.speedLines.forEach((s) => s.setVisible(false));
        this.auraRing.setStrokeStyle(3, 0x10b981, 1);
        this.characterBody.setFillStyle(0x10b981);

        // Joyful jump
        this.tweens.add({
          targets: this.characterContainer,
          y: this.scale.height - 140,
          angle: 360,
          duration: 650,
          ease: "Cubic.easeOut",
          yoyo: true,
          onComplete: () => {
            this.characterContainer.setAngle(0);
          },
        });
        break;
    }
  }

  public setJawOpen(jawOpen: number) {
    this.jawOpenVal = Phaser.Math.Clamp(jawOpen, 0, 1);
  }

  update(time: number, delta: number) {
    this.animTimer += delta;

    // Parallax Star & Speed Line Movement
    const speed =
      this.currentState === "running"
        ? 5.0
        : this.currentState === "coasting"
        ? 3.2
        : 0.6;

    this.bgStars.forEach((star) => {
      star.x -= speed * 0.4;
      if (star.x < 0) star.x = this.scale.width;
    });

    this.speedLines.forEach((sl) => {
      sl.x -= speed * 3.5;
      if (sl.x < -100) {
        sl.x = this.scale.width + Phaser.Math.Between(20, 80);
        sl.y = Phaser.Math.Between(this.scale.height - 80, this.scale.height - 15);
      }
    });

    // Cosmetic jawOpen mouth scaling & aura pulse
    if (this.characterMouth) {
      const mouthScale = 1 + this.jawOpenVal * 3.5;
      this.characterMouth.setScale(mouthScale);
    }
    if (this.auraRing) {
      const auraScale = 1 + (this.currentState === "running" ? 0.2 : 0) + this.jawOpenVal * 0.3;
      this.auraRing.setScale(auraScale);
    }

    // Spawn running particles
    if (this.currentState === "running" && this.animTimer % 4 === 0) {
      const p = this.particles.find((pt) => !pt.visible);
      if (p) {
        p.setPosition(
          this.characterContainer.x - 18,
          this.characterContainer.y + 25 + Phaser.Math.Between(-4, 4)
        );
        p.setVisible(true);
        p.setAlpha(0.8);
        p.setScale(1);

        this.tweens.add({
          targets: p,
          x: p.x - Phaser.Math.Between(30, 60),
          alpha: 0,
          scale: 0.3,
          duration: 350,
          onComplete: () => {
            p.setVisible(false);
          },
        });
      }
    }
  }
}
