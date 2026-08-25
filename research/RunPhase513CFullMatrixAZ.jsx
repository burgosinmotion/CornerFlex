(function () {
    // Phase 5.13C A-Z harness. This file is prepared only; it is not executed by Codex.
    var output = new Folder("E:/Files/Proyectos/CornerFlexDev/AfterEffectsSDK2025/Examples/Template/Skeleton/research/output/Phase513CFullMatrixAZ");
    var report = new File(output.fsName + "/Phase513CFullMatrixAZReport.txt");
    var providerFile = new File("E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx");
    var cases = [
        ["A","basic rectangle source","Rectangle Source",false,"300x180","0,0","identity","identity","100,100","0","none","2D","Trim 0","exact source"],
        ["B","rectangle position","Rectangle Source",false,"300x180","-250,-120","identity","identity","100,100","0","none","2D","Trim 0","affine position"],
        ["C","uniform scale","Rectangle Source",false,"300x180","-250,-120","identity","identity","150,150","0","none","2D","Trim 0","affine scale"],
        ["D","rotation positive","Rectangle Source",false,"300x180","-250,-120","identity","identity","100,100","45","none","2D","Trim 0","oriented membership"],
        ["E","rotation negative","Rectangle Source",false,"300x180","-250,-120","identity","identity","100,100","-45","none","2D","Trim 0","oriented membership"],
        ["F","non-uniform scale plus rotation","Rectangle Source",false,"300x180","-250,-120","identity","identity","150,75","45","none","2D","Trim 0","oriented membership"],
        ["G","anchor plus affine transform","Rectangle Source",false,"300x180","-250,-120","100,50","identity","100,100","45","none","2D","Trim 0","pivot preserved"],
        ["H","layer position plus rotation","Rectangle Source",false,"300x180","-250,-120","identity","1200,700","100,100","45","none","2D","Trim 0","translation preserved"],
        ["I","rectangle position plus rotation","Rectangle Source",false,"300x180","220,140","identity","identity","100,100","45","none","2D","Trim 0","local order"],
        ["J","animated scale","Rectangle Source",false,"300x180","-250,-120","identity","identity","100->150","0","none","2D","Trim 0","T0/T0.5/T1"],
        ["K","animated rotation","Rectangle Source",false,"300x180","-250,-120","identity","identity","100,100","0->45","none","2D","Trim 0","T0/T0.5/T1"],
        ["L","expression scale","Rectangle Source",false,"300x180","-250,-120","identity","identity","expression","0","none","2D","Trim 0","post-expression"],
        ["M","trim zero","Rectangle Source",false,"300x180","-250,-120","identity","identity","100,100","0","none","2D","Trim 0","RGBA oracle"],
        ["N","trim uniform","Rectangle Source",false,"300x180","-250,-120","identity","identity","100,100","0","none","2D","Trim 10","trim then affine"],
        ["O","trim independent sides","Rectangle Source",false,"300x180","-250,-120","identity","identity","100,100","0","none","2D","Left 10 Top 20 Right 30 Bottom 40","local sides"],
        ["P","layer bounds equality","Layer Bounds",true,"input","input","n/a","n/a","n/a","n/a","none","2D","Trim 0","RGBA exact"],
        ["Q","parenting unsupported","Layer Bounds",true,"input","input","n/a","n/a","n/a","n/a","parent","2D","Trim 0","safe fallback"],
        ["R","3D unsupported","Layer Bounds",true,"input","input","n/a","n/a","n/a","n/a","none","3D","Trim 0","safe fallback"],
        ["S","unsupported transform","Layer Bounds",true,"input","input","n/a","n/a","n/a","n/a","none","2D","Trim 0","safe fallback"],
        ["T","scale zero","Layer Bounds",true,"input","input","n/a","n/a","0,0","0","none","2D","Trim 0","safe fallback"],
        ["U","negative scale","Layer Bounds",true,"input","input","n/a","n/a","-100,100","0","none","2D","Trim 0","safe fallback"],
        ["V","two groups target A","Rectangle Source",false,"300x180","Group A","identity","identity","100,100","0","none","2D","Trim 0","deterministic target"],
        ["W","two groups target B","Rectangle Source",false,"640x360","Group B","identity","identity","100,100","0","none","2D","no contamination"],
        ["X","inside membership","Rectangle Source",false,"300x180","-250,-120","identity","identity","100,100","45","none","2D","Trim 0","inside=true"],
        ["Y","AABB-only rejection","Rectangle Source",false,"300x180","-250,-120","identity","identity","100,100","45","none","2D","Trim 0","inside=false"],
        ["Z","combined regression","Rectangle Source + Layer Bounds",true,"reference","reference","reference","reference","reference","reference","none","2D","Trim 0/10","all prior contracts"]
    ];
    function write(s) { report.open("a"); report.write(String(s) + "\n"); report.close(); }
    function header() {
        write("PHASE 5.13C FULL MATRIX A-Z");
        write("MODE=MANUAL_SEQUENTIAL_STOP_ON_FIRST_FAIL");
        write("EXPECTED_SOURCE_AND_ORACLE_MUST_BE_RECORDED_BEFORE_RENDER");
        write("CASE|DESCRIPTION|EXPECTED_SOURCE|EXPECTED_FALLBACK|SIZE|RECT_POS|ANCHOR|GROUP_POS|GROUP_SCALE|GROUP_ROT|PARENT|3D|TRIM|EXPECTED_AABB|EXPECTED_MEMBERSHIP|EXPECTED_RGBA|PASS_CRITERIA");
        for (var i=0; i<cases.length; i++) {
            var c = cases[i];
            var expectedMembership = (c[0] === "X") ? "inside=true" : ((c[0] === "Y") ? "inside=false,aabb=true" : "center=true");
            var expectedRGBA = (c[0] === "P" || c[0] === "Z") ? "reference_equal_required" : "not_applicable";
            var pass = c[3] ? "source=Layer Bounds;fallback=true;no_crash;no_invalid_geometry" : "source=Rectangle Source;fallback=false;oracle_bbox_delta<=1;membership_match";
            write(c.join("|") + "|independent_affine_or_trim_oracle|" + expectedMembership + "|" + expectedRGBA + "|" + pass);
        }
    }
    if (!output.exists) { output.create(); }
    if (report.exists) { report.remove(); }
    header();
    write("STOP_RULE=stop immediately on first operational or oracle failure");
    write("STATUS=PREPARED_NOT_EXECUTED");
    // Execution intentionally requires an explicit manual launch after precheck.
}());
