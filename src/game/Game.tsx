import { useEffect, useRef, useState } from "react";
import nipplejs from "nipplejs";
import { Engine, type EngineState } from "./engine";
import LoginScreen from "./LoginScreen";
import HUD, { type KillFeedEntry } from "./HUD";

const KILL_FEED_TTL_MS = 2500;

type NippleManager = ReturnType<typeof nipplejs.create>;
type NippleEvent = {
  type: string;
  data?: {
    vector?: { x: number; y: number };
    force?: number;
    angle?: { radian: number; degree: number };
  };
};

export default function Game() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leftZoneRef = useRef<HTMLDivElement | null>(null);
  const rightZoneRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const leftJoyRef = useRef<NippleManager | null>(null);
  const rightJoyRef = useRef<NippleManager | null>(null);
  const killTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const [started, setStarted] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);
  const [hudState, setHudState] = useState<EngineState>({
    hp: 1000,
    maxHp: 1000,
    reload: [1, 1, 1],
    ammoMax: 3,
    bullets: 3,
    destroyed: false,
    inBush: false,
    damageBoostMs: 0,
    ultCharge: 0,
    ultReady: false,
    kills: 0,
    killGoal: 3,
    status: "playing",
  });

  const handleUlt = () => engineRef.current?.useUlt();
  const handleRetry = () => {
    for (const t of killTimersRef.current) clearTimeout(t);
    killTimersRef.current.clear();
    setKillFeed([]);
    engineRef.current?.restart();
  };

  useEffect(() => {
    if (!started) return;
    if (!containerRef.current) return;

    const engine = new Engine(containerRef.current, playerName, {
      onStateChange: (s) => setHudState(s),
      onKill: (ev) => {
        const at = performance.now();
        setKillFeed((prev) => [...prev, { ...ev, at }]);
        const timer = setTimeout(() => {
          killTimersRef.current.delete(timer);
          setKillFeed((prev) => prev.filter((e) => e.id !== ev.id));
        }, KILL_FEED_TTL_MS + 600);
        killTimersRef.current.add(timer);
      },
    });
    engineRef.current = engine;
    engine.start();

    const leftZone = leftZoneRef.current!;
    const rightZone = rightZoneRef.current!;

    const leftJoy = nipplejs.create({
      zone: leftZone,
      mode: "static",
      position: { left: "50%", top: "50%" },
      color: "#ffffff",
      size: 90,
      restOpacity: 0.45,
    });
    leftJoyRef.current = leftJoy;

    const rightJoy = nipplejs.create({
      zone: rightZone,
      mode: "static",
      position: { left: "50%", top: "50%" },
      color: "#ff7070",
      size: 90,
      restOpacity: 0.45,
    });
    rightJoyRef.current = rightJoy;

    const handleLeftMove = (evt: NippleEvent) => {
      const v = evt?.data?.vector;
      if (!v) return;
      engine.setMoveInput(v.x, v.y);
    };
    const handleLeftEnd = () => engine.setMoveInput(0, 0);

    const handleRightMove = (evt: NippleEvent) => {
      const v = evt?.data?.vector;
      if (!v) return;
      engine.setAimInput(v.x, v.y, true);
    };
    const handleRightStart = () => engine.setAimInput(0, 0, true);
    const handleRightEnd = () => engine.releaseAim();

    const lj = leftJoy as unknown as {
      on: (ev: string, fn: (evt: NippleEvent) => void) => void;
    };
    const rj = rightJoy as unknown as {
      on: (ev: string, fn: (evt: NippleEvent) => void) => void;
    };
    lj.on("move", handleLeftMove);
    lj.on("end", handleLeftEnd);
    rj.on("start", handleRightStart);
    rj.on("move", handleRightMove);
    rj.on("end", handleRightEnd);

    return () => {
      leftJoy.destroy();
      rightJoy.destroy();
      engine.dispose();
      engineRef.current = null;
      for (const t of killTimersRef.current) clearTimeout(t);
      killTimersRef.current.clear();
    };
  }, [started, playerName]);

  const handleStart = (name: string) => {
    setPlayerName(name);
    setStarted(true);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "#0d1418",
      }}
    >
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      {started && (
        <HUD
          playerName={playerName}
          state={hudState}
          killFeed={killFeed}
          onUlt={handleUlt}
          onRetry={handleRetry}
        />
      )}

      <div
        ref={leftZoneRef}
        className="joystick-zone"
        style={{
          position: "absolute",
          left: 20,
          bottom: 20,
          width: 130,
          height: 130,
          touchAction: "none",
          opacity: started ? 1 : 0,
          pointerEvents: started ? "auto" : "none",
          zIndex: 10,
        }}
      />
      <div
        ref={rightZoneRef}
        className="joystick-zone"
        style={{
          position: "absolute",
          right: 20,
          bottom: 20,
          width: 130,
          height: 130,
          touchAction: "none",
          opacity: started ? 1 : 0,
          pointerEvents: started ? "auto" : "none",
          zIndex: 10,
        }}
      />

      {!started && <LoginScreen onStart={handleStart} />}
    </div>
  );
}
