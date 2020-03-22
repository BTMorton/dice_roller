/** The type of the parsed object  */
export type ParsedObjectType = "number"
	| "inline"
	| "success"
	| "failure"
	| "match"
	| "keep"
	| "drop"
	| "group"
	| "diceExpression"
	| "sort"
	| "explode"
	| "compound"
	| "penetrate"
	| "reroll"
	| "rerollOnce"
	| "target"
	| "die"
	| "fate"
	| "expression"
	| "expression"
	| "math"
	| "crit"
	| "critfail";

/** The base interface for all parsed types */
export interface ParsedType {
	/** The type of parsed item this object represents */
	type: ParsedObjectType;
}

/** The base interface for a subset of parsed types */
export interface RootType extends ParsedType {
	/** The text label attached to this roll */
	label?: string;
	/** A boolean flag to indicate if this is the root of the parse tree */
	root: boolean;
}

/**
 * A single number in the input
 * @example 17
 */
export interface NumberType extends RootType {
	type: "number";
	/** The value of the number */
	value: number;
}

/**
 * An inline dice expression contained in a string
 * @example I want to roll [[2d20]] dice
 */
export interface InlineExpression extends RootType {
	type: "inline";
	/** The expression that was parsed as the inline string */
	expr: Expression;
}

/** A combined type representing any roll */
export type AnyRoll = GroupedRoll | FullRoll | NumberType;

/**
 * A grouped roll with a modifier
 * @example {4d6+3d8}kh1
 */
export interface ModGroupedRoll extends RootType {
	/** The modifiers to be applied to the grouped roll */
	mods?: (KeepDropModType | SuccessFailureModType)[];
}

/** The available values for target condition checking */
export type ConditionCheck = ">" | "<" | "=";

/**
 * A success test modifier.
 * A `"success"` or `"failure"` modifier converts the result into a success type result which returns the number of rolls that meet the target.
 * A `"crit"` or `"critfail"` modifier tests the roll for whether or not the roll should be displayed as a critical success or critical failure.
 * @example 3d6>3
 * @example 3d6f<3
 */
export interface SuccessFailureCritModType extends ParsedType {
	type: "success" | "failure" | "crit" | "critfail";
	/** The check type to use for the condition */
	mod: ConditionCheck;
	/** An expression representing the success or failure condition */
	expr: RollExpression;
}

/** Equivalent to the `SuccessFailureCritModType` but only supporting "success" and "failure" */
export interface SuccessFailureModType extends SuccessFailureCritModType {
	type: "success" | "failure";
}

/**
 * A match type modifier, used to modify the display of dice output in roll20
 * @example 2d6m
 *
 * When used with the `mt` extension, will return the number of matches found
 * @example 20d6mt
 *
 * Additional arguments can be specified that increase the required number of matches or to add a constraint to matches
 * @example 20d6mt3 counts matches of 3 items
 * @example 20d6m>3 Only counts matches where the rolled value is > 3
 */
export interface MatchModType extends ParsedType {
	type: "match";
	/**
	 * The minimum number of matches to accept
	 * @default 2 as a `NumberType`
	 */
	min: NumberType;
	/** Whether or not to count the matches */
	count: boolean;
	/**
	 * The check type to use for the match condition, if specified
	 * @optional
	 */
	mod?: ConditionCheck;
	/**
	 * An expression representing the match condition, if specified
	 * @optional
	 */
	expr?: RollExpression;
}

/**
 * A keep or drop modifier specifies a number of dice rolls to keep or drop, either the highest or lowest rolls
 * @example 2d20kh1
 */
export interface KeepDropModType extends ParsedType {
	type: "keep" | "drop";
	/** Whether to keep/drop the highest or lowest roll */
	highlow: "h" | "l" | null;
	/**
	 * An expression representing the number of rolls to keep
	 * @example 2d6
	 * @default 1 as a `NumberType`
	 */
	expr: RollExpression;
}

/**
 * Represents a group of rolls combined, with optional modifiers
 * @example {2d6,3d6}
 */
export interface GroupedRoll extends ModGroupedRoll {
	type: "group";
	rolls: RollExpression[];
}

/**
 * A roll expression including complex rolls and groups, only allows addition operations
 * @example {2d6,3d6}kh1 + {3d6 + 2d6}kh2
 */
export interface RollExpressionType extends RootType {
	/** The initial roll or expression for the roll expression */
	head: RollOrExpression,
	type: "diceExpression",
	/** The operations to apply to the initial roll or expression */
	ops: MathType[],
}

/** A combination of a complex roll expression, a roll, or a math expression. Used as a helper for type combinations */
export type RollExpression = RollExpressionType | RollOrExpression;

/** A combination of a roll, or a math expression. Used as a helper for type combinations */
export type RollOrExpression = FullRoll | Expression;

/**
 * A roll object including the dice roll, and any modifiers
 * @example 2d6kh1
 */
export interface FullRoll extends DiceRoll {
	/** Any modifiers attached to the roll */
	mods?: (ReRollMod | KeepDropModType)[];
	/** Any success or failure targets for the roll */
	targets?: (SuccessFailureCritModType)[]
	/** Any match modifiers for the roll */
	match?: MatchModType
	/** Any sort operations to apply to the roll */
	sort?: SortRollType;
}

/**
 * A sort operation to apply to a roll
 * @example 10d6sa
 */
export interface SortRollType extends ParsedType {
	type: "sort";
	/** Whether to sort ascending or descending */
	asc: boolean;
}

/**
 * A re-roll operation to apply to a roll. Can be one of the following types:
 * - `explode`: re-rolls any dice that meet the target, continuing if the new roll matches
 * - `compound`: re-rolls any dice that meet the target, continuing if the new roll matches and adding the results into a single roll
 * - `penetrate`: re-rolls any dice that meet the target subtracting 1 from the new value, continuing if the new roll matches
 * - `reroll`: re-rolls a die as long as it meets the target, keeping the final roll
 * - `rerollOnce`: re-rolls a die once if it meets the target, keeping the new roll
 * @example 2d6!
 */
export interface ReRollMod extends ParsedType {
	type: "explode" | "compound" | "penetrate" | "reroll" | "rerollOnce",
	/** The target modifier to compare the roll value against */
	target: TargetMod
}

/**
 * A target modifier to apply to a roll
 */
export interface TargetMod extends ParsedType {
	type: "target";
	/** The check type to use for the condition */
	mod: ConditionCheck;
	/** An expression representing the target condition value */
	value: RollExpr;
}

/**
 * The representation of a die roll
 * @example 2d6
 */
export interface DiceRoll extends RootType {
	/** The die value to roll against, can be a fate die, a number or a complex roll expression */
	die: RollExpr | FateExpr;
	/** The number of time to roll this die */
	count: RollExpr;
	type: "die";
}

/**
 * The representation of a fate die roll
 * @example 2dF
 */
export interface FateExpr extends ParsedType {
	type: "fate";
}

/** A combination of a number or value that is not an expression. Used as a helper for type combinations */
export type RollExpr = MathExpression | NumberType;

/** A combination of expression types. Used as a helper for type combinations */
export type Expression = InlineExpression | MathExpression;

/**
 * A math type expression between two or more dice rolls
 * @example 2d6 + 3d6 * 4d6
 */
export interface MathExpression extends RootType {
	/** The initial roll to perform operations against */
	head: AnyRoll;
	type: "expression";
	/** The operations to apply to the initial roll */
	ops: MathType<AnyRoll>[];
}

/**
 * A representation of an operation to be applied and the value to apply it to
 * @param TailType The type of the second value used in the operation
 * @example + 3d6 (as part of 2d6 + 3d6)
 */
export interface MathType<TailType = RollOrExpression> extends ParsedType {
	type: "math";
	/** The math operation to perform */
	op: "+" | "-" | "*" | "/";
	/** The second value to use in the operation */
	tail: TailType;
}
