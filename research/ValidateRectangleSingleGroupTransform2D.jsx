/* Phase 5.13C: runtime Match Name and hierarchy probe.
   Pixel validation is performed only after the AEX is installed temporarily. */
(function () {
    var report = new File("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase513CValidationReport.txt");
    var lines = [];
    function log(s) { lines.push(s); $.writeln(s); }
    function prop(parent, name) {
        var p = parent.property(name);
        log(name + " => " + (p ? p.matchName : "MISSING"));
        return p;
    }
    var comp = null;
    try {
        app.beginUndoGroup("CornerFlex Phase 5.13C probe");
        comp = app.project.items.addComp("CF_Phase513C_Probe", 320, 240, 1, 1, 24);
        var layer = comp.layers.addShape();
        var root = prop(layer, "ADBE Root Vectors Group");
        var group = root.addProperty("ADBE Vector Group");
        log("group => " + group.matchName);
        var contents = prop(group, "ADBE Vectors Group");
        var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
        log("rectangle => " + rectangle.matchName);
        prop(rectangle, "ADBE Vector Rect Size");
        prop(rectangle, "ADBE Vector Rect Position");
        prop(rectangle, "ADBE Vector Rect Roundness");
        prop(rectangle, "ADBE Vector Rect Direction");
        var transform = prop(group, "ADBE Vector Transform Group");
        prop(transform, "ADBE Vector Anchor");
        prop(transform, "ADBE Vector Position");
        prop(transform, "ADBE Vector Scale");
        prop(transform, "ADBE Vector Rotation");
        prop(transform, "ADBE Vector Skew");
        prop(transform, "ADBE Vector Skew Axis");
        log("GROUP_HIERARCHY=Rectangle Path -> ADBE Vector Group -> Root Contents");
        log("PIXEL_RESULT=NOT_RUN_BY_PROBE");
        log("MATCH_NAME_RESULT=PASS");
    } catch (e) {
        log("MATCH_NAME_RESULT=FAIL");
        log("ERROR=" + e.toString());
    } finally {
        if (comp) { comp.remove(); }
        try { app.endUndoGroup(); } catch (ignore) {}
        report.parent.create();
        report.open("w");
        report.encoding = "UTF-8";
        report.write(lines.join("\n") + "\n");
        report.close();
    }
}());
