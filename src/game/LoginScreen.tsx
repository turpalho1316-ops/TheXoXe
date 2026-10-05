import { useState } from "react";

type Props = {
  onStart: (name: string) => void;
};

export default function LoginScreen({ onStart }: Props) {
  const [name, setName] = useState("");

  const submit = () => {
    const trimmed = name.trim() || "Player";
    onStart(trimmed);
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
        gap: 28,
        background:
          "radial-gradient(ellipse at center, rgba(20,40,60,0.85) 0%, rgba(8,12,18,0.96) 75%)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: "clamp(56px, 12vw, 120px)",
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
            marginTop: 12,
            fontSize: 18,
            fontWeight: 600,
            color: "rgba(255,255,255,0.75)",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
          }}
        >
          Battle Arena
        </div>
      </div>

      <div
        style={{
          background: "rgba(15, 25, 35, 0.88)",
          border: "2px solid rgba(255,255,255,0.08)",
          borderRadius: 18,
          padding: 28,
          width: "min(380px, 90vw)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
        }}
      >
        <label
          style={{
            fontSize: 13,
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
            borderRadius: 12,
            padding: "14px 16px",
            color: "#fff",
            fontSize: 18,
            fontWeight: 600,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={submit}
          style={{
            background: "linear-gradient(180deg, #ffb53a 0%, #ff7a18 100%)",
            border: "none",
            borderRadius: 14,
            padding: "16px 24px",
            color: "#3a1700",
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "0.1em",
            cursor: "pointer",
            textTransform: "uppercase",
            boxShadow:
              "0 6px 0 #b14600, 0 10px 24px rgba(255,140,30,0.4)",
            transition: "transform 80ms ease",
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform =
              "translateY(3px)";
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform =
              "translateY(0)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform =
              "translateY(0)";
          }}
        >
          В Бой
        </button>
      </div>

      <div
        style={{
          textAlign: "center",
          fontSize: 13,
          color: "rgba(255,255,255,0.55)",
          maxWidth: 420,
          lineHeight: 1.6,
          padding: "0 16px",
        }}
      >
        <div>
          <b style={{ color: "#fff" }}>ПК:</b> WASD — движение, ЛКМ удерживай
          для прицела, отпусти — выстрел.
        </div>
        <div>
          <b style={{ color: "#fff" }}>Моб.:</b> левый стик — ходьба, правый
          стик — прицел и выстрел.
        </div>
      </div>
    </div>
  );
}
