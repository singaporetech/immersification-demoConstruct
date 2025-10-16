import { ColorsConfig } from "../config";

/**
 * @fileoverview
 * This file defines a helper class ColorScheme to retrieve rgb HEX value
 * as a string for use in coloring ui elements.
 * 
 */
export class ColorScheme {
  /**
   * Get a hex code string of color value based on num param as index
   * - 5: "#FFFFFF"
   * - 4: "#D9D9D9"
   * - 3: "#707070"
   * - 2: "#3e3e3e"
   * - 1: "#232323"
   * - 0: "#000000"
   * @param {int} num - Index of grayscale color, from 0 - 5
   * @param {string} alpha - Alpha value in hex format if any.
   * @returns {string} RGB Hex value of desired num index.
   */
  static GetGrayscale(num: number, alpha = null) {
    const index = Math.min(Math.max(num, 0), 5);
    let result = "#FF0000";
    switch (index) {
      case 5:
        result = "#FFFFFF";
        break;
      case 4:
        result = "#D9D9D9";
        break;
      case 3:
        result = "#707070";
        break;
      case 2:
        result = "#3e3e3e";
        break;
      case 1:
        result = "#232323";
        break;
      case 0:
        result = "#000000";
        break;
      default:
        break;
    }
    if (alpha != null) result += alpha;
    return result;
  }

  /**
   * Get a purple value for color scheme based on num as index.
   * - 3: "#9F56DA"
   * - 2: "#D39CFF"
   * - 1: "#B58BDF"
   * - 0: "#6A5084"
   * @param {int} num - Index of purple color, from 0 - 4
   * @param {string} alpha - Alpha value in hex format if any.
   * @returns {string} RGB Hex value of desired num index.
   */
  static GetPurpleScale(num: number, alpha = null) {
    const index = Math.min(Math.max(num, 0), 3);
    let result = "#FF0000";
    switch (index) {
      case 3:
        result = "#9F56DA";
        break;
      case 2:
        result = "#D39CFF";
        break;
      case 1:
        result = "#B58BDF";
        break;
      case 0:
        result = "#6A5084";
        break;
      default:
        break;
    }
    if (alpha != null) result += alpha;
    return result;
  }


  // Background

  /**
   * Helper function to get purple Hex value "#6A5084"
   */
  static get backgroundDarkPurple()
  {
    return ColorScheme.GetPurpleScale(0);
  }
  /**
   * Helper function to get purple Hex value "#B58BDF"
   */
  static get backgroundLightPurple()
  {
    return ColorScheme.GetPurpleScale(1);
  }

  static get BackgroundPrimary()
  {
    return ColorsConfig.primaryBackground_dark
  }

  static get BackgroundSecondary()
  {
    return ColorsConfig.SecondaryBackground_dark
  }

  static get BackgroundHighlighted()
  {
    return ColorsConfig.primaryBackground_dark
  }
  
  static get Selectable()
  {
    return ColorsConfig.selectable_dark
  }

  static get hoverSelectable(){
    return ColorsConfig.hover_dark
  }
  
  static get Selected(){
    return ColorsConfig.selected_dark
  }

  static get OnWarningAlert()
  {
    return ColorsConfig.warning_dark
  }

  static get Disabled()
  {
    return ColorsConfig.disabled_dark
  }
}