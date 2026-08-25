(function () {
    var output = new Folder("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output");
    var report = new File(output.fsName + "/Phase513C6FunctionalIdentityReport.txt");
    var comp = null;
    function write(text) {
        report.open("a");
        report.write(String(text) + "\n");
        report.close();
    }
    function setGroupTransform(group, position, scale, rotation) {
        var transform = group.property("ADBE Vector Transform Group");
        transform.property("ADBE Vector Position").setValue(position);
        transform.property("ADBE Vector Scale").setValue(scale);
        transform.property("ADBE Vector Rotation").setValue(rotation);
    }
    function addRectangle(root, groupName, size, position, groupPosition, groupScale, groupRotation) {
        var group = root.addProperty("ADBE Vector Group");
        group.name = groupName;
        setGroupTransform(group, groupPosition, groupScale, groupRotation);
        var contents = group.property("ADBE Vectors Group");
        var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
        rectangle.name = groupName + " Rectangle";
        rectangle.property("ADBE Vector Rect Size").setValue(size);
        rectangle.property("ADBE Vector Rect Position").setValue(position);
        return rectangle;
    }
    function renderCase(label, comp) {
        var item = app.project.renderQueue.items.add(comp);
        item.outputModule(1).file = new File(output.fsName + "/Phase513C6_" + label + ".png");
        app.project.renderQueue.render();
        write(label + " RENDER_COMPLETED");
        item.remove();
    }
    function captureAndRender(label, layer, rectangle) {
        layer.selected = true;
        rectangle.selected = true;
        var result = $.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot();
        write(label + " CAPTURE=" + result);
        if (String(result).indexOf("SNAPSHOT_CAPTURED") >= 0) {
            renderCase(label, comp);
        }
        return result;
    }

    try {
        if (report.exists) { report.remove(); }
        write("Phase 5.13C.6 Functional Geometry Target Resolver Proof");
        write("START");
        $.evalFile(new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx"));
        comp = app.project.items.addComp("CF_Phase513C6_A_B", 1280, 720, 1, 1, 24);
        comp.openInViewer();
        var layer = comp.layers.addShape();
        var root = layer.property("ADBE Root Vectors Group");
        var rectangleA = addRectangle(root, "Group A", [300, 180], [-250, -120], [-150, 80], [80, 120], -25);
        var rectangleB = addRectangle(root, "Group B", [640, 360], [220, 140], [280, -100], [135, 70], 35);
        layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex");
        captureAndRender("TargetA", layer, rectangleA);
        captureAndRender("TargetB", layer, rectangleB);
        write("NOTE=Group Transform activation is limited to valid single-group identity; no invalidation matrix executed.");
        write("END");
    } catch (error) {
        write("ERROR=" + error.toString());
    } finally {
        if (comp) { try { comp.remove(); } catch (removeError) {} }
    }
}());
