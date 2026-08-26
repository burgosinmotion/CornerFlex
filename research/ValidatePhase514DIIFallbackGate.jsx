/* Phase 5.14D-II: focused visual gate for unsupported hierarchy fallback. */
(function () {
    var ROOT = new Folder(new File($.fileName).parent.fsName + "/output/Phase514DII");
    var REPORT = new File(ROOT.fsName + "/FallbackGateReport.txt");
    var PROVIDER = new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx");
    var cases = [
        {id:"I", depth:3, inner:{pos:[10,0],scale:[110,100],rot:10}, outer:{pos:[0,10],scale:[100,100],rot:15}, third:{pos:[0,0],scale:[100,100],rot:5}},
        {id:"J", depth:2, inner:{pos:[0,0],scale:[100,100],rot:0,skew:20}, outer:{pos:[0,0],scale:[100,100],rot:0}}
    ];
    function need(value, message) { if (!value) { throw new Error(message); } return value; }
    function write(line) { need(REPORT.open("a"), "Unable to open fallback report"); REPORT.write(String(line) + "\n"); REPORT.close(); }
    function setProp(group, match, value) { var p=need(group.property(match), "Missing property: "+match); p.setValue(value); return p; }
    function setTransform(group, data) { var t=need(group.property("ADBE Vector Transform Group"), "Missing group transform"); setProp(t,"ADBE Vector Anchor",[0,0]); setProp(t,"ADBE Vector Position",data.pos||[0,0]); setProp(t,"ADBE Vector Scale",data.scale||[100,100]); setProp(t,"ADBE Vector Rotation",data.rot||0); if(data.skew!==undefined){setProp(t,"ADBE Vector Skew",data.skew);} }
    function addGroup(contents,name,data) { var g=need(contents.addProperty("ADBE Vector Group"),"Unable to add Shape Group"); g.name=name; setTransform(g,data||{}); return g; }
    function buildFixture(layer,def) {
        var contents=need(layer.property("ADBE Root Vectors Group"),"Missing root contents"),g,r,fill;
        g=addGroup(contents,"Phase514D Outer",def.depth===3?def.outer:def.outer); contents=need(g.property("ADBE Vectors Group"),"Missing outer contents");
        g=addGroup(contents,"Phase514D Inner",def.inner); contents=need(g.property("ADBE Vectors Group"),"Missing inner contents");
        if(def.depth===3){g=addGroup(contents,"Phase514D Deep",def.third); contents=need(g.property("ADBE Vectors Group"),"Missing deep contents");}
        r=need(contents.addProperty("ADBE Vector Shape - Rect"),"Unable to add Rectangle Path"); r.name="Phase514D Rectangle"; setProp(r,"ADBE Vector Rect Size",[500,500]); setProp(r,"ADBE Vector Rect Position",[0,0]);
        fill=contents.addProperty("ADBE Vector Graphic - Fill"); setProp(fill,"ADBE Vector Fill Color",[1,0.15,0.03]); setProp(fill,"ADBE Vector Fill Opacity",100);
        return need(contents.property("ADBE Vector Shape - Rect"),"Unable to reacquire Rectangle Path");
    }
    function selectRectangle(comp,layer,rectangle) { var i,j,props; for(i=1;i<=comp.numLayers;i++){comp.layer(i).selected=false;props=comp.layer(i).selectedProperties;for(j=0;j<props.length;j++){try{props[j].selected=false;}catch(ignore){}}} layer.selected=true; rectangle.selected=true; }
    function capture(serialized) { var result=eval("("+serialized+")"); need(result&&result.ok&&result.code==="SNAPSHOT_CAPTURED","Snapshot capture failed: "+serialized); return result; }
    function saveFrame(comp,path) { var output=new File(path), refreshed, attempts=0; if(output.exists){output.remove();} comp.time=0; comp.saveFrameToPng(0,output); while(attempts<10){attempts++; refreshed=new File(path); if(refreshed.exists){break;} $.sleep(100);} need(refreshed&&refreshed.exists,"PNG not created: "+path); write("PNG="+path+" ATTEMPTS="+attempts+" SIZE="+refreshed.length); }
    function run(def) {
        var comp=app.project.items.addComp("CF_Phase514D_"+def.id,1920,1080,1,2,24), layer=comp.layers.addShape(), rectangle,effect,captureResult;
        comp.openInViewer(); layer.name="Phase514D_"+def.id; rectangle=buildFixture(layer,def); layer.transform.anchorPoint.setValue([960,540]); layer.transform.position.setValue([960,540]); layer.transform.scale.setValue([100,100]); effect=need(layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex"),"CornerFlex unavailable"); effect.property("Link Trim").setValue(1); effect.property("Trim").setValue(0); selectRectangle(comp,layer,rectangle); captureResult=capture($.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot());
        write("CASE="+def.id+" DEPTH="+def.depth+" CAPTURE="+captureResult.code+" PATH_DEPTH="+captureResult.data.pathDepth+" EXPECTED_SOURCE=Layer Bounds"); saveFrame(comp,ROOT.fsName+"/Case"+def.id+".png");
        selectRectangle(comp,layer,rectangle); need(String($.global.CornerFlexGeometryProvider.disableRectangleSnapshot()).indexOf("SNAPSHOT_DISABLED")>=0,"Unable to disable snapshot"); saveFrame(comp,ROOT.fsName+"/Case"+def.id+"_LayerBoundsReference.png"); write("CASE="+def.id+" OPERATIONAL_PASS=true");
    }
    try { if(!ROOT.exists){need(ROOT.create(),"Unable to create output folder");} REPORT.encoding="UTF-8"; need(REPORT.open("w"),"Unable to create report"); REPORT.write("PHASE 5.14D-II FALLBACK GATE I/J\n"); REPORT.close(); need(PROVIDER.exists,"Provider not found"); $.evalFile(PROVIDER); need($.global.CornerFlexGeometryProvider,"Provider did not load"); for(var i=0;i<cases.length;i++){run(cases[i]);} write("STATUS=READY_FOR_RGBA_COMPARISON"); alert("PHASE 5.14D-II FALLBACK GATE I/J COMPLETE\nReporte:\n"+REPORT.fsName); } catch(error) { try{write("STATUS=FAIL_OPERATIONAL");write("ERROR="+error.toString());}catch(reportError){} alert("PHASE 5.14D-II FALLBACK GATE FAILED\nReporte:\n"+REPORT.fsName); }
}());
