/*
	CornerFlex Phase 5.11B.2 animated/expression Layer Scale validation.

	Uses the installed CornerFlex.aex and production CEP provider. Creates controlled
	shape layers, captures Layer Bounds, Rectangle Source and fallback frames at
	T0/T0.5/T1, then removes temporary compositions.
*/

(function validateRectangleLayerScale2DAnimated() {

	function resolveProviderFile() {
		var projectRoot = new File($.fileName).parent;
		var parentIndex;

		for (parentIndex = 0; parentIndex < 5; parentIndex++) {
			projectRoot = projectRoot.parent;
		}

		return new File(
			projectRoot.fsName +
				"/CornerFlex-CEP/jsx/CornerFlexGeometryProvider.jsx");
	}

	var EFFECT_MATCH_NAME = "BurgosInMotion CornerFlex";
	var PROVIDER_FILE = resolveProviderFile();
	var REPORT_NAME = "Phase511B2ValidationReport.txt";
	var FRAMES_FOLDER_NAME = "Phase511B2ValidationFrames";
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
	var TIMES = [0, 0.5, 1];
	var CASES = [
		{id:"A",name:"Animated uniform Scale",scaleMode:"keyframes",scale0:[100,100],scale1:[150,150],sampleTimes:TIMES,trim:10},
		{id:"B",name:"Animated non-uniform Scale",scaleMode:"keyframes",scale0:[100,100],scale1:[150,75],sampleTimes:TIMES,trim:10},
		{id:"C",name:"Animated decimal Scale",scaleMode:"keyframes",scale0:[100,100],scale1:[123.5,87.25],sampleTimes:TIMES,trim:10},
		{id:"D",name:"Expression uniform Scale",scaleMode:"expression",expression:"[100 + time * 50, 100 + time * 50]",sampleTimes:TIMES,trim:10},
		{id:"E",name:"Expression non-uniform Scale",scaleMode:"expression",expression:"[100 + time * 50, 100 + time * 25]",sampleTimes:TIMES,trim:10},
		{id:"F",name:"Anchor plus animated Scale",scaleMode:"keyframes",scale0:[100,100],scale1:[150,150],anchor:[100,50],sampleTimes:TIMES,trim:10},
		{id:"G",name:"Layer Position plus animated Scale",scaleMode:"keyframes",scale0:[100,100],scale1:[150,150],positionOffset:[240,160],sampleTimes:TIMES,trim:10},
		{id:"H",name:"Rectangle Position plus animated Scale",scaleMode:"keyframes",scale0:[100,100],scale1:[150,150],rectPosition:[200,100],sampleTimes:TIMES,trim:10},
		{id:"I",name:"Animated Scale with Trim 10 percent",scaleMode:"keyframes",scale0:[100,100],scale1:[150,150],sampleTimes:TIMES,trim:10},
		{id:"J",name:"Return to Layer Bounds during animated state",scaleMode:"keyframes",scale0:[100,100],scale1:[150,150],sampleTimes:[1],trim:10},
		{id:"K",name:"Expression zero Scale fallback",scaleMode:"expression",expression:"time < 1 ? [100,100] : [0,100]",sampleTimes:TIMES,trim:10,fallbackAt:{"1":true}},
		{id:"L",name:"Expression negative Scale fallback",scaleMode:"expression",expression:"time < 1 ? [100,100] : [-100,100]",sampleTimes:TIMES,trim:10,fallbackAt:{"1":true}},
		{id:"M",name:"Animated valid Scale plus Rotation fallback",scaleMode:"keyframes",scale0:[100,100],scale1:[150,150],rotation:20,sampleTimes:TIMES,trim:10,alwaysFallback:true},
		{id:"RA",name:"Regression static uniform Scale",scaleMode:"static",scale0:[150,150],sampleTimes:[1],trim:10},
		{id:"RB",name:"Regression static non-uniform Scale",scaleMode:"static",scale0:[150,75],sampleTimes:[1],trim:10},
		{id:"RC",name:"Regression Anchor",scaleMode:"static",scale0:[150,150],anchor:[100,50],sampleTimes:[1],trim:10},
		{id:"RD",name:"Regression Layer Position",scaleMode:"static",scale0:[150,150],positionOffset:[240,160],sampleTimes:[1],trim:10},
		{id:"RE",name:"Regression Rectangle Position",scaleMode:"static",scale0:[150,150],rectPosition:[200,100],sampleTimes:[1],trim:10},
		{id:"RF",name:"Regression Rotation fallback",scaleMode:"static",scale0:[150,150],rotation:20,sampleTimes:[1],trim:10,alwaysFallback:true},
		{id:"RG",name:"Regression Return to Layer Bounds",scaleMode:"static",scale0:[150,150],sampleTimes:[1],trim:10}
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
		if (!condition) {
			throw new Error(message);
		}
	}

	function errorMessage(error) {
		var message = error && error.message ? String(error.message) : String(error);
		if (error && error.line) {
			message += " | line=" + String(error.line);
		}
		return message;
	}

	function formatNumber(value) {
		return Number(value).toFixed(4);
	}

	function formatPoint(point) {
		return "[" + formatNumber(point[0]) + ", " + formatNumber(point[1]) + "]";
	}

	function formatRect(rect) {
		return "[" + formatNumber(rect.left) + ", " + formatNumber(rect.top) + ", " + formatNumber(rect.right) + ", " + formatNumber(rect.bottom) + "]";
	}

	function requireProperty(group, matchName) {
		var property = group.property(matchName);
		requireCondition(property !== null, "Missing property: " + matchName);
		return property;
	}

	function outputFolder() {
		var scriptFile = new File($.fileName);
		var folder = new Folder(scriptFile.parent.fsName + "/output");
		requireCondition(folder.exists || folder.create(), "Unable to create research output folder.");
		return folder;
	}

	function framesFolder() {
		var folder = new Folder(outputFolder().fsName + "/" + FRAMES_FOLDER_NAME);
		requireCondition(folder.exists || folder.create(), "Unable to create animated frames folder.");
		return folder;
	}

	function writeReport() {
		var file = new File(outputFolder().fsName + "/" + REPORT_NAME);
		file.encoding = "UTF-8";
		requireCondition(file.open("w"), "Unable to open animated Scale report.");
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

	function selectRectangle(scene) {
		clearSelection(scene.comp);
		scene.layer.selected = true;
		scene.rectangle.selected = true;
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

	function configureTrim(effect, trimPercent) {
		var linkTrim = findEffectParameter(effect, "Link Trim");
		var trim = findEffectParameter(effect, "Trim");
		requireCondition(linkTrim !== null && trim !== null, "Unable to access Link Trim and Trim.");
		linkTrim.setValue(1);
		trim.setValue(trimPercent);
	}

	function normalizedCase(caseDefinition) {
		caseDefinition.comp = caseDefinition.comp || [1920, 1080];
		caseDefinition.size = caseDefinition.size || [500, 500];
		caseDefinition.rectPosition = caseDefinition.rectPosition || [0, 0];
		caseDefinition.anchor = caseDefinition.anchor || [0, 0];
		caseDefinition.positionOffset = caseDefinition.positionOffset || [0, 0];
		caseDefinition.rotation = caseDefinition.rotation || 0;
		caseDefinition.trim = caseDefinition.trim === undefined ? 10 : caseDefinition.trim;
		return caseDefinition;
	}

	function createScene(caseDefinition) {
		var project = app.project || app.newProject();
		var comp = project.items.addComp("CF Layer Scale Animated " + caseDefinition.id, caseDefinition.comp[0], caseDefinition.comp[1], 1, 2, 30);
		var layer = comp.layers.addShape();
		var contents = requireProperty(layer, MATCH.ROOT_CONTENTS);
		var rectangle = contents.addProperty(MATCH.RECTANGLE);
		var rectangleIndex = rectangle.propertyIndex;
		var fill;
		var transform;
		var scaleProperty;
		var effects;
		var effect;
		var layerPosition = [caseDefinition.comp[0] * 0.5 + caseDefinition.positionOffset[0], caseDefinition.comp[1] * 0.5 + caseDefinition.positionOffset[1]];

		temporaryComps.push(comp);
		comp.time = 0;
		layer.name = "CF Animated Scale Shape " + caseDefinition.id;
		requireProperty(rectangle, MATCH.RECTANGLE_SIZE).setValue(caseDefinition.size);
		requireProperty(rectangle, MATCH.RECTANGLE_POSITION).setValue(caseDefinition.rectPosition);
		requireProperty(rectangle, MATCH.RECTANGLE_ROUNDNESS).setValue(97);
		requireProperty(rectangle, MATCH.SHAPE_DIRECTION).setValue(1);

		fill = contents.addProperty(MATCH.FILL);
		requireProperty(fill, MATCH.FILL_COLOR).setValue([1, 1, 1, 1]);
		requireProperty(fill, MATCH.FILL_OPACITY).setValue(100);
		rectangle = contents.property(rectangleIndex);

		transform = requireProperty(layer, MATCH.LAYER_TRANSFORM);
		requireProperty(transform, MATCH.ANCHOR_POINT).setValue(caseDefinition.anchor);
		requireProperty(transform, MATCH.POSITION).setValue(layerPosition);
		scaleProperty = requireProperty(transform, MATCH.SCALE);
		if (caseDefinition.scaleMode === "keyframes") {
			scaleProperty.setValueAtTime(0, caseDefinition.scale0);
			scaleProperty.setValueAtTime(1, caseDefinition.scale1);
		} else if (caseDefinition.scaleMode === "expression") {
			scaleProperty.expression = caseDefinition.expression;
		} else {
			scaleProperty.setValue(caseDefinition.scale0 || [100, 100]);
		}
		requireProperty(transform, MATCH.ROTATION).setValue(caseDefinition.rotation);
		requireProperty(transform, MATCH.OPACITY).setValue(100);

		effects = requireProperty(layer, MATCH.EFFECTS);
		effect = effects.addProperty(EFFECT_MATCH_NAME);
		requireCondition(effect && effect.matchName === EFFECT_MATCH_NAME, "CornerFlex could not be applied.");
		configureTrim(effect, caseDefinition.trim);
		comp.openInViewer();

		return { comp: comp, layer: layer, rectangle: rectangle, effect: effect, transform: transform, scaleProperty: scaleProperty, layerPosition: layerPosition };
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

	function scaleAt(caseDefinition, scene, time) {
		var value = scene.scaleProperty.valueAtTime(time, false);
		return [Number(value[0]), Number(value[1])];
	}

	function calculateGeometry(caseDefinition, scene, time) {
		var size = caseDefinition.size;
		var rectanglePosition = caseDefinition.rectPosition;
		var anchor = caseDefinition.anchor;
		var scale = scaleAt(caseDefinition, scene, time);
		var scaleX = scale[0] / 100.0;
		var scaleY = scale[1] / 100.0;
		var layerPosition = scene.layerPosition;
		var inputOrigin = [caseDefinition.comp[0] * 0.5, caseDefinition.comp[1] * 0.5];
		var translation = [layerPosition[0] - caseDefinition.comp[0] * 0.5 - anchor[0] * scaleX, layerPosition[1] - caseDefinition.comp[1] * 0.5 - anchor[1] * scaleY];
		var localBounds = { left: rectanglePosition[0] - size[0] * 0.5, top: rectanglePosition[1] - size[1] * 0.5, right: rectanglePosition[0] + size[0] * 0.5, bottom: rectanglePosition[1] + size[1] * 0.5 };
		var effectBounds = { left: localBounds.left * scaleX + inputOrigin[0] + translation[0], top: localBounds.top * scaleY + inputOrigin[1] + translation[1], right: localBounds.right * scaleX + inputOrigin[0] + translation[0], bottom: localBounds.bottom * scaleY + inputOrigin[1] + translation[1] };
		var trimX = size[0] * scaleX * caseDefinition.trim / 100.0;
		var trimY = size[1] * scaleY * caseDefinition.trim / 100.0;
		var finalBounds = { left: effectBounds.left + trimX, top: effectBounds.top + trimY, right: effectBounds.right - trimX, bottom: effectBounds.bottom - trimY };
		return { scale: scale, inputOrigin: inputOrigin, translation: translation, localBounds: localBounds, effectBounds: effectBounds, finalBounds: finalBounds };
	}

	function frameLabel(time) {
		return "T" + String(time).replace(".", "p");
	}

	function isFallbackExpected(caseDefinition, time) {
		if (caseDefinition.alwaysFallback) { return true; }
		if (caseDefinition.fallbackAt && caseDefinition.fallbackAt[String(time)]) { return true; }
		return false;
	}

	function runCase(caseDefinition) {
		var scene;
		var timeIndex;
		var time;
		var geometry;
		var sourceRect;
		var captureResult;
		var disableResult;
		caseDefinition = normalizedCase(caseDefinition);
		scene = createScene(caseDefinition);
		appendLine("CASE " + caseDefinition.id + " - " + caseDefinition.name);
		appendLine("  Scale mode: " + caseDefinition.scaleMode);
		if (caseDefinition.expression) { appendLine("  Expression: " + caseDefinition.expression); }
		appendLine("  Rectangle Size: " + formatPoint(caseDefinition.size));
		appendLine("  Rectangle Position: " + formatPoint(caseDefinition.rectPosition));
		appendLine("  Layer Anchor: " + formatPoint(caseDefinition.anchor));
		appendLine("  Layer Position: " + formatPoint(scene.layerPosition));
		appendLine("  Layer Rotation: " + formatNumber(caseDefinition.rotation));
		appendLine("  Trim: " + formatNumber(caseDefinition.trim) + " percent");

		selectRectangle(scene);
		captureResult = parseProviderResult($.global.CornerFlexGeometryProvider.captureSelectedRectangleSnapshot());
		requireCondition(captureResult.ok && captureResult.code === "SNAPSHOT_CAPTURED", "Provider capture failed: " + captureResult.code);

		for (timeIndex = 0; timeIndex < caseDefinition.sampleTimes.length; timeIndex++) {
			time = caseDefinition.sampleTimes[timeIndex];
			scene.comp.time = time;
			geometry = calculateGeometry(caseDefinition, scene, time);
			sourceRect = scene.layer.sourceRectAtTime(time, false);
			appendLine("  FRAME " + caseDefinition.id + "_" + frameLabel(time));
			appendLine("    compTime: " + formatNumber(time));
			appendLine("    Evaluated Scale: " + formatPoint(geometry.scale));
			appendLine("    Anchor: " + formatPoint(caseDefinition.anchor));
			appendLine("    Position: " + formatPoint(scene.layerPosition));
			appendLine("    Rectangle Position: " + formatPoint(caseDefinition.rectPosition));
			appendLine("    Expected source: " + (isFallbackExpected(caseDefinition, time) ? "Layer Bounds fallback" : "Rectangle Source"));
			appendLine("    sourceRectAtTime: [" + formatNumber(sourceRect.left) + ", " + formatNumber(sourceRect.top) + ", " + formatNumber(sourceRect.left + sourceRect.width) + ", " + formatNumber(sourceRect.top + sourceRect.height) + "]");
			appendLine("    Snapshot local bounds: " + formatRect(geometry.localBounds));
			appendLine("    Layer translation: " + formatPoint(geometry.translation));
			appendLine("    Calculated geometryBounds before Trim: " + formatRect(geometry.effectBounds));
			appendLine("    Expected bbox after Trim: " + formatRect(geometry.finalBounds));
			captureFrame(scene, caseDefinition.id + "_" + frameLabel(time) + "_RectangleSource");
		}

		disableResult = parseProviderResult($.global.CornerFlexGeometryProvider.disableRectangleSnapshot());
		requireCondition(disableResult.ok && disableResult.code === "SNAPSHOT_DISABLED", "Provider disable failed: " + disableResult.code);
		for (timeIndex = 0; timeIndex < caseDefinition.sampleTimes.length; timeIndex++) {
			time = caseDefinition.sampleTimes[timeIndex];
			scene.comp.time = time;
			captureFrame(scene, caseDefinition.id + "_" + frameLabel(time) + "_LayerBounds");
			captureFrame(scene, caseDefinition.id + "_" + frameLabel(time) + "_Fallback");
		}
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
	appendLine("CornerFlex Phase 5.11B.2 Animated/Expression Layer Scale Validation");
	appendLine("After Effects version: " + app.version);
	appendLine("Operating system: " + $.os);
	appendLine("Provider: " + PROVIDER_FILE.fsName);
	appendLine("Temporal path: effect current_time -> compTime -> post-expression Scale -> normalized CF_LayerTransform2DContext -> TransformLocalBoundsWithLayerTransform2D -> Trim -> Render");
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
		$.writeln("Unable to write animated Scale report: " + errorMessage(reportError));
	}
})();