import * as THREE from "three";
import type { Character } from "./types";

// ============================================================
// Build a character mesh from primitives.
// style: "player" | "yakkar" | "vein" | "philosoph" | "patriciy"
// ============================================================
export function buildCharacter(
  accentColor: number,
  style: string = "player",
): Character {
  const group = new THREE.Group();

  const matLimb = new THREE.MeshStandardMaterial({
    color: 0x1e2126,
    roughness: 0.7,
  });
  const matBoot = new THREE.MeshStandardMaterial({
    color: 0x0e1014,
    roughness: 0.55,
  });
  const matHead = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.6,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });

  let bodyW = 1.0;
  let bodyH = 1.55;
  let bodyColor = 0x33373d;
  let headSize = 0.3;
  let eyeColor = 0x6cf0ff;
  let eyeSize = 0.06;
  let eyeCount = 2;
  let headgear: "cone" | "helmet" | "hood" | "cap" | "jester" = "hood";
  let hasCape = false;
  let hasBackpack = false;
  let hasStaff = false;

  if (style === "player") {
    bodyW = 1.0;
    bodyH = 1.55;
    bodyColor = 0x33373d;
    eyeColor = 0x6cf0ff;
    headgear = "hood";
  } else if (style === "yakkar") {
    bodyW = 1.2;
    bodyH = 1.35;
    bodyColor = 0x4a2b16;
    eyeColor = 0xffc857;
    eyeSize = 0.08;
    headgear = "jester";
  } else if (style === "vein") {
    bodyW = 1.15;
    bodyH = 1.55;
    bodyColor = 0x2a3d24;
    eyeColor = 0x88ff66;
    eyeSize = 0.05;
    headgear = "helmet";
  } else if (style === "philosoph") {
    bodyW = 0.75;
    bodyH = 1.95;
    bodyColor = 0x2e1d42;
    eyeColor = 0xffffff;
    eyeSize = 0.08;
    eyeCount = 1;
    headgear = "hood";
    hasCape = true;
    hasStaff = true;
  } else if (style === "patriciy") {
    bodyW = 0.9;
    bodyH = 1.35;
    bodyColor = 0x5a4a15;
    eyeColor = 0xfff18a;
    eyeSize = 0.13;
    headgear = "cap";
    hasBackpack = true;
  }

  const matBody = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.55,
    metalness: 0.25,
  });

  const bodyGeo = new THREE.SphereGeometry(0.42, 16, 16);
  bodyGeo.scale(bodyW, bodyH, bodyW * 0.85);
  const torso = new THREE.Mesh(bodyGeo, matBody);
  torso.position.y = 1.1;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  const beltGeo = new THREE.TorusGeometry(0.46 * bodyW, 0.07, 8, 20);
  const belt = new THREE.Mesh(beltGeo, matAccent);
  belt.position.y = 0.78;
  belt.rotation.x = Math.PI / 2;
  group.add(belt);

  const headY = 2.02 + (bodyH - 1.55) * 0.4;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(headSize, 16, 16),
    matHead,
  );
  head.position.y = headY;
  head.castShadow = true;
  group.add(head);

  if (headgear === "cone") {
    const hoodGeo = new THREE.ConeGeometry(0.55, 0.95, 18, 1, true);
    const hood = new THREE.Mesh(hoodGeo, matBody);
    hood.position.y = headY + 0.16;
    hood.castShadow = true;
    group.add(hood);
  } else if (headgear === "hood") {
    const hoodGeo = new THREE.ConeGeometry(
      style === "philosoph" ? 0.5 : 0.55,
      style === "philosoph" ? 1.4 : 0.95,
      18,
      1,
      true,
    );
    const hood = new THREE.Mesh(hoodGeo, matBody);
    hood.position.y = headY + (style === "philosoph" ? 0.4 : 0.16);
    hood.castShadow = true;
    group.add(hood);
  } else if (headgear === "helmet") {
    const helmetGeo = new THREE.SphereGeometry(
      0.42,
      16,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI / 1.7,
    );
    const helmet = new THREE.Mesh(helmetGeo, matBody);
    helmet.position.y = headY + 0.1;
    helmet.castShadow = true;
    group.add(helmet);
    const visorGeo = new THREE.BoxGeometry(0.55, 0.05, 0.4);
    const visor = new THREE.Mesh(visorGeo, matAccent);
    visor.position.set(0, headY + 0.18, 0.32);
    visor.rotation.x = -0.25;
    group.add(visor);
  } else if (headgear === "cap") {
    const capGeo = new THREE.CylinderGeometry(0.35, 0.38, 0.28, 16);
    const cap = new THREE.Mesh(capGeo, matBody);
    cap.position.y = headY + 0.28;
    cap.castShadow = true;
    group.add(cap);
  } else if (headgear === "jester") {
    for (let i = 0; i < 3; i++) {
      const coneGeo = new THREE.ConeGeometry(0.16, 0.85, 10);
      const cone = new THREE.Mesh(coneGeo, matAccent);
      const ang = (i - 1) * 0.6;
      cone.position.set(
        Math.sin(ang) * 0.18,
        headY + 0.55,
        Math.cos(ang) * 0.08 - 0.1,
      );
      cone.rotation.z = Math.sin(ang) * 0.5;
      cone.rotation.x = -0.15;
      cone.castShadow = true;
      group.add(cone);
      const bellGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const bell = new THREE.Mesh(
        bellGeo,
        new THREE.MeshStandardMaterial({
          color: 0xffd54a,
          emissive: 0xffd54a,
          emissiveIntensity: 0.9,
        }),
      );
      bell.position.set(
        Math.sin(ang) * 0.4,
        headY + 0.95,
        Math.cos(ang) * 0.1 - 0.1,
      );
      group.add(bell);
    }
  }

  const eyeGeo = new THREE.SphereGeometry(eyeSize, 10, 10);
  const matEye = new THREE.MeshStandardMaterial({
    color: eyeColor,
    emissive: eyeColor,
    emissiveIntensity: 4.0,
  });
  matEye.userData.skipOpacity = true;
  if (eyeCount === 1) {
    const eye = new THREE.Mesh(eyeGeo, matEye);
    eye.position.set(0, headY + 0.02, 0.24);
    group.add(eye);
  } else {
    const eyeL = new THREE.Mesh(eyeGeo, matEye);
    eyeL.position.set(-0.11, headY + 0.02, 0.22);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, matEye);
    eyeR.position.set(0.11, headY + 0.02, 0.22);
    group.add(eyeR);
  }

  const eyeLight = new THREE.PointLight(eyeColor, 0.6, 2.8);
  eyeLight.position.set(0, headY + 0.02, 0.34);
  group.add(eyeLight);

  if (headgear === "hood" || headgear === "cone") {
    const matVoid = new THREE.MeshBasicMaterial({ color: 0x000000 });
    matVoid.userData.skipOpacity = true;
    const voidSphere = new THREE.Mesh(
      new THREE.SphereGeometry(headSize + 0.04, 12, 12),
      matVoid,
    );
    voidSphere.position.set(0, headY + 0.02, -0.04);
    group.add(voidSphere);
  }

  const armUpperGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.42, 8);
  const armLowerGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.4, 8);
  const buildArm = (side: 1 | -1): THREE.Group => {
    const arm = new THREE.Group();
    const upper = new THREE.Mesh(armUpperGeo, matLimb);
    upper.position.y = -0.21;
    upper.castShadow = true;
    arm.add(upper);
    const lower = new THREE.Mesh(armLowerGeo, matLimb);
    lower.position.set(side * 0.06, -0.55, 0.1);
    lower.rotation.x = -0.35;
    lower.castShadow = true;
    arm.add(lower);
    return arm;
  };
  const armL = buildArm(1);
  armL.position.set(-0.5 * bodyW, 1.5, 0);
  armL.rotation.z = 0.18;
  group.add(armL);
  const armR = buildArm(-1);
  armR.position.set(0.5 * bodyW, 1.5, 0);
  armR.rotation.z = -0.18;
  group.add(armR);

  const legGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.4, 8);
  const legL = new THREE.Mesh(legGeo, matLimb);
  legL.position.set(-0.18 * bodyW, 0.55, 0);
  legL.castShadow = true;
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, matLimb);
  legR.position.set(0.18 * bodyW, 0.55, 0);
  legR.castShadow = true;
  group.add(legR);

  const bootGeo = new THREE.BoxGeometry(0.36, 0.28, 0.5);
  const bootL = new THREE.Mesh(bootGeo, matBoot);
  bootL.position.set(-0.18 * bodyW, 0.16, 0.05);
  bootL.castShadow = true;
  bootL.receiveShadow = true;
  group.add(bootL);
  const bootR = new THREE.Mesh(bootGeo, matBoot);
  bootR.position.set(0.18 * bodyW, 0.16, 0.05);
  bootR.castShadow = true;
  bootR.receiveShadow = true;
  group.add(bootR);

  if (hasCape) {
    const capeGeo = new THREE.ConeGeometry(0.75, 1.9, 14, 1, true);
    const cape = new THREE.Mesh(capeGeo, matBody);
    cape.position.set(0, 1.1, -0.2);
    cape.castShadow = true;
    group.add(cape);
  }

  if (hasBackpack) {
    const packGeo = new THREE.BoxGeometry(0.55, 0.7, 0.35);
    const pack = new THREE.Mesh(packGeo, matAccent);
    pack.position.set(0, 1.25, -0.55);
    pack.castShadow = true;
    group.add(pack);
  }

  if (hasStaff) {
    const staffGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8);
    const staff = new THREE.Mesh(staffGeo, matLimb);
    staff.position.set(0.62, 0.9, 0.15);
    staff.rotation.z = -0.15;
    staff.castShadow = true;
    group.add(staff);
    const orbGeo = new THREE.SphereGeometry(0.13, 12, 12);
    const orb = new THREE.Mesh(
      orbGeo,
      new THREE.MeshStandardMaterial({
        color: 0xcc88ff,
        emissive: 0xcc88ff,
        emissiveIntensity: 2.5,
      }),
    );
    orb.position.set(0.72, 2.1, 0.15);
    group.add(orb);
    const orbLight = new THREE.PointLight(0xcc88ff, 0.8, 3.5);
    orbLight.position.set(0.72, 2.1, 0.15);
    group.add(orbLight);
  }

  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.32,
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  return {
    group,
    body: torso,
    head,
    armL,
    armR,
    legL,
    legR,
    shadow,
    walkPhase: 0,
  };
}

export function animateCharacter(
  c: Character,
  speed: number,
  dt: number,
): void {
  const norm = Math.min(1, speed / 18);
  c.walkPhase += dt * (4 + norm * 12);
  const swing = Math.sin(c.walkPhase) * 0.55 * norm;
  c.legL.rotation.x = swing;
  c.legR.rotation.x = -swing;
  c.armL.rotation.x = -swing * 0.7;
  c.armR.rotation.x = swing * 0.7;
  const bob = Math.abs(Math.cos(c.walkPhase)) * 0.05 * norm;
  c.body.position.y = 1.1 + bob;
  c.head.position.y = 2.02 + bob;
}

export function setCharacterOpacity(c: Character, opacity: number): void {
  c.group.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = m.material as THREE.Material & { opacity?: number };
    if (mat.userData?.skipOpacity) return;
    mat.transparent = opacity < 1.0;
    if (typeof mat.opacity === "number") mat.opacity = opacity;
  });
}
