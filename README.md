# Buscador de Mesas · Guest Lookup

Motor estático para buscar invitados por nombre o mesa y mostrar su ubicación en el salón.

## Evento actual

### Cote y Lau
- **Página:** `cote-lau.html`
- **Dataset de invitados:** `data/guests-cote-lau.json`
- **Resumen de mesas:** `data/tables-cote-lau.json`
- **Fuente:** hoja de cálculo "Mesas- Cote y Lau" con dos pestañas:
  - invitados (`Apellido / Nombre / Acompañante / MESA`)
  - distribución de mesas (`Número de mesa / Cantidad de personas / Detalles`)

La página nueva muestra:
- búsqueda por nombre, apellido o mesa
- acompañante registrado
- resumen de 56 mesas con capacidad y ocupación
- alertas de platos especiales desde la planilla

## Cómo probar

```bash
cd projects/guest-lookup
python -m http.server 4173
```

Luego abre:
- `http://localhost:4173/cote-lau.html`

## Cómo refrescar los datos

1. Exporta la hoja de Google Sheets a CSV por pestaña.
2. Reemplaza:
   - `data/guests-cote-lau.json`
   - `data/tables-cote-lau.json`
3. Recarga la página.

## Motor compartido

- `app.js` sigue funcionando con eventos viejos que solo usan `data-dataset`.
- Si una página define `data-tables`, además activa el resumen de mesas.
- Si define `data-table-map`, el motor también puede resaltar el plano.

## Deploy

- Repo: `projects/guest-lookup`
- GitHub Pages: `https://charlyagenteia-sys.github.io/guest-lookup/`

## QR

- `assets/qr-cote-lau.png`
- `assets/qr-cote-lau-300dpi.png`
- `assets/qr-cote-lau.pdf`

La URL pública objetivo es `https://charlyagenteia-sys.github.io/guest-lookup/cote-lau.html?v=20260925`.
