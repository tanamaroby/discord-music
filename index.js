require('dotenv').config()
const { Intents, Client, Permissions } = require('discord.js')
const { joinVoiceChannel, NoSubscriberBehavior, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice')
const playDl = require('play-dl')
const validUrl = require('valid-url')
const botId = '948544074619715585'

const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.DIRECT_MESSAGES],
    partials: ['CHANNEL', 'MESSAGE']
})
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
        if (oldState.member.user.id == botId) {
            if (newState.channel == null) { // bot has left
                queue.delete(oldState.guild.id)
                console.log(`Bot has successfully disconnected from the voice channel`)
            }
        }
    } catch (err) {
        console.error(err)
    }
}) 

let prefix = "yo!"
client.on('messageCreate', async message => {
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
        message.channel.send(`I encountered an error when trying to process your message: ${err}`)
        return
    }
})

async function execute(message, serverQueue) {
    try {
        if (!message.member.voice?.channel) return message.channel.send(`Yo yo yo! You gotta be in a voice channel first yo!`)
        const args = message.content.split(" ")
        const permissions = message.member.permissions
        if(!permissions.has([Permissions.FLAGS.CONNECT, Permissions.FLAGS.SPEAK])) {
            return message.channel.send("I need permissions to join and speak in your voice channel!")
        }
        
        let search = args.slice(1).join(" ")
        let result = await playDl.search(search, { limit: 1 })
        if (result.length < 1) {
            return message.channel.send(`I was unable to find anything yo! Give better search result please!`)
        }
        const song = {
            title: result[0].title,
            url: result[0].url
        }
        if (!serverQueue) {
            const queueConstruct = {
                textChannel: message.channel,
                connection: null,
                subscription: null,
                player: null,
                songs: [],
                volume: 5,
                playing: true
            }
            queue.set(message.guild.id, queueConstruct)
            queueConstruct.songs.push(song)
            try {
                queueConstruct.connection = joinVoiceChannel({
                    channelId: message.member.voice.channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator
                })
                queueConstruct.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play }})
                queueConstruct.player.on(AudioPlayerStatus.Idle, () => {
                    skip(message, queueConstruct)
                })
                play(message.guild, queueConstruct.songs[0])
            } catch (err) {
                console.log(err)
                queue.delete(message.guild.id)
                return message.channel.send(`Error trying to queue up the song ${song.title}`)
            }
        } else {
            serverQueue.songs.push(song)
            return message.channel.send(`${song.title} has been added to the queue yo!`)
        }
    } catch (err) {
        console.error(err)
        message.channel.send(`I encountered an error: ${err}`)
    }
}

async function play(guild, song) {
    try {
        const serverQueue = queue.get(guild.id)
        if (!song) {
            serverQueue.connection.destroy()
            queue.delete(guild.id)
            return
        }
        let stream = await playDl.stream(song.url)
        let resource = createAudioResource(stream.stream, { inputType: stream.type })
        serverQueue.subscription = serverQueue.connection.subscribe(serverQueue.player) // Sync the discord connection to audio player
        serverQueue.player.play(resource) // Play the stream
        serverQueue.textChannel.send(`Musik Gangz now playing: **${song.title}**`)
    } catch (err) {
        console.error(err)
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
        serverQueue.subscription.unsubscribe()
        serverQueue.songs.shift()
        play(message.guild, serverQueue.songs[0])
    } catch (err) {
        console.error(err)
        message.channel.send(`I can't skip this song for some reason bruh rip: ${err}`)
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
        serverQueue.connection.destroy()
        queue.delete(message.guild.id)
    } catch (err) {
        console.error(err)
        message.channel.send(`I CAN'T STOP IT NOOOOOOOOOO: ${err}`)
    }
}

