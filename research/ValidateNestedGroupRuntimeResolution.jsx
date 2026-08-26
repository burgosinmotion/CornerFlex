/*
 * Phase 5.14C diagnostic harness.
 * It creates small root/single/double/triple Shape Group cases and asks the
 * existing CEP provider to capture the selected Rectangle Path. It does not
 * alter the AEX and must be run manually only when a diagnostic session is
 * explicitly authorized.
 */
(function () {
    var providerFile = new File(
        "E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx");
    var reportFile = new File(
        "E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase514C/NestedGroupRuntimeResolutionReport.txt");
    var MATCH = {
        ROOT: "ADBE Root Vectors Group",
        GROUP: "ADBE Vector Group",
        CONTENTS: "ADBE Vectors Group",
        RECTANGLE: "ADBE Vector Shape - Rect",
        EFFECT: "BurgosInMotion CornerFlex"
    };

    function ensureFolder(file) {
        if (!file.parent.exists) {
            file.parent.create();
        }
    }

    function addRectangle(contents, name) {
        var rectangle = contents.addProperty(MATCH.RECTANGLE);
        rectangle.name = name;
        return rectangle;
    }

    function addGroup(contents, name) {
        var group = contents.addProperty(MATCH.GROUP);
        group.name = name;
        return group.property(MATCH.CONTENTS);
    }

    function makeCase(label, groupCount) {
        var comp = app.project.items.addComp(
            "CF_Phase514C_" + label,
            640,
            360,
            1,
            1,
            24);
        var layer = comp.layers.addShape();
        layer.name = "CF_" + label + "_Shape";
        var effect = layer.property("ADBE Effect Parade").addProperty(MATCH.EFFECT);
        var contents = layer.property(MATCH.ROOT);
        var index;
        var rectangle;

        for (index = 0; index < groupCount; index++) {
            contents = addGroup(contents, label + " Group " + index);
        }
        rectangle = addRectangle(contents, label + " Rectangle");
        rectangle.selected = true;
        layer.selected = true;
        return {
            label: label,
            comp: comp,
            layer: layer,
            effect: effect,
            rectangle: rectangle
        };
    }

    function captureCase(testCase) {
        app.project.activeItem = testCase.comp;
        testCase.layer.selected = true;
        try {
            return $.global.CornerFlexGeometryProvider
                .captureSelectedRectangleSnapshot();
        }
        catch (error) {
            return "ERROR:" + error.toString();
        }
    }

    function main() {
        var cases = [];
        var lines = [];
        var index;

        if (!providerFile.exists) {
            throw new Error("Provider file not found: " + providerFile.fsName);
        }
        $.evalFile(providerFile);
        if (!$.global.CornerFlexGeometryProvider) {
            throw new Error("CornerFlexGeometryProvider was not loaded.");
        }

        app.beginUndoGroup("CornerFlex Phase 5.14C Runtime Resolution Diagnostics");
        try {
            cases.push(makeCase("Root", 0));
            cases.push(makeCase("Single", 1));
            cases.push(makeCase("Double", 2));
            cases.push(makeCase("Triple", 3));
            for (index = 0; index < cases.length; index++) {
                lines.push(cases[index].label + "=" + captureCase(cases[index]));
            }
        }
        finally {
            app.endUndoGroup();
        }

        ensureFolder(reportFile);
        reportFile.encoding = "UTF-8";
        reportFile.open("w");
        reportFile.write("PHASE 5.14C NESTED GROUP RUNTIME DIAGNOSTIC\n");
        reportFile.write(lines.join("\n"));
        reportFile.close();
        alert("PHASE 5.14C DIAGNOSTIC COMPLETE\nReport:\n" + reportFile.fsName);
    }

    main();
}());
