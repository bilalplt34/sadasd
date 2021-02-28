const { Client, Util, MessageEmbed } = require("discord.js");
const YouTube = require("simple-youtube-api");
const ytdl = require("ytdl-core");
require("dotenv").config();
require("./server.js");

const bot = new Client({
    disableMentions: "all"
});

const PREFIX = process.env.PREFIX;
const youtube = new YouTube(process.env.YTAPI_KEY);
const queue = new Map();

bot.on("warn", console.warn);
bot.on("error", console.error);
bot.on("ready", () => console.log(`[READY] ${bot.user.tag} başarıyla başlatıldı!`));
bot.on("shardDisconnect", (event, id) => console.log(`[SHARD] Shard ${id} bağlantı kesildi (${event.code}) ${event}, yeniden bağlanmaya çalışmak...`));
bot.on("shardReconnecting", (id) => console.log(`[SHARD] Parça ${id} yeniden bağlanma...`));

// prevent force disconnect affecting to guild queue
bot.on("voiceStateUpdate", (mold, mnew) => {
	if( !mold.channelID) return;
	if( !mnew.channelID && bot.user.id == mold.id ) {
		 const serverQueue = queue.get(mold.guild.id);
		 if(serverQueue)  queue.delete(mold.guild.id);
	} ;
})

bot.on("message", async (message) => { // eslint-disable-line
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.split(" ");
    const searchString = args.slice(1).join(" ");
    const url = args[1] ? args[1].replace(/<(.+)>/g, "$1") : "";
    const serverQueue = queue.get(message.guild.id);

    let command = message.content.toLowerCase().split(" ")[0];
    command = command.slice(PREFIX.length);

    if (command === "yardım" || command === "Yardım") {
      const GamerWolf = new MessageEmbed()
      .setAuthor('Müzik Botu Komut Listesi')
      .setColor('#313131')
      .setDescription(`
      > \`!play\` ・ Oynat  [Başlık / Url] 
      > \`!stop\` ・ Durdur  [Başlık / Url] 
      > \`!volume\` ・ Ses  [1/100]
      > \`!search\` ・ Ara  [Başlık / Url] 
      > \`!skip\` ・ Bitir
      > \`!pause\` ・ Duraklat
      > \`!resume\` ・ Devam Et
      > \`!nowplaying\` ・ Şimdi oynuyor
      > \`!queue\` ・ Sıra
      `)
      message.channel.send(GamerWolf)
  
   } 
    if (command === "play" || command === "p") {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.channel.send({
            embed: {
                color: "#313131",
                description: "Üzgünüm ama müzik çalmak için ses kanalında olmanız gerekiyor!"
            }
        });
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT")) {
            return message.channel.send({
                embed: {
                color: "#313131",
                    description: "Maalesef devam etmek için ** `BAĞLANTI` ** iznine ihtiyacım var!"
                }
            });
        }
        if (!permissions.has("SPEAK")) {
            return message.channel.send({
                embed: {
                color: "#313131",
                    description: "Maalesef devam etmek için ** `KONUŞ` ** iznine ihtiyacım var!"
                }
            });
        }
        if (!url || !searchString) return message.channel.send({
            embed: {
                color: "#313131",
                description: "Müzik çalmak için lütfen bağlantı / başlık girin"
            }
        });
        if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            const playlist = await youtube.getPlaylist(url);
            const videos = await playlist.getVideos();
            for (const video of Object.values(videos)) {
                const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
                await handleVideo(video2, message, voiceChannel, true); // eslint-disable-line no-await-in-loop
            }
            return message.channel.send({
                embed: {
                color: "#313131",
                    description: `✅  **|**  Oynatma Listesi ・ **\`${playlist.title}\`** Sıraya Eklendi`
                }
            });
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    var video = await youtube.getVideoByID(videos[0].id);
                    if (!video) return message.channel.send({
                        embed: {
                color: "#313131",
                            description: "🆘  **|**  Herhangi bir arama sonucu elde edemedim"
                        }
                    });
                } catch (err) {
                    console.error(err);
                    return message.channel.send({
                        embed: {
                color: "#313131",
                            description: "🆘  **|**  Herhangi bir arama sonucu elde edemedim"
                        }
                    });
                }
            }
            return handleVideo(video, message, voiceChannel);
        }
    }
    if (command === "search" || command === "sc") {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.channel.send({
            embed: {
                color: "#313131",
                description: "Üzgünüm ama müzik çalmak için ses kanalında olmanız gerekiyor!"
            }
        });
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT")) {
            return message.channel.send({
                embed: {
                color: "#313131",
                    description: "Maalesef devam etmek için ** `BAĞLAN`** iznine ihtiyacım var!"
                }
            });
        }
        if (!permissions.has("SPEAK")) {
            return message.channel.send({
                embed: {
                color: "#313131",
                    description: "Maalesef devam etmek için ** `KONUŞ` ** iznine ihtiyacım var!"
                }
            });
        }
        if (!url || !searchString) return message.channel.send({
            embed: {
                color: "#313131",
                description: "Müzik Aramak için ・ Lütfen Bağlantı / Başlık Girin!"
            }
        });
        if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            const playlist = await youtube.getPlaylist(url);
            const videos = await playlist.getVideos();
            for (const video of Object.values(videos)) {
                const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
                await handleVideo(video2, message, voiceChannel, true); // eslint-disable-line no-await-in-loop
            }
            return message.channel.send({
                embed: {
                color: "#313131",
                    description: `✅  **|**  Oynatma listesi ・ **\`${playlist.title}\`** Sıraya Eklendi`
                }
            });
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    let index = 0;
                    let embedPlay = new MessageEmbed()
                .setcolor ("#313131")
                        .setAuthor("Arama Sonuçları", message.author.displayAvatarURL())
                        .setDescription(`${videos.map(video2 => `**\`${++index}\`  |**  ${video2.title}`).join("\n")}`)
                        .setFooter("Lütfen aşağıdaki 10 sonuçtan birini seçin, bu yerleştirme 15 saniye içinde otomatik olarak silinecek");
                    // eslint-disable-next-line max-depth
                    message.channel.send(embedPlay).then(m => m.delete({
                        timeout: 15000
                    }))
                    try {
                        var response = await message.channel.awaitMessages(message2 => message2.content > 0 && message2.content < 11, {
                            max: 1,
                            time: 15000,
                            errors: ["time"]
                        });
                    } catch (err) {
                        console.error(err);
                        return message.channel.send({
                            embed: {
                color: "#313131",
                                description: "Şarkı seçim süresi 15 saniye içinde sona erdi, istek iptal edildi."
                            }
                        });
                    }
                    const videoIndex = parseInt(response.first().content);
                    var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
                } catch (err) {
                    console.error(err);
                    return message.channel.send({
                        embed: {
                color: "#313131",
                            description: "🆘  **|**  Herhangi bir arama sonucu elde edemedim"
                        }
                    });
                }
            }
            response.delete();
            return handleVideo(video, message, voiceChannel);
        }

    } else if (command === "skip") {
        if (!message.member.voice.channel) return message.channel.send({
            embed: {
                color: "#313131",
                description: "Üzgünüm ama bir müziği atlamak için ses kanalında olmanız gerekiyor!"
            }
        });
        if (!serverQueue) return message.channel.send({
            embed: {
                color: "#313131",
                description: "Senin için atlayabileceğim hiçbir şey yok"
            }
        });
        serverQueue.connection.dispatcher.end("[runCmd] Atla Komutu Kullanıldı");
        return message.channel.send({
            embed: {
                color: "#313131",
                description: "⏭️  **|**  Senin İçin Şarkıyı Atladım"
            }
        });

    } else if (command === "stop") {
        if (!message.member.voice.channel) return message.channel.send({
            embed: {
                color: "#313131",
                description: "Üzgünüm Ama Müzik Çalmak İçin Bir Ses Kanalında Olmanız Gerekiyor!"
            }
        });
        if (!serverQueue) return message.channel.send({
            embed: {
                color: "#313131",
                description: "Senin İçin Durdurabileceğim Hiçbir Şey Yok"
            }
        });
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end("[runCmd] Durdurma Komutu Kullanıldı");
        return message.channel.send({
            embed: {
                color: "#313131",
                description: "⏹️  **|**  Kuyruklar Siliniyor Ve Ses Kanalından Çıkılıyor ..."
            }
        });

    } else if (command === "volume" || command === "vol") {
        if (!message.member.voice.channel) return message.channel.send({
            embed: {
                color: "#313131",
                description: "Üzgünüm ama ses seviyesini ayarlamak için ses kanalında olmanız gerekiyor!"
            }
        });
        if (!serverQueue) return message.channel.send({
            embed: {
                color: "#313131",
                description: "Hiçbir Şey Uynamıyor"
            }
        });
        if (!args[1]) return message.channel.send({
            embed: {
                color: "#313131",
                description: `Mevcut Ses ・ **\`${serverQueue.volume}%\`**`
            }
        });
        if (isNaN(args[1]) || args[1] > 100) return message.channel.send({
            embed: {
                color: "#313131",
                description: "Ses Yalnızca ** \ `1 \` ** - ** \ `100 \` ** Aralığında Ayarlanabilir"
            }
        });
        serverQueue.volume = args[1];
        serverQueue.connection.dispatcher.setVolume(args[1] / 100);
        return message.channel.send({
            embed: {
                color: "#313131",
                description: `Ses Başarıyla Ayarlandı ・ **\`${args[1]}%\`**`
            }
        });

    } else if (command === "nowplaying" || command === "np") {
        if (!serverQueue) return message.channel.send({
            embed: {
                color: "#313131",
                description: "Hiçbir Şey Oynamıyor"
            }
        });
        return message.channel.send({
            embed: {
                color: "#313131",
                description: `🎶  **|**  Müzik Şimdi ・ **\`${serverQueue.songs[0].title}\`**`
            }
        });

    } else if (command === "queue" || command === "q") {

        let songsss = serverQueue.songs.slice(1)
        
        let number = songsss.map(
            (x, i) => `${i + 1} - ${x.title}`
        );
        number = chunk(number, 5);

        let index = 0;
        if (!serverQueue) return message.channel.send({
            embed: {
                color: "#313131",
                description: "Hiçbir Şey Oynamıyor"
            }
        });
        let embedQueue = new MessageEmbed()
            .setColor("#313131")
            .setAuthor("Şarkı Sırası", message.author.displayAvatarURL())
            .setDescription(number[index].join("\n"))
            .setFooter(`• Now Playing: ${serverQueue.songs[0].title} | Page ${index + 1} of ${number.length}`);
        const m = await message.channel.send(embedQueue);

        if (number.length !== 1) {
            await m.react("⬅");
            await m.react("🛑");
            await m.react("➡");
            async function awaitReaction() {
                const filter = (rect, usr) => ["⬅", "🛑", "➡"].includes(rect.emoji.name) &&
                    usr.id === message.author.id;
                const response = await m.awaitReactions(filter, {
                    max: 1,
                    time: 30000
                });
                if (!response.size) {
                    return undefined;
                }
                const emoji = response.first().emoji.name;
                if (emoji === "⬅") index--;
                if (emoji === "🛑") m.delete();
                if (emoji === "➡") index++;

                if (emoji !== "🛑") {
                    index = ((index % number.length) + number.length) % number.length;
                    embedQueue.setDescription(number[index].join("\n"));
                    embedQueue.setFooter(`Page ${index + 1} of ${number.length}`);
                    await m.edit(embedQueue);
                    return awaitReaction();
                }
            }
            return awaitReaction();
        }

    } else if (command === "pause") {
        if (serverQueue && serverQueue.playing) {
            serverQueue.playing = false;
            serverQueue.connection.dispatcher.pause();
            return message.channel.send({
                embed: {
                    color: "#313131",
                    description: "⏸  **|**  Müziği Senin İçin Duraklattı"
                }
            });
        }
        return message.channel.send({
            embed: {
                color: "#313131",
                description: "Hiçbir Şey Oynamıyor"
            }
        });

    } else if (command === "resume") {
        if (serverQueue && !serverQueue.playing) {
            serverQueue.playing = true;
            serverQueue.connection.dispatcher.resume();
            return message.channel.send({
                embed: {
                    color: "#313131",
                    description: "▶  **|**  Müziği Sizin İçin Devam Ettirdi"
                }
            });
        }
        return message.channel.send({
            embed: {
                color: "RED",
                description: "Hiçbir şey oynamıyor"
            }
        });
    } else if (command === "loop") {
        if (serverQueue) {
            serverQueue.loop = !serverQueue.loop;
            return message.channel.send({
                embed: {
                    color: "#313131",
                    description: `🔁  **|**  Döngü ・ **\`${serverQueue.loop === true ? "etkinleştirildi" : "engelli"}\`**`
                }
            });
        };
        return message.channel.send({
            embed: {
                color: "#313131",
                description: "Hiçbir şey oynamıyor"
            }
        });
    }
});

async function handleVideo(video, message, voiceChannel, playlist = false) {
    const serverQueue = queue.get(message.guild.id);
    const song = {
        id: video.id,
        title: Util.escapeMarkdown(video.title),
        url: `https://www.youtube.com/watch?v=${video.id}`
    };
    if (!serverQueue) {
        const queueConstruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 100,
            playing: true,
            loop: false
        };
        queue.set(message.guild.id, queueConstruct);
        queueConstruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(message.guild, queueConstruct.songs[0]);
        } catch (error) {
            console.error(`[ERROR] Ses Kanalına Katılamadım Çünkü ・ ${error}`);
            queue.delete(message.guild.id);
            return message.channel.send({
                embed: {
                    color: "#313131",
                    description: `Ses Kanalına Katılamadım Çünkü ・ **\`${error}\`**`
                }
            });
        }
    } else {
        serverQueue.songs.push(song);
        if (playlist) return;
        else return message.channel.send({
            embed: {
                color: "#313131",
                description: `✅  **|**  **\`${song.title}\`** Sıraya Eklendi`
            }
        });
    }
    return;
}

function chunk(array, chunkSize) {
    const temp = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        temp.push(array.slice(i, i + chunkSize));
    }
    return temp;
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);

    if (!song) {
        serverQueue.voiceChannel.leave();
        return queue.delete(guild.id);
    }

    const dispatcher = serverQueue.connection.play(ytdl(song.url))
        .on("finish", () => {
            const shiffed = serverQueue.songs.shift();
            if (serverQueue.loop === true) {
                serverQueue.songs.push(shiffed);
            };
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolume(serverQueue.volume / 100);

    serverQueue.textChannel.send({
        embed: {
            color: "#313131",
            description: `🎶  **|**  Müzik ・ **${song.title}**`
        }
    });
}

bot.login(process.env.BOT_TOKEN);

process.on("unhandledRejection", (reason, promise) => {
    try {
        console.error("İşlenmemiş Reddetme ・ ", promise, "reason: ", reason.stack || reason);
    } catch {
        console.error(reason);
    }
});

process.on("uncaughtException", err => {
    console.error(`Caught exception: ${err}`);
    process.exit(1);
});
