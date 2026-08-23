/*
	CornerFlex Phase 5.12C static Layer Rotation 2D validation.

	Uses the installed CornerFlex.aex and production CEP provider. Each case
	builds one opaque full-frame shape plus one selected Rectangle Path on the
	same layer so AABB-only rendering leaves detectable pixels outside the
	oriented primitive.
*/

(function validateRectangleLayerRotation2DStatic() {
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
	var REPORT_NAME = "Phase512CValidationReport.txt";
	var FRAMES_FOLDER_NAME = "Phase512CValidationFrames";
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
		{id:"A", name:"Rotation 0", rotation:0, trim:10},
		{id:"B", name:"Rotation 15", rotation:15, trim:10},
		{id:"C", name:"Rotation 30", rotation:30, trim:10},
		{id:"D", name:"Rotation 45", rotation:45, trim:10},
		{id:"E", name:"Rotation 90", rotation:90, trim:10},
		{id:"F", name:"Rotation -45", rotation:-45, trim:10},
		{id:"G", name:"Rotation 180", rotation:180, trim:10},
		{id:"H", name:"Rotation 360", rotation:360, trim:10},
		{id:"I", name:"Rotation plus Scale 150x150", rotation:30, scale:[150,150], trim:10},
		{id:"J", name:"Rotation plus Scale 150x75", rotation:30, scale:[150,75], trim:10},
		{id:"K", name:"Rotation plus Anchor", rotation:30, anchor:[100,50], trim:10},
		{id:"L", name:"Rotation plus Layer Position", rotation:30, positionOffset:[240,160], trim:10},
		{id:"M", name:"Rotation plus Rectangle Position", rotation:30, rectPosition:[200,100], trim:10},
		{id:"N", name:"Rotation plus Anchor Position Scale", rotation:30, anchor:[100,50], positionOffset:[240,160], rectPosition:[200,100], scale:[150,75], trim:10},
		{id:"O", name:"Rotation 30 Trim 0", rotation:30, trim:0},
		{id:"P", name:"Rotation 30 Trim 10", rotation:30, trim:10},
		{id:"Q", name:"Rotation 30 Trim Left only", rotation:30, trimLeft:10, trimTop:0, trimRight:0, trimBottom:0},
		{id:"R", name:"Rotation 45 Trim non-uniform", rotation:45, trimLeft:5, trimTop:15, trimRight:20, trimBottom:10},
		{id:"RA", name:"Regression Scale 150x150", rotation:0, scale:[150,150], trim:10},
		{id:"RB", name:"Regression Scale 150x75", rotation:0, scale:[150,75], trim:10},
		{id:"RC", name:"Regression Anchor", rotation:0, scale:[150,150], anchor:[100,50], trim:10},
		{id:"RD", name:"Regression Layer Position", rotation:0, scale:[150,150], positionOffset:[240,160], trim:10},
		{id:"RE", name:"Regression Rectangle Position", rotation:0, scale:[150,150], rectPosition:[200,100], trim:10},
		{id:"RF", name:"Regression Scale animated T1", rotation:0, scaleMode:"keyframes", scale0:[100,100], scale:[150,150], trim:10},
		{id:"RG", name:"Regression Scale expression T1", rotation:0, scaleMode:"expression", expression:"[100 + time * 50, 100 + time * 50]", trim:10},
		{id:"RH", name:"Regression Return to Layer Bounds", rotation:0, scale:[150,150], trim:10, returnOnly:true}
	];
	var report = [];
	var temporaryComps = [];
	var scriptPassed = true;

	function appendLine(message) {
		var line = String(message);
		report.push(line);
		$.writeln(line);
	}

	function requireCondition(condition, message) {
		if (!condition) { throw new Error(message); }
	}

	function errorMessage(error) {
		var message = error && error.message ? String(error.message) : String(error);
		if (error && error.line) { message += " | line=" + String(error.line); }
		return message;
	}

	function formatNumber(value) {
		return Number(value).toFixed(4);
	}

	function formatPoint(point) {
		return "[" + formatNumber(point[0]) + ", " + formatNumber(point[1]) + "]";
	}

	function outputFolder() {
		var scriptFile = new File($.fileName);
		var folder = new Folder(scriptFile.parent.fsName + "/output");
		requireCondition(folder.exists || folder.create(), "Unable to create research output folder.");
		return folder;
	}

	function framesFolder() {
		var folder = new Folder(outputFolder().fsName + "/" + FRAMES_FOLDER_NAME);
		requireCondition(folder.exists || folder.create(), "Unable to create rotation frames folder.");
		return folder;
	}

	function writeReport() {
		var file = new File(outputFolder().fsName + "/" + REPORT_NAME);
		file.encoding = "UTF-8";
		requireCondition(file.open("w"), "Unable to open static Rotation report.");
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
		caseDefinition.sampleTime = caseDefinition.sampleTime === undefined ? 1 : caseDefinition.sampleTime;
		return caseDefinition;
	}

	function clearSelection(comp) {
		var layerIndex;
		var propertyIndex;
		var layer;
		var selectedProperties;
		for (layerIndex = 1; layerIndex <= comp.numLayers; layerIndex++) {
			layer = comp.layer(layerIndex);
			selectedProperties = layer.selectedProperties;
			for (propertyIndex = 0; propertyIndex < selectedProperties.length; propertyIndex++) {
				try { selectedProperties[propertyIndex].selected = false; } catch (selectionError) {}
			}
			layer.selected = false;
		}
	}

	function createScene(caseDefinition) {
		var project = app.project || app.newProject();
		var comp = project.items.addComp("CF Static Rotation " + caseDefinition.id, caseDefinition.comp[0], caseDefinition.comp[1], 1, 2, 30);
		var layer = comp.layers.addShape();
		var contents = requireProperty(layer, MATCH.ROOT_CONTENTS);
		var backgroundRectangle = contents.addProperty(MATCH.RECTANGLE);
		var fill;
		var targetRectangle;
		var targetIndex;
		var transform;
		var scaleProperty;
		var effects;
		var effect;
		var layerPosition = [caseDefinition.comp[0] * 0.5 + caseDefinition.positionOffset[0], caseDefinition.comp[1] * 0.5 + caseDefinition.positionOffset[1]];

		temporaryComps.push(comp);
		comp.time = 0;
		layer.name = "CF Static Rotation Shape " + caseDefinition.id;

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
			scaleProperty.setValueAtTime(0, caseDefinition.scale0);
			scaleProperty.setValueAtTime(1, caseDefinition.scale);
		} else if (caseDefinition.scaleMode === "expression") {
			scaleProperty.expression = caseDefinition.expression;
		} else {
			scaleProperty.setValue(caseDefinition.scale);
		}
		requireProperty(transform, MATCH.ROTATION).setValue(caseDefinition.rotation);
		requireProperty(transform, MATCH.OPACITY).setValue(100);

		effects = requireProperty(layer, MATCH.EFFECTS);
		effect = effects.addProperty(EFFECT_MATCH_NAME);
		requireCondition(effect && effect.matchName === EFFECT_MATCH_NAME, "CornerFlex could not be applied.");
		configureTrim(effect, caseDefinition);
		comp.openInViewer();

		return { comp: comp, layer: layer, rectangle: targetRectangle, effect: effect, transform: transform, scaleProperty: scaleProperty, layerPosition: layerPosition };
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

	function scaleAt(scene, time) {
		var value = scene.scaleProperty.valueAtTime(time, false);
		return [Number(value[0]), Number(value[1])];
	}

	function runCase(caseDefinition) {
		var scene;
		var captureResult;
		var disableResult;
		var evaluatedScale;
		caseDefinition = normalizedCase(caseDefinition);
		scene = createScene(caseDefinition);
		scene.comp.time = caseDefinition.sampleTime;
		evaluatedScale = scaleAt(scene, caseDefinition.sampleTime);

		appendLine("CASE " + caseDefinition.id + " - " + caseDefinition.name);
		appendLine("  Rectangle Size: " + formatPoint(caseDefinition.size));
		appendLine("  Rectangle Position: " + formatPoint(caseDefinition.rectPosition));
		appendLine("  Layer Anchor: " + formatPoint(caseDefinition.anchor));
		appendLine("  Layer Position: " + formatPoint(scene.layerPosition));
		appendLine("  Layer Scale: " + formatPoint(evaluatedScale));
		appendLine("  Layer Rotation: " + formatNumber(caseDefinition.rotation));

		selectRectangle(scene);
		captureResult = parseProviderResult($.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot());
		requireCondition(captureResult.ok && captureResult.code === "SNAPSHOT_CAPTURED", "Provider capture failed: " + captureResult.code);
		captureFrame(scene, caseDefinition.id + "_RectangleSource");

		disableResult = parseProviderResult($.global.CornerFlexGeometryProvider.disableRectangleSnapshot());
		requireCondition(disableResult.ok && disableResult.code === "SNAPSHOT_DISABLED", "Provider disable failed: " + disableResult.code);
		captureFrame(scene, caseDefinition.id + "_LayerBounds");
		captureFrame(scene, caseDefinition.id + "_Fallback");

		appendLine("  Provider capture/disable: PASS");
		appendLine("");
		writeReport();
	}

	function cleanup() {
		var index;
		for (index = temporaryComps.length - 1; index >= 0; index--) {
			try { temporaryComps[index].remove(); }
			catch (cleanupError) {
				appendLine("WARNING: temporary comp cleanup failed: " + errorMessage(cleanupError));
				scriptPassed = false;
			}
		}
		temporaryComps = [];
	}

	var caseIndex;
	var reportFile;
	appendLine("CornerFlex Phase 5.12C Static Layer Rotation 2D Validation");
	appendLine("After Effects version: " + app.version);
	appendLine("Operating system: " + $.os);
	appendLine("Provider: " + PROVIDER_FILE.fsName);
	appendLine("Flow: Rectangle local primitive -> Trim primitive-space -> Layer Transform 2D -> Oriented Render Geometry -> AABB containment -> Pixel Renderer");
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
	}
	catch (reportError) {
		$.writeln("Unable to write static Rotation report: " + errorMessage(reportError));
	}
})();
