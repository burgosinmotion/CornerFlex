# Phase 5.15A-II — Case A First-Fail Diagnostic

## Resultado

**PHASE 5.15A-II CASE A DIAGNOSTIC: COMPLETE**

Clasificación: **HARNESS — fixture/keyframe setup**. No hay evidencia de fallo
de producción, provider, snapshot, resolución geométrica, oracle, PNG ni
sincronización de archivos.

## Evidencia directa

`research/output/Phase515AAnimatedNestedTransforms/AnimatedNestedTransformsReport.txt`
contiene:

```text
PHASE 5.15A-I ANIMATED NESTED TRANSFORM VALIDATION
STOP_ON_FIRST_FAILURE=true
CASE_COUNT=12
TIMES=T0,T0.5,T1
TRIM=0
EXPECTED_SOURCE=RECTANGLE_SOURCE
MODE=AUTONOMOUS_MANUAL_EXECUTION
STATUS=FAIL_OPERATIONAL
FAILED_CASE=A
ERROR=ReferenceError: Object is invalid
```

No existen `CASE_A_CONFIG`, `CASE_A_CAPTURE`, `CASE_A_TIME` ni
`CASE_A_OUTPUT`. El directorio no contiene `CaseA_T0.png`, por lo que el fallo
precede tanto a `saveFrameToPng()` como a su polling de existencia.

## Punto exacto acotado por el flujo

`runCase()` ejecuta, en este orden:

1. creación de composición y Shape Layer;
2. creación de Root → Outer → Inner → Rectangle;
3. aplicación de keyframes y expresiones;
4. creación/configuración de CornerFlex;
5. selección y `captureSelectedRectangleSnapshot()`;
6. render de T0/T0.5/T1.

Al no existir ninguna línea de configuración o captura, el error está acotado
a los pasos 1–4. Para Case A la única operación temporal específica es
`animate()` sobre `ADBE Vector Position` de Inner, mediante
`Property.setValueAtTime(0/0.5/1, [x,y])`. La categoría más probable es, por
tanto, **keyframe creation** dentro de **fixture creation**. El mensaje genérico
`ReferenceError: Object is invalid` no permite atribuirlo a una línea concreta
del host sin instrumentación adicional.

## Lo que sí y no se pudo demostrar

- Keyframes: **no confirmado**; la ejecución falló antes de registrar valores.
- Snapshot/provider: **no ejecutado** en Case A; no hay `SNAPSHOT_CAPTURED`.
- Rectangle Snapshot stale: no aplicable; el snapshot ni siquiera se alcanzó,
  y Size/Position del Rectangle son estáticos.
- Geometry Target Path/source selection: no ejecutado.
- Group Transform AEGP: no ejecutado por este harness.
- `comp.time` y `saveFrameToPng`: no alcanzados.
- PNG synchronization/File.length: no aplicable; no hubo archivo.
- Producción/AEX: sin evidencia de defecto.
- Oracle: no interviene en la detención del JSX.

## Corrección mínima recomendada (no aplicada)

Modificar únicamente el harness para aislar la operación temporal antes de
continuar: comprobar que cada propiedad existe y es temporalmente animable,
crear los keyframes con una rutina defensiva y escribir un checkpoint después
de cada propiedad (`CASE_A_KEYFRAME_*`). Si `setValueAtTime()` no es válido para
una propiedad concreta del Shape Group, usar el método de keyframe soportado
por esa propiedad o detener con una causa explícita. No tocar provider, AEX,
renderer, Trim ni contratos.

La siguiente ejecución diagnóstica debe detenerse todavía en A y registrar:

```text
CASE_A_FIXTURE_CREATED
CASE_A_INNER_POSITION_KEYFRAMES_CREATED
CASE_A_CAPTURE=SNAPSHOT_CAPTURED
```

antes de habilitar B–L. No debe declararse ningún resultado visual hasta que
exista PNG y el analyzer independiente pueda procesarlo.

## Resultado del checkpoint retry

El segundo reporte añade evidencia decisiva:

```text
CASE_A_CHECKPOINT_10=AFTER_SET_VALUE_AT_TIME label=Inner Position time=0 numKeys=1
CASE_A_CHECKPOINT_12=AFTER_SET_VALUE_AT_TIME label=Inner Position time=0.5 numKeys=2
CASE_A_CHECKPOINT_14=AFTER_SET_VALUE_AT_TIME label=Inner Position time=1 numKeys=3
CASE_A_CHECKPOINT_17=RECTANGLE_SIZE_ASSIGNED
CASE_A_CHECKPOINT_18=RECTANGLE_POSITION_ASSIGNED
STATUS=FAIL_OPERATIONAL
FAILED_CASE=A
ERROR=ReferenceError: Object is invalid
```

Por lo tanto, la creación de keyframes no es la causa: Inner Position es
temporalmente variable y los tres keyframes existen. La fixture alcanza la
creación del Rectangle y sus propiedades; no se registra `CASE_A_CAPTURE`, por
lo que el error está en la transición hacia selección/captura.

La causa concreta más probable es una referencia stale del Rectangle Path. En
`addRectangle()` se conserva `r` y después se añade el Fill al mismo Contents;
After Effects puede invalidar la referencia de propiedad al mutar el grupo.
El harness 5.14D evitaba precisamente esto reacquiring el Rectangle mediante
`contents.property("ADBE Vector Shape - Rect")` después de añadir el Fill. Al
seleccionar `rect.selected = true` en `capture()`, esa referencia stale puede
producir `ReferenceError: Object is invalid` antes de invocar el provider.

Clasificación final: **HARNESS — stale property reference during selection**.
No hay evidencia de snapshot stale, resolución geométrica ni defecto del AEX.

Corrección mínima recomendada, aún no aplicada: reacquire el Rectangle Path
después de crear el Fill y antes de devolverlo desde `addRectangle()` (o justo
antes de seleccionarlo), manteniendo el mismo Match Name y la misma fixture.
Después debe registrarse un checkpoint `RECTANGLE_REACQUIRED` y recién entonces
intentar `captureSelectedRectangleSnapshot()`. No cambiar keyframes, valores,
producción ni oracle.

## Estado de Git

`git diff --check` permanece limpio. No se modificaron `Skeleton.cpp`,
`Skeleton.h`, provider, CEP, AEX ni el harness original. No se hizo staging,
commit, push, compilación ni ejecución automática de After Effects.

**GO** únicamente para modificar el harness con checkpoints y diagnóstico de
keyframes. **NO-GO** para continuar B–L o investigar producción hasta resolver
esta causa operacional.
