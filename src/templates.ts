import { DEFAULT_FINISH, FINISH_PRESETS, identityXform, makePart, wheelRadius } from "./catalog";
import type { Finish, Part, Project, TemplateId } from "./types";

export const TEMPLATE_LIST: { id: TemplateId; label: string; detail: string }[] = [
  { id: "coupe", label: "Sports coupe", detail: "Low two-door, V8, rear wing" },
  { id: "sedan", label: "Grand tourer", detail: "Four-door, V6, long roof" },
  { id: "truck", label: "Pickup", detail: "High cab and open bed" },
  { id: "chassis", label: "Bare chassis", detail: "Spaceframe to build on" },
  { id: "corner", label: "Corner study", detail: "Wheel, brake, and coilover" },
];

interface Spec {
  name: string;
  style: "coupe" | "sedan" | "truck";
  wheelbase: number;
  trackF: number;
  trackR: number;
  frontOverhang: number;
  rearOverhang: number;
  width: number;
  roof: number;
  belt: number;
  rocker: number;
  rim: number;
  tire: number;
  aspect: number;
  spokes: number;
  windshield: number;
  rearGlass: number;
  engine: number;
  paint: Finish;
  rimFinish: Finish;
  caliper: Finish;
}

const preset = (name: string) => FINISH_PRESETS.find((item) => item.name === name)!.finish;

const SPECS: Record<"coupe" | "sedan" | "truck", Spec> = {
  coupe: {
    name: "Sports coupe",
    style: "coupe",
    wheelbase: 2650,
    trackF: 1600,
    trackR: 1620,
    frontOverhang: 960,
    rearOverhang: 880,
    width: 1920,
    roof: 1230,
    belt: 800,
    rocker: 220,
    rim: 20,
    tire: 275,
    aspect: 35,
    spokes: 10,
    windshield: 33,
    rearGlass: 27,
    engine: 2,
    paint: preset("Rosso"),
    rimFinish: preset("Silver"),
    caliper: preset("Ceramic"),
  },
  sedan: {
    name: "Grand tourer",
    style: "sedan",
    wheelbase: 2920,
    trackF: 1600,
    trackR: 1620,
    frontOverhang: 940,
    rearOverhang: 1080,
    width: 1860,
    roof: 1460,
    belt: 900,
    rocker: 280,
    rim: 18,
    tire: 235,
    aspect: 45,
    spokes: 8,
    windshield: 40,
    rearGlass: 42,
    engine: 1,
    paint: preset("Silver"),
    rimFinish: preset("Silver"),
    caliper: preset("Graphite"),
  },
  truck: {
    name: "Pickup",
    style: "truck",
    wheelbase: 3700,
    trackF: 1740,
    trackR: 1740,
    frontOverhang: 920,
    rearOverhang: 1280,
    width: 2080,
    roof: 1860,
    belt: 1180,
    rocker: 520,
    rim: 18,
    tire: 285,
    aspect: 65,
    spokes: 6,
    windshield: 52,
    rearGlass: 68,
    engine: 2,
    paint: preset("Olive"),
    rimFinish: preset("Steel"),
    caliper: preset("Rosso"),
  },
};

function glassFinish(): Finish {
  return { ...preset("Glass") };
}

export function buildTemplate(id: TemplateId): Project {
  if (id === "chassis") return bareChassis();
  if (id === "corner") return cornerStudy();
  return buildVehicle(SPECS[id]);
}

function bareChassis(): Project {
  return {
    name: "Bare chassis",
    parts: [
      makePart(
        "chassis",
        "Spaceframe",
        { length: 4200, width: 980, railWidth: 70, railHeight: 110, clearance: 160, crossCount: 6, tunnelWidth: 280, tunnelHeight: 160, firewall: 980 },
        identityXform(),
        DEFAULT_FINISH.chassis,
      ),
    ],
  };
}

function cornerStudy(): Project {
  const params = { rim: 19, width: 255, aspect: 40, offset: 32, spokes: 10, lip: 16 };
  const y = wheelRadius(params);
  const wheel = makePart("wheel", "Wheel", params, identityXform({ y }), preset("Graphite"));
  const brake = makePart("brake", "Disc brake", { diameter: 355, thickness: 30, caliper: 108 }, identityXform({ y, z: 620 }), preset("Ceramic"));
  const suspension = makePart(
    "suspension",
    "Suspension",
    { arm: 380, spring: 250, coils: 8, upright: 250 },
    identityXform({ x: 820, y }),
    preset("Ceramic"),
  );
  return { name: "Corner study", parts: [wheel, brake, suspension] };
}

function buildVehicle(spec: Spec): Project {
  const parts: Part[] = [];
  const push = (part: Part) => parts.push(part);
  const wheelR = wheelRadius({ rim: spec.rim, width: spec.tire, aspect: spec.aspect });
  const frontZ = spec.wheelbase / 2;
  const rearZ = -spec.wheelbase / 2;
  const nose = frontZ + spec.frontOverhang;
  const tail = rearZ - spec.rearOverhang;
  const half = spec.width / 2;
  const rise = spec.roof - spec.belt;
  const run = rise / Math.tan((spec.windshield * Math.PI) / 180);
  const cowlZ = frontZ - 80;
  const roofFrontZ = cowlZ - run;
  const roofFrac = spec.style === "sedan" ? 0.56 : spec.style === "truck" ? 0.32 : 0.4;
  const roofLen = spec.wheelbase * roofFrac;
  const roofRearZ = roofFrontZ - roofLen;
  const railH = spec.style === "truck" ? 140 : 105;
  const clearance = Math.max(80, spec.rocker - railH - 16);
  const arm = spec.style === "truck" ? 430 : 360;
  const chassisW = Math.max(860, spec.trackF - arm * 2 + 80);
  const frameFront = nose - 180;
  const frameRear = tail + 220;
  const frameLen = frameFront - frameRear;
  const frameZ = (frameFront + frameRear) / 2;
  const firewall = cowlZ - 60 - frameZ;

  push(
    makePart(
      "chassis",
      "Spaceframe",
      {
        length: frameLen,
        width: chassisW,
        railWidth: spec.style === "truck" ? 90 : 68,
        railHeight: railH,
        clearance,
        crossCount: spec.style === "truck" ? 7 : 6,
        tunnelWidth: spec.style === "truck" ? 340 : 280,
        tunnelHeight: spec.style === "truck" ? 200 : 150,
        firewall,
      },
      identityXform({ z: frameZ }),
    ),
  );

  const paint = { ...spec.paint, metalness: 0.2, roughness: 0.4, clearcoat: 0.55 };
  const black = preset("Satin");
  const wheelParams = { rim: spec.rim, width: spec.tire, aspect: spec.aspect, offset: spec.style === "truck" ? 25 : 40, spokes: spec.spokes, lip: spec.style === "truck" ? 10 : 15 };

  const corner = (place: string, right: boolean, x: number, z: number) => {
    const xf = identityXform({ x, y: wheelR, z, ry: right ? 0 : 180 });
    const side = right ? "right" : "left";
    push(makePart("wheel", `${place} ${side} wheel`, wheelParams, xf, spec.rimFinish));
    push(makePart("brake", `${place} ${side} brake`, { diameter: spec.style === "truck" ? 340 : 365, thickness: 30, caliper: 100 }, xf, spec.caliper));
    push(makePart("suspension", `${place} ${side} suspension`, { arm, spring: spec.style === "truck" ? 310 : 240, coils: spec.style === "truck" ? 6 : 8, upright: spec.style === "truck" ? 280 : 240 }, xf));
  };
  corner("Front", true, spec.trackF / 2, frontZ);
  corner("Front", false, -spec.trackF / 2, frontZ);
  corner("Rear", true, spec.trackR / 2, rearZ);
  corner("Rear", false, -spec.trackR / 2, rearZ);

  const engineZ = Math.min((cowlZ + nose) / 2 - 40, nose - 520);
  push(makePart("engine", spec.engine === 2 ? "V8" : spec.engine === 1 ? "V6" : "Inline-4", { layout: spec.engine, scale: spec.style === "truck" ? 112 : 100 }, identityXform({ y: clearance + railH + 150, z: engineZ })));

  const exhaustFront = engineZ - 180;
  const exhaustRear = tail + 180;
  const exhaustLen = Math.max(1200, exhaustFront - exhaustRear);
  push(
    makePart(
      "exhaust",
      "Exhaust",
      { length: exhaustLen, diameter: spec.style === "truck" ? 70 : 58, muffler: spec.style === "truck" ? 640 : 500, tips: spec.style === "sedan" ? 1 : 2 },
      identityXform({ y: Math.max(40, clearance - 30), z: (exhaustFront + exhaustRear) / 2 }),
    ),
  );

  const hoodFront = nose - 80;
  const hoodRear = cowlZ + 16;
  const hoodLen = hoodFront - hoodRear;
  const hoodFrontY = spec.belt - (spec.style === "truck" ? 50 : 150);
  const hoodRearY = spec.belt + 8;
  push(
    makePart(
      "hood",
      "Hood",
      { length: hoodLen, width: spec.width - 20, rake: hoodRearY - hoodFrontY, crown: spec.style === "truck" ? 12 : 22, thickness: 8 },
      identityXform({ y: (hoodFrontY + hoodRearY) / 2, z: (hoodFront + hoodRear) / 2 }),
      paint,
    ),
  );

  const doorTop = spec.roof - (spec.style === "truck" ? 40 : 70);
  const doorH = doorTop - spec.rocker;
  const doorY = spec.rocker + doorH / 2;
  const windowH = Math.min(doorH * 0.4, Math.max(180, spec.roof - spec.belt - 20));
  const apertureFront = roofFrontZ + (spec.style === "coupe" ? 30 : 10);
  const apertureRear = roofRearZ + (spec.style === "truck" ? 120 : 16);
  const opening = Math.max(700, apertureFront - apertureRear);

  const addDoor = (name: string, length: number, z: number) => {
    const params = { length, height: doorH, window: windowH, bulge: spec.style === "truck" ? 18 : 28, thickness: 6, mirror: 0 };
    push(makePart("door", `${name} right`, params, identityXform({ x: half - 8, y: doorY, z }), paint));
    push(makePart("door", `${name} left`, { ...params, mirror: 1 }, identityXform({ x: -(half - 8), y: doorY, z }), paint));
  };

  if (spec.style === "sedan") {
    const frontLen = opening * 0.5 - 8;
    const rearLen = opening - frontLen - 16;
    addDoor("Front door", frontLen, apertureFront - frontLen / 2);
    addDoor("Rear door", rearLen, apertureFront - frontLen - 16 - rearLen / 2);
  } else {
    const doorLen = Math.min(opening, spec.style === "truck" ? 1280 : opening);
    addDoor("Door", doorLen, apertureFront - doorLen / 2);
  }

  const doorFrontEdge = apertureFront;
  const fenderFront = nose - 90;
  const fenderRear = doorFrontEdge + 10;
  const fenderLen = Math.max(640, fenderFront - fenderRear);
  const fenderZ = (fenderFront + fenderRear) / 2;
  const fenderTop = Math.max(wheelR * 0.25, spec.belt - wheelR + 36);
  const fenderParams = {
    length: fenderLen,
    top: fenderTop,
    arch: wheelR + (spec.style === "truck" ? 40 : 30),
    archZ: frontZ - fenderZ,
    flare: spec.style === "coupe" ? 34 : spec.style === "truck" ? 16 : 18,
    sill: Math.max(-380, spec.rocker - wheelR),
    thickness: 6,
    mirror: 0,
  };
  push(makePart("fender", "Front right fender", fenderParams, identityXform({ x: half - 6, y: wheelR, z: fenderZ }), paint));
  push(makePart("fender", "Front left fender", { ...fenderParams, mirror: 1 }, identityXform({ x: -(half - 6), y: wheelR, z: fenderZ }), paint));

  push(
    makePart(
      "roof",
      "Roof",
      { length: roofLen + 40, width: spec.width * (spec.style === "truck" ? 0.86 : 0.86), crown: spec.style === "truck" ? 16 : 22, thickness: 6 },
      identityXform({ y: spec.roof, z: (roofFrontZ + roofRearZ) / 2 }),
      paint,
    ),
  );

  const windLen = Math.hypot(run, rise);
  push(
    makePart(
      "glass",
      "Windshield",
      { style: 0, mirror: 0, width: spec.width * 0.78, length: windLen, angle: spec.windshield, bulge: spec.style === "truck" ? 4 : 10, thickness: 5 },
      identityXform({ y: (spec.belt + spec.roof) / 2, z: roofFrontZ + run / 2 }),
      glassFinish(),
    ),
  );

  const deckH = spec.style === "truck" ? spec.belt - 60 : spec.belt - 50;
  const rearRise = spec.roof - deckH;
  const rearRun = rearRise / Math.tan((spec.rearGlass * Math.PI) / 180);
  const rearLen = Math.hypot(rearRun, rearRise);
  push(
    makePart(
      "glass",
      "Rear glass",
      { style: 0, mirror: 0, width: spec.width * (spec.style === "truck" ? 0.7 : 0.72), length: rearLen, angle: spec.rearGlass, bulge: 6, thickness: 5 },
      identityXform({ y: (spec.roof + deckH) / 2, z: roofRearZ - rearRun / 2, ry: 180 }),
      glassFinish(),
    ),
  );

  if (spec.style !== "truck") {
    const lastDoorRear = spec.style === "sedan" ? apertureFront - opening : apertureRear;
    const qFront = lastDoorRear - 8;
    const qRear = tail + 200;
    const qLen = Math.max(700, qFront - qRear);
    const qZ = (qFront + qRear) / 2;
    const qParams = {
      length: qLen,
      top: spec.style === "coupe" ? spec.roof - wheelR - 30 : spec.belt - wheelR + 120,
      arch: wheelR + 32,
      archZ: rearZ - qZ,
      flare: spec.style === "coupe" ? 26 : 14,
      sill: Math.max(-420, spec.rocker - wheelR - 20),
      thickness: 6,
      mirror: 0,
    };
    push(makePart("quarter", "Right quarter", qParams, identityXform({ x: half - 6, y: wheelR, z: qZ }), paint));
    push(makePart("quarter", "Left quarter", { ...qParams, mirror: 1 }, identityXform({ x: -(half - 6), y: wheelR, z: qZ }), paint));

    const deckFront = roofRearZ - rearRun + 30;
    const deckRear = tail + 240;
    const deckLen = Math.max(360, deckFront - deckRear);
    push(
      makePart(
        "decklid",
        "Decklid",
        { length: deckLen, width: spec.width - 80, rake: spec.style === "coupe" ? 28 : 12, crown: 12, thickness: 6 },
        identityXform({ y: deckH, z: (deckFront + deckRear) / 2 }),
        paint,
      ),
    );

    const skirtLen = spec.wheelbase * 0.58;
    const skirt = { length: skirtLen, height: spec.style === "coupe" ? 78 : 90, bulge: 16, thickness: 6, mirror: 0 };
    push(makePart("skirt", "Right skirt", skirt, identityXform({ x: half - 4, y: spec.rocker - 10, z: -40 }), black));
    push(makePart("skirt", "Left skirt", { ...skirt, mirror: 1 }, identityXform({ x: -(half - 4), y: spec.rocker - 10, z: -40 }), black));

    push(
      makePart(
        "spoiler",
        "Spoiler",
        {
          span: spec.width * (spec.style === "coupe" ? 0.74 : 0.62),
          chord: spec.style === "coupe" ? 190 : 120,
          rise: spec.style === "coupe" ? 110 : 28,
          attack: spec.style === "coupe" ? 9 : 4,
          endplate: spec.style === "coupe" ? 90 : 0,
          thickness: 14,
        },
        identityXform({ y: deckH + 10, z: deckRear + 40 }),
        black,
      ),
    );
    push(
      makePart(
        "diffuser",
        "Rear diffuser",
        { width: spec.width * 0.62, length: 480, height: spec.style === "coupe" ? 110 : 60, strakes: spec.style === "coupe" ? 5 : 3, angle: spec.style === "coupe" ? 14 : 8 },
        identityXform({ y: 36, z: tail + 280 }),
        black,
      ),
    );
    if (spec.style === "coupe") {
      push(makePart("diffuser", "Front splitter", { width: spec.width * 0.78, length: 280, height: 36, strakes: 0, angle: 2 }, identityXform({ y: 48, z: nose - 180, ry: 180 }), black));
    }
  } else {
    const bedFront = roofRearZ - 40;
    const bedRear = tail + 80;
    const bedLen = bedFront - bedRear;
    const bedZ = (bedFront + bedRear) / 2;
    const floorY = spec.rocker + 30;
    push(
      makePart(
        "bed",
        "Pickup bed",
        { length: bedLen, width: spec.width - 20, side: 520, arch: wheelR * 0.62, archZ: rearZ - bedZ },
        identityXform({ y: floorY, z: bedZ }),
        paint,
      ),
    );
  }

  const bumperH = spec.style === "truck" ? 420 : 320;
  const bumperTop = spec.style === "truck" ? spec.rocker + 520 : hoodFrontY - 210;
  const bumperD = spec.style === "truck" ? 120 : 90;
  push(makePart("bumper", "Front bumper", { width: spec.width - 8, height: bumperH, depth: bumperD, crown: 70, thickness: 14 }, identityXform({ y: bumperTop - bumperH / 2, z: nose - 30 }), paint));
  const rearH = spec.style === "truck" ? 300 : 240;
  const rearTop = spec.style === "truck" ? spec.rocker + 280 : deckH - 20;
  push(makePart("bumper", "Rear bumper", { width: spec.width - 16, height: rearH, depth: bumperD, crown: 50, thickness: 14 }, identityXform({ y: rearTop - rearH / 2, z: tail + 28, ry: 180 }), paint));

  const grilleH = spec.style === "truck" ? 260 : Math.max(120, hoodFrontY - bumperTop - 10);
  push(makePart("grille", "Grille", { width: spec.width * (spec.style === "truck" ? 0.46 : 0.38), height: grilleH, slats: spec.style === "truck" ? 4 : 5, depth: 36 }, identityXform({ y: (bumperTop + hoodFrontY) / 2, z: nose - 6 }), black));

  const lampY = hoodFrontY - (spec.style === "truck" ? 40 : 70);
  const lampX = half - (spec.style === "truck" ? 280 : 250);
  push(makePart("headlight", "Right headlight", { width: spec.style === "truck" ? 260 : 280, height: spec.style === "truck" ? 120 : 90, depth: 80 }, identityXform({ x: lampX, y: lampY, z: nose - 12 })));
  push(makePart("headlight", "Left headlight", { width: spec.style === "truck" ? 260 : 280, height: spec.style === "truck" ? 120 : 90, depth: 80 }, identityXform({ x: -lampX, y: lampY, z: nose - 12 })));
  const tailY = spec.style === "truck" ? spec.rocker + 220 : deckH - 70;
  push(makePart("taillight", "Right taillight", { width: 250, height: 72, depth: 36 }, identityXform({ x: lampX, y: tailY, z: tail + 18, ry: 180 })));
  push(makePart("taillight", "Left taillight", { width: 250, height: 72, depth: 36 }, identityXform({ x: -lampX, y: tailY, z: tail + 18, ry: 180 })));

  const mirrorZ = apertureFront - 70;
  const mirror = { width: 210, height: 100, depth: 110, mirror: 0 };
  push(makePart("mirror", "Right mirror", mirror, identityXform({ x: half + 16, y: spec.belt + 36, z: mirrorZ }), paint));
  push(makePart("mirror", "Left mirror", { ...mirror, mirror: 1 }, identityXform({ x: -(half + 16), y: spec.belt + 36, z: mirrorZ }), paint));

  const seatY = clearance + railH + 8;
  const seatZ = (roofFrontZ + roofRearZ) / 2 - 30;
  push(makePart("seat", "Driver seat", { width: 470, depth: 470, back: spec.style === "truck" ? 820 : 740, bolster: spec.style === "coupe" ? 56 : 36 }, identityXform({ x: -360, y: seatY, z: seatZ }), black));
  push(makePart("seat", "Passenger seat", { width: 470, depth: 470, back: spec.style === "truck" ? 820 : 740, bolster: spec.style === "coupe" ? 56 : 36 }, identityXform({ x: 360, y: seatY, z: seatZ }), black));
  push(makePart("steering", "Steering wheel", { diameter: spec.style === "truck" ? 380 : 350, dish: spec.style === "coupe" ? 36 : 22, spokes: 3 }, identityXform({ x: -340, y: seatY + 310, z: seatZ + 260 })));

  return { name: spec.name, parts };
}
