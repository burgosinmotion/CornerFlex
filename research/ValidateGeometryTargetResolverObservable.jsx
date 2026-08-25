(function () {
    var report = new File("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase513C5ResolverObservabilityReport.txt");
    function write(text) {
        report.open("a");
        report.write(String(text) + "\n");
        report.close();
    }
    var comp = null;
    try {
        if (report.exists) { report.remove(); }
        write("Phase 5.13C.5 Resolver Observability Probe");
        write("DIAGNOSTIC_CHANNEL=POD_LOCAL_ONLY");
        write("CEP_TO_AEX_DIAGNOSTIC_READ=NOT_AVAILABLE");
        $.evalFile(new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx"));
        comp = app.project.items.addComp("CF_Phase513C5_Probe", 320, 240, 1, 1, 24);
        comp.openInViewer();
        var layer = comp.layers.addShape();
        var root = layer.property("ADBE Root Vectors Group");
        var group = root.addProperty("ADBE Vector Group");
        var contents = group.property("ADBE Vectors Group");
        var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
        layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex");
        layer.selected = true;
        rectangle.selected = true;
        write("CEP_CAPTURE=" + $.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot());
        write("RESULT=NO-GO_CHANNEL_NOT_READABLE_FROM_CEP");
    } catch (error) {
        write("ERROR=" + error.toString());
    } finally {
        if (comp) { try { comp.remove(); } catch (removeError) {} }
    }
}());
