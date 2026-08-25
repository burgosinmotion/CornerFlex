(function () {
    // Ejecutable manual de Phase 5.13C A-Z. No cerrar After Effects ni modificar C++.
    var ROOT = "E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton";
    var OUT = new Folder(ROOT + "/research/output/Phase513CFullMatrixAZ");
    var REPORT = new File(OUT.fsName + "/Phase513CFullMatrixAZReport.txt");
    var PROVIDER = new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx");
    var failedCase = "";
    var cases = [
        {id:"A",size:[300,180],rect:[0,0],scale:[100,100],rot:0,trim:[0,0,0,0,0],source:true},
        {id:"B",size:[300,180],rect:[-250,-120],scale:[100,100],rot:0,trim:[0,0,0,0,0],source:true},
        {id:"C",size:[300,180],rect:[-250,-120],scale:[150,150],rot:0,trim:[0,0,0,0,0],source:true},
        {id:"D",size:[300,180],rect:[-250,-120],scale:[100,100],rot:45,trim:[0,0,0,0,0],source:true},
        {id:"E",size:[300,180],rect:[-250,-120],scale:[100,100],rot:-45,trim:[0,0,0,0,0],source:true},
        {id:"F",size:[300,180],rect:[-250,-120],scale:[150,75],rot:45,trim:[0,0,0,0,0],source:true},
        {id:"G",size:[300,180],rect:[-250,-120],anchor:[100,50],scale:[100,100],rot:45,trim:[0,0,0,0,0],source:true},
        {id:"H",size:[300,180],rect:[-250,-120],layerPos:[1200,700],scale:[100,100],rot:45,trim:[0,0,0,0,0],source:true},
        {id:"I",size:[300,180],rect:[220,140],scale:[100,100],rot:45,trim:[0,0,0,0,0],source:true},
        {id:"J",size:[300,180],rect:[-250,-120],scale:[100,100],rot:0,animatedScale:true,trim:[0,0,0,0,0],source:true},
        {id:"K",size:[300,180],rect:[-250,-120],scale:[100,100],rot:0,animatedRotation:true,trim:[0,0,0,0,0],source:true},
        {id:"L",size:[300,180],rect:[-250,-120],scale:[100,100],rot:0,expressionScale:true,trim:[0,0,0,0,0],source:true},
        {id:"M",size:[300,180],rect:[-250,-120],scale:[100,100],rot:0,trim:[0,0,0,0,0],source:true},
        {id:"N",size:[300,180],rect:[-250,-120],scale:[100,100],rot:0,trim:[1,10,10,10,10],source:true},
        {id:"O",size:[300,180],rect:[-250,-120],scale:[100,100],rot:0,trim:[0,10,20,30,40],source:true},
        {id:"P",size:[300,180],rect:[-250,-120],scale:[100,100],rot:0,trim:[0,0,0,0,0],source:false,equality:true},
        {id:"Q",size:[300,180],rect:[-250,-120],scale:[100,100],rot:0,parented:true,trim:[0,0,0,0,0],source:false},
        {id:"R",size:[300,180],rect:[-250,-120],scale:[100,100],rot:0,is3D:true,trim:[0,0,0,0,0],source:false},
        {id:"S",size:[300,180],rect:[-250,-120],scale:[100,100],rot:0,unsupported:true,trim:[0,0,0,0,0],source:false},
        {id:"T",size:[300,180],rect:[-250,-120],scale:[0,0],rot:0,trim:[0,0,0,0,0],source:false},
        {id:"U",size:[300,180],rect:[-250,-120],scale:[-100,100],rot:0,trim:[0,0,0,0,0],source:false},
        {id:"V",size:[300,180],rect:[-250,-120],scale:[100,100],rot:0,groupName:"Group A",trim:[0,0,0,0,0],source:true},
        {id:"W",size:[640,360],rect:[220,140],scale:[100,100],rot:0,groupName:"Group B",trim:[0,0,0,0,0],source:true},
        {id:"X",size:[300,180],rect:[-250,-120],scale:[100,100],rot:45,trim:[0,0,0,0,0],source:true,membership:"inside"},
        {id:"Y",size:[300,180],rect:[-250,-120],scale:[100,100],rot:45,trim:[0,0,0,0,0],source:true,membership:"aabbOutside"},
        {id:"Z",size:[300,180],rect:[-250,-120],scale:[100,100],rot:0,trim:[0,0,0,0,0],source:false,equality:true}
    ];
    function write(s) { REPORT.open("a"); REPORT.write(String(s) + "\n"); REPORT.close(); }
    function setProp(group, match, value) { group.property(match).setValue(value); }
    function setGroupTransform(group, c) {
        var t = group.property("ADBE Vector Transform Group");
        setProp(t, "ADBE Vector Position", c.groupPos || [0,0]);
        setProp(t, "ADBE Vector Scale", c.groupScale || [100,100]);
        setProp(t, "ADBE Vector Rotation", c.groupRot || 0);
    }
    function addRectangle(root, c) {
        var group = root.addProperty("ADBE Vector Group");
        group.name = c.groupName || "Group A";
        setGroupTransform(group, c);
        var contents = group.property("ADBE Vectors Group");
        var rect = contents.addProperty("ADBE Vector Shape - Rect");
        rect.name = group.name + " Rectangle";
        setProp(rect, "ADBE Vector Rect Size", c.size);
        setProp(rect, "ADBE Vector Rect Position", c.rect);
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        setProp(fill, "ADBE Vector Fill Color", [1,0.2,0.05,1]);
        setProp(fill, "ADBE Vector Fill Opacity", 100);
        // Adding an indexed sibling can invalidate the original PropertyBase.
        // Reacquire the Rectangle Path after the group is complete.
        rect = contents.property("ADBE Vector Shape - Rect");
        return {group:group, rectangle:rect};
    }
    function configureLayer(layer, c) {
        layer.threeDLayer = !!c.is3D;
        if (c.anchor) { layer.transform.anchorPoint.setValue(c.anchor); }
        if (c.layerPos) { layer.transform.position.setValue(c.layerPos); }
        layer.transform.scale.setValue(c.scale);
        // A 3D layer has orientation/X/Y/Z rotation streams instead of the
        // 2D rotation stream; R only tests the defensive 3D fallback.
        if (!c.is3D) { layer.transform.rotation.setValue(c.rot); }
        if (c.animatedScale) {
            layer.transform.scale.setValueAtTime(0, [100,100]);
            layer.transform.scale.setValueAtTime(1, [150,150]);
        }
        if (c.animatedRotation) {
            layer.transform.rotation.setValueAtTime(0, 0);
            layer.transform.rotation.setValueAtTime(1, 45);
        }
        if (c.expressionScale) { layer.transform.scale.expression = "[100 + time*50, 100 + time*50]"; }
        if (c.parented) {
            var parent = layer.containingComp.layers.addNull();
            parent.name = "C13C Parent";
            parent.transform.position.setValue([960,540]);
            layer.parent = parent;
        }
    }
    function configureTrim(effect, trim) {
        effect.property("Link Trim").setValue(trim[0] !== 0 || trim[1] === trim[2] && trim[2] === trim[3] && trim[3] === trim[4]);
        effect.property("Trim").setValue(trim[1]);
        effect.property("Trim Left").setValue(trim[1]);
        effect.property("Trim Top").setValue(trim[2]);
        effect.property("Trim Right").setValue(trim[3]);
        effect.property("Trim Bottom").setValue(trim[4]);
    }
    function renderCase(comp, id, time) {
        comp.time = time;
        var file = new File(OUT.fsName + "/Case" + id + (time ? "_T" + time : "") + ".png");
        comp.saveFrameToPng(comp.time, file);
        write("CASE_" + id + "_RENDER_COMPLETED=" + file.fsName);
    }
    function selectOnlyLayer(comp, layer) {
        for (var index = 1; index <= comp.numLayers; index++) {
            comp.layer(index).selected = false;
        }
        layer.selected = true;
    }
    function runCase(c) {
        failedCase = c.id;
        var comp = app.project.items.addComp("CF_Phase513C_" + c.id, 1920, 1080, 1, 2, 24);
        comp.openInViewer();
        write("CASE_" + c.id + "_COMP_READY=true");
        var layer = comp.layers.addShape();
        layer.name = "Phase513C_" + c.id;
        write("CASE_" + c.id + "_LAYER_READY=true");
        var root = layer.property("ADBE Root Vectors Group");
        var primary = addRectangle(root, c);
        write("CASE_" + c.id + "_RECTANGLE_READY=true");
        if (c.id === "V" || c.id === "W") { addRectangle(root, {groupName:c.id === "V" ? "Group B" : "Group A", size:[120,90], rect:[0,0]}); }
        if (c.id === "V" || c.id === "W") {
            // Adding a sibling group can invalidate indexed PropertyBase refs.
            var stableGroup = root.property(c.groupName);
            primary.rectangle = stableGroup.property("ADBE Vectors Group").property("ADBE Vector Shape - Rect");
        }
        configureLayer(layer, c);
        write("CASE_" + c.id + "_TRANSFORM_READY=true");
        var effect = layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex");
        if (!effect) { throw new Error("CornerFlex effect unavailable"); }
        write("CASE_" + c.id + "_EFFECT_READY=true");
        configureTrim(effect, c.trim);
        write("CASE_" + c.id + "_TRIM_READY=true");
        write("CASE=" + c.id + " EXPECTED_SOURCE=" + (c.source ? "Rectangle Source" : "Layer Bounds") + " EXPECTED_FALLBACK=" + (!!c.equality || !c.source));
        // Parenting may select the Null; the provider requires exactly one
        // selected Shape Layer for both capture and fallback operations.
        selectOnlyLayer(comp, layer);
        if (c.source) {
            // Select one concrete Rectangle Path property; the provider resolves
            // its ancestor and avoids invalid PropertyBase selection handles.
            write("CASE_" + c.id + "_BEFORE_LAYER_SELECT=true");
            layer.selected = true;
            write("CASE_" + c.id + "_BEFORE_PROPERTY_LOOKUP=true");
            var sizeProperty = primary.rectangle.property("ADBE Vector Rect Size");
            if (!sizeProperty) { throw new Error("Rectangle Size property unavailable"); }
            write("CASE_" + c.id + "_BEFORE_PROPERTY_SELECT=true");
            sizeProperty.selected = true;
            write("CASE_" + c.id + "_SELECTION_READY=true");
            if (!$.global.CornerFlexGeometryProvider ||
                !$.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot) {
                throw new Error("Geometry provider unavailable");
            }
            var capture = $.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot();
            write("CASE_" + c.id + "_CAPTURE=" + capture);
            if (String(capture).indexOf("SNAPSHOT_CAPTURED") < 0) { throw new Error("capture failed"); }
        } else {
            var disabled = $.global.CornerFlexGeometryProvider.disableRectangleSnapshot();
            write("CASE_" + c.id + "_FALLBACK=" + disabled);
            if (String(disabled).indexOf("SNAPSHOT_DISABLED") < 0) { throw new Error("fallback failed"); }
        }
        if (c.animatedScale || c.animatedRotation || c.expressionScale) {
            renderCase(comp, c.id, 0); renderCase(comp, c.id, 0.5); renderCase(comp, c.id, 1);
        } else { renderCase(comp, c.id, 0); }
        // Keep After Effects open for manual inspection; CompItem has no
        // closeInViewer() API in the ExtendScript DOM.
    }
    try {
        if (!OUT.exists) { OUT.create(); }
        var old = OUT.getFiles(); for (var i=0; i<old.length; i++) { if (old[i] instanceof File) { old[i].remove(); } }
        if (REPORT.exists) { REPORT.remove(); }
        $.evalFile(PROVIDER);
        write("PHASE 5.13C FULL MATRIX A-Z");
        write("MODE=MANUAL_SEQUENTIAL_STOP_ON_FIRST_FAIL");
        write("CASE_COUNT=" + cases.length);
        for (var n=0; n<cases.length; n++) { runCase(cases[n]); write("CASE_" + cases[n].id + "_PASS=OPERATIONAL"); }
        write("STATUS=PASS");
        alert("PHASE 5.13C FULL MATRIX A-Z COMPLETE\nReporte: " + REPORT.fsName);
    } catch (error) {
        failedCase = failedCase || "UNKNOWN";
        write("STATUS=FAIL"); write("FAILED_CASE=" + failedCase); write("ERROR=" + error.toString());
        alert("PHASE 5.13C FULL MATRIX A-Z FAILED AT CASE " + failedCase + "\nReporte: " + REPORT.fsName);
    }
}());
