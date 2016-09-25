{
	function generateRoll(die, order) {
		let roll = 0;

		if (die == "f") {
			roll = Math.floor(Math.random() * 3) - 1;
		} else {
			roll = Math.floor(Math.random() * die) + 1;
		}

		return {
			order: order,
			roll: roll,
			success: false,
			type: die == "f" ? "fateroll" : "roll",
			valid: true,
			value: roll,
		};
	}

	function successTest(mod, target, value) {
		switch (mod) {
			case ">":
				return value >= target;
			case "<":
				return value <= target;
			case "=":
			default:
				return value == target;
		}

		return false;
	}
}

start = expr:Expression .* {
	expr.type = "root" + expr.type;

	return expr;
}

AnyRoll = ModGroupedRoll / FullRoll / Integer

ModGroupedRoll = group:GroupedRoll mods:(GroupSuccessMod / GroupFailureMod / GroupKeepMod / GroupDropMod)* {
	if (group.type == "groupExpression") {
		let rolls = [];

		for (let i = 0; i < group.dice.length; i++) {
			for (let roll of group.dice[i].rolls) {
				roll.dieNumber = i;
				rolls.push(roll);
			}
		}

		rolls = mods.reduce((rolls, mod) => {
			return mod(rolls);
		}, rolls);

		for (let roll of rolls) {
			group.dice[roll.dieNumber].rolls[roll.order] = roll;
			delete roll.dieNumber;
		}
	} else {
		group.dice = mods.reduce((dice, mod) => {
			return mod(dice);
		}, group.dice);
	}

	return group;
}

GroupSuccessMod = mod:(">"/"<"/"=") expr:RollExpr {
	return (dice) => {
		dice.map((die) => {
			if (successTest(mod, expr.value, die.value)) {
				die.value = 1;
				die.success = true;
			}
		});
	}
}

GroupFailureMod = "f" mod:(">"/"<"/"=")? expr:RollExpr {
	return (dice) => {
		dice.map((die) => {
			if (successTest(mod, expr.value, die.value)) {
				die.value = -1;
				die.success = true;
			}
		});
	}
}

GroupKeepMod = "k" highlow:("l" / "h")? expr:RollExpr? {
	return (dice) => {
		dice = dice.sort((a, b) => {
			if (highlow == "l") {
				return b.value - a.value;
			} else {
				return a.value - b.value;
			}
		});

		let toKeep = Math.max(Math.min(expr ? expr.value : 1, dice.length), 0);

		for (let i = 0; i < dice.length - toKeep; i++) {
			dice[i].valid = false;
		}

		return dice.sort((a, b) => {
			return a.order - b.order;
		});
	}
}

GroupDropMod = "d" highlow:("l" / "h")? expr:RollExpr? {
	return (dice) => {
		dice = dice.sort((a, b) => {
			if (highlow == "l") {
				return b.value - a.value;
			} else {
				return a.value - b.value;
			}
		});

		let toDrop = Math.max(Math.min(expr ? expr.value : 1, dice.length), 0);

		for (let i = 0; i < toDrop; i++) {
			dice[i].valid = false;
		}

		return dice.sort((a, b) => {
			return a.order - b.order;
		});
	}
}

GroupedRoll = "{" _ head:(GroupRollExpression / RollExpression) tail:(_ "," _ (GroupRollExpression / RollExpression))* _ "}" {
	if (tail.length == 0) {
		return head;
	}

	const result = tail.reduce(function(result, element) {
		return result + element[3].value;
	}, head.value);

	head.order = 0;

	return {
		dice: [head].concat(tail.map((element, i) => {
			element[3].order = i + 1;
			return element[3];
		})),
		type: "group",
		success: false,
		valid: true,
		value: result,
	}
}

GroupRollExpression = head:FullRoll tail:(_ "+" _ FullRoll)* {
	if (tail.length == 0) {
		return head;
	}

	const result = tail.reduce(function(result, element) {
		return result + element[3].value;
	}, head.value);

	const dice = [head].concat(tail.map((element, i) => {
		element[3].order = i + 1;
		return element[3];
	}));

	return {
		dice: dice,
		type: "groupExpression",
		success: false,
		valid: true,
		value: result,
	};
}

RollExpression = head:RollOrExpression tail:(_ ("+"/"-") _ RollOrExpression)* {
	if (tail.length == 0) {
		return head;
	}

	const result = tail.reduce(function(result, element) {
		if (element[1] === "+") { return result + element[3].value; }
		if (element[1] === "-") { return result - element[3].value; }
	}, head.value);

	const dice = [head].concat(tail.map((element, i) => {
		element[3].order = i + 1;
		return element[3];
	}));

	return {
		dice: dice,
		type: "diceExpression",
		success: false,
		valid: true,
		value: result,
	};
}

RollOrExpression = FullRoll / Expression

FullRoll = roll:TargetedRoll {
	roll.value = roll.rolls.reduce((result, roll) => {
		return roll.valid ? result + roll.value : result;
	}, 0);

	return roll;
}

TargetedRoll = head:RolledModRoll mods:(DropMod / KeepMod)* target:(SuccessMod / FailureMod)* sort:(SortAscMod / SortDescMod)? {
	if (mods.length > 0) {
		head.rolls = mods.reduce((rolls, mod) => {
			return mod(rolls);
		}, head.rolls);
	}

	if (target.length > 0) {
		head.rolls = target.reduce((rolls, mod) => {
			return mod(rolls);
		}, head.rolls).map((roll) => {
			if (!roll.success) {
				roll.value = 0;
				roll.success = true;
			}
			return roll;
		});
	}

	if (sort) {
		head.rolls = sort(head.rolls);
	}

	return head;
}

SortAscMod = "sa" {
	return (rolls) => {
		rolls = rolls.sort((a, b) => {
			return a.roll - b.roll;
		});

		for (let i = 0; i < rolls.length; i++) {
			rolls[i].order = i;
		}

		return rolls;
	}
}

SortDescMod = "sd" {
	return (rolls) => {
		rolls = rolls.sort((a, b) => {
			return b.roll - a.roll;
		});

		for (let i = 0; i < rolls.length; i++) {
			rolls[i].order = i;
		}

		return rolls;
	}
}

SuccessMod = mod:(">"/"<"/"=") expr:RollExpr {
	return (rolls) => {
		return rolls.map((roll) => {
			if (roll.valid && successTest(mod, expr.value, roll.roll)) {
				roll.value = 1;
				roll.success = true;
			}
			return roll;
		});
	}
}

FailureMod = "f" mod:(">"/"<"/"=")? expr:RollExpr {
	return (rolls) => {
		return rolls.map((roll) => {
			if (roll.valid && successTest(mod, expr.value, roll.roll)) {
				roll.value = -1;
				roll.success = true;
			}
			return roll;
		});
	}
}

DropMod = "d" mod:("l" / "h")? expr:RollExpr? {
	return (rolls) => {

		rolls = rolls.sort((a, b) => {
			if (mod == "h") {
				return b.roll - a.roll;
			} else {
				return a.roll - b.roll;
			}
		}).sort((a, b) => {
			return b.valid - a.valid;
		});

		let toDrop = Math.max(Math.min(expr ? expr.value : 1, rolls.length), 0);

		for (let i = 0; i < toDrop; i++) {
			rolls[i].valid = false;
		}

		return rolls.sort((a, b) => {
			return a.order - b.order;
		});
	}
}

KeepMod = "k" mod:("l" / "h")? expr:RollExpr? {
	return (rolls) => {
		if (rolls.length == 0) return rolls;

		rolls = rolls.sort((a, b) => {
			if (mod == "l") {
				return b.roll - a.roll;
			} else {
				return a.roll - b.roll;
			}
		}).sort((a, b) => {
			return a.valid - b.valid;
		});

		let toKeep = Math.max(Math.min(expr ? expr.value : 1, rolls.length), 0);

		for (let i = 0; i < rolls.length - toKeep; i++) {
			rolls[i].valid = false;
		}

		return rolls.sort((a, b) => {
			return a.order - b.order;
		});
	}
}

RolledModRoll = head:DiceRoll tail:(CompoundRoll / PenetrateRoll / ExplodeRoll / ReRollOnceMod / ReRollMod)* {
	head.rolls = tail.reduce((rolls, mod) => {
		return mod(rolls, head.die);
	}, head.rolls);

	return head;
}

ExplodeRoll = "!" target:TargetMod? {
	return (rolls, die) => {
		target = target ? target : successTest.bind(null, "=", die.value);

		for (let i = 0; i < rolls.length; i++) {
			let curValue = rolls[i].roll;
			rolls[i].order = i;
			let explodeCount = 0;

			while (target(curValue) && explodeCount++ < 1000) {
				const newRoll = generateRoll(die.value, ++i);
				rolls.splice(i, 0, newRoll);
				curValue = newRoll.roll;
			}
		}

		return rolls;
	}
}

CompoundRoll = "!!" target:TargetMod? {
	return (rolls, die) => {
		target = target ? target : successTest.bind(null, "=", die.value);

		for (let i = 0; i < rolls.length; i++) {
			let rollValue = rolls[i].roll;
			let curValue = rolls[i].roll;
			let explodeCount = 0;

			while (target(curValue) && explodeCount++ < 1000) {
				const newRoll = generateRoll(die.value, i + 1);
				rollValue += newRoll.roll;
				curValue = newRoll.roll;
			}

			rolls[i].value = rollValue;
			rolls[i].roll = rollValue;
		}

		return rolls;
	}
}

PenetrateRoll = "!p" target:TargetMod? {
	return (rolls, die) => {
		target = target ? target : successTest.bind(null, "=", die.value);

		for (let i = 0; i < rolls.length; i++) {
			let curValue = rolls[i].roll;
			rolls[i].order = i;

			let explodeCount = 0;

			while (target(curValue) && explodeCount++ < 1000) {
				const newRoll = generateRoll(die.value, ++i);
				newRoll.value -= 1;
				newRoll.roll -= 1;
				rolls.splice(i, 0, newRoll);
				curValue = newRoll.roll;
			}
		}

		return rolls;
	}
}

ReRollMod = "r" target:TargetMod? {
	target = target ? target : successTest.bind(null, "=", 1);

	return (rolls, die) => {
		for (let i = 0; i < rolls.length; i++) {
			while (target(rolls[i].roll)) {
				rolls[i].valid = false;
				const newRoll = generateRoll(die.value, i + 1);
				rolls.splice(++i, 0, newRoll);
			}
		}

		return rolls;
	}
}

ReRollOnceMod = "ro" target:TargetMod? {
	target = target ? target : successTest.bind(null, "=", 1);

	return (rolls, die) => {
		for (let i = 0; i < rolls.length; i++) {
			if (target(rolls[i].roll)) {
				rolls[i].valid = false;
				const newRoll = generateRoll(die.value, i + 1);
				rolls.splice(++i, 0, newRoll);
			}
		}

		return rolls;
	}
}

TargetMod = mod:(">"/"<"/"=")? value:RollExpr {
	return successTest.bind(null, mod, value.value);
}

DiceRoll = head:RollExpr? "d" tail:(FateExpr / RollExpr) {
	const rolls = [];
	head = head ? head : { type: "number", value: 1 };

	if (head.value > 100) {
		throw new Error("Entered number of dice too large");
	}

	for (let i = 0; i < head.value; i++) {
		rolls.push(generateRoll(tail.value, i));
	}

	return {
		die: tail,
		count: head,
		rolls: rolls,
		type: "die",
		valid: true,
		value: 0,
	};
}

FateExpr = ("F" / "f") {
	return {
		type: "fate",
		value: "f",
	}
}

RollExpr = BracketExpression / Integer;

Expression = NonExpression / BracketExpression;

BracketExpression = "(" expr:NonExpression ")" {
	return expr;
}

NonExpression = head:Term tail:(_ ("+" / "-") _ Term)* {
	if (tail.length == 0) {
		return head;
	}

	const result = tail.reduce(function(result, element) {
		if (element[1] === "+") { return result + element[3].value; }
		if (element[1] === "-") { return result - element[3].value; }
	}, head.value);

	head.order = 0;

	return {
		dice: [head].concat(tail.map(function(element, i) {
			element[3].order = i + 1;
			return element[3];
		})),
		ops: tail.map((element) => element[1]),
		type: "expression",
		valid: true,
		value: result,
	};
}

Term = head:Factor tail:(_ ("*" / "/") _ Factor)* {
	if (tail.length == 0) {
		return head;
	}

	const result = tail.reduce(function(result, element) {
		if (element[1] === "*") { return result * element[3].value; }
		if (element[1] === "/") { return result / element[3].value; }
	}, head.value);

	return {
		dice: [head].concat(tail.map(function(element, i) {
			element[3].order = i + 1;
			return element[3];
		})),
		ops: tail.map((element) => element[1]),
		type: "expression",
		valid: true,
		value: result,
	};
}

Factor = AnyRoll / BracketExpression

Integer "integer" = [0-9]+ {
	const num = parseInt(text(), 10);
	return {
		type: "number",
		value: num,
	}
}

_ "whitespace"
	= [ \t\n\r]*