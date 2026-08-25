(function () {
    var folder = new Folder("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output");
    var report = new File(folder.fsName + "/Phase513C16bActivationGateReport.txt");
    var comp = null;
    var failed = false;

    function setTransform(group, position, scale, rotation) {
        var transform = group.property("ADBE Vector Transform Group");
        transform.property("ADBE Vector Position").setValue(position);
        transform.property("ADBE Vector Scale").setValue(scale);
        transform.property("ADBE Vector Rotation").setValue(rotation);
    }
    function addRectangle(root, name, size, rectanglePosition, groupPosition, groupScale, groupRotation) {
        var group = root.addProperty("ADBE Vector Group");
        group.name = name;
        setTransform(group, groupPosition, groupScale, groupRotation);
        var contents = group.property("ADBE Vectors Group");
        var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
        rectangle.name = name + " Rectangle";
        rectangle.property("ADBE Vector Rect Size").setValue(size);
        rectangle.property("ADBE Vector Rect Position").setValue(rectanglePosition);
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue([1, 0.2, 0.05, 1]);
        fill.property("ADBE Vector Fill Opacity").setValue(100);
    }
    function captureAndRender(label, layer, rectangle) {
        layer.selected = false;
        rectangle.selected = false;
        layer.selected = true;
        rectangle.selected = true;
        var result = $.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot();
        if (String(result).indexOf("SNAPSHOT_CAPTURED") < 0) { failed = true; }
        comp.saveFrameToPng(comp.time, new File(folder.fsName + "/Phase513C16b_" + label + ".png"));
    }

    try {
        if (report.exists) { report.remove(); }
        $.evalFile(new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx"));
        comp = app.project.items.addComp("CF_Phase513C16b_ActivationGate", 1280, 720, 1, 1, 24);
        comp.openInViewer();
        var layer = comp.layers.addShape();
        var root = layer.property("ADBE Root Vectors Group");
        addRectangle(root, "Group A", [300, 180], [-250, -120], [-150, 80], [80, 120], -25);
        addRectangle(root, "Group B", [640, 360], [220, 140], [280, -100], [135, 70], 35);
        layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex");
        captureAndRender("TargetA", layer, root.property("Group A").property("ADBE Vectors Group").property(1));
        captureAndRender("TargetB", layer, root.property("Group B").property("ADBE Vectors Group").property(1));
        alert((failed ? "PHASE 5.13C.16b ACTIVATION GATE FAILED" : "PHASE 5.13C.16b ACTIVATION GATE COMPLETE") +
            "\nReporte: " + report.fsName);
    } catch (error) {
        failed = true;
        alert("PHASE 5.13C.16b ACTIVATION GATE FAILED\n" + error.toString());
    }
}());
