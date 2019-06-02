export interface ParsedType {
	type: string;
}

export interface RootType {
	label?: string;
	root: boolean;
	type: string;
}

export interface NumberType extends RootType {
	type: "number";
	value: number;
}

export interface InlineExpression extends RootType {
	type: "inline";
	expr: Expression;
}

export type AnyRoll = GroupedRollType | FullRoll | NumberType;

export interface ModGroupedRoll extends RootType {
	mods?: (KeepModType | DropModType | SuccessModType | FailureModType)[];
}

export interface SuccessModType {
	type: "success";
	mod: string;
	expr: RollExpression;
}

export interface FailureModType {
	type: "failure";
	mod: string;
	expr: RollExpression;
}

export interface MatchModType {
	type: "match";
	mod: string;
	expr: RollExpression;
	min: NumberType;
	count: boolean;
}

export interface KeepModType {
	type: "keep";
	highlow: string | null;
	expr: RollExpression;
}

export interface DropModType {
	type: "drop";
	highlow: string | null;
	expr: RollExpression;
}

export interface GroupedRollType extends ModGroupedRoll {
	type: "group";
	rolls: RollExpression[];
}
export type GroupedRoll = GroupedRollType | RollExpression;

export interface RollExpressionType extends RootType {
	head: RollOrExpression,
	type: "diceExpression",
	ops: MathType[],
}
export type RollExpression = RollExpressionType | RollOrExpression;

export type RollOrExpression = FullRoll | Expression;

export interface FullRoll extends DiceRoll {
	mods?: (CompoundRoll | PenetrateRoll | ExplodeRoll | ReRollOnceMod | ReRollMod | DropModType | KeepModType)[];
	targets?: (SuccessModType | FailureModType)[]
	match?: MatchModType
	sort?: SortRollType;
}

export interface SortRollType {
	type: "sort";
	asc: boolean;
}

export interface ExplodeRoll {
	type: "explode",
	target: TargetMod
}

export interface CompoundRoll {
	type: "compound",
	target: TargetMod
}

export interface PenetrateRoll {
	type: "penetrate",
	target: TargetMod
}

export interface ReRollMod {
	type: "reroll",
	target: TargetMod
}

export interface ReRollOnceMod {
	type: "rerollOnce",
	target: TargetMod
}

export interface TargetMod {
	type: "target";
	mod: string;
	value: RollExpr;
}

export interface DiceRoll extends RootType {
	die: RollExpr | FateExpr;
	count: RollExpr;
	type: "die";
}

export interface FateExpr {
	type: "fate";
}

export type RollExpr = NonExpression | NumberType;

export type Expression = InlineExpression | NonExpression;

export interface NonExpressionType extends RootType {
	head: Term;
	type: "expression";
	ops: MathType<Term>[];
}
export type NonExpression = NonExpressionType | Term;

export interface TermType extends RootType {
	head: Factor;
	type: "expression";
	ops: MathType<Factor>[];
}
export type Term = TermType | Factor;

export type Factor = AnyRoll;

export interface MathType<TailType = RollOrExpression> {
	type: "math";
	op: string;
	tail: TailType;
}