/*
	CornerFlex Phase 5.10 layer-translation validation.

	Creates controlled 2D Shape Layers, captures Layer Bounds, Rectangle Source,
	and fallback frames, and removes all temporary compositions.
*/

(function validateRectangleLayerTranslation() {

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
	var REPORT_NAME = "RectangleLayerTranslationReport.txt";
	var FRAMES_FOLDER_NAME = "RectangleLayerTranslationFrames";
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
	var CASES = [
		{
			id: "A",
			name: "Default Anchor and Position",
			comp: [1920, 1080],
			size: [500, 500],
			rectPosition: [0, 0],
			anchor: [0, 0],
			positionOffset: [0, 0]
		},
		{
			id: "B",
			name: "Positive Anchor",
			comp: [1920, 1080],
			size: [500, 500],
			rectPosition: [0, 0],
			anchor: [100, 50],
			positionOffset: [0, 0]
		},
		{
			id: "C",
			name: "Negative Anchor",
			comp: [1920, 1080],
			size: [500, 500],
			rectPosition: [0, 0],
			anchor: [-100, -50],
			positionOffset: [0, 0]
		},
		{
			id: "D",
			name: "Positive Layer Position offset",
			comp: [1920, 1080],
			size: [500, 500],
			rectPosition: [0, 0],
			anchor: [0, 0],
			positionOffset: [200, 100]
		},
		{
			id: "E",
			name: "Negative Layer Position offset",
			comp: [1920, 1080],
			size: [500, 500],
			rectPosition: [0, 0],
			anchor: [0, 0],
			positionOffset: [-200, -100]
		},
		{
			id: "F",
			name: "Combined Anchor and Position",
			comp: [1920, 1080],
			size: [500, 500],
			rectPosition: [0, 0],
			anchor: [100, 50],
			positionOffset: [200, 100]
		},
		{
			id: "G",
			name: "Layer Position equals comp center",
			comp: [1920, 1080],
			size: [500, 500],
			rectPosition: [0, 0],
			anchor: [0, 0],
			positionOffset: [0, 0]
		},
		{
			id: "H",
			name: "Layer Position outside comp center",
			comp: [1920, 1080],
			size: [500, 500],
			rectPosition: [0, 0],
			anchor: [0, 0],
			positionOffset: [240, 160]
		},
		{
			id: "I",
			name: "Different composition dimensions",
			comp: [1280, 720],
			size: [420, 260],
			rectPosition: [0, 0],
			anchor: [20, 10],
			positionOffset: [100, -50]
		},
		{
			id: "J",
			name: "Rectangle Position plus layer translation",
			comp: [1920, 1080],
			size: [500, 360],
			rectPosition: [175, -85],
			anchor: [60, -35],
			positionOffset: [140, 90]
		},
		{
			id: "RA",
			name: "Phase 5.9 A regression",
			comp: [1920, 1080],
			size: [500, 500],
			rectPosition: [0, 0],
			anchor: [0, 0],
			positionOffset: [0, 0]
		},
		{
			id: "RB",
			name: "Phase 5.9 B regression",
			comp: [1920, 1080],
			size: [500, 500],
			rectPosition: [200, 100],
			anchor: [0, 0],
			positionOffset: [0, 0]
		},
		{
			id: "RC",
			name: "Phase 5.9 C regression",
			comp: [1920, 1080],
			size: [500, 500],
			rectPosition: [-200, -100],
			anchor: [0, 0],
			positionOffset: [0, 0]
		},
		{
			id: "RD",
			name: "Phase 5.9 D regression",
			comp: [1920, 1080],
			size: [1920, 1080],
			rectPosition: [0, 0],
			anchor: [0, 0],
			positionOffset: [0, 0],
			roundness: 0
		},
		{
			id: "RE",
			name: "Phase 5.9 E regression",
			comp: [1920, 1080],
			size: [501.5, 499.25],
			rectPosition: [10.25, -20.75],
			anchor: [0, 0],
			positionOffset: [0, 0],
			roundness: 31.5
		},
		{
			id: "RF",
			name: "Phase 5.9 F regression",
			comp: [1920, 1080],
			size: [500, 500],
			rectPosition: [0, 0],
			anchor: [0, 0],
			positionOffset: [0, 0]
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

	function formatRect(rect) {
		return "[" +
			formatNumber(rect.left) +
			", " +
			formatNumber(rect.top) +
			", " +
			formatNumber(rect.right) +
			", " +
			formatNumber(rect.bottom) +
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
			"Unable to create translation frames folder.");
		return folder;
	}

	function writeReport() {
		var file = new File(
			outputFolder().fsName + "/" + REPORT_NAME);
		file.encoding = "UTF-8";
		requireCondition(file.open("w"), "Unable to open translation report.");
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

	function createScene(caseDefinition) {
		var project = app.project || app.newProject();
		var comp = project.items.addComp(
			"CF Layer Translation " + caseDefinition.id,
			caseDefinition.comp[0],
			caseDefinition.comp[1],
			1,
			1,
			30);
		var layer = comp.layers.addShape();
		var contents = requireProperty(layer, MATCH.ROOT_CONTENTS);
		var rectangle = contents.addProperty(MATCH.RECTANGLE);
		var rectangleIndex = rectangle.propertyIndex;
		var fill;
		var transform;
		var effects;
		var effect;
		var layerPosition = [
			caseDefinition.comp[0] * 0.5 +
				caseDefinition.positionOffset[0],
			caseDefinition.comp[1] * 0.5 +
				caseDefinition.positionOffset[1]
		];

		temporaryComps.push(comp);
		comp.time = 0;
		layer.name = "CF Translation Shape " + caseDefinition.id;

		requireProperty(rectangle, MATCH.RECTANGLE_SIZE)
			.setValue(caseDefinition.size);
		requireProperty(rectangle, MATCH.RECTANGLE_POSITION)
			.setValue(caseDefinition.rectPosition);
		requireProperty(rectangle, MATCH.RECTANGLE_ROUNDNESS)
			.setValue(
				caseDefinition.roundness === undefined
					? 97
					: caseDefinition.roundness);
		requireProperty(rectangle, MATCH.SHAPE_DIRECTION).setValue(1);

		fill = contents.addProperty(MATCH.FILL);
		requireProperty(fill, MATCH.FILL_COLOR).setValue([1, 1, 1, 1]);
		requireProperty(fill, MATCH.FILL_OPACITY).setValue(100);
		rectangle = contents.property(rectangleIndex);

		transform = requireProperty(layer, MATCH.LAYER_TRANSFORM);
		requireProperty(transform, MATCH.ANCHOR_POINT)
			.setValue(caseDefinition.anchor);
		requireProperty(transform, MATCH.POSITION).setValue(layerPosition);
		requireProperty(transform, MATCH.SCALE).setValue([100, 100]);
		requireProperty(transform, MATCH.ROTATION).setValue(0);
		requireProperty(transform, MATCH.OPACITY).setValue(100);

		effects = requireProperty(layer, MATCH.EFFECTS);
		effect = effects.addProperty(EFFECT_MATCH_NAME);
		requireCondition(
			effect && effect.matchName === EFFECT_MATCH_NAME,
			"CornerFlex could not be applied.");
		configureTrim(effect);
		comp.openInViewer();

		return {
			comp: comp,
			layer: layer,
			rectangle: rectangle,
			effect: effect,
			transform: transform,
			layerPosition: layerPosition
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

	function calculateGeometry(caseDefinition, scene) {
		var size = caseDefinition.size;
		var rectanglePosition = caseDefinition.rectPosition;
		var anchor = caseDefinition.anchor;
		var layerPosition = scene.layerPosition;
		var inputOrigin = [
			caseDefinition.comp[0] * 0.5,
			caseDefinition.comp[1] * 0.5
		];
		var translation = [
			layerPosition[0] -
				caseDefinition.comp[0] * 0.5 -
				anchor[0],
			layerPosition[1] -
				caseDefinition.comp[1] * 0.5 -
				anchor[1]
		];
		var localBounds = {
			left: rectanglePosition[0] - size[0] * 0.5,
			top: rectanglePosition[1] - size[1] * 0.5,
			right: rectanglePosition[0] + size[0] * 0.5,
			bottom: rectanglePosition[1] + size[1] * 0.5
		};
		var effectBounds = {
			left: localBounds.left + inputOrigin[0] + translation[0],
			top: localBounds.top + inputOrigin[1] + translation[1],
			right: localBounds.right + inputOrigin[0] + translation[0],
			bottom: localBounds.bottom + inputOrigin[1] + translation[1]
		};
		var trimX = size[0] * TRIM_PERCENT / 100;
		var trimY = size[1] * TRIM_PERCENT / 100;
		var finalBounds = {
			left: effectBounds.left + trimX,
			top: effectBounds.top + trimY,
			right: effectBounds.right - trimX,
			bottom: effectBounds.bottom - trimY
		};

		return {
			inputOrigin: inputOrigin,
			translation: translation,
			localBounds: localBounds,
			effectBounds: effectBounds,
			finalBounds: finalBounds
		};
	}

	function runCase(caseDefinition) {
		var scene = createScene(caseDefinition);
		var geometry = calculateGeometry(caseDefinition, scene);
		var sourceRect = scene.layer.sourceRectAtTime(0, false);
		var captureResult;
		var disableResult;

		appendLine("CASE " + caseDefinition.id + " — " + caseDefinition.name);
		appendLine(
			"  Composition: " +
				caseDefinition.comp[0] + " x " + caseDefinition.comp[1]);
		appendLine(
			"  Input buffer contract: " +
				caseDefinition.comp[0] + " x " + caseDefinition.comp[1]);
		appendLine("  Rectangle Size: " + formatPoint(caseDefinition.size));
		appendLine(
			"  Rectangle Position: " +
				formatPoint(caseDefinition.rectPosition));
		appendLine("  Layer Anchor: " + formatPoint(caseDefinition.anchor));
		appendLine("  Layer Position: " + formatPoint(scene.layerPosition));
		appendLine(
			"  sourceRectAtTime: [" +
				formatNumber(sourceRect.left) + ", " +
				formatNumber(sourceRect.top) + ", " +
				formatNumber(sourceRect.left + sourceRect.width) + ", " +
				formatNumber(sourceRect.top + sourceRect.height) + "]");
		appendLine(
			"  Snapshot local bounds: " +
				formatRect(geometry.localBounds));
		appendLine(
			"  Layer translation: " +
				formatPoint(geometry.translation));
		appendLine(
			"  Calculated geometryBounds before Trim: " +
				formatRect(geometry.effectBounds));
		appendLine(
			"  Expected bbox after Trim: " +
				formatRect(geometry.finalBounds));

		captureFrame(scene, caseDefinition.id + "_LayerBounds");

		selectRectangle(scene);
		captureResult = parseProviderResult(
			$.global.CornerFlexGeometryProvider
				.captureSelectedRectangleSnapshot());
		requireCondition(
			captureResult.ok &&
				captureResult.code === "SNAPSHOT_CAPTURED",
			"Provider capture failed: " + captureResult.code);

		captureFrame(scene, caseDefinition.id + "_RectangleSource");

		disableResult = parseProviderResult(
			$.global.CornerFlexGeometryProvider
				.disableRectangleSnapshot());
		requireCondition(
			disableResult.ok &&
				disableResult.code === "SNAPSHOT_DISABLED",
			"Provider disable failed: " + disableResult.code);

		captureFrame(scene, caseDefinition.id + "_Fallback");
		appendLine("  Provider capture/disable: PASS");
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

	appendLine("CornerFlex Rectangle Layer Translation Validation");
	appendLine("After Effects version: " + app.version);
	appendLine("Operating system: " + $.os);
	appendLine("Trim: linked " + TRIM_PERCENT + "%");
	appendLine("Provider: " + PROVIDER_FILE.fsName);
	appendLine(
		"Formula: effect = local + input/2 + position - comp/2 - anchor");
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
			"Unable to write translation report: " +
				errorMessage(reportError));
	}

})();
