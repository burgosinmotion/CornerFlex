"""Emit the static Phase 5.13C.17 conclusion without loading the AEX."""
from ValidateAffineExtentDataFlow import aabb


def main():
    full = aabb(300, 180, 0.8, 1.2, -25)
    trimmed = aabb(240, 144, 0.8, 1.2, -25)
    print("Phase 5.13C.17 Affine Extent / Basis Scaling Investigation")
    print("Target A full oracle AABB extent: %.6f x %.6f" % full)
    print("Target A with default Trim 10%% extent: %.6f x %.6f" % trimmed)
    print("Observed raster extent: approximately 245 x 236")
    print("Conclusion: Trim is applied before affine extent computation.")
    print("No double Group Scale was found in the affine functions.")


if __name__ == "__main__":
    main()
