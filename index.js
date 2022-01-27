//Initialize Client
const Discord = require("discord.js");
const client = new Discord.Client({intents: [Discord.Intents.FLAGS.GUILD_INVITES, Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILD_MEMBERS, Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Discord.Intents.FLAGS.DIRECT_MESSAGES, Discord.Intents.FLAGS.GUILD_INTEGRATIONS, Discord.Intents.FLAGS.GUILD_VOICE_STATES]});
client.invites = {}; //Invite Tracking
//Initialize .env vars
//Supported Vars
/*
    - TOKEN: Bot Secret
    - CLIENT_SECRET: Client Secret
    - PASTEBIN_API_KEY
    - MODLOGS_ID
    - HUMAN_GEOGRAPHY_ID
*/
const dotenv = require("dotenv");
dotenv.config();
const fetch = require("node-fetch")
//Pastebin Initialization
const PasteClient = require("pastebin-api").default;
const pastebinClient = new PasteClient(process.env.PASTEBIN_API_KEY)
const loackableChannels = ["802778031974121493", "802776126510202910", "802774908164898836","802775162705018901","816510292388872212","816511605541961728","816510767313453077","802774377669328956","802774480472113193","802774331826241577","866551371892391937","802784151185915935","802784100175708160","818244001526317056","792851010530967575", "792854284239765555","793583627014242346","802761084573974528","933943846566494288"]
const lockableCategories = ["876246202730029076", "876242295459041300", "871936507647262750", "802753606092193792"]
const RR = require("./reactions.js")
const _ = require("underscore")
const eventEmitter = require("events")
const prefix = "os:"
const request = require("request")
var fetchingAudio = false

client.on("messageCreate", async message => {
    if (message.author.bot) {return}
    if (!message.content.startsWith(prefix)) {return}
	const args = message.content.slice(prefix.length).trim().split(' ');
	const command = args.shift().toLowerCase();
    
    if (command === "purge" || command === "delete") {
        if (!message.member.permissions.has("MANAGE_MESSAGES")) {return}
        if (args[0] > 100 || args[0] < 2) {return message.reply("You are out of range for that")}
        try {
            console.log(args[0])
            message.channel.bulkDelete(args[0])
        } catch {
            return message.reply("An error occured.")
        }
    }
    if (command === "lockdown") {
        message.delete()
        if (!message.member.permissions.has("MANAGE_CHANNELS")) {return}
        if (!args.length) {
            lockChannel(message.channel, message)
        }
        if (args[0] === "server") {
            const announcement = await client.channels.fetch("792854071039229982")
            const embed = new Discord.MessageEmbed()
                .setAuthor({name:"Lockdown"})
                .setColor("#F04848")
                .setDescription("The server has been locked down. If you have questions, contact <@" + message.author + ">, though they are under no obligation to answer questions.")
                .setTimestamp()
            announcement.send({embeds: [embed]})
            for (const channel of loackableChannels) {
                const chan = await client.channels.fetch(channel)
                lockChannelClean(chan, message)
            }
            for (const category of lockableCategories) {
                const cat = await client.channels.fetch(category)
                cat.children.each(chan => {
                    lockChannelClean(chan, message)
                })
            }
        }
    }
    if (command === "unlockdown") {

        message.delete()
        if (!message.member.permissions.has("MANAGE_CHANNELS")) {return}
        if (!args.length) {
            unlockChannelClean(message.channel, message)
        }
        if (args[0] === "server") {
            const announcement = await client.channels.fetch("792854071039229982")
            const embed = new Discord.MessageEmbed()
                .setAuthor({name:"Lockdown"})
                .setColor("#44B37F")
                .setDescription("The server has been released from lockdown. If you have questions, contact <@" + message.author + ">, though they are under no obligation to answer questions.")
                .setTimestamp()
            announcement.send({embeds: [embed]})
            for (const channel of loackableChannels) {
                const chan = await client.channels.fetch(channel)
                unlockChannelClean(chan, message)
            }
            for (const category of lockableCategories) {
                const cat = await client.channels.fetch(category)
                cat.children.each(chan => {
                    unlockChannelClean(chan, message)
                })
            }
        }
    }
    if (command === "define") {
        //test
        if (!args[0]) {return message.reply("No word found.")}
        var word = args[0]
        var data = await getWord(word)
        if (!data[0]) {return message.reply("Sorry, I couldn't find a definition for that word")}
        
        const embed = new Discord.MessageEmbed()
        
        var wordData = {}
        wordData.meanings = []
        /**
         * wordData.meanings: [{
         *     partOfSpeech: (Part of Speech),
         *     definitions: [
         *         {
         *             definition: (definition),
         *             example: (example),
         *             synonyms: [],
         *             antonyms: []
         *         }
         *     ]
         * }]
         */
        
        for (const meaning of data[0].meanings) {
            var meaningData =  {
                    //Create new object, then assign to original object
                    partOfSpeech: _s.capitalize(meaning.partOfSpeech)
                }
            var defArr = [];
            for (const definition of meaning.definitions) {
                var defData = {
                    definition: _s.capitalize(definition.definition),
                    example: _s.capitalize(definition.example),
                    synonyms: definition.synonyms,
                    antonyms: definition.antonyms
                }
                defArr.push(defData)
            }
            meaningData.definitions = defArr;
            wordData.meanings.push(meaningData)
        }
        wordData.pronunciation = "/ " + data[0].phonetic + " /"
        var phoneticsarr = data[0].phonetics[0]
        wordData.pronunciationAudioURL = phoneticsarr.audio.slice(2)
        wordData.origin = data[0].origin
        wordData.word = data[0].word
        embed.setAuthor({name: _s.capitalize(wordData.word)})
        var descArr = []
        descArr.push(`Pronunciation: ${wordData.pronunciation}`)
        descArr.push("\n")
        descArr.push(`Origin: ${wordData.origin}`)
        descArr.push("\n")
        for (const meaning of wordData.meanings) {
            var tempArr = []
            tempArr.push(`As a(n) ${meaning.partOfSpeech}:`)
            for (const def of meaning.definitions) {
                tempArr.push('```')
                tempArr.push(`Definition: ${def.definition}`)
                tempArr.push("\n")
                tempArr.push(`Example: ${def.example}`)
                tempArr.push("\n")
                tempArr.push(`Synonyms: ${def.synonyms.join(", ")}`)
                tempArr.push(`Antonyms: ${def.antonyms.join(", ")}`)
                tempArr.push('```')
            }
            descArr.push(tempArr.join("\n"))
        }
        embed.setDescription(descArr.join("\n"))
        embed.setColor("FAA41B")
        message.channel.send({embeds: [embed]})

    }



})

//Startup 
client.once("ready", async () => {
    console.log(`Logged in as ${client.user.username}`);
    //Collect all Invites & Store their uses
    client.guilds.cache.each(guild => {
        guild.invites.fetch().then(guildInvites => { //All Invites
            guildInvites.each(guildInvite => {
                client.invites[guildInvite.code] = guildInvite.uses;
            });
        });
    });
    //Reaction Role channels and messages
    // const guild = await client.guilds.fetch('');
    // const channel = guild.channels.cache.get('');
    // await channel.messages.fetch('');
    // await channel.messages.fetch('');
    // guild.channels.cache.get("");
});


client.on('inviteCreate', (invite) => { //if someone creates an invite while bot is running, update store
    client.invites[invite.code] = invite.uses;
    const embed = new Discord.MessageEmbed()
        .setAuthor({name: "Invite Created"})
        .setDescription(`Invite created by ${invite.inviter}. Set to expire in ${(invite.maxAge === 0) ? "`never`" : Discord.Formatters.time(invite.expiresAt, "R")}`)
        .setColor("#FAA41B");
    client.channels.fetch(process.env.HUMAN_GEOGRAPHY_ID).then(channel => {channel.send({embeds: [embed]})});

});

client.on("guildMemberAdd", async (member) => {
    member.guild.invites.fetch().then(guildInvites => { //All Invites
        guildInvites.each(invite => {
            if (invite.uses != client.invites[invite.code]) { //Doesn't match the number of uses initially logged
                client.channels.fetch(process.env.HUMAN_GEOGRAPHY_ID).then(channel => {channel.send({embeds: [new Discord.MessageEmbed().setAuthor({name: "New Member"}).setDescription(`${member.user} just joined using an invite created by ${invite.inviter}`).setColor("#FAA41B")]})});
                client.invites[invite.code] = invite.uses
            }
        });
    });
    //Verification
    if (member.user.bot) {member.roles.add(/* Verified Role */)}
    var captcha = randomString(5, "a#")
    var tries = 0
    const embed = new Discord.MessageEmbed()
        .setAuthor({name: "Verify"})
        .setDescription(`To verify that you are a human, please respond with the following text (all letters are in **lower case**)\n\`${captcha}\``)
        .setColor("#44B37F")
        .setFooter({text: "This is to prevent bot attacks on our server."})
    const successEmbed = new Discord.MessageEmbed()
        .setAuthor({name: "Success!"})
        .setDescription("Wonderful! You have sucessfully verified and will be moved into the main server momentarily, check out #channel-map for a tour.")
        .setColor("#44B37F")
    const failedEmbed = new Discord.MessageEmbed()
        .setAuthor({name: "Failed"})
        .setDescription("Unfortunatly, you did not successfully complete the CAPTCHA. You have " + 15 - tries + " tries left")
        .setColor("#F04848")
    const channel = client.channels.cache.get(/* The Verification channel */)
    channel.send({embeds: [embed]}).then(msg => {
        let collector = channel.createMessageCollector(m => m.author.id === member.id)
        collector.on("collect", m => {
            if (m.content === captcha) {
                m.delete()
                msg.edit({embeds: [successEmbed]})
                setTimeout(function() {member.roles.add(/* Verified role */); msg.delete()}, 10000)
            } else {
                m.delete()
                msg.edit({embeds: [failedEmbed]})
                tries += 1
                if (tries < 15) {
                    setTimeout(function() {msg.edit({embeds: [embed]})}, 10000)
                } else {
                    msg.channel.send("Please Contact The server Admin").then(mssg => {
                        setTimeout(function() {mssg.delete()}, 120000)
                    })
                    msg.delete()
                    
                }
            }
            
        })
    })
    
    

})


client.on("messageDelete", async message => {
    const channel = client.channels.cache.get(/* Delete/Edit Logs channel */)
    const selfDelEmbed = new Discord.MessageEmbed()
        .setAuthor({name: "Message Deleted"})
        .setDescription(`Message from ${message.author} deleted in ${message.channel}:\n\`${message.cleanContent}\``)
        .setColor("#F04848")
        .setFooter({text:"The message was deleted by the author"})
        .setTimestamp()
	// Ignore direct messages
	if (!message.guild) return;
	const fetchedLogs = await message.guild.fetchAuditLogs({
		limit: 1,
		type: 'MESSAGE_DELETE',
	});
	// Since there's only 1 audit log entry in this collection, grab the first one
	const deletionLog = fetchedLogs.entries.first();

	// Perform a coherence check to make sure that there's *something*
	if (!deletionLog) return channel.send({embeds: [selfDelEmbed]})

	// Now grab the user object of the person who deleted the message
	// Also grab the target of this action to double-check things
	const { executor, target } = deletionLog;

	// Update the output with a bit more information
	// Also run a check to make sure that the log returned was for the same author's message
	if (target.id === message.author.id) {
		return channel.send({embeds: [
            new Discord.MessageEmbed()
                .setAuthor({name: "Message Deleted"})
                .setDescription(`Message from ${message.author} deleted in ${message.channel}:\n\`${message.cleanContent}\`\n\nThe Message was deleted by ${executor}`)
                .setColor("#F04848")
                .setTimestamp()
        ]})
	} else {
		return channel.send({embeds: [
            new Discord.MessageEmbed()
                .setAuthor({name: "Message Deleted"})
                .setDescription(`Message from ${message.author} deleted in ${message.channel}:\n\n\`\`\`\n${message.cleanContent}\n\`\`\`\n\nThe Message was deleted by someone unknown or by the message creator`)
                .setColor("#F04848")
                .setTimestamp()
        ]})
	}
})

client.on("messageUpdate", (oldMessage, newMessage) => {
    const channel = client.channels.cache.get(/* Delete/Edit Logs channel */)
    const embed = new Discord.MessageEmbed()
        .setAuthor({name: "Message Edited"})
        .setDescription(`Message from ${newMessage.author} edited in ${newMessage.channel}. [Jump](${newMessage.url})`)
        .addField("**Old**", `\`\`\`\n${oldMessage.content}\n\`\`\``)
        .addField("**New**", `\`\`\`\n${newMessage.content}\n\`\`\``)
        .setColor("#F04848")
        .setTimestamp()
    channel.send({embeds: [embed]})
})


client.on("guildMemberUpdate", (oldMember, newMember) => {
    if (!oldMember.roles.cache.has(/* Verified Role */) && newMember.roles.cache.has(/* Verified Role */)) {
        const embed = new Discord.MessageEmbed()
            .setAuthor({name: "New Member"})
            .setDescription("Hey there " + newMember.user + ", glad you're here!")
            .setColor("#44B37F")
        client.channels.cache.get("792855099399602176").send({content: newMember.user, embeds: [embed]})
    }
})
//Reaction Roles
client.on("messageReactionAdd", async (reaction, user) => {
    await reaction.message.guild.members.fetch(user)
    if (!RR.messages.find(m => m.id === reaction.message.id)) {return}
    const rrmsg = RR.messages.find(m => m.id === reaction.message.id)
    if (!rrmsg.reactions.find(r => r.emoji === reaction.emoji.name)) {return}
    const pair = rrmsg.reactions.find(r => r.emoji === reaction.emoji.name)
    try {
        reaction.message.guild.members.cache.get(user.id).roles.add(pair.role)
    } catch (e) {console.log(e)}
})
client.on("messageReactionRemove", async (reaction, user) => {
    await reaction.message.guild.members.fetch(user)
    if (!RR.messages.find(m => m.id === reaction.message.id)) {return}
    const rrmsg = RR.messages.find(m => m.id === reaction.message.id)
    if (!rrmsg.reactions.find(r => r.emoji === reaction.emoji.name)) {return}
    const pair = rrmsg.reactions.find(r => r.emoji === reaction.emoji.name)
    try {
        reaction.message.guild.members.cache.get(user.id).roles.remove(pair.role)
    } catch (e) {console.log(e)}
})

//Audit Log Handling
client.on("messageDeleteBulk", async messages => {
    const entry = await client.guilds.cache.get(/* Guild */).fetchAuditLogs({ type: "MESSAGE_BULK_DELETE" }).then(audit => audit.entries.first())
    var paste = [];
    var channel;
    messages.each(message => {
        channel = message.channel;
        paste.push(`[${message.author.username}]: ${message.cleanContent}\n`);
    })

    if (entry.extra.channel.id === channel.id) {
        const embed = new Discord.MessageEmbed()
            .setAuthor({name: "Messages Deleted"})
            .setDescription(`Messages deleted in <#${channel.id}>. ${((entry.reason) ? `With reason ${entry.reason}`: `With no reason provided`)}`)
            .setColor("F04848");
        client.channels.fetch(process.env.MODLOGS_ID).then(channel => { channel.send({embeds: [embed]})})
    }

    paste.join("");
    const url = await pastebinClient.createPaste({
        code: paste,
        expireDate: "1Y",
        name: "Deleted Messages",
        publicity: 1
    });
    const embed = new Discord.MessageEmbed()
        .setAuthor({name: "Deleted Messages"})
        .setDescription(`[Deleted messages in ${channel.name}](${url})`)
        .setColor("F04848");
    client.channels.cache.get(/* Delete/Edit Logs channel */).send({embeds: [embed]});
});

client.on('guildMemberRemove', async member => {
    console.debug("member leave")
	const fetchedLogs = await member.guild.fetchAuditLogs({
		limit: 1,
		type: 'MEMBER_KICK',
	});
	const kickLog = fetchedLogs.entries.first();
    const embed = new Discord.MessageEmbed().setAuthor({name: "New Member"}).setDescription(`${member.user.tag} just left.`).setColor("#FAA41B")
	if (!kickLog) return client.channels.fetch(process.env.HUMAN_GEOGRAPHY_ID).then(channel => {channel.send({embeds: [embed]})});
	console.debug("idk")
    const { executor, target, reason } = kickLog;
	if (target.id === member.id) {
		const embed = new Discord.MessageEmbed()
            .setAuthor({name: "Kick"})
            .setDescription(`User ${member.user.username} was kicked by ${executor} ${((reason) ? `with the reason \`${reson}\`` : `with no reason`)}`)
            .setColor("F04848");
        client.channels.fetch(process.env.MODLOGS_ID).then(channel => { channel.send({embeds: [embed]})})
    } else {
		return;
	}
});

client.on('guildBanAdd', async ban => {
	const fetchedLogs = await ban.guild.fetchAuditLogs({
		limit: 1,
		type: 'MEMBER_BAN_ADD',
	});
	const banLog = fetchedLogs.entries.first();
	if (!banLog) return;
	const { executor, target, reason } = banLog;
	if (target.id === ban.user.id) {
        const embed = new Discord.MessageEmbed()
            .setAuthor({name: "Member Banned"})
            .setDescription(`${ban.user.username} was banned by ${executor.tag} ${((reason) ? `with the reason \`${reason}\`` : "with no reason")}`)
            .setColor("F04848");
        client.channels.fetch(process.env.MODLOGS_ID).then(channel => { channel.send({embeds: [embed]})});
    } else {
        const embed = new Discord.MessageEmbed()
            .setAuthor({name: "Member Banned"})
            .setDescription(`${ban.user.username} was banned, but I was unable to locate who performed it.`)
            .setColor("F04848");
		client.channels.fetch(process.env.MODLOGS_ID).then(channel => { channel.send({embeds: [embed]})});
	}
});

client.on("guildMemberUpdate", (oldMember, member) => {
    const channel = client.channels.cache.get(process.env.MODLOGS_ID)
    if (oldMember.nickname !== member.nickname) {
        channel.send({embeds: [
            new Discord.MessageEmbed()
                .setAuthor({name: "Nickname Changed"})
                .setDescription(`${member} nickname changed`)
                .addField("**Old Nickname**", `\`${oldMember.nickname}\``, true)
                .addField("**New Nickname**", `\`${member.nickname}\``, true)
                .setTimestamp()
                .setColor("#FAA41B")
        ]})
    }
})

client.on("roleCreate", role => {
    const channel = client.channels.cache.get(process.env.MODLOGS_ID)
    var perms = role.permissions.toArray()
    var permsNiceArr = [];
    for (const x of perms) {
        permsNiceArr.push(x.toLowerCase().replace(/_/g, " "))
    }
    channel.send({embeds: [
        new Discord.MessageEmbed()
            .setAuthor({name: "Role Created"})
            .setDescription(`The role ${role} was created`)
            .addField("**Hoisted?**", ((role.hoist) ? "yes" : "no"), true)
            .addField("**Color**", `#${role.color.toString(16).toUpperCase()}`, true)
            .addField("**Mentionable?**", ((role.mentionable) ? "yes" : "no"), true)
            .addField("**Permissions**", permsNiceArr.join(", "), false)
            .setColor("#44B37F")
            .setTimestamp()
    ]})
})

client.on("roleUpdate", (oldRole, role) => {
    const channel = client.channels.cache.get(process.env.MODLOGS_ID)
    var oldperms = oldRole.permissions
    var newperms = role.permissions
    var permsNiceArr = [];

    const embed = new Discord.MessageEmbed()
        .setAuthor({name: "Role Updated"})
        .setDescription(`The role ${role} was updated.`)
        .setColor("#FAA41B")


    if (oldRole.color.toString(16) != role.color.toString(16)) {
        embed.addField("**Color**", `#${role.color.toString(16).toUpperCase()}`, true)
    }

    if (!oldRole.hoist === role.hoist) {
        embed.addField("**Hoisted?**", ((role.hoist) ? "yes" : "no"), true)
    }

    if (!oldRole.mentionable === role.mentionable) {
        embed.addField("**Mentionable?**", ((role.mentionable) ? "yes" : "no"), true)
    }

    if (!oldperms.equals(newperms)) {
        var oldpermsarray = oldperms.toArray()
        var newpermsarray = newperms.toArray()
        const deniedperms = _.difference(oldpermsarray, newpermsarray)
        const allowedperms = _.difference(newpermsarray, oldpermsarray)
        if (deniedperms.length) {
            var niceDeniedPerms = []
            for (const x of deniedperms) {
                niceDeniedPerms.push(x.toLowerCase().replace(/_/g, " "))
            }
            embed.addField("**❌ Denied**", niceDeniedPerms.join(", "), false)
        }
        if (allowedperms.length) {
            var niceallowedPerms = []
            for (const x of allowedperms) {
                niceallowedPerms.push(x.toLowerCase().replace(/_/g, " "))

            }
            embed.addField("**✅ Allowed**", niceallowedPerms.join(", "), false)
        }
    }


    channel.send({embeds: [
        embed
    ]})
})

client.login(process.env.TOKEN);



function randomString(length, chars) {
    var mask = '';
    if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
    if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (chars.indexOf('#') > -1) mask += '0123456789';
    if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
    var result = '';
    for (var i = length; i > 0; --i) result += mask[Math.floor(Math.random() * mask.length)];
    return result;
}
/**
 * 
 * @param {Discord.GuildChannel} channel 
 * @param {Discord.Message} message 
 */
function lockChannel(channel, message) {
    const embed = new Discord.MessageEmbed()
        .setAuthor({name:"Lockdown"})
        .setColor("#F04848")
        .setDescription("This channel has been locked down. If you have questions, contact <@" + message.author + ">, though they are under no obligation to answer questions.")
        .setTimestamp()
    channel.send({embeds: [embed]})
    channel.permissionOverwrites.edit(channel.guild.roles.cache.get(/* Verified Role */), { SEND_MESSAGES: false })
}
function unlockChannel(channel, message) {
    const embed = new Discord.MessageEmbed()
        .setAuthor({name:"Lockdown"})
        .setColor("#44B37F")
        .setDescription("This channel has been released from lockdown. If you have questions, contact <@" + message.author + ">, though they are under no obligation to answer questions.")
        .setTimestamp()
    channel.send({embeds: [embed]})
    channel.permissionOverwrites.edit(channel.guild.roles.cache.get(/* Verified Role */), { SEND_MESSAGES: true })
}
function lockChannelClean (channel, message) {

    channel.permissionOverwrites.edit(channel.guild.roles.cache.get(/* Verified Role */), { SEND_MESSAGES: false })
}
function unlockChannelClean (channel, message) {

    channel.permissionOverwrites.edit(channel.guild.roles.cache.get(/* Verified Role */), { SEND_MESSAGES: true })
}
async function getWord (word) {
    var response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
    var data = await response.json()
    
    return data
}