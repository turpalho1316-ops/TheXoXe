import type { EngineState, KillEvent } from "./engine";

export type KillFeedEntry = KillEvent & { at: number };

type Props = {
  playerName: string;
  state: EngineState;
  killFeed: KillFeedEntry[];
  onUlt: () => void;
  onRetry: () => void;
};

export default function HUD({
  playerName,
  state,
  killFeed,
  onUlt,
  onRetry,
}: Props) {
  const hpPct = Math.max(0, Math.min(1, state.hp / state.maxHp));
  const ultPct = Math.max(0, Math.min(1, state.ultCharge));
  const ultReady = state.ultReady;

  const hpColor = (() => {
    const RED: [number, number, number] = [255, 84, 84];
    const YELLOW: [number, number, number] = [255, 220, 80];
    const GREEN: [number, number, number] = [124, 232, 113];
    const lerp = (
      a: [number, number, number],
      b: [number, number, number],
      t: number,
    ) =>
      [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
      ] as [number, number, number];
    const mid =
      hpPct >= 0.5
        ? lerp(YELLOW, GREEN, (hpPct - 0.5) * 2)
        : lerp(RED, YELLOW, hpPct * 2);
    const top = lerp(mid, [255, 255, 255], 0.18);
    const bot = lerp(mid, [0, 0, 0], 0.32);
    return `linear-gradient(180deg, rgb(${top.join(",")}), rgb(${bot.join(
      ",",
    )}))`;
  })();

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 18,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(10, 18, 26, 0.78)",
          border: "2px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "8px 14px 8px 8px",
          zIndex: 20,
          boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg, #3aa3ff 0%, #1d63b4 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 900,
            fontSize: 22,
            border: "2px solid rgba(255,255,255,0.25)",
          }}
        >
          {playerName.charAt(0).toUpperCase() || "P"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1,
            }}
          >
            {playerName}
          </div>
          <div
            style={{
              width: 130,
              height: 8,
              borderRadius: 5,
              background: "rgba(0,0,0,0.55)",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                width: `${hpPct * 100}%`,
                height: "100%",
                background: hpColor,
                transition: "width 120ms ease, background 120ms ease",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 600,
            }}
          >
            HP {Math.ceil(state.hp)} / {state.maxHp}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 18,
          right: 18,
          background: "rgba(10, 18, 26, 0.78)",
          border: "2px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "10px 16px",
          zIndex: 20,
          boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
          pointerEvents: "none",
          color: "#fff",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.65)",
            fontWeight: 700,
          }}
        >
          ПОБЕЖДЕНО
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            lineHeight: 1.2,
          }}
        >
          {state.kills} / {state.killGoal}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 22,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
          background: "rgba(10, 18, 26, 0.78)",
          padding: "10px 14px",
          borderRadius: 14,
          border: "2px solid rgba(255,255,255,0.08)",
          zIndex: 20,
          pointerEvents: "none",
          boxShadow: "0 6px 16px rgba(0,0,0,0.45)",
        }}
      >
        {state.reload.map((r, i) => {
          const ready = i < state.bullets;
          return (
            <div
              key={i}
              style={{
                width: 70,
                height: 12,
                borderRadius: 6,
                background: "rgba(0,0,0,0.5)",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.12)",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: `${Math.min(1, ready ? 1 : r) * 100}%`,
                  height: "100%",
                  background: ready
                    ? "linear-gradient(180deg, #ffe066 0%, #ffaa00 100%)"
                    : "linear-gradient(180deg, #5a8ad8 0%, #3a5fa8 100%)",
                  transition: "width 90ms linear",
                }}
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onUlt}
        className="hud-button"
        disabled={!ultReady || state.status !== "playing"}
        style={{
          position: "absolute",
          right: 38,
          bottom: 200,
          width: 86,
          height: 86,
          borderRadius: "50%",
          border: ultReady
            ? "4px solid #fff8a0"
            : "3px solid rgba(255,255,255,0.18)",
          background: ultReady
            ? "radial-gradient(circle at 35% 30%, #fff7a8 0%, #ffd83a 45%, #c98800 100%)"
            : "rgba(40, 40, 50, 0.7)",
          boxShadow: ultReady
            ? "0 0 28px rgba(255, 220, 60, 0.85), 0 0 0 6px rgba(255,220,60,0.18)"
            : "0 6px 14px rgba(0,0,0,0.5)",
          cursor: ultReady ? "pointer" : "default",
          color: ultReady ? "#3a2400" : "rgba(255,255,255,0.55)",
          fontWeight: 900,
          fontSize: 26,
          letterSpacing: "0.05em",
          touchAction: "manipulation",
          pointerEvents: "auto",
          zIndex: 15,
          overflow: "hidden",
          padding: 0,
          animation: ultReady ? "ultPulse 0.9s ease-in-out infinite" : "none",
          transition: "background 200ms ease, box-shadow 200ms ease",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
            textShadow: ultReady ? "0 1px 0 rgba(255,255,255,0.45)" : "none",
          }}
        >
          ULT
        </div>
        {!ultReady && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: `${ultPct * 100}%`,
              background:
                "linear-gradient(0deg, rgba(255,210,80,0.85) 0%, rgba(255,180,40,0.55) 100%)",
              transition: "height 120ms ease",
              zIndex: 1,
            }}
          />
        )}
      </button>

      <div
        style={{
          position: "absolute",
          top: 92,
          left: 18,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          zIndex: 25,
          pointerEvents: "none",
          maxWidth: 320,
        }}
      >
        {killFeed.map((e) => (
          <div
            key={e.id}
            style={{
              background: "rgba(8, 14, 22, 0.78)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              padding: "6px 12px",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "0.02em",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 6px 14px rgba(0,0,0,0.45)",
              animation:
                "killFeedIn 240ms ease-out, killFeedOut 360ms ease-in 2.14s forwards",
              textShadow: "0 1px 0 rgba(0,0,0,0.7)",
            }}
          >
            <span
              style={{
                color: "#7adcff",
                maxWidth: 110,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {e.killer}
            </span>
            <span style={{ color: "#ffe066", fontSize: 16, lineHeight: 1 }}>
              →
            </span>
            <span
              style={{
                color: "#ff8a8a",
                maxWidth: 110,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {e.victim}
            </span>
          </div>
        ))}
      </div>

      {(state.inBush || state.damageBoostMs > 0) && (
        <div
          style={{
            position: "absolute",
            top: 90,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 8,
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          {state.inBush && (
            <div
              style={{
                background: "rgba(20, 60, 30, 0.85)",
                color: "#a8ffb1",
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: "0.08em",
                padding: "6px 12px",
                borderRadius: 10,
                border: "1px solid rgba(168,255,177,0.3)",
                textShadow: "0 1px 0 rgba(0,0,0,0.6)",
              }}
            >
              В КУСТАХ
            </div>
          )}
          {state.damageBoostMs > 0 && (
            <div
              style={{
                background: "rgba(80, 30, 10, 0.85)",
                color: "#ffc591",
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: "0.08em",
                padding: "6px 12px",
                borderRadius: 10,
                border: "1px solid rgba(255,197,145,0.35)",
                textShadow: "0 1px 0 rgba(0,0,0,0.6)",
              }}
            >
              +УРОН {(state.damageBoostMs / 1000).toFixed(1)}с
            </div>
          )}
        </div>
      )}

      {state.status !== "playing" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              state.status === "victory"
                ? "radial-gradient(circle at 50% 35%, rgba(255,200,40,0.35) 0%, rgba(0,0,0,0.78) 65%)"
                : "radial-gradient(circle at 50% 35%, rgba(180,30,30,0.35) 0%, rgba(0,0,0,0.82) 65%)",
            zIndex: 40,
            pointerEvents: "auto",
            flexDirection: "column",
            gap: 28,
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              letterSpacing: "0.12em",
              color: state.status === "victory" ? "#ffe066" : "#ff5d5d",
              textShadow:
                state.status === "victory"
                  ? "0 6px 0 rgba(0,0,0,0.55), 0 0 50px rgba(255,210,80,0.55)"
                  : "0 6px 0 rgba(0,0,0,0.55), 0 0 40px rgba(255,90,90,0.5)",
              transform: "scale(1)",
              animation: "popIn 0.5s ease-out",
            }}
          >
            {state.status === "victory" ? "VICTORY" : "DEFEATED"}
          </div>
          <div
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.85)",
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            {state.status === "victory"
              ? `Ты разобрал противника ${state.kills} раз!`
              : "Не повезло. Реванш?"}
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="hud-button"
            style={{
              padding: "16px 48px",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "0.12em",
              color: "#1a0d00",
              background: "linear-gradient(180deg, #ffd17a 0%, #ff8a1f 100%)",
              border: "3px solid rgba(255,255,255,0.35)",
              borderRadius: 14,
              cursor: "pointer",
              boxShadow:
                "0 8px 0 rgba(0,0,0,0.45), 0 14px 30px rgba(0,0,0,0.55)",
              pointerEvents: "auto",
              touchAction: "manipulation",
            }}
          >
            RETRY
          </button>
        </div>
      )}

      <style>
        {`
          @keyframes ultPulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 22px rgba(255,220,60,0.7), 0 0 0 4px rgba(255,220,60,0.18); }
            50% { transform: scale(1.07); box-shadow: 0 0 38px rgba(255,220,60,1), 0 0 0 10px rgba(255,220,60,0.28); }
          }
          @keyframes popIn {
            0% { transform: scale(0.6); opacity: 0; }
            70% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes killFeedIn {
            from { opacity: 0; transform: translateX(-14px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes killFeedOut {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(-14px); }
          }
        `}
      </style>
    </>
  );
}
