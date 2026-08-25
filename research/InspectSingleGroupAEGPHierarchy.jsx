(function () {
    var report = new File("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase513C15DOMHierarchyReport.txt");
    var comp = null;
    var lines = [];
    function log(value) { lines.push(String(value)); }
    try {
        comp = app.project.items.addComp("CF_Phase513C15_DOM", 320, 240, 1, 1, 24);
        var layer = comp.layers.addShape();
        var root = layer.property("ADBE Root Vectors Group");
        var group = root.addProperty("ADBE Vector Group");
        group.name = "Group A";
        var contents = group.property("ADBE Vectors Group");
        var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
        rectangle.name = "Group A Rectangle";
        var current = rectangle;
        var level = 0;
        while (current && level < 8) {
            log("level=" + level + " matchName=" + current.matchName +
                " propertyIndex=" + current.propertyIndex +
                " propertyDepth=" + current.propertyDepth);
            if (current.matchName === "ADBE Root Vectors Group") { break; }
            current = current.propertyGroup(1);
            level++;
        }
        log("EXPECTED_AEGP_CHAIN=LayerRoot->Root Vectors Group->Vector Group->Vectors Group->Rectangle Path");
    } catch (error) {
        log("ERROR=" + error.toString());
    } finally {
        if (comp) { try { comp.remove(); } catch (removeError) {} }
        report.parent.create();
        report.open("w");
        report.encoding = "UTF-8";
        report.write(lines.join("\n") + "\n");
        report.close();
        alert("PHASE 5.13C.15 DOM INSPECTION COMPLETE\nReporte: " + report.fsName);
    }
}());
