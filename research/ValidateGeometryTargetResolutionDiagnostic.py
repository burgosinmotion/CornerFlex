"""Pure contract checks for CF_GeometryTargetResolutionDiagnostic."""

from dataclasses import dataclass
from enum import IntEnum


class Status(IntEnum):
    NOT_ATTEMPTED = 0
    OK = 1
    INVALID_REQUEST = 2
    LAYER_MISMATCH = 3
    SEGMENT_INDEX_INVALID = 4
    MATCH_NAME_MISMATCH = 5
    STREAM_ERROR = 6
    FINAL_NOT_RECTANGLE = 7
    DEPTH_INVALID = 8


@dataclass
class Diagnostic:
    version: int = 1
    was_attempted: bool = False
    status: Status = Status.NOT_ATTEMPTED
    requested_layer_id: int = -1
    resolved_layer_id: int = -1
    requested_segment_count: int = 0
    resolved_segment_count: int = 0
    final_expected_token: int = 0
    final_resolved_token: int = 0
    final_unique_stream_id: int = 0
    mismatch_segment_index: int = -1


def valid_payload() -> Diagnostic:
    return Diagnostic(
        was_attempted=True,
        status=Status.OK,
        requested_layer_id=7,
        resolved_layer_id=7,
        requested_segment_count=4,
        resolved_segment_count=4,
        final_expected_token=4,
        final_resolved_token=4,
        final_unique_stream_id=123,
    )


def main() -> int:
    cases = {
        "default": Diagnostic(),
        "resolved": valid_payload(),
        "invalid_request": Diagnostic(was_attempted=True, status=Status.INVALID_REQUEST),
        "layer_mismatch": Diagnostic(was_attempted=True, status=Status.LAYER_MISMATCH),
        "segment_mismatch": Diagnostic(
            was_attempted=True,
            status=Status.MATCH_NAME_MISMATCH,
            mismatch_segment_index=2,
        ),
        "final_not_rectangle": Diagnostic(
            was_attempted=True,
            status=Status.FINAL_NOT_RECTANGLE,
            final_expected_token=4,
            final_resolved_token=3,
        ),
        "invalid_depth": Diagnostic(
            was_attempted=True,
            status=Status.DEPTH_INVALID,
            requested_segment_count=9,
        ),
        "version_mismatch": Diagnostic(version=99, status=Status.INVALID_REQUEST),
    }

    assert cases["default"].status is Status.NOT_ATTEMPTED
    assert cases["default"].was_attempted is False
    assert cases["resolved"].status is Status.OK
    assert cases["resolved"].final_unique_stream_id != 0
    assert cases["segment_mismatch"].mismatch_segment_index == 2
    assert cases["final_not_rectangle"].final_expected_token != cases["final_not_rectangle"].final_resolved_token
    assert cases["invalid_depth"].requested_segment_count > 8
    assert cases["version_mismatch"].version != 1

    print("PHASE 5.13C.5 PURE DIAGNOSTIC RESULT: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
