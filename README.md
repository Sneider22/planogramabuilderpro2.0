# Planogram Pro Builder

Planogram Pro Builder es un prototipo de aplicación web para la gestión operativa de espacios comerciales en retail. Su objetivo es ofrecer un flujo de trabajo técnico para la creación, catalogación y evaluación de góndolas a partir de información de inventario y parámetros de mobiliario.

## Propósito

La herramienta está diseñada para:
- gestionar múltiples tiendas y sus configuraciones de góndolas;
- asociar productos a espacios físicos de exhibición;
- validar ocupación de espacio y mapa de colocación;
- generar reportes descargables con datos de inventario y valor comercial.

El diseño prioriza una experiencia de prototipo funcional, apoyada en un modelo de persistencia local que facilita pruebas rápidas sin requerir backend.

## Estructura del Proyecto

### Archivos principales

- `index.html` - Página de inicio que redirige a `login.html`.
- `login.html` - Pantalla de autenticación de prototipo.
- `stores.html` - Listado de tiendas registradas, creación, edición y eliminación de tiendas.
- `store-details.html` - Panel de gestión de góndolas dentro de una tienda.
- `editor.html` - Editor de góndolas con simulación de posicionamiento y generación de reportes.
- `css/style.css` - Estilos globales y diseño de la interfaz.
- `js/*.js` - Lógica de la aplicación.

### Componentes lógicos

- `js/state.js` - Clase `AppState` que centraliza el estado de la aplicación, persistencia en `localStorage` y catálogo de productos.
- `js/login.js` - Control de acceso de prototipo con credenciales fijas (`admin` / `admin123`).
- `js/stores.js` - Renderizado de la lista de tiendas, manejo de modales y navegación hacia el detalle de la tienda.
- `js/store-details.js` - Flujo de góndolas, creación/edición/eliminación y reportes globales de tienda.
- `js/editor.js` - Editor de góndolas con lógica de colocación, cálculo de espacio y exporte de reportes.
- `js/ui.js` - Funciones auxiliares de interfaz, gestión de vistas y utilidades de interacción.
- `js/calculator.js` - Cálculos de espacios, unidades y validación de profundidad.

## Funcionamiento general

### Autenticación

El acceso se controla en el front-end mediante `localStorage` y un indicador `planogram_logged_in`. Cuando el usuario valida la credencial, se redirige a `stores.html`.

### Gestión de tiendas

Cada tienda se guarda en `localStorage` bajo `planogram_stores`. El objeto de tienda incluye:

- `id` - Identificador interno.
- `name` - Nombre visible.
- `createdAt` - Marca de tiempo.
- `library` - Lista de góndolas asociadas.

La aplicación permite:
- crear tiendas con ID generados o personalizados;
- editar metadatos de la tienda;
- eliminar tiendas con limpieza de estado asociado.

### Gestión de góndolas

Una góndola es un objeto de configuración que contiene parámetros básicos de mobiliario y un listado de estantes.

La lógica central del estado mantiene:
- dimensiones del módulo (`width`, `height`, `depth`);
- número de estantes y separación entre ellos;
- estructura de cada estante con productos colocados.

Las góndolas se organizan por pasillo y categoría dentro de la tienda para facilitar su localización.

### Catálogo de productos

El catálogo de productos está implementado como un array en `js/state.js`. Cada producto cuenta con:
- `id` y `sku`
- `name`
- `width`, `height`, `depth`
- `price`
- `color`
- `category`

Este catálogo simula un universo de productos de retail, con énfasis en farmacia, cuidado personal, nutrición y bebidas.

### Persistencia

Toda la información de tiendas, góndolas y configuraciones se conserva en `localStorage`:

- `planogram_stores`
- `planogram_next_store_auto_id`
- `planogram_store_id`
- `planogram_gondola_id`
- `planogram_trigger_report`

Esto permite continuar el flujo dentro del navegador sin necesidad de base de datos.

## Generación de reportes

La solución integra las siguientes librerías externas para exportes:

- `jsPDF` - generador PDF en cliente.
- `jsPDF-AutoTable` - construcción de tablas dinámicas en PDF.
- `xlsx` - soporte de exportación a Excel desde la interfaz.

Los reportes incluyen métricas operativas como:
- valor total de inventario por góndola;
- cantidad de unidades disponibles;
- SKU y descripción de producto;
- capacidad ocupada vs. profundidad disponible.

## Flujo de uso recomendado

1. Iniciar sesión en `login.html` con las credenciales del prototipo.
2. Crear una nueva tienda en `stores.html`.
3. Acceder a `store-details.html` para agregar y administrar góndolas.
4. En las góndolas, usar el editor para asignar productos y validar ocupación.
5. Generar reportes globales o específicos para descargar como PDF o Excel.

## Alcance del prototipo

Este proyecto está enfocado en la parte front-end de un sistema de planogramas. No incluye servidor, autenticación real ni almacenamiento remoto. Su valor está en:

- validación de conceptos de UX para retail;
- simulación de catálogo y espacio de exhibición;
- comportamiento técnico de armado de reportes.

