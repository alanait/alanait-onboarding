# ALANA IT Onboarding Técnico — App Web

## Requisitos
- **Node.js LTS** → https://nodejs.org

## Desarrollo

```
npm install
npm run dev
```

Se abre en http://localhost:3000

## Compilar para producción

```
npm run build
```

Los archivos se generan en la carpeta `build/`. Se pueden servir con cualquier servidor web estático.

## Notas
- Los proyectos se guardan/cargan como archivos `.alanait` (JSON)
- El historial de proyectos recientes se almacena en localStorage
- "Exportar PDF" abre la ventana de impresión del navegador (Ctrl+P → Guardar como PDF)
