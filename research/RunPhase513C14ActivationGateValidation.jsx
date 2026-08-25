(function () {
    var folder = new Folder("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase513C14ActivationGate");
    var report = new File(folder.fsName + "/Phase513C14ActivationGateReport.txt");
    var runtimeLog = new File("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase513C14ActivationGateRuntime.txt");
    var comp = null;
    var failed = false;

    function write(value) {
        report.open("a");
        report.write(String(value) + "\n");
        report.close();
    }
    function clear() {
        if (!folder.exists) { folder.create(); }
        var files = folder.getFiles();
        for (var i = 0; i < files.length; i++) { if (files[i] instanceof File) { files[i].remove(); } }
        if (report.exists) { report.remove(); }
        if (runtimeLog.exists) { runtimeLog.remove(); }
    }
    function setGroupTransform(group, position, scale, rotation) {
        var transform = group.property("ADBE Vector Transform Group");
        transform.property("ADBE Vector Position").setValue(position);
        transform.property("ADBE Vector Scale").setValue(scale);
        transform.property("ADBE Vector Rotation").setValue(rotation);
    }
    function addRectangle(root, name, size, position, groupPosition, groupScale, groupRotation) {
        var group = root.addProperty("ADBE Vector Group");
        group.name = name;
        setGroupTransform(group, groupPosition, groupScale, groupRotation);
        var contents = group.property("ADBE Vectors Group");
        var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
        rectangle.name = name + " Rectangle";
        rectangle.property("ADBE Vector Rect Size").setValue(size);
        rectangle.property("ADBE Vector Rect Position").setValue(position);
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue([1, 0.2, 0.05, 1]);
        fill.property("ADBE Vector Fill Opacity").setValue(100);
    }
    function reacquire(root, name) {
        return root.property(name).property("ADBE Vectors Group").property(1);
    }
    function selectRectangle(layer, rectangle) {
        layer.selected = false;
        rectangle.selected = false;
        layer.selected = true;
        rectangle.selected = true;
    }
    function capture(label, layer, rectangle) {
        selectRectangle(layer, rectangle);
        var result = $.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot();
        write(label + "_CAPTURE=" + result);
        if (String(result).indexOf("SNAPSHOT_CAPTURED") < 0) { failed = true; }
    }
    function render(label) {
        comp.saveFrameToPng(comp.time, new File(folder.fsName + "/" + label + ".png"));
        write(label + "=RENDER_COMPLETED");
    }

    try {
        clear();
        write("Phase 5.13C.14 Group Transform Activation Gate Validation");
        write("START");
        $.evalFile(new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx"));
        write("PROVIDER_LOADED");
        comp = app.project.items.addComp("CF_Phase513C14_Gate", 1280, 720, 1, 1, 24);
        comp.openInViewer();
        var layer = comp.layers.addShape();
        var root = layer.property("ADBE Root Vectors Group");
        addRectangle(root, "Group A", [300, 180], [-250, -120], [-150, 80], [80, 120], -25);
        addRectangle(root, "Group B", [640, 360], [220, 140], [280, -100], [135, 70], 35);
        layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex");
        var rectangleA = reacquire(root, "Group A");
        var rectangleB = reacquire(root, "Group B");
        capture("TARGET_A", layer, rectangleA);
        render("TargetA");
        capture("TARGET_B", layer, rectangleB);
        render("TargetB");
        write("END");
        alert((failed ? "PHASE 5.13C.14 VALIDATION FAILED" : "PHASE 5.13C.14 VALIDATION COMPLETE") +
            "\nReporte: " + report.fsName);
    } catch (error) {
        failed = true;
        try { write("ERROR=" + error.toString()); } catch (writeError) {}
        alert("PHASE 5.13C.14 VALIDATION FAILED\nReporte: " + report.fsName);
    } finally {
        if (comp) { try { comp.remove(); } catch (removeError) {} }
    }
}());
