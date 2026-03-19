import React, { useState } from "react";
import { signIn, signUp } from "../lib/auth.js";

const C = {
  navy: "#0d1f3c", blue: "#1d4ed8", blueLight: "#eff6ff",
  green: "#15803d", red: "#b91c1c", gray: "#64748b",
  border: "#e2e8f0", textLight: "#94a3b8",
};

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        if (!fullName.trim()) throw new Error("Introduce tu nombre completo");
        if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");
        await signUp(email, password, fullName);
        setRegistered(true);
      } else {
        const data = await signIn(email, password);
        onLogin(data.session);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (registered) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 48, textAlign: "center", marginBottom: 16 }}>✉️</div>
          <h2 style={{ color: C.navy, textAlign: "center", marginBottom: 8 }}>Revisa tu email</h2>
          <p style={{ color: C.gray, textAlign: "center", fontSize: 14, lineHeight: 1.6 }}>
            Hemos enviado un enlace de confirmacion a <strong>{email}</strong>.
            Haz clic en el enlace para activar tu cuenta y luego vuelve aqui para iniciar sesion.
          </p>
          <button onClick={() => { setRegistered(false); setMode("login"); }} style={styles.linkBtn}>
            ← Volver al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo / Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.15em", color: C.blue, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>ALANA IT</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.navy, margin: 0 }}>Onboarding Tecnico</h1>
          <p style={{ color: C.textLight, fontSize: 13, marginTop: 6 }}>
            {mode === "login" ? "Inicia sesion para continuar" : "Crea tu cuenta"}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.red }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "register" && (
            <div>
              <label style={styles.label}>Nombre completo</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ej: Juan Garcia"
                required
                style={styles.input}
              />
            </div>
          )}
          <div>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu.nombre@alanait.com"
              required
              style={styles.input}
            />
            {mode === "register" && (
              <div style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>Solo emails @alanait.com</div>
            )}
          </div>
          <div>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Minimo 6 caracteres" : "Tu contraseña"}
              required
              minLength={6}
              style={styles.input}
            />
          </div>
          <button type="submit" disabled={loading} style={{
            ...styles.primaryBtn,
            opacity: loading ? 0.6 : 1,
          }}>
            {loading ? "⏳ Cargando..." : mode === "login" ? "Iniciar sesion" : "Crear cuenta"}
          </button>
        </form>

        {/* Toggle mode */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: C.gray }}>
          {mode === "login" ? (
            <>¿No tienes cuenta? <button onClick={() => { setMode("register"); setError(""); }} style={styles.linkBtn}>Registrate</button></>
          ) : (
            <>¿Ya tienes cuenta? <button onClick={() => { setMode("login"); setError(""); }} style={styles.linkBtn}>Inicia sesion</button></>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0d1f3c 0%, #1e3a5f 50%, #0d1f3c 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "36px 32px",
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 5,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  primaryBtn: {
    padding: "12px",
    background: "#1d4ed8",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 4,
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#1d4ed8",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    padding: 0,
    textDecoration: "underline",
  },
};
