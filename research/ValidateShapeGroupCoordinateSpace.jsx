(function () {
    var rootFolder = new Folder("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase513C9ShapeGroupCoordinateSpace");
    var report = new File(rootFolder.fsName + "/Phase513C9ShapeGroupCoordinateSpaceReport.txt");
    var comp = null;

    function log(value) {
        report.open("a");
        report.write(String(value) + "\n");
        report.close();
    }

    function resetOutput() {
        if (!rootFolder.exists) { rootFolder.create(); }
        var entries = rootFolder.getFiles();
        for (var i = 0; i < entries.length; i++) {
            if (entries[i] instanceof File) { entries[i].remove(); }
        }
        if (report.exists) { report.remove(); }
    }

    function setTransform(group, anchor, position, scale, rotation) {
        var transform = group.property("ADBE Vector Transform Group");
        transform.property("ADBE Vector Anchor").setValue(anchor);
        transform.property("ADBE Vector Position").setValue(position);
        transform.property("ADBE Vector Scale").setValue(scale);
        transform.property("ADBE Vector Rotation").setValue(rotation);
    }

    function addCase(name, size, rectanglePosition, anchor, position, scale, rotation) {
        var layer = comp.layers.addShape();
        layer.name = "CF_C9_" + name;
        var root = layer.property("ADBE Root Vectors Group");
        var group = root.addProperty("ADBE Vector Group");
        group.name = name;
        setTransform(group, anchor, position, scale, rotation);
        var contents = group.property("ADBE Vectors Group");
        var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
        rectangle.name = name + " Rectangle";
        rectangle.property("ADBE Vector Rect Size").setValue(size);
        rectangle.property("ADBE Vector Rect Position").setValue(rectanglePosition);
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue([1, 0.2, 0.05, 1]);
        fill.property("ADBE Vector Fill Opacity").setValue(100);
        log("CASE=" + name + " SIZE=" + size + " RECT_POSITION=" + rectanglePosition +
            " GROUP_ANCHOR=" + anchor + " GROUP_POSITION=" + position +
            " GROUP_SCALE=" + scale + " GROUP_ROTATION=" + rotation);
        return layer;
    }

    function save(label) {
        comp.saveFrameToPng(comp.time, new File(rootFolder.fsName + "/" + label + ".png"));
        log("RENDER=" + label);
    }

    try {
        resetOutput();
        log("Phase 5.13C.9 Shape Group Coordinate Space Investigation");
        log("START");
        comp = app.project.items.addComp("CF_Phase513C9_Coordinates", 1280, 720, 1, 1, 24);
        comp.openInViewer();

        addCase("A_Identity", [200, 100], [0, 0], [0, 0], [0, 0], [100, 100], 0);
        save("A_Identity");
        addCase("B_GroupPositionX", [200, 100], [0, 0], [0, 0], [100, 0], [100, 100], 0);
        save("B_GroupPositionX");
        addCase("C_GroupPositionY", [200, 100], [0, 0], [0, 0], [0, 100], [100, 100], 0);
        save("C_GroupPositionY");
        addCase("D_GroupAnchorX", [200, 100], [0, 0], [100, 0], [0, 0], [100, 100], 0);
        save("D_GroupAnchorX");
        addCase("E_GroupAnchorY", [200, 100], [0, 0], [0, 100], [0, 0], [100, 100], 0);
        save("E_GroupAnchorY");
        addCase("F_GroupScaleUniform", [200, 100], [0, 0], [0, 0], [0, 0], [150, 150], 0);
        save("F_GroupScaleUniform");
        addCase("G_GroupScaleNonUniform", [200, 100], [0, 0], [0, 0], [0, 0], [150, 75], 0);
        save("G_GroupScaleNonUniform");
        addCase("H_GroupRotationPositive", [200, 100], [0, 0], [0, 0], [0, 0], [100, 100], 30);
        save("H_GroupRotationPositive");
        addCase("I_GroupRotationNegative", [200, 100], [0, 0], [0, 0], [0, 0], [100, 100], -30);
        save("I_GroupRotationNegative");
        addCase("J_RectanglePositionX", [200, 100], [100, 0], [0, 0], [0, 0], [100, 100], 0);
        save("J_RectanglePositionX");
        addCase("K_RectanglePositionY", [200, 100], [0, 100], [0, 0], [0, 0], [100, 100], 0);
        save("K_RectanglePositionY");
        addCase("L_RectanglePlusGroup", [200, 100], [100, 50], [0, 0], [100, 25], [100, 100], 0);
        save("L_RectanglePlusGroup");
        addCase("M_RectanglePlusScale", [200, 100], [100, 50], [0, 0], [0, 0], [150, 75], 0);
        save("M_RectanglePlusScale");
        addCase("N_RectanglePlusRotation", [200, 100], [100, 50], [0, 0], [0, 0], [100, 100], 30);
        save("N_RectanglePlusRotation");
        log("END");
        alert("PHASE 5.13C.9 HARNESS READY\nReporte: " + report.fsName);
    } catch (error) {
        try { log("ERROR=" + error.toString()); } catch (writeError) {}
        alert("PHASE 5.13C.9 HARNESS FAILED\nReporte: " + report.fsName);
    } finally {
        if (comp) { try { comp.remove(); } catch (removeError) {} }
    }
}());
