const parser = require("./diceroll.js");
const Discord = require("discord.js");
const token = process.env.DISCORD_TOKEN;

bot = new Discord.Client();
bot.on("ready", () => {
	console.log("Ready to roll! Geddit?");
});
bot.on("message", processMessage.bind(null));
bot.login(token);

function processMessage(message) {
	if (message.author.bot) {
		return;
	}
	
	if (message.content.match(/^\/r(oll)?/i)) {
		const diceString = message.content.replace(/^\/r(oll)?/i, "").trim();
		rollDice(message, diceString);
	} else {
		matches = message.content.match(/\[\[[^\]]+\]\]/g);
		
		if (matches && matches.length > 0) {
			for (let match of matches) {
				let diceString = match.slice(2, -2);
				
				if (diceString.indexOf(":") >= 0) {
					const flavour = diceString.slice(0, diceString.indexOf(":")).trim();
					diceString = diceString.slice(diceString.indexOf(":") + 1).trim() + " " + flavour;
				}
				
				rollDice(message, diceString);
			}
		}
	}
}

function rollDice(message, string) {
	try {
		const roll = parser.parse(string);
		
		const reply = string.replace(/\*/g, "\*") + ": " + render(roll);
		
		message.channel.sendMessage(reply);
	} catch (e) {
		console.error(e);
		sendError(message);
	}
}

function sendError(message) {
	message.reply("Sorry, I was unable to complete the roll.");
}

function render(roll) {
	let render = "";
	
	let type = roll.type;
	
	if (type.startsWith("root")) {
		type = type.slice(4);
	}
	
	switch (type) {
		case "groupExpression":
		case "diceExpression":
			render = renderGroupExpr(roll);
			break;
		case "group":
			render = renderGroup(roll);
			break;
		case "die":
			render = renderDie(roll);
			break;
		case "expression":
			render = renderExpression(roll);
			break;
		case "roll":
			return renderRoll(roll);
		case "number":
			return roll.value;
		default:
			throw new Error("Unable to render");
	}
	
	if (!roll.valid) {
		render = "~~" + render.replace(/~~/g, "") + "~~";
	}
	
	if (roll.type.startsWith("root")) {
		return render;
	} else {
		return "(" + render + ")";
	}
}

function renderGroup(group) {
	const replies = [];
	
	for (let die of group.dice) {
		replies.push(render(die));
	}
	
	return "{ " + replies.join(" + ") + " } = " + group.value;
}

function renderGroupExpr(group) {
	const replies = [];
	
	for (let die of group.dice) {
		replies.push(render(die));
	}
	
	return replies.length > 1 ? "(" + replies.join(" + ") + ") = " + group.value : replies[0];
}

function renderDie(die) {
	const replies = [];
	
	for (let roll of die.rolls) {
		replies.push(render(roll));
	}
	
	return "(" + replies.join(", ") + ") = " + die.value;
}

function renderExpression(expr) {
	if (expr.dice.length > 1) {
		const expressions = [];
		
		for (let i = 0; i < expr.dice.length - 1; i++) {
			expressions.push(render(expr.dice[i]));
			expressions.push(expr.ops[i]);
		}
		
		expressions.push(render(expr.dice.slice(-1)[0]));
		expressions.push("=");
		expressions.push(expr.value);
		
		return expressions.join(" ");
	} else if (expr.dice[0].type == "number") {
		return expr.value;
	} else {
		return render(expr.dice[0]);
	}
}

function renderRoll(roll) {
	if (!roll.valid) {
		return "~~" + roll.roll + "~~";
	} else if (roll.success && roll.value == "1") {
		return "**"+roll.roll+"**";
	} else if (roll.success && roll.value == "-1") {
		return "*"+roll.roll+"*";
	} else {
		return roll.roll;
	}
}