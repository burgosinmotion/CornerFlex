# CornerFlex Architecture

## 1. Visión del producto

CornerFlex será una herramienta para Adobe After Effects compuesta por dos componentes:

- `CornerFlex.aex`: efecto nativo y motor de geometría y renderizado.
- Una extensión CEP: interfaz principal del producto.

Ambos componentes se instalarán por separado, pero funcionarán como un solo producto.

La extensión CEP:

- aplicará y configurará el efecto;
- leerá el shape o Bézier path seleccionado;
- administrará presets, automatizaciones y utilidades;
- no procesará píxeles.

El AEX:

- mantendrá parámetros nativos, animables y compatibles con expresiones;
- construirá la geometría;
- procesará y renderizará la imagen;
- continuará funcionando aunque la extensión esté cerrada.

## 2. Filosofía orientada al objeto

CornerFlex no es un efecto orientado a la composición. Es un motor de transformación geométrica orientado al objeto: el shape o Bézier path objetivo define el espacio sobre el cual opera.

Trim, Radius, Curvature, Squircle, Feather y Stroke deben calcularse respecto a ese objeto geométrico. Input Bounds solo representa el buffer rasterizado recibido por el efecto, mientras que Geometry Bounds representa el objeto sobre el que CornerFlex realiza sus operaciones. Layer Bounds existe únicamente como fallback temporal o modo de compatibilidad cuando la geometría objetivo todavía no está disponible.

Ninguna función geométrica nueva debe diseñarse basándose directamente en `inputWidth` o `inputHeight`. Antes de implementar una operación debe revisarse explícitamente si depende de Input Bounds o Geometry Bounds. Si una operación geométrica depende de Input Bounds sin una razón justificada, debe considerarse una señal de diseño incorrecto.

Ejemplo:

- composición: 1920 × 1080;
- Rectangle Path: 150 × 150;
- Trim Left: 10 %;
- resultado correcto: 15 px;
- resultado incorrecto: 192 px.

> **Regla:** toda operación geométrica de CornerFlex debe usar Geometry Bounds. Input Bounds solo debe utilizarse para acceder y recorrer el buffer de píxeles.

## 3. Principios arquitectónicos

- **Geometry First:** la geometría es el fundamento del efecto y debe definirse antes del renderizado.
- Separación clara entre UI, Settings, Geometry y Renderer.
- El render no debe calcular geometría compleja por píxel.
- La geometría debe precalcularse antes de los callbacks de iteración.
- El código nativo no debe depender de la extensión para renderizar un proyecto ya configurado.
- Los Match Names y Disk IDs publicados deben mantenerse estables.
- Los cambios deben ser pequeños, compilables y verificables.
- La arquitectura debe admitir Radius, Curvature, Squircle, Feather y Stroke.

## 4. Flujo de datos

```text
Extensión CEP
→ parámetros nativos de CornerFlex
→ CornerFlexSettings
→ Geometry Engine
→ Geometry Operation Pipeline
→ CF_RenderContext
→ Pixel Renderer
```

- **Extensión CEP:** captura la intención del usuario y la geometría seleccionada.
- **Parámetros nativos:** almacenan valores animables, serializables y compatibles con expresiones.
- **CornerFlexSettings:** contiene los valores resueltos que consume la lógica nativa.
- **Geometry Engine:** construye y precalcula la representación geométrica.
- **Geometry Operation Pipeline:** aplica operaciones geométricas ordenadas antes de construir el contexto de render.
- **CF_RenderContext:** transporta datos inmutables y preparados hacia los callbacks.
- **Pixel Renderer:** evalúa la geometría y escribe los píxeles en 8 o 16 bpc.

## 5. Modelo geométrico

`CF_Rect` representa los límites del shape o Bézier path objetivo. No representa necesariamente los límites completos de la composición ni del buffer de entrada.

La geometría de CornerFlex debe calcularse respecto al objeto objetivo. Por ejemplo:

- composición: 1920 × 1080;
- shape rectangular: 150 × 150;
- Trim Left: 10 %;
- resultado esperado: 15 píxeles respecto al shape, no 192 píxeles respecto a la composición.

### Primitive Foundation

`CF_PrimitiveType` describe la naturaleza geométrica de la entrada. No contiene geometría ni lógica de renderizado. Mientras Layer Bounds sea la fuente temporal o fallback, se utiliza `CF_PRIMITIVE_UNKNOWN`. En el futuro permitirá distinguir Rectangle, Ellipse, Bézier, Polygon, Star y Custom Path.

### Radius Foundation

`CF_CornerRadii` representa los radios top-left, top-right, bottom-right y bottom-left como parte de la descripción geométrica. `CF_GeometryContext` conserva estos valores junto a `geometryBounds`, pero actualmente todos se inicializan en cero y no afectan al pipeline ni al rasterizado. Todavía no existe una operación Radius.

### Geometry Source Resolution

Resolver una fuente y construir el contexto son responsabilidades distintas. `ResolveLayerBoundsGeometry()` produce `CF_GeometrySourceData` con bounds, tipo de fuente, tipo de primitiva y estado de fallback. Después, `BuildGeometryContext()` construye el contexto desde esos datos resueltos e inicializa el resto de su descripción geométrica.

Layer Bounds continúa siendo el fallback actual, con `CF_GEOMETRY_SOURCE_LAYER_BOUNDS`, `CF_PRIMITIVE_UNKNOWN` e `isFallback = TRUE`. Esta separación prepara el Core para recibir futuras fuentes reales sin implementar todavía acceso a Rectangle Path, Ellipse Path, Bézier Path o selecciones de After Effects. Las operaciones geométricas consumen `CF_GeometryContext` y permanecen independientes del origen de la geometría.

### Geometry Operation Pipeline

El flujo geométrico sigue `BuildGeometryContext()` → `ExecuteGeometryPipeline()` → `BuildRenderContext()` → render. `BuildGeometryContext()` crea la geometría base y `ExecuteTrimOperation()` es la primera operación real: transforma sus `geometryBounds` mediante `BuildTrimRectangle()`. El renderer permanece independiente del pipeline y solo consume `CF_RenderContext`.

### Geometry Operations Framework

`ExecuteGeometryPipeline()` es exclusivamente un orquestador: recibe geometría, ejecuta operaciones independientes en un orden explícito y devuelve la geometría resultante. Cada operación respeta el contrato `Geometry → Operation → Geometry` y no conoce el renderer ni otras operaciones.

El orden actual contiene únicamente `ExecuteTrimOperation()`. Las operaciones futuras, como Radius, Chamfer u Offset, se incorporarán como nuevos pasos secuenciales sin modificar el contrato de las operaciones existentes. Esta estructura permite ampliar el pipeline manteniendo aisladas la construcción geométrica, la coordinación y el renderizado.

### Geometry Operation Contract

El contrato oficial del Core es `Geometry → Operation → Geometry`: cada operación recibe un `CF_GeometryContext` y devuelve un `CF_GeometryContext`.

- Las operaciones transforman datos geométricos; no renderizan.
- Las operaciones no conocen After Effects ni acceden a callbacks, suites o buffers del host.
- `CornerFlexSettings` entrega valores ya resueltos como entrada del Core.
- El pipeline solo coordina la ejecución ordenada de operaciones.
- La construcción de `CF_RenderContext` ocurre después del pipeline y mantiene separado al renderer.

### Geometry Validation

`IsGeometryContextValid()` comprueba que `left <= right`, `top <= bottom` y que el ancho y el alto calculados no sean negativos. Es una función pura: no modifica geometría, no renderiza y no accede a APIs, callbacks, suites ni buffers de After Effects.

La validación se ejecuta después de `BuildGeometryContext()` y después de `ExecuteGeometryPipeline()`. Validar y normalizar son responsabilidades distintas: la validación informa sobre el estado, mientras que una eventual normalización transformaría los datos.

La política actual es observacional para conservar el comportamiento visual existente. Los parámetros Trim pueden producir bounds invertidos, que actualmente generan transparencia total en el renderer. Hasta definir una política de error compatible con el SDK, esos bounds no se corrigen ni se rechazan silenciosamente. La respuesta mínima futura propuesta es abortar antes de `BuildRenderContext()` con un error explícito del SDK acordado y verificable. El contrato objetivo es que el renderer reciba únicamente geometría que haya superado la validación.

## 6. Input Bounds versus Geometry Bounds

### Input Bounds

- Dimensiones del buffer rasterizado recibido por el efecto.
- Necesarias para recorrer, leer y escribir píxeles.

### Geometry Bounds

- Límites del shape o path objetivo.
- Referencia para Trim, Radius, Curvature, Squircle, Feather y Stroke.

`CF_RenderContext` distingue conceptualmente estos datos mediante:

- `inputWidth`
- `inputHeight`
- `geometryBounds`

Actualmente, Geometry Bounds sigue construyéndose a partir de Input Bounds como fallback. La separación conceptual ya existe, pero la fuente geométrica externa todavía no está conectada.

## 7. Fuentes de geometría

- **Layer Bounds:** fallback temporal y modo de compatibilidad.
- **Parametric Shape Bounds:** límites de Rectangle Path, Ellipse Path u otras formas paramétricas.
- **Bézier Path:** vértices, tangentes de entrada, tangentes de salida y estado cerrado o abierto.
- **Alpha Bounds:** posible alternativa futura, pero no fuente principal.

Alpha Bounds no será la fuente principal porque:

- sombras, blur y feather alteran el alpha;
- una capa puede contener varios shapes;
- no conserva la geometría Bézier original;
- su cálculo puede ser más costoso.

## 8. Integración con la extensión CEP

Flujo previsto:

1. El usuario selecciona un shape o Bézier path.
2. La extensión identifica y lee su geometría.
3. La extensión aplica `CornerFlex.aex` si todavía no existe.
4. La extensión transmite los bounds o datos geométricos mediante parámetros nativos o un mecanismo futuro compatible.
5. CornerFlex construye y renderiza la geometría respecto al objeto seleccionado.

Una Shape Layer puede contener varios grupos y el AEX no puede inferir automáticamente cuál es el objetivo. La extensión deberá utilizar el path seleccionado o una acción explícita como **Capture Geometry**.

## 9. Estado actual

Actualmente están implementados:

- identidad CornerFlex normalizada;
- categoría `Burgos in Motion`;
- Match Name `BurgosInMotion CornerFlex`;
- binario `CornerFlex.aex`;
- Link Trim;
- Trim enlazado;
- Trim independiente por lado;
- `CornerFlexSettings`;
- `CF_Rect`;
- `CF_CornerRadii`;
- `CF_GeometrySourceData`;
- `CF_GeometryContext`;
- `CF_RenderContext`;
- `ResolveLayerBoundsGeometry()`;
- `ReadCornerFlexSettings()`;
- `BuildTrimRectangle()`;
- `BuildGeometryContext()`;
- `IsGeometryContextValid()`;
- `ExecuteTrimOperation()`;
- `ExecuteGeometryPipeline()`;
- `BuildRenderContext()`;
- `TrimFunc8()`;
- `TrimFunc16()`;
- render de 8 y 16 bpc.

Actualmente, `BuildGeometryContext()` crea Layer Bounds a partir de Input Bounds como fallback y `ExecuteTrimOperation()` aplica Trim sobre esa geometría base. Por ello, el efecto aún opera visualmente respecto a la composición o al buffer completo. Este comportamiento es temporal y no representa el objetivo final del producto, que consiste en operar respecto al shape o Bézier path seleccionado.

## 10. Hoja de ruta técnica

1. Documentar arquitectura.
2. Separar Input Bounds y Geometry Bounds.
3. Introducir `CF_GeometryContext` y `BuildGeometryContext()`.
4. Definir metadata mínima de la fuente geométrica.
5. Preparar Geometry Bounds externos.
6. Mantener Layer Bounds como fallback.
7. Conectar la captura del shape o Bézier path.
8. Implementar Radius únicamente cuando pueda consumir Geometry Bounds correctamente.
9. Implementar radios independientes.
10. Añadir Curvature y Squircle.
11. Añadir Feather y Stroke.
12. Conectar la extensión CEP con el flujo completo del efecto.
13. Incorporar presets, automatizaciones y utilidades.

## 11. Convenciones

- Usar el prefijo `CF_` para estructuras y conceptos internos propios.
- Usar `CornerFlexSettings` para valores resueltos desde parámetros.
- Usar `Build...` para funciones que construyen geometría.
- Usar `...Context` para datos precalculados empleados durante el render.
- Los callbacks de píxeles no deben leer directamente la UI.
- Evitar renombrar Match Names o Disk IDs después de publicar.
- No modificar archivos del SDK de Adobe salvo necesidad justificada.
