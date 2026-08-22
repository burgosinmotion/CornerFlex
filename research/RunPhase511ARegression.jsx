(function runPhase511ARegression() {
	var sourceFile = new File(
		new File($.fileName).parent.fsName +
			"/ValidateRectangleLayerTranslation.jsx");

	if (!sourceFile.open("r")) {
		throw new Error("Unable to open Phase 5.10 regression validator.");
	}

	var source = sourceFile.read();
	sourceFile.close();

	source = source.replace(
		"RectangleLayerTranslationReport.txt",
		"Phase511ARegressionReport.txt");
	source = source.replace(
		"RectangleLayerTranslationFrames",
		"Phase511ARegressionFrames");

	eval(source);
})();
