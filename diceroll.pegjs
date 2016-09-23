{
	function generateRoll(die, order) {
		const roll = Math.floor(Math.random() * die) + 1;
		
		return {
			order: order,
			roll: roll,
			success: false,
			type: "roll",
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

start = ModGroupedRoll / RollExpression

ModGroupedRoll = group:GroupedRoll mods:(GroupSuccessMod / GroupFailureMod / GroupKeepMod / GroupDropMod)* {
	group.dice = mods.reduce((dice, mod) => {
		return mod(dice);
	}, group.dice);
	
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
		
		let toKeep = expr ? expr.value : 1;
		
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
		
		let toDrop = expr ? expr.value : 1;
		
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
	} else {
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
}

GroupRollExpression = head:FullRoll tail:(_ "+" _ FullRoll)* {
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

TargetedRoll = head:RolledModRoll mods:(DropMod / KeepMod)* target:(SuccessMod / FailureMod)* {
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
	
	return head;
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
		
		let toDrop = expr ? expr.value : 1;
		
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
		rolls = rolls.sort((a, b) => {
			if (mod == "l") {
				return b.roll - a.roll;
			} else {
				return a.roll - b.roll;
			}
		}).sort((a, b) => {
			return a.valid - b.valid;
		});
		
		let toKeep = expr ? expr.value : 1;
		
		for (let i = 0; i < rolls.length - toKeep; i++) {
			rolls[i].valid = false;
		}
		
		return rolls.sort((a, b) => {
			return a.order - b.order;
		});
	}
}

RolledModRoll = head:DiceRoll tail:(ExplodeRoll / CompoundRoll / PenetrateRoll / ReRollOnceMod / ReRollMod)* {
	head.rolls = tail.reduce((rolls, mod) => {
		return mod(rolls, head.die);
	}, head.rolls);
	
	return head;
}

ExplodeRoll = "!" target:TargetMod? {
	target = target ? target : successTest.bind(null, "=", head.die);
	
	return (rolls, die) => {
		for (let i = 0; i < rolls.length; i++) {
			rolls[i].order = i;
			
			if (target(rolls[i].roll)) {
				const newRoll = generateRoll(die.value, i + 1);
				rolls.splice(i + 1, 0, newRoll);
			}
		}
		
		return rolls;
	}
}

CompoundRoll = "!!" target:TargetMod? {
	target = target ? target : successTest.bind(null, "=", head.die);
	
	return (rolls, die) => {
		for (let i = 0; i < rolls.length; i++) {
			let rollValue = rolls[i].roll;
			let curValue = rolls[i].roll;
			
			while (target(curValue)) {
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
	target = target ? target : successTest.bind(null, "=", head.die);
	
	return (rolls, die) => {
		for (let i = 0; i < rolls.length; i++) {
			rolls[i].order = i;
			
			if (target(rolls[i].roll)) {
				const newRoll = generateRoll(die.value, i + 1);
				newRoll.value -= 1;
				newRoll.roll -= 1;
				rolls.splice(i + 1, 0, newRoll);
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
				const newRoll = generateRoll(die.value, i + 1);
				rolls.splice(i, 1, newRoll);
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
				const newRoll = generateRoll(die.value, i + 1);
				rolls.splice(i, 1, newRoll);
			}
		}
		
		return rolls;
	}
}

TargetMod = mod:(">"/"<"/"=")? value:RollExpr {
	return successTest.bind(null, mod, value.value);
}

DiceRoll = head:RollExpr? tail:("d" RollExpr) {
	const rolls = [];
	const value = head ? head.value : 1;
	
	for (let i = 0; i < value; i++) {
		rolls.push(generateRoll(tail[1].value, i));
	}
	
	return {
		die: tail[1],
		rolls: rolls,
		type: "die",
		value: 0,
	};
}

RollExpr = BracketExpression / IntExpr;

IntExpr = int:Integer {
	return {
		type: "expression",
		value: int,
	}
}

Expression = BracketExpression / NonExpression;

BracketExpression = "(" expr:Expression ")" {
	return expr;
}

NonExpression = head:Term tail:(_ ("+" / "-") _ Term)* {
	const result = tail.reduce(function(result, element) {
		if (element[1] === "+") { return result + element[3]; }
		if (element[1] === "-") { return result - element[3]; }
	}, head);
	
	return {
		type: "expression",
		value: result,
	};
}

Term = head:Factor tail:(_ ("*" / "/") _ Factor)* {
	return tail.reduce(function(result, element) {
		if (element[1] === "*") { return result * element[3]; }
		if (element[1] === "/") { return result / element[3]; }
	}, head);
}

Factor = "(" _ expr:Expression _ ")" { return expr; }
	/ Integer

Integer "integer" = [0-9]+ { return parseInt(text(), 10); }

_ "whitespace"
	= [ \t\n\r]*