#target photoshop

/*
 * Amadeus Live2D working-PSD builder
 * Target: Adobe Photoshop CC with ExtendScript/JSX support
 *
 * This script creates the production layer tree and places the approved V4
 * image as a hidden, low-opacity reference. It does not pretend to perform
 * semantic part separation: every art layer must still be drawn/cut and all
 * occluded regions must be completed by an artist.
 */

(function () {
    var CONFIG = {
        width: 4096,
        height: 6144,
        resolution: 300,
        documentName: "Amadeus_work_v1",
        referencePath: "D:/Amadeus/design-reference/approved/Amadeus-classic-approved-v1.png",
        outputFolder: "D:/Amadeus/live2d-psd",
        outputPath: "D:/Amadeus/live2d-psd/Amadeus_work_v1.psd"
    };

    // Arrays are written from bottom to top because Photoshop inserts each
    // newly created item above the previous item.
    var TREE = [
        group("10_GUIDE_DO_NOT_IMPORT", [
            layer("REF_Amadeus_V4_REFERENCE_ONLY")
        ]),

        group("20_BACK_HAIR", [
            layer("Hair_Back_Base"),
            layer("Hair_Back_Center"),
            layer("Hair_Long_Back_L_01"),
            layer("Hair_Long_Back_L_02"),
            layer("Hair_Long_Back_R_01"),
            layer("Hair_Long_Back_R_02")
        ]),

        group("30_BACK_CLOTHES", [
            layer("Jacket_Back"),
            layer("Jacket_Lining_L"),
            layer("Jacket_Lining_R"),
            layer("Sleeve_Back_L"),
            layer("Sleeve_Back_R"),
            layer("Collar_Back")
        ]),

        group("40_BODY_BASE", [
            layer("Hip_Base_HiddenFill"),
            layer("Thigh_Tights_L"),
            layer("Thigh_Tights_R"),
            layer("Torso_Base_HiddenFill"),
            layer("UpperArm_L"),
            layer("Forearm_L"),
            layer("UpperArm_R"),
            layer("Forearm_R")
        ]),

        group("50_FACE_BASE", [
            layer("Neck_HiddenFill"),
            layer("Ear_L"),
            layer("Ear_R"),
            layer("Face_Base_HiddenFill")
        ]),

        group("60_FACE_DETAILS", [
            layer("Face_Shadow"),
            group("MOUTH", [
                layer("Mouth_Inside"),
                layer("Mouth_Tongue"),
                layer("Mouth_Teeth_Lower"),
                layer("Mouth_Teeth_Upper"),
                layer("Mouth_Lower_Lip"),
                layer("Mouth_Upper_Lip"),
                layer("Mouth_Line")
            ]),
            layer("Nose"),
            group("EYE_R", [
                layer("Eye_White_R_HiddenFill"),
                layer("Eye_Iris_R"),
                layer("Eye_Pupil_R"),
                layer("Eye_Highlight_R"),
                layer("Eye_Lash_R"),
                layer("Eye_Lid_R")
            ]),
            group("EYE_L", [
                layer("Eye_White_L_HiddenFill"),
                layer("Eye_Iris_L"),
                layer("Eye_Pupil_L"),
                layer("Eye_Highlight_L"),
                layer("Eye_Lash_L"),
                layer("Eye_Lid_L")
            ]),
            layer("Brow_R"),
            layer("Brow_L"),
            layer("Cheek_R"),
            layer("Cheek_L")
        ]),

        group("70_FRONT_CLOTHES_AND_ARMS", [
            layer("Shorts_Back"),
            layer("Shorts_Front"),
            layer("Belt"),
            layer("Belt_Buckle"),
            layer("Shirt_Front_HiddenFill"),
            layer("Shirt_Shadow"),
            layer("Pocket"),
            layer("Collar_Front_L"),
            layer("Collar_Front_R"),
            layer("Tie_Back"),
            layer("Tie_Front"),
            layer("Tie_Knot"),
            layer("Jacket_Front_L"),
            layer("Jacket_Front_R"),
            layer("Sleeve_Front_L"),
            layer("Sleeve_Front_R"),
            layer("Cuff_L"),
            layer("Cuff_R"),
            layer("Hand_L"),
            layer("Hand_R")
        ]),

        group("80_FRONT_HAIR", [
            layer("Hair_Long_Front_L"),
            layer("Hair_Long_Front_R"),
            layer("Hair_Front_Side_L"),
            layer("Hair_Front_Side_R"),
            layer("Hair_Front_Center_01"),
            layer("Hair_Front_Center_02"),
            layer("Hair_Front_Center_03"),
            layer("Hair_Front_Highlight")
        ]),

        group("90_EFFECTS_OPTIONAL", [
            layer("Effect_Blush"),
            layer("Effect_Eye_Shine"),
            layer("Effect_Global_Highlight")
        ])
    ];

    function layer(name) {
        return { type: "layer", name: name };
    }

    function group(name, children) {
        return { type: "group", name: name, children: children || [] };
    }

    function addTree(parent, nodes, stats) {
        var i;
        for (i = 0; i < nodes.length; i += 1) {
            var node = nodes[i];
            if (node.type === "group") {
                var set = parent.layerSets.add();
                set.name = node.name;
                stats.groups += 1;
                addTree(set, node.children, stats);
            } else {
                var art = parent.artLayers.add();
                art.name = node.name;
                art.kind = LayerKind.NORMAL;
                stats.layers += 1;
            }
        }
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

    function findArtLayer(parent, name) {
        var i;
        for (i = 0; i < parent.artLayers.length; i += 1) {
            if (parent.artLayers[i].name === name) {
                return parent.artLayers[i];
            }
        }
        return null;
    }

    function px(value) {
        return value.as("px");
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

    function importReference(documentObject, referenceFile) {
        var guideGroup = findLayerSet(documentObject, "10_GUIDE_DO_NOT_IMPORT");
        if (!guideGroup) {
            throw new Error("Guide group was not created.");
        }

        var placeholder = findArtLayer(guideGroup, "REF_Amadeus_V4_REFERENCE_ONLY");
        if (placeholder) {
            placeholder.remove();
        }

        var sourceDocument = app.open(referenceFile);
        sourceDocument.activeLayer.duplicate(documentObject, ElementPlacement.PLACEATBEGINNING);
        sourceDocument.close(SaveOptions.DONOTSAVECHANGES);

        app.activeDocument = documentObject;
        var referenceLayer = documentObject.activeLayer;
        referenceLayer.name = "REF_Amadeus_V4_REFERENCE_ONLY";
        fitAndCenter(referenceLayer, documentObject);
        referenceLayer.opacity = 35;
        referenceLayer.move(guideGroup, ElementPlacement.INSIDE);
        guideGroup.visible = false;
    }

    function ensureFolder(path) {
        var folder = new Folder(path);
        if (!folder.exists && !folder.create()) {
            throw new Error("Could not create output folder: " + path);
        }
        return folder;
    }

    function saveLayeredPSD(documentObject, outputFile) {
        var options = new PhotoshopSaveOptions();
        options.layers = true;
        options.alphaChannels = true;
        options.annotations = false;
        options.embedColorProfile = true;
        options.maximizeCompatibility = true;
        documentObject.saveAs(outputFile, options, true, Extension.LOWERCASE);
    }

    var oldRulerUnits = app.preferences.rulerUnits;
    var oldTypeUnits = app.preferences.typeUnits;
    var oldDialogs = app.displayDialogs;

    try {
        app.preferences.rulerUnits = Units.PIXELS;
        app.preferences.typeUnits = TypeUnits.PIXELS;
        app.displayDialogs = DialogModes.NO;

        var referenceFile = new File(CONFIG.referencePath);
        if (!referenceFile.exists) {
            throw new Error("Approved reference not found:\n" + CONFIG.referencePath);
        }

        ensureFolder(CONFIG.outputFolder);
        var outputFile = new File(CONFIG.outputPath);
        if (outputFile.exists) {
            var overwrite = confirm(
                "The output PSD already exists:\n" + CONFIG.outputPath +
                "\n\nOverwrite it?"
            );
            if (!overwrite) {
                return;
            }
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
            // Some localized Photoshop builds use a different profile display
            // name. The document is still RGB/8-bit; verify sRGB before import.
        }

        var stats = { groups: 0, layers: 0 };
        addTree(doc, TREE, stats);
        importReference(doc, referenceFile);

        doc.guides.add(Direction.VERTICAL, UnitValue(CONFIG.width / 2, "px"));
        doc.guides.add(Direction.HORIZONTAL, UnitValue(CONFIG.height / 2, "px"));

        saveLayeredPSD(doc, outputFile);

        alert(
            "Amadeus Live2D working PSD created.\n\n" +
            "Output: " + CONFIG.outputPath + "\n" +
            "Canvas: " + CONFIG.width + " x " + CONFIG.height + " px\n" +
            "Groups: " + stats.groups + "\n" +
            "Art layers: " + stats.layers + "\n\n" +
            "L/R names follow the character's own left and right.\n" +
            "The V4 guide is hidden at the bottom."
        );
    } catch (error) {
        alert("Amadeus PSD builder failed:\n\n" + error.message);
        throw error;
    } finally {
        app.preferences.rulerUnits = oldRulerUnits;
        app.preferences.typeUnits = oldTypeUnits;
        app.displayDialogs = oldDialogs;
    }
}());

