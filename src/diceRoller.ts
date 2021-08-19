// tslint:disable-next-line: no-var-requires
const parser = require("./diceroll.js");
import {
	RootType, DiceRoll, NumberType, InlineExpression, RollExpressionType, MathType, GroupedRoll, SortRollType, SuccessFailureCritModType,
	ReRollMod, FullRoll, ParsedType, MathExpression, KeepDropModType, SuccessFailureModType, MathFunctionExpression
} from "./parsedRollTypes";
import {
	RollBase, DiceExpressionRoll, GroupRoll, DiceRollResult, DieRollBase, ExpressionRoll, DieRoll, FateDieRoll, GroupedRollBase, MathFunctionRoll
} from "./rollTypes";

export class DiceRoller {
	public randFunction: () => number = Math.random;
	public maxRollCount = 1000;

	/**
	 * The DiceRoller class that performs parsing and rolls of {@link https://wiki.roll20.net/Dice_Reference roll20 format} input strings
	 * @constructor
	 * @param randFunction The random number generator function to use when rolling, default: Math.random
	 * @param maxRolls The max number of rolls to perform for a single die, default: 1000
	 */
	constructor(randFunction?: () => number, maxRolls = 1000) {
		if (randFunction) {
			this.randFunction = randFunction;
		}
		this.maxRollCount = maxRolls;
	}

	/**
	 * Parses and returns an representation of a dice roll input string
	 * @param input The input string to parse
	 * @returns A {@link RootType} object representing the parsed input string
	 */
	public parse(input: string): RootType {
		return parser.parse(input);
	}

	/**
	 * Parses and rolls a dice roll input string, returning an object representing the roll
	 * @param input The input string to parse
	 * @returns A {@link RollBase} object representing the rolled dice input string
	 */
	public roll(input: string): RollBase {
		const root = parser.parse(input);
		return this.rollType(root);
	}

	/**
	 * Parses and rolls a dice roll input string, returning the result as a number
	 * @param input The input string to parse
	 * @returns The final number value of the result
	 */
	public rollValue(input: string): number {
		return this.roll(input).value;
	}

	/**
	 * Rolls a previously parsed dice roll input string, returning an object representing the roll
	 * @param parsed A parsed input as a {@link RootType} string to be rolled
	 * @returns A {@link RollBase} object representing the rolled dice input string
	 */
	public rollParsed(parsed: RootType): RollBase {
		return this.rollType(parsed);
	}

	private rollType(input: RootType): RollBase {
		let response: RollBase;

		switch (input.type) {
			case "diceExpression":
				response = this.rollDiceExpr(input as RollExpressionType);
				break;
			case "group":
				response = this.rollGroup(input as GroupedRoll);
				break;
			case "die":
				response = this.rollDie(input as DiceRoll);
				break;
			case "expression":
				response = this.rollExpression(input as MathExpression);
				break;
			case "mathfunction":
				response = this.rollFunction(input as MathFunctionExpression);
				break;
			case "inline":
				response = this.rollType((input as InlineExpression).expr);
				break;
			case "number":
				response = {
					...(input as NumberType),
					success: false,
					valid: true,
					order: 0,
				}
				break;
			default:
				throw new Error(`Unable to render ${input.type}`);
		}

		if (input.label) {
			response.label = input.label;
		}

		return response;
	}

	private rollDiceExpr(input: RollExpressionType): DiceExpressionRoll {
		const headRoll = this.rollType(input.head);
		const rolls = [headRoll];
		const ops: ("+" | "-")[] = [];

		const value = input.ops
			.reduce((headValue, math, order: number) => {
				const tailRoll = this.rollType(math.tail);
				tailRoll.order = order;

				rolls.push(tailRoll);
				ops.push(math.op);

				switch (math.op) {
					case "+":
						return headValue + tailRoll.value;
					case "-":
						return headValue - tailRoll.value;
					default:
						return headValue;
				}
			}, headRoll.value);

		return {
			dice: rolls,
			ops,
			success: false,
			type: "diceexpressionroll",
			valid: true,
			value,
			order: 0,
		}
	}

	private rollGroup(input: GroupedRoll): GroupRoll {
		let rolls: RollBase[] = input.rolls.map((roll, order) => ({
			...this.rollType(roll),
			order,
		}));

		if (input.mods) {
			const mods = input.mods;
			const applyGroupMods = (dice: RollBase[]) => {
				const isSuccess = mods.some((mod) => ["failure", "success"].includes(mod.type));
				dice = mods
					.reduce((arr, mod) => this.applyGroupMod(arr, mod), dice);

				if (isSuccess) {
					dice = dice.map((die) => {
						if (!die.success) {
							die.value = 0;
							die.success = true;
						}
						return die;
					});
				}

				return dice;
			}

			if (rolls.length === 1 && ["die", "diceexpressionroll"].includes(rolls[0].type)) {
				const roll = rolls[0];
				let dice = roll.type === "die"
					? (roll as DiceRollResult).rolls
					: (roll as DiceExpressionRoll).dice
						.filter((die) => die.type !== "number")
						.reduce((arr: RollBase[], die) => [
							...arr,
							...die.type === "die"
								? (die as DiceRollResult).rolls
								: (die as GroupedRollBase).dice,
						], []);

				dice = applyGroupMods(dice);
				roll.value = dice.reduce((sum, die) => die.valid ? sum + die.value : sum, 0);
			} else {
				rolls = applyGroupMods(rolls);
			}
		}

		return {
			dice: rolls,
			success: false,
			type: "grouproll",
			valid: true,
			value: rolls.reduce((sum, roll) => !roll.valid ? sum : sum + roll.value, 0),
			order: 0,
		}
	}

	private rollDie(input: FullRoll): DiceRollResult {
		const count = this.rollType(input.count);

		if (count.value > this.maxRollCount) {
			throw new Error("Entered number of dice too large.");
		}

		let rolls: DieRollBase[];
		let die: RollBase;
		if (input.die.type === "fate") {
			die = {
				type: "fate",
				success: false,
				valid: false,
				value: 0,
				order: 0,
			};
			rolls = Array.from({ length: count.value }, (_, i) => this.generateFateRoll(i));
		} else {
			die = this.rollType(input.die);
			rolls = Array.from({ length: count.value }, (_, i) => this.generateDiceRoll(die.value, i));
		}

		if (input.mods) {
			rolls = input.mods
				.reduce((moddedRolls, mod) => this.applyMod(moddedRolls, mod), rolls);
		}

		if (input.targets) {
			rolls = input.targets
				.reduce((moddedRolls, target) => this.applyMod(moddedRolls, target), rolls)
				.map((roll) => {
					if (!roll.success) {
						roll.value = 0;
						roll.success = true;
					}
					return roll;
				});
		}

		let matched = false;
		let matchCount = 0;
		if (input.match) {
			const match = input.match;
			const counts = rolls.reduce((map: Map<number, number>, roll) =>
				map.set(roll.roll, (map.get(roll.roll) || 0) + 1),
				new Map());

			const matches = new Set(Array.from(counts.entries())
				.filter(([_, matchedCount]) => matchedCount >= match.min.value)
				.filter(([val]) => !(match.mod
					&& match.expr)
					|| this.successTest(match.mod, this.rollType(match.expr).value, val))
				.map(([val]) => val));

			rolls.filter((roll) => matches.has(roll.roll))
				.forEach((roll) => roll.matched = true);

			if (match.count) {
				matched = true;
				matchCount = matches.size;
			}
		}

		if (input.sort) {
			rolls = this.applySort(rolls, input.sort);
		}

		return {
			count,
			die,
			rolls,
			success: false,
			type: "die",
			valid: true,
			value: matched ? matchCount : rolls.reduce((sum, roll) => !roll.valid ? sum : sum + roll.value, 0),
			order: 0,
			matched,
		}
	}

	private rollExpression(input: RollExpressionType | MathExpression): ExpressionRoll {
		const headRoll = this.rollType(input.head);
		const rolls = [headRoll];
		const ops: ("+" | "-" | "*" | "/" | "%" | "**")[] = [];

		const value = (input.ops as MathType<any>[])
			.reduce((headValue: number, math) => {
				const tailRoll = this.rollType(math.tail);
				rolls.push(tailRoll);
				ops.push(math.op);

				switch (math.op) {
					case "+":
						return headValue + tailRoll.value;
					case "-":
						return headValue - tailRoll.value;
					case "*":
						return headValue * tailRoll.value;
					case "/":
						return headValue / tailRoll.value;
					case "%":
						return headValue % tailRoll.value;
					case "**":
						return headValue ** tailRoll.value;
					default:
						return headValue;
				}
			}, headRoll.value);

		return {
			dice: rolls,
			ops,
			success: false,
			type: "expressionroll",
			valid: true,
			value,
			order: 0,
		}
	}

	private rollFunction(input: MathFunctionExpression): MathFunctionRoll {
		const expr = this.rollType(input.expr);

		let value: number;
		switch (input.op) {
			case "floor":
				value = Math.floor(expr.value);
				break;
			case "ceil":
				value = Math.ceil(expr.value);
				break;
			case "round":
				value = Math.round(expr.value);
				break;
			case "abs":
				value = Math.abs(expr.value);
				break;
			default:
				value = expr.value;
				break;
		}

		return {
			expr,
			op: input.op,
			success: false,
			type: "mathfunction",
			valid: true,
			value,
			order: 0,
		}
	}

	private applyGroupMod(rolls: RollBase[], mod: ParsedType): RollBase[] {
		return this.getGroupModMethod(mod)(rolls);
	}

	private getGroupModMethod(mod: ParsedType): GroupModMethod {
		const lookup = (roll: RollBase) => roll.value;
		switch (mod.type) {
			case "success":
				return this.getSuccessMethod(mod as SuccessFailureModType, lookup);
			case "failure":
				return this.getFailureMethod(mod as SuccessFailureModType, lookup);
			case "keep":
				return this.getKeepMethod(mod as KeepDropModType, lookup);
			case "drop":
				return this.getDropMethod(mod as KeepDropModType, lookup);
			default:
				throw new Error(`Mod ${mod.type} is not recognised`);
		}
	}

	private applyMod(rolls: DieRollBase[], mod: ParsedType): DieRollBase[] {
		return this.getModMethod(mod)(rolls);
	}

	private getModMethod(mod: ParsedType): ModMethod {
		const lookup = (roll: DieRollBase) => roll.roll;
		switch (mod.type) {
			case "success":
				return this.getSuccessMethod(mod as SuccessFailureCritModType, lookup);
			case "failure":
				return this.getFailureMethod(mod as SuccessFailureCritModType, lookup);
			case "crit":
				return this.getCritSuccessMethod(mod as SuccessFailureCritModType, lookup);
			case "critfail":
				return this.getCritFailureMethod(mod as SuccessFailureCritModType, lookup);
			case "keep":
				return (rolls) =>
					this.getKeepMethod(mod as KeepDropModType, lookup)(rolls)
						.sort((a, b) => a.order - b.order);
			case "drop":
				return (rolls) =>
					this.getDropMethod(mod as KeepDropModType, lookup)(rolls)
						.sort((a, b) => a.order - b.order);
			case "explode":
				return this.getExplodeMethod((mod as ReRollMod));
			case "compound":
				return this.getCompoundMethod((mod as ReRollMod));
			case "penetrate":
				return this.getPenetrateMethod((mod as ReRollMod));
			case "reroll":
				return this.getReRollMethod((mod as ReRollMod));
			case "rerollOnce":
				return this.getReRollOnceMethod((mod as ReRollMod));
			default:
				throw new Error(`Mod ${mod.type} is not recognised`);
		}
	}

	private applySort(rolls: DieRollBase[], mod: SortRollType) {
		rolls.sort((a, b) => mod.asc ? a.roll - b.roll : b.roll - a.roll);
		rolls.forEach((roll, i) => roll.order = i);
		return rolls;
	}

	private getCritSuccessMethod<T extends DieRollBase>(mod: SuccessFailureCritModType, lookup: (roll: T) => number) {
		const exprResult = this.rollType(mod.expr);

		return (rolls: T[]) => {
			return rolls.map((roll) => {
				if (!roll.valid) return roll;
				if (roll.type !== "roll") return roll;
				if (roll.success) return roll;

				const critRoll = (roll as unknown as DieRoll);
				if (this.successTest(mod.mod, exprResult.value, lookup(roll))) {
					critRoll.critical = "success";
				} else if (critRoll.critical === "success") {
					critRoll.critical = null;
				}

				return roll;
			});
		}
	}

	private getCritFailureMethod<T extends DieRollBase>(mod: SuccessFailureCritModType, lookup: (roll: T) => number) {
		const exprResult = this.rollType(mod.expr);

		return (rolls: T[]) => {
			return rolls.map((roll) => {
				if (!roll.valid) return roll;
				if (roll.type !== "roll") return roll;
				if (roll.success) return roll;

				const critRoll = (roll as unknown as DieRoll);
				if (this.successTest(mod.mod, exprResult.value, lookup(roll))) {
					critRoll.critical = "failure";
				} else if (critRoll.critical === "failure") {
					critRoll.critical = null;
				}

				return roll;
			});
		}
	}

	private getSuccessMethod<T extends RollBase>(mod: SuccessFailureCritModType, lookup: (roll: T) => number) {
		const exprResult = this.rollType(mod.expr);

		return (rolls: T[]) => {
			return rolls.map((roll) => {
				if (!roll.valid) { return roll; }

				if (this.successTest(mod.mod, exprResult.value, lookup(roll))) {
					if (roll.success) {
						roll.value += 1;
					} else {
						roll.value = 1;
						roll.success = true;
					}
				}
				return roll;
			});
		}
	}

	private getFailureMethod<T extends RollBase>(mod: SuccessFailureCritModType, lookup: (roll: T) => number) {
		const exprResult = this.rollType(mod.expr);

		return (rolls: T[]) => {
			return rolls.map((roll) => {
				if (!roll.valid) { return roll; }

				if (this.successTest(mod.mod, exprResult.value, lookup(roll))) {
					if (roll.success) {
						roll.value -= 1;
					} else {
						roll.value = -1;
						roll.success = true;
					}
				}
				return roll;
			});
		}
	}

	private getKeepMethod<T extends RollBase>(mod: KeepDropModType, lookup: (roll: T) => number) {
		const exprResult = this.rollType(mod.expr);

		return (rolls: T[]) => {
			if (rolls.length === 0) return rolls;

			rolls = rolls
				.sort((a, b) => mod.highlow === "l"
					? lookup(b) - lookup(a)
					: lookup(a) - lookup(b))
				.sort((a, b) => (a.valid ? 1 : 0) - (b.valid ? 1 : 0));

			const toKeep = Math.max(Math.min(exprResult.value, rolls.length), 0);
			let dropped = 0;
			let i = 0;

			const toDrop = rolls.reduce((value, roll) => (roll.valid ? 1 : 0) + value, 0) - toKeep;

			while (i < rolls.length && dropped < toDrop) {
				if (rolls[i].valid) {
					rolls[i].valid = false;
					rolls[i].drop = true
					dropped++;
				}

				i++;
			}

			return rolls;
		}
	}

	private getDropMethod<T extends RollBase>(mod: KeepDropModType, lookup: (roll: T) => number) {
		const exprResult = this.rollType(mod.expr);

		return (rolls: T[]) => {
			rolls = rolls.sort((a, b) => mod.highlow === "h"
				? lookup(b) - lookup(a)
				: lookup(a) - lookup(b));

			const toDrop = Math.max(Math.min(exprResult.value, rolls.length), 0);
			let dropped = 0;
			let i = 0;

			while (i < rolls.length && dropped < toDrop) {
				if (rolls[i].valid) {
					rolls[i].valid = false;
					rolls[i].drop = true
					dropped++;
				}

				i++;
			}

			return rolls;
		}
	}

	private getExplodeMethod(mod: ReRollMod) {
		const targetValue = mod.target
			? this.rollType(mod.target.value)
			: null;

		return (rolls: DieRollBase[]) => {
			const targetMethod = targetValue
				? (roll: DieRollBase) => this.successTest(mod.target.mod, targetValue.value, roll.roll)
				: (roll: DieRollBase) => this.successTest("=", roll.type === "fateroll" ? 1 : (roll as DieRoll).die, roll.roll);

			if (
				rolls[0].type === "roll"
				&& targetMethod({ roll: 1 } as DieRollBase)
				&& targetMethod({ roll: (rolls[0] as DieRoll).die } as DieRollBase)
			) {
				throw new Error("Invalid reroll target");
			}

			for (let i = 0; i < rolls.length; i++) {
				let roll = rolls[i];
				roll.order = i;
				let explodeCount = 0;

				while (targetMethod(roll) && explodeCount++ < 1000) {
					roll.explode = true
					const newRoll = this.reRoll(roll, ++i);
					rolls.splice(i, 0, newRoll);
					roll = newRoll;
				}
			}

			return rolls;
		}
	}

	private getCompoundMethod(mod: ReRollMod) {
		const targetValue = mod.target
			? this.rollType(mod.target.value)
			: null;

		return (rolls: DieRollBase[]) => {
			const targetMethod = targetValue
				? (roll: DieRollBase) => this.successTest(mod.target.mod, targetValue.value, roll.roll)
				: (roll: DieRollBase) => this.successTest("=", roll.type === "fateroll" ? 1 : (roll as DieRoll).die, roll.roll);

			if (
				rolls[0].type === "roll"
				&& targetMethod({ roll: 1 } as DieRollBase)
				&& targetMethod({ roll: (rolls[0] as DieRoll).die } as DieRollBase)
			) {
				throw new Error("Invalid reroll target");
			}

			for (let i = 0; i < rolls.length; i++) {
				let roll = rolls[i];
				let rollValue = roll.roll;
				let explodeCount = 0;

				while (targetMethod(roll) && explodeCount++ < 1000) {
					roll.explode = true
					const newRoll = this.reRoll(roll,i+1);
					rollValue += newRoll.roll;
					roll = newRoll;
				}

				rolls[i].value = rollValue;
				rolls[i].roll = rollValue;
			}

			return rolls;
		}
	}

	private getPenetrateMethod(mod: ReRollMod) {
		const targetValue = mod.target
			? this.rollType(mod.target.value)
			: null;

		return (rolls: DieRollBase[]) => {
			const targetMethod = targetValue
				? (roll: DieRollBase) => this.successTest(mod.target.mod, targetValue.value, roll.roll)
				: (roll: DieRollBase) => this.successTest("=", roll.type === "fateroll" ? 1 : (roll as DieRoll).die, roll.roll);

			if (targetValue
				&& rolls[0].type === "roll"
				&& targetMethod(rolls[0])
				&& this.successTest(mod.target.mod, targetValue.value, 1)
			) {
				throw new Error("Invalid reroll target");
			}

			for (let i = 0; i < rolls.length; i++) {
				let roll = rolls[i];
				roll.order = i;
				let explodeCount = 0;

				while (targetMethod(roll) && explodeCount++ < 1000) {
					roll.explode = true
					const newRoll = this.reRoll(roll, ++i);
					newRoll.value -= 1;
					newRoll.roll -= 1;
					rolls.splice(i, 0, newRoll);
					roll = newRoll;
				}
			}

			return rolls;
		}
	}

	private getReRollMethod(mod: ReRollMod) {
		const targetMethod = mod.target
			? this.successTest.bind(null, mod.target.mod, this.rollType(mod.target.value).value)
			: this.successTest.bind(null, "=", 1);

		return (rolls: DieRollBase[]) => {
			if (rolls[0].type === "roll" && targetMethod(1) && targetMethod((rolls[0] as DieRoll).die)) {
				throw new Error("Invalid reroll target");
			}

			for (let i = 0; i < rolls.length; i++) {
				while (targetMethod(rolls[i].roll)) {
					rolls[i].reroll = true
					rolls[i].valid = false;
					const newRoll = this.reRoll(rolls[i], i + 1);
					rolls.splice(++i, 0, newRoll);
				}
			}

			return rolls;
		}
	}

	private getReRollOnceMethod(mod: ReRollMod) {
		const targetMethod = mod.target
			? this.successTest.bind(null, mod.target.mod, this.rollType(mod.target.value).value)
			: this.successTest.bind(null, "=", 1);

		return (rolls: DieRollBase[]) => {
			if (rolls[0].type === "roll" && targetMethod(1) && targetMethod((rolls[0] as DieRoll).die)) {
				throw new Error("Invalid reroll target");
			}

			for (let i = 0; i < rolls.length; i++) {
				if (targetMethod(rolls[i].roll)) {
					rolls[i].reroll = true
					rolls[i].valid = false;
					const newRoll = this.reRoll(rolls[i], i + 1);
					rolls.splice(++i, 0, newRoll);
				}
			}

			return rolls;
		}
	}

	private successTest(mod: string, target: number, roll: number) {
		switch (mod) {
			case ">":
				return roll >= target;
			case "<":
				return roll <= target;
			case "=":
			default:
				// tslint:disable-next-line: triple-equals
				return roll == target;
		}
	}

	private reRoll(roll: DieRollBase, order: number): DieRollBase {
		switch (roll.type) {
			case "roll":
				return this.generateDiceRoll((roll as DieRoll).die, order);
			case "fateroll":
				return this.generateFateRoll(order);
			default:
				throw new Error(`Cannot do a reroll of a ${roll.type}.`);
		}
	}

	private generateDiceRoll(die: number, order: number): DieRoll {
		const roll = Math.floor(this.randFunction() * die) + 1;

		const critical = roll === die
			? "success"
			: roll === 1
				? "failure"
				: null;

		return {
			critical,
			die,
			matched: false,
			order,
			roll,
			success: false,
			type: "roll",
			valid: true,
			value: roll,
		}
	}

	private generateFateRoll(order: number): FateDieRoll {
		const roll = Math.floor(this.randFunction() * 3) - 1;

		return {
			matched: false,
			order,
			roll,
			success: false,
			type: "fateroll",
			valid: true,
			value: roll,
		}
	}
}

type ModMethod = (rolls: DieRollBase[]) => DieRollBase[]
type GroupModMethod = (rolls: RollBase[]) => RollBase[]
