(function runPhase511ARotationScaleFallback() {
	var sourceFile = new File(
		new File($.fileName).parent.fsName +
			"/ValidateRectangleLayerTranslationDefensive.jsx");

	if (!sourceFile.open("r")) {
		throw new Error("Unable to open Phase 5.10 defensive validator.");
	}

	var source = sourceFile.read();
	sourceFile.close();

	source = source.replace(
		"requireProperty(scene.transform, MATCH.ROTATION)\n\t\t\t\t\t.setValue(20);",
		"requireProperty(scene.transform, MATCH.SCALE)\n" +
			"\t\t\t\t\t.setValue([150, 150]);\n" +
			"\t\t\t\trequireProperty(scene.transform, MATCH.ROTATION)\n" +
			"\t\t\t\t\t.setValue(20);");
	source = source.replace(
		"RectangleLayerTranslationDefensiveReport.txt",
		"Phase511ARotationScaleFallbackReport.txt");
	source = source.replace(
		"RectangleLayerTranslationDefensiveFrames",
		"Phase511ARotationScaleFallbackFrames");

	eval(source);
})();
