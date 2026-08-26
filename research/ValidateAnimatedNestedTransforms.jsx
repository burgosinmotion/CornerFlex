/* Phase 5.15A-I: autonomous animated nested transform validation preparation. */
(function () {
    var ROOT = new Folder(new File($.fileName).parent.fsName + "/output/Phase515AAnimatedNestedTransforms");
    var REPORT = new File(ROOT.fsName + "/AnimatedNestedTransformsReport.txt");
    var PROVIDER = new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx");
    var TIMES = [0, 0.5, 1];
    var RUN_ONLY_CASE_A = false;
    var failedCase = "";
    var checkpointIndex = 0;
    var cases = [
        {id:"A", name:"Inner Position animated", inner:{pos:[[0,0],[80,-40],[160,20]]}},
        {id:"B", name:"Outer Position animated", outer:{pos:[[0,0],[-80,40],[-160,20]]}},
        {id:"C", name:"Inner Rotation animated", inner:{rot:[0,25,50]}},
        {id:"D", name:"Outer Rotation animated", outer:{rot:[0,-20,-40]}},
        {id:"E", name:"Inner Scale animated", inner:{scale:[[100,100],[125,85],[150,70]]}},
        {id:"F", name:"Outer Scale animated", outer:{scale:[[100,100],[90,120],[80,140]]}},
        {id:"G", name:"Inner Anchor animated", inner:{anchor:[[0,0],[40,20],[80,40]]}},
        {id:"H", name:"Outer Anchor animated", outer:{anchor:[[0,0],[-30,25],[-60,50]]}},
        {id:"I", name:"Inner and Outer animated", inner:{pos:[[0,0],[60,-30],[120,0]],rot:[0,15,30]}, outer:{pos:[[0,0],[-40,20],[-80,40]],rot:[0,-10,-20]}},
        {id:"J", name:"Nested plus Layer animated", inner:{pos:[[0,0],[40,-20],[80,0]],scale:[[100,100],[120,90],[140,80]]}, outer:{rot:[0,20,40]}, layer:{pos:[[960,540],[1040,500],[1120,460]],rot:[0,10,20],scale:[[100,100],[110,95],[120,90]]}},
        {id:"K", name:"Inner deterministic expression", expressionInner:"[time*60, -time*30]"},
        {id:"L", name:"Inner and Outer deterministic expressions", expressionInner:"[time*50, 0]", expressionOuter:"[0, -time*40]"}
    ];
    function need(value, message) { if (!value) { throw new Error(message); } return value; }
    function write(line) { need(REPORT.open("a"), "Unable to open report"); REPORT.write(String(line) + "\n"); REPORT.close(); }
    function checkpoint(message) { checkpointIndex++; write("CASE_A_CHECKPOINT_" + (checkpointIndex < 10 ? "0" : "") + checkpointIndex + "=" + message); }
    function clearOwnOutput() { if (!ROOT.exists) { need(ROOT.create(), "Unable to create output folder"); } var files=ROOT.getFiles(), i; for(i=0;i<files.length;i++){try{files[i].remove();}catch(ignore){}} }
    function setProp(group, match, value) { var p=need(group.property(match), "Missing property: "+match); p.setValue(value); return p; }
    function animate(prop, values, label) {
        if (!values) { return; }
        var i, before, after;
        for(i=0;i<TIMES.length;i++){
            try { prop.setValueAtTime(TIMES[i], values[i]); }
            catch (error) { throw error; }
        }
    }
    function setTransform(group, data) {
        var t=need(group.property("ADBE Vector Transform Group"),"Missing group transform");
        setProp(t,"ADBE Vector Anchor",[0,0]); setProp(t,"ADBE Vector Position",[0,0]); setProp(t,"ADBE Vector Scale",[100,100]); setProp(t,"ADBE Vector Rotation",0);
        if(data){
            var positionProperty = need(t.property("ADBE Vector Position"),"Missing position");
            animate(positionProperty,data.pos,group.name === "Phase515A Inner" ? "Inner Position" : "Position");
            animate(need(t.property("ADBE Vector Anchor"),"Missing anchor"),data.anchor,"Anchor");
            animate(need(t.property("ADBE Vector Scale"),"Missing scale"),data.scale,"Scale");
            animate(need(t.property("ADBE Vector Rotation"),"Missing rotation"),data.rot,"Rotation");
            if(data.expression){ need(t.property("ADBE Vector Position"),"Missing expression target").expression=data.expression; }
        }
    }
    function addGroup(contents,name,data){var g=need(contents.addProperty("ADBE Vector Group"),"Unable to add group");g.name=name;setTransform(g,data||{});return g;}
    function addRectangle(contents){var r=need(contents.addProperty("ADBE Vector Shape - Rect"),"Unable to add rectangle");r.name="Phase515A Rectangle";setProp(r,"ADBE Vector Rect Size",[500,300]);if(failedCase === "A"){checkpoint("RECTANGLE_SIZE_ASSIGNED");}setProp(r,"ADBE Vector Rect Position",[0,0]);if(failedCase === "A"){checkpoint("RECTANGLE_POSITION_ASSIGNED");}var f=contents.addProperty("ADBE Vector Graphic - Fill");setProp(f,"ADBE Vector Fill Color",[1,0.15,0.03]);setProp(f,"ADBE Vector Fill Opacity",100);var freshRect=need(contents.property("ADBE Vector Shape - Rect"),"Unable to reacquire rectangle");if(failedCase === "A"){checkpoint("RECTANGLE_REACQUIRED=TRUE matchName="+freshRect.matchName+" name="+freshRect.name+" propertyIndex="+freshRect.propertyIndex);}return freshRect;}
    function hierarchy(layer,def){
        var c=need(layer.property("ADBE Root Vectors Group"),"Missing root contents");
        var outer=addGroup(c,"Phase515A Outer",def.outer||{});
        c=need(outer.property("ADBE Vectors Group"),"Missing outer contents");
        var inner=addGroup(c,"Phase515A Inner",def.inner||{});
        c=need(inner.property("ADBE Vectors Group"),"Missing inner contents");
        var rectangle=addRectangle(c);
        return {rectangle:rectangle,inner:inner,outer:outer};
    }
    function clearSelection(comp){var i,j,p;for(i=1;i<=comp.numLayers;i++){comp.layer(i).selected=false;p=comp.layer(i).selectedProperties;for(j=0;j<p.length;j++){try{p[j].selected=false;}catch(ignore){}}}}
    function capture(comp,layer,rect){clearSelection(comp);need(rect&&rect.matchName==="ADBE Vector Shape - Rect","Rectangle reference invalid before selection");layer.selected=true;rect.selected=true;need($.global.CornerFlexGeometryProvider&&$.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot,"Provider unavailable");var raw=$.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot();var result=eval("("+raw+")");need(result&&result.ok===true&&result.code==="SNAPSHOT_CAPTURED","Snapshot capture failed: "+raw);return result;}
    function configureEffect(layer){var fx=need(layer.property("ADBE Effect Parade").addProperty("BurgosInMotion CornerFlex"),"CornerFlex unavailable");var link=need(fx.property("Link Trim"),"Link Trim unavailable"),trim=need(fx.property("Trim"),"Trim unavailable");link.setValue(1);trim.setValue(0);return fx;}
    function applyLayerAnimation(layer,data){if(!data){return;}animate(layer.transform.position,data.pos);animate(layer.transform.rotation,data.rot);animate(layer.transform.scale,data.scale);animate(layer.transform.anchorPoint,data.anchor);}
    function renderFrame(comp,id,time){var path=ROOT.fsName+"/Case"+id+"_T"+String(time).replace(".","p")+".png",f=new File(path),fresh,attempts=0;if(f.exists){f.remove();}comp.time=time;comp.saveFrameToPng(time,f);while(attempts<20){attempts++;fresh=new File(path);if(fresh.exists){break;}$.sleep(100);}write("CASE_"+id+"_TIME="+time+" OUTPUT="+path+" PNG_CHECK_ATTEMPTS="+attempts+" PNG_EXISTS="+(fresh&&fresh.exists)+" PNG_SIZE="+(fresh&&fresh.exists?fresh.length:0));need(fresh&&fresh.exists,"PNG not created: "+path);return fresh;}
    function runCase(def){var comp,layer,h,fx,captureResult,i;failedCase=def.id;checkpointIndex=0;comp=app.project.items.addComp("CF_Phase515A_"+def.id,1920,1080,1,2,24);layer=comp.layers.addShape();comp.openInViewer();layer.name="Phase515A_"+def.id;layer.transform.anchorPoint.setValue([960,540]);layer.transform.position.setValue([960,540]);layer.transform.scale.setValue([100,100]);h=hierarchy(layer,def);applyLayerAnimation(layer,def.layer);if(def.expressionInner){need(h.inner.property("ADBE Vector Transform Group").property("ADBE Vector Position"),"Missing inner position").expression=def.expressionInner;}if(def.expressionOuter){need(h.outer.property("ADBE Vector Transform Group").property("ADBE Vector Position"),"Missing outer position").expression=def.expressionOuter;}fx=configureEffect(layer);captureResult=capture(comp,layer,h.rectangle);write("CASE_"+def.id+"_CONFIG="+def.name+" EXPECTED_SOURCE=Rectangle Source FALLBACK=false");write("CASE_"+def.id+"_CAPTURE="+captureResult.code+" layerId="+captureResult.data.layerId+" pathDepth="+captureResult.data.pathDepth);for(i=0;i<TIMES.length;i++){write("CASE_"+def.id+"_VALUES_TIME="+TIMES[i]+" INNER="+JSON.stringify(def.inner||{})+" OUTER="+JSON.stringify(def.outer||{})+" LAYER="+JSON.stringify(def.layer||{}));renderFrame(comp,def.id,TIMES[i]);}write("CASE_"+def.id+"_OPERATIONAL_PASS=true");}
    try{clearOwnOutput();need(PROVIDER.exists,"Provider not found: "+PROVIDER.fsName);$.evalFile(PROVIDER);need($.global.CornerFlexGeometryProvider,"Provider did not load");REPORT.encoding="UTF-8";need(REPORT.open("w"),"Unable to create report");REPORT.write("PHASE 5.15A-I ANIMATED NESTED TRANSFORM VALIDATION\nSTOP_ON_FIRST_FAILURE=true\nCASE_COUNT="+(RUN_ONLY_CASE_A?1:12)+"\nRUN_ONLY_CASE_A="+RUN_ONLY_CASE_A+"\nTIMES=T0,T0.5,T1\nTRIM=0\nEXPECTED_SOURCE=RECTANGLE_SOURCE\nMODE=AUTONOMOUS_MANUAL_EXECUTION\n");REPORT.close();var i;for(i=0;i<cases.length;i++){if(RUN_ONLY_CASE_A && cases[i].id!=="A"){continue;}runCase(cases[i]);}write("STATUS=PASS_OPERATIONAL_ONLY");alert("PHASE 5.15A-I PREPARED\nReporte:\n"+REPORT.fsName);}catch(error){try{write("STATUS=FAIL_OPERATIONAL\nFAILED_CASE="+(failedCase||"UNKNOWN")+"\nERROR="+error.toString());}catch(reportError){}alert("PHASE 5.15A-I PREPARATION FAILED AT CASE "+(failedCase||"UNKNOWN")+"\nReporte:\n"+REPORT.fsName);}
}());
