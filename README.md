# ChessArbiter (versión FIDE)

Aplicación web para gestión de torneos de ajedrez, pensada para árbitros y organizadores.

Este proyecto combina un **frontend moderno** en React + Vite + TailwindCSS + shadcn/ui, y un **backend** en Node.js con Express y SQLite.  
Permite crear torneos, gestionar rondas y emparejamientos, importar participantes desde CSV, y generar informes en PDF listos para impresión.

---

## 🚀 Tecnologías utilizadas

### Frontend
- React 18
- Vite
- TailwindCSS
- shadcn/ui
- Framer Motion
- React Router
- React Hook Form + Zod
- Recharts

### Backend
- Node.js + Express
- SQLite (persistencia de datos)
- Multer (subida de ficheros)
- csv-parser (importación de jugadores desde CSV)
- PDFKit (generación de informes)
- Day.js (gestión de fechas)
- CORS

---

## 📂 Estructura de carpetas

La estructura puede variar según tu copia local, pero típicamente se organiza así:

```
.
├── server/           # Backend (Node + Express + SQLite)
│   ├── package.json
│   ├── src/
│   └── ... 
├── src/              # Frontend (React + Vite + Tailwind)
│   ├── components/
│   ├── pages/
│   ├── App.tsx
│   └── ...
├── public/           # Archivos estáticos del frontend
├── docs/             # Documentación adicional
├── README.md
└── package.json      # Dependencias del frontend
```

> **Nota:** Si tu ZIP contiene diferencias (por ejemplo, carpetas o dependencias Python), adapta esta sección a la estructura detectada. Consulta el archivo `zip_tree.md` generado en el análisis para revisar tu árbol real.

---

## ⚙️ Instalación y ejecución

### Backend
```bash
cd server
npm install
npm run dev
```
Servidor disponible en: [http://localhost:4000](http://localhost:4000)

### Frontend
```bash
npm install
npm run dev
```
Aplicación disponible en: [http://localhost:5173](http://localhost:5173)

---

## 📑 Funcionalidades principales

- Creación y edición de torneos.
- Gestión de jugadores, rondas y resultados.
- Emparejamiento automático por sistema suizo.
- Soporte de byes y ausencias.
- Importación de jugadores desde CSV.
- Generación de reportes e informes en PDF.
- Interfaz moderna y responsiva para árbitros.

---

## 📥 Importación de jugadores (CSV)

Formato esperado del CSV:
- Nombre
- ELO
- Federación
- Otros campos relevantes

> El backend valida el formato y devuelve errores claros si no coincide.

---

## 📝 Generación de informes en PDF

El backend usa **PDFKit** para crear informes como:
- Listado de jugadores
- Resultados por ronda
- Clasificación general

Los archivos PDF se generan en el servidor y están listos para impresión.

---

## 📜 Licencia

Este proyecto está licenciado bajo MIT.  
Consulta el archivo `LICENSE` para más detalles.


### Visita la aplicación en:

Frontend: http://localhost:5173
Backend: http://localhost:4000
