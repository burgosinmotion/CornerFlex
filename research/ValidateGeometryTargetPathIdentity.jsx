(function () {
    var output = new File("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase513C1IdentityReport.txt");
    var lines = [];
    var comp = null;
    function line(value) { lines.push(String(value)); $.writeln(String(value)); }
    try {
        var providerFile = new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx");
        $.evalFile(providerFile);
        comp = app.project.items.addComp("CF_Phase513C1", 640, 480, 1, 1, 24);
        var layer = comp.layers.addShape();
        var root = layer.property("ADBE Root Vectors Group");
        var group = root.addProperty("ADBE Vector Group");
        var contents = group.property("ADBE Vectors Group");
        var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
        var effect = layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex");
        rectangle.selected = true;
        layer.selected = true;
        var serialized = $.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot();
        line("CAPTURE_RESULT=" + serialized);
        line("PATH_EXPECTED=Root(1)->Group(2)->Contents(3)->Rectangle(4)");
        line("TRANSPORT_RESULT=INSPECTED_BY_AEX_ON_NEXT_RENDER");
    } catch (error) {
        line("CAPTURE_ERROR=" + error.toString());
    } finally {
        if (comp) { comp.remove(); }
        output.parent.create();
        output.open("w");
        output.encoding = "UTF-8";
        output.write(lines.join("\n") + "\n");
        output.close();
    }
}());
