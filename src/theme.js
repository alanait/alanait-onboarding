// Paleta y estilo base de input compartidos por el editor de onboarding.
// (Dashboard, LoginPage y VersionHistory aun declaran su propia copia de C.)

export const C = {
  navy: "#0d1f3c", blue: "#1d4ed8", blueLight: "#eff6ff", blueBorder: "#bfdbfe",
  green: "#15803d", greenLight: "#f0fdf4", greenBorder: "#86efac",
  red: "#b91c1c", redLight: "#fef2f2", redBorder: "#fecaca",
  // Ambar: reservado para los avisos de legado del proveedor anterior, que no
  // son un riesgo activo (rojo) pero tampoco una simple nota (azul).
  amber: "#b45309", amberLight: "#fffbeb", amberBorder: "#fcd34d",
  gray: "#64748b", grayLight: "#f8fafc", border: "#e2e8f0", text: "#1e293b", textLight: "#64748b",
};

export const inp = {
  width: "100%", padding: "8px 11px", border: `1px solid ${C.border}`,
  borderRadius: "6px", fontSize: "13px", color: C.text, background: "#fff",
  boxSizing: "border-box", fontFamily: "inherit", outline: "none",
};
