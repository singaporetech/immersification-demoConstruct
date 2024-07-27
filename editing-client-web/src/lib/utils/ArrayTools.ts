import { Vector3 } from "@babylonjs/core";

export class ArrayTools {
  /*
    Shifts a range of elements in an array by a given amount.
    Internally uses Splice and slice array functions to split and merge the array.
    DOES NOT HANDLE IF INDEXES OUT OF RANGE, USES JAVASCRIPT DEFAULT BEHAVIOURS.
    @param {Array} array - The array containing the elements to shift.
    @param {number} index - The starting index of the first element in the range to shift.
    @param {number} count - The number of elements to shift, starting from 0.
    @param {number} shiftDistance - The distance (or number of positions) to shift the elements in the array.
    */
  static ShiftArrayElements(
    array: any[],
    startIndex: number,
    count: number,
    shiftDistance: number
  ) {
    //Get array containing group of elements to shift using slice.
    const slice = array.slice(startIndex, startIndex + count);

    //Remove the group from array.
    array.splice(startIndex, count);

    //Calculating new index to insert slice. Wrap around end if needed.
    const newIndex = startIndex + shiftDistance;

    //Inserting slice.
    array.splice(newIndex, 0, ...slice);
  }
}

export class Array3ToAxes {
  static ToAxes(array: any[]) {
    return new Vector3(array[0], array[1], array[2]);
  }

  static ToArray(dict: Vector3) {
    return [dict.x, dict.y, dict.z];
  }

  static ToBabylonVec3(array: any[]) {
    return new Vector3(array[0], array[1], array[2]);
  }
}
