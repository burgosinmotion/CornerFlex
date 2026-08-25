(function () {
    var output = new Folder("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output");
    var report = new File(output.fsName + "/Phase513C4DeterministicResolverReport.txt");
    var trace = new File(output.fsName + "/Phase513C3RuntimeResolverTrace.txt");
    var targetPath = [
        { index: 0, token: 1, matchName: "ADBE Root Vectors Group" },
        { index: 1, token: 2, matchName: "ADBE Vector Group" },
        { index: 1, token: 3, matchName: "ADBE Vectors Group" },
        { index: 1, token: 4, matchName: "ADBE Vector Shape - Rect" }
    ];

    function write(text) {
        report.open("a");
        report.write(String(text) + "\n");
        report.close();
    }

    function readParams(effect) {
        var wanted = [
            "BurgosInMotion CornerFlex-0007",
            "BurgosInMotion CornerFlex-0008",
            "BurgosInMotion CornerFlex-0009",
            "BurgosInMotion CornerFlex-0010",
            "BurgosInMotion CornerFlex-0020",
            "BurgosInMotion CornerFlex-0021",
            "BurgosInMotion CornerFlex-0022"
        ];
        for (var segment = 0; segment < 8; segment++) {
            wanted.push("BurgosInMotion CornerFlex-" + ("0000" + (23 + segment * 2)).slice(-4));
            wanted.push("BurgosInMotion CornerFlex-" + ("0000" + (24 + segment * 2)).slice(-4));
        }
        var result = [];
        for (var index = 1; index <= effect.numProperties; index++) {
            var property = effect.property(index);
            if (!property) { continue; }
            for (var wantedIndex = 0; wantedIndex < wanted.length; wantedIndex++) {
                if (property.matchName === wanted[wantedIndex]) {
                    result.push({ matchName: property.matchName, value: property.value });
                    break;
                }
            }
        }
        return result;
    }

    function readPath(rectangle) {
        var path = [];
        var current = rectangle;
        while (current) {
            var token = current.matchName === "ADBE Root Vectors Group" ? 1 :
                (current.matchName === "ADBE Vector Group" ? 2 :
                    (current.matchName === "ADBE Vectors Group" ? 3 :
                        (current.matchName === "ADBE Vector Shape - Rect" ? 4 : 0)));
            path.unshift({
                index: current.matchName === "ADBE Root Vectors Group" ? 0 : current.propertyIndex,
                token: token,
                matchName: current.matchName
            });
            if (current.matchName === "ADBE Root Vectors Group") { break; }
            current = current.propertyGroup(1);
        }
        return path;
    }

    function runOne(runNumber) {
        var comp = null;
        var queueItem = null;
        try {
            if (trace.exists) { trace.remove(); }
            comp = app.project.items.addComp("CF_Phase513C4_Run" + runNumber, 640, 480, 1, 1, 24);
            comp.openInViewer();
            comp.time = 0.25 + runNumber * 0.01;
            var layer = comp.layers.addShape();
            var root = layer.property("ADBE Root Vectors Group");
            var group = root.addProperty("ADBE Vector Group");
            var contents = group.property("ADBE Vectors Group");
            var rectangle = contents.addProperty("ADBE Vector Shape - Rect");
            var effect = layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex");
            layer.selected = true;
            rectangle.selected = true;

            var capture = $.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot();
            write("RUN " + runNumber + " CEP_CAPTURE=" + capture);
            write("RUN " + runNumber + " CEP_PATH=" + JSON.stringify(readPath(rectangle)));
            write("RUN " + runNumber + " STORED_PARAMS=" + JSON.stringify(readParams(effect)));
            if (String(capture).indexOf("SNAPSHOT_CAPTURED") < 0) {
                write("RUN " + runNumber + " RESULT=FAIL_CAPTURE");
                return;
            }

            trace.open("a");
            trace.write("RUN_ID=" + runNumber + "\n");
            trace.close();

            queueItem = app.project.renderQueue.items.add(comp);
            queueItem.outputModule(1).file = new File(output.fsName + "/Phase513C4_Run" + runNumber + ".png");
            app.project.renderQueue.render();
            write("RUN " + runNumber + " RENDER_COMPLETED");
            if (trace.exists) {
                trace.open("r");
                write("RUN " + runNumber + " AEX_TRACE=" + trace.read());
                trace.close();
            } else {
                write("RUN " + runNumber + " AEX_TRACE=MISSING");
            }
        } catch (error) {
            write("RUN " + runNumber + " ERROR=" + error.toString());
        } finally {
            if (queueItem) { try { queueItem.remove(); } catch (removeError) {} }
            if (comp) { try { comp.remove(); } catch (removeCompError) {} }
        }
    }

    try {
        if (report.exists) { report.remove(); }
        write("Phase 5.13C.4 Deterministic Runtime Resolver Validation");
        write("START");
        $.evalFile(new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx"));
        for (var run = 1; run <= 3; run++) {
            runOne(run);
        }
        write("END");
    } catch (error) {
        write("FATAL=" + error.toString());
    }
}());
