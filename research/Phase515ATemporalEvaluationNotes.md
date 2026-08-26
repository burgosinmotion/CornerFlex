# Phase 5.15A — Temporal Evaluation Notes

## Observed runtime contract

`Render()` receives `PF_InData::current_time` and `time_scale`. The AEGP
adapter converts that effect time once per render through
`AEGP_ConvertEffectToCompTime()` and passes the resulting `AEGP_Time` to the
layer and Shape Group stream readers.

Layer Anchor Point, Position, Scale and Rotation are read with
`AEGP_GetLayerStreamValue()`. Shape Group Anchor, Position, Scale, Rotation and
Skew are read with `AEGP_GetNewStreamValue()`. Both paths use
`AEGP_LTimeMode_CompTime` and `pre_expressionB = FALSE`, therefore the intended
value is the post-expression value at the current render time.

The Inner and Outer group readers receive the same `compTime` during one
resolution. Layer and group matrices are rebuilt for that render; no mutable
global transform cache was found. Rectangle Size/Position come from the CEP
snapshot and are not re-evaluated by the AEX, so a stale snapshot remains a
separate risk if the user animates those Rectangle Path properties.

## Validation boundary

Phase 5.15A keeps Trim at zero and tests only animated/expression-driven group
and layer transforms. A later phase must decide whether animated Rectangle
Size/Position require a new snapshot transport contract. No production change
is implied by these notes.
