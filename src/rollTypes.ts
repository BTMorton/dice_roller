/** The following types of roll can be used */
export type RollType = "number" |
	"diceexpressionroll" |
	"expressionroll" |
	"grouproll" |
	"fate" |
	"die" |
	"roll" |
	"fateroll";

/** The base class for all die rolls, extended based upon the type property */
export interface RollBase {
	/**	Was the roll a success, for target number rolls, e.g. 3d6 > 3 */
	success: boolean;
	/**	The type of roll that this object represents */
	type: RollType;
	/**	Is the roll still valid, and included in calculations */
	valid: boolean;
	/**	The rolled or calculated value of this roll */
	value: number;
	/**	The display label for this roll */
	label?: string;
	/**	A property used to maintain ordering of dice rolls within groups */
	order: number;
}

/**	An intermediate interface extended for groups of dice */
export interface GroupedRollBase extends RollBase {
	/** The rolls included as part of this group */
	dice: RollBase[];
}

/**	A representation of a dice expression e.g. '2d20 + 6d6' */
export interface DiceExpressionRoll extends GroupedRollBase {
	type: "diceexpressionroll";
	/** The operations to perform on the rolls */
	ops: string[];
}

/**	A representation of a mathematic expression e.g. '20 * 17' */
export interface ExpressionRoll extends GroupedRollBase {
	type: "expressionroll";
	/** The operations to perform on the rolls */
	ops: string[];
}

/**	A representation of a group of rolls e.g. {4d6,3d6} */
export interface GroupRoll extends GroupedRollBase {
	type: "grouproll";
}

/**	The rolled result of a group of dice e.g. '6d20' */
export interface DiceRollResult extends RollBase {
	/** The die this result represents */
	die: RollBase;
	type: "die";
	/** Each roll of the die */
	rolls: DieRollBase[];
	/** The number of rolls of the die */
	count: RollBase;
	/** Whether this is a match result */
	matched: boolean;
}

/**	An intermediate interface extended for individual die rolls (see below) */
export interface DieRollBase extends RollBase {
	/** The rolled result of the die */
	roll: number;
	/** Whether this roll is a match */
	matched: boolean;
}

/**	A roll on a regular die e.g. 'd20' */
export interface DieRoll extends DieRollBase {
	/** The die number to be rolled */
	die: number;
	type: "roll";
	critical: "success" | "failure" | null;
}

/**	A roll on a fate die e.g. 'dF' */
export interface FateDieRoll extends DieRollBase {
	type: "fateroll";
}