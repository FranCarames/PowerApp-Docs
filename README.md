# PowerApp — Docs

Documentación de **PowerApp**, una aplicación de gimnasio y entrenamiento: modelo de datos, especificaciones de casos de uso (CU), prototipos de interfaces y el sitio de GitHub Pages que los publica.

El código de la API vive en el repo hermano **[PowerApp-Backend](https://github.com/FranCarames/PowerApp-Backend)**, y todos sus servicios REST están documentados en **[Swagger](https://powerapp-backend.onrender.com/docs)**.

🌐 **Sitio publicado:** **[francarames.github.io/PowerApp-Docs](https://francarames.github.io/PowerApp-Docs/)**

---

## 📚 Vistas

| Vista | Descripción |
|---|---|
| 🧭 **[Portada](https://francarames.github.io/PowerApp-Docs/)** | Índice de toda la documentación |
| 📱 **[Prototipo de interfaces](https://francarames.github.io/PowerApp-Docs/UI%20Front/powerapp-prototype-app.html)** | Mockups navegables de las pantallas, por rol — app mobile y [versión web](https://francarames.github.io/PowerApp-Docs/UI%20Front/powerapp-prototype-web.html) |
| 📊 **[Estado de implementación](https://francarames.github.io/PowerApp-Docs/Status/dashboard-estado-CU.html)** | Dashboard de avance: cada CU vs. el código (copia, ver nota) |
| 📄 **[Especificaciones de CU](https://francarames.github.io/PowerApp-Docs/Use%20Cases/)** | Las especificaciones de casos de uso, por rol y paquete |
| 🗃️ **[Modelo de datos](https://francarames.github.io/PowerApp-Docs/Doc/modelo-db.html)** | Visor del diagrama entidad-relación de la base, con zoom y arrastre ([PDF](https://francarames.github.io/PowerApp-Docs/Doc/PowerApp%20-%20Modelo%20DB.pdf)) |

---

## 📁 Estructura

```
Doc/         → Documentación vigente: modelo de datos (SVG/PDF + visor), specs y planes de cada cambio, contexto para la app iOS.
Use Cases/   → Especificaciones de los casos de uso (1 .md por CU, por rol) + índice y visor.
UI Front/    → Prototipos HTML de las interfaces (app y web).
Status/      → Copia del informe y del dashboard de avance por CU.
index.html   → Portada de GitHub Pages.
```

## Fuentes de verdad

- **Modelo de datos:** `Doc/PowerApp - Modelo DB.svg` / `.pdf`. Ante un conflicto con las entidades TypeORM del backend, manda este modelo.
- **Especificaciones de CU:** `Use Cases/`. El índice `Use Cases/README.md` alimenta el visor.

> **`Status/` es una copia.** La fuente es la carpeta `Status/` del repo [PowerApp-Backend](https://github.com/FranCarames/PowerApp-Backend), porque el avance se actualiza junto con el código. Se sincroniza a mano: puede estar desactualizada respecto del backend.

## Ver el sitio en local

Los visores usan `fetch`, así que **no funcionan abriendo el HTML con `file://`**. Servir la carpeta por HTTP:

```bash
python -m http.server 8000
```

y abrir `http://localhost:8000/`.
