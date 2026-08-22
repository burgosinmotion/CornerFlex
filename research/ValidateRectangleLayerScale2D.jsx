/*
	CornerFlex Phase 5.11B.1 positive static Layer Scale validation.

	Reuses the proven Phase 5.10 scene/provider harness in memory while keeping
	the historical script and outputs unchanged.
*/

(function validateRectangleLayerScale2D() {
	var sourceFile = new File(
		new File($.fileName).parent.fsName +
			"/ValidateRectangleLayerTranslation.jsx");

	if (!sourceFile.open("r")) {
		throw new Error("Unable to open the Phase 5.10 validation harness.");
	}

	var source = sourceFile.read();
	sourceFile.close();

	var caseDefinitions = [
		'{id:"A",name:"Scale 100 percent",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[0,0],scale:[100,100],rotation:0,trim:10}',
		'{id:"B",name:"Uniform Scale 150 percent",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[0,0],scale:[150,150],rotation:0,trim:10}',
		'{id:"C",name:"Uniform Scale 50 percent",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[0,0],scale:[50,50],rotation:0,trim:10}',
		'{id:"D",name:"Non-uniform Scale 150 by 75",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[0,0],scale:[150,75],rotation:0,trim:10}',
		'{id:"E",name:"Non-uniform Scale 75 by 150",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[0,0],scale:[75,150],rotation:0,trim:10}',
		'{id:"F",name:"Decimal Scale",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[0,0],scale:[123.5,87.25],rotation:0,trim:10}',
		'{id:"I",name:"Anchor plus Scale",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[100,50],positionOffset:[0,0],scale:[150,150],rotation:0,trim:10}',
		'{id:"J",name:"Layer Position plus Scale",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[240,160],scale:[150,150],rotation:0,trim:10}',
		'{id:"K",name:"Rectangle Position plus Scale",comp:[1920,1080],size:[500,500],rectPosition:[200,100],anchor:[0,0],positionOffset:[0,0],scale:[150,150],rotation:0,trim:10}',
		'{id:"L",name:"Combined non-uniform transform",comp:[1920,1080],size:[500,500],rectPosition:[200,100],anchor:[100,50],positionOffset:[240,160],scale:[150,75],rotation:0,trim:10}',
		'{id:"M",name:"Trim zero",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[0,0],scale:[150,150],rotation:0,trim:0}',
		'{id:"N",name:"Trim ten",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[0,0],scale:[150,150],rotation:0,trim:10}',
		'{id:"O",name:"Trim fifty",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[0,0],scale:[150,150],rotation:0,trim:50}',
		'{id:"P",name:"Return to Layer Bounds",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[0,0],scale:[150,150],rotation:0,trim:10}',
		'{id:"Q",name:"Rotation plus Scale fallback",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[0,0],scale:[150,150],rotation:20,trim:10}',
		'{id:"R",name:"Parent plus Scale fallback",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[0,0],scale:[150,150],rotation:0,trim:10,parented:true}',
		'{id:"S",name:"3D plus Scale fallback",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[0,0],scale:[150,150],rotation:0,trim:10,threeD:true}',
		'{id:"T",name:"Zero Scale fallback",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[0,0],scale:[0,100],rotation:0,trim:10}',
		'{id:"U",name:"Negative Scale fallback",comp:[1920,1080],size:[500,500],rectPosition:[0,0],anchor:[0,0],positionOffset:[0,0],scale:[-100,100],rotation:0,trim:10}'
	];
	var requestedCaseIds =
		$.global.CF_SCALE_CASE_IDS || "";
	var outputPrefix =
		$.global.CF_SCALE_OUTPUT_PREFIX || "RectangleLayerScale2D";
	var selectedCaseDefinitions = [];
	var caseIndex;

	for (caseIndex = 0;
		caseIndex < caseDefinitions.length;
		caseIndex++) {

		if (!requestedCaseIds ||
			requestedCaseIds.indexOf(
				caseDefinitions[caseIndex].substring(5, 6)) >= 0) {

			selectedCaseDefinitions.push(
				caseDefinitions[caseIndex]);
		}
	}

	var casesSource =
		selectedCaseDefinitions.join(",\n\t\t");

	var casesStart = source.indexOf("\tvar CASES = [");
	var casesEnd = source.indexOf("\n\t];", casesStart);

	if (casesStart < 0 || casesEnd < 0) {
		throw new Error("Unable to locate the Phase 5.10 case matrix.");
	}

	source = source.substring(0, casesStart) +
		"\tvar CASES = [\n\t\t" + casesSource + "\n\t];" +
		source.substring(casesEnd + 4);

	source = source.replace(
		"RectangleLayerTranslationReport.txt",
		outputPrefix + "Report.txt");
	source = source.replace(
		"RectangleLayerTranslationFrames",
		outputPrefix + "Frames");
	source = source.replace(
		"CornerFlex Phase 5.10 layer-translation validation.",
		"CornerFlex Phase 5.11B.1 positive static Layer Scale validation.");
	source = source.replace(
		'appendLine("Trim: linked " + TRIM_PERCENT + "%");',
		'appendLine("Trim: linked, configured per case");');
	source = source.replace(
		"function configureTrim(effect) {",
		"function configureTrim(effect, trimPercent) {");
	source = source.replace(
		"trim.setValue(TRIM_PERCENT);",
		"trim.setValue(trimPercent);");
	source = source.replace(
		"configureTrim(effect);",
		"configureTrim(effect, caseDefinition.trim);");
	source = source.replace(
		"requireProperty(transform, MATCH.SCALE).setValue([100, 100]);",
		"requireProperty(transform, MATCH.SCALE).setValue(caseDefinition.scale);");
	source = source.replace(
		"requireProperty(transform, MATCH.ROTATION).setValue(0);",
		"requireProperty(transform, MATCH.ROTATION).setValue(caseDefinition.rotation);");
	source = source.replace(
		"requireProperty(transform, MATCH.OPACITY).setValue(100);",
		"requireProperty(transform, MATCH.OPACITY).setValue(100);\n" +
			"\t\tif (caseDefinition.parented) {\n" +
			"\t\t\tlayer.parent = comp.layers.addNull();\n" +
			"\t\t}\n" +
			"\t\tif (caseDefinition.threeD) {\n" +
			"\t\t\tlayer.threeDLayer = true;\n" +
			"\t\t}");
	source = source.replace(
		"var anchor = caseDefinition.anchor;",
		"var anchor = caseDefinition.anchor;\n\t\tvar scale = caseDefinition.scale;");
	source = source.replace(
		"anchor[0]",
		"anchor[0] * scale[0] / 100");
	source = source.replace(
		"anchor[1]",
		"anchor[1] * scale[1] / 100");
	source = source.replace(
		"localBounds.left + inputOrigin[0] + translation[0]",
		"localBounds.left * scale[0] / 100 + inputOrigin[0] + translation[0]");
	source = source.replace(
		"localBounds.top + inputOrigin[1] + translation[1]",
		"localBounds.top * scale[1] / 100 + inputOrigin[1] + translation[1]");
	source = source.replace(
		"localBounds.right + inputOrigin[0] + translation[0]",
		"localBounds.right * scale[0] / 100 + inputOrigin[0] + translation[0]");
	source = source.replace(
		"localBounds.bottom + inputOrigin[1] + translation[1]",
		"localBounds.bottom * scale[1] / 100 + inputOrigin[1] + translation[1]");
	source = source.replace(
		"size[0] * TRIM_PERCENT / 100",
		"size[0] * scale[0] / 100 * caseDefinition.trim / 100");
	source = source.replace(
		"size[1] * TRIM_PERCENT / 100",
		"size[1] * scale[1] / 100 * caseDefinition.trim / 100");
	source = source.replace(
		'appendLine("  Layer Position: " + formatPoint(scene.layerPosition));',
		'appendLine("  Layer Position: " + formatPoint(scene.layerPosition));\n' +
			'\t\tappendLine("  Layer Scale: " + formatPoint(caseDefinition.scale));\n' +
			'\t\tappendLine("  Layer Rotation: " + formatNumber(caseDefinition.rotation));\n' +
			'\t\tappendLine("  Trim: " + formatNumber(caseDefinition.trim) + " percent");');

	eval(source);
})();
