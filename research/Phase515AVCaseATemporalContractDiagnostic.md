# Phase 5.15A-V — Case A T0.5 Temporal Contract Diagnostic

## Alcance

Este diagnóstico aísla la discrepancia independiente observada en `Case A @ T0.5`.
No modifica C++, el AEX, el provider, CEP ni el harness principal. El JSX auxiliar
solo crea una propiedad de posición y registra su evaluación temporal.

## Hechos del harness

- Case A define `Inner Position` en tres claves explícitas:
  - `T0 = [0, 0]`
  - `T0.5 = [80, -40]`
  - `T1 = [160, 20]`
- Las claves se crean en ese orden mediante `setValueAtTime()`.
- No se llama a `setInterpolationTypeAtKey()`; por tanto, la interpolación efectiva
  debe verificarse en After Effects y no se presupone aquí.
- El harness principal fija `comp.time = time` y llama `saveFrameToPng(time, file)`.
- La captura del Rectangle Snapshot ocurre una sola vez antes de cambiar el tiempo;
  Size/Position del Rectangle son estáticos en Case A.

## Discrepancia independiente

El analyzer Node reproduce exactamente `T0`, pero en `T0.5` calcula:

- esperado: visible AABB `(0,0)-(330,160)`, centro `(165,80)`, 52.800 píxeles;
- observado: `(0,0)-(330,110)`, centro `(165,55)`, 36.300 píxeles;
- delta inferior: `-50 px`.

La diferencia equivale a una traslación vertical de `-50 px` o a un valor de posición
distinto del previsto. Todavía no clasifica un defecto de producción.

## Diagnóstico runtime pendiente

Ejecutar manualmente:

`research/DiagnoseAnimatedCaseATemporalValues.jsx`

El reporte registrará número de claves, tiempos, valores, interpolaciones de entrada/salida,
`valueAtTime()` con `preExpression=false/true` y `property.value` para `T0`, `T0.5` y `T1`.

## Resultado del diagnóstico

After Effects reportó exactamente:

- tres claves en `0`, `0.5` y `1`;
- valores `[0,0]`, `[80,-40]`, `[160,20]`;
- interpolación `6612` en entrada y salida de cada clave (valor de la constante
  `LINEAR` del DOM de After Effects);
- `valueAtTime(0.5, false) = [80,-40]` y `property.value = [80,-40]`.

Por tanto, la discrepancia no procede de interpolación de After Effects ni de una
referencia stale. El analyzer Node estaba interpolando `T0`→`T1` con `lerp()` y
utilizaba `[80,10]` en `T0.5`, aunque existe una clave explícita `[80,-40]`.

`PHASE 5.15A-V CASE A T0.5 ROOT CAUSE: ORACLE`

La corrección mínima recomendada es que el oracle consuma el valor de la clave
explícita cuando el tiempo coincide con `T0.5` (y aplique interpolación solo entre
claves cuando no exista una clave en ese tiempo). No se aplica esa corrección en
esta fase.
