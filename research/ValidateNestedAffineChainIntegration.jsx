/* Phase 5.14D: autonomous reduced visual matrix A-J. */
(function () {
    var ROOT = new Folder(new File($.fileName).parent.fsName + "/output/Phase514DNestedAffineChainIntegration");
    var REPORT = new File(ROOT.fsName + "/NestedAffineChainIntegrationReport.txt");
    var PROVIDER = new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx");
    var failedCase = "";
    var cases = [
        {id:"A",name:"Single Group Regression",depth:1,size:[500,500],rect:[0,0],inner:{pos:[0,0],scale:[100,100],rot:0},trim:0,source:"Rectangle Source"},
        {id:"B",name:"Nested Identity",depth:2,size:[500,500],rect:[0,0],inner:{pos:[0,0],scale:[100,100],rot:0},outer:{pos:[0,0],scale:[100,100],rot:0},trim:0,source:"Rectangle Source"},
        {id:"C",name:"Nested Position",depth:2,size:[500,500],rect:[0,0],inner:{pos:[80,-40],scale:[100,100],rot:0},outer:{pos:[-120,60],scale:[100,100],rot:0},trim:0,source:"Rectangle Source"},
        {id:"D",name:"Nested Rotation",depth:2,size:[500,500],rect:[0,0],inner:{pos:[0,0],scale:[100,100],rot:25},outer:{pos:[0,0],scale:[100,100],rot:-15},trim:0,source:"Rectangle Source"},
        {id:"E",name:"Non-Uniform Scale + Rotation",depth:2,size:[500,500],rect:[0,0],inner:{pos:[0,0],scale:[140,70],rot:20},outer:{pos:[0,0],scale:[100,100],rot:30},trim:0,source:"Rectangle Source"},
        {id:"F",name:"Implicit Shear",depth:2,size:[500,500],rect:[0,0],inner:{pos:[0,0],scale:[150,70],rot:15},outer:{pos:[0,0],scale:[100,100],rot:35},trim:0,source:"Rectangle Source"},
        {id:"G",name:"Trim 0",depth:2,size:[500,500],rect:[0,0],inner:{pos:[0,0],scale:[100,100],rot:0},outer:{pos:[0,0],scale:[100,100],rot:0},trim:0,source:"Rectangle Source"},
        {id:"H",name:"Trim 10%",depth:2,size:[500,500],rect:[0,0],inner:{pos:[0,0],scale:[100,100],rot:0},outer:{pos:[0,0],scale:[100,100],rot:0},trim:10,source:"Rectangle Source"},
        {id:"I",name:"Depth Three Fallback",depth:3,size:[500,500],rect:[0,0],inner:{pos:[10,0],scale:[110,100],rot:10},outer:{pos:[0,10],scale:[100,100],rot:15},third:{pos:[0,0],scale:[100,100],rot:5},trim:0,source:"Layer Bounds",fallback:true},
        {id:"J",name:"Skew Fallback",depth:2,size:[500,500],rect:[0,0],inner:{pos:[0,0],scale:[100,100],rot:0,skew:20},outer:{pos:[0,0],scale:[100,100],rot:0},trim:0,source:"Layer Bounds",fallback:true}
    ];
    function need(value, message) { if (!value) { throw new Error(message); } return value; }
    function write(line) { need(REPORT.open("a"), "Unable to open report"); REPORT.write(String(line) + "\n"); REPORT.close(); }
    function clearFolder(folder) { var files = folder.getFiles(), i; for (i=0; i<files.length; i++) { try { files[i].remove(); } catch (ignore) {} } }
    function setProp(group, match, value) { var p = need(group.property(match), "Missing property: " + match); p.setValue(value); return p; }
    function setTransform(group, data) {
        var t = need(group.property("ADBE Vector Transform Group"), "Missing group transform");
        setProp(t, "ADBE Vector Anchor", [0,0]); setProp(t, "ADBE Vector Position", data.pos || [0,0]);
        setProp(t, "ADBE Vector Scale", data.scale || [100,100]); setProp(t, "ADBE Vector Rotation", data.rot || 0);
        if (data.skew !== undefined) { setProp(t, "ADBE Vector Skew", data.skew); }
    }
    function addGroup(contents, name, data) { var g = need(contents.addProperty("ADBE Vector Group"), "Unable to add group"); g.name=name; setTransform(g,data||{}); return g; }
    function addRectangle(contents, def) {
        var r = need(contents.addProperty("ADBE Vector Shape - Rect"), "Unable to add rectangle"); r.name="Phase514D Rectangle";
        setProp(r,"ADBE Vector Rect Size",def.size); setProp(r,"ADBE Vector Rect Position",def.rect);
        var fill=contents.addProperty("ADBE Vector Graphic - Fill"); setProp(fill,"ADBE Vector Fill Color",[1,0.15,0.03]); setProp(fill,"ADBE Vector Fill Opacity",100);
        return need(contents.property("ADBE Vector Shape - Rect"), "Unable to reacquire rectangle");
    }
    function buildHierarchy(layer, def) {
        var contents=need(layer.property("ADBE Root Vectors Group"),"Missing root contents"), groups=[], g;
        if (def.depth >= 1) { g=addGroup(contents,"Phase514D Outer",def.depth===1?def.inner:def.outer); groups.push(g); contents=need(g.property("ADBE Vectors Group"),"Missing outer contents"); }
        if (def.depth >= 2) { g=addGroup(contents,"Phase514D Inner",def.inner); groups.push(g); contents=need(g.property("ADBE Vectors Group"),"Missing inner contents"); }
        if (def.depth >= 3) { g=addGroup(contents,"Phase514D Deep",def.third); groups.push(g); contents=need(g.property("ADBE Vectors Group"),"Missing deep contents"); }
        return {groups:groups,rectangle:addRectangle(contents,def)};
    }
    function clearSelection(comp) { var i,j,props; for(i=1;i<=comp.numLayers;i++){comp.layer(i).selected=false;props=comp.layer(i).selectedProperties;for(j=0;j<props.length;j++){try{props[j].selected=false;}catch(ignore){}}} }
    function selectRectangle(comp,layer,rect) { clearSelection(comp); layer.selected=true; rect.selected=true; }
    function configureEffect(effect,trim) { var link=effect.property("Link Trim"), value=effect.property("Trim"); need(link&&value,"Trim parameters unavailable"); link.setValue(1); value.setValue(trim); }
    function parseCapture(serialized) { var result; need(typeof serialized==="string","Provider returned non-string"); result=eval("("+serialized+")"); need(result&&result.ok===true&&result.code==="SNAPSHOT_CAPTURED","Capture failed: "+serialized); return result; }
    function render(comp,id,suffix) {
        var outputPath=ROOT.fsName+"/Case"+id+(suffix||"")+".png", output=new File(outputPath), captureTime=0;
        var refreshedOutput, attempts=0, maxAttempts=10;
        if(output.exists){output.remove();}
        comp.time=captureTime;
        need(comp.saveFrameToPng, "CompItem.saveFrameToPng is unavailable");
        comp.saveFrameToPng(captureTime, output);
        while (attempts < maxAttempts) {
            attempts++;
            refreshedOutput=new File(outputPath);
            if (refreshedOutput.exists) { break; }
            $.sleep(100);
        }
        write("CASE_"+id+"_PNG_CHECK_ATTEMPTS="+attempts);
        write("CASE_"+id+"_PNG_EXISTS="+(refreshedOutput && refreshedOutput.exists));
        write("CASE_"+id+"_PNG_SIZE="+(refreshedOutput && refreshedOutput.exists ? refreshedOutput.length : 0));
        need(refreshedOutput && refreshedOutput.exists,"Render did not create PNG "+outputPath);
        write("CASE_"+id+"_OUTPUT="+outputPath);
        return refreshedOutput;
    }
    function runCase(def) {
        var comp=app.project.items.addComp("CF_Phase514D_"+def.id,1920,1080,1,2,24), layer=comp.layers.addShape(), hierarchy,effect,capture;
        comp.openInViewer(); layer.name="Phase514D_"+def.id; hierarchy=buildHierarchy(layer,def);
        layer.transform.anchorPoint.setValue([960,540]); layer.transform.position.setValue([960,540]); layer.transform.scale.setValue([100,100]);
        effect=need(layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex"),"CornerFlex unavailable"); configureEffect(effect,def.trim);
        selectRectangle(comp,layer,hierarchy.rectangle); need($.global.CornerFlexGeometryProvider&&$.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot,"Provider unavailable");
        capture=parseCapture($.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot());
        write("CASE_"+def.id+"_CONFIG="+def.name+" depth="+def.depth+" source="+def.source+" trim="+def.trim);
        write("CASE_"+def.id+"_RECT_SIZE="+def.size[0]+","+def.size[1]+" RECT_POSITION="+def.rect[0]+","+def.rect[1]);
        write("CASE_"+def.id+"_GROUP_PATH=Root/"+(def.depth===1?"Phase514D Outer":"Phase514D Outer/Phase514D Inner"+(def.depth===3?"/Phase514D Deep":""))+"/Phase514D Rectangle");
        write("CASE_"+def.id+"_CAPTURE="+capture.code+" layerId="+capture.data.layerId+" pathDepth="+capture.data.pathDepth+" segments="+capture.data.pathDepth);
        render(comp,def.id,"");
        if(def.fallback){ selectRectangle(comp,layer,hierarchy.rectangle); need($.global.CornerFlexGeometryProvider.disableRectangleSnapshot,"Provider fallback API unavailable"); need(String($.global.CornerFlexGeometryProvider.disableRectangleSnapshot()).indexOf("SNAPSHOT_DISABLED")>=0,"Unable to disable snapshot"); render(comp,def.id,"_LayerBoundsReference"); }
        write("CASE_"+def.id+"_OPERATIONAL_PASS=true");
    }
    try {
        if(!ROOT.exists){need(ROOT.create(),"Unable to create output folder");} clearFolder(ROOT); need(PROVIDER.exists,"Provider not found: "+PROVIDER.fsName); $.evalFile(PROVIDER); need($.global.CornerFlexGeometryProvider,"Provider did not load");
        REPORT.encoding="UTF-8"; need(REPORT.open("w"),"Unable to create report"); REPORT.write("PHASE 5.14D REDUCED VISUAL MATRIX A-J\nSTOP_ON_FIRST_FAILURE=true\nCASE_COUNT=10\nMODE=AUTONOMOUS_MANUAL_EXECUTION\n"); REPORT.close();
        var i; for(i=0;i<cases.length;i++){failedCase=cases[i].id;runCase(cases[i]);} write("STATUS=PASS_OPERATIONAL_ONLY"); alert("PHASE 5.14D REDUCED VISUAL MATRIX A-J COMPLETE\nReporte:\n"+REPORT.fsName);
    } catch(error) { try{write("STATUS=FAIL_OPERATIONAL");write("FAILED_CASE="+(failedCase||"UNKNOWN"));write("ERROR="+error.toString());}catch(reportError){} alert("PHASE 5.14D REDUCED VISUAL MATRIX A-J FAILED AT CASE "+(failedCase||"UNKNOWN")+"\nReporte:\n"+REPORT.fsName); }
}());
