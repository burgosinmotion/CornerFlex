(function () {
    var folder = new Folder("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase513C16VisualGate");
    var report = new File(folder.fsName + "/Phase513C16VisualGateReport.txt");
    var comp = null;
    var failed = false;
    function write(value) { report.open("a"); report.write(String(value) + "\n"); report.close(); }
    function setTransform(group, position, scale, rotation) {
        var transform = group.property("ADBE Vector Transform Group");
        transform.property("ADBE Vector Position").setValue(position);
        transform.property("ADBE Vector Scale").setValue(scale);
        transform.property("ADBE Vector Rotation").setValue(rotation);
    }
    function addRectangle(root, name, size, rectPos, groupPos, groupScale, groupRotation) {
        var group = root.addProperty("ADBE Vector Group");
        group.name = name;
        setTransform(group, groupPos, groupScale, groupRotation);
        var contents = group.property("ADBE Vectors Group");
        var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
        rectangle.name = name + " Rectangle";
        rectangle.property("ADBE Vector Rect Size").setValue(size);
        rectangle.property("ADBE Vector Rect Position").setValue(rectPos);
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue([1, 0.2, 0.05, 1]);
        fill.property("ADBE Vector Fill Opacity").setValue(100);
    }
    function capture(label, layer, rectangle) {
        layer.selected = false;
        rectangle.selected = false;
        layer.selected = true;
        rectangle.selected = true;
        var result = $.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot();
        write(label + "_CAPTURE=" + result);
        if (String(result).indexOf("SNAPSHOT_CAPTURED") < 0) { failed = true; }
        comp.saveFrameToPng(comp.time, new File(folder.fsName + "/" + label + ".png"));
        write(label + "_RENDER_COMPLETED");
    }
    try {
        if (!folder.exists) { folder.create(); }
        var files = folder.getFiles();
        for (var i = 0; i < files.length; i++) { if (files[i] instanceof File) { files[i].remove(); } }
        if (report.exists) { report.remove(); }
        $.evalFile(new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx"));
        comp = app.project.items.addComp("CF_Phase513C16_VisualGate", 1280, 720, 1, 1, 24);
        comp.openInViewer();
        var layer = comp.layers.addShape();
        var root = layer.property("ADBE Root Vectors Group");
        addRectangle(root, "Group A", [300, 180], [-250, -120], [-150, 80], [80, 120], -25);
        addRectangle(root, "Group B", [640, 360], [220, 140], [280, -100], [135, 70], 35);
        layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex");
        write("EXPECTED_A_AABB=(93.48,245.42)-(402.28,542.61)");
        write("EXPECTED_B_AABB=(680.93,159.63)-(1533.22,861.63)");
        capture("TargetA", layer, root.property("Group A").property("ADBE Vectors Group").property(1));
        capture("TargetB", layer, root.property("Group B").property("ADBE Vectors Group").property(1));
        write("STATUS=" + (failed ? "FAIL" : "PASS"));
        alert((failed ? "PHASE 5.13C.16 VISUAL GATE FAILED" : "PHASE 5.13C.16 VISUAL GATE COMPLETE") +
            "\nReporte: " + report.fsName);
    } catch (error) {
        write("ERROR=" + error.toString());
        alert("PHASE 5.13C.16 VISUAL GATE FAILED\nReporte: " + report.fsName);
    }
}());
