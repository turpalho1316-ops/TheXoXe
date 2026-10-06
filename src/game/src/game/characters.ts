import * as THREE from "three";
import type { Character, Pet } from "./types";
import { PET_HP, PET_MAX_HP } from "./config";
import { createHpBarTexture } from "./textures";
import { getWolfSkin } from "./save";

// ============================================================
// PLAYER / BOT CHARACTER
// Style can be: player | pirate | skeleton | zombie | ninja |
// clown | ghost | cowboy | robot | knight | samurai |
// yakkar | vein | philosoph | patriciy
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
  let headgear: "cone" | "helmet" | "hood" | "cap" | "jester" | "hat" | "none" = "hood";
  let hasCape = false;
  let hasBackpack = false;
  let hasStaff = false;
  let hasHat = false;
  let hatStyle: "pirate" | "clown" | "cowboy" | "knight" | "samurai" | "none" = "none";
  let glowing = false;
  let limbColor: number | null = null;

  if (style === "player") {
    bodyW = 1.0;
    bodyH = 1.55;
    bodyColor = 0x33373d;
    eyeColor = 0x6cf0ff;
    headgear = "hood";
  } else if (style === "pirate") {
    bodyW = 1.1;
    bodyH = 1.5;
    bodyColor = 0x5a3a1a;
    eyeColor = 0xffaa44;
    headgear = "hood";
    hasHat = true;
    hatStyle = "pirate";
  } else if (style === "skeleton") {
    bodyW = 0.9;
    bodyH = 1.5;
    bodyColor = 0xe0e0d8;
    eyeColor = 0xff2020;
    eyeSize = 0.07;
    headgear = "none";
    limbColor = 0xd0d0c8;
  } else if (style === "zombie") {
    bodyW = 1.05;
    bodyH = 1.5;
    bodyColor = 0x4a6a2a;
    eyeColor = 0xaaff44;
    eyeSize = 0.07;
    headgear = "none";
    limbColor = 0x3a5a1a;
  } else if (style === "ninja") {
    bodyW = 0.95;
    bodyH = 1.6;
    bodyColor = 0x1a1a1a;
    eyeColor = 0xff3030;
    eyeSize = 0.06;
    headgear = "hood";
    hasCape = true;
  } else if (style === "clown") {
    bodyW = 1.15;
    bodyH = 1.45;
    bodyColor = 0xf0f0f0;
    eyeColor = 0xff88ff;
    eyeSize = 0.08;
    headgear = "none";
    hasHat = true;
    hatStyle = "clown";
  } else if (style === "ghost") {
    bodyW = 1.0;
    bodyH = 1.7;
    bodyColor = 0xd0e8ff;
    eyeColor = 0x88ccff;
    eyeSize = 0.08;
    headgear = "hood";
    hasCape = true;
    glowing = true;
  } else if (style === "cowboy") {
    bodyW = 1.0;
    bodyH = 1.55;
    bodyColor = 0x8a5a2a;
    eyeColor = 0xffcc44;
    eyeSize = 0.06;
    headgear = "none";
    hasHat = true;
    hatStyle = "cowboy";
  } else if (style === "robot") {
    bodyW = 1.1;
    bodyH = 1.5;
    bodyColor = 0x708090;
    eyeColor = 0x00ffcc;
    eyeSize = 0.09;
    headgear = "helmet";
    limbColor = 0x505860;
  } else if (style === "knight") {
    bodyW = 1.2;
    bodyH = 1.55;
    bodyColor = 0x9098a8;
    eyeColor = 0x66aaff;
    eyeSize = 0.05;
    headgear = "helmet";
    hasHat = true;
    hatStyle = "knight";
  } else if (style === "samurai") {
    bodyW = 1.05;
    bodyH = 1.55;
    bodyColor = 0xb02020;
    eyeColor = 0xffffff;
    eyeSize = 0.06;
    headgear = "helmet";
    hasHat = true;
    hatStyle = "samurai";
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

  const matLimbFinal = limbColor !== null
    ? new THREE.MeshStandardMaterial({ color: limbColor, roughness: 0.7 })
    : matLimb;

  const matBody = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.55,
    metalness: 0.25,
    emissive: glowing ? bodyColor : 0x000000,
    emissiveIntensity: glowing ? 0.35 : 0,
    transparent: glowing,
    opacity: glowing ? 0.75 : 1.0,
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

  // Extra hats
  if (hasHat) {
    if (hatStyle === "pirate") {
      const brimGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.06, 20);
      const brim = new THREE.Mesh(brimGeo, matHead);
      brim.position.y = headY + 0.22;
      group.add(brim);
      const topGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.35, 16);
      const top = new THREE.Mesh(topGeo, matHead);
      top.position.y = headY + 0.4;
      group.add(top);
      const skullGeo = new THREE.SphereGeometry(0.09, 8, 8);
      const skull = new THREE.Mesh(
        skullGeo,
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 0.4,
        }),
      );
      skull.position.set(0, headY + 0.4, 0.31);
      group.add(skull);
    } else if (hatStyle === "clown") {
      const hairColors = [0xff3030, 0xffcc00, 0x66ccff];
      for (let i = 0; i < 6; i++) {
        const puffGeo = new THREE.SphereGeometry(0.16, 8, 8);
        const puff = new THREE.Mesh(
          puffGeo,
          new THREE.MeshStandardMaterial({
            color: hairColors[i % 3],
            roughness: 0.8,
          }),
        );
        const ang = (i / 6) * Math.PI * 2;
        puff.position.set(
          Math.cos(ang) * 0.35,
          headY + 0.25,
          Math.sin(ang) * 0.35,
        );
        group.add(puff);
      }
      const noseGeo = new THREE.SphereGeometry(0.08, 10, 10);
      const nose = new THREE.Mesh(
        noseGeo,
        new THREE.MeshStandardMaterial({
          color: 0xff0000,
          emissive: 0xff2020,
          emissiveIntensity: 0.5,
        }),
      );
      nose.position.set(0, headY - 0.02, 0.3);
      group.add(nose);
    } else if (hatStyle === "cowboy") {
      const brimGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.05, 20);
      const brim = new THREE.Mesh(brimGeo, matHead);
      brim.position.y = headY + 0.22;
      group.add(brim);
      const topGeo = new THREE.CylinderGeometry(0.3, 0.36, 0.4, 16);
      const top = new THREE.Mesh(topGeo, matHead);
      top.position.y = headY + 0.44;
      group.add(top);
    } else if (hatStyle === "knight") {
      const plumeGeo = new THREE.ConeGeometry(0.1, 0.5, 8);
      const plume = new THREE.Mesh(
        plumeGeo,
        new THREE.MeshStandardMaterial({
          color: 0xff2020,
          roughness: 0.6,
        }),
      );
      plume.position.y = headY + 0.7;
      group.add(plume);
    } else if (hatStyle === "samurai") {
      const crestGeo = new THREE.BoxGeometry(0.08, 0.4, 0.08);
      const crest = new THREE.Mesh(
        crestGeo,
        new THREE.MeshStandardMaterial({
          color: 0xffcc00,
          emissive: 0xffcc00,
          emissiveIntensity: 0.6,
        }),
      );
      crest.position.set(0, headY + 0.55, 0.05);
      group.add(crest);
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
    const upper = new THREE.Mesh(armUpperGeo, matLimbFinal);
    upper.position.y = -0.21;
    upper.castShadow = true;
    arm.add(upper);
    const lower = new THREE.Mesh(armLowerGeo, matLimbFinal);
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
  const legL = new THREE.Mesh(legGeo, matLimbFinal);
  legL.position.set(-0.18 * bodyW, 0.55, 0);
  legL.castShadow = true;
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, matLimbFinal);
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
    const staff = new THREE.Mesh(staffGeo, matLimbFinal);
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

// ============================================================
// PET — wolf, with skin support
// ============================================================
export function buildPet(wolfSkinId: string = "wolf_default"): Pet {
  const group = new THREE.Group();
  const skin = getWolfSkin(wolfSkinId);

  const matFur = new THREE.MeshStandardMaterial({
    color: skin.bodyColor,
    roughness: 0.9,
  });
  const matFurDark = new THREE.MeshStandardMaterial({
    color: new THREE.Color(skin.bodyColor).multiplyScalar(0.55).getHex(),
    roughness: 0.9,
  });
  const matNose = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.5,
  });
  const matEye = new THREE.MeshStandardMaterial({
    color: skin.eyeColor,
    emissive: skin.eyeColor,
    emissiveIntensity: 3.5,
  });

  const bodyGeo = new THREE.SphereGeometry(0.42, 14, 14);
  bodyGeo.scale(1.3, 0.85, 0.9);
  const body = new THREE.Mesh(bodyGeo, matFur);
  body.position.y = 0.7;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const head = new THREE.Group();
  const headGeo = new THREE.SphereGeometry(0.28, 14, 14);
  headGeo.scale(1.1, 1.0, 1.1);
  const headMesh = new THREE.Mesh(headGeo, matFur);
  headMesh.castShadow = true;
  head.add(headMesh);

  const snoutGeo = new THREE.BoxGeometry(0.18, 0.14, 0.28);
  const snout = new THREE.Mesh(snoutGeo, matFurDark);
  snout.position.set(0, -0.05, 0.28);
  snout.castShadow = true;
  head.add(snout);

  const noseGeo = new THREE.SphereGeometry(0.055, 8, 8);
  const nose = new THREE.Mesh(noseGeo, matNose);
  nose.position.set(0, -0.02, 0.43);
  head.add(nose);

  const earGeo = new THREE.ConeGeometry(0.1, 0.22, 6);
  const earL = new THREE.Mesh(earGeo, matFurDark);
  earL.position.set(-0.13, 0.24, -0.02);
  earL.rotation.z = -0.15;
  head.add(earL);
  const earR = new THREE.Mesh(earGeo, matFurDark);
  earR.position.set(0.13, 0.24, -0.02);
  earR.rotation.z = 0.15;
  head.add(earR);

  const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const eyeL = new THREE.Mesh(eyeGeo, matEye);
  eyeL.position.set(-0.1, 0.05, 0.22);
  head.add(eyeL);
  const eyeR = new THREE.Mesh(eyeGeo, matEye);
  eyeR.position.set(0.1, 0.05, 0.22);
  head.add(eyeR);

  head.position.set(0, 0.85, 0.55);
  group.add(head);

  const tail = new THREE.Group();
  const tailGeo = new THREE.CylinderGeometry(0.06, 0.03, 0.55, 8);
  const tailMesh = new THREE.Mesh(tailGeo, matFurDark);
  tailMesh.position.y = 0.27;
  tailMesh.castShadow = true;
  tail.add(tailMesh);
  tail.position.set(0, 0.85, -0.5);
  tail.rotation.x = -0.7;
  group.add(tail);

  const legGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.4, 8);
  const legL = new THREE.Group();
  const legLMesh = new THREE.Mesh(legGeo, matFurDark);
  legLMesh.position.y = -0.2;
  legLMesh.castShadow = true;
  legL.add(legLMesh);
  legL.position.set(-0.2, 0.42, 0.35);
  group.add(legL);

  const legR = new THREE.Group();
  const legRMesh = new THREE.Mesh(legGeo, matFurDark);
  legRMesh.position.y = -0.2;
  legRMesh.castShadow = true;
  legR.add(legRMesh);
  legR.position.set(0.2, 0.42, 0.35);
  group.add(legR);

  const legBL = new THREE.Group();
  const legBLMesh = new THREE.Mesh(legGeo, matFurDark);
  legBLMesh.position.y = -0.2;
  legBLMesh.castShadow = true;
  legBL.add(legBLMesh);
  legBL.position.set(-0.2, 0.42, -0.35);
  group.add(legBL);

  const legBR = new THREE.Group();
  const legBRMesh = new THREE.Mesh(legGeo, matFurDark);
  legBRMesh.position.y = -0.2;
  legBRMesh.castShadow = true;
  legBR.add(legBRMesh);
  legBR.position.set(0.2, 0.42, -0.35);
  group.add(legBR);

  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.3,
  });
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 20),
    shadowMat,
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  const hpBarTex = createHpBarTexture(PET_HP, PET_MAX_HP, "Волк");
  const hpBar = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: hpBarTex,
      transparent: true,
      depthTest: false,
    }),
  );
  hpBar.scale.set(2.4, 0.9, 1);
  hpBar.position.y = 1.9;
  group.add(hpBar);

  return {
    group,
    body: null as unknown as Matter.Body,
    hp: PET_HP,
    maxHp: PET_MAX_HP,
    hpBar,
    state: "follow",
    targetEnemyId: null,
    lastAttackerId: null,
    lastBiteAt: 0,
    walkPhase: 0,
    tail,
    head,
    legL,
    legR,
    legBL,
    legBR,
    shadow,
    alive: true,
  };
}

export function animatePet(pet: Pet, speed: number, dt: number): void {
  const norm = Math.min(1, speed / 18);
  pet.walkPhase += dt * (6 + norm * 14);
  const swing = Math.sin(pet.walkPhase) * 0.6 * norm;
  pet.legL.rotation.x = swing;
  pet.legR.rotation.x = -swing;
  pet.legBL.rotation.x = -swing;
  pet.legBR.rotation.x = swing;
  pet.tail.rotation.z = Math.sin(pet.walkPhase * 0.6) * 0.4;
  pet.head.rotation.x = Math.sin(pet.walkPhase * 0.5) * 0.05;
}

export function refreshPetHpBar(pet: Pet): void {
  const tex = createHpBarTexture(pet.hp, pet.maxHp, "Волк");
  const oldMap = pet.hpBar.material.map;
  pet.hpBar.material.map = tex;
  pet.hpBar.material.needsUpdate = true;
  if (oldMap) oldMap.dispose();
}
