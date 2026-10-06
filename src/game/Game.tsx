import { useEffect, useRef, useState, useCallback } from "react";
import nipplejs from "nipplejs";
import { Engine, type EngineState } from "./engine";
import LoginScreen from "./LoginScreen";
import HUD, { type KillFeedEntry } from "./HUD";
import type { MapType } from "./types";
import {
  loadSave,
  saveGame,
  addRewards,
  progressMission,
  buyPlayerSkin,
  buyWolfSkin,
  equipPlayerSkin,
  equipWolfSkin,
  getPlayerSkin,
  getWolfSkin,
  xpToNextLevel,
  type SaveData,
} from "./save";
import {
  COINS_PER_KILL,
  COINS_PER_WIN,
  XP_PER_KILL,
  XP_PER_WIN,
} from "./config";

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
  const saveRef = useRef<SaveData>(loadSave());
  const statsRef = useRef({ killsThisMatch: 0, petKillsThisMatch: 0 });
  const rewardedRef = useRef(false);

  const [started, setStarted] = useState(false);
  const [playerName, setPlayerName] = useState(saveRef.current.playerName);
  const [mapType, setMapType] = useState<MapType>("day");
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);
  const [save, setSave] = useState<SaveData>(saveRef.current);
  const [hudState, setHudState] = useState<EngineState>({
    hp: 9000,
    maxHp: 9000,
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

  const persist = useCallback((data: SaveData) => {
    saveRef.current = data;
    setSave(data);
    saveGame(data);
  }, []);

  const handleUlt = () => engineRef.current?.useUlt();

  const handleRetry = () => {
    for (const t of killTimersRef.current) clearTimeout(t);
    killTimersRef.current.clear();
    setKillFeed([]);
    statsRef.current.killsThisMatch = 0;
    statsRef.current.petKillsThisMatch = 0;
    rewardedRef.current = false;
    engineRef.current?.restart();
  };

  const handleExitToMenu = () => {
    for (const t of killTimersRef.current) clearTimeout(t);
    killTimersRef.current.clear();
    setKillFeed([]);
    statsRef.current.killsThisMatch = 0;
    statsRef.current.petKillsThisMatch = 0;
    rewardedRef.current = false;
    setStarted(false);
  };

  useEffect(() => {
    if (!started) return;
    if (!containerRef.current) return;

    rewardedRef.current = false;

    const playerSkin = getPlayerSkin(saveRef.current.currentPlayerSkin);
    const wolfSkin = getWolfSkin(saveRef.current.currentWolfSkin);

    const engine = new Engine(
      containerRef.current,
      playerName,
      mapType,
      playerSkin.glbPath,
      wolfSkin.id,
      {
        onStateChange: (s) => {
          setHudState(s);
          if (s.status === "victory" && !rewardedRef.current) {
            rewardedRef.current = true;
            const finalKills = statsRef.current.killsThisMatch;
            const petKills = statsRef.current.petKillsThisMatch;
            let data = saveRef.current;
            data = addRewards(
              data,
              finalKills * COINS_PER_KILL + COINS_PER_WIN,
              finalKills * XP_PER_KILL + XP_PER_WIN,
            );
            const winRes = progressMission(data, "wins", 1);
            data = winRes.data;
            if (mapType === "night") {
              const nr = progressMission(data, "nightWins", 1);
              data = nr.data;
            }
            if (petKills > 0) {
              const pr = progressMission(data, "petKills", petKills);
              data = pr.data;
            }
            persist(data);
          }
          if (s.status === "defeat" && !rewardedRef.current) {
            rewardedRef.current = true;
          }
        },
        onKill: (ev) => {
          const at = performance.now();
          setKillFeed((prev) => [...prev, { ...ev, at }]);
          const timer = setTimeout(() => {
            killTimersRef.current.delete(timer);
            setKillFeed((prev) => prev.filter((e) => e.id !== ev.id));
          }, KILL_FEED_TTL_MS + 600);
          killTimersRef.current.add(timer);

          if (ev.killer === playerName) {
            statsRef.current.killsThisMatch += 1;
          } else if (ev.killer === "Волк") {
            statsRef.current.petKillsThisMatch += 1;
          }
          const kr = progressMission(saveRef.current, "kills", 1);
          persist(kr.data);
        },
      },
    );
    engineRef.current = engine;
    engine.start();

    const leftZone = leftZoneRef.current!;
    const rightZone = rightZoneRef.current!;

    const leftJoy = nipplejs.create({
      zone: leftZone,
      mode: "static",
      position: { left: "50%", top: "50%" },
      color: "#ffffff",
      size: 75,
      restOpacity: 0.4,
    });
    leftJoyRef.current = leftJoy;

    const rightJoy = nipplejs.create({
      zone: rightZone,
      mode: "static",
      position: { left: "50%", top: "50%" },
      color: "#ff7070",
      size: 75,
      restOpacity: 0.4,
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
  }, [started, playerName, mapType, persist]);

  const handleStart = (name: string, map: MapType) => {
    setPlayerName(name);
    setMapType(map);
    statsRef.current.killsThisMatch = 0;
    statsRef.current.petKillsThisMatch = 0;
    rewardedRef.current = false;
    // Persist the player name for next sessions
    if (saveRef.current.playerName !== name) {
      const next: SaveData = { ...saveRef.current, playerName: name };
      persist(next);
    }
    setStarted(true);
  };

  const handleBuyPlayer = (id: string) => {
    const next = buyPlayerSkin(saveRef.current, id);
    if (next) persist(next);
  };
  const handleBuyWolf = (id: string) => {
    const next = buyWolfSkin(saveRef.current, id);
    if (next) persist(next);
  };
  const handleEquipPlayer = (id: string) => {
    persist(equipPlayerSkin(saveRef.current, id));
  };
  const handleEquipWolf = (id: string) => {
    persist(equipWolfSkin(saveRef.current, id));
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
          onExit={handleExitToMenu}
          coins={save.coins}
          level={save.level}
          xp={save.xp}
          xpMax={xpToNextLevel(save.level)}
        />
      )}

      <div
        ref={leftZoneRef}
        className="joystick-zone"
        style={{
          position: "absolute",
          left: 16,
          bottom: 16,
          width: 110,
          height: 110,
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
          right: 16,
          bottom: 16,
          width: 110,
          height: 110,
          touchAction: "none",
          opacity: started ? 1 : 0,
          pointerEvents: started ? "auto" : "none",
          zIndex: 10,
        }}
      />

      {!started && (
        <LoginScreen
          onStart={handleStart}
          save={save}
          onBuyPlayer={handleBuyPlayer}
          onBuyWolf={handleBuyWolf}
          onEquipPlayer={handleEquipPlayer}
          onEquipWolf={handleEquipWolf}
        />
      )}
    </div>
  );
}
