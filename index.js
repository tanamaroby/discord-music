require('dotenv').config()
const Discord = require('discord.js')
const ytdl = require('ytdl-core')
const botId = '948544074619715585'

const client = new Discord.Client()
const youtubesearchapi = require('youtube-search-api')
client.login(process.env.BOT_TOKEN)

client.once('ready', () => {
    console.log('Musik Gangz is ready to run!')
})

client.once('reconnecting', () => {
    console.log("Musik Gangz currently attempting to reconnect!")
})

client.once('disconnect', () => {
    console.log("Disconnecting from the channel!")
})

const queue = new Map()

// Catch all errors
process.on('uncaughtException', err => {
    console.error(err)
})


client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        if (oldState.member.user.bot) {
            if (newState.channelID === null) { // bot has left
                queue.set(oldState.guild.id, null)
                console.log(`Bot has successfully disconnected from the voice channel`)
            }
        }
    } catch (err) {
        console.error(err)
    }
}) 

let prefix = "yo!"
client.on('message', async message => {
    if (message.author.bot) return
    let content = message.content.toLowerCase()
    if (!content.startsWith(prefix)) return
    const serverQueue = queue.get(message.guild.id)
    try {
        if (content.startsWith(`${prefix}play`)) {
            execute(message, serverQueue)
            return
        } else if (content.startsWith(`${prefix}skip`)) {
            skip(message, serverQueue)
            return
        } else if (content.startsWith(`${prefix}stop`)) {
            stop(message, serverQueue)
            return
        } else if (content.startsWith(`${prefix}help`)) {
            message.channel.send(`Available GANGSTA commands are: ${prefix}play <video_name>/<video_url>, ${prefix}skip, and ${prefix}stop`)
            return
        } else {
            message.channel.send("Please enter a valid command bruddas! Use yo!help to get list of commands wewewewew")
            return
        } 
    } catch (err) {
        console.error(err)
        message.channel.send("I encountered an error when trying to process your message lol")
        return
    }
})

async function execute(message, serverQueue) {
    try {
        const args = message.content.split(" ")
        const voiceChannel = message.member.voice.channel
        if (!voiceChannel) {
            return message.channel.send(`You need to be in a voice channel to play music!`)
        }
        const permissions = voiceChannel.permissionsFor(message.client.user)
        if(!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return message.channel.send("I need permissions to join and speak in your voice channel!")
        }
        let songInfo 
        try {
            songInfo = await ytdl.getInfo(args[1])
        } catch (err) {
            let search = args.slice(1).join(" ")
            console.log(search)
            let result = await youtubesearchapi.GetListByKeyword(search)
            let counter = 0
            while(result.items.length && result.items[counter].type !== 'video') {
                counter++
                if (counter >= result.items.length) {
                    result = await youtubesearchapi.NextPage(result.nextPage)
                    counter = 0
                }
            }
            if (!result.items.length || result.items[counter].type !== 'video') {
                console.error('No matching results found yoyoyooyoyoy')
                message.channel.send('Cannot find yo! Matching HUH!?')
                return
            }
            songInfo = await ytdl.getInfo(`http://www.youtube.com/watch?v=${result.items[counter].id}`)
        }
        
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url
        }
        if (!serverQueue) {
            const queueConstruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true
            }
            queue.set(message.guild.id, queueConstruct)
            queueConstruct.songs.push(song)
            try {
                var connection = await voiceChannel.join()
                queueConstruct.connection = connection
                play(message.guild, queueConstruct.songs[0])
            } catch (err) {
                console.log(err)
                queue.delete(message.guild.id)
                return message.channel.send("Error trying to play music")
            }
        } else {
            serverQueue.songs.push(song)
            console.log(serverQueue.songs)
            return message.channel.send(`${song.title} has been added to the queue yo!`)
        }
    } catch (err) {
        console.error(err)
        message.channel.send(`Yo Yo Yo!! I am unable to play that shiiiizz B, probably some cringe age-restricted shit`)
    }
}

function play(guild, song) {
    try {
        const serverQueue = queue.get(guild.id)
        if (!song) {
            serverQueue.voiceChannel.leave()
            queue.delete(guild.id)
            return
        }
        const dispatcher = serverQueue.connection
            .play(ytdl(song.url))
            .on("finish", () => {
                serverQueue.songs.shift()
                play(guild, serverQueue.songs[0])
            })
            .on("error", error =>  console.error(error))
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5)
        serverQueue.textChannel.send(`Musik Gangz now playing: **${song.title}**`)
    } catch (err) {
        console.error(err)
        message.channel.send("Having trouble playing this specific song you selected!")
    }
}

function skip(message, serverQueue) {
    try {
        if (!message.member.voice.channel) {
            return message.channel.send("Musik Gangz wants you to be in a voice channel first before you can skip!")
        }
        if (!serverQueue) {
            return message.channel.send("Ain't no song in the queue!")
        }
        serverQueue.connection.dispatcher.end()
    } catch (err) {
        console.error(err)
        message.channel.send("I can't skip this song for some reason bruh rip")
    }
}

function stop(message, serverQueue) {
    try {
        if (!message.member.voice.channel) {
            return message.channel.send("Musik Gangz finna boutta wanna be in the voice channel first holup yo why u tryna stop bruv")
        }
        if (!serverQueue) {
            return message.channel.send("Ain't no song to stop bruvvvvvvv! HUH!? Hello!?")
        }
        serverQueue.songs = []
        serverQueue.connection.dispatcher.end()
    } catch (err) {
        console.error(err)
        message.channel.send("I CAN'T STOP IT NOOOOOOOOOO")
    }
}

