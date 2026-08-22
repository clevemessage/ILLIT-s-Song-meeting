(function attachAudioConfig(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GameAudioConfig = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createAudioConfig() {
  const songBase = "./assets/audio/songs/";
  const clipBase = "./assets/audio/clips/";

  const songs = [
    {
      id: "magnetic",
      title: "Magnetic",
      artist: "ILLIT",
      lyric: "Baby, I'm just trying to play it cool.",
      src: `${songBase}magnetic.mp3`,
      albumArt: "./assets/album_super_real_me.jpg",
    },
    {
      id: "iconic-by-mistake",
      title: "ICONIC BY MISTAKE",
      artist: "LE SSERAFIM x ILLIT x KATSEYE",
      lyric: "ICONIC BY MISTAKE.",
      src: `${songBase}iconic_by_mistake.mp3`,
      albumArt: "./assets/album_iconic_by_mistake.jpg",
    },
    {
      id: "toki-yo-tomare",
      title: "Toki Yo Tomare",
      artist: "ILLIT",
      lyric: "Toki Yo Tomare.",
      src: `${songBase}toki_yo_tomare.mp3`,
      albumArt: "./assets/album_toki_yo_tomare.jpg",
    },
    {
      id: "bomb-track-05",
      title: "TRACK 05",
      artist: "ILLIT",
      lyric: "TRACK 05.",
      src: `${songBase}bomb_track_05.mp3`,
      albumArt: "./assets/album_super_real_me.jpg",
    },
    {
      id: "bomb-track-04",
      title: "TRACK 04",
      artist: "ILLIT",
      lyric: "TRACK 04.",
      src: `${songBase}bomb_track_04.mp3`,
      albumArt: "./assets/album_super_real_me.jpg",
    },
    {
      id: "iykyk",
      title: "IYKYK (If You Know You Know)",
      artist: "ILLIT",
      lyric: "If you know you know.",
      src: `${songBase}iykyk.mp3`,
      albumArt: "./assets/album_iykyk.jpg",
    },
    {
      id: "not-cute-anymore",
      title: "NOT CUTE ANYMORE",
      artist: "ILLIT",
      lyric: "Not cute anymore.",
      src: `${songBase}not_cute_anymore.mp3`,
      albumArt: "./assets/album_not_cute_anymore.jpg",
    },
    {
      id: "its-me",
      title: "It's Me",
      artist: "ILLIT",
      lyric: "It's Me.",
      src: `${songBase}its_me.mp3`,
      albumArt: "./assets/album_super_real_me.jpg",
    },
  ];

  const songById = Object.fromEntries(songs.map((song) => [song.id, song]));

  const legacyMagneticTarget = {
    id: "level1-magnetic-target",
    songId: "magnetic",
    src: `${clipBase}target-level1.wav`,
    start: 0,
    duration: 4,
    type: "vocal",
    clipType: "vocal",
  };

  const targetClips = {
    vocalIntro: legacyMagneticTarget,
    level1: legacyMagneticTarget,
    level2: {
      id: "level2-iconic-target",
      songId: "iconic-by-mistake",
      src: `${clipBase}target-level2.mp3`,
      start: 0,
      duration: 2,
      type: "vocal",
      clipType: "vocal",
    },
    level3: {
      id: "level3-toki-instrumental-target",
      songId: "toki-yo-tomare",
      src: `${clipBase}target-level3.mp3`,
      start: 0,
      duration: 1.5,
      type: "instrumental",
      clipType: "instrumental",
    },
    level4: {
      id: "level4-iykyk-instrumental-target",
      songId: "iykyk",
      src: `${clipBase}target-level4.mp3`,
      start: 0,
      duration: 1.5,
      type: "instrumental",
      clipType: "instrumental",
    },
    level5: {
      id: "level5-not-cute-instrumental-target",
      songId: "not-cute-anymore",
      src: `${clipBase}target-level5.mp3`,
      start: 0,
      duration: 1.5,
      type: "instrumental",
      clipType: "instrumental",
    },
  };

  const clipPlan = {
    magnetic: {
      vocal: [8.5, 39.5, 70, 100],
      instrumental: [2.2, 4.5, 132, 146],
    },
    "iconic-by-mistake": {
      vocal: [24.5, 55, 88, 121],
      instrumental: [0, 2.4, 9, 158],
    },
    "toki-yo-tomare": {
      vocal: [18, 45, 78, 112],
      instrumental: [0, 2.4, 8.8, 150],
    },
    "bomb-track-05": {
      vocal: [15, 36, 64, 102],
      instrumental: [0, 2.2, 8, 124],
    },
    "bomb-track-04": {
      vocal: [16, 42, 74, 118],
      instrumental: [0, 2.2, 8, 142],
    },
    iykyk: {
      vocal: [14, 39, 70, 110],
      instrumental: [0, 2.2, 7, 128],
    },
    "not-cute-anymore": {
      vocal: [13, 35, 68, 104],
      instrumental: [0, 2.2, 7, 118],
    },
    "its-me": {
      vocal: [14, 38, 72, 108],
      instrumental: [0, 2.2, 7, 124],
    },
  };

  const clips = songs.flatMap((song) => {
    const plan = clipPlan[song.id];
    return [
      ...plan.vocal.map((start, index) => createClip(song, "vocal", start, index + 1)),
      ...plan.instrumental.map((start, index) => createClip(song, "instrumental", start, index + 1)),
    ];
  });

  function createClip(song, clipType, start, serial) {
    const clipId = `${song.id}-${clipType}-${String(serial).padStart(2, "0")}`;
    return {
      id: clipId,
      songId: song.id,
      title: song.title,
      artist: song.artist,
      lyric: song.lyric,
      isCorrect: false,
      clipType,
      clipSrc: `${clipBase}${clipId}.mp3`,
      start: 0,
      sourceStart: start,
      candidateDuration: 1.5,
      albumArt: song.albumArt,
    };
  }

  return {
    targetClip: targetClips.level1,
    targetClips,
    songs: songs.map((song) => ({
      ...song,
      isCorrect: song.id === "magnetic",
      fullSrc: song.src,
      fullDuration: 15,
    })),
    clips,
    firstLevelPool: songs.slice(),
  };
});
