import { useState } from "react";
import type { MapType } from "./types";
import {
  PLAYER_SKINS,
  WOLF_SKINS,
  type SaveData,
} from "./save";

type Props = {
  onStart: (name: string, map: MapType) => void;
  save: SaveData;
  onBuyPlayer: (id: string) => void;
  onBuyWolf: (id: string) => void;
  onEquipPlayer: (id: string) => void;
  onEquipWolf: (id: string) => void;
};

type Tab = "play" | "skins" | "wolf";

export default function LoginScreen({
  onStart,
  save,
  onBuyPlayer,
  onBuyWolf,
  onEquipPlayer,
  onEquipWolf,
}: Props) {
  const [name, setName] = useState("");
  const [map, setMap] = useState<MapType>("day");
  const [tab, setTab] = useState<Tab>("play");

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
        justifyContent: "flex-start",
        padding: "16px 16px 20px",
        background:
          "radial-gradient(ellipse at center, rgba(20,40,60,0.88) 0%, rgba(8,12,18,0.97) 75%)",
        backdropFilter: "blur(3px)",
        overflowY: "auto",
      }}
    >
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div
          style={{
            fontSize: "clamp(36px, 6vw, 60px)",
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
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.65)",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            marginTop: 2,
          }}
        >
          Battle Arena
        </div>
      </div>

      {/* Top bar: coins + level */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            background: "rgba(10, 18, 26, 0.82)",
            border: "2px solid rgba(255, 208, 60, 0.35)",
            borderRadius: 12,
            padding: "6px 14px",
            color: "#ffe066",
            fontSize: 15,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>🪙</span>
          <span>{save.coins}</span>
        </div>
        <div
          style={{
            background: "rgba(10, 18, 26, 0.82)",
            border: "2px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "6px 14px",
            color: "#fff",
            fontSize: 15,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>⭐</span>
          <span>Ур. {save.level}</span>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 12,
          background: "rgba(10, 18, 26, 0.6)",
          padding: 4,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {(
          [
            { id: "play", label: "В бой" },
            { id: "skins", label: "Скины" },
            { id: "wolf", label: "Волк" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background:
                tab === t.id
                  ? "linear-gradient(180deg, #ffb53a 0%, #ff7a18 100%)"
                  : "transparent",
              color: tab === t.id ? "#3a1700" : "rgba(255,255,255,0.75)",
              border: "none",
              borderRadius: 9,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: "0.05em",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 140ms ease",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "play" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            width: "min(360px, 90vw)",
            alignItems: "stretch",
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

          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(255,255,255,0.65)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginTop: 4,
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
                padding: "12px 8px",
                borderRadius: 10,
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
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ☀ День
            </button>
            <button
              type="button"
              onClick={() => setMap("night")}
              style={{
                flex: 1,
                padding: "12px 8px",
                borderRadius: 10,
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
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              🌙 Ночь
            </button>
          </div>

          <button
            type="button"
            onClick={submit}
            style={{
              marginTop: 10,
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
      )}

      {tab === "skins" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
            width: "min(520px, 95vw)",
            paddingBottom: 20,
          }}
        >
          {PLAYER_SKINS.map((skin) => {
            const owned = save.ownedPlayerSkins.includes(skin.id);
            const equipped = save.currentPlayerSkin === skin.id;
            const canBuy = save.coins >= skin.price;
            return (
              <div
                key={skin.id}
                style={{
                  background: "rgba(10, 18, 26, 0.85)",
                  border: equipped
                    ? "2px solid #ffd54a"
                    : "2px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  boxShadow: equipped
                    ? "0 0 18px rgba(255,213,74,0.35)"
                    : "0 6px 14px rgba(0,0,0,0.4)",
                }}
              >
                <div
                  style={{
                    height: 68,
                    borderRadius: 10,
                    background: `linear-gradient(180deg, ${skin.previewColor}44 0%, ${skin.previewColor}11 100%)`,
                    border: `2px solid ${skin.previewColor}88`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    fontWeight: 900,
                    color: "#fff",
                    textShadow: "0 2px 6px rgba(0,0,0,0.6)",
                  }}
                >
                  3D
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: "#fff",
                    textAlign: "center",
                  }}
                >
                  {skin.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: equipped
                      ? "#a8ffb1"
                      : owned
                        ? "rgba(255,255,255,0.65)"
                        : canBuy
                          ? "#ffe066"
                          : "rgba(255,120,120,0.85)",
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                >
                  {equipped
                    ? "✓ Надет"
                    : owned
                      ? "Куплен"
                      : `🪙 ${skin.price}`}
                </div>
                <button
                  onClick={() => {
                    if (equipped) return;
                    if (owned) {
                      onEquipPlayer(skin.id);
                    } else {
                      onBuyPlayer(skin.id);
                    }
                  }}
                  disabled={equipped || (!owned && !canBuy)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: equipped
                      ? "rgba(80,80,80,0.5)"
                      : owned
                        ? "linear-gradient(180deg, #a8e6a8 0%, #55c255 100%)"
                        : canBuy
                          ? "linear-gradient(180deg, #ffd17a 0%, #ff8a1f 100%)"
                          : "rgba(60,60,70,0.6)",
                    color: equipped
                      ? "rgba(255,255,255,0.5)"
                      : owned
                        ? "#0d3a0d"
                        : canBuy
                          ? "#3a1700"
                          : "rgba(255,255,255,0.4)",
                    fontWeight: 900,
                    fontSize: 13,
                    letterSpacing: "0.06em",
                    cursor:
                      equipped || (!owned && !canBuy) ? "default" : "pointer",
                    fontFamily: "inherit",
                    textTransform: "uppercase",
                  }}
                >
                  {equipped
                    ? "Надет"
                    : owned
                      ? "Надеть"
                      : canBuy
                        ? "Купить"
                        : "Не хватает"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "wolf" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
            width: "min(520px, 95vw)",
            paddingBottom: 20,
          }}
        >
          {WOLF_SKINS.map((skin) => {
            const owned = save.ownedWolfSkins.includes(skin.id);
            const equipped = save.currentWolfSkin === skin.id;
            const canBuy = save.coins >= skin.price;
            return (
              <div
                key={skin.id}
                style={{
                  background: "rgba(10, 18, 26, 0.85)",
                  border: equipped
                    ? "2px solid #ffd54a"
                    : "2px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  boxShadow: equipped
                    ? "0 0 18px rgba(255,213,74,0.35)"
                    : "0 6px 14px rgba(0,0,0,0.4)",
                }}
              >
                <div
                  style={{
                    height: 68,
                    borderRadius: 10,
                    background: `linear-gradient(180deg, ${skin.previewColor}44 0%, ${skin.previewColor}11 100%)`,
                    border: `2px solid ${skin.previewColor}88`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                  }}
                >
                  🐺
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: "#fff",
                    textAlign: "center",
                  }}
                >
                  {skin.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: equipped
                      ? "#a8ffb1"
                      : owned
                        ? "rgba(255,255,255,0.65)"
                        : canBuy
                          ? "#ffe066"
                          : "rgba(255,120,120,0.85)",
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                >
                  {equipped
                    ? "✓ Надет"
                    : owned
                      ? "Куплен"
                      : `🪙 ${skin.price}`}
                </div>
                <button
                  onClick={() => {
                    if (equipped) return;
                    if (owned) {
                      onEquipWolf(skin.id);
                    } else {
                      onBuyWolf(skin.id);
                    }
                  }}
                  disabled={equipped || (!owned && !canBuy)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: equipped
                      ? "rgba(80,80,80,0.5)"
                      : owned
                        ? "linear-gradient(180deg, #a8e6a8 0%, #55c255 100%)"
                        : canBuy
                          ? "linear-gradient(180deg, #ffd17a 0%, #ff8a1f 100%)"
                          : "rgba(60,60,70,0.6)",
                    color: equipped
                      ? "rgba(255,255,255,0.5)"
                      : owned
                        ? "#0d3a0d"
                        : canBuy
                          ? "#3a1700"
                          : "rgba(255,255,255,0.4)",
                    fontWeight: 900,
                    fontSize: 13,
                    letterSpacing: "0.06em",
                    cursor:
                      equipped || (!owned && !canBuy) ? "default" : "pointer",
                    fontFamily: "inherit",
                    textTransform: "uppercase",
                  }}
                >
                  {equipped
                    ? "Надет"
                    : owned
                      ? "Надеть"
                      : canBuy
                        ? "Купить"
                        : "Не хватает"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
