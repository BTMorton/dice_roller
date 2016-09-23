const parser = require("./diceroll.js");
const Discord = require("discord.js");
const token = process.env.DISCORD_TOKEN;

const groupTypes = ["groupExpression", "diceExpression"];

bot = new Discord.Client();
bot.on("ready", () => {
	console.log("Ready to roll! Geddit?");
});
bot.on("message", processMessage.bind(null));
bot.login(token);

function processMessage(message) {
	console.log(message.content, message.content.match(/^\/r(oll)?/i));
	if (message.author.bot) {
		return;
	}
	
	if (message.content.match(/^\/r(oll)?/i)) {
		const diceString = message.content.replace(/^\/r(oll)?/i, "").trim();
		rollDice(message, diceString);
	} else {
		matches = message.content.match(/\[\[[^\]]+\]\]/g);
		console.log("[[matches]]", matches);
		if (matches && matches.length > 0) {
			for (let match of matches) {
				const diceString = match.slice(2, -2);
				console.log(diceString, match);
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
		console.log(e);
		sendError(message);
	}
}

function sendError(message) {
	message.reply("Sorry, I was unable to complete the roll.");
}

function render(roll) {
	if (groupTypes.indexOf(roll.type) >= 0) {
		return renderGroupExpr(roll);
	} else if (roll.type == "group") {
		return renderGroup(roll);
	} else if (roll.type == "die") {
		return renderDie(roll);
	} else if (roll.type == "expression") {
		return renderExpr(roll);
	} else if (roll.type == "roll") {
		return renderRoll(roll);
	} else {
		throw new Error("Unable to render");
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
	return expr.value;
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