{
	const defaultTarget = {
		type: "target",
		mod: "=",
		value: {
			type: "number",
			value: 1,
		},
	}

	const defaultExpression = {
		type: "number",
		value: 1,
	}
}

start = expr:Expression label:(.*) {
	expr.root = true;

	if (label) {
		expr.label = label.join("");
	}

	return expr;
}

InlineExpression = "[[" expr:Expression "]]" {
	return {
		type: "inline",
		expr,
	}
}

AnyRoll = roll:(ModGroupedRoll / FullRoll / Integer) _ label:Label? {
	if (label) {
		roll.label = label;
	}

	return roll;
}

ModGroupedRoll = group:GroupedRoll mods:(KeepMod / DropMod / SuccessMod / FailureMod)* _ label:Label? {
	if (mods.length > 0) {
		group.mods = (group.mods || []).concat(mods);
	}

	if (label) {
		group.label = label;
	}

	return group;
}

SuccessMod = mod:(">"/"<"/"=") expr:RollExpr {
	return {
		type: "success",
		mod,
		expr,
	}
}

FailureMod = "f" mod:(">"/"<"/"=")? expr:RollExpr {
	return {
		type: "failure",
		mod,
		expr,
	}
}

MatchTarget = mod:(">"/"<"/"=") expr:RollExpr {
	return {
		mod,
		expr,
	}
}

MatchMod = "m" count:"t"? min:Integer? target: MatchTarget? {
	const match = {
		type: "match",
		min: min || { type: "number", value: 2 },
		count: !!count,
	}

	if (target) {
		match.mod = target.mod;
		match.expr = target.expr;
	}

	return match;
}

KeepMod = "k" highlow:("l" / "h")? expr:RollExpr? {
	return {
		type: "keep",
		highlow,
		expr: expr || defaultExpression,
	}
}

DropMod = "d" highlow:("l" / "h")? expr:RollExpr? {
	return {
		type: "drop",
		highlow,
		expr: expr || defaultExpression,
	}
}

GroupedRoll = "{" _ head:(RollExpression) tail:(_ "," _ (RollExpression))* _ "}" {
	return {
		rolls: [head, ...tail.map((el) => el[3])],
		type: "group",
	}
}

RollExpression = head:RollOrExpression tail:(_ ("+") _ RollOrExpression)* {
	if (tail.length == 0) {
		return head;
	}

	const ops = tail
		.map((element) => ({
			type: "math",
			op: element[1],
			tail: element[3]
		}));

	return {
		head: head,
		type: "diceExpression",
		ops,
	};
}

RollOrExpression = FullRoll / Expression

FullRoll = roll:TargetedRoll _ label:Label? {
	if (label) {
		roll.label = label;
	}

	return roll;
}

TargetedRoll = head:RolledModRoll mods:(DropMod / KeepMod / SuccessMod / FailureMod)* match:MatchMod? sort:(SortAscMod / SortDescMod)? {
	const targets = mods.filter((mod) => ["success", "failure"].includes(mod.type));
	mods = mods.filter((mod) => !targets.includes(mod));

	head.mods = (head.mods || []).concat(mods);

	if (targets.length > 0) {
		head.targets = targets;
	}

	if (match) {
		head.match = match;
	}

	if (sort) {
		head.sort = sort;
	}

	return head;
}

SortAscMod = "sa" {
	return {
		type: "sort",
		asc: true
	}
}

SortDescMod = "sd" {
	return {
		type: "sort",
		asc: false
	}
}

RolledModRoll = head:DiceRoll tail:(CompoundRoll / PenetrateRoll / ExplodeRoll / ReRollOnceMod / ReRollMod)* {
	head.mods = (head.mods || []).concat(tail);
	return head;
}

ExplodeRoll = "!" target:TargetMod? {
	return {
		type: "explode",
		target,
	}
}

CompoundRoll = "!!" target:TargetMod? {
	return {
		type: "compound",
		target,
	}
}

PenetrateRoll = "!p" target:TargetMod? {
	return {
		type: "penetrate",
		target,
	}
}

ReRollMod = "r" target:TargetMod? {
	target = target || defaultTarget;

	return {
		type: "reroll",
		target,
	}
}

ReRollOnceMod = "ro" target:TargetMod? {
	target = target || defaultTarget;

	return {
		type: "rerollOnce",
		target,
	}
}

TargetMod = mod:(">"/"<"/"=")? value:RollExpr {
	return {
		type: "target",
		mod,
		value,
	}
}

DiceRoll = head:RollExpr? "d" tail:(FateExpr / PercentExpr / RollExpr) {
	head = head ? head : { type: "number", value: 1 };

	return {
		die: tail,
		count: head,
		type: "die"
	};
}

FateExpr = ("F" / "f") {
	return {
		type: "fate",
	}
}

PercentExpr = ("%") {
	return {
		type: "number",
		value: "100",
	}
}

RollExpr = BracketExpression / Integer;

Expression = InlineExpression / AddSubExpression / BracketExpression;

BracketExpression = "(" expr:AddSubExpression ")" _ label:Label? {
	if (label) {
		expr.label = label;
	}

	return expr;
}

AddSubExpression = head:MultDivExpression tail:(_ ("+" / "-") _ MultDivExpression)* {
	if (tail.length == 0) {
		return head;
	}

	const ops = tail
		.map((element) => ({
			type: "math",
			op: element[1],
			tail: element[3],
		}));

	return {
		head,
		type: "expression",
		ops,
	};
}

MultDivExpression = head:RollOrBrackets tail:(_ ("*" / "/") _ RollOrBrackets)* {
	if (tail.length == 0) {
		return head;
	}

	const ops = tail
		.map((element) => ({
			type: "math",
			op: element[1],
			tail: element[3],
		}));

	return {
		head,
		type: "expression",
		ops,
	};
}

RollOrBrackets = AnyRoll / BracketExpression

Integer "integer" = [0-9]+ {
	const num = parseInt(text(), 10);
	return {
		type: "number",
		value: num,
	}
}

Label = "[" label:([^\]]+) "]" {
	return label.join("")
}

_ "whitespace"
	= [ \t\n\r]*