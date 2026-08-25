(function () {
    var folder = new Folder("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase513C15Locator");
    var report = new File(folder.fsName + "/Phase513C15LocatorReport.txt");
    var trace = new File("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase513C15LocatorRuntime.txt");
    var comp = null;
    var failed = false;
    function write(value) { report.open("a"); report.write(String(value) + "\n"); report.close(); }
    function clear() {
        if (!folder.exists) { folder.create(); }
        var entries = folder.getFiles();
        for (var i = 0; i < entries.length; i++) { if (entries[i] instanceof File) { entries[i].remove(); } }
        if (report.exists) { report.remove(); }
        if (trace.exists) { trace.remove(); }
    }
    function setTransform(group, position, scale, rotation) {
        var t = group.property("ADBE Vector Transform Group");
        t.property("ADBE Vector Position").setValue(position);
        t.property("ADBE Vector Scale").setValue(scale);
        t.property("ADBE Vector Rotation").setValue(rotation);
    }
    function addRectangle(root, name, size, rectanglePosition, groupPosition, groupScale, groupRotation) {
        var group = root.addProperty("ADBE Vector Group");
        group.name = name;
        setTransform(group, groupPosition, groupScale, groupRotation);
        var contents = group.property("ADBE Vectors Group");
        var rect = contents.addProperty("ADBE Vector Shape - Rect");
        rect.name = name + " Rectangle";
        rect.property("ADBE Vector Rect Size").setValue(size);
        rect.property("ADBE Vector Rect Position").setValue(rectanglePosition);
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue([1, 0.2, 0.05, 1]);
        fill.property("ADBE Vector Fill Opacity").setValue(100);
    }
    function select(layer, rect) { layer.selected = false; rect.selected = false; layer.selected = true; rect.selected = true; }
    function capture(label, layer, rect) {
        select(layer, rect);
        var result = $.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot();
        write(label + "_CAPTURE=" + result);
        if (String(result).indexOf("SNAPSHOT_CAPTURED") < 0) { failed = true; }
        comp.saveFrameToPng(comp.time, new File(folder.fsName + "/" + label + ".png"));
        write(label + "=RENDER_COMPLETED");
    }
    try {
        clear();
        write("Phase 5.13C.15 Single Group Locator / Transform Reader Validation");
        write("START");
        $.evalFile(new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx"));
        write("PROVIDER_LOADED");
        comp = app.project.items.addComp("CF_Phase513C15_Locator", 1280, 720, 1, 1, 24);
        comp.openInViewer();
        var layer = comp.layers.addShape();
        var root = layer.property("ADBE Root Vectors Group");
        addRectangle(root, "Group A", [300, 180], [-250, -120], [-150, 80], [80, 120], -25);
        addRectangle(root, "Group B", [640, 360], [220, 140], [280, -100], [135, 70], 35);
        layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex");
        capture("TARGET_A", layer, root.property("Group A").property("ADBE Vectors Group").property(1));
        capture("TARGET_B", layer, root.property("Group B").property("ADBE Vectors Group").property(1));
        write("END");
        alert((failed ? "PHASE 5.13C.15 VALIDATION FAILED" : "PHASE 5.13C.15 VALIDATION COMPLETE") + "\nReporte: " + report.fsName);
    } catch (error) {
        failed = true;
        try { write("ERROR=" + error.toString()); } catch (writeError) {}
        alert("PHASE 5.13C.15 VALIDATION FAILED\nReporte: " + report.fsName);
    } finally {
        if (comp) { try { comp.remove(); } catch (removeError) {} }
    }
}());
