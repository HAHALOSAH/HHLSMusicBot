const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");
const client = new Discord.Client();
const yts = require('yt-search');
const queue = new Map();

client.once("ready", () => {
  console.log("Ready!");
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on("message", async message => {
  //if (message.author.id == 159985870458322944) {
  //  message.channel.send("<@159985870458322944>, SHUT UP")
  //}
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;
  function containsAll(first, second) {
    const indexArray = first.map(el => {
      return second.indexOf(el);
    });
    return indexArray.indexOf(-1) === -1;
  }
  const { Permissions } = require("discord.js")
  //new Permissions(message.channel.permissionsFor(message.guild.me)).hasPermissions(["READ_MESSAGES", "VIEW_CHANNEL", "EXTERNAL_EMOJIS", "READ_MESSAGE_HISTORY", "SEND_MESSAGES", "EMBED_LINKS"])
  mypermissions = new Permissions(message.channel.permissionsFor(message.guild.me))
  var arrayPermissions = []
  arrayPermissions = mypermissions.toArray();
  if (containsAll(["MANAGE_MESSAGES"], arrayPermissions)) {
    message.delete()
  }
  var serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    stop(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}vol`)) {
    vol(message, serverQueue)
  } else if (message.content.startsWith(`${prefix}help`)) {
    var helptext = "Basic commands:\n";
    helptext += "^play: play a song\n"
    helptext += "^skip: Skip a song in the queue\n"
    helptext += "^stop: Stop all songs\n"
    helptext += "^vol: Adjust volume\n"
    helptext += "^pause: Pause playback\n"
    helptext += "^resume: Resume playback\n"
    helptext += "^replay: Replay song\n"
    helptext += "^lock: Lock commands for other users\n"
    helptext += "^unlock: Unlock commands for other users\n"
    message.channel.send(helptext)
  } else if (message.content.startsWith(`${prefix}pause`)) {
    pause(message, serverQueue)
  } else if (message.content.startsWith(`${prefix}resume`)) {
    resume(message, serverQueue)
  } else if (message.content.startsWith(`${prefix}lock`)) {
    lock(message, serverQueue)
  } else if (message.content.startsWith(`${prefix}unlock`)) {
    unlock(message, serverQueue)
  } else if (message.content.startsWith(`${prefix}control`)) {
    control(message, serverQueue)
  } else if (message.content.startsWith(`${prefix}replay`)) {
    replay(message, serverQueue)
  } else if (message.content.startsWith(`${prefix}default`)) {
    if (serverQueue) {
      serverQueue.songs.push({
        "title": "Default by Aaron K.",
        "url": "https://www.youtube.com/watch?v=Sbdutn8Q1T0"
      })
      message.channel.send("**Default by Aaron K.** has been queued")
    }
    else {
      message.channel.send("Default can only be queued, play a song first!")
    }
  } else {
    execute(message, serverQueue);
    //message.channel.send("You need to enter a valid command!");
  }
});

async function execute(message, serverQueue) {
  if (serverQueue) {

    if (message.author.id != serverQueue.player.id && serverQueue.locked) {
      message.channel.send("The player has locked the commands!").then(m => {
        enableDeleting(m, message.author.id)
      })
      return
    }
  }
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "You need to be in a voice channel to play music!"
    ).then(m => {
      enableDeleting(m, message.author.id)
    });
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    ).then(m => {
      enableDeleting(m, message.author.id)
    });
  }
  //if (args[1].endsWith())
  if (args.length > 1) {
    args.shift()
  }
  var videos = await yts(args.join(" "));
  console.log(args.join(" "))
  var video = videos.videos[0]
  if (!video.url) {
    message.channel.send("Song was not found!").then(m => {
      enableDeleting(m, message.author.id)
    })
    return;
  }
  const songInfo = await ytdl.getInfo(video.url);
  var song
  if (songInfo.videoDetails.video_url != "https://www.youtube.com/watch?v=Sbdutn8Q1T0") {
    song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
    };
  } else {
    song = {
      title: "Default by Aaron K.",
      url: songInfo.videoDetails.video_url,
    };
  }
  var ok = false;
  if (!serverQueue) ok = true
  if (serverQueue) if (serverQueue.songs.length == 0) ok = true
  if (ok) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
      dispatcher: null,
      locked: false,
      player: message.author,
      volume: 0.1
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);
    //console.log(serverQueue.songs)
    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      console.log(queueContruct.songs[0])
      play(message.guild, queueContruct.songs[0], message);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} has been added to the queue!`).then(m => {
      enableDeleting(m, message.author.id)
    });
  }
}

function skip(message, serverQueue) {
  if (serverQueue) {
    if (message.author.id != serverQueue.player.id && serverQueue.locked) {
      message.channel.send("The player has locked the commands!").then(m => {
        enableDeleting(m, message.author.id)
      })
      return
    }
  }
  if (!serverQueue)
    return message.channel.send("There is no song that I could skip!").then(m => {
      enableDeleting(m, message.author.id)
    });
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (serverQueue) {
    if (message.author.id != serverQueue.player.id && serverQueue.locked) {
      message.channel.send("The player has locked the commands!").then(m => {
        enableDeleting(m, message.author.id)
      })
      return
    }
  }
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    ).then(m => {
      enableDeleting(m, message.author.id)
    })

  if (!serverQueue)
    return message.channel.send("There is no song that I could stop!").then(m => {
      enableDeleting(m, message.author.id)
    });

  //serverQueue.songs = [];
  serverQueue.connection.dispatcher.setVolume(0)
  serverQueue.connection.dispatcher.resume()
  setTimeout(() => { serverQueue.connection.dispatcher.end() }, 500)
}

function vol(message, serverQueue) {
  if (serverQueue) {
    if (message.author.id != serverQueue.player.id && serverQueue.locked) {
      message.channel.send("The player has locked the commands!").then(m => {
        enableDeleting(m, message.author.id)
      })
      return
    }
  }
  const args = message.content.split(" ");
  if (args.length == 1) {
    message.channel.send("Volume is currently at **"+Math.round(parseFloat(serverQueue.volume) * 100)+"**").then(m=>{
      enableDeletingWithVolControls(m, message.author.id, serverQueue, message)
    })
    return
  }
  var volume;
  if (args[1].endsWith("%")) {
    volume = parseFloat(args[1]) / 100
  } else {
    volume = args[1]
  }
  if (parseFloat(volume) < 0) {
    message.channel.send("Cannot lower volume any further").then(m => {
      enableDeleting(m, message.author.id)
    })
    return;
  }
  if (vol > 1 && args[2] != "--force") {
    message.channel.send("uhh... I don't think you want to set the volume to **" + parseFloat(args[1]) * 100 + "%**, do you? Did you mean ^vol " + args[1] + "% ? If you didnt put a %, that is important. However, if you REALLY want to do that, type ^vol " + args[1] + " --force").then(m => {
      enableDeleting(m, message.author.id)
    })
    return
  }
  if (serverQueue.dispatcher != null) {
    const dispatcher = serverQueue.dispatcher
    dispatcher.setVolume(volume)
    serverQueue.volume = volume
    message.channel.send("Volume was set to **" + Math.round(parseFloat(volume) * 100) + "%**").then(m => {
      enableDeletingWithVolControls(m, message.author.id, serverQueue, message)
    })
  } else {
    message.channel.send("No song is playing!").then(m => {
      enableDeleting(m, message.author.id)
    })
  }
}

function volup(message, serverQueue, messageb) {
  var volume = (Math.round((parseFloat(serverQueue.volume) + 0.10) * 10)) / 10
  serverQueue.dispatcher.setVolume(volume)
  serverQueue.volume = volume
  messageb.edit("Volume was set to **" + Math.round(parseFloat(volume) * 100) + "%**")
}

function voldown(message, serverQueue, messageb) {
  var volume = (Math.round((parseFloat(serverQueue.volume) - 0.10) * 10)) / 10
  if (volume < 0) {
    messageb.edit("Cannot lower volume any further")
    return
  }
  serverQueue.dispatcher.setVolume(volume)
  serverQueue.volume = volume
  messageb.edit("Volume was set to **" + Math.round(parseFloat(volume) * 100) + "%**")
}

function pause(message, serverQueue) {
  if (serverQueue) {
    if (message.author.id != serverQueue.player.id && serverQueue.locked) {
      message.channel.send("The player has locked the commands!").then(m => {
        enableDeleting(m, message.author.id)
      })
      return
    }
  } else {
    return
  }
  const args = message.content.split(" ");
  if (serverQueue.dispatcher != null) {
    serverQueue.dispatcher.pause()
    if (message.content == "^pause") {
      message.channel.send("Playback has been paused").then(m => {
        enableDeleting(m, message.author.id)
      })
    }
  }
}

function resume(message, serverQueue) {
  if (serverQueue) {
    if (message.author.id != serverQueue.player.id && serverQueue.locked) {
      message.channel.send("The player has locked the commands!").then(m => {
        enableDeleting(m, message.author.id)
      })
      return
    }
  } else {
    return
  }
  const args = message.content.split(" ");
  if (serverQueue.dispatcher != null) {
    serverQueue.dispatcher.resume()
    if (message.content == "^resume") {
      message.channel.send("Playback has been resumed").then(m => {
        enableDeleting(m, message.author.id)
      })
    }
  }
}

function lock(message, serverQueue) {
  
  const args = message.content.split(" ");
  if (serverQueue.dispatcher) {
    if (serverQueue.dispatcher != null) {
      if (serverQueue.player.id == message.author.id) {
        serverQueue.locked = true
        message.channel.send("Commands have been locked").then(m => {
          enableDeleting(m, message.author.id)
        })
      } else {
        message.channel.send("Only the player can lock commands!").then(m => {
          enableDeleting(m, message.author.id)
        })
      }
    }
  }
}

function unlock(message, serverQueue) {
  const args = message.content.split(" ");
  if (serverQueue.dispatcher) {
    if (serverQueue.dispatcher != null) {
      if (serverQueue.player.id == message.author.id) {
        serverQueue.locked = false
        message.channel.send("Commands have been unlocked").then(m => {
          enableDeleting(m, message.author.id)
        })
      } else {
        message.channel.send("Only the player can unlock commands!").then(m => {
          enableDeleting(m, message.author.id)
        })
      }
    }
  }
}

function control(message, serverQueue) {
  function containsAll(first, second) {
    const indexArray = first.map(el => {
      return second.indexOf(el);
    });
    return indexArray.indexOf(-1) === -1;
  }
  const { Permissions } = require("discord.js")
  //new Permissions(message.channel.permissionsFor(message.guild.me)).hasPermissions(["READ_MESSAGES", "VIEW_CHANNEL", "EXTERNAL_EMOJIS", "READ_MESSAGE_HISTORY", "SEND_MESSAGES", "EMBED_LINKS"])
  mypermissions = new Permissions(message.channel.permissionsFor(message.guild.me))
  var arrayPermissions = []
  arrayPermissions = mypermissions.toArray();
  if (!containsAll(["MANAGE_MESSAGES"], arrayPermissions)) {
    message.channel.send("Manage Messages permission is required to use this feature!")
    return
  }
  message.delete()
  message.channel.send("MUSIC CONTROL").then(messageb => {
    // Reacts so the user only have to click the emojis
    setTimeout(r => {
      setTimeout(r => {
        setTimeout(r => {
          setTimeout(r => {
            setTimeout(r => {
              setTimeout(r => {
                setTimeout(r => {
                  setTimeout(r => {
                    setTimeout(r => {
                      setTimeout(r => {
                        messageb.react('🗑️');
                      }, 10);
                      messageb.react('🔓');
                    }, 10);
                    messageb.react('🔒');
                  }, 10);
                  messageb.react('🔽');
                }, 10);
                messageb.react('🔼');
              }, 10);
              messageb.react('⏩');
            }, 10);
            messageb.react('🔁');
          }, 10);
          messageb.react('⏹️');
        }, 10);
        messageb.react('⏸️');
      }, 10);
      messageb.react('▶️');
    }, 10);

    // First argument is a filter function
    enableControl(messageb, serverQueue, message)
  })
}

function play(guild, song, message) {
  var serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }
  console.log(ytdl(song.url))
  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      try {
        console.log(serverQueue)
        message.channel.send("Finished playing: **" + serverQueue.songs[0].title + "**").then(m => {
          finishedSong(m, message.author.id, serverQueue, message, serverQueue.songs[0])
          console.log(serverQueue.song)
          serverQueue.songs.shift();
          play(guild, serverQueue.songs[0], message);
        }).catch(e => {
          console.log(e)
        })
      } catch (e) {
        console.log(e)
      }
    })
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  dispatcher.setVolume(serverQueue.volume)
  var id = message.author.id
  serverQueue.textChannel.send(`Now playing: **${song.title}**`).then(m => {
    enableDeletingWithControls(m, id, serverQueue, message)
  });
  serverQueue.dispatcher = dispatcher
}

function replay(message, serverQueue) {
  function containsAll(first, second) {
    const indexArray = first.map(el => {
      return second.indexOf(el);
    });
    return indexArray.indexOf(-1) === -1;
  }
  const { Permissions } = require("discord.js")
  //new Permissions(message.channel.permissionsFor(message.guild.me)).hasPermissions(["READ_MESSAGES", "VIEW_CHANNEL", "EXTERNAL_EMOJIS", "READ_MESSAGE_HISTORY", "SEND_MESSAGES", "EMBED_LINKS"])
  mypermissions = new Permissions(message.channel.permissionsFor(message.guild.me))
  var arrayPermissions = []
  arrayPermissions = mypermissions.toArray();
  if (containsAll(["MANAGE_MESSAGES"], arrayPermissions)) {
    message.delete()
  }
  if (serverQueue) {
    if (message.author.id != serverQueue.player.id && serverQueue.locked) {
      message.channel.send("The player has locked the commands!").then(m => {
        enableDeleting(m, message.author.id)
      })
      return
    }
  } else {
    return
  }
  if (serverQueue.dispatcher != null) {
    try {
      serverQueue.songs.unshift(serverQueue.songs[0])
      serverQueue.connection.dispatcher.setVolume(0)
      serverQueue.connection.dispatcher.resume()
      setTimeout(() => {
        serverQueue.connection.dispatcher.end();
      }, 500)
    } catch (e) {
      console.log(e)
    }
  }
}

async function removeReactions(message, userId) {
  var userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(userId));
  try {
    for (const reaction of userReactions.values()) {
      await reaction.users.remove(userId);
    }
  } catch (error) {
    console.error('Failed to remove reactions.');
  }
  userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(userId));
  try {
    for (const reaction of userReactions.values()) {
      await reaction.users.remove(userId);
    }
  } catch (error) {
    console.error('Failed to remove reactions.');
  }
}

function enableControl(messageb, serverQueue, message) {
  messageb.awaitReactions((reaction, user) => { return !user.bot && user.id == message.author.id }, { max: 1, time: 30000 })
    .then(collected => {
      JSON.parse(JSON.stringify(collected.first())).users
      removeReactions(messageb, message.author.id)
      if (collected.first()) {
        enableControl(messageb, serverQueue, message)
      }
      var serverQueue = queue.get(message.guild.id);
      switch (collected.first().emoji.name) {
        case "▶️":
          resume(message, serverQueue);
          messageb.edit("Resumed playback")
          break;
        case "⏸️":
          pause(message, serverQueue);
          messageb.edit("Paused playback")
          break;
        case "⏹️":
          stop(message, serverQueue);
          messageb.edit("Stopped playback")
          messageb.delete()
          break;
        case "🔁":
          replay(message, serverQueue);
          messageb.edit("Replaying")
          break;
        case "⏩":
          skip(message, serverQueue);
          messageb.edit("Skipping song")
          break;
        case "🔼":
          volup(message, serverQueue, messageb);
          break;
        case "🔽":
          voldown(message, serverQueue, messageb);
          break;
        case "🔒":
          lock(message, serverQueue);
          break;
        case "🔓":
          unlock(message, serverQueue);
          break;
        case "🗑️":
          messageb.delete()
          break;
      }
    }).catch((e) => {
      try {
        messageb.delete().catch(e => {
          console.log(e)
        })
      } catch (e) {
        console.log(e)
      }
    });
}

function enableDeleting(message, id) {
  function containsAll(first, second) {
    const indexArray = first.map(el => {
      return second.indexOf(el);
    });
    return indexArray.indexOf(-1) === -1;
  }
  const { Permissions } = require("discord.js")
  //new Permissions(message.channel.permissionsFor(message.guild.me)).hasPermissions(["READ_MESSAGES", "VIEW_CHANNEL", "EXTERNAL_EMOJIS", "READ_MESSAGE_HISTORY", "SEND_MESSAGES", "EMBED_LINKS"])
  mypermissions = new Permissions(message.channel.permissionsFor(message.guild.me))
  var arrayPermissions = []
  arrayPermissions = mypermissions.toArray();
  if (!containsAll(["MANAGE_MESSAGES"], arrayPermissions)) {
    //message.channel.send("Manage Messages permission is required to use this feature!")
    return
  }

  try {
    message.react('🗑️')
  } catch (e) {
    console.log(e)
  }

  message.awaitReactions((reaction, user) => { return !user.bot && user.id == id }, { max: 1, time: 5000 })
    .then(collected => {
      //JSON.parse(JSON.stringify(collected.first())).users
      removeReactions(message, message.author.id)
      removeReactions(message, message.author.id)
      switch (collected.first().emoji.name) {
        case "🗑️":
          message.delete()
          break;
      }
    }).catch((e) => {
      try {
        message.delete().catch(e => {
          console.log(e)
        })
      } catch (e) {
        console.log(e)
      }
    });
}
function enableDeletingWithControls(message, id, serverQueue, messagewithid) {
  function containsAll(first, second) {
    const indexArray = first.map(el => {
      return second.indexOf(el);
    });
    return indexArray.indexOf(-1) === -1;
  }
  const { Permissions } = require("discord.js")
  //new Permissions(message.channel.permissionsFor(message.guild.me)).hasPermissions(["READ_MESSAGES", "VIEW_CHANNEL", "EXTERNAL_EMOJIS", "READ_MESSAGE_HISTORY", "SEND_MESSAGES", "EMBED_LINKS"])
  mypermissions = new Permissions(message.channel.permissionsFor(message.guild.me))
  var arrayPermissions = []
  arrayPermissions = mypermissions.toArray();
  if (!containsAll(["MANAGE_MESSAGES"], arrayPermissions)) {
    //message.channel.send("Manage Messages permission is required to use this feature!")
    return
  }

  try {
    message.react('🗑️').then(() => {
      message.react('🎛️')
    })
  } catch (e) {
    console.log(e)
  }

  message.awaitReactions((reaction, user) => { return !user.bot && user.id == id }, { max: 1, time: 5000 })
    .then(collected => {
      //JSON.parse(JSON.stringify(collected.first())).users
      if (collected.first()) {
        enableDeletingWithControls(message, id, serverQueue, messagewithid)
      }
      removeReactions(message, messagewithid.author.id)
      switch (collected.first().emoji.name) {
        case "🗑️":
          message.delete()
          break;
        case "🎛️":
          message.delete()
          control(messagewithid, serverQueue)
          break;
      }
    }).catch((e) => {
      try {
        message.delete().catch(e => {
          console.log(e)
        })
      } catch (e) {
        console.log(e)
      }
    });
}

function enableDeletingWithVolControls(message, id, serverQueue, messagewithid) {
  function containsAll(first, second) {
    const indexArray = first.map(el => {
      return second.indexOf(el);
    });
    return indexArray.indexOf(-1) === -1;
  }
  const { Permissions } = require("discord.js")
  //new Permissions(message.channel.permissionsFor(message.guild.me)).hasPermissions(["READ_MESSAGES", "VIEW_CHANNEL", "EXTERNAL_EMOJIS", "READ_MESSAGE_HISTORY", "SEND_MESSAGES", "EMBED_LINKS"])
  mypermissions = new Permissions(message.channel.permissionsFor(message.guild.me))
  var arrayPermissions = []
  arrayPermissions = mypermissions.toArray();
  if (!containsAll(["MANAGE_MESSAGES"], arrayPermissions)) {
    //message.channel.send("Manage Messages permission is required to use this feature!")
    return
  }

  try {
    message.react('🔼').then(() => {
      message.react('🔽')
    })
  } catch (e) {
    console.log(e)
  }

  message.awaitReactions((reaction, user) => { return !user.bot && user.id == id }, { max: 1, time: 5000 })
    .then(collected => {
      //JSON.parse(JSON.stringify(collected.first())).users
      if (collected.first()) {
        enableDeletingWithVolControls(message, id, serverQueue, messagewithid)
      }
      removeReactions(message, messagewithid.author.id)
      switch (collected.first().emoji.name) {
        case "🔼":
          volup(message, serverQueue, message);
          break;
        case "🔽":
          voldown(message, serverQueue, message);
          break;
      }
    }).catch((e) => {
      try {
        message.delete().catch(e => {
          console.log(e)
        })
      } catch (e) {
        console.log(e)
      }
    });
}

function finishedSong(message, id, serverQueue, messagewithid, song) {
  function containsAll(first, second) {
    const indexArray = first.map(el => {
      return second.indexOf(el);
    });
    return indexArray.indexOf(-1) === -1;
  }
  const { Permissions } = require("discord.js")
  //new Permissions(message.channel.permissionsFor(message.guild.me)).hasPermissions(["READ_MESSAGES", "VIEW_CHANNEL", "EXTERNAL_EMOJIS", "READ_MESSAGE_HISTORY", "SEND_MESSAGES", "EMBED_LINKS"])
  mypermissions = new Permissions(message.channel.permissionsFor(message.guild.me))
  var arrayPermissions = []
  arrayPermissions = mypermissions.toArray();
  if (!containsAll(["MANAGE_MESSAGES"], arrayPermissions)) {
    //message.channel.send("Manage Messages permission is required to use this feature!")
    return
  }

  try {
    message.react('🗑️').then(() => {
      message.react('🔁')
    })
  } catch (e) {
    console.log(e)
  }

  message.awaitReactions((reaction, user) => { return !user.bot && user.id == id }, { max: 1, time: 5000 })
    .then(collected => {
      //JSON.parse(JSON.stringify(collected.first())).users
      if (!collected) return
      if (collected.first()) {
        enableDeletingWithControls(message, id, serverQueue, messagewithid)
      }
      removeReactions(message, messagewithid.author.id)
      switch (collected.first().emoji.name) {
        case "🗑️":
          message.delete()
          break;
        case "🔁":
          message.delete()
          removeReactions(message, client.user.id)
          var messageobj = {};
          messageobj.content = "^play " + song.url
          messageobj.channel = messagewithid.channel
          messageobj.guild = messagewithid.guild
          messageobj.delete = () => { }
          messageobj.delete = () => { }
          messageobj.author = messagewithid.author
          messageobj.member = messagewithid.member
          messageobj.client = messagewithid.client
          execute(messageobj, serverQueue)
          break;
      }
    }).catch((e) => {
      try {
        message.delete().catch(e => {
          console.log(e)
        })
      } catch (e) {
        console.log(e)
      }
    });
}
client.login(token);
