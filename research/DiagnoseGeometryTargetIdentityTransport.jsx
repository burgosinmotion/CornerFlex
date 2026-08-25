(function () {
    var file = new File("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase513C2ProviderDiagnostic.txt");
    function checkpoint(text) {
        file.open("a");
        file.write(String(text) + "\n");
        file.close();
        $.writeln(String(text));
    }
    var comp = null;
    try {
        if (file.exists) { file.remove(); }
        checkpoint("START");
        $.evalFile(new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx"));
        checkpoint("PROVIDER_LOADED");
        comp = app.project.items.addComp("CF_Phase513C2", 640, 480, 1, 1, 24);
        checkpoint("COMP_CREATED");
        comp.openInViewer();
        checkpoint("COMP_OPENED_IN_VIEWER");
        var layer = comp.layers.addShape();
        var root = layer.property("ADBE Root Vectors Group");
        var group = root.addProperty("ADBE Vector Group");
        var contents = group.property("ADBE Vectors Group");
        var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
        checkpoint("GROUP_AND_RECT_CREATED");
        var effect = layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex");
        checkpoint("EFFECT_CREATED");
        layer.selected = true;
        rectangle.selected = true;
        checkpoint("SELECTION_SET");
        var chain = [];
        var cursor = rectangle;
        while (cursor) {
            chain.unshift({
                index: cursor.matchName === "ADBE Root Vectors Group" ? 0 : cursor.propertyIndex,
                matchName: cursor.matchName,
                token: cursor.matchName === "ADBE Root Vectors Group" ? 1 :
                    (cursor.matchName === "ADBE Vector Group" ? 2 :
                        (cursor.matchName === "ADBE Vectors Group" ? 3 :
                            (cursor.matchName === "ADBE Vector Shape - Rect" ? 4 : 0)))
            });
            if (cursor.matchName === "ADBE Root Vectors Group") { break; }
            cursor = cursor.propertyGroup(1);
        }
        checkpoint("CEP_PATH=" + JSON.stringify(chain));
        var result = $.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot();
        checkpoint("CAPTURE_RETURNED=" + result);
        var stored = [];
        for (var pi = 1; pi <= effect.numProperties; pi++) {
            var prop = effect.property(pi);
            if (prop && /^BurgosInMotion CornerFlex-00(2[0-9]|3[0-8])$/.test(prop.matchName)) {
                stored.push({matchName: prop.matchName, value: prop.value});
            }
        }
        checkpoint("STORED_PARAMS=" + JSON.stringify(stored));
    } catch (error) {
        checkpoint("ERROR=" + error.toString());
    } finally {
        if (comp) { comp.remove(); }
        checkpoint("END");
    }
}());
