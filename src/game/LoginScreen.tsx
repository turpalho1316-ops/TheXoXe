import { useState } from "react";
import type { MapType } from "./types";

type Props = {
  onStart: (name: string, map: MapType) => void;
};

export default function LoginScreen({ onStart }: Props) {
  const [name, setName] = useState("");
  const [map, setMap] = useState<MapType>("day");

  const submit = () => {
    const trimmed = name.trim() || "Player";
    onStart(trimmed, map);
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: "20px",
        background:
          "radial-gradient(ellipse at center, rgba(20,40,60,0.88) 0%, rgba(8,12,18,0.97) 75%)",
        backdropFilter: "blur(3px)",
        overflowY: "auto",
      }}
    >
      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: "clamp(40px, 7vw, 72px)",
            fontWeight: 900,
            letterSpacing: "0.06em",
            background:
              "linear-gradient(180deg, #fff7c2 0%, #ffb53a 60%, #c75200 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 4px 0 rgba(0,0,0,0.25)",
            lineHeight: 1,
          }}
        >
          XoXe
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.75)",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
          }}
        >
          Battle Arena
        </div>
      </div>

      {/* Nickname */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          width: "min(340px, 80vw)",
        }}
      >
        <label
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.65)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Никнейм
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Введи имя"
          maxLength={16}
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "2px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#fff",
            fontSize: 16,
            fontWeight: 600,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Map selection */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          width: "min(340px, 80vw)",
        }}
      >
        <label
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.65)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Карта
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => setMap("day")}
            style={{
              flex: 1,
              padding: "14px 8px",
              borderRadius: 12,
              border:
                map === "day"
                  ? "3px solid #ffd54a"
                  : "2px solid rgba(255,255,255,0.12)",
              background:
                map === "day"
                  ? "linear-gradient(180deg, #ffe089 0%, #f0a520 100%)"
                  : "rgba(30,40,55,0.7)",
              color: map === "day" ? "#3a2400" : "#fff",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow:
                map === "day"
                  ? "0 0 18px rgba(255,213,74,0.55), 0 4px 0 rgba(0,0,0,0.35)"
                  : "none",
              transition: "all 120ms ease",
            }}
          >
            ☀ День
          </button>
          <button
            type="button"
            onClick={() => setMap("night")}
            style={{
              flex: 1,
              padding: "14px 8px",
              borderRadius: 12,
              border:
                map === "night"
                  ? "3px solid #6cb8ff"
                  : "2px solid rgba(255,255,255,0.12)",
              background:
                map === "night"
                  ? "linear-gradient(180deg, #2a4a7a 0%, #16294a 100%)"
                  : "rgba(30,40,55,0.7)",
              color: map === "night" ? "#e8f3ff" : "#fff",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow:
                map === "night"
                  ? "0 0 18px rgba(108,184,255,0.55), 0 4px 0 rgba(0,0,0,0.35)"
                  : "none",
              transition: "all 120ms ease",
            }}
          >
            🌙 Ночь
          </button>
        </div>
      </div>

      {/* Start button */}
      <button
        type="button"
        onClick={submit}
        style={{
          marginTop: 6,
          width: "min(340px, 80vw)",
          padding: "14px 24px",
          border: "none",
          borderRadius: 12,
          background: "linear-gradient(180deg, #ffb53a 0%, #ff7a18 100%)",
          color: "#3a1700",
          fontSize: 20,
          fontWeight: 900,
          letterSpacing: "0.12em",
          cursor: "pointer",
          textTransform: "uppercase",
          boxShadow:
            "0 5px 0 #b14600, 0 10px 22px rgba(255,140,30,0.45)",
          fontFamily: "inherit",
        }}
      >
        В бой
      </button>
    </div>
  );
}
