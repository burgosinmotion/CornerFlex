(function () {
    var base = new Folder("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase513C7ManualValidation");
    var report = new File(base.fsName + "/Phase513C7ManualValidationReport.txt");
    var comp = null;
    var failed = false;

    function write(text) {
        report.open("a");
        report.write(String(text) + "\n");
        report.close();
    }
    function clearOutput() {
        if (!base.exists) { base.create(); return; }
        var entries = base.getFiles();
        for (var index = 0; index < entries.length; index++) {
            if (entries[index] instanceof File) { entries[index].remove(); }
        }
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
        return rectangle;
    }
    function reacquireRectangle(root, groupName) {
        var group = root.property(groupName);
        return group.property("ADBE Vectors Group").property(1);
    }
    function render(label) {
        comp.saveFrameToPng(comp.time, new File(base.fsName + "/" + label + ".png"));
        write(label + "=RENDER_COMPLETED");
    }
    function selectRectangle(layer, rectangle) {
        write("SELECT_BEGIN");
        layer.selected = false;
        write("LAYER_DESELECTED");
        rectangle.selected = false;
        write("RECTANGLE_DESELECTED");
        layer.selected = true;
        write("LAYER_SELECTED");
        rectangle.selected = true;
        write("RECTANGLE_SELECTED");
    }
    function capture(label, layer, rectangle) {
        selectRectangle(layer, rectangle);
        write(label + "_PROVIDER_BEGIN");
        var result = $.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot();
        write(label + "_PROVIDER_RETURNED");
        write(label + "_CAPTURE=" + result);
        if (String(result).indexOf("SNAPSHOT_CAPTURED") < 0) { failed = true; }
    }
    function disable(label, layer, rectangle) {
        selectRectangle(layer, rectangle);
        write(label + "_DISABLE_BEGIN");
        var result = $.global.CornerFlexGeometryProvider.disableRectangleSnapshot();
        write(label + "_DISABLE_RETURNED");
        write(label + "_FALLBACK=" + result);
        if (String(result).indexOf("SNAPSHOT_DISABLED") < 0) { failed = true; }
    }

    try {
        clearOutput();
        if (report.exists) { report.remove(); }
        write("Phase 5.13C.7 Manual Controlled Runtime Validation");
        write("START");
        $.evalFile(new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx"));
        write("PROVIDER_LOADED");

        comp = app.project.items.addComp("CF_Phase513C7_Manual", 1280, 720, 1, 1, 24);
        write("COMP_CREATED");
        comp.openInViewer();
        write("COMP_OPENED");
        var layer = comp.layers.addShape();
        write("LAYER_CREATED");
        var root = layer.property("ADBE Root Vectors Group");
        write("ROOT_RESOLVED");
        addRectangle(root, "Group A", [300, 180], [-250, -120], [-150, 80], [80, 120], -25);
        write("RECTANGLE_A_CREATED");
        addRectangle(root, "Group B", [640, 360], [220, 140], [280, -100], [135, 70], 35);
        write("RECTANGLE_B_CREATED");
        layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex");
        write("EFFECT_CREATED");

        var rectangleA = reacquireRectangle(root, "Group A");
        var rectangleB = reacquireRectangle(root, "Group B");
        write("RECTANGLES_REACQUIRED");

        selectRectangle(layer, rectangleA);
        disable("LAYER_BOUNDS", layer, rectangleA);
        render("LayerBoundsReference");

        capture("TARGET_A", layer, rectangleA);
        render("TargetA");

        capture("TARGET_B", layer, rectangleB);
        render("TargetB");

        disable("FINAL", layer, rectangleB);
        render("Fallback");
        write("END");
    } catch (error) {
        failed = true;
        try { write("ERROR=" + error.toString()); } catch (writeError) {}
    } finally {
        if (comp) { try { comp.remove(); } catch (removeError) {} }
        alert((failed ? "PHASE 5.13C.7 VALIDATION FAILED" : "PHASE 5.13C.7 VALIDATION COMPLETE") +
            "\nReporte: " + report.fsName);
    }
}());
