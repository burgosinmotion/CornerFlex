/*
	CornerFlex Phase 5.12D animated/expression Layer Rotation 2D validation.

	Uses the installed CornerFlex.aex and production CEP provider. Cases render an
	opaque full-frame shape behind the selected Rectangle Path so AABB-only pixels
	inside containment but outside the oriented primitive are detectable.
*/

(function validateRectangleLayerRotation2DAnimated() {
	function resolveProviderFile() {
		var projectRoot = new File($.fileName).parent;
		var parentIndex;
		for (parentIndex = 0; parentIndex < 5; parentIndex++) {
			projectRoot = projectRoot.parent;
		}
		return new File(projectRoot.fsName + "/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx");
	}

	var EFFECT_MATCH_NAME = "BurgosInMotion CornerFlex";
	var PROVIDER_FILE = resolveProviderFile();
	var REPORT_NAME = "Phase512DValidationReport.txt";
	var FRAMES_FOLDER_NAME = "Phase512DValidationFrames";
	var MATCH = {
		ROOT_CONTENTS: "ADBE Root Vectors Group",
		RECTANGLE: "ADBE Vector Shape - Rect",
		RECTANGLE_SIZE: "ADBE Vector Rect Size",
		RECTANGLE_POSITION: "ADBE Vector Rect Position",
		RECTANGLE_ROUNDNESS: "ADBE Vector Rect Roundness",
		SHAPE_DIRECTION: "ADBE Vector Shape Direction",
		FILL: "ADBE Vector Graphic - Fill",
		FILL_COLOR: "ADBE Vector Fill Color",
		FILL_OPACITY: "ADBE Vector Fill Opacity",
		EFFECTS: "ADBE Effect Parade",
		LAYER_TRANSFORM: "ADBE Transform Group",
		ANCHOR_POINT: "ADBE Anchor Point",
		POSITION: "ADBE Position",
		SCALE: "ADBE Scale",
		ROTATION: "ADBE Rotate Z",
		OPACITY: "ADBE Opacity"
	};
	var CASES = [
		{id:"A", name:"Animated Rotation 0 to 90", rotationMode:"keyframes", rotation0:0, rotation1:90, sampleTimes:[0,0.5,1], trim:10},
		{id:"B", name:"Animated Negative Rotation", rotationMode:"keyframes", rotation0:0, rotation1:-45, sampleTimes:[0,0.5,1], trim:10},
		{id:"C", name:"Animated Rotation 0 to 180", rotationMode:"keyframes", rotation0:0, rotation1:180, sampleTimes:[0,0.25,0.5,0.75,1], trim:10},
		{id:"D", name:"Animated Rotation 0 to 360", rotationMode:"keyframes", rotation0:0, rotation1:360, sampleTimes:[0,0.25,0.5,0.75,1], trim:10},
		{id:"E", name:"Expression Rotation time * 90", rotationMode:"expression", rotationExpression:"time * 90", sampleTimes:[0,0.5,1], trim:10},
		{id:"F", name:"Expression Negative Rotation -time * 90", rotationMode:"expression", rotationExpression:"-time * 90", sampleTimes:[0,0.5,1], trim:10},
		{id:"G", name:"Animated Rotation plus Animated Scale", rotationMode:"keyframes", rotation0:0, rotation1:45, scaleMode:"keyframes", scale0:[100,100], scale1:[150,150], sampleTimes:[0,0.5,1], trim:10},
		{id:"H", name:"Animated Rotation plus Animated Non-uniform Scale", rotationMode:"keyframes", rotation0:0, rotation1:45, scaleMode:"keyframes", scale0:[100,100], scale1:[150,75], sampleTimes:[0,0.5,1], trim:10},
		{id:"I", name:"Animated Rotation plus Anchor", rotationMode:"keyframes", rotation0:0, rotation1:45, anchor:[100,50], sampleTimes:[0,0.5,1], trim:10},
		{id:"J", name:"Animated Rotation plus Layer Position", rotationMode:"keyframes", rotation0:0, rotation1:45, positionOffset:[240,160], sampleTimes:[0,0.5,1], trim:10},
		{id:"K", name:"Animated Rotation plus Rectangle Position", rotationMode:"keyframes", rotation0:0, rotation1:45, rectPosition:[200,100], sampleTimes:[0,0.5,1], trim:10},
		{id:"L", name:"Animated Full Combination", rotationMode:"keyframes", rotation0:0, rotation1:45, scaleMode:"keyframes", scale0:[100,100], scale1:[150,75], anchor:[100,50], positionOffset:[240,160], rectPosition:[200,100], sampleTimes:[0,0.5,1], trim:10},
		{id:"M", name:"Animated Rotation plus Trim 10", rotationMode:"keyframes", rotation0:0, rotation1:45, sampleTimes:[0,0.5,1], trim:10},
		{id:"N", name:"Animated Rotation plus Trim Left only", rotationMode:"keyframes", rotation0:0, rotation1:45, sampleTimes:[0,0.5,1], trimLeft:10, trimTop:0, trimRight:0, trimBottom:0},
		{id:"O", name:"Animated Rotation plus Non-uniform Trim", rotationMode:"keyframes", rotation0:0, rotation1:45, sampleTimes:[0,0.5,1], trimLeft:5, trimTop:15, trimRight:20, trimBottom:10},
		{id:"P", name:"Animated Rotation plus Parent fallback", rotationMode:"keyframes", rotation0:0, rotation1:45, sampleTimes:[1], parented:true, fallback:true},
		{id:"Q", name:"Animated Rotation plus 3D fallback", rotationMode:"keyframes", rotation0:0, rotation1:45, sampleTimes:[1], make3D:true, fallback:true},
		{id:"R", name:"Animated Rotation plus Scale Zero fallback", rotationMode:"keyframes", rotation0:0, rotation1:45, scaleMode:"keyframes", scale0:[100,100], scale1:[0,100], sampleTimes:[1], fallback:true},
		{id:"S", name:"Animated Rotation plus Negative Scale fallback", rotationMode:"keyframes", rotation0:0, rotation1:45, scaleMode:"keyframes", scale0:[100,100], scale1:[-100,100], sampleTimes:[1], fallback:true},
		{id:"T", name:"Equivalence 0 to 360", rotationMode:"keyframes", rotation0:0, rotation1:360, sampleTimes:[0,1], trim:10},
		{id:"U", name:"Equivalence -360", rotationMode:"static", rotation:-360, sampleTimes:[1], trim:10},
		{id:"V", name:"Equivalence 720", rotationMode:"static", rotation:720, sampleTimes:[1], trim:10},
		{id:"RS1", name:"Static regression Rotation 15", rotationMode:"static", rotation:15, sampleTimes:[1], trim:10},
		{id:"RS2", name:"Static regression Rotation 45", rotationMode:"static", rotation:45, sampleTimes:[1], trim:10},
		{id:"RS3", name:"Static regression Rotation -45", rotationMode:"static", rotation:-45, sampleTimes:[1], trim:10},
		{id:"RS4", name:"Static regression Rotation plus Scale", rotationMode:"static", rotation:30, scale:[150,150], sampleTimes:[1], trim:10},
		{id:"RS5", name:"Static regression Return to Layer Bounds", rotationMode:"static", rotation:30, sampleTimes:[1], trim:10, returnOnly:true},
		{id:"RS6", name:"Static regression Scale animated", rotationMode:"static", rotation:0, scaleMode:"keyframes", scale0:[100,100], scale1:[150,150], sampleTimes:[1], trim:10},
		{id:"RS7", name:"Static regression Scale expression", rotationMode:"static", rotation:0, scaleMode:"expression", scaleExpression:"[100 + time * 50, 100 + time * 50]", sampleTimes:[1], trim:10}
	];
	var report = [];
	var temporaryComps = [];
	var scriptPassed = true;

	function appendLine(message) {
		var line = String(message);
		report.push(line);
		$.writeln(line);
	}
	function requireCondition(condition, message) { if (!condition) { throw new Error(message); } }
	function errorMessage(error) {
		var message = error && error.message ? String(error.message) : String(error);
		if (error && error.line) { message += " | line=" + String(error.line); }
		return message;
	}
	function formatNumber(value) { return Number(value).toFixed(4); }
	function formatPoint(point) { return "[" + formatNumber(point[0]) + ", " + formatNumber(point[1]) + "]"; }
	function outputFolder() {
		var scriptFile = new File($.fileName);
		var folder = new Folder(scriptFile.parent.fsName + "/output");
		requireCondition(folder.exists || folder.create(), "Unable to create research output folder.");
		return folder;
	}
	function framesFolder() {
		var folder = new Folder(outputFolder().fsName + "/" + FRAMES_FOLDER_NAME);
		requireCondition(folder.exists || folder.create(), "Unable to create animated rotation frames folder.");
		return folder;
	}
	function writeReport() {
		var file = new File(outputFolder().fsName + "/" + REPORT_NAME);
		file.encoding = "UTF-8";
		requireCondition(file.open("w"), "Unable to open Phase 5.12D report.");
		file.write(report.join("\n"));
		file.write("\n");
		file.close();
		return file;
	}
	function parseProviderResult(serializedResult) {
		var result;
		requireCondition(typeof serializedResult === "string", "Geometry Provider did not return a string.");
		result = eval("(" + serializedResult + ")");
		requireCondition(result && typeof result.ok === "boolean" && typeof result.code === "string", "Geometry Provider returned an invalid JSON contract.");
		return result;
	}
	function requireProperty(group, matchName) {
		var property = group.property(matchName);
		requireCondition(property !== null, "Missing property: " + matchName);
		return property;
	}
	function findEffectParameter(effect, name) {
		var direct = effect.property(name);
		var index;
		var candidate;
		if (direct) { return direct; }
		for (index = 1; index <= effect.numProperties; index++) {
			candidate = effect.property(index);
			if (candidate && candidate.name === name) { return candidate; }
		}
		return null;
	}
	function setParameter(effect, name, value) {
		var parameter = findEffectParameter(effect, name);
		requireCondition(parameter !== null, "Unable to access parameter: " + name);
		parameter.setValue(value);
	}
	function configureTrim(effect, caseDefinition) {
		var trimValue = caseDefinition.trim === undefined ? 10 : caseDefinition.trim;
		if (caseDefinition.trimLeft !== undefined) {
			setParameter(effect, "Link Trim", 0);
			setParameter(effect, "Trim Left", caseDefinition.trimLeft);
			setParameter(effect, "Trim Top", caseDefinition.trimTop);
			setParameter(effect, "Trim Right", caseDefinition.trimRight);
			setParameter(effect, "Trim Bottom", caseDefinition.trimBottom);
		} else {
			setParameter(effect, "Link Trim", 1);
			setParameter(effect, "Trim", trimValue);
		}
	}
	function normalizedCase(caseDefinition) {
		caseDefinition.comp = caseDefinition.comp || [1920, 1080];
		caseDefinition.size = caseDefinition.size || [400, 200];
		caseDefinition.rectPosition = caseDefinition.rectPosition || [0, 0];
		caseDefinition.anchor = caseDefinition.anchor || [0, 0];
		caseDefinition.positionOffset = caseDefinition.positionOffset || [0, 0];
		caseDefinition.scale = caseDefinition.scale || [100, 100];
		caseDefinition.rotation = caseDefinition.rotation || 0;
		return caseDefinition;
	}
	function clearSelection(comp) {
		var layerIndex, propertyIndex, layer, selectedProperties;
		for (layerIndex = 1; layerIndex <= comp.numLayers; layerIndex++) {
			layer = comp.layer(layerIndex);
			selectedProperties = layer.selectedProperties;
			for (propertyIndex = 0; propertyIndex < selectedProperties.length; propertyIndex++) {
				try { selectedProperties[propertyIndex].selected = false; } catch (selectionError) {}
			}
			layer.selected = false;
		}
	}
	function setLinearKeyframes(property, value0, value1) {
		property.setValueAtTime(0, value0);
		property.setValueAtTime(1, value1);
		try {
			property.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
			property.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
		} catch (interpError) {}
	}
	function createScene(caseDefinition) {
		var project = app.project || app.newProject();
		var comp = project.items.addComp("CF Animated Rotation " + caseDefinition.id, caseDefinition.comp[0], caseDefinition.comp[1], 1, 2, 4);
		var layer = comp.layers.addShape();
		var parentLayer = null;
		var contents = requireProperty(layer, MATCH.ROOT_CONTENTS);
		var backgroundRectangle = contents.addProperty(MATCH.RECTANGLE);
		var targetRectangle, targetIndex, fill, transform, rotationProperty, scaleProperty, effects, effect;
		var layerPosition = [caseDefinition.comp[0] * 0.5 + caseDefinition.positionOffset[0], caseDefinition.comp[1] * 0.5 + caseDefinition.positionOffset[1]];
		temporaryComps.push(comp);
		comp.time = 0;
		layer.name = "CF Animated Rotation Shape " + caseDefinition.id;

		requireProperty(backgroundRectangle, MATCH.RECTANGLE_SIZE).setValue([caseDefinition.comp[0] * 1.4, caseDefinition.comp[1] * 1.4]);
		requireProperty(backgroundRectangle, MATCH.RECTANGLE_POSITION).setValue([0, 0]);
		requireProperty(backgroundRectangle, MATCH.RECTANGLE_ROUNDNESS).setValue(0);
		requireProperty(backgroundRectangle, MATCH.SHAPE_DIRECTION).setValue(1);

		targetRectangle = contents.addProperty(MATCH.RECTANGLE);
		targetIndex = targetRectangle.propertyIndex;
		requireProperty(targetRectangle, MATCH.RECTANGLE_SIZE).setValue(caseDefinition.size);
		requireProperty(targetRectangle, MATCH.RECTANGLE_POSITION).setValue(caseDefinition.rectPosition);
		requireProperty(targetRectangle, MATCH.RECTANGLE_ROUNDNESS).setValue(0);
		requireProperty(targetRectangle, MATCH.SHAPE_DIRECTION).setValue(1);

		fill = contents.addProperty(MATCH.FILL);
		requireProperty(fill, MATCH.FILL_COLOR).setValue([1, 1, 1, 1]);
		requireProperty(fill, MATCH.FILL_OPACITY).setValue(100);
		targetRectangle = contents.property(targetIndex);

		transform = requireProperty(layer, MATCH.LAYER_TRANSFORM);
		requireProperty(transform, MATCH.ANCHOR_POINT).setValue(caseDefinition.anchor);
		requireProperty(transform, MATCH.POSITION).setValue(layerPosition);
		scaleProperty = requireProperty(transform, MATCH.SCALE);
		if (caseDefinition.scaleMode === "keyframes") {
			setLinearKeyframes(scaleProperty, caseDefinition.scale0, caseDefinition.scale1);
		} else if (caseDefinition.scaleMode === "expression") {
			scaleProperty.expression = caseDefinition.scaleExpression;
		} else {
			scaleProperty.setValue(caseDefinition.scale);
		}
		rotationProperty = requireProperty(transform, MATCH.ROTATION);
		if (caseDefinition.rotationMode === "keyframes") {
			setLinearKeyframes(rotationProperty, caseDefinition.rotation0, caseDefinition.rotation1);
		} else if (caseDefinition.rotationMode === "expression") {
			rotationProperty.expression = caseDefinition.rotationExpression;
		} else {
			rotationProperty.setValue(caseDefinition.rotation);
		}
		requireProperty(transform, MATCH.OPACITY).setValue(100);
		if (caseDefinition.make3D) { layer.threeDLayer = true; }
		if (caseDefinition.parented) {
			parentLayer = comp.layers.addNull();
			parentLayer.name = "CF Parent " + caseDefinition.id;
			layer.parent = parentLayer;
			temporaryComps.push(parentLayer);
		}

		effects = requireProperty(layer, MATCH.EFFECTS);
		effect = effects.addProperty(EFFECT_MATCH_NAME);
		requireCondition(effect && effect.matchName === EFFECT_MATCH_NAME, "CornerFlex could not be applied.");
		configureTrim(effect, caseDefinition);
		comp.openInViewer();
		return {comp:comp, layer:layer, rectangle:targetRectangle, effect:effect, rotationProperty:rotationProperty, scaleProperty:scaleProperty, layerPosition:layerPosition};
	}
	function selectRectangle(scene) {
		clearSelection(scene.comp);
		scene.layer.selected = true;
		scene.rectangle.selected = true;
	}
	function captureFrame(scene, fileName) {
		var file = new File(framesFolder().fsName + "/" + fileName + ".png");
		var attempts = 0;
		if (file.exists) { file.remove(); }
		scene.comp.saveFrameToPng(scene.comp.time, file);
		while (!file.exists && attempts < 150) {
			$.sleep(100);
			attempts++;
		}
		requireCondition(file.exists, "After Effects did not create frame: " + file.fsName);
		return file;
	}
	function frameLabel(time) { return "T" + String(time).replace(".", "p"); }
	function runCase(caseDefinition) {
		var scene, captureResult, disableResult, timeIndex, time, rotation, scale, stem;
		caseDefinition = normalizedCase(caseDefinition);
		scene = createScene(caseDefinition);
		appendLine("CASE " + caseDefinition.id + " - " + caseDefinition.name);
		selectRectangle(scene);
		captureResult = parseProviderResult($.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot());
		requireCondition(captureResult.ok && captureResult.code === "SNAPSHOT_CAPTURED", "Provider capture failed: " + captureResult.code);
		for (timeIndex = 0; timeIndex < caseDefinition.sampleTimes.length; timeIndex++) {
			time = caseDefinition.sampleTimes[timeIndex];
			scene.comp.time = time;
			rotation = Number(scene.rotationProperty.valueAtTime(time, false));
			scale = scene.scaleProperty.valueAtTime(time, false);
			stem = caseDefinition.id + "_" + frameLabel(time);
			appendLine("  FRAME " + stem);
			appendLine("    compTime: " + formatNumber(time));
			appendLine("    Evaluated Rotation: " + formatNumber(rotation));
			appendLine("    Evaluated Scale: " + formatPoint([Number(scale[0]), Number(scale[1])]));
			appendLine("    Anchor: " + formatPoint(caseDefinition.anchor));
			appendLine("    Layer Position: " + formatPoint(scene.layerPosition));
			appendLine("    Rectangle Position: " + formatPoint(caseDefinition.rectPosition));
			appendLine("    Expected source: " + (caseDefinition.fallback ? "Layer Bounds fallback" : "Rectangle Source"));
			captureFrame(scene, stem + "_RectangleSource");
		}
		disableResult = parseProviderResult($.global.CornerFlexGeometryProvider.disableRectangleSnapshot());
		requireCondition(disableResult.ok && disableResult.code === "SNAPSHOT_DISABLED", "Provider disable failed: " + disableResult.code);
		for (timeIndex = 0; timeIndex < caseDefinition.sampleTimes.length; timeIndex++) {
			time = caseDefinition.sampleTimes[timeIndex];
			scene.comp.time = time;
			stem = caseDefinition.id + "_" + frameLabel(time);
			captureFrame(scene, stem + "_LayerBounds");
			captureFrame(scene, stem + "_Fallback");
		}
		appendLine("  Provider capture/disable: PASS");
		appendLine("");
		writeReport();
	}
	function cleanup() {
		var index;
		for (index = temporaryComps.length - 1; index >= 0; index--) {
			try { if (temporaryComps[index].remove) { temporaryComps[index].remove(); } }
			catch (cleanupError) {
				appendLine("WARNING: temporary cleanup failed: " + errorMessage(cleanupError));
				scriptPassed = false;
			}
		}
		temporaryComps = [];
	}

	var caseIndex, reportFile;
	appendLine("CornerFlex Phase 5.12D Animated/Expression Layer Rotation 2D Validation");
	appendLine("After Effects version: " + app.version);
	appendLine("Operating system: " + $.os);
	appendLine("Provider: " + PROVIDER_FILE.fsName);
	appendLine("Temporal flow: effect current_time -> compTime -> post-expression Rotation/Scale -> affine -> oriented renderer");
	appendLine("");
	writeReport();
	try {
		requireCondition(PROVIDER_FILE.exists, "Production CEP Geometry Provider was not found.");
		$.evalFile(PROVIDER_FILE);
		requireCondition($.global.CornerFlexGeometryProvider, "Production CEP Geometry Provider was not loaded.");
		for (caseIndex = 0; caseIndex < CASES.length; caseIndex++) {
			appendLine("BEGIN CASE " + CASES[caseIndex].id);
			writeReport();
			runCase(CASES[caseIndex]);
			appendLine("END CASE " + CASES[caseIndex].id);
			writeReport();
		}
	}
	catch (error) {
		appendLine("ERROR: " + errorMessage(error));
		scriptPassed = false;
	}
	cleanup();
	appendLine("TEMPORARY COMPOSITIONS REMOVED: " + (temporaryComps.length === 0 ? "YES" : "NO"));
	appendLine("SCRIPT RESULT: " + (scriptPassed ? "PASS" : "FAIL"));
	appendLine("Pixel analysis: pending external RGBA validation.");
	try {
		reportFile = writeReport();
		$.writeln("Report: " + reportFile.fsName);
	} catch (reportError) {
		$.writeln("Unable to write Phase 5.12D report: " + errorMessage(reportError));
	}
})();
