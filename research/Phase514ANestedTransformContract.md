# Phase 5.14A — Nested Transform Contract Research

## Resultado

**PHASE 5.14A NESTED TRANSFORM CONTRACT RESEARCH COMPLETE**

Esta investigación no implementa soporte nested en producción. No se modificaron
`Skeleton.cpp`, `Skeleton.h`, `CornerFlex_Architecture.md`, CEP, provider,
parámetros ni tests productivos.

## 1. Precheck

- AEX: rama `codex/cornerflex-development`, HEAD
  `2ec2ca651394228f0640136b9fedfdeb545b8611`.
- CEP: rama `main`, HEAD
  `112146f98f9100217ef281791fbca1d8399c03b8`.
- Los cambios tracked inesperados: **ninguno**.
- `research/Phase514ArchitectureReview.md` estaba untracked y se conservó.
- Los PNG/MP4 históricos untracked se conservaron sin limpieza.
- No se abrió After Effects, no se compiló y no se hizo staging, commit ni push.

## 2. Pipeline 5.13C reconstruido

```text
Rectangle Snapshot
    ↓
Geometry Target Path (version 1)
    ↓
ResolveGeometryTargetPathFromAfterEffects()
    ↓
ResolveSingleGroupTransformFromAfterEffects()
    ↓
ResolveGeometrySource() / CF_GeometrySourceData
    ↓
ConvertRectangleGeometrySnapshotToSourceData()
    ↓
CF_AffineRectangle / CF_OrientedRectangle
    ↓
geometryBounds y CF_RenderContext
    ↓
membership (AABB rejection + oriented primitive)
    ↓
Trim / TrimFunc8() / TrimFunc16()
```

Responsabilidades observadas:

- `CF_RectangleGeometrySnapshot` transporta Size, Position, Roundness,
  Direction y la validez/versionado del snapshot.
- `CF_GeometryTargetPath` transporta la identidad jerárquica mediante segmentos
  `{propertyIndex, expectedMatchToken}`.
- `ResolveGeometryTargetPathFromAfterEffects()` vuelve a resolver la ruta en
  cada llamada sin retener handles.
- `ResolveSingleGroupTransformFromAfterEffects()` lee el transform del grupo
  inmediato y entrega una matriz afín de grupo.
- `ConvertRectangleGeometrySnapshotToSourceData()` convierte bounds locales a
  espacio del efecto usando coordenadas, grupo y capa.
- El renderer no consulta CEP ni calcula geometría de Shape Groups.

## 3. Restricción Single Group localizada

La restricción está codificada explícitamente en dos lugares:

1. `ResolveSingleGroupTransformFromAfterEffects()` cuenta segmentos con token
   `CF_MATCH_VECTOR_GROUP` y retorna `isUnsupported = TRUE` cuando el conteo es
   mayor que uno.
2. El mismo resolver solo acepta la cadena inmediata
   `Rectangle Path → ADBE Vectors Group → ADBE Vector Group → Transform`, o el
   caso no-op de Rectangle directo bajo `ADBE Root Vectors Group`.

`ReadSingleGroupTransform()` además rechaza un `ADBE Vector Group` cuyo padre
sea otro `ADBE Vector Group`, y no activa el contexto si faltan propiedades,
hay Skew, Scale no positiva o una matriz no finita.

## 4. Suficiencia de los contratos actuales

### Geometry Target Path v1

**GEOMETRY_TARGET_PATH_VERSION_1_SUFFICIENT = YES** para el alcance inicial de
exactamente un nivel adicional.

La versión 1 ya contiene:

- `version = 1`;
- `isValid`;
- `layerId`;
- `segmentCount`;
- hasta `CF_GEOMETRY_TARGET_PATH_MAX_DEPTH = 8` segmentos;
- por segmento, `propertyIndex` y `CF_GeometryMatchToken`.

El provider usa los Match Names oficiales:

- `ADBE Root Vectors Group` → token root;
- `ADBE Vector Group` → token Vector Group;
- `ADBE Vectors Group` → token Contents;
- `ADBE Vector Shape - Rect` → token Rectangle.

Los parámetros internos `-0023` a `-0038` contienen ocho pares de índice/token,
por lo que la cadena `Root → Outer Group → Inner Group → Contents → Rectangle`
puede representarse sin incrementar la versión. Los nombres visibles no se
serializan y no forman parte de la identidad. `uniqueStreamId` permanece solo
como diagnóstico secundario; no hay pérdida de identidad estructural para el
alcance de profundidad 2.

La suficiencia no implica que el runtime actual ya lo soporte: el resolver debe
aprender a consumir dos segmentos Vector Group y validar ambos transforms.

### Rectangle Snapshot v1

**RECTANGLE_SNAPSHOT_VERSION_1_SUFFICIENT = YES.**

El snapshot debe seguir representando exclusivamente Size, Position, Roundness,
Direction, validez/versionado y la relación con el target path. Las
transformaciones de grupos pertenecen a la capa de resolución/runtime, no al
snapshot geométrico. No debe incrementarse la versión para Phase 5.14A.

## 5. Modelo matemático nested

La transformación de cada grupo se modela como una matriz afín 2D. Para un grupo
con anchor `A`, position `P`, escala normalizada `(sx, sy)` y rotación `R`:

```text
L = R(R) · S(sx, sy)
T = P - L · A
G = [ L  T ]
    [ 0  1 ]
```

El orden requerido para:

```text
Rectangle local → Inner Group → Outer Group → Layer → Composition
```

es:

```text
M = Layer · Outer · Inner
pointComposition = M · pointRectangle
```

No es correcto sumar posiciones/rotaciones ni multiplicar escalas componente a
componente cuando existen rotaciones o escalas no uniformes. La implementación
existente de `ComposeAffineTransform2D(parent, child)` ya documenta la convención
`parent * child`: aplica primero `child` y luego `parent`.

### Shear implícito

Dos matrices con escala no uniforme y rotaciones distintas pueden producir una
parte lineal cuya descomposición visual contiene términos equivalentes a shear,
aunque ambos grupos tengan Skew explícitamente cero. Por tanto, el resultado no
debe volver a reducirse a `Scale + Rotation + Position` por componentes. Debe
conservarse como matriz afín general para composición y transformación de la
primitiva. El AABB solo debe ser una aceleración/rechazo, no la primitive final.

## 6. Estrategias comparadas

| Estrategia | Corrección | Reutilización | Riesgo | Impacto 5.13C | Testing | Profundidad N |
|---|---|---|---|---|---|---|
| Dos `CF_GroupTransform2DContext` secuenciales | Correcta si el orden es fijo | Baja | Medio | Bajo | Simple para profundidad 2 | Baja |
| Componer ambos en una affine intermedia | Correcta y conserva shear | Alta | Medio-bajo | Bajo si se activa tras validación completa | Buena | Media |
| Cadena/array de matrices afines reutilizable | Correcta y extensible | Muy alta | Medio | Mayor superficie | Requiere pruebas de orden/profundidad | Alta |

### Recomendación

Para Phase 5.14 se recomienda **componer matrices afines en una cadena interna
de transformación**, aunque el límite funcional inicial sea exactamente dos
Shape Groups. No se recomienda duplicar campos de contexto y mantener lógica
secuencial dispersa: facilita errores de orden y no escala a profundidad N.

La representación POD conceptual sería una secuencia acotada de transforms
afines ya validadas, no una nueva identidad persistente. La activación debe
rechazar la cadena completa si cualquier nivel falla.

## 7. Política conservadora de fallback

Aceptar inicialmente solo:

- capa 2D sin parent;
- Rectangle Path válido;
- uno o dos Shape Groups en la cadena exacta;
- Position, Anchor Point, Scale positiva finita y Rotation 2D evaluable;
- Skew y Skew Axis cero/no aplicados;
- snapshot/path version 1 compatibles.

Forzar Layer Bounds y dejar `rectangleSource.isAvailable = FALSE` ante:

- profundidad mayor que 2;
- target ambiguo o path incompleto;
- Match Name/índice/token incompatible;
- versión futura o inválida;
- parenting o 3D;
- transformaciones 3D, Skew o Skew Axis;
- Scale cero, negativa, no finita o degenerada;
- cualquier suite/propiedad no disponible;
- matriz compuesta no finita.

No se deben eliminar ni debilitar guards de 5.13C.

## 8. Oracle matemático independiente

Se añadió el script read-only:

`research/AnalyzePhase514ANestedAffineComposition.py`

Ejecuta los casos A–L solicitados:

- posiciones Inner/Outer y combinadas;
- rotaciones Inner/Outer y combinadas;
- escala no uniforme combinada con rotación;
- anchors distintos;
- Scale negativa y cero como fallback;
- profundidad 3 como fallback.

El oracle confirma que:

- la composición correcta es `Outer * Inner` antes de `Layer`;
- la transformación conserva términos afines generales;
- las escalas inválidas no deben activar la ruta;
- profundidad 3 debe detenerse y usar fallback.

No genera evidencia visual ni abre After Effects.

## 9. Subfases propuestas

### 5.14B — Nested Transform Foundation

- Alcance: contrato POD interno y composición pura de hasta dos transforms.
- Archivos potenciales: `Skeleton.h`, `Skeleton.cpp`, oracle/tests en `research/`.
- PASS: matrices y puntos coinciden con el oracle independiente.
- Detención: discrepancia de orden, shear perdido o modificación funcional no
  aislable.

### 5.14C — Hierarchical Runtime Resolution

- Alcance: resolver exactamente `Root → Outer → Inner → Rectangle`.
- Archivos potenciales: `Skeleton.cpp`, `Skeleton.h`, provider solo si la
  serialización actual resultara insuficiente.
- PASS: ambos grupos se validan por Match Name, índice y path version 1.
- Detención: ambigüedad, rebind por nombre o pérdida de identidad.

### 5.14D — Affine Composition Activation

- Alcance: activar la matriz compuesta únicamente cuando todos los niveles sean
  válidos; conservar ruta single-group y Layer Bounds.
- Archivos potenciales: `Skeleton.cpp`, `Skeleton.h`.
- PASS: fallback idéntico cuando la cadena no es soportada.
- Detención: cualquier cambio en baseline 5.13C.

### 5.14E — Activation Gate

- Alcance: telemetría/diagnóstico read-only y guards de profundidad, sin logs de
  render ni estado global.
- Archivos potenciales: `Skeleton.cpp`, `research/`.
- PASS: cada rechazo queda clasificable sin activar geometría parcial.
- Detención: handles retenidos, condición de carrera o activación silenciosa.

### 5.14F — Controlled Visual Validation

- Alcance: casos A–L de composición y fallbacks, con After Effects cerrado antes
  de cualquier instalación temporal.
- Archivos potenciales: scripts/reportes en `research/`.
- PASS: bbox, center, membership y RGBA frente a referencia independiente.
- Detención: primer fallo; no corregir durante la misma ejecución.

### 5.14G — Independent Matrix

- Alcance: regresión de Layer Bounds, Rectangle Source single-group y nested.
- PASS: cobertura completa de transformaciones soportadas y fallbacks.
- Detención: cualquier regresión de Phase 5.13C.

## 10. GO / NO-GO

**GO para diseñar 5.14B únicamente.** La ruta es matemáticamente viable y los
contratos versionados actuales son suficientes.

**NO-GO para producción en este momento.** Todavía no se implementa nested
runtime, no se modifica el AEX/CEP y no se autoriza instalar ni validar
visualmente la nueva capacidad.

## Archivos creados

- `research/Phase514ANestedTransformContract.md`
- `research/AnalyzePhase514ANestedAffineComposition.py`
