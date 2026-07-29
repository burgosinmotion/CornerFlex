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

### Rectangle Primitive Foundation

`CF_RectangleGeometry` representa una primitiva rectangular mediante bounds, ancho, alto y centro. Es información geométrica independiente de APIs, selecciones o streams de After Effects. `BuildGeometryContext()` construye actualmente esta representación a partir de los Layer Bounds resueltos.

#### Base Primitive Geometry

`BuildRectangleGeometry()` construye `CF_RectangleGeometry` exclusivamente desde un `CF_Rect`. Esta representación es una instantánea estable de la primitiva base previa a las operaciones. Las operaciones geométricas no deben modificarla.

#### Working Geometry

`geometryBounds` se inicializa desde `rectangleGeometry.bounds` y representa el estado transformable. El Geometry Operation Pipeline modifica únicamente Working Geometry; actualmente `ExecuteTrimOperation()` actualiza `geometryBounds` sin alterar la primitiva base.

```text
CF_GeometrySourceData
→ BuildRectangleGeometry()
→ CF_RectangleGeometry base
→ geometryBounds iniciales
→ Geometry Operation Pipeline
```

Mientras Layer Bounds sea solo un fallback y no una Rectangle Path identificada, `primitiveType` permanece en `CF_PRIMITIVE_UNKNOWN`. Ningún dato de `CF_RectangleGeometry` afecta todavía al rasterizado.

### Radius Foundation

`CF_CornerRadii` representa los radios top-left, top-right, bottom-right y bottom-left como parte de la descripción geométrica. `CF_GeometryContext` conserva estos valores junto a `geometryBounds`, pero actualmente todos se inicializan en cero y no afectan al pipeline ni al rasterizado. Todavía no existe una operación Radius.

### Geometry Source Resolution

Resolver una fuente y construir el contexto son responsabilidades distintas. `ResolveLayerBoundsGeometry()` produce `CF_GeometrySourceData` con bounds, tipo de fuente, tipo de primitiva y estado de fallback. Después, `BuildGeometryContext()` construye el contexto desde esos datos resueltos e inicializa el resto de su descripción geométrica.

Layer Bounds continúa siendo el fallback actual, con `CF_GEOMETRY_SOURCE_LAYER_BOUNDS`, `CF_PRIMITIVE_UNKNOWN` e `isFallback = TRUE`. Esta separación prepara el Core para recibir futuras fuentes reales sin implementar todavía acceso a Rectangle Path, Ellipse Path, Bézier Path o selecciones de After Effects. Las operaciones geométricas consumen `CF_GeometryContext` y permanecen independientes del origen de la geometría.

#### Geometry Resolve Request

`CF_GeometryResolveRequest` agrupa los datos necesarios para solicitar una fuente geométrica. Contiene `inputWidth`, `inputHeight` y un `CF_RectangleSourceData` opcional. Este último transporta bounds candidatos y un indicador `isAvailable`, sin consultar selección, Shape Layers ni Property Streams.

#### Rectangle Source Data

`CF_RectangleSourceData` representa una fuente rectangular candidata. Cuando está disponible, `ResolveRectangleGeometry()` devuelve sus bounds con `CF_GEOMETRY_SOURCE_RECTANGLE`, `CF_PRIMITIVE_RECTANGLE` e `isFallback = FALSE`. El resolver es puro y no accede al SDK.

#### Geometry Source Resolver Contract

`ResolveGeometrySource()` es el único punto de entrada utilizado por el flujo principal. Rectangle Source tiene prioridad sobre Layer Bounds; cuando no está disponible, Layer Bounds permanece como fallback. Ambas rutas devuelven `CF_GeometrySourceData`.

```text
CF_GeometryResolveRequest
├── Rectangle Source disponible
│   → ResolveRectangleGeometry()
│
└── Sin Rectangle Source
    → ResolveLayerBoundsGeometry()

Ambas rutas → CF_GeometrySourceData → BuildGeometryContext()
```

La disponibilidad de Rectangle Source permanece desactivada explícitamente en `Render()` hasta integrar una fuente real. Por ello, `ResolveLayerBoundsGeometry()` sigue siendo la única ruta activa. Las fuentes futuras deberán cumplir el mismo contrato y devolver `CF_GeometrySourceData`. Las operaciones geométricas permanecen independientes del resolver y del origen.

#### After Effects Geometry Adapter

La capa **AE Integration** traduce datos del host a contratos simples del Core. `DiscoverRectangleSourceFromAfterEffects()` es el punto de adaptación inicial para una Rectangle Path candidata: recibe el contexto mínimo disponible del efecto y siempre inicializa un `CF_RectangleSourceData` seguro. El Core geométrico no consulta suites, streams, Shape Layers ni selección.

#### Rectangle Source Discovery

El SDK incluido expone `AEGP_PFInterfaceSuite1::AEGP_GetEffectLayer()` durante `PF_Cmd_RENDER` para obtener la capa que contiene el efecto. También ofrece `AEGP_DynamicStreamSuite4` para recorrer grupos y localizar streams por índice o Match Name, y `AEGP_StreamSuite6` para consultar tipos y valores de propiedades. Estas APIs permitirían inspeccionar grupos de contenido y propiedades equivalentes a Size, Position y Roundness una vez definido un objetivo inequívoco.

El SDK también permite obtener la selección de una composición mediante `AEGP_GetNewCollectionFromCompSelection()` y representar elementos `STREAMREF` en `AEGP_CollectionSuite2`. Sin embargo, esa selección pertenece a la composición activa de la interfaz y no constituye una identidad estable ni fiable del path objetivo durante el render. `AEGP_LayerSuite9::AEGP_GetActiveLayer()` solo informa una capa activa y una Shape Layer puede contener varios grupos y Rectangle Paths. Para evitar una elección implícita, el adaptador no adquiere suites ni recorre streams en esta fase.

`DiscoverRectangleSourceFromAfterEffects()` devuelve actualmente `isAvailable = FALSE`; no genera bounds simulados, no retiene referencias del SDK y no participa en el render. En consecuencia, `ResolveGeometrySource()` continúa seleccionando Layer Bounds. Para activar una fuente real será necesario proporcionar una identidad estable del path objetivo —por ejemplo, capturada explícitamente por la extensión— y definir su sistema de coordenadas y tiempo de evaluación.

#### Geometry Target Identity

La selección del objetivo y el descubrimiento de su geometría son fases separadas. `CF_GeometryTargetIdentity` transporta únicamente una identidad simple y serializable mediante `isValid`, `layerId` y `uniqueStreamId`; no contiene bounds, valores de propiedades, punteros, handles ni referencias del SDK. `Render()` crea actualmente una identidad inválida y el adaptador la recibe sin utilizarla.

El SDK ofrece `AEGP_LayerSuite9::AEGP_GetLayerID()` y `AEGP_GetLayerFromLayerID()` para identificar una capa dentro de su composición. `AEGP_StreamSuite6::AEGP_GetUniqueStreamID()` entrega un entero único para un stream. `AEGP_DynamicStreamSuite4` permite consultar Match Names, subir por la jerarquía y obtener el índice de un hijo dentro de un grupo indexado. Los headers revisados no documentan un Persistent ID específico para propiedades ni garantizan que el Unique Stream ID sobreviva a la reapertura del proyecto.

Estrategias evaluadas:

- **Layer ID + jerarquía de índices:** no depende de nombres, pero el reordenamiento o la inserción de grupos invalida la ruta.
- **Layer ID + cadena de Match Names:** resiste el renombrado visible y parte del reordenamiento, pero no distingue hermanos duplicados con los mismos Match Names.
- **Layer ID + Unique Stream ID:** resiste renombrado y reordenamiento durante el contexto en que el ID es válido; no existe búsqueda inversa directa por ID y su persistencia entre sesiones no está documentada.
- **Datos capturados por CEP:** permiten una selección explícita y transportar una identidad compuesta, pero duplicaciones y reapertura exigen volver a validar el objetivo contra el proyecto.

La investigación posterior del DOM confirmó que CEP no puede obtener `uniqueStreamId`. Por ello `CF_GeometryTargetIdentity`, el Locator y el Reader permanecen como infraestructura secundaria de validación, pero dejan de ser el camino principal propuesto. Ninguna ruta deberá elegir automáticamente el primer path, el visible o el aparentemente único.

#### Geometry Target Identity Transport

`CF_GeometryTargetState` define el payload lógico que viaja entre el almacenamiento por instancia y la integración nativa. Contiene una versión de esquema y `CF_GeometryTargetIdentity`; es un bloque de datos simples, serializable y libre de handles, punteros o referencias del SDK. Los parámetros ocultos alimentan este estado y una compuerta explícita controla si puede llegar al discovery adapter.

Alternativas evaluadas con el SDK local:

- **Parámetros nativos ocultos:** After Effects guarda los valores con la instancia, los incluye al duplicar o copiar el efecto y los entrega como snapshots de render compatibles con MFR. Parámetros escalares pueden transportar versión, validez, Layer ID y Unique Stream ID cuando otra integración ya dispone de esos valores. CEP puede dirigirse a propiedades del efecto mediante scripting, pero el DOM no le proporciona el Unique Stream ID.
- **Parámetro de datos arbitrarios:** `PF_Param_ARBITRARY_DATA` admite copia, flatten, unflatten, comparación, impresión y lectura mediante `PF_Cmd_ARBITRARY_CALLBACK`. Es persistente y versionable, pero exige implementar el ciclo completo de callbacks y los datos opacos no ofrecen un canal sencillo y oficialmente confirmado para escritura desde CEP.
- **Sequence data:** pertenece a una instancia y su contenido puede escribirse al proyecto. Para MFR debe tratarse como solo lectura durante render mediante `PF_EffectSequenceDataSuite` y soportar flatten/resetup, incluyendo `PF_OutFlag2_SUPPORTS_GET_FLATTENED_SEQUENCE_DATA` cuando corresponda. CEP no dispone en el SDK revisado de acceso directo a ese bloque; sincronizarlo desde scripting necesitaría otro canal.
- **AEGP Persistent Data Suite:** `AEGP_PersistentDataSuite4` guarda strings, enteros y datos binarios, pero el propio header indica que el host persistente actual es la aplicación. No representa estado por instancia y produciría colisiones entre efectos, capas o proyectos.
- **Scripting o CEP sin almacenamiento nativo:** puede capturar y enviar datos durante una sesión, pero no garantiza disponibilidad en render, Render Queue, reapertura o cuando la extensión está cerrada.

El estado de identidad se transporta mediante parámetros nativos escalares ocultos, no animables y con Match Names internos estables: `version`, `isValid`, `layerId` y `uniqueStreamId`. El AEX construye un `CF_GeometryTargetState` inmutable y el Target Locator consume únicamente `targetIdentity`. Tras la investigación CEP, este canal permanece como infraestructura secundaria porque ExtendScript no puede completar `uniqueStreamId`.

Los parámetros y Disk IDs de identidad ya fueron añadidos al final del contrato y deben permanecer estables. La versión permite rechazar estados incompatibles y migrar representaciones futuras sin interpretar datos antiguos como válidos. Phase 5.1 no añade ni modifica parámetros.

Al duplicar una capa, After Effects copiará los valores transportados, pero la nueva capa o sus streams pueden recibir otros IDs; el locator debe invalidar el estado hasta que CEP capture nuevamente el objetivo. Copiar el efecto dentro de la misma capa puede conservar una identidad válida, siempre sujeta a verificación. Tras reabrir el proyecto, los parámetros persistirán, pero Layer ID y Unique Stream ID deberán validarse porque el SDK no garantiza explícitamente la persistencia del Unique Stream ID entre sesiones.

Con los valores predeterminados, `Render()` obtiene una identidad inválida y el Locator retorna antes de adquirir suites. Rectangle Source permanece desactivado y Layer Bounds continúa siendo el fallback.

#### Hidden Target Parameters

El transporte por instancia dispone de cuatro parámetros nativos añadidos al final del contrato:

| Índice | Nombre interno estable | Disk ID | Tipo | Valor inicial |
|---|---|---:|---|---:|
| `CORNERFLEX_TARGET_STATE_VERSION` | `Target State Version` | 7 | `PF_Param_SLIDER` | 1 |
| `CORNERFLEX_TARGET_IDENTITY_VALID` | `Target Identity Valid` | 8 | `PF_Param_CHECKBOX` | 0 |
| `CORNERFLEX_TARGET_LAYER_ID` | `Target Layer ID` | 9 | `PF_Param_SLIDER` | 0 |
| `CORNERFLEX_TARGET_UNIQUE_STREAM_ID` | `Target Unique Stream ID` | 10 | `PF_Param_SLIDER` | 0 |

Los cuatro parámetros utilizan `PF_PUI_INVISIBLE`, `PF_ParamFlag_CANNOT_TIME_VARY`, `PF_ParamFlag_CANNOT_INTERP` y `PF_ParamFlag_USE_VALUE_FOR_OLD_PROJECTS`. De esta forma no aparecen en Effect Controls ni Timeline, no son animables y los proyectos anteriores reciben defaults inactivos. El SDK de efectos no expone en `PF_ParamDef` un campo independiente para Match Name de parámetro; por ello estos nombres exactos, no localizados, constituyen los identificadores internos estables que deberá validar la integración CEP.

`A_long` y `AEGP_LayerIDVal` son alias de `int32_t`; `PF_ParamValue`, usado por `PF_Param_SLIDER`, también es `A_long`. Los sliders de IDs admiten el rango completo `INT32_MIN` a `INT32_MAX`, por lo que no truncan ni convierten los identificadores. La versión utiliza el rango no negativo y el checkbox normaliza validez a `TRUE` o `FALSE`.

`ReadGeometryTargetState()` limpia el resultado, lee los cuatro parámetros y considera válida la identidad únicamente si:

1. `version == CF_GEOMETRY_TARGET_STATE_VERSION`;
2. `Target Identity Valid` está activado;
3. `layerId != AEGP_LayerIDVal_NONE`;
4. `uniqueStreamId != 0`.

La función no consulta suites, no localiza streams y no produce efectos secundarios. `Render()` construye el estado almacenado y lo entrega a la compuerta de activación. Con los defaults, el Target Locator no recorre streams; Rectangle Source sigue desactivado y Layer Bounds permanece como ruta activa.

#### Target State Activation Gate

`GetActiveGeometryTargetIdentity()` es la frontera explícita entre almacenamiento y ejecución. Es una función pura: limpia inicialmente su resultado y solo devuelve una identidad activa cuando la versión coincide con `CF_GEOMETRY_TARGET_STATE_VERSION`, `targetState.targetIdentity.isValid` es `TRUE`, `layerId` no es `AEGP_LayerIDVal_NONE` y `uniqueStreamId` no es cero.

`Render()` sigue el flujo `ReadGeometryTargetState()` → `GetActiveGeometryTargetIdentity()` → `DiscoverRectangleSourceFromAfterEffects()`. Ya no crea una identidad artificial independiente. Con los defaults (`version = 1`, `isValid = 0`, IDs en cero), la compuerta devuelve una identidad inválida y `LocateGeometryTargetInAfterEffects()` retorna inmediatamente sin adquirir suites ni recorrer streams.

Cuando los parámetros contienen un estado válido, la compuerta permite que el discovery adapter ejecute el Locator. La localización resultante continúa siendo metadata observacional: no se convierte en `CF_RectangleSourceData`, no se leen propiedades y `rectangleSource.isAvailable` permanece en `FALSE`. Activar identidad no significa activar geometría.

El Locator no añade estado global mutable: todas las suites y referencias son locales a la llamada, y el Plugin ID existente se inicializa en `GlobalSetup()` y después se usa como dato inmutable. CornerFlex no declara actualmente `PF_OutFlag2_SUPPORTS_THREADED_RENDERING`; la futura habilitación explícita de MFR requerirá confirmar con Adobe la seguridad concurrente de las suites AEGP usadas por el recorrido. Layer Bounds continúa siendo la única fuente geométrica activa.

#### Geometry Target Locator

Identity, Location y Geometry Source representan responsabilidades distintas:

- `CF_GeometryTargetIdentity` describe qué stream se desea encontrar.
- `CF_GeometryTargetLocation` informa si el stream fue localizado y si pudo validarse como Rectangle Path, sin conservar referencias del SDK.
- `CF_RectangleSourceData` contendrá la geometría cuando exista un Geometry Reader; localizar un target no activa esta fuente.

`LocateGeometryTargetInAfterEffects()` retorna inmediatamente un resultado limpio cuando la identidad no es válida. Para una identidad válida, obtiene la capa del efecto mediante `AEGP_PFInterfaceSuite1`, compara su ID con `targetIdentity.layerId`, obtiene el grupo raíz con `AEGP_DynamicStreamSuite4` y recorre sus hijos por índice. Cada candidato se compara mediante `AEGP_StreamSuite6::AEGP_GetUniqueStreamID()`. El recorrido está limitado a 32 niveles y no selecciona otro path cuando el objetivo no aparece.

CornerFlex registra un `AEGP_PluginID` durante `GlobalSetup()` porque las APIs que crean referencias de streams requieren ese identificador. Cada `AEGP_StreamRefH` hijo se libera antes de continuar y el stream raíz se libera antes de retornar. Los handles de capa son referencias prestadas y no se almacenan. El resultado solo conserva `wasFound`, `isRectanglePath` y `uniqueStreamId`.

Al encontrar el Unique Stream ID se consulta el Match Name mediante `AEGP_GetMatchName()`. Los headers y ejemplos del SDK 2025 revisados no exponen una constante oficial para el Match Name de Rectangle Path. Por ello CornerFlex no introduce un literal no verificado: el target puede marcarse como encontrado, pero `isRectanglePath` permanece en `FALSE`. Esta limitación impide validar o leer la geometría en esta fase.

`DiscoverRectangleSourceFromAfterEffects()` llama al localizador, pero continúa devolviendo `isAvailable = FALSE`. Layer Bounds sigue siendo la única fuente activa y no se leen Size, Position, Roundness, dirección, transformaciones ni valores temporales.

#### Rectangle Geometry Reader

Location, Raw Properties y Rectangle Source son contratos distintos:

- `CF_GeometryTargetLocation` indica si el stream objetivo fue encontrado y validado.
- `CF_RectanglePathProperties` representa exclusivamente valores crudos: `sizeX`, `sizeY`, `positionX`, `positionY` y `roundness`, además de `wasRead`.
- `CF_RectangleSourceData` representa una fuente geométrica utilizable. Las propiedades crudas no contienen bounds y no activan esta fuente.

`ReadRectanglePathPropertiesFromAfterEffects()` es el punto de entrada interno del Reader. Recibe el contexto de render, la identidad y la localización, inicializa siempre un resultado limpio y exige identidad válida, localización encontrada, validación Rectangle Path y coincidencia de Unique Stream ID. No almacena `AEGP_StreamRefH`, handles ni punteros.

La búsqueda en todos los headers y ejemplos oficiales locales del SDK 2025 no encontró constantes ni literales oficiales para el grupo Rectangle Path, Size, Position, Roundness o Direction. Por ello el Locator no puede establecer `isRectanglePath = TRUE` de forma verificable y el Reader mantiene `wasRead = FALSE`. No vuelve a recorrer streams, no interpreta propiedades por índice y no usa nombres visibles o localizados.

Cuando existan Match Names oficiales verificados, el Reader deberá volver a localizar temporalmente el stream —o compartir un helper de recorrido acotado—, encontrar cada propiedad por Match Name, comprobar `AEGP_StreamType_TwoD` o `AEGP_StreamType_TwoD_SPATIAL` para Size y Position, y `AEGP_StreamType_OneD` para Roundness. Después deberá evaluar mediante `AEGP_StreamSuite6::AEGP_GetNewStreamValue()` y balancear `AEGP_DisposeStreamValue()` y `AEGP_DisposeStream()` dentro de la misma llamada.

Durante `PF_Cmd_RENDER`, `AEGP_GetLayerCurrentTime()` no es apropiado porque el header indica que no se actualiza durante render. La evaluación futura deberá construir el tiempo de capa con `PF_InData::current_time` y `PF_InData::time_scale` y usar `AEGP_LTimeMode_LayerTime`; solo deberá convertir a tiempo de composición con `AEGP_ConvertEffectToCompTime()` si una operación posterior requiere explícitamente ese espacio temporal. En esta fase no se evalúa ningún valor.

Los valores previstos son locales y crudos al Rectangle Path. No incluyen transformaciones del grupo o capa, anchor, escala, rotación, skew ni conversión a composición o mundo. `DiscoverRectangleSourceFromAfterEffects()` descarta el resultado del Reader y mantiene `rectangleSource.isAvailable = FALSE`; Layer Bounds continúa siendo la única ruta activa.

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

### CEP Geometry Discovery

Esta fase separa el descubrimiento realizado por CEP/ExtendScript de la resolución nativa. El SDK local 2025 no incluye scripts `.jsx` ni documentación del DOM de ExtendScript con los Match Names de Shape Layers; esos datos se contrastaron con la guía pública de scripting de After Effects. Antes de conectar el transporte con After Effects 2026 deberá ejecutarse una prueba de inspección en la aplicación objetivo para confirmar los tipos de valor y la equivalencia entre `Layer.id` y cualquier identificador de capa usado por AEGP.

CEP y ExtendScript se ejecutan en contextos distintos. El panel debe invocar una función JSX mediante `CSInterface.evalScript()`; esa función accede al DOM de After Effects, valida la selección y devuelve únicamente datos serializables.

#### Jerarquía y Match Names

Una Rectangle Path puede existir directamente en `Contents` o dentro de uno o más Shape Groups:

```text
Shape Layer                         ADBE Vector Layer
└─ Contents                         ADBE Root Vectors Group
   ├─ Rectangle Path                ADBE Vector Shape - Rect
   └─ Group                         ADBE Vector Group
      └─ Contents                   ADBE Vectors Group
         └─ Rectangle Path          ADBE Vector Shape - Rect
            ├─ Direction            ADBE Vector Shape Direction
            ├─ Size                 ADBE Vector Rect Size
            ├─ Position             ADBE Vector Rect Position
            └─ Roundness            ADBE Vector Rect Roundness
```

Los Match Names confirmados son:

| Elemento | Match Name |
| --- | --- |
| Shape Layer | `ADBE Vector Layer` |
| Contents raíz | `ADBE Root Vectors Group` |
| Shape Group | `ADBE Vector Group` |
| Contents de un grupo | `ADBE Vectors Group` |
| Rectangle Path | `ADBE Vector Shape - Rect` |
| Direction | `ADBE Vector Shape Direction` |
| Size | `ADBE Vector Rect Size` |
| Position | `ADBE Vector Rect Position` |
| Roundness | `ADBE Vector Rect Roundness` |

`matchName` es estable y no localizado, por lo que debe usarse en lugar del nombre visible. `Size` y `Position` exponen valores bidimensionales; `Roundness` y `Direction`, valores escalares. La integración debe comprobar `propertyValueType` antes de interpretar cada valor. Para capturar el estado evaluado en el tiempo actual, debe usar `valueAtTime(comp.time, false)`; `comp.time` está expresado en segundos y `false` incluye el resultado de expresiones.

#### Descubrimiento desde la selección

El flujo recomendado es:

1. Obtener `app.project.activeItem` y verificar que sea una `CompItem`.
2. Exigir una única capa seleccionada y comprobar que su `matchName` sea `ADBE Vector Layer`.
3. Examinar `layer.selectedProperties`.
4. Para cada propiedad seleccionada, recorrer sus ancestros mediante `propertyGroup(1)` hasta encontrar `ADBE Vector Shape - Rect`.
5. Deduplicar los resultados por su ruta jerárquica.
6. Continuar únicamente si existe un Rectangle Path objetivo inequívoco.
7. Localizar `Size`, `Position`, `Roundness` y, si se necesita, `Direction` por Match Name, nunca por nombre visible ni por una posición fija entre sus propiedades.

Prototipo conceptual del recorrido:

```javascript
function findRectangleAncestor(propertyBase) {
    var current = propertyBase;

    while (current) {
        if (current.matchName === "ADBE Vector Shape - Rect") {
            return current;
        }
        current = current.propertyDepth > 0
            ? current.propertyGroup(1)
            : null;
    }

    return null;
}
```

`selectedProperties` sirve para capturar la intención actual del usuario, pero no es identidad persistente. CornerFlex no debe elegir automáticamente el primer Rectangle Path, el visible o el único aparente cuando la selección sea ambigua.

#### Identidad y serialización

El DOM ofrece `Layer.id`, persistente al guardar y reabrir el proyecto, y `app.project.layerByID()` para recuperar la capa. Al importar el proyecto dentro de otro proyecto, After Effects asigna nuevos IDs. Para propiedades, el DOM no expone un UUID, Persistent ID ni el `Unique Stream ID` utilizado por AEGP.

Dos Rectangle Paths hermanos tienen los mismos Match Names. Se distinguen en el estado actual mediante sus `propertyIndex` dentro de cada grupo indexado. La ruta debe registrar tanto el índice como el Match Name esperado y validarlos al resolverla:

```text
schemaVersion
layerId
rootMatchName
propertyPath[]
    propertyIndex
    matchName
```

Los grupos nombrados se resuelven por Match Name; el índice se conserva para los elementos contenidos en grupos indexados. Una representación serializable conceptual es:

```json
{
  "schemaVersion": 1,
  "layerId": 42,
  "rootMatchName": "ADBE Root Vectors Group",
  "propertyPath": [
    { "propertyIndex": 2, "matchName": "ADBE Vector Group" },
    { "matchName": "ADBE Vectors Group" },
    { "propertyIndex": 3, "matchName": "ADBE Vector Shape - Rect" }
  ]
}
```

| Estrategia | Ventaja | Limitación |
| --- | --- | --- |
| `Layer.id` | Persiste al guardar y reabrir; no depende del nombre | No identifica una propiedad y cambia al importar el proyecto |
| Cadena de Match Names | Resiste renombrado y localización | No distingue hermanos del mismo tipo |
| Cadena de `propertyIndex` | Distingue hermanos en el estado actual | Cambia al insertar, eliminar o reordenar grupos |
| `Layer.id` + índices + Match Names | Mejor identidad disponible en el DOM; permite validar cada segmento | Es una ruta validable, no un ID permanente de propiedad |
| `selectedProperties` | Representa directamente la intención del usuario al capturar | No persiste y no está disponible como selección fiable durante render |
| Nombres visibles | Ninguna ventaja técnica para identidad | Son renombrables y localizados; no deben utilizarse |

La estrategia recomendada para CEP es `Layer.id` más una cadena jerárquica de índices y Match Names. Si un segmento ya no coincide, la identidad debe considerarse obsoleta; no debe buscarse automáticamente otro Rectangle Path.

#### Transporte propuesto hacia el AEX

El panel puede proporcionar dos clases de datos simples:

- identidad DOM versionada: `layerId` y ruta jerárquica validada;
- propiedades crudas evaluadas: `Size`, `Position`, `Roundness`, `Direction` y tiempo de captura.

El contrato oculto actual del AEX (`layerId` + `uniqueStreamId`) no puede completarse de forma fiable solo con ExtendScript porque el DOM no expone `uniqueStreamId`. Por tanto, no debe realizarse una conversión inventada entre `propertyIndex` y `uniqueStreamId`.

Phase 5.1 adopta como dirección principal un snapshot versionado de propiedades evaluadas. En esta fase se define únicamente su estructura y validación; el transporte mediante parámetros nativos y la sincronización con propiedades animadas quedan pendientes. La ruta DOM y el Locator permanecen disponibles como mecanismos secundarios de validación.

Limitaciones actuales:

- la jerarquía por índices deja de ser válida al reordenar, insertar, eliminar o duplicar grupos;
- duplicar una capa o un Shape Group produce una identidad distinta o ambigua que debe recapturarse;
- `Layer.id` debe validarse experimentalmente contra el identificador de capa usado por AEGP antes de cruzar ambos APIs;
- los valores crudos de Rectangle Path todavía no incluyen transformaciones de grupo o capa;
- la selección múltiple requiere una decisión explícita del usuario;
- `Rectangle Source` continúa desactivado y `Layer Bounds` sigue siendo la fuente activa.

Referencias consultadas: [Shape Layer Match Names](https://ae-scripting.docsforadobe.dev/matchnames/layer/shapelayer/), [PropertyBase](https://ae-scripting.docsforadobe.dev/property/propertybase/), [PropertyGroup](https://ae-scripting.docsforadobe.dev/property/propertygroup/), [Property](https://ae-scripting.docsforadobe.dev/property/property/), [Layer](https://ae-scripting.docsforadobe.dev/layer/layer/), [CompItem](https://ae-scripting.docsforadobe.dev/item/compitem/), [Project](https://ae-scripting.docsforadobe.dev/general/project/) y [Adobe CEP HTML Extension Cookbook](https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_12.x/Documentation/CEP%2012%20HTML%20Extension%20Cookbook.md).

### Geometry Snapshot Provider

CEP es el proveedor primario propuesto para la geometría objetivo: identifica el Rectangle Path seleccionado, evalúa sus propiedades mediante el DOM y prepara un snapshot de datos simples. El AEX será el consumidor y validador de ese snapshot. CornerFlex Core recibirá geometría resuelta, nunca objetos DOM, handles, punteros ni referencias AEGP.

Identity y Geometry Snapshot cumplen contratos diferentes:

- **Identity** describe qué propiedad se desea localizar y puede utilizarse para validación secundaria.
- **Geometry Snapshot** contiene el estado evaluado de la primitiva en un instante y no requiere volver a descubrir la propiedad durante render.

#### Rectangle Geometry Snapshot

`CF_RectangleGeometrySnapshot` es un payload versionado, serializable y libre de referencias del host:

| Campo | Semántica |
| --- | --- |
| `version` | Versión del contrato; la versión inicial soportada es `CF_RECTANGLE_GEOMETRY_SNAPSHOT_VERSION = 1`. |
| `isValid` | Indica que CEP obtuvo un snapshot completo y coherente. |
| `sizeX`, `sizeY` | Dimensiones crudas evaluadas de Rectangle Path. |
| `positionX`, `positionY` | Posición cruda evaluada dentro del Shape Group inmediato. |
| `roundness` | Valor crudo evaluado de Roundness. |
| `direction` | Entero transportado desde `ADBE Vector Shape Direction`. |

La estructura no contiene bounds derivados, `propertyIndex`, Match Names, punteros, handles ni referencias del SDK. Tampoco depende del DOM o de AEGP y se transporta mediante parámetros nativos ocultos.

`MakeInvalidRectangleGeometrySnapshot()` limpia todos los campos, asigna la versión soportada y mantiene `isValid = FALSE`. `ValidateRectangleGeometrySnapshot()` es una función pura que exige:

- versión compatible;
- `isValid = TRUE`;
- valores finitos para Size, Position y Roundness;
- `sizeX >= 0` y `sizeY >= 0`.

La validación utiliza `std::isfinite` de la biblioteca estándar de C++. No normaliza, limita ni corrige valores. Los headers locales y la documentación oficial revisada no publican un rango numérico verificable para `ADBE Vector Shape Direction`; por ello `direction` se conserva como entero y todavía no participa en la decisión de validez. Ese rango deberá confirmarse mediante una fuente oficial o una prueba controlada antes de imponerlo.

Los valores pertenecen al sistema de coordenadas crudo del Rectangle Path y todavía no incluyen:

- transformaciones del Shape Group inmediato;
- transformaciones de grupos ancestros;
- transformaciones de capa;
- anchor;
- scale;
- rotation;
- skew;
- coordenadas de composición;
- coordenadas de mundo.

#### Snapshot Transport Parameters

El efecto reserva ocho parámetros persistentes al final del contrato existente:

| Índice | Nombre interno estable | Disk ID | Tipo | Rango válido | Default |
| ---: | --- | ---: | --- | --- | ---: |
| 11 | `Rectangle Snapshot Version` | 11 | `PF_Param_SLIDER` | `0`–`INT32_MAX` | `1` |
| 12 | `Rectangle Snapshot Valid` | 12 | `PF_Param_CHECKBOX` | booleano | `0` |
| 13 | `Rectangle Snapshot Size X` | 13 | `PF_Param_FLOAT_SLIDER` | `0`–`FLT_MAX` | `0` |
| 14 | `Rectangle Snapshot Size Y` | 14 | `PF_Param_FLOAT_SLIDER` | `0`–`FLT_MAX` | `0` |
| 15 | `Rectangle Snapshot Position X` | 15 | `PF_Param_FLOAT_SLIDER` | `-FLT_MAX`–`FLT_MAX` | `0` |
| 16 | `Rectangle Snapshot Position Y` | 16 | `PF_Param_FLOAT_SLIDER` | `-FLT_MAX`–`FLT_MAX` | `0` |
| 17 | `Rectangle Snapshot Roundness` | 17 | `PF_Param_FLOAT_SLIDER` | `0`–`FLT_MAX` | `0` |
| 18 | `Rectangle Snapshot Direction` | 18 | `PF_Param_SLIDER` | `INT32_MIN`–`INT32_MAX` | `0` |

Todos usan `PF_PUI_INVISIBLE`, `PF_ParamFlag_CANNOT_TIME_VARY`, `PF_ParamFlag_CANNOT_INTERP` y `PF_ParamFlag_USE_VALUE_FOR_OLD_PROJECTS`. No aparecen en Effect Controls, no se animan ni interpolan y los proyectos anteriores reciben `version = 1`, valores geométricos en cero e `isValid = FALSE`.

`PF_FloatSliderDef::value` utiliza `PF_FpLong`, que en el SDK local es `double`; por ello Size, Position y Roundness se leen sin convertirlos a entero o `float`. Los límites descriptivos de `PF_FloatSliderDef` son `PF_FpShort`, equivalente a `float`, y usan su rango completo mediante `FLT_MAX`. `PF_Precision_TEN_THOUSANDTHS` solo controla la presentación y no modifica el valor almacenado.

`ReadRectangleGeometrySnapshot()` comienza con `MakeInvalidRectangleGeometrySnapshot()`, lee los ocho parámetros, normaliza únicamente el checkbox a `TRUE` o `FALSE` y conserva los demás valores crudos. Después `Render()` llama a `ValidateRectangleGeometrySnapshot()`, pero descarta el resultado de forma explícita.

El almacenamiento pertenece a la instancia del efecto y se conserva al guardar el proyecto. Al duplicar una capa o copiar el efecto, After Effects copia también sus parámetros; el snapshot duplicado continúa sujeto a la misma versión y validación.

La lectura no se conecta con discovery, `CF_RectangleSourceData`, resolvers, contextos geométricos, operaciones o renderer. Incluso un snapshot válido introducido manualmente se descarta: `Rectangle Source` permanece desactivado y Layer Bounds continúa siendo la única fuente geométrica activa.

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
- `CF_RectangleGeometry`;
- `CF_CornerRadii`;
- `CF_GeometryTargetIdentity`;
- `CF_GeometryTargetState`;
- `CF_GeometryTargetLocation`;
- `CF_RectanglePathProperties`;
- `CF_RectangleGeometrySnapshot`;
- `CF_RectangleSourceData`;
- `CF_GeometryResolveRequest`;
- `CF_GeometrySourceData`;
- `CF_GeometryContext`;
- `CF_RenderContext`;
- `ResolveLayerBoundsGeometry()`;
- `ResolveRectangleGeometry()`;
- `ResolveGeometrySource()`;
- `DiscoverRectangleSourceFromAfterEffects()` como adaptador seguro todavía desactivado;
- `MakeInvalidRectangleGeometrySnapshot()`;
- `ValidateRectangleGeometrySnapshot()`;
- `ReadRectangleGeometrySnapshot()`;
- `BuildRectangleGeometry()`;
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
