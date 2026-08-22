(function runPhase511ANonUniformFallback() {
	var sourceFile = new File(
		new File($.fileName).parent.fsName +
			"/ValidateRectangleLayerTranslationDefensive.jsx");

	if (!sourceFile.open("r")) {
		throw new Error("Unable to open Phase 5.10 defensive validator.");
	}

	var source = sourceFile.read();
	sourceFile.close();

	source = source.replace("[125, 80]", "[150, 75]");
	source = source.replace(
		"RectangleLayerTranslationDefensiveReport.txt",
		"Phase511ANonUniformFallbackReport.txt");
	source = source.replace(
		"RectangleLayerTranslationDefensiveFrames",
		"Phase511ANonUniformFallbackFrames");

	eval(source);
})();
