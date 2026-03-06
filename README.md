# Buscador de Mesas — Testeo Charly

Prototipo de aplicación web estática para que los invitados ingresen su nombre y obtengan su número de mesa desde un único QR por matrimonio.

## Estructura

```
projects/guest-lookup
├── index.html            # Página principal
├── style.css             # Estilos minimalistas adaptables a mobile
├── app.js                # Lógica de búsqueda (normaliza nombres, busca por coincidencia parcial)
├── data/
│   └── guests-sample.json  # Datos generados desde el Excel de prueba
├── assets/
│   └── qr-testeo-charly.png  # QR que apunta a http://localhost:4173/testeo-charly
└── README.md
```

## Cómo probarlo

1. Abrir la carpeta en el navegador (doble click a `index.html`) **o** levantar un server local:
   ```bash
   cd projects/guest-lookup
   npx serve .
   # o
   python -m http.server 4173
   ```
2. Escanear el QR de `assets/qr-testeo-charly.png` o abrir la URL que uses en tu server.
3. Escribir nombre y apellido y verificar el número de mesa.

## Actualizar la lista de invitados

1. Coloca el Excel del matrimonio en algún lugar del workspace.
2. Transforma el archivo a JSON con:  
   ```bash
   source external/venv/bin/activate
   python scripts/guestlist-to-json.py "ruta/al/Excel.xlsx" projects/guest-lookup/data/guests-sample.json
   ```
3. Refresca la página; el buscador leerá automáticamente el nuevo JSON.

## Próximos pasos

- Permitir múltiples matrimonios (dataset + query param).
- Agregar branding personalizado según paleta del evento.
- Preparar script para minificar/zippear y subir a hosting (Netlify / GitHub Pages) y regenerar QR definitivo.
