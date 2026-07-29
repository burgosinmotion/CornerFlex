/*
	CornerFlex Phase 5.9 coordinate-space validation.

	The script creates temporary controlled Shape Layers, uses the production
	CEP Geometry Provider, captures post-effect PNGs, and removes every test
	composition before returning.
*/

(function validateRectangleSourceCoordinateSpace() {

	var EFFECT_MATCH_NAME = "BurgosInMotion CornerFlex";
	var PROVIDER_FILE =
		new File(
			"E:/Files/Proyectos/CornerFlexDev/CornerFlex-CEP/" +
			"jsx/CornerFlexGeometryProvider.jsx");
	var REPORT_NAME =
		"RectangleSourceCoordinateSpaceReport.txt";
	var FRAMES_FOLDER_NAME =
		"RectangleSourceCoordinateSpaceFrames";
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
	var CASES = [
		{
			id: "A",
			name: "Centered 500x500",
			size: [500, 500],
			position: [0, 0],
			roundness: 97
		},
		{
			id: "B",
			name: "Positive Rectangle Position",
			size: [500, 500],
			position: [200, 100],
			roundness: 97
		},
		{
			id: "C",
			name: "Negative Rectangle Position",
			size: [500, 500],
			position: [-200, -100],
			roundness: 97
		},
		{
			id: "D",
			name: "Full input dimensions",
			size: [1920, 1080],
			position: [0, 0],
			roundness: 0
		},
		{
			id: "E",
			name: "Odd fractional geometry",
			size: [501.5, 499.25],
			position: [10.25, -20.75],
			roundness: 31.5
		},
		{
			id: "F",
			name: "Default Shape Layer anchor",
			size: [500, 500],
			position: [0, 0],
			roundness: 97
		},
		{
			id: "G",
			name: "Modified anchor, unchanged Layer Position",
			size: [500, 500],
			position: [0, 0],
			roundness: 97,
			anchor: [100, 50]
		},
		{
			id: "H",
			name: "Modified Layer Position",
			size: [500, 500],
			position: [0, 0],
			roundness: 97,
			layerPosition: [1200, 700]
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
		var message =
			error && error.message
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

		requireCondition(
			property !== null,
			"Missing property: " + matchName);

		return property;
	}

	function outputFolder() {
		var scriptFile = new File($.fileName);
		var folder =
			new Folder(scriptFile.parent.fsName + "/output");

		requireCondition(
			folder.exists || folder.create(),
			"Unable to create research output folder.");

		return folder;
	}

	function framesFolder() {
		var folder =
			new Folder(
				outputFolder().fsName +
				"/" +
				FRAMES_FOLDER_NAME);

		requireCondition(
			folder.exists || folder.create(),
			"Unable to create coordinate-space frames folder.");

		return folder;
	}

	function writeReport() {
		var file =
			new File(
				outputFolder().fsName +
					"/" +
					REPORT_NAME);

		file.encoding = "UTF-8";
		requireCondition(
			file.open("w"),
			"Unable to open coordinate-space report.");
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

		for (layerIndex = 1;
			layerIndex <= comp.numLayers;
			layerIndex++) {

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

	function selectRectangle(comp, layer, rectangle) {
		clearSelection(comp);
		layer.selected = true;
		rectangle.selected = true;
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
		var project = app.project;
		var comp;
		var layer;
		var contents;
		var rectangle;
		var rectangleIndex;
		var fill;
		var effects;
		var effect;
		var transform;

		if (!project) {
			project = app.newProject();
		}

		comp = project.items.addComp(
			"CF Coordinate Test " + caseDefinition.id,
			COMP_WIDTH,
			COMP_HEIGHT,
			1,
			1,
			30);
		temporaryComps.push(comp);
		comp.time = 0;

		layer = comp.layers.addShape();
		layer.name =
			"CF Coordinate Shape " + caseDefinition.id;

		contents =
			requireProperty(layer, MATCH.ROOT_CONTENTS);
		rectangle =
			contents.addProperty(MATCH.RECTANGLE);
		rectangleIndex = rectangle.propertyIndex;

		requireProperty(rectangle, MATCH.RECTANGLE_SIZE)
			.setValue(caseDefinition.size);
		requireProperty(rectangle, MATCH.RECTANGLE_POSITION)
			.setValue(caseDefinition.position);
		requireProperty(rectangle, MATCH.RECTANGLE_ROUNDNESS)
			.setValue(caseDefinition.roundness);
		requireProperty(rectangle, MATCH.SHAPE_DIRECTION)
			.setValue(1);

		fill = contents.addProperty(MATCH.FILL);
		requireProperty(fill, MATCH.FILL_COLOR)
			.setValue([1, 1, 1, 1]);
		requireProperty(fill, MATCH.FILL_OPACITY)
			.setValue(100);

		rectangle = contents.property(rectangleIndex);
		transform =
			requireProperty(layer, MATCH.LAYER_TRANSFORM);

		requireProperty(transform, MATCH.SCALE)
			.setValue([100, 100]);
		requireProperty(transform, MATCH.ROTATION)
			.setValue(0);
		requireProperty(transform, MATCH.OPACITY)
			.setValue(100);

		if (caseDefinition.anchor) {
			requireProperty(transform, MATCH.ANCHOR_POINT)
				.setValue(caseDefinition.anchor);
		}

		if (caseDefinition.layerPosition) {
			requireProperty(transform, MATCH.POSITION)
				.setValue(caseDefinition.layerPosition);
		}

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
			transform: transform
		};
	}

	function configureScene(scene, caseDefinition) {
		requireProperty(
			scene.rectangle,
			MATCH.RECTANGLE_SIZE)
			.setValue(caseDefinition.size);
		requireProperty(
			scene.rectangle,
			MATCH.RECTANGLE_POSITION)
			.setValue(caseDefinition.position);
		requireProperty(
			scene.rectangle,
			MATCH.RECTANGLE_ROUNDNESS)
			.setValue(caseDefinition.roundness);

		requireProperty(
			scene.transform,
			MATCH.ANCHOR_POINT)
			.setValue(
				caseDefinition.anchor ||
					[0, 0]);
		requireProperty(
			scene.transform,
			MATCH.POSITION)
			.setValue(
				caseDefinition.layerPosition ||
					[COMP_WIDTH * 0.5, COMP_HEIGHT * 0.5]);
	}

	function captureFrame(scene, fileName) {
		var file =
			new File(
				framesFolder().fsName +
					"/" +
					fileName +
					".png");
		var attempts = 0;

		if (file.exists) {
			file.remove();
		}

		scene.comp.saveFrameToPng(
			scene.comp.time,
			file);

		while (!file.exists && attempts < 150) {
			$.sleep(100);
			attempts++;
		}

		requireCondition(
			file.exists,
			"After Effects did not create frame: " +
				file.fsName);

		return file;
	}

	function expectedGeometry(caseDefinition, scene) {
		var size = caseDefinition.size;
		var position = caseDefinition.position;
		var localBounds = {
			left: position[0] - size[0] * 0.5,
			top: position[1] - size[1] * 0.5,
			right: position[0] + size[0] * 0.5,
			bottom: position[1] + size[1] * 0.5
		};
		var effectBounds = {
			left: localBounds.left + COMP_WIDTH * 0.5,
			top: localBounds.top + COMP_HEIGHT * 0.5,
			right: localBounds.right + COMP_WIDTH * 0.5,
			bottom: localBounds.bottom + COMP_HEIGHT * 0.5
		};
		var finalBounds = {
			left:
				effectBounds.left +
				size[0] * TRIM_PERCENT / 100,
			top:
				effectBounds.top +
				size[1] * TRIM_PERCENT / 100,
			right:
				effectBounds.right -
				size[0] * TRIM_PERCENT / 100,
			bottom:
				effectBounds.bottom -
				size[1] * TRIM_PERCENT / 100
		};
		var anchor =
			requireProperty(
				scene.transform,
				MATCH.ANCHOR_POINT).value;
		var layerPosition =
			requireProperty(
				scene.transform,
				MATCH.POSITION).value;
		var compCenter = [
			layerPosition[0] +
				position[0] -
				anchor[0],
			layerPosition[1] +
				position[1] -
				anchor[1]
		];
		var compLeftProbe = [
			layerPosition[0] +
				localBounds.left +
				size[0] * 0.05 -
				anchor[0],
			compCenter[1]
		];

		return {
			localBounds: localBounds,
			effectBounds: effectBounds,
			finalBounds: finalBounds,
			anchor: anchor,
			layerPosition: layerPosition,
			compCenter: compCenter,
			compLeftProbe: compLeftProbe
		};
	}

	function runCase(scene, caseDefinition) {
		configureScene(scene, caseDefinition);

		var geometry =
			expectedGeometry(caseDefinition, scene);
		var sourceRect =
			scene.layer.sourceRectAtTime(0, false);
		var captureResult;
		var disableResult;

		appendLine(
			"CASE " +
				caseDefinition.id +
				" — " +
				caseDefinition.name);
		appendLine(
			"  Composition / expected input buffer: " +
				COMP_WIDTH +
				" x " +
				COMP_HEIGHT);
		appendLine(
			"  Rectangle Size: " +
				formatPoint(caseDefinition.size));
		appendLine(
			"  Rectangle Position: " +
				formatPoint(caseDefinition.position));
		appendLine(
			"  Layer Anchor: " +
				formatPoint(geometry.anchor));
		appendLine(
			"  Layer Position: " +
				formatPoint(geometry.layerPosition));
		appendLine(
			"  sourceRectAtTime: [" +
				formatNumber(sourceRect.left) +
				", " +
				formatNumber(sourceRect.top) +
				", " +
				formatNumber(
					sourceRect.left + sourceRect.width) +
				", " +
				formatNumber(
					sourceRect.top + sourceRect.height) +
				"]");
		appendLine(
			"  Snapshot local bounds: " +
				formatRect(geometry.localBounds));
		appendLine(
			"  Hypothesis 1 effect bounds: " +
				formatRect(geometry.effectBounds));
		appendLine(
			"  Expected final bounds after Trim: " +
				formatRect(geometry.finalBounds));
		appendLine(
			"  Expected geometry center: [" +
				formatNumber(
					(geometry.effectBounds.left +
						geometry.effectBounds.right) *
						0.5) +
				", " +
				formatNumber(
					(geometry.effectBounds.top +
						geometry.effectBounds.bottom) *
						0.5) +
				"]");
		appendLine(
			"  Reference center in comp: " +
				formatPoint(geometry.compCenter));
		appendLine(
			"  Reference left-strip probe in comp: " +
				formatPoint(geometry.compLeftProbe));

		captureFrame(
			scene,
			caseDefinition.id + "_LayerBounds");

		selectRectangle(
			scene.comp,
			scene.layer,
			scene.rectangle);
		captureResult =
			parseProviderResult(
				$.global.CornerFlexGeometryProvider
					.captureSelectedRectangleSnapshot());

		requireCondition(
			captureResult.ok &&
				captureResult.code === "SNAPSHOT_CAPTURED",
			"Provider capture failed: " +
				captureResult.code);

		captureFrame(
			scene,
			caseDefinition.id + "_RectangleSource");

		disableResult =
			parseProviderResult(
				$.global.CornerFlexGeometryProvider
					.disableRectangleSnapshot());

		requireCondition(
			disableResult.ok &&
				disableResult.code === "SNAPSHOT_DISABLED",
			"Provider disable failed: " +
				disableResult.code);

		captureFrame(
			scene,
			caseDefinition.id + "_Fallback");

		appendLine(
			"  Provider capture/disable: PASS");
		appendLine("");
		writeReport();

		return {
			id: caseDefinition.id,
			center: geometry.compCenter,
			leftProbe: geometry.compLeftProbe
		};
	}

	function cleanup() {
		var index;

		for (index = temporaryComps.length - 1;
			index >= 0;
			index--) {

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
	var result;
	var reportFile;
	var scene;

	appendLine(
		"CornerFlex Rectangle Source Coordinate Space Validation");
	appendLine("After Effects version: " + app.version);
	appendLine("Operating system: " + $.os);
	appendLine(
		"Trim: linked " + TRIM_PERCENT + "%");
	appendLine(
		"Provider: " + PROVIDER_FILE.fsName);
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

		scene = createScene(CASES[0]);

		for (caseIndex = 0;
			caseIndex < CASES.length;
			caseIndex++) {

			appendLine(
				"BEGIN CASE " +
					CASES[caseIndex].id);
			writeReport();

			result =
				runCase(
					scene,
					CASES[caseIndex]);
			appendLine(
				"SAMPLE " +
					result.id +
					" center=" +
					formatPoint(result.center) +
					" leftProbe=" +
					formatPoint(result.leftProbe));
			appendLine(
				"END CASE " +
					CASES[caseIndex].id);
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
	appendLine(
		"SCRIPT RESULT: " +
			(scriptPassed ? "PASS" : "FAIL"));
	appendLine(
		"Pixel analysis: pending external RGBA validation.");

	try {
		reportFile = writeReport();
		$.writeln("Report: " + reportFile.fsName);
	}
	catch (reportError) {
		$.writeln(
			"Unable to write coordinate-space report: " +
				errorMessage(reportError));
	}

})();
