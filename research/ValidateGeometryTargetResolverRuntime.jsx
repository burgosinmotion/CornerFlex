(function () {
    var root = new Folder("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output");
    var report = new File(root.fsName + "/Phase513C3RuntimeResolverReport.txt");
    var trace = new File(root.fsName + "/Phase513C3RuntimeResolverTrace.txt");
    var frame = new File(root.fsName + "/Phase513C3RuntimeFrame.png");
    var comp = null;
    var queueItem = null;

    function write(text) {
        report.open("a");
        report.write(String(text) + "\n");
        report.close();
    }

    try {
        if (report.exists) { report.remove(); }
        if (trace.exists) { trace.remove(); }
        if (frame.exists) { frame.remove(); }
        write("Phase 5.13C.3 Runtime Geometry Target Resolver Trace");
        write("START");

        $.evalFile(new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx"));
        comp = app.project.items.addComp("CF_Phase513C3", 640, 480, 1, 1, 24);
        comp.openInViewer();
        var layer = comp.layers.addShape();
        var rootGroup = layer.property("ADBE Root Vectors Group");
        var group = rootGroup.addProperty("ADBE Vector Group");
        var contents = group.property("ADBE Vectors Group");
        var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
        var effect = layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex");
        layer.selected = true;
        rectangle.selected = true;

        var capture = $.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot();
        write("CEP_CAPTURE=" + capture);
        write("CEP_PATH=0:ADBE Root Vectors Group:1;1:ADBE Vector Group:2;1:ADBE Vectors Group:3;1:ADBE Vector Shape - Rect:4");
        write("STORED_PARAMS_MATCH_NAMES=BurgosInMotion CornerFlex-0020..0038");

        queueItem = app.project.renderQueue.items.add(comp);
        queueItem.outputModule(1).file = frame;
        app.project.renderQueue.render();
        write("RENDER_COMPLETED");

        if (trace.exists) {
            trace.open("r");
            write("AEX_TRACE_BEGIN");
            write(trace.read());
            trace.close();
            write("AEX_TRACE_END");
        } else {
            write("AEX_TRACE_MISSING");
        }
        write("END");
    } catch (error) {
        write("ERROR=" + error.toString());
    } finally {
        if (queueItem) {
            try { queueItem.remove(); } catch (removeError) {}
        }
        if (comp) {
            try { comp.remove(); } catch (removeCompError) {}
        }
    }
}());
