import React, { useState } from "react";
import { signIn, signUp } from "../lib/auth.js";
import { FUENTE } from "../theme.js";

const C = {
  navy: "#1E3A6E", blue: "#2F56A3", blueLight: "#EEF3FB",
  green: "#178A8E", red: "#CC3366", gray: "#868686",
  border: "#E4E6EA", textLight: "#9AA0A6",
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
          <div style={{ fontSize: 11, letterSpacing: "0.15em", color: C.blue, textTransform: "uppercase", fontWeight: 500, marginBottom: 4 }}>ALANA IT</div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: C.navy, margin: 0 }}>Onboarding Tecnico</h1>
          <p style={{ color: C.textLight, fontSize: 13, marginTop: 6 }}>
            {mode === "login" ? "Inicia sesion para continuar" : "Crea tu cuenta"}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#FDF2F6", border: "1px solid #F3C2D4", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.red }}>
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
    background: "linear-gradient(135deg, #1E3A6E 0%, #2F56A3 50%, #1E3A6E 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FUENTE,
    padding: 16,
    boxSizing: "border-box",
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
    fontWeight: 500,
    color: "#4A4A4A",
    marginBottom: 5,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #E4E6EA",
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  primaryBtn: {
    padding: "12px",
    background: "#2F56A3",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    marginTop: 4,
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#2F56A3",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 13,
    padding: 0,
    textDecoration: "underline",
  },
};
