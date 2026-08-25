(function () {
    var outputFolder = new Folder("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase513C10CoordinateSpace");
    var report = new File(outputFolder.fsName + "/Phase513C10CoordinateSpaceReport.txt");
    var comp = null;
    var failed = false;

    function write(value) {
        report.open("a");
        report.write(String(value) + "\n");
        report.close();
    }

    function clearOutput() {
        if (!outputFolder.exists) { outputFolder.create(); }
        var entries = outputFolder.getFiles();
        for (var i = 0; i < entries.length; i++) {
            if (entries[i] instanceof File) { entries[i].remove(); }
        }
        if (report.exists) { report.remove(); }
    }

    function valueOf(property) {
        try { return property ? String(property.value) : "UNAVAILABLE"; }
        catch (error) { return "ERROR:" + error.toString(); }
    }

    function setLayerIdentity(layer) {
        var transform = layer.property("ADBE Transform Group");
        transform.property("ADBE Anchor Point").setValue([0, 0]);
        transform.property("ADBE Position").setValue([640, 360]);
        transform.property("ADBE Scale").setValue([100, 100]);
        transform.property("ADBE Rotate Z").setValue(0);
    }

    function addCase(config) {
        var layer = comp.layers.addShape();
        layer.name = "CF_C10_" + config.name;
        var layerTransform = layer.property("ADBE Transform Group");
        var layerDefaults = {
            anchor: valueOf(layerTransform.property("ADBE Anchor Point")),
            position: valueOf(layerTransform.property("ADBE Position")),
            scale: valueOf(layerTransform.property("ADBE Scale")),
            rotation: valueOf(layerTransform.property("ADBE Rotate Z"))
        };
        setLayerIdentity(layer);
        if (config.layer) {
            if (config.layer.anchor) { layerTransform.property("ADBE Anchor Point").setValue(config.layer.anchor); }
            if (config.layer.position) { layerTransform.property("ADBE Position").setValue(config.layer.position); }
            if (config.layer.scale) { layerTransform.property("ADBE Scale").setValue(config.layer.scale); }
            if (config.layer.rotation !== undefined) { layerTransform.property("ADBE Rotate Z").setValue(config.layer.rotation); }
        }

        var root = layer.property("ADBE Root Vectors Group");
        write("STEP=ROOT_RESOLVED");
        var group = root.addProperty("ADBE Vector Group");
        write("STEP=GROUP_CREATED");
        group.name = config.name;
        write("STEP=GROUP_NAMED");
        var contents = group.property("ADBE Vectors Group");
        write("STEP=CONTENTS_RESOLVED");
        var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
        write("STEP=RECTANGLE_CREATED");
        rectangle.name = config.name + " Rectangle";
        rectangle.property("ADBE Vector Rect Size").setValue(config.size || [200, 100]);
        rectangle.property("ADBE Vector Rect Position").setValue(config.rectanglePosition || [0, 0]);
        write("STEP=RECTANGLE_CONFIGURED");
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        write("STEP=FILL_CREATED");
        fill.property("ADBE Vector Fill Color").setValue([1, 0.2, 0.05, 1]);
        fill.property("ADBE Vector Fill Opacity").setValue(100);
        write("STEP=FILL_CONFIGURED");

        // Materialize Contents before writing Group Transform properties.
        var groupTransform = group.property("ADBE Vector Transform Group");
        write("STEP=GROUP_TRANSFORM_REACQUIRED");
        var groupDefaults = {
            anchor: valueOf(groupTransform.property("ADBE Vector Anchor")),
            position: valueOf(groupTransform.property("ADBE Vector Position")),
            scale: valueOf(groupTransform.property("ADBE Vector Scale")),
            rotation: valueOf(groupTransform.property("ADBE Vector Rotation"))
        };
        write("STEP=GROUP_DEFAULTS_READ");
        groupTransform.property("ADBE Vector Anchor").setValue(config.anchor || [0, 0]);
        write("STEP=GROUP_ANCHOR_SET");
        groupTransform.property("ADBE Vector Position").setValue(config.groupPosition || [0, 0]);
        write("STEP=GROUP_POSITION_SET");
        groupTransform.property("ADBE Vector Scale").setValue(config.scale || [100, 100]);
        write("STEP=GROUP_SCALE_SET");
        groupTransform.property("ADBE Vector Rotation").setValue(config.rotation || 0);
        write("STEP=GROUP_ROTATION_SET");

        // AE invalidates Property objects after hierarchy mutations; reacquire all references.
        var stableRoot = layer.property("ADBE Root Vectors Group");
        var stableGroup = stableRoot.property(config.name);
        var stableContents = stableGroup.property("ADBE Vectors Group");
        var stableRectangle = stableContents.property(1);
        var stableGroupTransform = stableGroup.property("ADBE Vector Transform Group");
        var stableLayerTransform = layer.property("ADBE Transform Group");

        write("CASE=" + config.name);
        write("LAYER_DEFAULTS anchor=" + layerDefaults.anchor + " position=" + layerDefaults.position +
            " scale=" + layerDefaults.scale + " rotation=" + layerDefaults.rotation);
        write("RECTANGLE size=" + valueOf(stableRectangle.property("ADBE Vector Rect Size")) +
            " position=" + valueOf(stableRectangle.property("ADBE Vector Rect Position")));
        write("GROUP_DEFAULTS anchor=" + groupDefaults.anchor + " position=" + groupDefaults.position +
            " scale=" + groupDefaults.scale + " rotation=" + groupDefaults.rotation);
        write("GROUP_CONFIG anchor=" + valueOf(stableGroupTransform.property("ADBE Vector Anchor")) +
            " position=" + valueOf(stableGroupTransform.property("ADBE Vector Position")) +
            " scale=" + valueOf(stableGroupTransform.property("ADBE Vector Scale")) +
            " rotation=" + valueOf(stableGroupTransform.property("ADBE Vector Rotation")));
        write("LAYER_CONFIG anchor=" + valueOf(stableLayerTransform.property("ADBE Anchor Point")) +
            " position=" + valueOf(stableLayerTransform.property("ADBE Position")) +
            " scale=" + valueOf(stableLayerTransform.property("ADBE Scale")) +
            " rotation=" + valueOf(stableLayerTransform.property("ADBE Rotate Z")));
        comp.saveFrameToPng(comp.time, new File(outputFolder.fsName + "/" + config.name + ".png"));
        write("RENDER=" + config.name);
        layer.remove();
    }

    try {
        clearOutput();
        write("Phase 5.13C.10 Shape Group Coordinate Space Manual Validation");
        write("START");
        comp = app.project.items.addComp("CF_Phase513C10_Coordinates", 1280, 720, 1, 1, 24);
        comp.openInViewer();
        var base = { size: [200, 100], rectanglePosition: [0, 0] };
        addCase({ name: "A_Identity", size: base.size, rectanglePosition: base.rectanglePosition });
        addCase({ name: "B_GroupPositionX", size: base.size, rectanglePosition: base.rectanglePosition, groupPosition: [100, 0] });
        addCase({ name: "C_GroupPositionY", size: base.size, rectanglePosition: base.rectanglePosition, groupPosition: [0, 100] });
        addCase({ name: "D_GroupAnchorX", size: base.size, rectanglePosition: base.rectanglePosition, anchor: [100, 0] });
        addCase({ name: "E_GroupAnchorY", size: base.size, rectanglePosition: base.rectanglePosition, anchor: [0, 100] });
        addCase({ name: "F_GroupScaleUniform", size: base.size, rectanglePosition: base.rectanglePosition, scale: [150, 150] });
        addCase({ name: "G_GroupScaleNonUniform", size: base.size, rectanglePosition: base.rectanglePosition, scale: [150, 75] });
        addCase({ name: "H_GroupRotationPositive", size: base.size, rectanglePosition: base.rectanglePosition, rotation: 30 });
        addCase({ name: "I_GroupRotationNegative", size: base.size, rectanglePosition: base.rectanglePosition, rotation: -30 });
        addCase({ name: "J_RectanglePositionX", size: base.size, rectanglePosition: [100, 0] });
        addCase({ name: "K_RectanglePositionY", size: base.size, rectanglePosition: [0, 100] });
        addCase({ name: "L_RectanglePlusGroup", size: base.size, rectanglePosition: [100, 50], groupPosition: [200, -100] });
        addCase({ name: "M_RectanglePlusScale", size: base.size, rectanglePosition: [100, 50], scale: [150, 75] });
        addCase({ name: "N_RectanglePlusRotation", size: base.size, rectanglePosition: [100, 50], rotation: 30 });
        addCase({ name: "O_GroupPlusLayer", size: base.size, rectanglePosition: [100, 50], anchor: [40, 20], groupPosition: [120, -60], scale: [125, 80], rotation: 25,
            layer: { anchor: [20, 10], position: [700, 330], scale: [110, 90], rotation: -15 } });
        write("END");
        alert("PHASE 5.13C.10 VALIDATION COMPLETE\nReporte: " + report.fsName);
    } catch (error) {
        failed = true;
        try { write("ERROR=" + error.toString()); } catch (writeError) {}
        alert("PHASE 5.13C.10 VALIDATION FAILED\nReporte: " + report.fsName);
    } finally {
        if (comp) { try { comp.remove(); } catch (removeError) {} }
    }
}());
