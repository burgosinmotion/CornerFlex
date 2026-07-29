/*
	CornerFlex research prototype.

	Default mode:
		Injects the explicitly selected Rectangle Path into the single selected
		Shape Layer's CornerFlex instance.

	Safe disable mode:
		Set $.global.CF_RECTANGLE_SNAPSHOT_MODE = "disable" before evaluating.

	Automated controlled test:
		Set $.global.CF_RECTANGLE_SNAPSHOT_AUTOMATED_RUN = true before evaluating.

	This prototype is intentionally separate from the production CEP panel.
	RECTANGLE_SNAPSHOT_VERSION must remain synchronized with the AEX contract.
*/

(function injectRectangleSnapshotIntoCornerFlex() {

	var RECTANGLE_SNAPSHOT_VERSION = 1;
	var FLOAT_TOLERANCE = 0.0001;
	var REPORT_FILE_NAME = "RectangleSnapshotInjectionReport.txt";
	var EFFECT_MATCH_NAME = "BurgosInMotion CornerFlex";
	var AUTOMATED_RUN =
		$.global.CF_RECTANGLE_SNAPSHOT_AUTOMATED_RUN === true;
	var requestedMode =
		typeof $.global.CF_RECTANGLE_SNAPSHOT_MODE === "string"
			? $.global.CF_RECTANGLE_SNAPSHOT_MODE
			: "inject";
	var MODE = AUTOMATED_RUN ? "automated-test" : requestedMode;

	var MATCH = {
		VECTOR_LAYER: "ADBE Vector Layer",
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
		COLOR_CONTROL: "ADBE Color Control",
		LAYER_TRANSFORM: "ADBE Transform Group",
		ANCHOR_POINT: "ADBE Anchor Point",
		POSITION: "ADBE Position",
		SCALE: "ADBE Scale",
		ROTATION: "ADBE Rotate Z",
		OPACITY: "ADBE Opacity"
	};

	var PARAMETER_DEFINITIONS = [
		{ key: "version", name: "Rectangle Snapshot Version" },
		{ key: "valid", name: "Rectangle Snapshot Valid" },
		{ key: "sizeX", name: "Rectangle Snapshot Size X" },
		{ key: "sizeY", name: "Rectangle Snapshot Size Y" },
		{ key: "positionX", name: "Rectangle Snapshot Position X" },
		{ key: "positionY", name: "Rectangle Snapshot Position Y" },
		{ key: "roundness", name: "Rectangle Snapshot Roundness" },
		{ key: "direction", name: "Rectangle Snapshot Direction" },
		{ key: "enabled", name: "Rectangle Snapshot Enabled" }
	];

	var report = [];
	var temporaryComp = null;

	function appendLine(text) {
		var line = String(text);
		report.push(line);
		$.writeln(line);
	}

	function formatNumber(value) {
		if (typeof value !== "number" || !isFinite(value)) {
			return String(value);
		}

		return value.toFixed(6);
	}

	function formatPoint(value) {
		return "[" +
			formatNumber(value[0]) +
			", " +
			formatNumber(value[1]) +
			"]";
	}

	function getErrorMessage(error) {
		var message;

		if (!error) {
			return "Unknown error.";
		}

		if (error.message) {
			message = String(error.message);
		}
		else {
			message = String(error);
		}

		if (error.line) {
			message += " | line=" + String(error.line);
		}

		if (error.fileName) {
			message += " | file=" + String(error.fileName);
		}

		return message;
	}

	function getOutputFolder() {
		var scriptFile = new File($.fileName);
		var outputFolder =
			new Folder(scriptFile.parent.fsName + "/output");

		if (!outputFolder.exists && !outputFolder.create()) {
			appendLine(
				"WARNING: Unable to create report folder: " +
				outputFolder.fsName);
			return null;
		}

		return outputFolder;
	}

	function writeReport() {
		var outputFolder = getOutputFolder();
		var reportFile;

		if (!outputFolder) {
			return null;
		}

		reportFile =
			new File(outputFolder.fsName + "/" + REPORT_FILE_NAME);

		reportFile.encoding = "UTF-8";

		if (!reportFile.open("w")) {
			appendLine(
				"WARNING: Unable to open report file: " +
				reportFile.fsName);
			return null;
		}

		reportFile.write(report.join("\n"));
		reportFile.write("\n");
		reportFile.close();

		return reportFile;
	}

	function notifyUser(message) {
		if (!AUTOMATED_RUN) {
			alert(message);
		}
	}

	function requireCondition(condition, message) {
		if (!condition) {
			throw new Error(message);
		}
	}

	function isFiniteNumber(value) {
		return typeof value === "number" && isFinite(value);
	}

	function getActiveComp() {
		var activeItem = app.project ? app.project.activeItem : null;

		requireCondition(
			activeItem && activeItem instanceof CompItem,
			"An active composition is required.");

		return activeItem;
	}

	function getSingleSelectedShapeLayer(comp) {
		var selectedLayers = comp.selectedLayers;

		requireCondition(
			selectedLayers.length === 1,
			"Select exactly one Shape Layer.");

		requireCondition(
			selectedLayers[0].matchName === MATCH.VECTOR_LAYER,
			"The selected layer is not a Shape Layer.");

		return selectedLayers[0];
	}

	function findRectangleAncestor(property) {
		var current = property;
		var depth = 0;

		while (current && depth < 64) {
			if (current.matchName === MATCH.RECTANGLE) {
				return current;
			}

			try {
				current = current.propertyGroup(1);
			}
			catch (error) {
				current = null;
			}

			depth++;
		}

		return null;
	}

	function getSelectedRectanglePath(shapeLayer) {
		var selectedProperties = shapeLayer.selectedProperties;

		requireCondition(
			selectedProperties.length === 1,
			"Select exactly one property belonging to a Rectangle Path.");

		var rectangle =
			findRectangleAncestor(selectedProperties[0]);

		requireCondition(
			rectangle !== null,
			"The selected property does not belong to a Rectangle Path.");

		return rectangle;
	}

	function requireProperty(group, matchName) {
		var property = group.property(matchName);

		requireCondition(
			property !== null,
			"Missing property with Match Name: " + matchName);

		return property;
	}

	function readEvaluatedValue(property, time) {
		try {
			return property.valueAtTime(time, false);
		}
		catch (error) {
			// Non-time-varying DOM properties may expose only value.
			return property.value;
		}
	}

	function readRectanglePathSnapshot(rectangle, time) {
		var sizeProperty =
			requireProperty(rectangle, MATCH.RECTANGLE_SIZE);
		var positionProperty =
			requireProperty(rectangle, MATCH.RECTANGLE_POSITION);
		var roundnessProperty =
			requireProperty(rectangle, MATCH.RECTANGLE_ROUNDNESS);
		var directionProperty =
			requireProperty(rectangle, MATCH.SHAPE_DIRECTION);

		return {
			size: readEvaluatedValue(sizeProperty, time),
			position: readEvaluatedValue(positionProperty, time),
			roundness: Number(
				readEvaluatedValue(roundnessProperty, time)),
			direction: Number(
				readEvaluatedValue(directionProperty, time))
		};
	}

	function validateRectanglePathSnapshot(snapshot) {
		requireCondition(
			snapshot.size &&
				snapshot.size.length === 2 &&
				isFiniteNumber(Number(snapshot.size[0])) &&
				isFiniteNumber(Number(snapshot.size[1])),
			"Rectangle Size must contain two finite numeric components.");

		requireCondition(
			snapshot.position &&
				snapshot.position.length === 2 &&
				isFiniteNumber(Number(snapshot.position[0])) &&
				isFiniteNumber(Number(snapshot.position[1])),
			"Rectangle Position must contain two finite numeric components.");

		snapshot.size[0] = Number(snapshot.size[0]);
		snapshot.size[1] = Number(snapshot.size[1]);
		snapshot.position[0] = Number(snapshot.position[0]);
		snapshot.position[1] = Number(snapshot.position[1]);

		requireCondition(
			snapshot.size[0] >= 0 && snapshot.size[1] >= 0,
			"Rectangle Size components must be non-negative.");

		requireCondition(
			isFiniteNumber(snapshot.roundness) &&
				snapshot.roundness >= 0,
			"Rectangle Roundness must be finite and non-negative.");

		requireCondition(
			isFiniteNumber(snapshot.direction) &&
				Math.floor(snapshot.direction) === snapshot.direction &&
				snapshot.direction >= -2147483648 &&
				snapshot.direction <= 2147483647,
			"Rectangle Direction must be a transportable 32-bit integer.");
	}

	function findSingleCornerFlexEffect(shapeLayer) {
		var effects = shapeLayer.property(MATCH.EFFECTS);
		var matches = [];
		var index;
		var effect;

		requireCondition(
			effects !== null,
			"The selected Shape Layer has no Effects group.");

		for (index = 1; index <= effects.numProperties; index++) {
			effect = effects.property(index);

			if (effect && effect.matchName === EFFECT_MATCH_NAME) {
				matches.push(effect);
			}
		}

		requireCondition(
			matches.length === 1,
			matches.length === 0
				? "No CornerFlex instance was found by Match Name: " +
					EFFECT_MATCH_NAME
				: "More than one CornerFlex instance exists on the layer.");

		return matches[0];
	}

	function findEffectParameter(effect, stableName) {
		var directProperty = effect.property(stableName);
		var index;
		var candidate;

		if (directProperty) {
			return directProperty;
		}

		for (index = 1; index <= effect.numProperties; index++) {
			candidate = effect.property(index);

			if (candidate && candidate.name === stableName) {
				return candidate;
			}
		}

		return null;
	}

	function locateSnapshotParameters(effect, logDetails) {
		var targets = {};
		var index;
		var definition;
		var property;

		for (index = 0;
			index < PARAMETER_DEFINITIONS.length;
			index++) {

			definition = PARAMETER_DEFINITIONS[index];
			property =
				findEffectParameter(effect, definition.name);

			requireCondition(
				property !== null,
				"CornerFlex parameter is not accessible through the DOM: " +
				definition.name);

			targets[definition.key] = property;

			if (logDetails) {
				appendLine(
					"  " +
					definition.name +
					" | DOM name=" +
					property.name +
					" | matchName=" +
					property.matchName);
			}
		}

		return targets;
	}

	function readTargetValues(targets) {
		return {
			version: Number(targets.version.value),
			valid: Number(targets.valid.value),
			sizeX: Number(targets.sizeX.value),
			sizeY: Number(targets.sizeY.value),
			positionX: Number(targets.positionX.value),
			positionY: Number(targets.positionY.value),
			roundness: Number(targets.roundness.value),
			direction: Number(targets.direction.value),
			enabled: Number(targets.enabled.value)
		};
	}

	function compareExact(label, actual, expected) {
		var difference = actual - expected;
		var passed = actual === expected;

		appendLine(
			"  " +
			label +
			": expected=" +
			formatNumber(expected) +
			", read=" +
			formatNumber(actual) +
			", difference=" +
			formatNumber(difference) +
			", " +
			(passed ? "PASS" : "FAIL"));

		return passed;
	}

	function compareFloat(label, actual, expected) {
		var difference = actual - expected;
		var passed =
			isFiniteNumber(actual) &&
			Math.abs(difference) <= FLOAT_TOLERANCE;

		appendLine(
			"  " +
			label +
			": expected=" +
			formatNumber(expected) +
			", read=" +
			formatNumber(actual) +
			", difference=" +
			formatNumber(difference) +
			", " +
			(passed ? "PASS" : "FAIL"));

		return passed;
	}

	function verifyReadBack(targets, snapshot) {
		var values = readTargetValues(targets);
		var passed = true;

		appendLine("Read-back validation:");

		passed =
			compareExact(
				"Version",
				values.version,
				RECTANGLE_SNAPSHOT_VERSION) &&
			passed;
		passed =
			compareExact("Valid", values.valid, 1) &&
			passed;
		passed =
			compareFloat("Size X", values.sizeX, snapshot.size[0]) &&
			passed;
		passed =
			compareFloat("Size Y", values.sizeY, snapshot.size[1]) &&
			passed;
		passed =
			compareFloat(
				"Position X",
				values.positionX,
				snapshot.position[0]) &&
			passed;
		passed =
			compareFloat(
				"Position Y",
				values.positionY,
				snapshot.position[1]) &&
			passed;
		passed =
			compareFloat(
				"Roundness",
				values.roundness,
				snapshot.roundness) &&
			passed;
		passed =
			compareExact(
				"Direction",
				values.direction,
				snapshot.direction) &&
			passed;
		passed =
			compareExact("Enabled", values.enabled, 1) &&
			passed;

		return {
			passed: passed,
			values: values
		};
	}

	function rollbackInjectionUndoGroup(undoGroupOpen) {
		if (undoGroupOpen) {
			try {
				app.endUndoGroup();
			}
			catch (endError) {
			}
		}

		try {
			app.executeCommand(app.findMenuCommandId("Undo"));
		}
		catch (undoError) {
		}
	}

	function safelyDisableTargets(targets, undoName) {
		var undoGroupOpen = false;

		try {
			app.beginUndoGroup(undoName);
			undoGroupOpen = true;

			targets.enabled.setValue(0);
			targets.valid.setValue(0);

			app.endUndoGroup();
			undoGroupOpen = false;
		}
		catch (error) {
			if (undoGroupOpen) {
				try {
					app.endUndoGroup();
				}
				catch (endError) {
				}
			}

			throw error;
		}
	}

	function injectSelectedRectangle(logParameterDetails) {
		var comp = getActiveComp();
		var shapeLayer = getSingleSelectedShapeLayer(comp);
		var rectangle = getSelectedRectanglePath(shapeLayer);
		var snapshot =
			readRectanglePathSnapshot(rectangle, comp.time);
		var effect;
		var targets;
		var undoGroupOpen = false;
		var verification;

		validateRectanglePathSnapshot(snapshot);

		effect = findSingleCornerFlexEffect(shapeLayer);

		appendLine("CornerFlex effect Match Name: " + effect.matchName);
		appendLine("CornerFlex effect display name: " + effect.name);
		appendLine("CornerFlex parameters accessible through DOM:");

		targets =
			locateSnapshotParameters(
				effect,
				logParameterDetails);

		appendLine("Layer: " + shapeLayer.name);
		appendLine(
			"Rectangle Path: " +
			rectangle.name +
			" (" +
			rectangle.matchName +
			")");
		appendLine("Evaluation time: " + formatNumber(comp.time));
		appendLine("Captured Size: " + formatPoint(snapshot.size));
		appendLine(
			"Captured Position: " +
			formatPoint(snapshot.position));
		appendLine(
			"Captured Roundness: " +
			formatNumber(snapshot.roundness));
		appendLine(
			"Captured Direction: " +
			formatNumber(snapshot.direction));

		try {
			app.beginUndoGroup(
				"Inject CornerFlex Rectangle Snapshot");
			undoGroupOpen = true;

			// Disable first so render cannot intentionally observe partial data.
			targets.enabled.setValue(0);
			targets.valid.setValue(0);
			targets.version.setValue(RECTANGLE_SNAPSHOT_VERSION);
			targets.sizeX.setValue(snapshot.size[0]);
			targets.sizeY.setValue(snapshot.size[1]);
			targets.positionX.setValue(snapshot.position[0]);
			targets.positionY.setValue(snapshot.position[1]);
			targets.roundness.setValue(snapshot.roundness);
			targets.direction.setValue(snapshot.direction);
			targets.valid.setValue(1);
			targets.enabled.setValue(1);

			app.endUndoGroup();
			undoGroupOpen = false;
		}
		catch (writeError) {
			rollbackInjectionUndoGroup(undoGroupOpen);

			throw new Error(
				"Snapshot write failed and was rolled back: " +
				getErrorMessage(writeError));
		}

		verification = verifyReadBack(targets, snapshot);

		if (!verification.passed) {
			safelyDisableTargets(
				targets,
				"Disable Invalid CornerFlex Snapshot");

			throw new Error(
				"Snapshot read-back validation failed; " +
				"Valid and Enabled were disabled.");
		}

		return {
			comp: comp,
			layer: shapeLayer,
			rectangle: rectangle,
			effect: effect,
			targets: targets,
			snapshot: snapshot,
			readBack: verification.values
		};
	}

	function disableSelectedCornerFlexSnapshot() {
		var comp = getActiveComp();
		var shapeLayer = getSingleSelectedShapeLayer(comp);
		var effect = findSingleCornerFlexEffect(shapeLayer);
		var targets = locateSnapshotParameters(effect, true);
		var readBack;

		safelyDisableTargets(
			targets,
			"Disable CornerFlex Rectangle Snapshot");

		readBack = readTargetValues(targets);

		requireCondition(
			readBack.enabled === 0 && readBack.valid === 0,
			"Unable to verify safe snapshot deactivation.");

		appendLine("Safe disable order: Enabled = FALSE, then Valid = FALSE.");
		appendLine("Final Enabled: " + formatNumber(readBack.enabled));
		appendLine("Final Valid: " + formatNumber(readBack.valid));

		return true;
	}

	function setLayerTransformIdentity(shapeLayer) {
		var transform =
			requireProperty(shapeLayer, MATCH.LAYER_TRANSFORM);

		requireProperty(transform, MATCH.ANCHOR_POINT)
			.setValue([0, 0]);
		requireProperty(transform, MATCH.POSITION)
			.setValue([0, 0]);
		requireProperty(transform, MATCH.SCALE)
			.setValue([100, 100]);
		requireProperty(transform, MATCH.ROTATION)
			.setValue(0);
		requireProperty(transform, MATCH.OPACITY)
			.setValue(100);
	}

	function selectOnlyRectangle(comp, shapeLayer, rectangle) {
		var layerIndex;
		var selectedProperties;
		var propertyIndex;

		for (layerIndex = 1;
			layerIndex <= comp.numLayers;
			layerIndex++) {

			comp.layer(layerIndex).selected = false;
		}

		selectedProperties = shapeLayer.selectedProperties;

		for (propertyIndex = 0;
			propertyIndex < selectedProperties.length;
			propertyIndex++) {

			try {
				selectedProperties[propertyIndex].selected = false;
			}
			catch (selectionError) {
			}
		}

		shapeLayer.selected = true;
		rectangle.selected = true;
	}

	function createControlledTestScene() {
		var project = app.project;
		var comp;
		var shapeLayer;
		var contents;
		var rectangle;
		var rectangleIndex;
		var fill;
		var effects;
		var cornerFlex;

		if (!project) {
			project = app.newProject();
		}

		comp = project.items.addComp(
			"CF Rectangle Snapshot Injection Test",
			1000,
			1000,
			1.0,
			1.0,
			30.0);

		temporaryComp = comp;
		comp.time = 0;

		shapeLayer = comp.layers.addShape();
		shapeLayer.name = "CF Snapshot Test Shape";
		setLayerTransformIdentity(shapeLayer);

		contents =
			requireProperty(shapeLayer, MATCH.ROOT_CONTENTS);
		rectangle =
			contents.addProperty(MATCH.RECTANGLE);
		rectangleIndex = rectangle.propertyIndex;

		requireProperty(rectangle, MATCH.RECTANGLE_SIZE)
			.setValue([400, 300]);
		requireProperty(rectangle, MATCH.RECTANGLE_POSITION)
			.setValue([400, 300]);
		requireProperty(rectangle, MATCH.RECTANGLE_ROUNDNESS)
			.setValue(0);
		requireProperty(rectangle, MATCH.SHAPE_DIRECTION)
			.setValue(1);

		fill =
			contents.addProperty(MATCH.FILL);

		requireProperty(fill, MATCH.FILL_COLOR)
			.setValue([1, 1, 1, 1]);
		requireProperty(fill, MATCH.FILL_OPACITY)
			.setValue(100);

		// Adding to an indexed group invalidates earlier child references.
		rectangle = contents.property(rectangleIndex);

		effects = requireProperty(shapeLayer, MATCH.EFFECTS);

		try {
			cornerFlex = effects.addProperty(EFFECT_MATCH_NAME);
		}
		catch (effectError) {
			throw new Error(
				"Unable to apply CornerFlex by Match Name. " +
				"Confirm that the Phase 5.6 AEX is compiled and loaded. " +
				getErrorMessage(effectError));
		}

		requireCondition(
			cornerFlex !== null &&
				cornerFlex.matchName === EFFECT_MATCH_NAME,
			"CornerFlex was not loaded under the expected Match Name.");

		// Deliberately rename the instance to prove lookup does not use display name.
		cornerFlex.name = "Renamed CornerFlex Test Instance";

		comp.openInViewer();
		selectOnlyRectangle(comp, shapeLayer, rectangle);

		return {
			comp: comp,
			layer: shapeLayer,
			rectangle: rectangle,
			effect: cornerFlex
		};
	}

	function capturePostEffectFrame(scene, caseName, expectation) {
		var outputFolder = getOutputFolder();
		var framesFolder;
		var frameFile;
		var waitAttempts = 0;

		requireCondition(
			outputFolder !== null,
			"Unable to access the research output folder.");

		framesFolder =
			new Folder(
				outputFolder.fsName +
				"/RectangleSnapshotInjectionFrames");

		requireCondition(
			framesFolder.exists || framesFolder.create(),
			"Unable to create the frame output folder.");

		frameFile =
			new File(
				framesFolder.fsName +
				"/" +
				caseName +
				".png");

		if (frameFile.exists) {
			frameFile.remove();
		}

		requireCondition(
			typeof scene.comp.saveFrameToPng === "function",
			"CompItem.saveFrameToPng() is unavailable in this After Effects build.");

		scene.comp.saveFrameToPng(
			scene.comp.time,
			frameFile);

		while (!frameFile.exists && waitAttempts < 100) {
			$.sleep(100);
			waitAttempts++;
		}

		requireCondition(
			frameFile.exists,
			"After Effects did not create frame: " + frameFile.fsName);

		appendLine(
			caseName +
			": frame captured, expected " +
			expectation +
			" at [500, 300] — " +
			frameFile.fsName);

		return frameFile;
	}

	function setValidityAndGate(
		targets,
		valid,
		enabled,
		undoName) {

		var undoGroupOpen = false;

		try {
			app.beginUndoGroup(undoName);
			undoGroupOpen = true;

			if (!enabled) {
				targets.enabled.setValue(0);
			}

			targets.valid.setValue(valid ? 1 : 0);
			targets.enabled.setValue(enabled ? 1 : 0);

			app.endUndoGroup();
			undoGroupOpen = false;
		}
		catch (error) {
			if (undoGroupOpen) {
				try {
					app.endUndoGroup();
				}
				catch (endError) {
				}
			}

			throw error;
		}
	}

	function runAutomatedControlledTest() {
		var scene = createControlledTestScene();
		var allPassed = true;
		var firstInjection;
		var secondInjection;
		var targets;

		appendLine("Controlled scene:");
		appendLine("  Composition: 1000 x 1000");
		appendLine("  Pixel aspect ratio: 1");
		appendLine("  Rectangle Size: [400, 300]");
		appendLine("  Rectangle Position: [400, 300]");
		appendLine("  Roundness: 0");
		appendLine("  Direction: 1");
		appendLine("  Fill: white, no Stroke");
		appendLine("  Shape Group and layer transforms: identity");
		appendLine("  Post-effect sample point: [500, 300]");

		targets = locateSnapshotParameters(scene.effect, true);

		appendLine(
			"Initial gate: " +
			formatNumber(Number(targets.enabled.value)));
		appendLine(
			"Initial valid flag: " +
			formatNumber(Number(targets.valid.value)));

		capturePostEffectFrame(
			scene,
			"CaseA",
			"visible: gate disabled, Layer Bounds");

		selectOnlyRectangle(
			scene.comp,
			scene.layer,
			scene.rectangle);
		firstInjection = injectSelectedRectangle(false);
		targets = firstInjection.targets;

		capturePostEffectFrame(
			scene,
			"CaseB",
			"transparent: valid enabled Rectangle Source");

		setValidityAndGate(
			targets,
			false,
			true,
			"Test Invalid CornerFlex Snapshot");

		capturePostEffectFrame(
			scene,
			"CaseC",
			"visible: invalid snapshot, Layer Bounds fallback");

		setValidityAndGate(
			targets,
			true,
			false,
			"Test Disabled CornerFlex Snapshot");

		capturePostEffectFrame(
			scene,
			"CaseD",
			"visible: gate disabled, Layer Bounds fallback");

		requireProperty(
			scene.rectangle,
			MATCH.RECTANGLE_SIZE)
			.setValue([800, 600]);

		selectOnlyRectangle(
			scene.comp,
			scene.layer,
			scene.rectangle);
		secondInjection = injectSelectedRectangle(false);
		targets = secondInjection.targets;

		capturePostEffectFrame(
			scene,
			"CaseE",
			"visible: Size updated to [800, 600] and reinjected");

		allPassed =
			Math.abs(
				secondInjection.readBack.sizeX - 800) <=
				FLOAT_TOLERANCE &&
			Math.abs(
				secondInjection.readBack.sizeY - 600) <=
				FLOAT_TOLERANCE &&
			allPassed;

		appendLine(
			"Case E stored Size: [" +
			formatNumber(secondInjection.readBack.sizeX) +
			", " +
			formatNumber(secondInjection.readBack.sizeY) +
			"]");

		safelyDisableTargets(
			targets,
			"Finalize CornerFlex Snapshot Test");

		appendLine(
			"Final gate after safe disable: " +
			formatNumber(Number(targets.enabled.value)));
		appendLine(
			"Final valid flag after safe disable: " +
			formatNumber(Number(targets.valid.value)));

		requireCondition(
			Number(targets.enabled.value) === 0 &&
				Number(targets.valid.value) === 0,
			"Final safe disable could not be verified.");

		requireCondition(
			allPassed,
			"One or more controlled visual cases failed.");

		return true;
	}

	function cleanUpAutomatedScene() {
		if (temporaryComp) {
			try {
				temporaryComp.remove();
				appendLine(
					"Controlled temporary composition removed.");
			}
			catch (cleanupError) {
				appendLine(
					"WARNING: Unable to remove temporary composition: " +
					getErrorMessage(cleanupError));
			}

			temporaryComp = null;
		}
	}

	var passed = false;
	var reportFile = null;

	appendLine("CornerFlex Rectangle Snapshot Injection Test");
	appendLine("After Effects version: " + app.version);
	appendLine("Operating system: " + $.os);
	appendLine("Mode: " + MODE);
	appendLine(
		"Rectangle snapshot contract version: " +
		RECTANGLE_SNAPSHOT_VERSION);
	appendLine(
		"Float read-back tolerance: " +
		formatNumber(FLOAT_TOLERANCE));
	appendLine("");

	try {
		if (MODE === "disable") {
			passed = disableSelectedCornerFlexSnapshot();
		}
		else if (MODE === "automated-test") {
			passed = runAutomatedControlledTest();
		}
		else if (MODE === "inject") {
			injectSelectedRectangle(true);
			passed = true;
		}
		else {
			throw new Error(
				"Unsupported mode: " + MODE);
		}
	}
	catch (error) {
		appendLine("ERROR: " + getErrorMessage(error));
		passed = false;
	}

	if (AUTOMATED_RUN) {
		cleanUpAutomatedScene();
	}

	appendLine("");
	appendLine("SCRIPT RESULT: " + (passed ? "PASS" : "FAIL"));
	appendLine(
		"Visual frame result: pending external PNG pixel analysis.");
	appendLine(
		"Snapshot semantics: static at injection time; " +
		"later Rectangle Path changes require reinjection.");
	appendLine(
		"Animated properties and expressions are captured only at " +
		"the composition time used by this execution.");
	appendLine(
		"No Shape Group, ancestor, layer, composition, or world " +
		"transform is applied by this prototype.");

	reportFile = writeReport();

	if (reportFile) {
		appendLine("Report: " + reportFile.fsName);
	}

	notifyUser(
		passed
			? "CornerFlex Rectangle Snapshot operation completed successfully."
			: "CornerFlex Rectangle Snapshot operation failed. See the report.");

})();
