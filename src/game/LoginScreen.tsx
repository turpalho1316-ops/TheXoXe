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
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        padding: "10px 30px",
        background:
          "radial-gradient(ellipse at center, rgba(20,40,60,0.85) 0%, rgba(8,12,18,0.96) 75%)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <div
          style={{
            fontSize: "clamp(48px, 8vw, 96px)",
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
            marginTop: 8,
            fontSize: 14,
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
          borderRadius: 16,
          padding: "18px 22px",
          width: "min(360px, 60vw)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxShadow: "0 20px 50px rgba(0,0,0,0.55)",
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
        <button
          onClick={submit}
          style={{
            background: "linear-gradient(180deg, #ffb53a 0%, #ff7a18 100%)",
            border: "none",
            borderRadius: 12,
            padding: "12px 20px",
            color: "#3a1700",
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: "0.1em",
            cursor: "pointer",
            textTransform: "uppercase",
            boxShadow:
              "0 5px 0 #b14600, 0 8px 20px rgba(255,140,30,0.4)",
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
    </div>
  );
}
