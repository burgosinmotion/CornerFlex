(function runPhase511AUniformFallback() {
	var sourceFile = new File(
		new File($.fileName).parent.fsName +
			"/ValidateRectangleLayerTranslationDefensive.jsx");

	if (!sourceFile.open("r")) {
		throw new Error("Unable to open Phase 5.10 defensive validator.");
	}

	var source = sourceFile.read();
	sourceFile.close();

	source = source.replace("[125, 80]", "[150, 150]");
	source = source.replace(
		"RectangleLayerTranslationDefensiveReport.txt",
		"Phase511AUniformFallbackReport.txt");
	source = source.replace(
		"RectangleLayerTranslationDefensiveFrames",
		"Phase511AUniformFallbackFrames");

	eval(source);
})();
