#target photoshop
#targetengine "amadeus_precision_psd"

/*
 * Amadeus Precision PSD Panel
 *
 * A selection-driven Photoshop panel for turning the approved V4 composite
 * into an actually editable, masked, layered Live2D working document.
 *
 * Visible parts are captured from one shared Smart Object using editable
 * layer masks. Hidden/occluded pixels are painted on dedicated empty layers.
 * The export step duplicates the work document, removes the source master,
 * rasterizes shared Smart Objects, applies masks, removes empty layers, and
 * saves a Cubism-oriented import PSD.
 */

(function () {
    var CONFIG = {
        width: 4096,
        height: 6144,
        resolution: 300,
        referencePath: "D:/Amadeus/design-reference/approved/Amadeus-classic-approved-v1.png",
        workFolder: "D:/Amadeus/live2d-psd",
        workPath: "D:/Amadeus/live2d-psd/Amadeus_precision_work_v1.psd",
        importPath: "D:/Amadeus/live2d-psd/Amadeus_import_v1.psd",
        documentName: "Amadeus_precision_work_v1",
        sourceGroup: "00_SOURCE_DO_NOT_IMPORT",
        sourceLayer: "SOURCE_MASTER_V4"
    };

    function part(label, path, name, required, hiddenPaint) {
        return {
            label: label,
            path: path,
            name: name,
            required: required,
            hiddenPaint: hiddenPaint
        };
    }

    var PARTS = [
        part("Back hair / Base hidden fill", ["20_BACK_HAIR"], "Hair_Back_Base", true, true),
        part("Back hair / Center", ["20_BACK_HAIR"], "Hair_Back_Center", true, false),
        part("Back hair / Long L main", ["20_BACK_HAIR"], "Hair_Long_Back_L_01", true, false),
        part("Back hair / Long L detail", ["20_BACK_HAIR"], "Hair_Long_Back_L_02", false, false),
        part("Back hair / Long R main", ["20_BACK_HAIR"], "Hair_Long_Back_R_01", true, false),
        part("Back hair / Long R detail", ["20_BACK_HAIR"], "Hair_Long_Back_R_02", false, false),

        part("Back clothes / Jacket back", ["30_BACK_CLOTHES"], "Jacket_Back", true, false),
        part("Back clothes / Jacket lining L", ["30_BACK_CLOTHES"], "Jacket_Lining_L", false, false),
        part("Back clothes / Jacket lining R", ["30_BACK_CLOTHES"], "Jacket_Lining_R", false, false),
        part("Back clothes / Sleeve back L", ["30_BACK_CLOTHES"], "Sleeve_Back_L", false, false),
        part("Back clothes / Sleeve back R", ["30_BACK_CLOTHES"], "Sleeve_Back_R", false, false),
        part("Back clothes / Collar back", ["30_BACK_CLOTHES"], "Collar_Back", false, false),

        part("Body / Hip hidden fill", ["40_BODY_BASE"], "Hip_Base_HiddenFill", true, true),
        part("Body / Tights thigh L", ["40_BODY_BASE"], "Thigh_Tights_L", true, false),
        part("Body / Tights thigh R", ["40_BODY_BASE"], "Thigh_Tights_R", true, false),
        part("Body / Torso hidden fill", ["40_BODY_BASE"], "Torso_Base_HiddenFill", true, true),
        part("Body / Upper arm L", ["40_BODY_BASE"], "UpperArm_L", true, true),
        part("Body / Forearm L", ["40_BODY_BASE"], "Forearm_L", true, true),
        part("Body / Upper arm R", ["40_BODY_BASE"], "UpperArm_R", true, true),
        part("Body / Forearm R", ["40_BODY_BASE"], "Forearm_R", true, true),

        part("Face / Neck hidden fill", ["50_FACE_BASE"], "Neck_HiddenFill", true, true),
        part("Face / Ear L", ["50_FACE_BASE"], "Ear_L", true, true),
        part("Face / Ear R", ["50_FACE_BASE"], "Ear_R", true, true),
        part("Face / Complete face base", ["50_FACE_BASE"], "Face_Base_HiddenFill", true, true),

        part("Face detail / Shadow", ["60_FACE_DETAILS"], "Face_Shadow", false, false),
        part("Face detail / Nose", ["60_FACE_DETAILS"], "Nose", true, false),
        part("Face detail / Brow L", ["60_FACE_DETAILS"], "Brow_L", true, true),
        part("Face detail / Brow R", ["60_FACE_DETAILS"], "Brow_R", true, true),
        part("Face detail / Cheek L", ["60_FACE_DETAILS"], "Cheek_L", false, false),
        part("Face detail / Cheek R", ["60_FACE_DETAILS"], "Cheek_R", false, false),

        part("Eye L / Complete white", ["60_FACE_DETAILS", "EYE_L"], "Eye_White_L_HiddenFill", true, true),
        part("Eye L / Iris", ["60_FACE_DETAILS", "EYE_L"], "Eye_Iris_L", true, true),
        part("Eye L / Pupil", ["60_FACE_DETAILS", "EYE_L"], "Eye_Pupil_L", true, false),
        part("Eye L / Highlight", ["60_FACE_DETAILS", "EYE_L"], "Eye_Highlight_L", true, false),
        part("Eye L / Lash", ["60_FACE_DETAILS", "EYE_L"], "Eye_Lash_L", true, true),
        part("Eye L / Lid / closed line", ["60_FACE_DETAILS", "EYE_L"], "Eye_Lid_L", true, true),

        part("Eye R / Complete white", ["60_FACE_DETAILS", "EYE_R"], "Eye_White_R_HiddenFill", true, true),
        part("Eye R / Iris", ["60_FACE_DETAILS", "EYE_R"], "Eye_Iris_R", true, true),
        part("Eye R / Pupil", ["60_FACE_DETAILS", "EYE_R"], "Eye_Pupil_R", true, false),
        part("Eye R / Highlight", ["60_FACE_DETAILS", "EYE_R"], "Eye_Highlight_R", true, false),
        part("Eye R / Lash", ["60_FACE_DETAILS", "EYE_R"], "Eye_Lash_R", true, true),
        part("Eye R / Lid / closed line", ["60_FACE_DETAILS", "EYE_R"], "Eye_Lid_R", true, true),

        part("Mouth / Inside", ["60_FACE_DETAILS", "MOUTH"], "Mouth_Inside", true, true),
        part("Mouth / Tongue", ["60_FACE_DETAILS", "MOUTH"], "Mouth_Tongue", true, true),
        part("Mouth / Upper teeth", ["60_FACE_DETAILS", "MOUTH"], "Mouth_Teeth_Upper", true, true),
        part("Mouth / Lower teeth", ["60_FACE_DETAILS", "MOUTH"], "Mouth_Teeth_Lower", false, true),
        part("Mouth / Upper lip", ["60_FACE_DETAILS", "MOUTH"], "Mouth_Upper_Lip", true, true),
        part("Mouth / Lower lip", ["60_FACE_DETAILS", "MOUTH"], "Mouth_Lower_Lip", true, true),
        part("Mouth / Closed line", ["60_FACE_DETAILS", "MOUTH"], "Mouth_Line", true, false),

        part("Clothes / Shorts back", ["70_FRONT_CLOTHES_AND_ARMS"], "Shorts_Back", false, true),
        part("Clothes / Shorts front", ["70_FRONT_CLOTHES_AND_ARMS"], "Shorts_Front", true, false),
        part("Clothes / Belt", ["70_FRONT_CLOTHES_AND_ARMS"], "Belt", true, false),
        part("Clothes / Belt buckle", ["70_FRONT_CLOTHES_AND_ARMS"], "Belt_Buckle", true, false),
        part("Clothes / Shirt hidden fill", ["70_FRONT_CLOTHES_AND_ARMS"], "Shirt_Front_HiddenFill", true, true),
        part("Clothes / Shirt shadow", ["70_FRONT_CLOTHES_AND_ARMS"], "Shirt_Shadow", false, false),
        part("Clothes / Pocket", ["70_FRONT_CLOTHES_AND_ARMS"], "Pocket", true, false),
        part("Clothes / Collar L", ["70_FRONT_CLOTHES_AND_ARMS"], "Collar_Front_L", true, true),
        part("Clothes / Collar R", ["70_FRONT_CLOTHES_AND_ARMS"], "Collar_Front_R", true, true),
        part("Clothes / Tie back", ["70_FRONT_CLOTHES_AND_ARMS"], "Tie_Back", false, true),
        part("Clothes / Tie front", ["70_FRONT_CLOTHES_AND_ARMS"], "Tie_Front", true, false),
        part("Clothes / Tie knot", ["70_FRONT_CLOTHES_AND_ARMS"], "Tie_Knot", true, true),
        part("Clothes / Jacket front L", ["70_FRONT_CLOTHES_AND_ARMS"], "Jacket_Front_L", true, true),
        part("Clothes / Jacket front R", ["70_FRONT_CLOTHES_AND_ARMS"], "Jacket_Front_R", true, true),
        part("Clothes / Sleeve front L", ["70_FRONT_CLOTHES_AND_ARMS"], "Sleeve_Front_L", true, true),
        part("Clothes / Sleeve front R", ["70_FRONT_CLOTHES_AND_ARMS"], "Sleeve_Front_R", true, true),
        part("Clothes / Cuff L", ["70_FRONT_CLOTHES_AND_ARMS"], "Cuff_L", true, false),
        part("Clothes / Cuff R", ["70_FRONT_CLOTHES_AND_ARMS"], "Cuff_R", true, false),
        part("Body / Hand L", ["70_FRONT_CLOTHES_AND_ARMS"], "Hand_L", true, true),
        part("Body / Hand R", ["70_FRONT_CLOTHES_AND_ARMS"], "Hand_R", true, true),

        part("Front hair / Long L", ["80_FRONT_HAIR"], "Hair_Long_Front_L", true, true),
        part("Front hair / Long R", ["80_FRONT_HAIR"], "Hair_Long_Front_R", true, true),
        part("Front hair / Side L", ["80_FRONT_HAIR"], "Hair_Front_Side_L", true, true),
        part("Front hair / Side R", ["80_FRONT_HAIR"], "Hair_Front_Side_R", true, true),
        part("Front hair / Center 01", ["80_FRONT_HAIR"], "Hair_Front_Center_01", true, true),
        part("Front hair / Center 02", ["80_FRONT_HAIR"], "Hair_Front_Center_02", true, true),
        part("Front hair / Center 03", ["80_FRONT_HAIR"], "Hair_Front_Center_03", false, true),
        part("Front hair / Highlight", ["80_FRONT_HAIR"], "Hair_Front_Highlight", false, false),

        part("Effect / Blush", ["90_EFFECTS_OPTIONAL"], "Effect_Blush", false, true),
        part("Effect / Eye shine", ["90_EFFECTS_OPTIONAL"], "Effect_Eye_Shine", false, true),
        part("Effect / Global highlight", ["90_EFFECTS_OPTIONAL"], "Effect_Global_Highlight", false, true)
    ];

    function px(value) {
        return value.as("px");
    }

    function ensureFolder(path) {
        var folder = new Folder(path);
        if (!folder.exists && !folder.create()) {
            throw new Error("Could not create folder: " + path);
        }
        return folder;
    }

    function findOpenDocumentByName(name) {
        var i;
        for (i = 0; i < app.documents.length; i += 1) {
            if (app.documents[i].name === name || app.documents[i].name === name + ".psd") {
                return app.documents[i];
            }
        }
        return null;
    }

    function findLayerSet(parent, name) {
        var i;
        for (i = 0; i < parent.layerSets.length; i += 1) {
            if (parent.layerSets[i].name === name) {
                return parent.layerSets[i];
            }
        }
        return null;
    }

    function ensureGroupPath(documentObject, path) {
        var parent = documentObject;
        var i;
        for (i = 0; i < path.length; i += 1) {
            var set = findLayerSet(parent, path[i]);
            if (!set) {
                set = parent.layerSets.add();
                set.name = path[i];
            }
            parent = set;
        }
        return parent;
    }

    function findArtLayerRecursive(parent, name) {
        var i;
        for (i = 0; i < parent.artLayers.length; i += 1) {
            if (parent.artLayers[i].name === name) {
                return parent.artLayers[i];
            }
        }
        for (i = 0; i < parent.layerSets.length; i += 1) {
            var found = findArtLayerRecursive(parent.layerSets[i], name);
            if (found) {
                return found;
            }
        }
        return null;
    }

    function collectArtLayers(parent, result) {
        var i;
        for (i = 0; i < parent.artLayers.length; i += 1) {
            result.push(parent.artLayers[i]);
        }
        for (i = 0; i < parent.layerSets.length; i += 1) {
            collectArtLayers(parent.layerSets[i], result);
        }
    }

    function fitAndCenter(layerObject, documentObject) {
        var bounds = layerObject.bounds;
        var currentWidth = px(bounds[2]) - px(bounds[0]);
        var currentHeight = px(bounds[3]) - px(bounds[1]);
        var targetWidth = px(documentObject.width);
        var targetHeight = px(documentObject.height);
        var scale = Math.min(targetWidth / currentWidth, targetHeight / currentHeight) * 100;

        layerObject.resize(scale, scale, AnchorPosition.MIDDLECENTER);
        bounds = layerObject.bounds;
        var centerX = (px(bounds[0]) + px(bounds[2])) / 2;
        var centerY = (px(bounds[1]) + px(bounds[3])) / 2;
        layerObject.translate(targetWidth / 2 - centerX, targetHeight / 2 - centerY);
    }

    function convertActiveLayerToSmartObject() {
        try {
            executeAction(stringIDToTypeID("newPlacedLayer"), undefined, DialogModes.NO);
            return true;
        } catch (error) {
            return false;
        }
    }

    function createBaseGroups(documentObject) {
        var groupsBottomToTop = [
            CONFIG.sourceGroup,
            "20_BACK_HAIR",
            "30_BACK_CLOTHES",
            "40_BODY_BASE",
            "50_FACE_BASE",
            "60_FACE_DETAILS",
            "70_FRONT_CLOTHES_AND_ARMS",
            "80_FRONT_HAIR",
            "90_EFFECTS_OPTIONAL"
        ];
        var i;
        for (i = 0; i < groupsBottomToTop.length; i += 1) {
            ensureGroupPath(documentObject, [groupsBottomToTop[i]]);
        }
        ensureGroupPath(documentObject, ["60_FACE_DETAILS", "MOUTH"]);
        ensureGroupPath(documentObject, ["60_FACE_DETAILS", "EYE_R"]);
        ensureGroupPath(documentObject, ["60_FACE_DETAILS", "EYE_L"]);
    }

    function savePSD(documentObject, path) {
        var options = new PhotoshopSaveOptions();
        options.layers = true;
        options.alphaChannels = true;
        options.annotations = false;
        options.embedColorProfile = true;
        options.maximizeCompatibility = true;
        documentObject.saveAs(new File(path), options, true, Extension.LOWERCASE);
    }

    function initializeWorkDocument() {
        ensureFolder(CONFIG.workFolder);

        var openDocument = findOpenDocumentByName(CONFIG.documentName);
        if (openDocument) {
            app.activeDocument = openDocument;
            return openDocument;
        }

        var workFile = new File(CONFIG.workPath);
        if (workFile.exists) {
            var openExisting = confirm(
                "An existing precision work PSD was found.\n\n" +
                CONFIG.workPath + "\n\nOpen it instead of creating a new one?"
            );
            if (openExisting) {
                return app.open(workFile);
            }
            throw new Error("Initialization cancelled to protect the existing work PSD.");
        }

        var referenceFile = new File(CONFIG.referencePath);
        if (!referenceFile.exists) {
            throw new Error("Approved V4 reference not found:\n" + CONFIG.referencePath);
        }

        var doc = app.documents.add(
            UnitValue(CONFIG.width, "px"),
            UnitValue(CONFIG.height, "px"),
            CONFIG.resolution,
            CONFIG.documentName,
            NewDocumentMode.RGB,
            DocumentFill.TRANSPARENT,
            1.0,
            BitsPerChannelType.EIGHT
        );

        try {
            doc.convertProfile(
                "sRGB IEC61966-2.1",
                Intent.RELATIVECOLORIMETRIC,
                true,
                false
            );
        } catch (profileError) {
            // Verify sRGB manually on localized Photoshop builds.
        }

        createBaseGroups(doc);

        var sourceDocument = app.open(referenceFile);
        sourceDocument.activeLayer.duplicate(doc, ElementPlacement.PLACEATBEGINNING);
        sourceDocument.close(SaveOptions.DONOTSAVECHANGES);

        app.activeDocument = doc;
        var sourceLayer = doc.activeLayer;
        sourceLayer.name = CONFIG.sourceLayer;
        fitAndCenter(sourceLayer, doc);
        convertActiveLayerToSmartObject();
        sourceLayer = doc.activeLayer;
        sourceLayer.name = CONFIG.sourceLayer;

        var sourceGroup = ensureGroupPath(doc, [CONFIG.sourceGroup]);
        try {
            sourceLayer.move(sourceGroup, ElementPlacement.INSIDE);
        } catch (moveError) {
            sourceLayer.move(sourceGroup, ElementPlacement.PLACEATBEGINNING);
        }
        sourceLayer.allLocked = true;
        sourceLayer.visible = true;
        sourceGroup.visible = true;

        doc.guides.add(Direction.VERTICAL, UnitValue(CONFIG.width / 2, "px"));
        doc.guides.add(Direction.HORIZONTAL, UnitValue(CONFIG.height / 2, "px"));

        savePSD(doc, CONFIG.workPath);
        return doc;
    }

    function getWorkDocument() {
        var doc = findOpenDocumentByName(CONFIG.documentName);
        if (!doc) {
            var file = new File(CONFIG.workPath);
            if (file.exists) {
                doc = app.open(file);
            }
        }
        if (!doc) {
            throw new Error("Initialize or open the precision work PSD first.");
        }
        app.activeDocument = doc;
        return doc;
    }

    function selectionExists(documentObject) {
        try {
            var bounds = documentObject.selection.bounds;
            return bounds && bounds.length === 4;
        } catch (error) {
            return false;
        }
    }

    function createRevealSelectionMask() {
        var descriptor = new ActionDescriptor();
        descriptor.putClass(charIDToTypeID("Nw  "), charIDToTypeID("Chnl"));
        var reference = new ActionReference();
        reference.putEnumerated(
            charIDToTypeID("Chnl"),
            charIDToTypeID("Chnl"),
            charIDToTypeID("Msk ")
        );
        descriptor.putReference(charIDToTypeID("At  "), reference);
        descriptor.putEnumerated(
            charIDToTypeID("Usng"),
            charIDToTypeID("UsrM"),
            charIDToTypeID("RvlS")
        );
        executeAction(charIDToTypeID("Mk  "), descriptor, DialogModes.NO);
    }

    function removeExistingPart(documentObject, name) {
        var existing = findArtLayerRecursive(documentObject, name);
        if (!existing) {
            return true;
        }
        var replace = confirm(
            "A layer named '" + name + "' already exists.\n\nReplace it?"
        );
        if (!replace) {
            return false;
        }
        existing.remove();
        return true;
    }

    function captureSelectionAsPart(partDefinition) {
        var doc = getWorkDocument();
        if (!selectionExists(doc)) {
            throw new Error(
                "No active selection. Use a Photoshop selection tool on the V4 source, " +
                "then click Capture Selection."
            );
        }
        if (!removeExistingPart(doc, partDefinition.name)) {
            return;
        }

        var sourceLayer = findArtLayerRecursive(doc, CONFIG.sourceLayer);
        if (!sourceLayer) {
            throw new Error("Source master layer not found: " + CONFIG.sourceLayer);
        }

        var targetGroup = ensureGroupPath(doc, partDefinition.path);
        var partLayer = sourceLayer.duplicate();
        partLayer.allLocked = false;
        partLayer.name = partDefinition.name;
        try {
            partLayer.move(targetGroup, ElementPlacement.INSIDE);
        } catch (moveError) {
            partLayer.move(targetGroup, ElementPlacement.PLACEATBEGINNING);
        }

        doc.activeLayer = partLayer;
        createRevealSelectionMask();
        doc.selection.deselect();
        savePSD(doc, CONFIG.workPath);
    }

    function createEmptyPaintLayer(partDefinition) {
        var doc = getWorkDocument();
        if (!removeExistingPart(doc, partDefinition.name)) {
            return;
        }
        var targetGroup = ensureGroupPath(doc, partDefinition.path);
        var art = targetGroup.artLayers.add();
        art.kind = LayerKind.NORMAL;
        art.name = partDefinition.name;
        doc.activeLayer = art;
        savePSD(doc, CONFIG.workPath);
    }

    function selectSourceMaster() {
        var doc = getWorkDocument();
        var sourceLayer = findArtLayerRecursive(doc, CONFIG.sourceLayer);
        if (!sourceLayer) {
            throw new Error("Source master was not found.");
        }
        var sourceGroup = findLayerSet(doc, CONFIG.sourceGroup);
        if (sourceGroup) {
            sourceGroup.visible = true;
        }
        sourceLayer.visible = true;
        doc.activeLayer = sourceLayer;
    }

    function toggleSourceMaster() {
        var doc = getWorkDocument();
        var sourceGroup = findLayerSet(doc, CONFIG.sourceGroup);
        if (!sourceGroup) {
            throw new Error("Source group was not found.");
        }
        sourceGroup.visible = !sourceGroup.visible;
    }

    function artLayerIsEmpty(artLayer) {
        try {
            var bounds = artLayer.bounds;
            return px(bounds[0]) === px(bounds[2]) || px(bounds[1]) === px(bounds[3]);
        } catch (error) {
            return true;
        }
    }

    function validateDocument(documentObject) {
        var layers = [];
        var nameCounts = {};
        var missing = [];
        var empty = [];
        var duplicates = [];
        var i;

        collectArtLayers(documentObject, layers);
        for (i = 0; i < layers.length; i += 1) {
            var layerName = layers[i].name;
            if (layerName !== CONFIG.sourceLayer) {
                nameCounts[layerName] = (nameCounts[layerName] || 0) + 1;
                if (artLayerIsEmpty(layers[i])) {
                    empty.push(layerName);
                }
            }
        }

        for (var name in nameCounts) {
            if (nameCounts.hasOwnProperty(name) && nameCounts[name] > 1) {
                duplicates.push(name + " x" + nameCounts[name]);
            }
        }

        for (i = 0; i < PARTS.length; i += 1) {
            if (PARTS[i].required && !findArtLayerRecursive(documentObject, PARTS[i].name)) {
                missing.push(PARTS[i].name);
            }
        }

        return {
            totalLayers: layers.length,
            missing: missing,
            empty: empty,
            duplicates: duplicates
        };
    }

    function formatLimitedList(items, maximum) {
        if (items.length === 0) {
            return "None";
        }
        var result = [];
        var limit = Math.min(items.length, maximum);
        var i;
        for (i = 0; i < limit; i += 1) {
            result.push("- " + items[i]);
        }
        if (items.length > maximum) {
            result.push("- ... and " + (items.length - maximum) + " more");
        }
        return result.join("\n");
    }

    function showValidation() {
        var doc = getWorkDocument();
        var report = validateDocument(doc);
        alert(
            "Amadeus precision PSD validation\n\n" +
            "Art layers: " + report.totalLayers + "\n" +
            "Missing required parts: " + report.missing.length + "\n" +
            "Empty layers: " + report.empty.length + "\n" +
            "Duplicate names: " + report.duplicates.length + "\n\n" +
            "Missing:\n" + formatLimitedList(report.missing, 18) + "\n\n" +
            "Empty:\n" + formatLimitedList(report.empty, 12) + "\n\n" +
            "Duplicates:\n" + formatLimitedList(report.duplicates, 12)
        );
    }

    function activeLayerHasUserMask() {
        var reference = new ActionReference();
        reference.putEnumerated(
            charIDToTypeID("Lyr "),
            charIDToTypeID("Ordn"),
            charIDToTypeID("Trgt")
        );
        var descriptor = executeActionGet(reference);
        var key = stringIDToTypeID("hasUserMask");
        return descriptor.hasKey(key) && descriptor.getBoolean(key);
    }

    function applyActiveLayerMask() {
        var descriptor = new ActionDescriptor();
        var reference = new ActionReference();
        reference.putEnumerated(
            charIDToTypeID("Chnl"),
            charIDToTypeID("Chnl"),
            charIDToTypeID("Msk ")
        );
        descriptor.putReference(charIDToTypeID("null"), reference);
        descriptor.putBoolean(charIDToTypeID("Aply"), true);
        executeAction(charIDToTypeID("Dlt "), descriptor, DialogModes.NO);
    }

    function prepareLayerSetForImport(documentObject, layerSet) {
        var i;
        for (i = layerSet.layers.length - 1; i >= 0; i -= 1) {
            var item = layerSet.layers[i];
            if (item.typename === "LayerSet") {
                prepareLayerSetForImport(documentObject, item);
                if (item.layers.length === 0) {
                    item.remove();
                }
            } else {
                if (artLayerIsEmpty(item)) {
                    item.remove();
                } else {
                    documentObject.activeLayer = item;
                    if (item.kind === LayerKind.SMARTOBJECT) {
                        item.rasterize(RasterizeType.ENTIRELAYER);
                        documentObject.activeLayer = item;
                    }
                    if (activeLayerHasUserMask()) {
                        applyActiveLayerMask();
                    }
                }
            }
        }
    }

    function exportImportPSD() {
        var workDoc = getWorkDocument();
        var report = validateDocument(workDoc);
        if (report.missing.length > 0 || report.empty.length > 0 || report.duplicates.length > 0) {
            var proceed = confirm(
                "Validation found issues:\n" +
                "Missing: " + report.missing.length + "\n" +
                "Empty: " + report.empty.length + "\n" +
                "Duplicates: " + report.duplicates.length + "\n\n" +
                "Export a draft import PSD anyway?"
            );
            if (!proceed) {
                return;
            }
        }

        savePSD(workDoc, CONFIG.workPath);
        var importFile = new File(CONFIG.importPath);
        if (importFile.exists) {
            var overwrite = confirm(
                "Import PSD already exists:\n" + CONFIG.importPath +
                "\n\nOverwrite it?"
            );
            if (!overwrite) {
                return;
            }
        }

        var importDoc = workDoc.duplicate("Amadeus_import_v1", false);
        app.activeDocument = importDoc;

        var sourceGroup = findLayerSet(importDoc, CONFIG.sourceGroup);
        if (sourceGroup) {
            sourceGroup.remove();
        }

        prepareLayerSetForImport(importDoc, importDoc);
        savePSD(importDoc, CONFIG.importPath);

        alert(
            "Cubism-oriented import PSD exported:\n\n" + CONFIG.importPath +
            "\n\nInspect edge pixels and hidden fills before importing into Cubism."
        );
    }

    function saveWorkDocument() {
        var doc = getWorkDocument();
        savePSD(doc, CONFIG.workPath);
    }

    function runSafely(action) {
        var oldRulerUnits = app.preferences.rulerUnits;
        var oldTypeUnits = app.preferences.typeUnits;
        var oldDialogs = app.displayDialogs;
        try {
            app.preferences.rulerUnits = Units.PIXELS;
            app.preferences.typeUnits = TypeUnits.PIXELS;
            app.displayDialogs = DialogModes.NO;
            action();
        } catch (error) {
            alert("Amadeus Precision PSD error:\n\n" + error.message);
        } finally {
            app.preferences.rulerUnits = oldRulerUnits;
            app.preferences.typeUnits = oldTypeUnits;
            app.displayDialogs = oldDialogs;
        }
    }

    var panel = new Window(
        "palette",
        "Amadeus Precision Live2D PSD",
        undefined,
        { resizeable: true }
    );
    panel.orientation = "column";
    panel.alignChildren = ["fill", "top"];
    panel.spacing = 8;
    panel.margins = 12;

    var intro = panel.add(
        "statictext",
        undefined,
        "V4 masked-part workflow. L/R follows the character's own left/right.",
        { multiline: true }
    );
    intro.preferredSize.width = 470;

    var initRow = panel.add("group");
    initRow.orientation = "row";
    initRow.alignChildren = ["fill", "center"];
    var initButton = initRow.add("button", undefined, "Initialize / Open Work PSD");
    var saveButton = initRow.add("button", undefined, "Save Work");

    var partLabel = panel.add("statictext", undefined, "Target part:");
    var partDropdown = panel.add("dropdownlist", undefined, []);
    partDropdown.preferredSize.width = 470;
    var i;
    for (i = 0; i < PARTS.length; i += 1) {
        var suffix = PARTS[i].required ? " [required]" : " [optional]";
        if (PARTS[i].hiddenPaint) {
            suffix += " [hidden-fill review]";
        }
        partDropdown.add("item", PARTS[i].label + suffix);
    }
    partDropdown.selection = 0;

    var captureButton = panel.add("button", undefined, "Capture Active Selection as Masked Part");
    var emptyButton = panel.add("button", undefined, "Create Empty Paint Layer for This Part");

    var sourceRow = panel.add("group");
    sourceRow.orientation = "row";
    sourceRow.alignChildren = ["fill", "center"];
    var sourceButton = sourceRow.add("button", undefined, "Select Source Master");
    var toggleButton = sourceRow.add("button", undefined, "Toggle Source Visibility");

    var reviewRow = panel.add("group");
    reviewRow.orientation = "row";
    reviewRow.alignChildren = ["fill", "center"];
    var validateButton = reviewRow.add("button", undefined, "Validate Parts");
    var exportButton = reviewRow.add("button", undefined, "Export Cubism Import PSD");

    var helpText = panel.add(
        "statictext",
        undefined,
        "Workflow: initialize → select visible pixels on SOURCE_MASTER_V4 → choose a part → capture. " +
        "Refine the generated layer mask with black/white brushes. For pixels hidden in V4, create an " +
        "empty paint layer and draw the completed shape. Validate before export.",
        { multiline: true }
    );
    helpText.preferredSize.width = 470;
    helpText.preferredSize.height = 80;

    initButton.onClick = function () {
        runSafely(function () {
            initializeWorkDocument();
        });
    };

    saveButton.onClick = function () {
        runSafely(function () {
            saveWorkDocument();
        });
    };

    captureButton.onClick = function () {
        runSafely(function () {
            captureSelectionAsPart(PARTS[partDropdown.selection.index]);
        });
    };

    emptyButton.onClick = function () {
        runSafely(function () {
            createEmptyPaintLayer(PARTS[partDropdown.selection.index]);
        });
    };

    sourceButton.onClick = function () {
        runSafely(function () {
            selectSourceMaster();
        });
    };

    toggleButton.onClick = function () {
        runSafely(function () {
            toggleSourceMaster();
        });
    };

    validateButton.onClick = function () {
        runSafely(function () {
            showValidation();
        });
    };

    exportButton.onClick = function () {
        runSafely(function () {
            exportImportPSD();
        });
    };

    panel.onResizing = panel.onResize = function () {
        this.layout.resize();
    };

    panel.center();
    panel.show();
}());

