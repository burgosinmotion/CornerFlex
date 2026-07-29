/*
	CornerFlex research prototype.
	Validates Rectangle Path Size and Position semantics without modifying
	CornerFlex.aex or relying on localized property names.
*/

(function validateRectanglePathSemantics() {

	var KEEP_DEBUG_ARTIFACTS = false;
	var TEST_TIME = 0.0;
	var TOLERANCE = 0.001;
	var REPORT_FILE_NAME = "RectanglePathSemanticsReport.txt";
	var AUTOMATED_RUN =
		$.global.CF_RECTANGLE_SEMANTICS_AUTOMATED_RUN === true;

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
		LAYER_TRANSFORM: "ADBE Transform Group",
		ANCHOR_POINT: "ADBE Anchor Point",
		POSITION: "ADBE Position",
		SCALE: "ADBE Scale",
		ROTATION: "ADBE Rotate Z",
		OPACITY: "ADBE Opacity"
	};

	var report = [];
	var temporaryComp = null;
	var undoGroupOpen = false;

	function appendLine(text) {
		report.push(String(text));
	}

	function formatNumber(value) {
		if (typeof value !== "number") {
			return String(value);
		}

		if (!isFinite(value)) {
			return String(value);
		}

		return value.toFixed(6);
	}

	function formatPoint(point) {
		return "[" +
			formatNumber(point[0]) +
			", " +
			formatNumber(point[1]) +
			"]";
	}

	function appendUniqueNumber(values, candidate) {
		var i;

		for (i = 0; i < values.length; i++) {
			if (values[i] === candidate) {
				return;
			}
		}

		values.push(candidate);
	}

	function requireProperty(group, matchName) {
		var property = group.property(matchName);

		if (!property) {
			throw new Error("Missing property: " + matchName);
		}

		return property;
	}

	function calculateCandidateBounds(size, position) {
		var halfWidth = size[0] / 2.0;
		var halfHeight = size[1] / 2.0;

		return {
			left: position[0] - halfWidth,
			top: position[1] - halfHeight,
			width: size[0],
			height: size[1],
			right: position[0] + halfWidth,
			bottom: position[1] + halfHeight
		};
	}

	function readObservedBounds(shapeLayer) {
		var sourceRect =
			shapeLayer.sourceRectAtTime(TEST_TIME, false);

		return {
			left: sourceRect.left,
			top: sourceRect.top,
			width: sourceRect.width,
			height: sourceRect.height,
			right: sourceRect.left + sourceRect.width,
			bottom: sourceRect.top + sourceRect.height
		};
	}

	function calculateDifferences(expected, observed) {
		return {
			left: observed.left - expected.left,
			top: observed.top - expected.top,
			width: observed.width - expected.width,
			height: observed.height - expected.height,
			right: observed.right - expected.right,
			bottom: observed.bottom - expected.bottom
		};
	}

	function valuesMatchWithinTolerance(differences) {
		return Math.abs(differences.left) <= TOLERANCE &&
			Math.abs(differences.top) <= TOLERANCE &&
			Math.abs(differences.width) <= TOLERANCE &&
			Math.abs(differences.height) <= TOLERANCE &&
			Math.abs(differences.right) <= TOLERANCE &&
			Math.abs(differences.bottom) <= TOLERANCE;
	}

	function boundsMatchWithinTolerance(first, second) {
		return Math.abs(first.left - second.left) <= TOLERANCE &&
			Math.abs(first.top - second.top) <= TOLERANCE &&
			Math.abs(first.width - second.width) <= TOLERANCE &&
			Math.abs(first.height - second.height) <= TOLERANCE &&
			Math.abs(first.right - second.right) <= TOLERANCE &&
			Math.abs(first.bottom - second.bottom) <= TOLERANCE;
	}

	function formatBounds(bounds) {
		return "left=" + formatNumber(bounds.left) +
			", top=" + formatNumber(bounds.top) +
			", width=" + formatNumber(bounds.width) +
			", height=" + formatNumber(bounds.height) +
			", right=" + formatNumber(bounds.right) +
			", bottom=" + formatNumber(bounds.bottom);
	}

	function discoverDirectionValues(directionProperty) {
		var originalValue = Number(directionProperty.value);
		var candidates = [];
		var verifiedValues = [];
		var minimum;
		var maximum;
		var candidate;
		var readBack;

		appendUniqueNumber(candidates, originalValue);

		try {
			if (directionProperty.hasMin && directionProperty.hasMax) {
				minimum = Math.ceil(Number(directionProperty.minValue));
				maximum = Math.floor(Number(directionProperty.maxValue));

				appendLine(
					"Direction property range reported by DOM: " +
					formatNumber(minimum) +
					" to " +
					formatNumber(maximum));

				if (isFinite(minimum) &&
					isFinite(maximum) &&
					maximum >= minimum &&
					maximum - minimum <= 16) {

					for (candidate = minimum;
						candidate <= maximum;
						candidate++) {

						appendUniqueNumber(candidates, candidate);
					}
				}
			}
			else {
				appendLine(
					"Direction property did not expose a bounded numeric range.");
			}
		}
		catch (rangeError) {
			appendLine(
				"Direction range could not be queried: " +
				rangeError.toString());
		}

		for (candidate = 0; candidate < candidates.length; candidate++) {
			try {
				directionProperty.setValue(candidates[candidate]);
				readBack = Number(directionProperty.value);
				appendUniqueNumber(verifiedValues, readBack);
			}
			catch (setError) {
				appendLine(
					"Direction candidate " +
					candidates[candidate] +
					" was rejected: " +
					setError.toString());
			}
		}

		try {
			directionProperty.setValue(originalValue);
		}
		catch (restoreError) {
			appendLine(
				"Direction original value could not be restored: " +
				restoreError.toString());
		}

		return verifiedValues;
	}

	function runCase(
		testCase,
		shapeLayer,
		sizeProperty,
		positionProperty,
		roundnessProperty,
		directionProperty) {

		var expected;
		var observed;
		var differences;
		var passed;
		var directionRead;

		sizeProperty.setValue(testCase.size);
		positionProperty.setValue(testCase.position);
		roundnessProperty.setValue(testCase.roundness);
		directionProperty.setValue(testCase.direction);

		directionRead = Number(directionProperty.value);
		expected =
			calculateCandidateBounds(
				testCase.size,
				testCase.position);
		observed =
			readObservedBounds(shapeLayer);
		differences =
			calculateDifferences(
				expected,
				observed);
		passed =
			valuesMatchWithinTolerance(
				differences);

		appendLine("");
		appendLine("CASE: " + testCase.name);
		appendLine("  Size: " + formatPoint(testCase.size));
		appendLine("  Position: " + formatPoint(testCase.position));
		appendLine("  Roundness: " + formatNumber(testCase.roundness));
		appendLine("  Direction requested: " + testCase.direction);
		appendLine("  Direction read: " + directionRead);
		appendLine("  Expected: " + formatBounds(expected));
		appendLine("  Observed: " + formatBounds(observed));
		appendLine("  Difference: " + formatBounds(differences));
		appendLine("  RESULT: " + (passed ? "PASS" : "FAIL"));

		return {
			name: testCase.name,
			passed: passed,
			expected: expected,
			observed: observed,
			roundness: testCase.roundness,
			direction: directionRead
		};
	}

	function writeReport() {
		var scriptFile = new File($.fileName);
		var outputFolder =
			new Folder(scriptFile.parent.fsName + "/output");
		var outputFile;

		if (!outputFolder.exists && !outputFolder.create()) {
			throw new Error(
				"Could not create report folder: " +
				outputFolder.fsName);
		}

		outputFile =
			new File(
				outputFolder.fsName +
				"/" +
				REPORT_FILE_NAME);
		outputFile.encoding = "UTF-8";
		outputFile.lineFeed = "Windows";

		if (!outputFile.open("w")) {
			throw new Error(
				"Could not open report file: " +
				outputFile.fsName);
		}

		outputFile.write(report.join("\n"));
		outputFile.close();

		$.writeln(report.join("\n"));
		$.writeln("Report written to: " + outputFile.fsName);
	}

	try {
		app.beginUndoGroup(
			"CornerFlex Rectangle Coordinate Semantics Validation");
		undoGroupOpen = true;

		if (!app.project) {
			throw new Error("After Effects has no active project.");
		}

		appendLine("CornerFlex Rectangle Coordinate Semantics Validation");
		appendLine("After Effects version: " + app.version);
		appendLine("Operating system: " + $.os);
		appendLine("Fixed evaluation time: " + TEST_TIME);
		appendLine("Tolerance: " + TOLERANCE + " pixels");
		appendLine(
			"Tolerance covers floating-point evaluation and subpixel values; " +
			"it is not used to hide integer offsets.");

		temporaryComp =
			app.project.items.addComp(
				"CF_RectangleSemantics_Temporary",
				1000,
				1000,
				1.0,
				1.0,
				30.0);

		temporaryComp.motionBlur = false;

		var shapeLayer = temporaryComp.layers.addShape();
		var rootContents =
			requireProperty(
				shapeLayer,
				MATCH.ROOT_CONTENTS);
		rootContents.addProperty(
			MATCH.RECTANGLE);
		rootContents.addProperty(
			MATCH.FILL);

		// Adding to an indexed group invalidates prior child references.
		var rectangle =
			requireProperty(
				rootContents,
				MATCH.RECTANGLE);
		var fill =
			requireProperty(
				rootContents,
				MATCH.FILL);

		if (shapeLayer.matchName !== MATCH.VECTOR_LAYER) {
			throw new Error(
				"Unexpected Shape Layer Match Name: " +
				shapeLayer.matchName);
		}

		var sizeProperty =
			requireProperty(
				rectangle,
				MATCH.RECTANGLE_SIZE);
		var positionProperty =
			requireProperty(
				rectangle,
				MATCH.RECTANGLE_POSITION);
		var roundnessProperty =
			requireProperty(
				rectangle,
				MATCH.RECTANGLE_ROUNDNESS);
		var directionProperty =
			requireProperty(
				rectangle,
				MATCH.SHAPE_DIRECTION);
		var fillColorProperty =
			requireProperty(
				fill,
				MATCH.FILL_COLOR);
		var fillOpacityProperty =
			requireProperty(
				fill,
				MATCH.FILL_OPACITY);
		var layerTransform =
			requireProperty(
				shapeLayer,
				MATCH.LAYER_TRANSFORM);

		fillColorProperty.setValue([1.0, 1.0, 1.0]);
		fillOpacityProperty.setValue(100.0);

		requireProperty(
			layerTransform,
			MATCH.ANCHOR_POINT).setValue([0.0, 0.0]);
		requireProperty(
			layerTransform,
			MATCH.POSITION).setValue([0.0, 0.0]);
		requireProperty(
			layerTransform,
			MATCH.SCALE).setValue([100.0, 100.0]);
		requireProperty(
			layerTransform,
			MATCH.ROTATION).setValue(0.0);
		requireProperty(
			layerTransform,
			MATCH.OPACITY).setValue(100.0);

		shapeLayer.threeDLayer = false;
		shapeLayer.motionBlur = false;
		shapeLayer.selected = false;

		appendLine("Shape Layer Match Name: " + shapeLayer.matchName);
		appendLine("Root Contents Match Name: " + rootContents.matchName);
		appendLine("Rectangle Match Name: " + rectangle.matchName);
		appendLine(
			"Rectangle parent Match Name: " +
				rectangle.parentProperty.matchName);
		appendLine(
			"Rectangle directly under Root Contents: " +
				(rectangle.parentProperty.matchName ===
					MATCH.ROOT_CONTENTS));
		appendLine("Fill Match Name: " + fill.matchName);
		appendLine("Stroke added: false");
		appendLine("Pixel aspect ratio: " + temporaryComp.pixelAspect);
		appendLine(
			"sourceRectAtTime() is read in Shape Layer source/layer space. " +
			"With Rectangle Path directly in root Contents and all transforms " +
			"at identity, this is the controlled space compared to raw Position.");

		var directionValues =
			discoverDirectionValues(
				directionProperty);

		if (directionValues.length === 0) {
			throw new Error(
				"No settable Rectangle Path direction value was discovered.");
		}

		appendLine(
			"Verified settable Direction values: " +
			directionValues.join(", "));

		var primaryDirection = directionValues[0];
		var cases = [
			{
				name: "centered-even",
				size: [200.0, 100.0],
				position: [0.0, 0.0],
				roundness: 0.0,
				direction: primaryDirection
			},
			{
				name: "positive-position",
				size: [200.0, 100.0],
				position: [50.0, 25.0],
				roundness: 0.0,
				direction: primaryDirection
			},
			{
				name: "negative-position",
				size: [200.0, 100.0],
				position: [-50.0, -25.0],
				roundness: 0.0,
				direction: primaryDirection
			},
			{
				name: "odd-size",
				size: [201.0, 101.0],
				position: [0.0, 0.0],
				roundness: 0.0,
				direction: primaryDirection
			},
			{
				name: "fractional-size-position",
				size: [200.5, 100.25],
				position: [10.125, -20.375],
				roundness: 0.0,
				direction: primaryDirection
			},
			{
				name: "zero-width",
				size: [0.0, 100.0],
				position: [12.5, 3.25],
				roundness: 0.0,
				direction: primaryDirection
			},
			{
				name: "rounded",
				size: [200.0, 100.0],
				position: [0.0, 0.0],
				roundness: 25.0,
				direction: primaryDirection
			}
		];

		var directionIndex;

		for (directionIndex = 1;
			directionIndex < directionValues.length;
			directionIndex++) {

			cases.push({
				name: "direction-" + directionValues[directionIndex],
				size: [200.0, 100.0],
				position: [0.0, 0.0],
				roundness: 0.0,
				direction: directionValues[directionIndex]
			});
		}

		var results = [];
		var caseIndex;
		var passCount = 0;
		var failCount = 0;

		for (caseIndex = 0;
			caseIndex < cases.length;
			caseIndex++) {

			var caseResult =
				runCase(
					cases[caseIndex],
					shapeLayer,
					sizeProperty,
					positionProperty,
					roundnessProperty,
					directionProperty);

			results.push(caseResult);

			if (caseResult.passed) {
				passCount++;
			}
			else {
				failCount++;
			}
		}

		var centeredResult = results[0];
		var roundedResult = null;
		var directionChangesBounds = false;

		for (caseIndex = 0;
			caseIndex < results.length;
			caseIndex++) {

			if (results[caseIndex].name === "rounded") {
				roundedResult = results[caseIndex];
			}

			if (results[caseIndex].name.indexOf("direction-") === 0 &&
				!boundsMatchWithinTolerance(
					centeredResult.observed,
					results[caseIndex].observed)) {

				directionChangesBounds = true;
			}
		}

		appendLine("");
		appendLine("SUMMARY");
		appendLine("  Cases: " + results.length);
		appendLine("  PASS: " + passCount);
		appendLine("  FAIL: " + failCount);

		if (roundedResult) {
			appendLine(
				"  Roundness changed external bounds: " +
				(!boundsMatchWithinTolerance(
					centeredResult.observed,
					roundedResult.observed)));
		}
		else {
			appendLine(
				"  Roundness comparison unavailable.");
		}

		if (directionValues.length > 1) {
			appendLine(
				"  Direction changed external bounds: " +
				directionChangesBounds);
		}
		else {
			appendLine(
				"  Only one settable Direction value was observed.");
		}

		appendLine(
			"  Candidate center formula empirically supported for all cases: " +
				(failCount === 0));
	}
	catch (error) {
		appendLine("");
		appendLine("SCRIPT ERROR");
		appendLine(error.toString());

		if (error.line) {
			appendLine("Line: " + error.line);
		}
	}
	finally {
		if (!KEEP_DEBUG_ARTIFACTS && temporaryComp) {
			try {
				temporaryComp.remove();
				appendLine(
					"Temporary composition removed: true");
			}
			catch (cleanupError) {
				appendLine(
					"Temporary composition cleanup failed: " +
					cleanupError.toString());
			}
		}
		else if (temporaryComp) {
			appendLine(
				"Temporary composition retained for debugging: true");
		}

		if (undoGroupOpen) {
			app.endUndoGroup();
		}

		try {
			writeReport();
		}
		catch (reportError) {
			$.writeln(
				"Report writing failed: " +
					reportError.toString());
			$.writeln(report.join("\n"));
		}

		if (AUTOMATED_RUN) {
			try {
				app.project.close(
					CloseOptions.DO_NOT_SAVE_CHANGES);
				app.quit();
			}
			catch (quitError) {
				$.writeln(
					"Automated After Effects shutdown failed: " +
						quitError.toString());
			}
		}
	}

}());
