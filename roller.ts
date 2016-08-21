var Parser = require("rd-parse");

interface Modifier {
    filter(rolls: Array<number>): Array<number>;
}
interface RollModifier {
    target: Target;
    matches(roll: number, dice: DiceRoll): boolean;
    apply(roll: number, dice: DiceRoll): Array<number>;
}

class Group {
    public dice: Array<DiceRoll> = [];
    public modifiers: Array<Modifier> = [];
}

class Penetrate implements RollModifier {
    public target: Target;

    public matches(roll: number, dice: DiceRoll): boolean {
    	if (this.target) {
        	return this.target.matches(roll);
        } else {
        	return dice.dieValue == roll;
        }
    }

    public apply(roll: number, dice: DiceRoll): Array<number> {
        const rolls: Array<number> = [ roll ];

        while (this.matches(roll, dice)) {
            roll = dice.roll();
            dice.rolls.pop();
            dice.rolls.push(roll - 1);
            rolls.push(roll - 1);
        }

        return rolls;
    }
}

class Compound implements RollModifier {
    public target: Target;

    public matches(roll: number, dice: DiceRoll): boolean {
    	if (this.target) {
        	return this.target.matches(roll);
        } else {
        	return dice.dieValue == roll;
        }
    }

    public apply(roll: number, dice: DiceRoll): Array<number> {
        let rollTotal: number = dice.rolls.pop();

        while (this.matches(roll, dice)) {
            dice.roll();
            roll = dice.rolls.pop();
            rollTotal += roll;
        }

        dice.rolls.push(rollTotal);

        return [ rollTotal ];
    }
}

class Explode implements RollModifier {
    public target: Target;

    public matches(roll: number, dice: DiceRoll): boolean {
    	if (this.target) {
        	return this.target.matches(roll);
        } else {
        	return dice.dieValue == roll;
        }
    }

    public apply(roll: number, dice: DiceRoll): Array<number> {
        const rolls: Array<number> = [ roll ];

        while (this.matches(roll, dice)) {
            roll = dice.roll();
            rolls.push(roll);
        }

        return rolls;
    }
}

class Reroll implements RollModifier {
    public target: Target;

    public matches(roll: number, dice: DiceRoll): boolean {
        return this.target.matches(roll);
    }

    public apply(roll: number, dice: DiceRoll): Array<number> {
        while (this.target.matches(roll)) {
            roll = dice.roll();
        }

        return [ roll ];
    }
}

class RerollOnce implements RollModifier {
    public target: Target;

    public matches(roll: number): boolean {
        return this.target.matches(roll);
    }

    public apply(roll: number, dice: DiceRoll): Array<number> {
        if (this.target.matches(roll)) {
            roll = dice.roll();
        }

        return [ roll ];
    }
}

class KeepLowest implements Modifier {
    public keepCount: number;
    public filter(rolls: Array<number>): Array<number> {
        const sortedRolls: Array<number> = rolls.slice().sort();
        return sortedRolls.slice(0, this.keepCount);
    }
}

class KeepHighest implements Modifier {
    public keepCount: number;
    public filter(rolls: Array<number>): Array<number> {
        const sortedRolls: Array<number> = rolls.slice().sort();
        return sortedRolls.slice(-this.keepCount);
    }
}

class DropLowest implements Modifier {
    public dropCount: number;
    public filter(rolls: Array<number>): Array<number> {
        const sortedRolls: Array<number> = rolls.slice().sort();
        return sortedRolls.slice(this.dropCount);
    }
}

class DropHighest implements Modifier {
    public dropCount: number;
    public filter(rolls: Array<number>): Array<number> {
        const sortedRolls: Array<number> = rolls.slice().sort();
        return sortedRolls.slice(0, -this.dropCount);
    }
}

class SortAsc implements Modifier {
    public filter(rolls: Array<number>): Array<number> {
        return rolls.sort();
    }
}

class SortDesc implements Modifier {
    public filter(rolls: Array<number>): Array<number> {
        return rolls.sort((a, b) => b-a);
    }
}

class Target implements Modifier {
    public targetNumber: number;
    public targetOp: string = "=";

    public filter(rolls: Array<number>) {
        return rolls.filter(this.matches);
    }

    public matches(value: number): boolean {
        switch (this.targetOp) {
            case ">":
                return value >= this.targetNumber;
            case "<":
                return value <= this.targetNumber;
            default:
            case "=":
                return value === this.targetNumber;
        }
    }
}

class DiceRoll {
    public rollNumber: number|Equation = 1;
    public dieNumber: number|Equation;
    public modifiers: Array<Modifier> = [];
    public rollModifiers: Array<RollModifier> = [];
    public rolls: Array<number> = [];
    public validRolls: Array<number> = [];
    public successRoll: boolean = false;
    public value: number;
    
    get dieValue(): number {
        if (this.dieNumber instanceof Equation) {
            return (<Equation>this.dieNumber).result();
        } else {
            return (<number>this.dieNumber);
        }
    }
    
    get rollValue(): number {
        if (this.rollNumber instanceof Equation) {
            return (<Equation>this.rollNumber).result();
        } else {
            return (<number>this.rollNumber);
        }
    }

    public rollAll(): Array<number> {
        if (this.validRolls.length === 0) {
            for (let i = 0; i < this.rollValue; i++) {
                const newRoll: number = this.roll();
                const modRolls = this.applyRollMod(newRoll);

                if (modRolls.length > 0) {
                    this.validRolls = this.validRolls.concat(modRolls);
                } else {
                    this.validRolls.push(newRoll);
                }
                console.log("roll", i, "value", newRoll, "valid", this.validRolls);
            }
        }

        return this.validRolls;
    }

    public applyRollMod(roll: number): Array<number> {
        let validRolls: Array<number> = [];
        for (let mod of this.rollModifiers) {
            if (mod.matches(roll, this)) {
                validRolls = mod.apply(roll, this);
            }
        }

        try {
            if (validRolls.length > 0) {
                validRolls = validRolls.concat(this.applyRollMod(validRolls.slice(-1)[0]));
            }
        } finally {
            return validRolls;
        }
    }

    public roll(): number {
        const newRoll: number = Math.ceil(Math.random() * this.dieValue);
        this.rolls.push(newRoll);
        return newRoll;
    }

    public applyMods(): Array<number> {
        let rolls: Array<number> = this.rollAll().slice();

        for (let mod of this.modifiers) {
            rolls = mod.filter(rolls);
        }

        return rolls;
    }
    
    public getValue(): number {
    	if (!this.value) {
	        this.rollAll();
	        const rolls: Array<number> = this.applyMods();
	        const result: number = rolls.reduce((val, el: number) => {
	            return val + el;
	        }, 0);
	        
	        this.value = result;
	    }
	    
        return this.value;
    }

    public print(): string {
        return this.toString() + " : " + JSON.stringify(this.rolls) + " (valid: "+JSON.stringify(this.validRolls)+") = " + result;
    }

    public toString(): string {
        return this.rollNumber.toString() + "d" + this.dieNumber.toString();
    }
}

class Equation {
    public left: number;
    public right: number;
    public op: string;
    public value: number;

    public result(): number {
    	if (!this.value) {
	        switch (this.op) {
	            case "+":
	            default:
	                this.value = this.left + this.right;
	            case "-":
	                this.value = this.left - this.right;
	            case "*":
	                this.value = this.left * this.right;
	            case "/":
	                this.value = this.left / this.right;
	        }
	    }
	    
	    return this.value;
    }

    public toString(): string {
        return "(" + this.left + " " + this.op + " " + this.right + ")";
    }
}

class DiceEquation {
    public left: DiceRoll|DiceEquation;
    public right: DiceRoll|DiceEquation;
    public op: string;

    public result(): number {
        return 0;
    }
}

function Grammar(All, Any, Plus, Optional, Char, Capture) {
    const fluff = Plus(Char(/[ \t]/));
    const skip = Optional(fluff);
    const number = Plus(Char(/[0-9]/));
    const operator = Char(/[+\-\*\/]/);
    const equation = Any(number, All(Char(/\(/), Capture(All(Capture(number, "operand"), skip, Capture(operator, "operator"), skip, Capture(number, "operand")), "equationEnd", "equationStart"), Char(/\)/)));
    const die = All(Capture(equation, "rollCountEnd", "rollCountStart"), Char(/d/), Capture(Any(equation, Char(/F/)), "rollNumberEnd", "rollNumberStart"));
    const target = All(Optional(Capture(Char(/[><=]/), "targetMod")), Capture(number, "targetLim"));
    
    // Roll Modifiers
    const explode = All(Char(/!/), Capture(Optional(target), "explodeEnd", "explodeStart"));
    const compound = All(Char(/!/), Char(/!/), Capture(Optional(target), "compoundEnd", "compoundStart"));
    const penetrate = All(Char(/!/), Char(/p/), Capture(Optional(target), "penetrateEnd", "penetrateStart"));
    const reroll = Plus(All(Char(/r/), Capture(target, "rerollEnd", "rerollStart")));
    const rerollOnce = Plus(All(Char(/r/), Char(/o/), Capture(target, "rerollOnceEnd", "rerollOnceStart")));
    
    // Value Modifiers
    const failure = All(Char(/f/), Capture(Any(number, target), "failureEnd", "failureStart"));
    const success = Capture(All(Plus(target), Optional(Plus(failure))), "successStart", "successEnd");
    const keepLower = All(Char(/k/), Char(/l/), Capture(number, "keepLower"));
    const keepHigher = All(Char(/k/), Optional(Char(/h/)), Capture(number, "keepHigher"));
    const dropHigher = All(Char(/d/), Char(/h/), Capture(number, "dropHigher"));
    const dropLower = All(Char(/d/), Optional(Char(/l/)), Capture(number, "dropLower"));
    
    // Sort Modifiers
    const sortAsc = Capture(All(Char(/s/), Optional(Char(/a/))), "sortAsc");
    const sortDesc = Capture(All(Char(/s/), Char(/d/)), "sortDesc");
    
    // All Modifiers
    const rollModifier = Plus(Any(compound, penetrate, explode, reroll, rerollOnce));
    const valueModifier = Any(success, keepHigher, keepLower, dropLower, dropHigher);
    const sortModifier = Any(sortAsc, sortDesc);
    const modifier = All(Optional(rollModifier), Optional(valueModifier), Optional(sortModifier));
    
    const dieRoll = All(die, Optional(modifier));
    const group = Capture(All(Char(/\{/), skip, dieRoll, Plus(All(skip, Any(operator, Char(/,/)), skip, dieRoll)), skip, Char(/\}/), Optional(valueModifier)), "groupEnd", "groupStart");
    const roll = Any(group, dieRoll, Capture(number, "rawNumber"));
    const multiRoll = All(roll, Optional(Plus(All(skip, Capture(Char(/[+,]/), "diceOp"), skip, roll))));
    // const text = Plus(Char(/[^ ]/));

    return multiRoll;
}

const rollString = "5d2!p";

const p = new Parser(Grammar);
const result = p.parse(rollString);
var r = result[0].next;
let curRoll: DiceRoll;
let curEqn: Equation;
let curGroup: Group;
let curTarget: Target;
let rolls: Array<Group|DiceRoll|number> = [];
let curMod: Modifier;
let curRollMod: RollModifier;

for (; r; r = r.next) {
    switch (r.name) {
        case "rollCountStart":
            if (!curRoll) {
                curRoll = new DiceRoll();
            }
            break;
        case "rollCountEnd":
            if (curEqn) {
                curRoll.rollNumber = curEqn;
                curEqn = null;
            } else {
                curRoll.rollNumber = parseInt(r.value, 10);
            }
            break;
        case "rollNumberStart":
            if (!curRoll) {
                curRoll = new DiceRoll();
            }
            break;
        case "rollNumberEnd":
            if (curEqn) {
                curRoll.dieNumber = curEqn;
                curEqn = null;
            } else {
                curRoll.dieNumber = parseInt(r.value, 10);
            }

            if (curGroup) {
                curGroup.dice.push(curRoll);
                curRoll = null;
            }
            break;
        case "diceOp":
            if (curRoll) {
                rolls.push(curRoll);
                curRoll = null;
            }
            break;
        case "targetMod":
            if (!curTarget) {
                curTarget = new Target();
            }
            curTarget.targetOp = r.value;
            break;
        case "targetLim":
            if (!curTarget) {
                curTarget = new Target();
            }
            curTarget.targetNumber = parseInt(r.value, 10);

            if (!curMod && !curRollMod) {
                if (curRoll) {
                    curRoll.modifiers.push(curTarget);
                } else if (curGroup) {
                    curGroup.modifiers.push(curTarget);
                }

                curTarget = null;
            }
            break;
        case "rerollStart":
            curRollMod = new Reroll();
            break;
        case "rerollEnd":
            if (curTarget) {
                curRollMod.target = curTarget;
                curTarget = null;
            }

            if (curRoll) {
                curRoll.rollModifiers.push(curRollMod);
            }

            curRollMod = null;
            break;
        case "rerollOnceStart":
            curRollMod = new RerollOnce();
            break;
        case "rerollOnceEnd":
            if (curTarget) {
                curRollMod.target = curTarget;
                curTarget = null;
            }

            if (curRoll) {
                curRoll.rollModifiers.push(curRollMod);
            }

            curRollMod = null;
            break;
        case "explodeStart":
            curRollMod = new Explode();
            break;
        case "explodeEnd":
            if (curTarget) {
                curRollMod.target = curTarget;
                curTarget = null;
            }

            if (curRoll) {
                curRoll.rollModifiers.push(curRollMod);
            }

            curRollMod = null;
            break;
        case "compoundStart":
            curRollMod = new Compound();
            break;
        case "compoundEnd":
            if (curTarget) {
                curRollMod.target = curTarget;
                curTarget = null;
            }

            if (curRoll) {
                curRoll.rollModifiers.push(curRollMod);
            }

            curRollMod = null;
            break;
        case "penetrateStart":
            curRollMod = new Penetrate();
            break;
        case "penetrateEnd":
            if (curTarget) {
                curRollMod.target = curTarget;
                curTarget = null;
            }

            if (curRoll) {
                curRoll.rollModifiers.push(curRollMod);
            }

            curRollMod = null;
            break;
        case "keepLower":
            const keepLower = new KeepLowest();
            keepLower.keepCount = parseInt(r.value, 10);

            if (curRoll) {
                curRoll.modifiers.push(keepLower);
            } else if (curGroup) {
                curGroup.modifiers.push(keepLower);
            }
            break;
        case "keepHigher":
            const keepHigher = new KeepHighest();
            keepHigher.keepCount = parseInt(r.value, 10);

            if (curRoll) {
                curRoll.modifiers.push(keepHigher);
            } else if (curGroup) {
                curGroup.modifiers.push(keepHigher);
            }
            break;
        case "dropLower":
            const dropLower = new DropLowest();
            dropLower.dropCount = parseInt(r.value, 10);

            if (curRoll) {
                curRoll.modifiers.push(dropLower);
            } else if (curGroup) {
                curGroup.modifiers.push(dropLower);
            }
            break;
        case "dropHigher":
            const dropHigher = new DropHighest();
            dropHigher.dropCount = parseInt(r.value, 10);

            if (curRoll) {
                curRoll.modifiers.push(dropHigher);
            } else if (curGroup) {
                curGroup.modifiers.push(dropHigher);
            }
            break;
        case "sortAsc":
            curRoll.modifiers.push(new SortAsc());
            break;
        case "sortDesc":
            curRoll.modifiers.push(new SortDesc());
            break;
        case "groupStart":
            if (!curGroup) {
                curGroup = new Group();
            }
            break;
        case "groupEnd":
            if (curRoll) {
                curRoll = null;
            }
            break;
        case "operand":
            if (curEqn) {
                if (curEqn.left) {
                    curEqn.right = parseInt(r.value, 10);
                } else {
                    curEqn.left = parseInt(r.value, 10);
                }
            } else {
                curEqn = new Equation();
                curEqn.left = parseInt(r.value, 10);
            }
            break;
        case "operator":
            if (curEqn) {
                curEqn.op = r.value;
            }
            break;
        case "equationStart":
            curEqn = new Equation();
            break;
    }
    console.log(r.name, r.value);
}
console.log(curRoll.print());
