// Paleta corporativa de ALANA IT, tomada de alanait.com.
//
//   Azul de marca   #2F56A3   identidad, cabecera, titulares
//   Turquesa        #2FB6BA   acento vivo: confirmaciones y acciones
//   Magenta         #CC3366   realce y riesgo
//   Tinta           #333333   texto
//   Gris            #868686   texto secundario
//   Papel           #F9F9F9   fondos
//
// Los nombres de las claves se conservan (navy, blue, green, red...) porque son
// los que usa todo el codigo; lo que cambia son los valores. "green" y "red" ya
// no son verde y rojo literales: son el turquesa de confirmacion y el magenta
// de riesgo de la marca.

export const C = {
  // Azul de marca. `navy` es la version profunda para la cabecera y las
  // superficies oscuras; `blue` es el azul corporativo tal cual.
  navy: "#1E3A6E", blue: "#2F56A3", blueLight: "#EEF3FB", blueBorder: "#BBCCE8",

  // Turquesa: seccion activa, campos completos, confirmaciones.
  green: "#178A8E", greenLight: "#E6F7F7", greenBorder: "#9BDCDE",

  // Magenta: riesgo, hallazgos, secciones sin servicio.
  red: "#CC3366", redLight: "#FDF2F6", redBorder: "#F3C2D4",

  // Ambar: herencias del proveedor anterior, ni riesgo activo ni simple nota.
  amber: "#B4530F", amberLight: "#FDF5EC", amberBorder: "#F0C89A",

  gray: "#868686", grayLight: "#F9F9F9", border: "#E4E6EA",
  text: "#333333", textLight: "#868686",
};

// Familia tipografica. alanait.com usa Centra No2 en peso 300 para titulares y
// 400 para texto; aqui se usa Jost, su equivalente libre mas cercano, con la
// misma disciplina: nada de negritas de 700 u 800, que es lo que hacia que la
// aplicacion pareciera de plantilla.
export const FUENTE = "Jost, 'Segoe UI', system-ui, -apple-system, sans-serif";

export const inp = {
  width: "100%", padding: "8px 11px", border: `1px solid ${C.border}`,
  borderRadius: "6px", fontSize: "13px", color: C.text, background: "#fff",
  boxSizing: "border-box", fontFamily: "inherit", outline: "none",
};
