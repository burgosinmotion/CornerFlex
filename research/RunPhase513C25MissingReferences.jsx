(function () {
    // Reduced C.25 reference harness. It intentionally does not run A-O/V-W.
    var ROOT = "E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton";
    var OUT = new Folder(ROOT + "/research/output/Phase513C25MissingReferences");
    var REPORT = new File(OUT.fsName + "/Phase513C25MissingReferencesReport.txt");
    var PROVIDER = new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx");
    var ids = ["P","Q","R","S","T","U","Z"];
    function write(v) { REPORT.open("a"); REPORT.write(String(v)+"\n"); REPORT.close(); }
    function addRectangle(root, id) {
        var spec = id === "Z" ? {size:[300,180],pos:[-250,-120]} : {size:[300,180],pos:[-250,-120]};
        var group = root.addProperty("ADBE Vector Group"); group.name="Group A";
        var contents=group.property("ADBE Vectors Group");
        var rect=contents.addProperty("ADBE Vector Shape - Rect"); rect.name="Group A Rectangle";
        rect.property("ADBE Vector Rect Size").setValue(spec.size);
        rect.property("ADBE Vector Rect Position").setValue(spec.pos);
        var fill=contents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue([1,0.2,0.05,1]);
        fill.property("ADBE Vector Fill Opacity").setValue(100);
    }
    function selectOnly(comp, layer) {
        for (var i=1;i<=comp.numLayers;i++) comp.layer(i).selected=false;
        layer.selected=true;
    }
    function configure(layer,id) {
        layer.threeDLayer=(id==="R");
        if (id==="Q") { var n=layer.containingComp.layers.addNull(); n.name="C25 Parent"; layer.parent=n; }
        if (id==="T") layer.transform.scale.setValue([0,0]);
        else if (id==="U") layer.transform.scale.setValue([-100,100]);
        else layer.transform.scale.setValue([100,100]);
        if (id!=="R") layer.transform.rotation.setValue(0);
    }
    function run(id) {
        var comp=app.project.items.addComp("CF_Phase513C25_"+id,1920,1080,1,1,24);
        comp.openInViewer(); var layer=comp.layers.addShape(); layer.name="Phase513C25_"+id;
        addRectangle(layer.property("ADBE Root Vectors Group"),id); configure(layer,id);
        var effect=layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex");
        effect.property("Link Trim").setValue(true); effect.property("Trim").setValue(0);
        effect.property("Trim Left").setValue(0); effect.property("Trim Top").setValue(0);
        effect.property("Trim Right").setValue(0); effect.property("Trim Bottom").setValue(0);
        selectOnly(comp,layer);
        var result=$.global.CornerFlexGeometryProvider.disableRectangleSnapshot();
        write(id+"_FALLBACK="+result);
        if (String(result).indexOf("SNAPSHOT_DISABLED")<0) throw new Error("fallback failed "+id);
        comp.saveFrameToPng(comp.time,new File(OUT.fsName+"/"+id+"_LayerBoundsReference.png"));
        write(id+"_RENDER_COMPLETED");
    }
    try {
        if(!OUT.exists) OUT.create();
        var old=OUT.getFiles(); for(var i=0;i<old.length;i++) if(old[i] instanceof File) old[i].remove();
        if(REPORT.exists) REPORT.remove();
        $.evalFile(PROVIDER); write("PHASE 5.13C.25 MISSING REFERENCES"); write("CASE_COUNT="+ids.length);
        for(var j=0;j<ids.length;j++){ run(ids[j]); write(ids[j]+"_PASS=OPERATIONAL"); }
        write("STATUS=PASS"); alert("PHASE 5.13C.25 MISSING REFERENCES COMPLETE\nReporte: "+REPORT.fsName);
    } catch(error) { write("STATUS=FAIL"); write("ERROR="+error.toString()); alert("PHASE 5.13C.25 MISSING REFERENCES FAILED\nReporte: "+REPORT.fsName); }
}());
