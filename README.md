# 🏗️ Planogram Pro Builder | Retail Engineering

**Planogram Pro Builder** es una herramienta profesional de ingeniería retail diseñada para la creación, gestión y visualización técnica de planogramas en 3D. Permite a los gestores de categoría y personal de tienda diseñar mobiliario real, validar capacidades de inventario y generar reportes financieros precisos.

---

## Características Principales

### 1. 🧊 Motor de Visualización 3D
- Renderizado técnico utilizando transformaciones CSS3.
- Controles interactivos de **Giro Horizontal**, **Inclinación** y **Zoom**.
- Representación real de profundidad (Eje Z) y apilamiento (Eje Y).

### 2. 📚 Librería de Mobiliario (Presets)
- Clasificación por tipos: **Góndola de Pared**, **Góndola Central (Doble)**, **Cabecera** y **Mural Refrigerado**.
- Sistema de persistencia basado en `localStorage` para guardar y cargar configuraciones personalizadas.
- Presets de dimensiones estándar de la industria para configuración rápida.

### 3. 🛒 Gestión de Inventario Inteligente
- **Cálculo de Capacidad:** Validación en tiempo real de espacio lineal (Ancho) y vertical (Alto).
- **Catálogo Segmentado:** Productos organizados por categorías (Lácteos, Snacks, Limpieza, Despensa, Bebidas).
- **Dashboard en Tiempo Real:** Seguimiento de Valor de Inventario ($), Unidades Totales y SKUs únicos.

### 4. 📄 Reportes Técnicos
- Generación de informes detallados en formato HTML.
- **Exportación a PDF:** Integración con `jsPDF` para descargar reportes profesionales que incluyen SKU, nombre, cantidades, precio unitario y valor total.

---

## Tecnologías Utilizadas
- **Frontend:** Vanilla JavaScript (ES6+), HTML5 Semántico.
- **Estilos:** CSS3 Avanzado (Flexbox, Grid, 3D Transforms, Custom Properties).
- **Librerías Externas:** 
  - `jsPDF`: Generación de documentos PDF.
  - `jsPDF-AutoTable`: Formateo de tablas en reportes.
  - `Google Fonts (Inter)`: Tipografía profesional.

---

## Instrucciones de Uso

1. **Configurar el Mueble:** Usa el panel izquierdo para definir las dimensiones, el tipo de mueble y el número de planchas (estantes).
2. **Diseñar el Planograma:**
   - **Añadir:** Arrastra un producto desde el catálogo derecho hacia cualquier estante.
   - **Apilar:** Arrastra el mismo producto sobre uno ya colocado para apilarlo verticalmente (si hay espacio).
   - **Remover:** Haz doble clic sobre un producto en el estante para eliminarlo.
3. **Perspectiva:** Usa el widget de **Vista 3D** para rotar el mueble y verificar la profundidad de los productos.
4. **Guardar:** Haz clic en "Guardar como Preset" para añadir tu diseño a la librería local.
5. **Reportar:** Haz clic en "Ver Informe Detallado" para revisar el costo del inventario y descargarlo en PDF.

---

## Licencia
Desarrollado para fines de gestión de inventario y optimización de espacios retail.
