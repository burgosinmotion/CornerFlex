# Phase 5.14 Architecture Review

## 1. Alcance y baseline auditado

Esta revisión es exclusivamente arquitectónica. No modifica C++, headers,
provider, panel, parámetros, Match Names, Disk IDs, versiones de contrato,
binarios ni evidencia histórica.

Se auditaron los dos repositorios relacionados:

- AEX: `codex/cornerflex-development`, HEAD `2ec2ca651394228f0640136b9fedfdeb545b8611`, con baseline funcional de Phase 5.13C en `ebea005d87dfc40be136bce7bf4d109c654f0f88`.
- CEP: `main`, HEAD `112146f98f9100217ef281791fbca1d8399c03b8`, con baseline funcional en `5a270dcb58bce6abc34f3177b8635dc2ce11fa75`.

Ambos HEAD coinciden con sus ramas remotas y no hay cambios tracked pendientes.
El AEX conserva archivos históricos untracked de evidencia; no forman parte de
esta revisión ni deben limpiarse automáticamente.

Contratos cruzados vigentes:

- Effect Match Name: `BurgosInMotion CornerFlex`.
- Rectangle snapshot version: `1`.
- Geometry target path version: `1`.

## 2. Estado funcional actual

### 2.1 Rectangle Source

El flujo activo es:

`ReadGeometryTargetState()` → `GetActiveGeometryTargetIdentity()` → lectura de
snapshot/path → `ResolveGeometrySource()` → `BuildGeometryContext()` →
operaciones → `BuildRenderContext()` → callbacks 8/16 bpc.

`SelectRectangleSourceData()` prioriza el snapshot solamente cuando el
parámetro oculto `Rectangle Snapshot Enabled` está activo y el snapshot pasó
`ValidateRectangleGeometrySnapshot()`. Si no hay una fuente válida, la ruta
seleccionada es `ResolveLayerBoundsGeometry(inputWidth, inputHeight)`.

La fuente rectangular soportada describe Size, Position, Roundness y Direction
como datos simples. El snapshot se convierte a bounds locales y luego a espacio
del efecto mediante el contexto de coordenadas, la transformación de capa 2D y,
cuando corresponde, la transformación de un único Shape Group.

### 2.2 Clasificación

| Capacidad | Estado | Condición / observación |
|---|---|---|
| Rectangle Path capturado por el provider | SUPPORTED | Snapshot version 1 y target path version 1; Match Name y jerarquía válidos. |
| Rectangle Size/Position/Direction | SUPPORTED | Valores serializados por el provider y validados antes de convertir bounds. |
| Rectangle Roundness | SUPPORTED AS DATA | Se transporta y valida, pero no altera todavía la primitiva/rasterizado de esquinas. |
| Rectangle Source con un grupo 2D | SUPPORTED | Un único `ADBE Vector Group`, transformado con Scale positivo finito, Rotation y sin Skew. |
| Rectangle Path directo bajo Root Contents | SUPPORTED | Caso válido de no-op de transformación de grupo. |
| Layer Anchor Point, Position, Scale 2D y Rotation | SUPPORTED | Evaluados en tiempo de composición durante render; las rutas validadas de fases anteriores permanecen. |
| Trim para Rectangle Source orientado | SUPPORTED | Se realiza en primitive/local space antes de la transformación de capa; el renderer usa membership orientado. |
| Snapshot inválido, ausente o desactivado | SUPPORTED VIA FALLBACK | Se usa Layer Bounds sin cambiar parámetros ni identificar otra geometría. |
| Target no encontrado, path incompatible o versión no soportada | SUPPORTED VIA FALLBACK | La fuente rectangular permanece no disponible y se conserva Layer Bounds. |
| Scale cero, negativo, no finito o transformación no soportada | SUPPORTED VIA FALLBACK | El contexto transformado no se valida; no se activa Rectangle Source. |
| Shape Group anidado (más de un Vector Group) | NOT YET SUPPORTED | El resolver marca `isUnsupported` y retorna contexto inválido. |
| Parenting de capa | NOT YET SUPPORTED | La resolución de Layer Transform 2D rechaza una capa con parent. |
| Capa 3D | NOT YET SUPPORTED | La resolución rechaza `AEGP_IsLayer3D == TRUE`. |
| Shape Group Skew | NOT YET SUPPORTED | Skew distinto de cero invalida el contexto del grupo. |
| Múltiples targets activos simultáneos | NOT YET SUPPORTED | El contrato actual transporta una identidad/path por instancia. |
| Animación/expresiones de Group Transform | UNKNOWN / REQUIRES INVESTIGATION | La infraestructura lee tiempo de render, pero el alcance validado de C.16 fue un único grupo 2D; requiere matriz específica antes de publicarse. |

## 3. Mapa de guards y fallbacks

### 3.1 Snapshot y source selection

- `ValidateRectangleGeometrySnapshot()` rechaza versión distinta de
  `CF_RECTANGLE_GEOMETRY_SNAPSHOT_VERSION`, `isValid == FALSE`, valores no
  finitos y tamaños negativos.
- `IsRectangleSnapshotSourceEnabled()` exige el parámetro oculto de activación.
- `ConvertRectangleGeometrySnapshotToSourceData()` rechaza snapshot,
  `CF_RectangleCoordinateContext` o `CF_LayerTransform2DContext` inválidos.
- `TransformLocalBoundsToEffectSpace()` rechaza bounds no finitos, invertidos o
  transformaciones no válidas.
- `SelectRectangleSourceData()` nunca sustituye silenciosamente un target:
  selecciona snapshot válido, después una fuente descubierta válida y, si no,
  retorna fuente no disponible para que el flujo use Layer Bounds.

### 3.2 Target identity y path

- `ReadGeometryTargetPath()` valida versión, `isValid`, layer ID, profundidad,
  número de segmentos, `propertyIndex` y tokens de Match Name.
- `ResolveGeometryTargetPathFromAfterEffects()` requiere suites disponibles,
  capa resoluble, Contents válido y coincidencia de cada segmento de la ruta.
- La ruta se resuelve por jerarquía determinista; no se elige el primer path ni
  se rebindean hermanos por nombre visible.
- `uniqueStreamId` se conserva como diagnóstico secundario. La identidad
  publicada primaria es la ruta versionada de segmentos/tokens/índices.

### 3.3 Layer y Shape Group transforms

- `ResolveLayerTransform2DFromAfterEffects()` rechaza origen/downsample no
  compatible, capa 3D, parenting, comp/layer inválidos, dimensiones no
  positivas, Scale no finito/no positivo y Rotation no evaluable como OneD.
- `ReadSingleGroupTransform()` rechaza propiedades faltantes, Scale no
  positivo, Skew distinto de cero y matrices no finitas.
- `ResolveSingleGroupTransformFromAfterEffects()` rechaza más de un segmento
  `CF_MATCH_VECTOR_GROUP`; solo acepta un grupo inmediato o un Rectangle Path
  directo bajo Root Contents.
- Todas las referencias de suites/streams se adquieren en el ámbito de la
  llamada y se disponen antes de retornar.

### 3.4 Renderer y Trim

`TrimFunc8()` y `TrimFunc16()` no consultan CEP ni suites. Para Rectangle Source
usan la primitiva orientada como membership final y el AABB como rechazo rápido;
un píxel dentro del AABB pero fuera de la primitive se descarta. Layer Bounds
conserva la ruta histórica. Trim modifica únicamente la geometría de trabajo y
preserva el origen base.

## 4. Arquitectura actual y límites

### 4.1 AEX Core

El Core ya separa snapshot, target path, source resolution, geometry context,
operations y renderer. `CF_GeometryContext` conserva metadata de origen,
`CF_RectangleGeometry` funciona como primitiva base y `geometryBounds` como
working geometry. `CF_AffineRectangle` existe como foundation matemática
paralela; la ruta funcional validada continúa usando `CF_OrientedRectangle` y
las funciones de membership asociadas.

### 4.2 CEP

El provider público `CornerFlexGeometryProvider.jsx` aplica el Match Name
canónico, captura snapshot version 1 y serializa target path version 1 con
segmentos de jerarquía. `main.jsx` lo incluye y `js/main.js` garantiza la carga
mediante `$.evalFile()` cuando aún no está en el global. El CEP no renderiza ni
calcula píxeles; solo identifica/captura y escribe parámetros ocultos.

### 4.3 Contrato y compatibilidad

No se recomienda cambiar `CF_RECTANGLE_GEOMETRY_SNAPSHOT_VERSION` ni
`CF_GEOMETRY_TARGET_PATH_VERSION` en Phase 5.14 mientras se amplía la capacidad
de transformación. Un cambio de esquema solo debe ocurrir si aparecen nuevos
campos obligatorios o una semántica incompatible; en ese caso se requiere
versionado explícito, lectura backward-compatible y actualización coordinada de
CEP y AEX.

## 5. Candidatos para Phase 5.14

| Candidato | Valor | Complejidad | Riesgo | Cambios contractuales probables |
|---|---:|---:|---:|---|
| A. Nested Shape Group Transform acotado | Alto | Media-alta | Medio | Ninguno si se reutiliza path version 1 y se mantiene fallback por profundidad. |
| B. Robustez de resolver y diagnóstico | Medio | Media | Bajo | Ninguno; mejora observabilidad y casos inválidos. |
| C. Múltiples Rectangle Paths y selección explícita | Alto | Media-alta | Medio-alto | Probablemente ampliar estado/flujo de selección, no necesariamente snapshot. |
| D. Parenting 2D | Alto | Alta | Alto | Puede requerir nuevo contrato de transformaciones y validación cross-layer. |
| E. Evolución del snapshot (más metadata geométrica) | Medio | Media | Alto | Posible incremento de `snapshotVersion` y compatibilidad CEP/AEX. |

### Recomendación

El candidato recomendado es **A: soporte acotado para un único Shape Group
anidado adicional**, con profundidad máxima explícita (un nivel nuevo), sin
parenting, 3D, Skew, múltiples targets ni cambios de renderer fuera de la
composición de la transformación ya existente.

Es el siguiente incremento funcional más pequeño: la identidad/path ya
transporta la jerarquía, el Core ya tiene composición afín y el fallback por
profundidad está definido. Si cualquier segmento adicional no puede validarse
de forma determinista, debe mantenerse Layer Bounds. El alcance no requiere
cambiar Match Names, Disk IDs, snapshot version ni target path version.

## 6. Plan incremental propuesto

### Phase 5.14A — Contract and pure math

Documentar la profundidad permitida, el orden de composición y las invariantes
de transformación. Añadir fixtures/pure tests sin activar el resolver.

### Phase 5.14B — Deterministic nested target resolution

Extender el recorrido únicamente para un nivel adicional de `ADBE Vector Group`.
Validar Match Names, índices, profundidad y propiedad Transform en cada nivel.
Mantener fallback inmediato ante ambigüedad, grupo ausente o profundidad mayor.

### Phase 5.14C — Activation gate

Conectar el contexto anidado solo cuando todos los niveles sean válidos, finitos,
2D, no parentados, no skew y con Scale positiva. La ausencia de cualquier
condición debe dejar `rectangleSource.isAvailable = FALSE`.

### Phase 5.14D — Renderer integration and MFR audit

Reutilizar la representación orientada existente, verificando que Trim siga
ocurriendo en primitive-space y que el renderer reciba una geometría ya
transformada/validada. Revisar lifetime de suites y ausencia de estado global
mutable bajo MFR.

### Phase 5.14E — Visual regression and closure

Ejecutar una matriz pequeña, stop-on-first-failure, contra Layer Bounds y contra
la ruta Rectangle Source. Cerrar la fase solo con evidencia de membership,
alpha bounds, RGBA y fallback.

## 7. Matriz de validación mínima

| Caso | Configuración | PASS | FAIL |
|---|---|---|---|
| A | Rectangle Source, identidad, grupo único actual | RGBA y bbox iguales al baseline C.16 | Diferencia fuera de tolerancia o fallback inesperado |
| B | Un Shape Group anidado válido, transform identidad | Target path correcto, primitive y bounds esperados | Target equivocado o Layer Bounds sin motivo |
| C | Grupo anidado con Position | Centro y bbox coinciden con referencia independiente | Traslación no aplicada o doble aplicación |
| D | Scale uniforme positivo | Extensión proporcional y membership orientado correctos | AABB usado como primitive final |
| E | Scale no uniforme positivo | Ejes y esquinas coinciden con oracle afín | Inversión, redondeo o orden incorrecto |
| F | Rotation positiva/negativa | Centro, esquinas y punto AABB-only correctos | Puntos fuera de primitive aceptados |
| G | Trim 0 %, 10 %, 50 % | Trim local conserva lado/origen y alpha esperado | Trim aplicado después de transformar o desplaza origen |
| H | Segundo nivel adicional | Solo se activa si la profundidad permitida es exacta | Activación con profundidad no soportada |
| I | Profundidad mayor que la permitida | Fallback Layer Bounds, sin crash | Rebind automático o frame transparente |
| J | Grupo faltante/Match Name incorrecto | Fallback seguro | Primer grupo elegido por posición |
| K | Scale cero/negativo/NaN | Fallback seguro | Matriz inválida o activación parcial |
| L | Skew, parenting o 3D | Fallback documentado | Soporte implícito no validado |
| M | Snapshot/path version mismatch | Fallback y reporte de incompatibilidad | Interpretación silenciosa de versión futura |
| N | Animación/expresión de grupos | Solo PASS si se valida explícitamente en tiempo de render | Resultado no determinista o stale |
| O | CEP carga provider y captura target | Provider cargado, parámetros coherentes, AEX consume mismo path | `PROVIDER_NOT_LOADED` o desalineación de versiones |

Cada caso debe capturar configuración, tiempo, source seleccionada, fallback,
alpha bbox, membership de puntos críticos y diferencia RGBA frente a una
referencia independiente. La matriz debe separar fallos de captura CEP,
resolución AEX, conversión geométrica y rasterizado.

## 8. Riesgos y decisiones de diseño

- **Composición de transforms:** el orden de matrices y el pivot de cada grupo
  son el riesgo principal; debe existir un oracle independiente antes de
  activar el segundo nivel.
- **Ambigüedad de identidad:** no debe resolverse por nombre visible ni por
  “primer grupo”; la ruta versionada es la única selección determinista.
- **Persistencia:** mantener versiones 1 hasta que cambie el esquema; toda
  extensión incompatible debe rechazar y hacer fallback, nunca reinterpretar.
- **MFR:** no retener handles ni contextos mutables entre frames; resolver y
  disponer referencias por llamada.
- **Regresión:** Layer Bounds debe seguir siendo byte/pixel-equivalente en sus
  casos históricos y todos los guards defensivos deben conservarse.

## 9. Decisión de preparación

Phase 5.14 puede comenzar únicamente como investigación/implementación
incremental de **Nested Shape Group Transform acotado**. No se autoriza todavía
modificar C++, provider, parámetros, contratos, renderer ni iniciar una matriz
visual. El primer paso autorizado debería ser Phase 5.14A, con contrato POD,
composición pura y fixtures aislados.

**PHASE 5.14 ARCHITECTURE REVIEW COMPLETE**
