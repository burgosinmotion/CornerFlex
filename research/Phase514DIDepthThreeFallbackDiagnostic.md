# Phase 5.14D-I — Depth Three Fallback Diagnostic

## Classification

**PHASE 5.14D-I ROOT CAUSE: PRODUCTION**

No se modificó código de producción, provider, AEX ni contratos.

## Case I fixture

La fixture construida por `research/ValidateNestedAffineChainIntegration.jsx` es:

```text
Root
└─ Phase514D Outer
   └─ Phase514D Inner
      └─ Phase514D Deep
         └─ Phase514D Rectangle
```

- Rectangle Path: Size `[500, 500]`, Position `[0, 0]`.
- Deep: Position `[0, 0]`, Scale `[100, 100]`, Rotation `5°`.
- Inner: Position `[10, 0]`, Scale `[110, 100]`, Rotation `10°`.
- Outer: Position `[0, 10]`, Scale `[100, 100]`, Rotation `15°`.
- Shape Layer: Anchor `[960, 540]`, Position `[960, 540]`, Scale `[100, 100]`.
- Snapshot capturado: `SNAPSHOT_CAPTURED`, `pathDepth=8`, `segments=8`.

## Production trace

`Render()` obtiene el `CF_GeometryTargetPath` y llama a
`ResolveGroupTransform2DChainFromAfterEffects()`.

En `ResolveGroupTransform2DChainFromAfterEffects()`:

1. Cuenta los segmentos `CF_MATCH_VECTOR_GROUP`.
2. Para profundidad 0, 1 y 2 continúa la resolución.
3. Para `context.count > 2` establece `context.isUnsupported = TRUE` y retorna
   sin marcar `isValid`.

Por tanto, la profundidad 3 sí queda rechazada y no sobrevive una cadena affine
parcial: `isValid` permanece falso, `supportedDepth` conserva el conteo y las
transformaciones permanecen en identidad inicializada.

El problema aparece después, en `Render()`:

- `groupTransformChainContext.isValid` es falso para profundidad 3.
- `groupTransformContext` permanece inválido.
- Pero `snapshotSourceEnabled` continúa siendo verdadero.
- `convertedRectangleSource` sigue siendo disponible.
- `SelectRectangleSourceData()` y `ResolveGeometrySource()` no reciben una
  compuerta que convierta `isUnsupported` en Layer Bounds.
- `BuildGeometryContext()` recibe `CF_GEOMETRY_SOURCE_RECTANGLE`.
- La cadena de grupos no se aplica, pero la geometría rectangular capturada sí
  continúa llegando al renderer.

En consecuencia, profundidad 3 no produce el fallback de fuente esperado; solo
produce un snapshot rectangular sin cadena de grupos.

## Depth guard contract

| Profundidad | Resultado del resolver | Estado esperado |
|---:|---|---|
| 0 | válida | soportada |
| 1 | válida | soportada |
| 2 | válida si los grupos son compatibles | soportada |
| 3 | `isUnsupported=TRUE`, `isValid=FALSE` | fallback requerido |
| >3 | `isUnsupported=TRUE`, `isValid=FALSE` | fallback requerido |

No se detectó una cadena Inner/Outer parcialmente válida que alcance el
renderer desde el resolver de profundidad 3. La fuga está en la selección de
fuente, no en la composición de la cadena.

## Case I reference

Para I, el harness renderiza primero con el snapshot capturado. Después llama a
`disableRectangleSnapshot()` y renderiza la misma composición como
`CaseI_LayerBoundsReference.png`. Por tanto, la referencia reutiliza la misma
fixture, Rectangle Path, transforms de Shape Groups y estado de capa; únicamente
desactiva la fuente rectangular persistida.

La referencia no es una composición distinta ni una geometría inventada.

## Comparison with Case J

Case J usa dos grupos, pero uno tiene `Skew=20`. El lector de transformaciones
marca ese grupo como no soportado. Sin embargo, los demás transforms de J son
identidad, por lo que el snapshot rectangular sin cadena produce visualmente el
mismo contenido que la referencia Layer Bounds. Esta coincidencia no demuestra
que la compuerta de fuente sea correcta; solo oculta la diferencia con una
transformación efectiva identidad.

Case I hace visibles los efectos de Position, Scale y Rotation de los grupos.
Al conservar Rectangle Source mientras se omite la cadena, su imagen no puede
coincidir con la referencia Layer Bounds.

## Responsible branch and functions

- `ResolveGroupTransform2DChainFromAfterEffects()` — rechaza correctamente
  `count > 2`.
- `Render()` — no convierte `isUnsupported`/`!isValid` en desactivación de
  Rectangle Source.
- `SelectRectangleSourceData()` / `ResolveGeometrySource()` — reciben la
  fuente rectangular disponible sin una señal de fallback por profundidad.

## Recommended minimal fix (not implemented)

Antes de seleccionar `CF_RectangleSourceData`, introducir una compuerta local
que fuerce Layer Bounds cuando la resolución jerárquica indique
`isUnsupported` o una profundidad fuera de 0–2. La corrección debe preservar los
contratos de snapshot y no tocar versiones, provider ni renderer.

Debe validarse primero con I y J, y después repetir la matriz reducida A–J.

## Files inspected

- `Skeleton.cpp`
- `Skeleton.h`
- `research/ValidateNestedAffineChainIntegration.jsx`
- `research/output/Phase514DNestedAffineChainIntegration/NestedAffineChainIntegrationReport.txt`

No se creó un harness adicional porque la inspección estática demuestra la
causa sin otra ejecución de After Effects.
