// Fin de soporte de cada version de sistema operativo.
//
// Existe para no preguntarle al tecnico algo que la aplicacion ya sabe. Si ha
// contestado "Windows Server 2025", preguntarle ademas si esta en soporte es
// trabajo de mas y una ocasion de equivocarse: la respuesta se deduce.
//
// Las fechas son el fin de soporte EXTENDIDO del fabricante, que es el momento
// en que deja de haber parches de seguridad -que es lo unico que importa aqui.
// El soporte mainstream se acaba antes pero la maquina sigue recibiendo
// parches, y llamar a eso "fuera de soporte" seria alarmar sin motivo.
//
// La fecha de referencia es la de la VISITA, no la de hoy: un informe de hace
// un ano tiene que seguir diciendo lo que era cierto aquel dia, y el motor del
// score es una funcion pura que no puede leer el reloj.
export const FIN_SOPORTE = {
  // Windows Server
  "Windows Server 2025": "2034-10-10",
  "Windows Server 2022": "2031-10-14",
  "Windows Server 2019": "2029-01-09",
  "Windows Server 2016": "2027-01-12",
  "Windows Server 2012 R2": "2023-10-10",
  "Windows Server 2012": "2023-10-10",
  "Windows Server 2008 R2": "2020-01-14",
  "Windows Server 2008": "2020-01-14",
  "Anterior a 2008": "2015-07-14",

  // Windows de escritorio
  "Windows 11": "2031-10-14",
  "Windows 10": "2025-10-14",
  "Windows 8.1": "2023-01-10",
  "Windows 7": "2020-01-14",
  "Anterior a Windows 7": "2014-04-08",

  // Linux: solo las que se pueden decidir sin saber la version menor
  "CentOS 7 o anterior": "2024-06-30",
};

// Distribuciones cuyo soporte depende de la version menor (Ubuntu 22.04 frente
// a 20.04, RHEL 8 frente a 7...). El desplegable no la recoge, asi que aqui no
// se puede deducir nada y hay que seguir preguntando.
export const SIN_DEDUCIR = [
  "Ubuntu Server LTS", "Ubuntu Server (no LTS)", "Debian",
  "Red Hat Enterprise Linux", "Rocky Linux / AlmaLinux", "SUSE", "Otra",
];

/**
 * Deduce si una version estaba en soporte en una fecha dada.
 *
 * @param  {string} version  literal exacto del desplegable de version
 * @param  {string} fecha    fecha de la visita, "AAAA-MM-DD"
 * @return {"En soporte"|"Fuera de soporte (EOL)"|null}  null = no se puede deducir
 */
export function soporteDe(version, fecha) {
  if (!version || !fecha) return null;
  const fin = FIN_SOPORTE[version];
  if (!fin) return null;
  // Comparacion de cadenas AAAA-MM-DD: ordena igual que las fechas y no
  // arrastra husos horarios, que es justo lo que rompe este tipo de calculo.
  return fecha <= fin ? "En soporte" : "Fuera de soporte (EOL)";
}

/**
 * El campo de version que aplica segun la familia de SO elegida.
 * Devuelve null para familias que no tienen desplegable de version (macOS,
 * Otro): ahi no hay nada que deducir y la pregunta sigue teniendo sentido.
 */
export function campoVersionDe(familia) {
  if (familia === "Windows Server") return "so_windows_server";
  if (familia === "Windows (escritorio)") return "so_windows_cliente";
  if (familia === "Linux") return "so_linux";
  return null;
}
