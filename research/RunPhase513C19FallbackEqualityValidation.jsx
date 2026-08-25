(function () {
    var folder = new Folder("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase513C19FallbackEquality");
    var report = new File(folder.fsName + "/Phase513C19FallbackEqualityReport.txt");
    var comp = null;
    var failed = false;
    function write(value) { report.open("a"); report.write(String(value) + "\n"); report.close(); }
    function setTransform(group, position, scale, rotation) {
        var t = group.property("ADBE Vector Transform Group");
        t.property("ADBE Vector Position").setValue(position);
        t.property("ADBE Vector Scale").setValue(scale);
        t.property("ADBE Vector Rotation").setValue(rotation);
    }
    function addRectangle(root, name, size, rectPos, groupPos, groupScale, groupRotation) {
        var group = root.addProperty("ADBE Vector Group");
        group.name = name;
        setTransform(group, groupPos, groupScale, groupRotation);
        var contents = group.property("ADBE Vectors Group");
        var rect = contents.addProperty("ADBE Vector Shape - Rect");
        rect.name = name + " Rectangle";
        rect.property("ADBE Vector Rect Size").setValue(size);
        rect.property("ADBE Vector Rect Position").setValue(rectPos);
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue([1, 0.2, 0.05, 1]);
        fill.property("ADBE Vector Fill Opacity").setValue(100);
    }
    function setTrim(effect) {
        effect.property("Link Trim").setValue(true);
        effect.property("Trim").setValue(0);
        effect.property("Trim Left").setValue(0);
        effect.property("Trim Top").setValue(0);
        effect.property("Trim Right").setValue(0);
        effect.property("Trim Bottom").setValue(0);
        write("TRIM Link=1 Trim=0 Left=0 Top=0 Right=0 Bottom=0");
    }
    function render(label) {
        comp.saveFrameToPng(comp.time, new File(folder.fsName + "/" + label + ".png"));
        write(label + "_RENDER_COMPLETED");
    }
    try {
        if (!folder.exists) { folder.create(); }
        var files = folder.getFiles();
        for (var i = 0; i < files.length; i++) { if (files[i] instanceof File) { files[i].remove(); } }
        if (report.exists) { report.remove(); }
        $.evalFile(new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx"));
        comp = app.project.items.addComp("CF_Phase513C19_FallbackEquality", 1920, 1080, 1, 1, 24);
        comp.openInViewer();
        var layer = comp.layers.addShape();
        var root = layer.property("ADBE Root Vectors Group");
        addRectangle(root, "Group A", [300, 180], [-250, -120], [-150, 80], [80, 120], -25);
        addRectangle(root, "Group B", [640, 360], [220, 140], [280, -100], [135, 70], 35);
        var effect = layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex");
        setTrim(effect);
        write("COMP=1920x1080");
        write("LAYER_BOUNDS_REFERENCE=enabled");
        render("LayerBoundsReference");

        var rectangle = root.property("Group A").property("ADBE Vectors Group").property(1);
        layer.selected = true;
        rectangle.selected = true;
        var captureResult = $.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot();
        write("RECTANGLE_SOURCE_CAPTURE=" + captureResult);
        if (String(captureResult).indexOf("SNAPSHOT_CAPTURED") < 0) { failed = true; }
        render("RectangleSource");

        var fallbackResult = $.global.CornerFlexGeometryProvider.disableRectangleSnapshot();
        write("FALLBACK_RESULT=" + fallbackResult);
        if (String(fallbackResult).indexOf("SNAPSHOT_DISABLED") < 0) { failed = true; }
        render("Fallback");
        write("STATUS=" + (failed ? "FAIL" : "PASS"));
        alert((failed ? "PHASE 5.13C.19 VALIDATION FAILED" : "PHASE 5.13C.19 VALIDATION COMPLETE") +
            "\nReporte: " + report.fsName);
    } catch (error) {
        write("ERROR=" + error.toString());
        alert("PHASE 5.13C.19 VALIDATION FAILED\nReporte: " + report.fsName);
    }
}());
