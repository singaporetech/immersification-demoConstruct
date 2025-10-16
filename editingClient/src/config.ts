const AssetConfig = {
    missingIcon_dark: "editing/icons/BurgerThumbnail.png",

    // ==== Icons ====
    transformIcon_dark: "editing/icons/translate_dark.png",
    objectIcon_dark:"editing/icons/object_dark.png",
    markerIcon_dark: "editing/icons/marker_dark.png",
    measurementIcon_dark: "editing/icons/measure_dark.png",
    annotateAddIcon_dark: "editing/icons/annotateAdd_dark.png",
    annotateDeleteIcon_dark: "editing/icons/annotateDelete_dark.png",
    expand_dark: "editing/icons/expand_dark.png",
    collapse_dark: "editing/icons/collapse_dark.png",
    goToIcon_dark: "editing/icons/goTo_dark.png",
    arrowLeft_dark: "editing/icons/arrowLeft_dark.png",
    arrowRight_dark: "editing/icons/arrowRight_dark.png",

    approvedIcon_color: "editing/icons/tick_colored.png",
    denyIcon_color: "editing/icons/deny_colored.png",
    warningIcon_color: "editing/icons/warning_colored.png",

    // ==== UI json templates ====
    //desktop
    roomselectionUIDesktop: "editing/ui/LobbyUI.json",
    sceneUIDesktop: "/editing/ui/DesktopGUI.json",
    annotationUIDesktop: "/editing/ui/DesktopAnnotation.json",

    //vr
    VRtoolSelectorUI: "editing/ui/vrToolSelector.json",
    VRmodelBrowserUI: "editing/ui/VrModelBrowserUI.json",
    VRmarkerUI: "editing/ui/VrMarkerUI.json",
    
    VRannotationActionUI: "editing/ui/VrMarkerUI.json",    
    VRannotationInputUI: "editing/ui/vrAnnotationCreatePanel.json",
    VRannotationViewerUI: "editing/ui/vrAnnotationViewer.json",

    //spatial (shared)
    annotationUIPlate: "editing/ui/annotationPlate.json",

    // ==== UI styling ====
    //desktop
    spatialUIoffset: .6,
    VRGUIDistanceFromCamera: 2,
    
  } as const;

  const ColorsConfig = {
    primaryBackground_dark: "#282828",
    SecondaryBackground_dark: "#484848",
    
    /**
     * Can also be used as a quick hack to set selectable area of affordance the same color as BG.
     */
    selectable_dark: "#282828",
    hover_dark: "#B879F9",
    selected_dark: "#6524A7",
    disabled_dark: "#B3B3B3",
    vaild_dark: "#5DAD5B",
    caution_dark: "#AD5B5B",
    warning_dark: "#C9C552",

    text_dark: "#FFFFFF",
    text_light: "#FFFFFF",
  }

  const PresetConfig = {
    titleInputPreset: "Enter Title...",
    descriptionInputPreset: "Enter Description..."
  }

  const RenderOrderConfig = {
    /**
     * Renders in world space with typical occulusion.
     */
    worldSpace: 0,
    /**
     * Renders as a overlay of objects in world space.
     */
    highlights: 1,
    /**
     * Renders in the GUI layer which is over world space objects.
     */
    gui: 2,
    /**
     * Renders above everything including world space objects and GUI layer which is on top of everything.
     */
    fullscreen: 3,
    /**
     * A debugging layer that renders above all user GUI and objects.
     * Should not be used for displaying of actual user info.
     */
    debug: 5,
  }

  // export default AssetConfig, ColorsConfig;
  export { AssetConfig, ColorsConfig, PresetConfig, RenderOrderConfig as RenderConfig};