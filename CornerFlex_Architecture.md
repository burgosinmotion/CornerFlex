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

`CF_RectangleGeometry` representa una primitiva rectangular mediante bounds, ancho, alto y centro. Es información geométrica independiente de APIs, selecciones o streams de After Effects. `BuildGeometryContext()` construye esta representación a partir de la fuente resuelta; Layer Bounds continúa siendo la fuente predeterminada cuando no existe un snapshot rectangular habilitado y válido.

#### Base Primitive Geometry

`BuildRectangleGeometry()` construye `CF_RectangleGeometry` exclusivamente desde un `CF_Rect`. Esta representación es una instantánea estable de la primitiva base previa a las operaciones. Las operaciones geométricas no deben modificarla.

#### Oriented Primitive Foundation

`CF_Vector2` es un POD para puntos o vectores 2D. `CF_AffineTransform2D` representa exclusivamente una transformación affine 2D, sin suites, handles, ownership, 3D, cámara o espacio mundo. Su convención es:

```text
x' = a*x + c*y + tx
y' = b*x + d*y + ty
```

`CF_OrientedRectangle` describe una primitive rectangular orientable mediante `center`, dos ejes locales y dimensiones medias. En Phase 5.12B los ejes se tratan como basis vectors transformados: pueden incluir la parte lineal de Scale/Rotation y no se asume que sean unitarios después de una transformación affine. `halfWidth` y `halfHeight` permanecen positivos y describen la primitive antes de proyectar sus ejes.

`ComputeOrientedRectangleAABB()` calcula un `CF_Rect` de contención a partir de los cuatro vértices derivados de la primitive orientada. Ese AABB no representa la primitive; solo es metadata de bounds. El pixel renderer de Phase 5.12B continúa consumiendo la ruta axis-aligned validada en Phase 5.11, por lo que Rotation distinta de cero sigue en fallback.

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

Layer Bounds continúa siendo el fallback actual, con `CF_GEOMETRY_SOURCE_LAYER_BOUNDS`, `CF_PRIMITIVE_UNKNOWN` e `isFallback = TRUE`. El proveedor CEP puede suministrar manualmente un snapshot de Rectangle Path; Ellipse Path, Bézier Path y otras fuentes todavía no están integradas. Las operaciones geométricas consumen `CF_GeometryContext` y permanecen independientes del origen de la geometría.

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

`Render()` puede entregar un Rectangle Source derivado del snapshot únicamente detrás de `Rectangle Snapshot Enabled`, una compuerta persistente y desactivada por defecto. Cuando la compuerta o el snapshot no son válidos, `ResolveLayerBoundsGeometry()` continúa siendo el fallback automático. Las fuentes futuras deberán cumplir el mismo contrato y devolver `CF_GeometrySourceData`. Las operaciones geométricas permanecen independientes del selector, del resolver y del origen.

#### After Effects Geometry Adapter

La capa **AE Integration** traduce datos del host a contratos simples del Core. `DiscoverRectangleSourceFromAfterEffects()` es el punto de adaptación inicial para una Rectangle Path candidata: recibe el contexto mínimo disponible del efecto y siempre inicializa un `CF_RectangleSourceData` seguro. El Core geométrico no consulta suites, streams, Shape Layers ni selección.

#### Rectangle Source Discovery

El SDK incluido expone `AEGP_PFInterfaceSuite1::AEGP_GetEffectLayer()` durante `PF_Cmd_RENDER` para obtener la capa que contiene el efecto. También ofrece `AEGP_DynamicStreamSuite4` para recorrer grupos y localizar streams por índice o Match Name, y `AEGP_StreamSuite6` para consultar tipos y valores de propiedades. Estas APIs permitirían inspeccionar grupos de contenido y propiedades equivalentes a Size, Position y Roundness una vez definido un objetivo inequívoco.

El SDK también permite obtener la selección de una composición mediante `AEGP_GetNewCollectionFromCompSelection()` y representar elementos `STREAMREF` en `AEGP_CollectionSuite2`. Sin embargo, esa selección pertenece a la composición activa de la interfaz y no constituye una identidad estable ni fiable del path objetivo durante el render. `AEGP_LayerSuite9::AEGP_GetActiveLayer()` solo informa una capa activa y una Shape Layer puede contener varios grupos y Rectangle Paths. Para evitar una elección implícita, el adaptador no adquiere suites ni recorre streams en esta fase.

`DiscoverRectangleSourceFromAfterEffects()` devuelve actualmente `isAvailable = FALSE`; no genera bounds simulados ni retiene referencias del SDK. Por sí solo no puede activar Rectangle Source: cuando el Snapshot Source tampoco está habilitado y disponible, `ResolveGeometrySource()` selecciona Layer Bounds. Para activar el proveedor de discovery será necesario proporcionar una identidad estable del path objetivo —por ejemplo, capturada explícitamente por la extensión— y definir su sistema de coordenadas y tiempo de evaluación.

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

El Locator no añade estado global mutable: todas las suites y referencias son locales a la llamada, y el Plugin ID existente se inicializa en `GlobalSetup()` y después se usa como dato inmutable. CornerFlex no declara actualmente `PF_OutFlag2_SUPPORTS_THREADED_RENDERING`; la futura habilitación explícita de MFR requerirá confirmar con Adobe la seguridad concurrente de las suites AEGP usadas por el recorrido. El Locator no activa geometría; con la compuerta del snapshot en su default, Layer Bounds continúa siendo la fuente activa.

#### Geometry Target Locator

Identity, Location y Geometry Source representan responsabilidades distintas:

- `CF_GeometryTargetIdentity` describe qué stream se desea encontrar.
- `CF_GeometryTargetLocation` informa si el stream fue localizado y si pudo validarse como Rectangle Path, sin conservar referencias del SDK.
- `CF_RectangleSourceData` contendrá la geometría cuando exista un Geometry Reader; localizar un target no activa esta fuente.

`LocateGeometryTargetInAfterEffects()` retorna inmediatamente un resultado limpio cuando la identidad no es válida. Para una identidad válida, obtiene la capa del efecto mediante `AEGP_PFInterfaceSuite1`, compara su ID con `targetIdentity.layerId`, obtiene el grupo raíz con `AEGP_DynamicStreamSuite4` y recorre sus hijos por índice. Cada candidato se compara mediante `AEGP_StreamSuite6::AEGP_GetUniqueStreamID()`. El recorrido está limitado a 32 niveles y no selecciona otro path cuando el objetivo no aparece.

CornerFlex registra un `AEGP_PluginID` durante `GlobalSetup()` porque las APIs que crean referencias de streams requieren ese identificador. Cada `AEGP_StreamRefH` hijo se libera antes de continuar y el stream raíz se libera antes de retornar. Los handles de capa son referencias prestadas y no se almacenan. El resultado solo conserva `wasFound`, `isRectanglePath` y `uniqueStreamId`.

Al encontrar el Unique Stream ID se consulta el Match Name mediante `AEGP_GetMatchName()`. Los headers y ejemplos del SDK 2025 revisados no exponen una constante oficial para el Match Name de Rectangle Path. Por ello CornerFlex no introduce un literal no verificado: el target puede marcarse como encontrado, pero `isRectanglePath` permanece en `FALSE`. Esta limitación impide validar o leer la geometría en esta fase.

`DiscoverRectangleSourceFromAfterEffects()` llama al localizador, pero continúa devolviendo `isAvailable = FALSE`. Esta ruta no activa Rectangle Source ni lee Size, Position, Roundness, dirección, transformaciones o valores temporales. Con Snapshot Source deshabilitado, el resolver utiliza Layer Bounds.

#### Rectangle Geometry Reader

Location, Raw Properties y Rectangle Source son contratos distintos:

- `CF_GeometryTargetLocation` indica si el stream objetivo fue encontrado y validado.
- `CF_RectanglePathProperties` representa exclusivamente valores crudos: `sizeX`, `sizeY`, `positionX`, `positionY` y `roundness`, además de `wasRead`.
- `CF_RectangleSourceData` representa una fuente geométrica utilizable. Las propiedades crudas no contienen bounds y no activan esta fuente.

`ReadRectanglePathPropertiesFromAfterEffects()` es el punto de entrada interno del Reader. Recibe el contexto de render, la identidad y la localización, inicializa siempre un resultado limpio y exige identidad válida, localización encontrada, validación Rectangle Path y coincidencia de Unique Stream ID. No almacena `AEGP_StreamRefH`, handles ni punteros.

La búsqueda en todos los headers y ejemplos oficiales locales del SDK 2025 no encontró constantes ni literales oficiales para el grupo Rectangle Path, Size, Position, Roundness o Direction. Por ello el Locator no puede establecer `isRectanglePath = TRUE` de forma verificable y el Reader mantiene `wasRead = FALSE`. No vuelve a recorrer streams, no interpreta propiedades por índice y no usa nombres visibles o localizados.

Cuando existan Match Names oficiales verificados, el Reader deberá volver a localizar temporalmente el stream —o compartir un helper de recorrido acotado—, encontrar cada propiedad por Match Name, comprobar `AEGP_StreamType_TwoD` o `AEGP_StreamType_TwoD_SPATIAL` para Size y Position, y `AEGP_StreamType_OneD` para Roundness. Después deberá evaluar mediante `AEGP_StreamSuite6::AEGP_GetNewStreamValue()` y balancear `AEGP_DisposeStreamValue()` y `AEGP_DisposeStream()` dentro de la misma llamada.

Durante `PF_Cmd_RENDER`, `AEGP_GetLayerCurrentTime()` no es apropiado porque el header indica que no se actualiza durante render. La evaluación futura deberá construir el tiempo de capa con `PF_InData::current_time` y `PF_InData::time_scale` y usar `AEGP_LTimeMode_LayerTime`; solo deberá convertir a tiempo de composición con `AEGP_ConvertEffectToCompTime()` si una operación posterior requiere explícitamente ese espacio temporal. En esta fase no se evalúa ningún valor.

Los valores previstos son locales y crudos al Rectangle Path. No incluyen transformaciones del grupo o capa, anchor, escala, rotación, skew ni conversión a composición o mundo. `DiscoverRectangleSourceFromAfterEffects()` descarta el resultado del Reader y mantiene `rectangleSource.isAvailable = FALSE`; por esta ruta no entra geometría y, con Snapshot Source deshabilitado, Layer Bounds continúa activo.

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

El efecto reserva nueve parámetros persistentes al final del contrato existente:

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
| 19 | `Rectangle Snapshot Enabled` | 19 | `PF_Param_CHECKBOX` | booleano | `0` |

Todos usan `PF_PUI_INVISIBLE`, `PF_ParamFlag_CANNOT_TIME_VARY`, `PF_ParamFlag_CANNOT_INTERP` y `PF_ParamFlag_USE_VALUE_FOR_OLD_PROJECTS`. No aparecen en Effect Controls, no se animan ni interpolan y los proyectos anteriores reciben `version = 1`, valores geométricos en cero, `isValid = FALSE` y `Rectangle Snapshot Enabled = FALSE`.

`PF_FloatSliderDef::value` utiliza `PF_FpLong`, que en el SDK local es `double`; por ello Size, Position y Roundness se leen sin convertirlos a entero o `float`. Los límites descriptivos de `PF_FloatSliderDef` son `PF_FpShort`, equivalente a `float`, y usan su rango completo mediante `FLT_MAX`. `PF_Precision_TEN_THOUSANDTHS` solo controla la presentación y no modifica el valor almacenado.

`ReadRectangleGeometrySnapshot()` comienza con `MakeInvalidRectangleGeometrySnapshot()`, lee los ocho campos del snapshot, normaliza únicamente su checkbox de validez a `TRUE` o `FALSE` y conserva los demás valores crudos. `IsRectangleSnapshotSourceEnabled()` lee y normaliza por separado la novena propiedad, que controla la activación. Después `Render()` entrega el snapshot a la conversión pura, que lo valida antes de derivar bounds.

El almacenamiento pertenece a la instancia del efecto y se conserva al guardar el proyecto. Al duplicar una capa o copiar el efecto, After Effects copia también sus parámetros; el snapshot duplicado continúa sujeto a la misma versión y validación.

La validez del snapshot no activa por sí sola Rectangle Source. El resultado convertido solo puede llegar al resolver cuando `Rectangle Snapshot Enabled` está activado; con el valor predeterminado se ignora y Layer Bounds continúa como fallback.

#### Snapshot-to-Source Conversion

`ConvertRectangleGeometrySnapshotToSourceData()` define la frontera pura entre propiedades crudas y `CF_RectangleSourceData`. Siempre comienza con bounds limpios e `isAvailable = FALSE` y rechaza inmediatamente cualquier snapshot que no supere `ValidateRectangleGeometrySnapshot()`. No consulta suites, handles, parámetros ni estado global.

Para un snapshot válido, interpreta `sizeX` y `sizeY` como dimensiones completas y `positionX` y `positionY` como centro del Rectangle Path en su espacio local inmediato. La fórmula fue validada experimentalmente en After Effects `26.3x87`, Windows 64 bits:

```text
left   = positionX - sizeX / 2
top    = positionY - sizeY / 2
right  = positionX + sizeX / 2
bottom = positionY + sizeY / 2
```

La conversión calcula primero `halfWidth` y `halfHeight` y comprueba con `std::isfinite` ambos valores y los cuatro bounds derivados. También exige `right >= left` y `bottom >= top`. Solo después asigna los bounds y establece `isAvailable = TRUE`; cualquier fallo retorna el source original, limpio e indisponible, sin conversión parcial, normalización, saturación ni corrección silenciosa.

Size cero es válido: produce bordes coincidentes en el eje correspondiente y puede generar un source disponible siempre que el resto de las validaciones se cumpla.

`roundness` no participa porque la prueba de Phase 5.4 confirmó que no modifica los bounds externos; una futura fase de Corner Radii o Primitive Metadata deberá consumirlo. `direction` tampoco participa: los valores observados `1`, `2` y `3` no modificaron los bounds y permanecen como metadata sin interpretación semántica oficial.

La conversión opera exclusivamente en el espacio local inmediato y crudo del Rectangle Path. No aplica transformaciones del Shape Group, grupos ancestros o capa; tampoco anchor, scale, rotation, skew, Stroke, pixel aspect ratio, efectos, expresiones ni conversiones a composición o mundo.

`Render()` construye localmente el resultado de la conversión y lo entrega al selector junto al resultado de `DiscoverRectangleSourceFromAfterEffects()`. Solo el proveedor seleccionado se asigna a `resolveRequest.rectangleSource`; el resolver continúa siendo ajeno al origen de los datos.

Referencia oficial revisada: [Create and customize shapes and masks in After Effects](https://helpx.adobe.com/after-effects/desktop/drawing-painting-and-paths/shapes-and-shape-attributes/creating-shapes-masks.html).

#### Rectangle Snapshot Activation Gate

`Rectangle Snapshot Enabled` es un `PF_Param_CHECKBOX` oculto, persistente, no animable y no interpolable. Ocupa el índice `19`, usa el Disk ID `19`, conserva ese nombre interno estable y tiene default `0`. `PF_ParamFlag_USE_VALUE_FOR_OLD_PROJECTS` garantiza que proyectos antiguos e instancias existentes mantengan la compuerta desactivada y continúen usando Layer Bounds.

`IsRectangleSnapshotSourceEnabled()` normaliza el checkbox a `TRUE` o `FALSE`. La validez del snapshot nunca habilita la compuerta automáticamente.

`SelectRectangleSourceData()` es una selección pura y no mezcla bounds entre proveedores. Aplica esta prioridad:

1. Snapshot Source cuando la compuerta está habilitada y el source convertido está disponible.
2. Discovery Source cuando está disponible.
3. Source indisponible, que provoca el fallback a Layer Bounds dentro de `ResolveGeometrySource()`.

```text
Rectangle Geometry Snapshot
→ ConvertRectangleGeometrySnapshotToSourceData()
→ Rectangle Snapshot Enabled
→ SelectRectangleSourceData()
→ resolveRequest.rectangleSource
→ ResolveGeometrySource()
```

Un snapshot inválido produce un source indisponible incluso con la compuerta habilitada. Una compuerta deshabilitada ignora el source convertido aunque sea válido. En ambos casos, el discovery provider conserva su prioridad secundaria y, mientras este continúe indisponible, el flujo termina de forma determinista en Layer Bounds.

Este es el primer punto donde un snapshot puede modificar realmente `geometryBounds`, por lo que habilitar la compuerta con datos válidos puede cambiar el resultado visual. Las coordenadas continúan siendo locales al Rectangle Path y no incluyen transformaciones de grupos, ancestros o capa. `roundness` y `direction` siguen sin consumirse en `CF_GeometryContext`. Desde Phase 5.8, el proveedor CEP puede escribir y verificar estos parámetros mediante una acción manual explícita.

#### End-to-End Snapshot Injection Test

`research/InjectRectangleSnapshotIntoCornerFlex.jsx` es una herramienta independiente del CEP productivo. La prueba usó el `CornerFlex.aex` de Phase 5.6 ya compilado, que After Effects cargó correctamente; Phase 5.7 no recompiló ni modificó el binario. Su modo interactivo exige una composición activa, una única Shape Layer seleccionada, una única propiedad seleccionada perteneciente a Rectangle Path y una única instancia de CornerFlex en esa capa. Asciende desde la propiedad mediante `propertyGroup(1)` hasta `ADBE Vector Shape - Rect` y lee en el tiempo actual, preferentemente mediante `valueAtTime(time, false)`:

- `ADBE Vector Rect Size`;
- `ADBE Vector Rect Position`;
- `ADBE Vector Rect Roundness`;
- `ADBE Vector Shape Direction`.

CornerFlex se localiza exclusivamente mediante el Match Name estable `BurgosInMotion CornerFlex`, no por su nombre visible. La prueba renombró deliberadamente la instancia a `Renamed CornerFlex Test Instance` y aun así la encontró. After Effects `26.3x87`, Windows 64 bits, expuso los nueve parámetros `PF_PUI_INVISIBLE` mediante el DOM. Sus nombres internos coincidieron y sus Match Names generados fueron `BurgosInMotion CornerFlex-0011` a `BurgosInMotion CornerFlex-0019`.

La herramienta valida todos los datos y parámetros antes de escribir. La inyección se realiza dentro de un undo group y usa este orden transaccional:

1. `Rectangle Snapshot Enabled = FALSE`;
2. `Rectangle Snapshot Valid = FALSE`;
3. versión;
4. Size X/Y;
5. Position X/Y;
6. Roundness;
7. Direction;
8. `Rectangle Snapshot Valid = TRUE`;
9. `Rectangle Snapshot Enabled = TRUE`.

Después relee los nueve parámetros. En las dos inyecciones de la prueba, todos los valores coincidieron exactamente con los solicitados; las diferencias numéricas fueron `0`, por debajo de la tolerancia `0.0001`. El mismo script ofrece un modo seguro de desactivación que escribe primero `Enabled = FALSE` y después `Valid = FALSE`.

La suite automatizada creó una composición temporal de `1000 × 1000`, Rectangle Path inicial de `400 × 300` en Position `[400, 300]`, Fill blanco sin Stroke y transformaciones de grupo y capa en identidad. Antes de cada inyección seleccionó explícitamente esa capa y Rectangle Path y reutilizó la misma rutina del modo interactivo. After Effects guardó capturas PNG post-efecto y `research/AnalyzeRectangleSnapshotInjectionFrames.py` comprobó el píxel `[500, 300]`:

| Caso | Estado | RGBA observado | Resultado |
| --- | --- | --- | --- |
| A | Gate deshabilitado; Layer Bounds | `(255, 255, 255, 255)` | PASS |
| B | Snapshot válido y gate habilitado | `(0, 0, 0, 0)` | PASS |
| C | Gate habilitado y snapshot inválido; fallback | `(255, 255, 255, 255)` | PASS |
| D | Snapshot válido y gate deshabilitado; fallback | `(255, 255, 255, 255)` | PASS |
| E | Size actualizado a `800 × 600` y reinyección | `(255, 255, 255, 255)` | PASS |

El cambio entre A y B confirma que Rectangle Source altera realmente `geometryBounds`. C y D confirman el fallback a Layer Bounds, y E confirma que una reinyección actualiza el resultado visual. La suite terminó con `Enabled = FALSE`, `Valid = FALSE`, eliminó la composición temporal y obtuvo `END-TO-END RESULT: PASS`.

`sampleImage()` produjo un error interno al evaluarse desde el arranque automatizado; por ello la evidencia visual usa `CompItem.saveFrameToPng()` y análisis RGBA externo. Las capturas se conservan en `research/output/RectangleSnapshotInjectionFrames/` y el reporte completo en `research/output/RectangleSnapshotInjectionReport.txt`.

El snapshot sigue siendo estático: cambios posteriores del Rectangle Path no actualizan CornerFlex hasta ejecutar otra captura manual. Las propiedades animadas o expresiones se capturan únicamente en el tiempo de la operación. No se aplican transformaciones de Shape Group, grupos ancestros o capa, ni conversiones a composición o mundo. La sincronización continua permanece fuera del alcance actual.

#### CEP Geometry Snapshot Provider

La extensión CEP incorpora un proveedor productivo independiente de los prototipos de `research`. `jsx/CornerFlexGeometryProvider.jsx` se carga desde `jsx/main.jsx` y expone dos funciones globales estables:

```text
CornerFlexGeometryProvider.captureSelectedRectangleSnapshot()
CornerFlexGeometryProvider.disableRectangleSnapshot()
```

Ambas se invocan mediante `CSInterface.evalScript()` y siempre retornan un string JSON con este contrato:

```json
{
  "ok": true,
  "code": "SNAPSHOT_CAPTURED",
  "message": "Rectangle Path capturado.",
  "data": {
    "layerId": 1,
    "layerName": "Shape Layer 1",
    "rectangleName": "Rectangle Path 1",
    "sizeX": 400,
    "sizeY": 300,
    "positionX": 120,
    "positionY": -80,
    "roundness": 24,
    "direction": 1,
    "snapshotVersion": 1,
    "enabled": true
  }
}
```

Los errores usan `ok = false`, un código estable, un mensaje específico y `data = null`. Los códigos definidos son:

- `SNAPSHOT_CAPTURED`;
- `SNAPSHOT_DISABLED`;
- `NO_ACTIVE_COMP`;
- `INVALID_LAYER_SELECTION`;
- `INVALID_PROPERTY_SELECTION`;
- `RECTANGLE_PATH_NOT_FOUND`;
- `CORNERFLEX_EFFECT_NOT_FOUND`;
- `CORNERFLEX_EFFECT_AMBIGUOUS`;
- `SNAPSHOT_PARAMETERS_NOT_FOUND`;
- `INVALID_RECTANGLE_VALUES`;
- `SNAPSHOT_WRITE_FAILED`;
- `SNAPSHOT_VERIFY_FAILED`;
- `INTERNAL_ERROR`.

La captura exige una composición activa, exactamente una Shape Layer seleccionada, exactamente una propiedad seleccionada perteneciente a Rectangle Path y una única instancia CornerFlex en esa capa. No elige automáticamente otra capa, propiedad o instancia. El Rectangle Path se localiza ascendiendo mediante `propertyGroup(1)` hasta `ADBE Vector Shape - Rect`; CornerFlex se localiza mediante `BurgosInMotion CornerFlex`, con independencia de su nombre visible.

En el tiempo actual de la composición se leen, mediante `valueAtTime(comp.time, false)` y `value` como fallback para propiedades no temporales:

- `ADBE Vector Rect Size`;
- `ADBE Vector Rect Position`;
- `ADBE Vector Rect Roundness`;
- `ADBE Vector Shape Direction`.

`RECTANGLE_SNAPSHOT_VERSION = 1` debe permanecer sincronizada con `CF_RECTANGLE_GEOMETRY_SNAPSHOT_VERSION`. El mapeo de parámetros usa exclusivamente los Match Names DOM internos:

| Campo | Match Name DOM |
| --- | --- |
| Version | `BurgosInMotion CornerFlex-0011` |
| Valid | `BurgosInMotion CornerFlex-0012` |
| Size X | `BurgosInMotion CornerFlex-0013` |
| Size Y | `BurgosInMotion CornerFlex-0014` |
| Position X | `BurgosInMotion CornerFlex-0015` |
| Position Y | `BurgosInMotion CornerFlex-0016` |
| Roundness | `BurgosInMotion CornerFlex-0017` |
| Direction | `BurgosInMotion CornerFlex-0018` |
| Enabled | `BurgosInMotion CornerFlex-0019` |

Antes de escribir se validan la existencia de los nueve destinos, Size y Position como pares finitos, dimensiones no negativas, Roundness finito y no negativo, y Direction como entero transportable de 32 bits. La escritura se ejecuta dentro de `CornerFlex: Capture Rectangle Geometry` y conserva este orden:

1. `Enabled = FALSE`;
2. `Valid = FALSE`;
3. Version;
4. Size X;
5. Size Y;
6. Position X;
7. Position Y;
8. Roundness;
9. Direction;
10. `Valid = TRUE`;
11. `Enabled = TRUE`.

Después se releen los nueve parámetros: Version, Valid, Enabled y Direction se comparan exactamente; los valores de coma flotante usan tolerancia `0.0001`. Solo una verificación completa produce `SNAPSHOT_CAPTURED`. Cualquier error intenta desactivar primero `Enabled` y después `Valid`, evitando dejar intencionadamente un snapshot parcial activo.

`disableRectangleSnapshot()` localiza la instancia y los parámetros por los mismos Match Names, escribe `Enabled = FALSE` y `Valid = FALSE` dentro de `CornerFlex: Return to Layer Bounds`, relee ambos valores y retorna `SNAPSHOT_DISABLED` únicamente si la desactivación se confirma. Con ello `ResolveGeometrySource()` vuelve de forma determinista a Layer Bounds.

El panel ofrece las acciones manuales **Usar Rectangle Path seleccionado** y **Volver a Layer Bounds**. El adaptador JavaScript deshabilita ambas mientras una llamada está en curso, parsea y valida el JSON, y muestra feedback inline con capa, Size y Position o con el mensaje y código de error. No replica lógica del DOM de After Effects.

`tests/CornerFlexGeometryProviderTests.jsx` ejercitó el módulo productivo directamente en After Effects `26.3x87`. Pasaron la captura normal, instancia renombrada visualmente, ausencia de propiedad, propiedad ajena a Rectangle Path, capa sin CornerFlex, desactivación, recaptura después de cambiar Size a `800 × 600`, fallo de selección con gate apagado y tres capturas consecutivas. La prueba terminó con `Enabled = FALSE`, `Valid = FALSE` y eliminó la composición temporal. El reporte se conserva en `CornerFlex-CEP/tests/output/CornerFlexGeometryProviderTestReport.txt`.

El snapshot continúa siendo manual y estático. No existe sincronización automática con Size, Position, animaciones, expresiones, tiempo o selección. No se añadieron listeners ni polling específicos del snapshot. Tampoco se aplican transformaciones de grupos o capa, Stroke, coordenadas de composición o mundo, ni se consumen todavía Roundness o Direction en el contexto geométrico. Los scripts de `research` permanecen como evidencia y no son dependencias del proveedor productivo.

#### Rectangle Coordinate Semantics Validation

El prototipo `research/ValidateRectanglePathSemantics.jsx` ejecuta una prueba empírica autocontenida en After Effects. La ejecución documentada se realizó en After Effects `26.3x87`, Windows 64 bits, con tiempo fijo `0` y tolerancia de `0.001` píxeles.

Metodología:

- composición temporal de `1000 × 1000`, pixel aspect ratio `1`, 30 fps y motion blur desactivado;
- Shape Layer `ADBE Vector Layer`;
- Rectangle Path añadido directamente a `ADBE Root Vectors Group`;
- Fill `ADBE Vector Graphic - Fill`, sin Stroke;
- anchor `[0, 0]`, Position `[0, 0]`, Scale `[100, 100]`, Rotation `0` y Opacity `100`;
- sin Shape Group, efectos, expresiones ni transformaciones adicionales;
- lectura mediante `sourceRectAtTime(0, false)`;
- creación, ejecución y eliminación dentro de un undo group;
- composición temporal eliminada al finalizar.

Match Names utilizados:

- `ADBE Vector Layer`;
- `ADBE Root Vectors Group`;
- `ADBE Vector Shape - Rect`;
- `ADBE Vector Rect Size`;
- `ADBE Vector Rect Position`;
- `ADBE Vector Rect Roundness`;
- `ADBE Vector Shape Direction`;
- `ADBE Vector Graphic - Fill`;
- `ADBE Vector Fill Color`;
- `ADBE Vector Fill Opacity`;
- `ADBE Transform Group`, `ADBE Anchor Point`, `ADBE Position`, `ADBE Scale`, `ADBE Rotate Z` y `ADBE Opacity`.

`sourceRectAtTime()` devuelve los límites de la fuente en el espacio de la Shape Layer, antes de las transformaciones de capa. Como Rectangle Path se encuentra directamente en Contents raíz y todas las transformaciones están en identidad, ese espacio coincide con el espacio local crudo utilizado por Size y Position en esta prueba. La comparación dejaría de ser directa al introducir grupos transformados, Stroke, transformaciones de capa u otros modificadores de bounds.

La tolerancia de `0.001` píxeles admite pequeñas diferencias de evaluación en coma flotante y valores subpíxel sin ocultar offsets de píxeles completos. En esta ejecución todas las diferencias observadas fueron exactamente `0`.

| Caso | Size | Position | Roundness | Direction | Resultado |
| --- | --- | --- | ---: | ---: | --- |
| Centered even | `200 × 100` | `[0, 0]` | 0 | 1 | PASS |
| Positive position | `200 × 100` | `[50, 25]` | 0 | 1 | PASS |
| Negative position | `200 × 100` | `[-50, -25]` | 0 | 1 | PASS |
| Odd size | `201 × 101` | `[0, 0]` | 0 | 1 | PASS |
| Fractional | `200.5 × 100.25` | `[10.125, -20.375]` | 0 | 1 | PASS |
| Zero width | `0 × 100` | `[12.5, 3.25]` | 0 | 1 | PASS |
| Rounded | `200 × 100` | `[0, 0]` | 25 | 1 | PASS |
| Direction 2 | `200 × 100` | `[0, 0]` | 0 | 2 | PASS |
| Direction 3 | `200 × 100` | `[0, 0]` | 0 | 3 | PASS |

El DOM informó para Direction un rango de `1` a `3`; los tres valores pudieron asignarse y leerse. No se asigna significado nominal a esos enteros porque la documentación oficial revisada no lo define. Ninguno alteró los bounds externos. Roundness `25` tampoco modificó left, top, width, height, right o bottom.

Los nueve casos coincidieron con:

```text
left   = positionX - sizeX / 2
top    = positionY - sizeY / 2
right  = positionX + sizeX / 2
bottom = positionY + sizeY / 2
```

Por tanto, la fórmula queda confirmada como contrato empíricamente validado para After Effects `26.3x87` bajo esta configuración controlada. No constituye una garantía oficial para otras versiones, espacios transformados, Stroke, expresiones, efectos, motion blur o `sourceRectAtTime()` con extents habilitados.

El reporte completo se conserva en `research/output/RectanglePathSemanticsReport.txt`. Phase 5.4 no modificó el AEX y Phase 5.5 utilizó esa evidencia para completar la conversión pura. Phase 5.6 conecta el resultado al resolver únicamente mediante la compuerta explícita, que permanece desactivada por defecto.

### Rectangle Source Coordinate Space Validation

El Rectangle Path entrega Size y Position en su espacio local. Para un Rectangle Path directo en `Contents`, sin transformaciones de grupo, sus bounds locales son:

```text
localLeft   = positionX - sizeX / 2
localTop    = positionY - sizeY / 2
localRight  = positionX + sizeX / 2
localBottom = positionY + sizeY / 2
```

Los callbacks `TrimFunc8()` y `TrimFunc16()` reciben `x` e `y` en coordenadas del buffer rasterizado del efecto, con origen en la esquina superior izquierda. Por ello, `geometryBounds` debe expresarse en ese mismo espacio. En el flujo clásico actual, CornerFlex no redimensiona los buffers y construye Layer Bounds como `[0, 0, inputWidth, inputHeight]`.

`CF_RectangleCoordinateContext` formaliza la transformación mínima del caso base:

```text
originX = inputWidth  * 0.5
originY = inputHeight * 0.5

effectLeft   = localLeft   + originX
effectTop    = localTop    + originY
effectRight  = localRight  + originX
effectBottom = localBottom + originY
```

`inputWidth` e `inputHeight` proceden de `params[CORNERFLEX_INPUT]->u.ld`. No se utilizan automáticamente las dimensiones de composición. `TransformLocalBoundsToEffectSpace()` aplica el desplazamiento y `ConvertRectangleGeometrySnapshotToSourceData()` permanece pura al recibir los contextos explícitamente.

La evidencia directa del caso A en After Effects `26.3x87` utilizó una composición y un input de `1920 × 1080`, Rectangle Size `500 × 500`, Position `[0, 0]` y Roundness `97`. Antes de corregir la conversión, el resolver partía de los bounds locales `[-250, -250, 250, 250]` y Trim los reconstruía como un rectángulo local `[50, 50, 450, 450]`, sin trasladarlos al buffer ni conservar su origen. El frame Rectangle Source quedó completamente transparente. Layer Bounds y la desactivación del gate conservaron el shape visible en `[710, 290, 1210, 790]`. Esto descarta usar directamente el origen local y respalda el desplazamiento `[960, 540]` para el caso base.

`ExecuteTrimOperation()` conserva ahora el origen de la geometría recibida: calcula los offsets porcentuales en un rectángulo local y los suma a `baseBounds.left` y `baseBounds.top`. `CF_RectangleGeometry` continúa siendo la instantánea base sin modificar.

El SDK distingue los siguientes datos:

- `PF_LayerDef.width` y `height`: dimensiones del buffer de píxeles;
- `extent_hint`: región opaca o región que necesita render; no cambia el origen geométrico;
- `PF_LayerDef.origin_x` y `origin_y`: origen del buffer en coordenadas de capa para checkouts de Smart Effects;
- `PF_InData.output_origin_x/y`: posición del input dentro de un output redimensionado;
- `PF_InData.pre_effect_source_origin_x/y`: origen de la fuente cuando un efecto anterior redimensionó el buffer.

CornerFlex no redimensiona actualmente el output, no usa Smart Render y recorre el buffer completo mediante las suites de iteración. Por tanto, `extent_hint` no participa en la conversión mínima. Los orígenes de SmartFX y de buffers redimensionados deberán incorporarse al contrato antes de soportar esos flujos.

Si `inputWidth` o `inputHeight` no son positivos, si el origen calculado no es finito o si los bounds transformados no son finitos o coherentes, el Rectangle Source queda indisponible. `ResolveGeometrySource()` selecciona entonces Layer Bounds como fallback y no consume una conversión parcial.

La matriz automatizada `research/ValidateRectangleSourceCoordinateSpace.jsx` cubre:

- Position `[0, 0]`, positiva y negativa;
- Rectangle Size igual al input;
- tamaños impares y fraccionarios;
- anchor point por defecto y modificado;
- Layer Position modificada;
- activación y desactivación del snapshot;
- capturas RGBA para Rectangle Source y fallback.

`research/AnalyzeRectangleSourceCoordinateSpaceFrames.py` compara los píxeles centrales, una muestra dentro del margen eliminado por Trim y la igualdad exacta entre Layer Bounds y el fallback.

La matriz A–H se ejecutó en After Effects `26.3x87` el 29 de julio de 2026. El provider capturó y desactivó el snapshot correctamente en los ocho casos y eliminó la composición temporal. Sin embargo, la enumeración de módulos confirmó que After Effects cargó:

```text
C:\Program Files\Adobe\Adobe After Effects 2026\Support Files\Plug-ins\CornerFlex\CornerFlex.aex
SHA-256: D192C57A38E2CD3AB844699844FC371EBC00946E105B4D750608144455C42F11
```

Ese hash corresponde al binario anterior, no al build Phase 5.9. El AEX corregido se había instalado temporalmente en otra ruta autorizada y no participó en el proceso. En consecuencia, esta ejecución reproduce el defecto anterior y no valida ni invalida la transformación nueva.

| Caso | Layer Bounds alpha bbox | Rectangle Source alpha bbox | Fallback alpha bbox | Resultado observado |
| --- | --- | --- | --- | --- |
| A | `(710, 290, 1210, 790)` | sin alpha | `(710, 290, 1210, 790)` | FAIL |
| B | `(910, 390, 1410, 890)` | sin alpha | `(910, 390, 1410, 890)` | FAIL |
| C | `(510, 190, 1010, 690)` | sin alpha | `(510, 190, 1010, 690)` | FAIL |
| D | `(192, 108, 1728, 972)` | `(192, 108, 1728, 972)` | `(192, 108, 1728, 972)` | PASS no concluyente |
| E | `(719, 269, 1221, 769)` | sin alpha | `(719, 269, 1221, 769)` | FAIL |
| F | `(710, 290, 1210, 790)` | sin alpha | `(710, 290, 1210, 790)` | FAIL |
| G | `(610, 240, 1110, 740)` | sin alpha | `(610, 240, 1110, 740)` | FAIL |
| H | `(950, 450, 1450, 950)` | sin alpha | `(950, 450, 1450, 950)` | FAIL |

El caso D es un falso positivo para diagnosticar el origen: Rectangle Size coincide con el input completo y ambos espacios producen los mismos bounds tras Trim. En los demás casos el centro de Rectangle Source fue transparente. El fallback coincidió píxel a píxel con Layer Bounds en los ocho casos.

Una segunda ejecución instaló temporalmente el build Phase 5.9 en esa ruta. Antes de ejecutar la matriz, la enumeración de módulos confirmó la ruta cargada y el SHA-256 `1144BD89D865B169B3B2404B645C173C211DE26D41B35FDC0D9823727CE141E5`.

| Caso | Rectangle Source observado | Rectangle Source esperado | Resultado Phase 5.9 |
| --- | --- | --- | --- |
| A | `(760, 340, 1160, 740)` | `(760, 340, 1160, 740)` | PASS |
| B | `(960, 440, 1360, 840)` | `(960, 440, 1360, 840)` | PASS |
| C | `(560, 240, 960, 640)` | `(560, 240, 960, 640)` | PASS |
| D | `(192, 108, 1728, 972)` | `(192, 108, 1728, 972)` | PASS |
| E | `(770, 320, 1171, 719)` | `(770, 320, 1171, 719)` | PASS |
| F | `(760, 340, 1160, 740)` | `(760, 340, 1160, 740)` | PASS |
| G | `(760, 340, 1110, 740)` | `(660, 290, 1060, 690)` | FAIL |
| H | `(950, 450, 1160, 740)` | `(1000, 500, 1400, 900)` | FAIL |

Los casos A–F validan la suma de `inputWidth / 2` e `inputHeight / 2`, Rectangle Position positiva y negativa, dimensiones fraccionarias y el anchor point predeterminado. Sus alpha bounding boxes coinciden exactamente con los bounds esperados después de Trim, lo que también confirma que `ExecuteTrimOperation()` conserva `baseBounds.left` y `baseBounds.top`.

El caso G demostró que modificar el anchor point desplaza el raster de la Shape Layer dentro del buffer, pero Phase 5.9 no aplicaba ese offset. El caso H demostró el mismo límite para Layer Position: el shape se desplazaba, mientras que `geometryBounds` permanecía en la posición calculada para transform de capa en identidad. Phase 5.10 resuelve ambos casos mediante el contrato traslacional documentado a continuación, sin modificar la fórmula local validada.

Rectangle Source dejó de producir frames completamente transparentes en A–F. En G y H produjo intersecciones parciales desalineadas, no una geometría correcta. El fallback coincidió píxel a píxel con Layer Bounds en los ocho casos. El binario original fue restaurado después de la prueba.

### Layer Transform Coordinate Contract

Phase 5.10 separa explícitamente tres pasos:

```text
Rectangle Geometry Snapshot
→ ConvertRectangleSnapshotToLocalBounds()
→ TransformLocalBoundsToEffectSpace()
→ CF_RectangleSourceData
```

Los bounds locales mantienen sin cambios la fórmula validada de Size y Rectangle Position:

```text
localLeft   = rectanglePositionX - sizeX / 2
localTop    = rectanglePositionY - sizeY / 2
localRight  = rectanglePositionX + sizeX / 2
localBottom = rectanglePositionY + sizeY / 2
```

`CF_LayerTranslationContext` contiene únicamente datos simples: validez, Anchor Point, Layer Position, dimensiones de composición y traslación resultante. No contiene suites, handles, punteros ni referencias del host.

La capa de integración obtiene la capa del efecto mediante `AEGP_GetEffectLayer()`, convierte `PF_InData.current_time` al tiempo de composición mediante `AEGP_ConvertEffectToCompTime()` y evalúa `AEGP_LayerStream_ANCHORPOINT` y `AEGP_LayerStream_POSITION` post-expresión mediante `AEGP_GetLayerStreamValue()`. Anchor se interpreta en layer space y Position en comp space. Las dimensiones se obtienen desde la composición padre mediante `AEGP_GetLayerParentComp()`, `AEGP_GetItemFromComp()` y `AEGP_GetItemDimensions()`.

La fórmula validada para traslación 2D es:

```text
translationX = layerPositionX - compWidth  / 2 - anchorX
translationY = layerPositionY - compHeight / 2 - anchorY

effectLeft   = localLeft   + inputWidth  / 2 + translationX
effectTop    = localTop    + inputHeight / 2 + translationY
effectRight  = localRight  + inputWidth  / 2 + translationX
effectBottom = localBottom + inputHeight / 2 + translationY
```

El centro del input ya estaba incorporado por `CF_RectangleCoordinateContext`; por eso no forma parte de `translationX/Y`. La traslación no se añade al snapshot persistente y no altera `CF_RectangleGeometrySnapshot`.

`ResolveLayerTranslationFromAfterEffects()` solo marca el contexto como válido para una capa 2D sin parent, Scale `100 %`, Rotation `0`, resolución completa y orígenes `output_origin` y `pre_effect_source_origin` iguales a cero. Si una suite, stream, tiempo, dimensión o condición no puede resolverse con certeza, `ConvertRectangleGeometrySnapshotToSourceData()` deja Rectangle Source indisponible y `ResolveGeometrySource()` selecciona Layer Bounds. CornerFlex no intenta una transformación parcial.

La matriz automatizada `research/ValidateRectangleLayerTranslation.jsx` se ejecutó en After Effects `26.3x87` con el build Debug x64 final Phase 5.10 de 83.968 bytes y SHA-256 `8C2EFA7099162950CC4310B0947AEBEF6881147A2EAE7C0550E473F2DB2D3243`. La enumeración de módulos del proceso confirmó que After Effects cargó exactamente ese binario desde `Support Files\Plug-ins\CornerFlex\CornerFlex.aex`. `research/AnalyzeRectangleLayerTranslationFrames.py` comparó alpha bounding boxes y la igualdad RGBA completa entre Layer Bounds y fallback.

| Caso | Condición | Rectangle Source observado | Esperado | Resultado |
| --- | --- | --- | --- | --- |
| A | Anchor/Position default | `(760, 340, 1160, 740)` | `(760, 340, 1160, 740)` | PASS |
| B | Anchor `+100,+50` | `(660, 290, 1060, 690)` | `(660, 290, 1060, 690)` | PASS |
| C | Anchor `-100,-50` | `(860, 390, 1260, 790)` | `(860, 390, 1260, 790)` | PASS |
| D | Position `+200,+100` | `(960, 440, 1360, 840)` | `(960, 440, 1360, 840)` | PASS |
| E | Position `-200,-100` | `(560, 240, 960, 640)` | `(560, 240, 960, 640)` | PASS |
| F | Anchor y Position combinados | `(860, 390, 1260, 790)` | `(860, 390, 1260, 790)` | PASS |
| G | Position igual al centro | `(760, 340, 1160, 740)` | `(760, 340, 1160, 740)` | PASS |
| H | Position `[1200,700]` | `(1000, 500, 1400, 900)` | `(1000, 500, 1400, 900)` | PASS |
| I | Comp `1280 × 720` | `(552, 196, 888, 404)` | `(552, 196, 888, 404)` | PASS |
| J | Rectangle Position y capa trasladados | `(1015, 436, 1415, 724)` | `(1015, 436, 1415, 724)` | PASS |

La diferencia de bbox fue `(0, 0, 0, 0)` en A–J. El fallback coincidió píxel a píxel con Layer Bounds en todos los casos. La regresión completa de Phase 5.9 A–F también pasó, incluido Size/Position fraccionario. Trim `10 %` conservó el origen final transformado.

La validación defensiva final se conserva en `research/ValidateRectangleLayerTranslationDefensive.jsx`, `research/AnalyzeRectangleLayerTranslationDefensiveFrames.py` y `research/output/RectangleLayerTranslationDefensiveReport.txt`:

| Caso | Condición | Resultado |
| --- | --- | --- |
| K | Shape Layer 3D | PASS; Rectangle Source coincidió píxel a píxel con Layer Bounds |
| L | Shape Layer con parent | PASS; Rectangle Source coincidió píxel a píxel con Layer Bounds |
| M | After Effects Null Layer | Inconcluso; tiene un `AEGP_LayerH` válido y raster transparente |
| N | Scale distinta de `100 %` | PASS; Rectangle Source coincidió píxel a píxel con Layer Bounds |
| O | Rotation distinta de cero | PASS; Rectangle Source coincidió píxel a píxel con Layer Bounds |

Un efecto en ejecución siempre pertenece a una capa válida; ExtendScript no puede provocar de forma segura que `AEGP_GetEffectLayer()` retorne un handle nulo. El AE Null Layer probado no es equivalente a ese error: es una capa válida y su raster transparente impide observar qué fuente se seleccionó. El caso no produjo crash ni output inesperado, pero el branch de handle nulo permanece cubierto solo por el retorno defensivo del código.

La prueba temporal utilizó la expresión de Position `[thisComp.width / 2 + time * 120, thisComp.height / 2 + time * 60]`. Rectangle Source produjo `(760, 340, 1160, 740)` en T0 y `(880, 400, 1280, 800)` en T1: el delta observado `(120, 60, 120, 60)` coincide exactamente con el valor post-expresión. Esto valida conjuntamente `AEGP_ConvertEffectToCompTime()` y `AEGP_GetLayerStreamValue()` para el flujo probado.

Downsampling distinto de uno y un origen de buffer desplazado no pudieron reproducirse de manera fiable mediante `saveFrameToPng()` y el DOM sin introducir efectos auxiliares o cambiar el pipeline. Permanecen como limitaciones no validadas y activan el fallback cuando `PF_InData` expone esas condiciones.

La evidencia PNG mínima seleccionada se conserva en `research/output/RectangleLayerTranslationEvidence/`. Las carpetas completas generadas por futuras ejecuciones permanecen ignoradas.

El plugin no declara `PF_OutFlag2_SUPPORTS_THREADED_RENDERING`; After Effects serializa sus llamadas de render. Antes de habilitar MFR explícito deberá revisarse la seguridad concurrente de las suites AEGP, que no debe asumirse salvo documentación específica.

Permanecen fuera de alcance la validación formal de Scale animado o expresado, Rotation, parenting, 3D, transformaciones de Shape Groups, grupos anidados transformados, skew, downsampling, SmartFX, pixel aspect ratio distinto de uno, Stroke y efectos previos que redimensionen o desplacen buffers. Esos casos usan el fallback cuando la capa de integración puede detectarlos; los transforms internos de Shape Groups todavía no forman parte del snapshot y deberán resolverse en una fase independiente.

### Phase 5.11B.1 — Positive Static Layer Scale 2D

`CF_LayerTransform2DContext` amplía el contrato traslacional de Phase 5.10 con `scaleX` y `scaleY` normalizados, donde `1.0` representa `100 %`. La capa de integración evalúa Scale en el mismo tiempo de composición que Anchor Point y Layer Position y solo acepta componentes finitos y estrictamente positivos.

La conversión mantiene tres responsabilidades separadas:

```text
Rectangle Geometry Snapshot
→ ConvertRectangleSnapshotToLocalBounds()
→ TransformLocalBoundsWithLayerTransform2D()
→ ExecuteTrimOperation()
```

`TransformLocalBoundsWithLayerTransform2D()` es pura: multiplica `left/right` por `scaleX` y `top/bottom` por `scaleY`, suma el origen del input y añade la traslación de capa. No consulta suites, no aplica Trim, no normaliza bounds ni modifica sus entradas.

```text
effectX = localX * scaleX + inputWidth / 2 + translationX
effectY = localY * scaleY + inputHeight / 2 + translationY

translationX = positionX - compWidth / 2 - anchorX * scaleX
translationY = positionY - compHeight / 2 - anchorY * scaleY
```

Rectangle Path Position se escala porque forma parte del espacio local; Layer Position no se escala. Anchor Point participa mediante `anchor * scale`. `TransformLocalBoundsToEffectSpace()` valida la finitud y coherencia de los bounds finales antes de habilitar Rectangle Source.

Scale cero, negativo o no finito mantiene Layer Bounds como fallback. También permanecen como fallbacks absolutos Rotation, parenting, capas 3D, downsampling y orígenes de buffer especiales. Phase 5.11B.1 limita su criterio de cierre a Scale 2D positivo y estático; animación y expresiones de Scale se validarán formalmente en Phase 5.11B.2.

La matriz funcional B.1 cerró con PASS para A-F, I-P y Q-U: Scale 100x100, 150x150, 50x50, 150x75, 75x150, decimal, Anchor + Scale, Layer Position + Scale, Rectangle Path Position + Scale, combinación completa, Trim 0 %, Trim 10 %, Trim 50 %, regreso a Layer Bounds, Rotation fallback, parent fallback, 3D fallback, Scale cero fallback y Scale negativo fallback. Las regresiones Phase 5.9, Phase 5.10 y Phase 5.11A también quedaron en PASS.

La referencia independiente con `toComp()` quedó inconclusa: los intentos de harness por expresión fallaron antes de producir bounds utilizables. Esa limitación quedó documentada como una brecha de oracle independiente, pero no bloqueó la validación end-to-end porque los resultados cerraron mediante comparación pixel/bounds, retorno a Layer Bounds y regresiones defensivas.

### Phase 5.11B.2 — Animated and Expression-Driven Scale

Phase 5.11B.2 did not require C++ changes. The existing Rectangle Source path evaluates Layer Scale at render time by converting `PF_InData::current_time` with `AEGP_ConvertEffectToCompTime()` and reading the layer transform streams through `AEGP_GetLayerStreamValue()` with `AEGP_LTimeMode_CompTime`.

Scale values driven by keyframes or expressions resolve per frame through the same path used for static positive Scale. There is no special animation route: `CF_LayerTransform2DContext` carries the normalized `scaleX` and `scaleY` values for static Scale, animated Scale and expression-driven Scale alike.

Trim continues to operate after the Rectangle Path bounds are transformed for the current frame. Scale components that resolve to zero or negative values keep Rectangle Source unavailable and select Layer Bounds as fallback. Rotation also continues to activate fallback. Returning manually to Layer Bounds remained RGBA-identical to the Layer Bounds baseline.

The Phase 5.11B.2 validation harness closed A-M with PASS, covering animated uniform, animated non-uniform, decimal, expression-driven uniform, expression-driven non-uniform, Anchor + Scale, Layer Position + Scale, Rectangle Path Position + Scale, Trim 10 %, manual return to Layer Bounds, zero Scale fallback, negative Scale fallback and Rotation fallback. Static regression RA-RG also closed with PASS.

### Phase 5.12B — Oriented Rectangle Foundation

Phase 5.12B introduces the minimum geometry contracts needed before real Layer Rotation 2D can be enabled: `CF_Vector2`, `CF_AffineTransform2D` and `CF_OrientedRectangle`. This phase is structural only. Rotation from After Effects is still read as `AEGP_LayerStream_ROTATION`, and any value different from zero continues to make the layer transform invalid so Rectangle Source falls back to Layer Bounds.

The affine convention is fixed as `x' = a*x + c*y + tx` and `y' = b*x + d*y + ty`. The supported Phase 5.11 subset builds an affine transform from the already validated `CF_LayerTransform2DContext`: `a = scaleX`, `d = scaleY`, `tx = inputOriginX + translationX`, `ty = inputOriginY + translationY`, with `b = 0` and `c = 0`. Because `translationX/Y` already include Layer Position, comp center and `anchor * scale`, this produces the same coordinates as the Phase 5.11 formula when Rotation is zero.

`BuildAxisAlignedOrientedRectangle()` creates a base primitive from local bounds with X/Y axes and positive half dimensions. `TransformOrientedRectangle()` applies the affine transform to its center and basis vectors. `ComputeOrientedRectangleAABB()` projects the transformed primitive into a containment rectangle by evaluating its four vertices. The AABB remains a containment result only; it is not a substitute for a rotated primitive.

The renderer and Trim pipeline are intentionally unchanged in this phase. `ExecuteTrimOperation()` still operates on `geometryBounds` in the existing axis-aligned route. The future target flow is:

```text
Base Primitive
→ Primitive Operations
→ Layer Transform
→ Render Geometry
```

That future flow is required before enabling Rotation semantically, because a rotated rectangle cannot be represented correctly by `CF_Rect` alone.

The pure foundation test `research/ValidateOrientedRectangleFoundation.py` closed with PASS for identity, translation, uniform and non-uniform Scale, Anchor + Scale + Position equivalence, fractional values, axis-aligned AABB and a disconnected mathematical 45 degree oriented-rectangle case. The visual validation `research/ValidateOrientedRectangleFoundationVisual.jsx` plus `research/AnalyzeOrientedRectangleFoundationVisual.py` closed A-K with PASS on the Phase 5.12B build: base, Scale 150x150, Scale 150x75, Anchor + Scale, Layer Position + Scale, Rectangle Position + Scale, animated Scale, expression-driven Scale, Rotation fallback, Rotation + Scale fallback and return to Layer Bounds. Rotation remains disabled and in fallback; the pixel renderer remains axis-aligned and does not consume oriented primitive geometry.

### Phase 5.12C — Static Layer Rotation 2D

Phase 5.12C enables real static Layer Rotation 2D for Rectangle Source without representing Rotation as an AABB-only result. AABB remains containment metadata; the pixel renderer now receives enough immutable render geometry to test whether each pixel belongs to the transformed rectangle primitive.

The render flow for Rectangle Source is:

```text
Rectangle local primitive
→ Trim in primitive/local space
→ Layer Transform 2D
→ Oriented Render Geometry
→ AABB containment
→ Pixel Renderer
```

Trim semantics are local to the Rectangle Path primitive. For example, Trim Left 10% removes 10% from the rectangle's local left side before Layer Rotation is applied. Rotation `0` keeps the existing Phase 5.11 semantics exactly: the local trimmed rectangle transforms into the same axis-aligned bounds as before.

`CF_RenderContext` now carries `geometryBounds` as the AABB used for iteration rejection plus an optional `orientedRect` with `hasOrientedRect`. Layer Bounds fallback keeps the historical axis-aligned path and does not create an oriented primitive. Rectangle Source builds the local rectangle from Rectangle Size and Rectangle Position, applies Trim through `ExecuteTrimOperation()`, then transforms that trimmed primitive with `BuildLayerTransform2D()` and `TransformOrientedRectangle()`.

The official affine convention remains `x' = a*x + c*y + tx` and `y' = b*x + d*y + ty`. The validated After Effects Rotation sign in the effect-buffer Y-down space is:

```text
a =  cos(rotation) * scaleX
b =  sin(rotation) * scaleX
c = -sin(rotation) * scaleY
d =  cos(rotation) * scaleY
```

Positive AE Rotation therefore follows the clockwise visual direction in the Y-down effect buffer. The anchor is subtracted through the full affine basis, not through an axis-aligned `anchor * scale` shortcut.

`TransformOrientedRectangle()` normalizes `axisX` and `axisY` after applying the affine basis and folds their lengths into `halfWidth` and `halfHeight`. `IsPointInsideOrientedRectangle()` projects `point - center` onto those normalized axes and tests `abs(localX) <= halfWidth` and `abs(localY) <= halfHeight`. This is the critical guard that prevents pixels inside the AABB but outside the oriented primitive from being affected by CornerFlex.

The Phase 5.12C pure geometry test `research/ValidateRectangleLayerRotation2DStaticPure.py` closed with PASS for point-in-oriented-rect, normalized axes, AABB, Rotation 0, Rotation 90 and Rotation ±45. The visual harness `research/ValidateRectangleLayerRotation2DStatic.jsx` plus `research/AnalyzeRectangleLayerRotation2DStaticFrames.py` closed with PASS for A-R: Rotation 0, 15, 30, 45, 90, -45, 180, 360, Rotation + Scale, Rotation + Anchor, Rotation + Layer Position, Rotation + Rectangle Position, combined Anchor + Position + Scale, Trim 0%, Trim 10%, left-only Trim and non-uniform Trim. The analyzer used an opaque full-frame shape behind the selected Rectangle Path so AABB-only false positives were detectable; outside-AABB-only samples stayed transparent for rotated cases.

The same visual pass also covered Phase 5.11 regressions for positive Scale, non-uniform Scale, Anchor, Layer Position, Rectangle Position, Scale animated at the sampled render time, Scale expression at the sampled render time and manual return to Layer Bounds. Rotation animation and expression-driven Rotation are not declared as formal support in this phase. Parenting, 3D layers, Scale zero/negative, downsampling/origin special cases, Shape Group transforms, Skew, SmartFX and MFR remain out of scope or fallback paths.

### Phase 5.12D — Animated and Expression Rotation

Phase 5.12D validates animated and expression-driven Layer Rotation 2D as behavior already supported by the Phase 5.12C renderer. No C++ changes were required for this phase.

Rotation continues to be evaluated through `AEGP_LayerStream_ROTATION` after converting the effect time with `AEGP_ConvertEffectToCompTime()`. The stream is read in `AEGP_LTimeMode_CompTime` with `pre_expressionB = FALSE`, so the value consumed by `CF_LayerTransform2DContext::rotationDegrees` is the post-expression value for the current render time. `CF_AffineTransform2D` is rebuilt per render/frame from the evaluated Anchor, Position, Scale and Rotation streams; there is no separate cache or special path for animated Rotation.

Animated Scale and animated Rotation are resolved against the same `compTime`, so their combined affine transform remains temporally coherent. Trim remains in Rectangle primitive/local space before the layer transform is applied, and pixels that fall inside the AABB containment but outside the oriented rectangle continue to be excluded by `IsPointInsideOrientedRectangle()`.

The Phase 5.12D validation harness `research/ValidateRectangleLayerRotation2DAnimated.jsx` plus `research/AnalyzeRectangleLayerRotation2DAnimatedFrames.py` closed A-V with PASS: animated Rotation 0→90, negative Rotation, 0→180, 0→360, positive and negative expression Rotation, Rotation + animated Scale, Rotation + animated non-uniform Scale, Anchor, Layer Position, Rectangle Position, full affine combination, Trim 10%, left-only Trim, non-uniform Trim, parent fallback, 3D fallback, Scale zero fallback, Scale negative fallback, 0°/360° equivalence, -360° and 720°. Static regression also closed with PASS for Rotation 15°, 45°, -45°, Rotation + Scale, return to Layer Bounds, animated Scale and expression Scale.

The harness uses a 4 fps composition only so `T0`, `T0.25`, `T0.5`, `T0.75` and `T1` align with exact `saveFrameToPng()` frames. This frame-rate choice is a validation artifact and is not a plugin requirement.

Parenting, 3D layers, Scale zero/negative as renderable geometry, Shape Group transforms, Skew, downsampling, special origins, SmartFX and MFR remain outside the supported Rectangle Source transform path or continue to use fallback behavior.

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
- `CF_RectangleCoordinateContext`;
- `CF_LayerTransform2DContext`;
- `CF_GeometryResolveRequest`;
- `CF_GeometrySourceData`;
- `CF_GeometryContext`;
- `CF_RenderContext`;
- `ResolveLayerBoundsGeometry()`;
- `ResolveRectangleGeometry()`;
- `ResolveGeometrySource()`;
- `DiscoverRectangleSourceFromAfterEffects()` como adaptador seguro todavía desactivado;
- `CornerFlexGeometryProvider.captureSelectedRectangleSnapshot()` en la extensión CEP;
- `CornerFlexGeometryProvider.disableRectangleSnapshot()` en la extensión CEP;
- `MakeInvalidRectangleGeometrySnapshot()`;
- `ValidateRectangleGeometrySnapshot()`;
- `ReadRectangleGeometrySnapshot()`;
- `IsRectangleSnapshotSourceEnabled()`;
- `BuildRectangleCoordinateContext()`;
- `ConvertRectangleSnapshotToLocalBounds()`;
- `TransformLocalBoundsToEffectSpace()`;
- `ConvertRectangleGeometrySnapshotToSourceData()`;
- `SelectRectangleSourceData()`;
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

Por defecto, `BuildGeometryContext()` crea Layer Bounds a partir de Input Bounds como fallback y `ExecuteTrimOperation()` aplica Trim sobre esa geometría base sin perder su origen. La acción manual del panel CEP puede capturar el Rectangle Path seleccionado, escribir un snapshot válido y habilitar sus bounds convertidos al espacio del buffer del efecto; la acción secundaria desactiva el snapshot y restaura Layer Bounds. Rectangle Source soporta ahora la traslación 2D de Layer Anchor Point y Layer Position, además de Scale 2D positivo estático, animado y controlado mediante expresiones. Rotation, parenting, 3D y transformaciones internas de Shape Groups continúan fuera de alcance; tampoco existe sincronización automática y la integración con Bézier paths continúa pendiente.

## 10. Hoja de ruta técnica

1. Documentar arquitectura.
2. Separar Input Bounds y Geometry Bounds.
3. Introducir `CF_GeometryContext` y `BuildGeometryContext()`.
4. Definir metadata mínima de la fuente geométrica.
5. Preparar Geometry Bounds externos.
6. Mantener Layer Bounds como fallback.
7. Ampliar la captura manual actual a otras fuentes, incluido Bézier path.
8. Implementar Radius únicamente cuando pueda consumir Geometry Bounds correctamente.
9. Implementar radios independientes.
10. Añadir Curvature y Squircle.
11. Añadir Feather y Stroke.
12. Añadir sincronización CEP controlada cuando exista una política temporal y de transformaciones definida.
13. Incorporar presets, automatizaciones y utilidades.

## 11. Convenciones

- Usar el prefijo `CF_` para estructuras y conceptos internos propios.
- Usar `CornerFlexSettings` para valores resueltos desde parámetros.
- Usar `Build...` para funciones que construyen geometría.
- Usar `...Context` para datos precalculados empleados durante el render.
- Los callbacks de píxeles no deben leer directamente la UI.
- Evitar renombrar Match Names o Disk IDs después de publicar.
- No modificar archivos del SDK de Adobe salvo necesidad justificada.

## Phase 5.13B — Affine Composition / Primitive Foundation

Phase 5.13B incorpora una foundation matemática paralela para futuras cadenas
de transformaciones de Shape Groups. No habilita la lectura de `ADBE Vector
Group`, `ADBE Vector Transform Group` ni ningún otro stream de Shape Group.

`CF_AffineTransform2D` utiliza la convención:

```text
x' = a*x + c*y + tx
y' = b*x + d*y + ty
```

`ComposeAffineTransform2D(parent, child)` devuelve `parent · child`: primero
se aplica `child` y después `parent`. La composición no normaliza columnas ni
asume ortogonalidad:

```text
a  = parent.a * child.a + parent.c * child.b
b  = parent.b * child.a + parent.d * child.b
c  = parent.a * child.c + parent.c * child.d
d  = parent.b * child.c + parent.d * child.d
tx = parent.a * child.tx + parent.c * child.ty + parent.tx
ty = parent.b * child.tx + parent.d * child.ty + parent.ty
```

`CF_AffineRectangle` es un POD independiente de After Effects:

```text
center
basisX
basisY
halfWidth
halfHeight
```

`basisX` y `basisY` se conservan sin normalizar. Por ello la primitive puede
representar Scale, Rotation, Translation y bases no ortogonales que podrían
aparecer con futuras cadenas de Scale/Rotation o con Skew. `TransformAffineRectangle()`
transforma el centro y ambos vectores base mediante la parte lineal de la
matriz; conserva los half extents en el espacio local.

`ComputeAffineRectangleAABB()` calcula los cuatro vértices reales:

```text
center ± basisX * halfWidth ± basisY * halfHeight
```

El AABB es solamente metadata de contención. No sustituye la primitive affine.

`IsPointInsideAffineRectangle()` resta el centro e invierte la base 2×2. El
determinante es:

```text
det = basisX.x * basisY.y - basisY.x * basisX.y
```

La primitive se rechaza si algún valor no es finito, si un half extent es
negativo o si `abs(det) <= 1.0e-12`. La membership usa una tolerancia numérica
de `1.0e-9` y nunca produce un resultado parcial para una base degenerada.

`CF_OrientedRectangle` no se elimina ni se migra. Continúa siendo la
representación validada del renderer actual. La nueva `CF_AffineRectangle` no
está conectada a `CF_RenderContext`, `TrimFunc8()`, `TrimFunc16()`, Rectangle
Source, Layer Bounds ni al pipeline de operaciones.

El test independiente
`research/ValidateAffineRectangleFoundation.py` cubre identidad, traslación,
Scale uniforme y no uniforme, Rotation, composición `parent · child`, orden
inverso, cadenas de tres matrices, AABB por cuatro vértices, membership
axis-aligned, rotada y no ortogonal, determinantes cero o casi singulares,
NaN/Infinity y valores fraccionarios. El resultado fue:

```text
PHASE 5.13B PURE FOUNDATION RESULT: PASS
ORTHOGONAL SUBSET: PASS
```

El build Debug x64 generó `CornerFlex.aex` en:

```text
E:\Files\Proyectos\CornerFlexDev\Plugins\CornerFlex.aex
```

Tamaño: `95,744 bytes`
SHA-256: `805C16F8275C5C1D8E8D6B5EC991B3C9D64820969015023B65E6AB25611630CD`

El AEX instalado en Program Files no fue reemplazado y conserva el baseline
Phase 5.11B.1. Shape Group Transforms, Skew, nesting real, parenting, 3D,
MFR y cualquier conversión de `CF_AffineRectangle` al renderer siguen fuera
de alcance.

## Phase 5.13C — Single Shape Group Transform

Phase 5.13C incorpora infraestructura para resolver un único `ADBE Vector
Group` padre inmediato del Rectangle Path y aplicar, después de Trim en
primitive-space y antes del Layer Transform 2D, Anchor, Position, Scale y
Rotation del grupo. La composición usa `ComposeAffineTransform2D(layer,
group)`, es decir, `layer · group`: el grupo actúa primero y la capa después.

El contrato POD `CF_GroupTransform2DContext` mantiene valores simples y una
`CF_AffineTransform2D`; no retiene handles ni referencias del SDK. Los streams
se resuelven en render time mediante `AEGP_ConvertEffectToCompTime()` y
`AEGP_GetNewStreamValue()` con `pre_expressionB = FALSE`. Scale debe ser finito
y estrictamente positivo. Skew distinto de cero, propiedades no evaluables,
determinantes inválidos, parenting, 3D, nesting o errores de suite producen
fallback completo a Layer Bounds sin aplicar transformaciones parciales.

Match Names confirmados en After Effects 26.3x87:

- `ADBE Vector Group`;
- `ADBE Vector Transform Group`;
- `ADBE Vector Anchor`;
- `ADBE Vector Position`;
- `ADBE Vector Scale`;
- `ADBE Vector Rotation`;
- `ADBE Vector Skew`;
- `ADBE Vector Skew Axis`.

El probe confirmó también `ADBE Vector Shape - Rect`, `ADBE Vector Rect Size`,
`ADBE Vector Rect Position` y `ADBE Vector Rect Roundness`. El Match Name
`ADBE Vector Rect Direction` no está disponible en este runtime y no se utiliza.

Cuando existe un único grupo válido, la ruta experimental utiliza
`CF_AffineRectangle`, `ComputeAffineRectangleAABB()` como rechazo rápido y
`IsPointInsideAffineRectangle()` para membership final. `CF_OrientedRectangle`
permanece sin cambios para la ruta histórica sin grupo.

La compilación Debug x64 fue correcta y la regresión visual Phase 5.12D cerró
con PASS. La validación funcional A–Z de un grupo real queda pendiente: el
transporte actual CEP → AEX no entrega `uniqueStreamId`, por lo que no es
posible activar reproduciblemente una Rectangle Source dentro de un grupo sin
inventar una identidad. El soporte Group Transform no debe declararse cerrado
ni como contrato de producto hasta completar ese canal y repetir la matriz
visual específica.

## Phase 5.13C.1 — Stable Geometry Target Identity Transport

Phase 5.13C.1 define una identidad jerárquica persistente para el Rectangle
Path seleccionado. El payload combina el `Layer ID` existente con hasta ocho
segmentos POD `{propertyIndex, expectedMatchToken}`. Los tokens permitidos son
`Root Vectors Group`, `Vector Group`, `Vectors Group` y `Rectangle Path`; no se
transportan strings arbitrarios, nombres visibles, handles ni punteros.

La ruta se serializa en parámetros escalares ocultos versionados:
`Geometry Target Path Version`, `Geometry Target Path Valid`, `Geometry Target
Path Count` y ocho pares de índice/token. La escritura del provider es
transaccional: invalida primero, escribe versión, conteo y segmentos, verifica
los valores y activa `Valid` al final. Cualquier error deja `Valid = FALSE` y
el resolver selecciona Layer Bounds.

El resolver nativo valida el Layer ID, el límite de profundidad, los índices y
el Match Name de cada segmento. Recorre exactamente la ruta; no busca
alternativas. Al llegar al Rectangle Path puede obtener `Unique Stream ID`
mediante `AEGP_GetUniqueStreamID()` como diagnóstico runtime secundario. CEP no
intenta derivar ni transportar ese ID.

La política de duplicación es conservadora: copiar o duplicar una instancia
solo conserva la identidad si el Layer ID y toda la ruta siguen apuntando al
mismo objeto; si cambia la capa, se reordena la jerarquía, se elimina el target
o algún Match Name no coincide, la identidad queda inválida hasta una nueva
captura. La profundidad superior a ocho segmentos también invalida.

Los tests puros de serialización, versión, límites, tokens y jerarquía pasan.
Los Match Names de los parámetros ocultos fueron inspeccionados en After
Effects 26.3x87. La captura automatizada del provider no produjo un reporte
completo en esta ejecución y queda pendiente de diagnóstico; no se simuló una
identidad ni se activó Group Transform. Por tanto, Phase 5.13C.1 queda como
foundation de transporte pendiente de validación runtime completa.
## Phase 5.13C.2 — Geometry Target Identity End-to-End Validation

La identidad jerárquica de un Rectangle Path se transporta desde el provider
CEP mediante parámetros ocultos versionados. El payload contiene `layerId`,
`propertyIndex` y un token de Match Name por segmento; CEP no genera ni
persiste `uniqueStreamId`.

La captura es transaccional: primero invalida el path y el snapshot, escribe
y relee todos los campos, y sólo entonces marca el path y el snapshot como
válidos. En una escena temporal simple la ruta capturada fue:

`ADBE Root Vectors Group` → `ADBE Vector Group` → `ADBE Vectors Group` →
`ADBE Vector Shape - Rect`.

El adaptador AEX resuelve la capa por `layerId`, obtiene el grupo raíz por
Match Name, recorre exactamente los índices almacenados, valida cada token
contra el Match Name real y obtiene el Unique Stream ID únicamente después de
alcanzar el Rectangle Path. No busca alternativas y libera las referencias
del SDK dentro del mismo ámbito.

La validación descubrió y corrigió en el provider dos problemas de diagnóstico:
la composición debía estar activa y los Match Names de los parámetros de ruta
debían conservar cuatro dígitos (`-0023`…`-0038`). La captura posterior devolvió
`SNAPSHOT_CAPTURED` con una ruta de profundidad cuatro.

La resolución AEX permanece como infraestructura no activada: Render ignora
su resultado y Group Transform continúa deshabilitado. Hasta disponer de una
traza runtime observable del resolver y completar los casos de duplicación,
reordenamiento, eliminación y raíz directa, no se considera cerrada la
reactivación funcional de Phase 5.13C.
## Phase 5.13C.3 — Runtime Geometry Target Resolver Trace

La traza temporal del resolver AEX se ejecuta una vez por intento de
resolución, fuera de los callbacks de píxeles, y registra únicamente metadata
serializable: versión, `layerId`, segmentos, índices, tokens, Match Names y el
Unique Stream ID final. No registra handles ni punteros.

La primera ejecución runtime confirmó que el flujo alcanza el resolver, pero
rechazó el path como `invalid_request`: el provider había escrito los
segmentos sin escribir el parámetro existente `Target Layer ID`. Por ello
`ReadGeometryTargetPath()` recibía `AEGP_LayerIDVal_NONE`. El provider fue
ajustado para escribir ese valor capturado, manteniendo `Target Identity Valid`
desactivado y sin activar Rectangle Source.

Los intentos automatizados posteriores no generaron una traza reproducible;
la fase queda `NO-GO` hasta observar una sesión estable con coincidencia
segmento a segmento entre CEP, parámetros y streams AEX. La instrumentación
temporal permanece identificada para retirarse antes de cualquier commit de
producto. Group Transform, renderer, affine math y Trim no cambian.
## Phase 5.13C.4 — Deterministic Runtime Identity Resolver Validation

El harness determinista crea una composición nueva por ejecución, relee los
parámetros ocultos antes del render y etiqueta cada intento con `RUN_ID`. La
primera traza confirmó que el resolver rechazaba el payload cuando faltaba
`Target Layer ID`; el provider ahora escribe ese valor existente junto con la
ruta jerárquica.

La repetición posterior no produjo tres trazas runtime observables de forma
estable. Por ello no se ejecuta todavía la matriz de invalidación ni se
reactiva Group Transform. La instrumentación temporal del resolver permanece
pendiente de retirada y el AEX estable continúa siendo la ruta instalada.
## Phase 5.13C.5 — Resolver Observability Contract

La observabilidad del resolver se separa de su decisión funcional mediante el
POD `CF_GeometryTargetResolutionDiagnostic` y el enum
`CF_GeometryTargetResolveStatus`. El diagnóstico contiene versión, intento,
layer IDs, profundidad solicitada/resuelta, tokens finales, índice de
desajuste y Unique Stream ID runtime. No contiene handles, punteros ni strings.

Se evaluaron parámetros ocultos, arbitrary data, sequence data y rutas AEGP.
Los parámetros ocultos son legibles desde CEP, pero `PF_ParamDef` durante
Render es una instantánea de entrada; escribirla no persiste por instancia.
`AEGP_SetStreamValue()` mutaría streams del proyecto y no es un canal seguro
para MFR ni para observación temporal. Arbitrary/sequence data no ofrecen un
lector CEP directo en el flujo actual. Por ello esta fase implementa el
contrato POD/status como salida local del resolver y conserva el trace de
archivo únicamente como puente diagnóstico; no añade parámetros ni Disk IDs.

La política de lifecycle es reiniciar el diagnóstico en cada intento, sin
estado global mutable. El diagnóstico observa el resolver, no rescata rutas,
no activa Rectangle Source y no habilita Group Transform. Falta todavía un
canal externo reproducible para leer ese POD después del render; hasta que se
defina uno compatible con el SDK, la fase permanece NO-GO y la instrumentación
temporal de archivo no debe incorporarse al producto final.
## Phase 5.13C.6 — Functional Geometry Target Resolver Proof

La activación controlada del Single Group Transform queda condicionada a una
identidad jerárquica válida, resolución completa hasta Rectangle Path y un
contexto de grupo 2D finito, no anidado, sin skew, con escalas positivas y sin
parenting/3D. Si cualquiera de esas condiciones falla, el resultado conserva
Layer Bounds como fallback completo.

La compuerta construye una identidad runtime a partir de `CF_GeometryTargetPath`
y `CF_GeometryTargetLocation`; no usa selección UI ni rebinding heurístico.
Sólo cuando el resolver devuelve el Rectangle Path final se consulta el
transform del grupo inmediato y se entrega al pipeline existente. El renderer,
la matemática affine y Trim no cambian.

El harness de C6 crea dos grupos hermanos deliberadamente distintos y captura
cada Rectangle Path por separado para comprobar que los índices de ruta
seleccionan objetivos inequívocos. La matriz de invalidación y la matriz A–Z
permanecen pendientes hasta demostrar ambos resultados contra un oracle raster
independiente. Group Transform animado o por expresión queda fuera de alcance.
### Resultado de validación C6

La compuerta de activación Single Group Transform quedó implementada de forma
conservadora, pero el harness automatizado no produjo una ejecución runtime
observable de Target A/B. No se declara soporte funcional ni se ejecuta la
matriz A–Z hasta contar con un oracle raster independiente y una sesión de
After Effects reproducible.

## Phase 5.13C.16 — Hierarchical Path Runtime Resolver

El runtime utiliza `CF_GeometryTargetPath` como identidad primaria: valida la
versión, la capa, el número de segmentos, el `propertyIndex` exacto y el token
de Match Name de cada segmento. No escanea siblings ni intenta re-enlazar el
target por heurística.

`uniqueStreamId` no es una identidad válida cuando vale cero. En particular,
After Effects puede devolver cero para streams no relacionados, como `ADBE
Marker`; por ello ese valor no participa en la selección del Rectangle Path.
Tras resolver correctamente el último stream y comprobar `ADBE Vector Shape -
Rect`, el ID puede conservarse únicamente como diagnóstico secundario.

Para el Single Group Transform, la cadena de referencias se resuelve en el
mismo ámbito: Rectangle Path → `ADBE Vectors Group` → `ADBE Vector Group` →
`ADBE Vector Transform Group`. El stream final de Rectangle Path y cada parent
creado por el SDK son referencias temporales; el componente que los adquiere
los libera antes de retornar y ningún handle se almacena en el Core.

Un Rectangle Path directamente bajo `ADBE Root Vectors Group` es un no-op
válido (`isValid = TRUE`, `hasGroupTransform = FALSE`). Si la ruta contiene
más de un `ADBE Vector Group`, la resolución se considera no soportada y se
mantiene el fallback. Esta fase no habilita Nested Groups ni modifica el
renderer, la matemática affine, Trim o el provider CEP.

## Phase 5.13C.17–C.25 — Cierre de validación del Single Group Transform

Las fases C.17–C.19 verificaron el flujo affine, Trim al cero y la igualdad
exacta del fallback. En todos los casos no soportados, Layer Bounds continúa
siendo la fuente seleccionada y el renderer histórico permanece sin cambios.

C.20–C.24 establecieron el oracle raster independiente: la AABB se utiliza
como rechazo temprano y la membership final se evalúa contra la primitive
orientada con centros de píxel `(x + 0.5, y + 0.5)`. Un píxel dentro de la
AABB pero fuera de `CF_OrientedRectangle` debe permanecer transparente.

C.25 completó las referencias Layer Bounds para P, Q, R, S, T, U y Z. Cada
captura coincidió byte a byte con su referencia existente: dimensiones
`1920 × 1080`, cero píxeles RGBA distintos y diferencia máxima por canal cero.
Scale cero conserva un frame transparente; Scale negativo y las condiciones de
parenting, 3D y rotation mantienen el fallback esperado.

La matriz funcional A–Z obtuvo `STATUS=PASS` operativo y `STATUS=PASS` en el
análisis visual independiente. Las muestras X/Y confirmaron centro e interior
opacos, exterior transparente y rechazo de un punto dentro de la AABB pero
fuera de la primitive orientada. X/Y reutilizan la misma geometría capturada
por el harness, por lo que esta evidencia confirma membership y rasterización,
pero no pretende demostrar dos targets distintos en una misma ejecución.

El cierre no habilita nuevas fuentes geométricas ni cambia la política de
fallback. Group Transform sigue limitado a un único grupo 2D, sin skew,
parenting, 3D, nesting, animación ni expresiones. Cualquier condición fuera de
ese contrato debe continuar resolviendo Layer Bounds.

## Cross-Repository Compatibility

El panel CEP vive en el repositorio independiente
`burgosinmotion/CornerFlex-CEP`. Su archivo `COMPATIBILITY.md` es la fuente
principal para la matriz AEX ↔ CEP.

Baseline actualmente compatible:

- AEX: `ebea005d87dfc40be136bce7bf4d109c654f0f88`.
- CEP: `5a270dcb58bce6abc34f3177b8635dc2ce11fa75`.
- Rectangle Geometry Snapshot: `1`.
- Geometry Target Path: `1`.

Cualquier cambio contractual debe validarse en ambos repositorios y actualizar
la matriz de compatibilidad correspondiente.
