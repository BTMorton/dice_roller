/** A helper type representing the valid operations for a math operation on a group of dice. */
export type DiceGroupMathOperation = "+" | "-";

/** A helper type representing the valid operations for a math operation. */
export type MathOperation = "+" | "-" | "*" | "/" | "%" | "**";

/** A helper type representing the valid operations for a math operation. */
export type MathFunction = "floor" | "ceil" | "round" | "abs";

/** A helper type used when marking a roll as a critical success or failure */
export type CriticalType = "success" | "failure" | null;

/** A helper type for the available operations for a comparison point */
export type CompareOperation = ">" | "<" | "=";

/** A helper type used to determine which rolls to keep or drop */
export type HighLowType = "h" | "l" | null;