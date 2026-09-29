#target photoshop
#targetengine "amadeus_precision_psd_cc2018"

/*
 * Photoshop CC 2018 compatibility launcher for the Amadeus precision panel.
 *
 * CC 2018 can report "JavaScript code missing" when a large persistent
 * ScriptUI file is launched directly through COM.  Reading the same source
 * and evaluating it inside a small persistent-engine launcher avoids that
 * host bug while keeping the main panel script unchanged.
 */

(function () {
    var panelScript = new File("D:/Amadeus/scripts/photoshop/amadeus_precision_psd_panel.jsx");
    var workFile = new File("D:/Amadeus/live2d-psd/Amadeus_precision_work_v1.psd");

    if (!panelScript.exists) {
        alert("Amadeus precision panel script was not found:\n" + panelScript.fsName);
        return "AMADEUS_CC2018_LAUNCHER_SOURCE_MISSING";
    }

    panelScript.encoding = "UTF-8";
    if (!panelScript.open("r")) {
        alert("Could not open the Amadeus precision panel script.");
        return "AMADEUS_CC2018_LAUNCHER_OPEN_FAILED";
    }

    var code = panelScript.read();
    panelScript.close();

    code = code.replace(/^\uFEFF/, "");
    code = code.replace(/^#target[^\r\n]*[\r\n]+/, "");
    code = code.replace(/^#targetengine[^\r\n]*[\r\n]+/, "");

    if (!workFile.exists) {
        var windowsNeedle = "    panel.center();\r\n    panel.show();";
        var unixNeedle = "    panel.center();\n    panel.show();";
        var injectedWindows =
            "    runSafely(function () { initializeWorkDocument(); });\r\n" +
            "    panel.center();\r\n    panel.show();";
        var injectedUnix =
            "    runSafely(function () { initializeWorkDocument(); });\n" +
            "    panel.center();\n    panel.show();";

        if (code.indexOf(windowsNeedle) >= 0) {
            code = code.replace(windowsNeedle, injectedWindows);
        } else if (code.indexOf(unixNeedle) >= 0) {
            code = code.replace(unixNeedle, injectedUnix);
        } else {
            alert("The launcher could not locate the panel startup marker. The panel will open without automatic initialization.");
        }
    }

    try {
        eval(code);
        return "AMADEUS_CC2018_LAUNCHER_OK";
    } catch (error) {
        var details = error.toString() +
            "\nLine: " + error.line +
            "\nFile: " + error.fileName;
        alert("Amadeus precision panel failed to load.\n\n" + details);
        return "AMADEUS_CC2018_LAUNCHER_ERROR|" + details;
    }
}());
