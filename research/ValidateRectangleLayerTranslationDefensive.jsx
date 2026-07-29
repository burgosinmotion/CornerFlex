/*
	CornerFlex Phase 5.10 final defensive and render-time validation.

	K, L, N, and O verify that unsupported layer transforms fall back to
	Layer Bounds. M documents the observable limitation of an After Effects
	Null Layer versus an unavailable AEGP_LayerH. T0/T1 verify post-expression
	Position at the current render time.
*/

(function validateRectangleLayerTranslationDefensive() {

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
	var REPORT_NAME = "RectangleLayerTranslationDefensiveReport.txt";
	var FRAMES_FOLDER_NAME = "RectangleLayerTranslationDefensiveFrames";
	var COMP_WIDTH = 1920;
	var COMP_HEIGHT = 1080;
	var TRIM_PERCENT = 10;
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
	var SNAPSHOT_PARAMETERS = {
		version: "Rectangle Snapshot Version",
		valid: "Rectangle Snapshot Valid",
		sizeX: "Rectangle Snapshot Size X",
		sizeY: "Rectangle Snapshot Size Y",
		positionX: "Rectangle Snapshot Position X",
		positionY: "Rectangle Snapshot Position Y",
		roundness: "Rectangle Snapshot Roundness",
		direction: "Rectangle Snapshot Direction",
		enabled: "Rectangle Snapshot Enabled"
	};
	var DEFENSIVE_CASES = [
		{
			id: "K",
			name: "3D Shape Layer",
			configure: function (scene) {
				scene.layer.threeDLayer = true;
				requireProperty(scene.transform, MATCH.ANCHOR_POINT)
					.setValue([0, 0, 0]);
				requireProperty(scene.transform, MATCH.POSITION)
					.setValue([COMP_WIDTH * 0.5, COMP_HEIGHT * 0.5, 0]);
				requireProperty(scene.transform, MATCH.SCALE)
					.setValue([100, 100, 100]);
			}
		},
		{
			id: "L",
			name: "Shape Layer with parent",
			configure: function (scene) {
				var parentLayer = scene.comp.layers.addNull();
				parentLayer.name = "CF Defensive Parent";
				scene.layer.parent = parentLayer;
			}
		},
		{
			id: "N",
			name: "Scale different from 100 percent",
			configure: function (scene) {
				requireProperty(scene.transform, MATCH.SCALE)
					.setValue([125, 80]);
			}
		},
		{
			id: "O",
			name: "Rotation different from zero",
			configure: function (scene) {
				requireProperty(scene.transform, MATCH.ROTATION)
					.setValue(20);
			}
		}
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
		var message = error && error.message
			? String(error.message)
			: String(error);

		if (error && error.line) {
			message += " | line=" + String(error.line);
		}

		return message;
	}

	function formatNumber(value) {
		return Number(value).toFixed(4);
	}

	function formatPoint(point) {
		return "[" +
			formatNumber(point[0]) +
			", " +
			formatNumber(point[1]) +
			"]";
	}

	function requireProperty(group, matchName) {
		var property = group.property(matchName);
		requireCondition(property !== null, "Missing property: " + matchName);
		return property;
	}

	function outputFolder() {
		var scriptFile = new File($.fileName);
		var folder = new Folder(scriptFile.parent.fsName + "/output");
		requireCondition(
			folder.exists || folder.create(),
			"Unable to create research output folder.");
		return folder;
	}

	function framesFolder() {
		var folder = new Folder(
			outputFolder().fsName + "/" + FRAMES_FOLDER_NAME);
		requireCondition(
			folder.exists || folder.create(),
			"Unable to create defensive frames folder.");
		return folder;
	}

	function writeReport() {
		var file = new File(
			outputFolder().fsName + "/" + REPORT_NAME);
		file.encoding = "UTF-8";
		requireCondition(file.open("w"), "Unable to open defensive report.");
		file.write(report.join("\n"));
		file.write("\n");
		file.close();
		return file;
	}

	function parseProviderResult(serializedResult) {
		var result;
		requireCondition(
			typeof serializedResult === "string",
			"Geometry Provider did not return a string.");
		result = eval("(" + serializedResult + ")");
		requireCondition(
			result &&
				typeof result.ok === "boolean" &&
				typeof result.code === "string",
			"Geometry Provider returned an invalid JSON contract.");
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

			for (propertyIndex = 0;
				propertyIndex < selectedProperties.length;
				propertyIndex++) {

				try {
					selectedProperties[propertyIndex].selected = false;
				}
				catch (selectionError) {
				}
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

		if (direct) {
			return direct;
		}

		for (index = 1; index <= effect.numProperties; index++) {
			candidate = effect.property(index);
			if (candidate && candidate.name === name) {
				return candidate;
			}
		}

		return null;
	}

	function configureTrim(effect) {
		var linkTrim = findEffectParameter(effect, "Link Trim");
		var trim = findEffectParameter(effect, "Trim");
		requireCondition(
			linkTrim !== null && trim !== null,
			"Unable to access Link Trim and Trim.");
		linkTrim.setValue(1);
		trim.setValue(TRIM_PERCENT);
	}

	function createComp(name) {
		var project = app.project || app.newProject();
		var comp = project.items.addComp(
			name,
			COMP_WIDTH,
			COMP_HEIGHT,
			1,
			2,
			30);
		temporaryComps.push(comp);
		comp.time = 0;
		return comp;
	}

	function addCornerFlex(layer) {
		var effects = requireProperty(layer, MATCH.EFFECTS);
		var effect = effects.addProperty(EFFECT_MATCH_NAME);
		requireCondition(
			effect && effect.matchName === EFFECT_MATCH_NAME,
			"CornerFlex could not be applied.");
		configureTrim(effect);
		return effect;
	}

	function createShapeScene(name) {
		var comp = createComp(name);
		var layer = comp.layers.addShape();
		var contents = requireProperty(layer, MATCH.ROOT_CONTENTS);
		var rectangle = contents.addProperty(MATCH.RECTANGLE);
		var rectangleIndex = rectangle.propertyIndex;
		var fill;
		var transform;
		var effect;

		layer.name = name + " Shape";
		requireProperty(rectangle, MATCH.RECTANGLE_SIZE)
			.setValue([500, 500]);
		requireProperty(rectangle, MATCH.RECTANGLE_POSITION)
			.setValue([0, 0]);
		requireProperty(rectangle, MATCH.RECTANGLE_ROUNDNESS)
			.setValue(97);
		requireProperty(rectangle, MATCH.SHAPE_DIRECTION).setValue(1);

		fill = contents.addProperty(MATCH.FILL);
		requireProperty(fill, MATCH.FILL_COLOR).setValue([1, 1, 1, 1]);
		requireProperty(fill, MATCH.FILL_OPACITY).setValue(100);
		rectangle = contents.property(rectangleIndex);

		transform = requireProperty(layer, MATCH.LAYER_TRANSFORM);
		requireProperty(transform, MATCH.ANCHOR_POINT).setValue([0, 0]);
		requireProperty(transform, MATCH.POSITION)
			.setValue([COMP_WIDTH * 0.5, COMP_HEIGHT * 0.5]);
		requireProperty(transform, MATCH.SCALE).setValue([100, 100]);
		requireProperty(transform, MATCH.ROTATION).setValue(0);
		requireProperty(transform, MATCH.OPACITY).setValue(100);

		effect = addCornerFlex(layer);
		comp.openInViewer();

		return {
			comp: comp,
			layer: layer,
			rectangle: rectangle,
			transform: transform,
			effect: effect
		};
	}

	function captureFrame(scene, fileName) {
		var file = new File(
			framesFolder().fsName + "/" + fileName + ".png");
		var attempts = 0;

		if (file.exists) {
			file.remove();
		}

		scene.comp.saveFrameToPng(scene.comp.time, file);

		while (!file.exists && attempts < 150) {
			$.sleep(100);
			attempts++;
		}

		requireCondition(
			file.exists,
			"After Effects did not create frame: " + file.fsName);
		return file;
	}

	function captureSnapshot(scene) {
		var result;
		selectRectangle(scene);
		result = parseProviderResult(
			$.global.CornerFlexGeometryProvider
				.captureSelectedRectangleSnapshot());
		requireCondition(
			result.ok && result.code === "SNAPSHOT_CAPTURED",
			"Provider capture failed: " + result.code);
	}

	function disableSnapshot() {
		var result = parseProviderResult(
			$.global.CornerFlexGeometryProvider
				.disableRectangleSnapshot());
		requireCondition(
			result.ok && result.code === "SNAPSHOT_DISABLED",
			"Provider disable failed: " + result.code);
	}

	function runDefensiveCase(caseDefinition) {
		var scene = createShapeScene("CF Defensive " + caseDefinition.id);
		caseDefinition.configure(scene);
		scene.comp.openInViewer();

		appendLine("CASE " + caseDefinition.id + " — " + caseDefinition.name);
		captureFrame(scene, caseDefinition.id + "_LayerBounds");
		captureSnapshot(scene);
		captureFrame(scene, caseDefinition.id + "_RectangleSource");
		disableSnapshot();
		captureFrame(scene, caseDefinition.id + "_Fallback");
		appendLine(
			"  Expected: Rectangle Source rejected; Layer Bounds fallback.");
		appendLine("  Capture completed without crash: YES");
		appendLine("");
		writeReport();
	}

	function setSnapshotParameter(effect, key, value) {
		var parameter = findEffectParameter(
			effect,
			SNAPSHOT_PARAMETERS[key]);
		requireCondition(
			parameter !== null,
			"Missing snapshot parameter: " + SNAPSHOT_PARAMETERS[key]);
		parameter.setValue(value);
	}

	function runNullLayerObservation() {
		var comp = createComp("CF Defensive M");
		var layer = comp.layers.addNull();
		var effect = addCornerFlex(layer);
		var scene = {
			comp: comp,
			layer: layer,
			effect: effect
		};

		layer.name = "CF Defensive AE Null Layer";
		comp.openInViewer();

		appendLine("CASE M — After Effects Null Layer observation");
		appendLine(
			"  AE Null Layer is a valid AEGP layer object; it cannot simulate " +
			"a null AEGP_LayerH returned by AEGP_GetEffectLayer().");

		captureFrame(scene, "M_LayerBounds");
		setSnapshotParameter(effect, "enabled", 0);
		setSnapshotParameter(effect, "valid", 0);
		setSnapshotParameter(effect, "version", 1);
		setSnapshotParameter(effect, "sizeX", 50);
		setSnapshotParameter(effect, "sizeY", 50);
		setSnapshotParameter(effect, "positionX", 0);
		setSnapshotParameter(effect, "positionY", 0);
		setSnapshotParameter(effect, "roundness", 0);
		setSnapshotParameter(effect, "direction", 1);
		setSnapshotParameter(effect, "valid", 1);
		setSnapshotParameter(effect, "enabled", 1);
		captureFrame(scene, "M_RectangleSource");
		setSnapshotParameter(effect, "enabled", 0);
		setSnapshotParameter(effect, "valid", 0);
		captureFrame(scene, "M_Fallback");
		appendLine(
			"  Observable result: no crash; transparent input makes source " +
			"selection non-observable.");
		appendLine("  Null-handle defensive branch: NOT REPRODUCIBLE via DOM.");
		appendLine("");
		writeReport();
	}

	function runPostExpressionTimeTest() {
		var scene = createShapeScene("CF Post Expression Time");
		var position = requireProperty(scene.transform, MATCH.POSITION);
		var positionAtZero;
		var positionAtOne;

		position.expression =
			"[thisComp.width / 2 + time * 120, " +
			"thisComp.height / 2 + time * 60]";
		position.expressionEnabled = true;

		appendLine("CASE T — Position expression at render time");
		appendLine("  Expression: " + position.expression);

		scene.comp.time = 0;
		positionAtZero = position.valueAtTime(0, false);
		appendLine("  T0 Position post-expression: " + formatPoint(positionAtZero));
		captureFrame(scene, "T0_LayerBounds");
		captureSnapshot(scene);
		captureFrame(scene, "T0_RectangleSource");

		scene.comp.time = 1;
		positionAtOne = position.valueAtTime(1, false);
		appendLine("  T1 Position post-expression: " + formatPoint(positionAtOne));
		captureFrame(scene, "T1_RectangleSource");
		disableSnapshot();
		captureFrame(scene, "T1_LayerBounds");
		captureFrame(scene, "T1_Fallback");
		appendLine(
			"  Expected source bboxes: T0 [760,340,1160,740], " +
			"T1 [880,400,1280,800].");
		appendLine("");
		writeReport();
	}

	function cleanup() {
		var index;

		for (index = temporaryComps.length - 1; index >= 0; index--) {
			try {
				temporaryComps[index].remove();
			}
			catch (cleanupError) {
				appendLine(
					"WARNING: temporary comp cleanup failed: " +
						errorMessage(cleanupError));
				scriptPassed = false;
			}
		}

		temporaryComps = [];
	}

	var caseIndex;
	var reportFile;

	appendLine("CornerFlex Phase 5.10 Final Defensive Validation");
	appendLine("After Effects version: " + app.version);
	appendLine("Operating system: " + $.os);
	appendLine("Trim: linked " + TRIM_PERCENT + "%");
	appendLine("Provider: " + PROVIDER_FILE.fsName);
	appendLine("");
	writeReport();

	try {
		requireCondition(
			PROVIDER_FILE.exists,
			"Production CEP Geometry Provider was not found.");
		$.evalFile(PROVIDER_FILE);
		requireCondition(
			$.global.CornerFlexGeometryProvider,
			"Production CEP Geometry Provider was not loaded.");

		for (caseIndex = 0;
			caseIndex < DEFENSIVE_CASES.length;
			caseIndex++) {

			runDefensiveCase(DEFENSIVE_CASES[caseIndex]);
		}

		runNullLayerObservation();
		runPostExpressionTimeTest();
	}
	catch (error) {
		appendLine("ERROR: " + errorMessage(error));
		scriptPassed = false;
	}

	cleanup();
	appendLine(
		"TEMPORARY COMPOSITIONS REMOVED: " +
			(temporaryComps.length === 0 ? "YES" : "NO"));
	appendLine("SCRIPT RESULT: " + (scriptPassed ? "PASS" : "FAIL"));
	appendLine("Pixel analysis: pending external RGBA validation.");

	try {
		reportFile = writeReport();
		$.writeln("Report: " + reportFile.fsName);
	}
	catch (reportError) {
		$.writeln(
			"Unable to write defensive report: " +
				errorMessage(reportError));
	}

})();
