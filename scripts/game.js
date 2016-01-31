/*
 * Copyright 2014, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";

// Require will call this with GameServer, GameSupport, and Misc once
// gameserver.js, gamesupport.js, and misc.js have loaded.

// Start the main app logic.
requirejs([
    '../bower_components/hft-utils/dist/audio',
    '../bower_components/tdl/tdl/textures',
    '../bower_components/tdl/tdl/webgl',
    '../bower_components/hft-utils/dist/imageloader',
    '../bower_components/hft-utils/dist/imageutils',
    '../bower_components/hft-utils/dist/spritemanager',
    'hft/gameserver',
    'hft/gamesupport',
    'hft/misc/misc',
    'hft/syncedclock',
    './particleeffectmanager',
    './particlesystemmanager',
    './tweeny',
  ], function(
    AudioManager,
    Textures,
    WebGL,
    ImageLoader,
    ImageUtils,
    SpriteManager,
    GameServer,
    GameSupport,
    Misc,
    SyncedClock,
    ParticleEffectManager,
    ParticleSystemManager,
    tweeny) {

  var globals = {
    tapTime: 0.25,
    tempo: 60,
    minTempo: 60,
    maxTempo: 200,
    maxScore: 20, //20,
    checkDuration: 0.2,
    win: false,
  };
  var canvas = document.getElementById("c");
  var gl = WebGL.setupWebGL(canvas, {alpha:false}, function() {});
  globals.particleSystemManager = new ParticleSystemManager();
  gl.canvas.width = 1280;
  gl.canvas.height = 720;
  var spriteManager = new SpriteManager();
  var clock = SyncedClock.createClock(true);
  var hues = [0, 0.15, 0.55, 0.8];
  var teams = [
    {
      color: "hsla(  0,100%,50%,1)",
      hue: 0,
      players: [],
      pos: [0, 0],
      score: 0,
    },
    {
      color: "hsla(60,100%,50%,1)",
      hue: 50,
      players: [],
      pos: [1, 0],
      score: 0,
    },
    {
      color: "hsla(190,100%,50%,1)",
      hue: 190,
      players: [],
      pos: [0, 1],
      score: 0,
    },
    {
      color: "hsla(290,100%,50%,1)",
      hue: 290,
      players: [],
      pos: [0, 1],
      score: 0,
    },
  ];
  var players = [];
  globals.spriteManager = spriteManager;
  window.g = globals;
  Misc.applyUrlSettings(globals);

  function lowestTeamNdx() {
    var least = teams[0].players.length;
    var ndx = 0;
    for (var ii = 1; ii < teams.length; ++ii) {
      var len = teams[ii].players.length;
      if (len < least) {
        ndx = ii;
        least = len;
      }
    }
    return ndx;
  }

  var Player = function(netPlayer, name) {
    this.netPlayer = netPlayer;
    this.name = name;
    this.teamNdx = lowestTeamNdx();
    this.team = teams[this.teamNdx];
    this.tapTime = 0;
    this.team.players.push(this);
    netPlayer.sendCmd("setColor", {
      color: this.team.color,
      hue: this.team.hue,
    });

    netPlayer.addEventListener('disconnect', Player.prototype.disconnect.bind(this));
    netPlayer.addEventListener('tap', Player.prototype.tap.bind(this));
  };

  Player.prototype.tap = function(data) {
    this.tapTime = data.time + globals.tapTime;
  };

  Player.prototype.getTapPower = function() {
    return Math.max(0, this.tapTime - clock.getTime()) / globals.tapTime;
  };

  // The player disconnected.
  Player.prototype.disconnect = function() {
    var ndx = players.indexOf(this);
    if (ndx >= 0) {
      players.splice(ndx, 1);
    }
    ndx = this.team.players.indexOf(this);
    if (ndx >= 0) {
      this.team.players.splice(ndx, 1);
    }
  };

  var server = new GameServer();
  GameSupport.init(server, globals);

  // A new player has arrived.
  server.addEventListener('playerconnect', function(netPlayer, name) {
    players.push(new Player(netPlayer, name));
  });

  var images = {
    bg:    { url: "images/BG.png", },
    half:  { url: "images/REDFACE.png", },
    sun:   { url: "images/SUN.png", },
    dot:   { url: "images/RED.png", },
    maru:  { url: "images/MARU.png", },
    batsu: { url: "images/BATSU.png", },
    gnd:   { url: "images/GROUND.png", },

    rb:    { url: "images/REDBAR.png", },
    yb:    { url: "images/YELLOWBAR.png", },
    bb:    { url: "images/BLUEBAR.png", },
    pb:    { url: "images/PURPLEBAR.png", },
  };
  globals.images = images;
  ImageLoader.loadImages(images, processImages);

  function createTexture(img) {
    var tex = Textures.loadTexture(img);
    tex.setParameter(gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    tex.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    tex.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    tex.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  function processImages() {
    Object.keys(images).forEach(function(name) {
      var image = images[name];
      image.tex = createTexture(image.img);
    });

    globals.sunSprites = [];
    for (var ii = 0; ii < 2; ++ii) {
      var sunSprite = spriteManager.createSprite();
      sunSprite.uniforms.u_texture = images.sun.tex;
      sunSprite.x = 1280/2;
      sunSprite.y = 720/2;
      sunSprite.width  = images.sun.img.width;
      sunSprite.height = images.sun.img.height;
      sunSprite.xScale = ii ? 1 : -1;
      globals.sunSprites.push(sunSprite);
    }

    globals.grdSprite = spriteManager.createSprite();
    globals.grdSprite.uniforms.u_texture = images.gnd.tex;
    globals.grdSprite.x = 640;
    globals.grdSprite.y = 720;
    globals.grdSprite.centerY = -1;
    globals.grdSprite.width = images.gnd.img.width;
    globals.grdSprite.height = images.gnd.img.height;

    var barImages = [
      { img: "rb", x: 547, y: 187 },  // red
      { img: "yb", x: 728, y: 188 },
      { img: "bb", x: 606, y: 170 },
      { img: "pb", x: 670, y: 170 },
    ];

    teams.forEach(function(team, ndx) {
        var bar = barImages[ndx];
        var img = images[bar.img];
        var sprite = spriteManager.createSprite();
        sprite.uniforms.u_texture = img.tex;
        sprite.x = bar.x;
        sprite.y = bar.y;
        sprite.centerY = -1;
        sprite.width = img.img.width;
        sprite.height = img.img.height;
        team.scoreSprite = sprite;
    });

    globals.bgSprite = spriteManager.createSprite();
    globals.bgSprite.uniforms.u_texture = images.bg.tex;
    globals.bgSprite.x = 0;
    globals.bgSprite.y = 0;
    globals.bgSprite.width = 1280;
    globals.bgSprite.height = 720;

    globals.godFaceSprite = [];
    for (var ii = 0; ii < 2; ++ii) {
      var sprite = spriteManager.createSprite();
      sprite.uniforms.u_texture = images.half.tex;
      sprite.uniforms.u_hsvaAdjust[1] = -1;
      sprite.uniforms.u_hsvaAdjust[2] = -0.5;
      sprite.x = 640;
      sprite.y = 320;
      sprite.centerX = -1;
      sprite.xScale = ii ? -1 : 1;
      sprite.width  = images.half.img.width;
      sprite.height = images.half.img.height;
      globals.godFaceSprite.push(sprite);
    }


    globals.faces = [];
    var numFaces = 10;
    for (var ii = 0; ii < numFaces; ++ii) {
      var sprites = [
       spriteManager.createSprite(),
       spriteManager.createSprite(),
      ];
      sprites.forEach(function(sprite, ndx) {
        sprite.uniforms.u_hsvaAdjust[0] = hues[ii % 3];
        sprite.uniforms.u_texture = images.half.tex;
        sprite.xScale = ndx ? -1 : 1;
        sprite.y = 320;
        sprite.x = 640 + 640 * (ii | 0) / numFaces * -sprite.xScale;
        sprite.centerX = -1;
        sprite.width  = images.half.img.width;
        sprite.height = images.half.img.height;
      });
      globals.faces.push({
        sprites: sprites,
      });
    }

    teams.forEach(function(team, ndx) {
      var sprite = spriteManager.createSprite();
      team.powerSprite = sprite;
      sprite.uniforms.u_hsvaAdjust[0] = hues[ndx];
      sprite.uniforms.u_texture = images.dot.tex;
      sprite.y = 720; //(ndx < 2) ? 0 : 720,
      sprite.x = ((ndx + 1) / (teams.length + 1)) * 1280; //        (ndx & 1) ? 1280 : 0;
//      sprite.centerX = (ndx & 1) ? -1 : 0;
//      sprite.centerY = (ndx < 2) ? 0 : -1;
      sprite.centerY = -1;
      sprite.width  = 1280/6;
      sprite.height = 100;

      var sprite = spriteManager.createSprite();
      team.resultSprite = sprite;
      sprite.uniforms.u_hsvaAdjust[0] = hues[ndx];
      sprite.uniforms.u_texture = images.maru.tex;
      sprite.y = 700; //(ndx < 2) ? 0 : 720,
      sprite.x = ((ndx + 1) / (teams.length + 1)) * 1280; //        (ndx & 1) ? 1280 : 0;
//      sprite.centerX = (ndx & 1) ? -1 : 0;
//      sprite.centerY = (ndx < 2) ? 0 : -1;
      sprite.centerY = -1;
      sprite.width  = 64;
      sprite.height = 64;

    });
    globals.particleEffectManager = new ParticleEffectManager(globals);

    globals.winSprites = [];
    for (var ii = 0; ii < 200; ++ii) {
      var sprite = spriteManager.createSprite();
      sprite.uniforms.u_hsvaAdjust[0] = Math.random();
      sprite.uniforms.u_texture = images.half.tex;
      sprite.xScale = (ii % 2) ? -1 : 1;
      sprite.y = 320;
      sprite.x = 640;
      sprite.centerX = -1;
      sprite.width  = images.half.img.width;
      sprite.height = images.half.img.height;
      sprite.visible = false;
      sprite.rand = Math.random();
      globals.winSprites.push(sprite);
    }

    g.imagesLoaded = true;
  }


  var sounds = {
//    ewah:           { filename: "sounds/ewah.mp3", },
//    ah:             { filename: "sounds/ah.mp3", },
//    gah:            { filename: "sounds/gah.mp3", },
//    ung:            { filename: "sounds/ung.mp3", },

    ewah:           { filename: "sounds/g-mi.mp3", },
    ah:             { filename: "sounds/g-ho.mp3", },
    gah:            { filename: "sounds/g-ke.mp3", },
    ung:            { filename: "sounds/g-ah.mp3", },

    djembe:         { filename: "sounds/21902__reflecs__djembe-low-2-loud.wav", },
    vocaldrum:      { filename: "sounds/205935__speedenza__vocalised-drum-1.mp3", },
    drum4:          { filename: "sounds/100707__steveygos93__drum4-trim.mp3", },
    handdrum:       { filename: "sounds/clap.mp3", }, //  { filename: "sounds/11877__medialint__hand-frame-drum.wav",  },
    po:             { filename: "sounds/po.mp3", }, //  { filename: "sounds/11877__medialint__hand-frame-drum.wav",  },

    wrong:          { filename: "sounds/wrong.mp3", },
    win:            { filename: "sounds/win.mp3", },
  }
  var audioManager = new AudioManager(sounds);
  audioManager.on('loaded', function() { g.soundsLoaded = true; console.log("loaded"); });

  var notes = [
    "ewah",
    "ah",
    "gah",
    "ung",

    "djembe",
    "vocaldrum",
    "drum4",
    "handdrum",
    "po",
  ];

  var voiceSequences = [
    {
      notes: [
        { qqn:  0, sound: 3, face: true, },
      { qqn:  4, sound: 3, face: true, },
      { qqn:  8, sound: 3, face: true, },
      { qqn:  12, sound: 3, face: true, },
//        { qqn:  4, sound: 1, },
//        { qqn:  8, sound: 2, },
//        { qqn: 12, sound: 3, },
      ],
    },
//    {
//      notes: [
//        { qqn:  0,  sound: 3, face: true, },
////        { qqn:  2,  sound: 0, },
////        { qqn:  4,  sound: 3, },
////        { qqn:  8,  sound: 2, },
////        { qqn: 12,  sound: 1, },
//      ],
//    },
  ];

  var drumSequences = [
    {
      // 4 : bass
      // 5 : "toh"
      // 6 : tympany
      // 7 : handtap
      // 8 : po
      notes: [
        { qqn:  0, sound: 8, },
        { qqn:  2, sound: 7, },
        { qqn:  4, sound: 8, },
        { qqn:  6, sound: 7, },
        { qqn:  8, sound: 8, },
        { qqn: 10, sound: 7, },
        { qqn: 12, sound: 8, },
        { qqn: 14, sound: 7, },
      ],
    },
//    {
//      notes: [
//        { qqn:  0, sound: 7, },
//        { qqn:  1, sound: 7, },
//        { qqn:  2, sound: 7, },
//        { qqn:  3, sound: 7, },
//        { qqn:  4, sound: 7, },
//        { qqn:  5, sound: 7, },
//        { qqn:  6, sound: 7, },
//        { qqn:  7, sound: 7, },
//        { qqn:  8, sound: 7, },
//        { qqn:  9, sound: 7, },
//        { qqn: 10, sound: 7, },
//        { qqn: 11, sound: 7, },
//        { qqn: 12, sound: 7, },
//      ],
//    },
//    {
//      notes: [
//        { qqn:  0,  sound: 7, },
//        { qqn:  2,  sound: 7, },
//        { qqn:  4,  sound: 7, },
//        { qqn:  8,  sound: 7, },
//        { qqn: 12,  sound: 7, },
//      ],
//    },
  ];

  function SequencePlayer(sequences) {
    var sequenceNdx = 0;
    var noteNdx = 0;
    var sequence;
    var notes;

    setSubSequence(0);

    function setSubSequence(ndx) {
      sequenceNdx = ndx;
      sequence = sequences[sequenceNdx];
      notes = sequence.notes;
    }

    function getCurrentNote() {
      return notes[noteNdx];
    }

    function advanceNote() {
      ++noteNdx;
      if (noteNdx == notes.length) {
        noteNdx = 0;
        setSubSequence(Misc.randInt(sequences.length));
      }
    }

    this.setSubSequence = setSubSequence;
    this.advanceNote = advanceNote;
    this.getCurrentNote = getCurrentNote;
  }

  var sequencePlayers = [
    new SequencePlayer(voiceSequences),
    new SequencePlayer(drumSequences),
  ];

//  for (var ii = 0; ii < 20; ++ii) {
//    console.log(JSON.stringify(sequencePlayer.getCurrentNote()));
//    sequencePlayer.advanceNote();
//  }


//  function sequenceNotes(deltaTime) {
//    var targetBeat = queBeat + (deltaTime + lookAheadDuration) * tempo;
//    var sequence = sequences[sequenceNdx];
//    while (queTime < targetBeat) {
//      var note = notes[noteNdx];
//      if (queTime < note.qn) {
//        break;
//      }
//      var sound = note.sound
//      audioManager.playSound(notes[note.sound], ??note.qu);
//      ++noteNdx;
//      if (nodeNdx == notes.length) {
//        // nextSquence
//      }
//      queTime =
//    }
//  }
//
//  this.sequenceNotes = sequenceNotes;

  var nextNoteTime = 0;
  var current16thNote = 0;
  var lookAheadDuration = 3;

  function nextNote() {
    // Advance current note and time by a 16th note...
    var secondsPerBeat = globals.tempo ? 60.0 / globals.tempo : 0;	// picks up the CURRENT tempo value!
    nextNoteTime += 0.25 * secondsPerBeat;	// Add 1/4 of quarter-note beat length to time

    current16thNote++;	// Advance the beat number, wrap to zero
    if (current16thNote == 16) {
      current16thNote = 0;
    }
  }

  var faceQueue = [];
  globals.faceQueue = faceQueue;
  var totalFaces = 200;
  var faceList = [];
  var faceNdx = 0;
  for (var ii = 0; ii < 200; ++ii) {
    if (ii < 50) {
      faceList.push(ii % 3);
    } else {
      faceList.push(Misc.randInt(3));
    }
  }

  var faceCount = 0;

  function addNotes(currentTime) {
    if (!globals.tempo) {
      return;
    }
    var targetTime = currentTime + lookAheadDuration;
    var soundCount = 4;
    while (nextNoteTime < targetTime) {
      sequencePlayers.forEach(function(sequencePlayer) {
        var note = sequencePlayer.getCurrentNote();
        if (note.qqn == current16thNote) {
          var sound = notes[note.sound];
          var detune = undefined;
          if (note.face) {
            var face = Misc.randInt(hues.length); //(faceCount++ % hues.length)
            sound = notes[face];
            if (!globals.win) {
              faceQueue.push({faceNdx: face, time: nextNoteTime});
            }
            detune = face;
          } else {
            if (soundCount) {
              --soundCount;
              if (!globals.win) {
                audioManager.playSound(sound, nextNoteTime, detune);
              }
            }
          }
//          if (note.face && faceNdx < faceList.length) {
//            faceQueue.push({faceNdx: faceList[faceNdx++], time: nextNoteTime});
//          }
          sequencePlayer.advanceNote();
        }
      });
      nextNote();
    }
  }

  var freeFaceResolvers = [];
  var faceResolvers = [];
  globals.freeFaceResolvers = freeFaceResolvers;
  globals.faceResolvers = faceResolvers;

  function FaceResolver() {
    var faceInfo;
    var duration = 1;
    var checked;
    var good;
    var bad;
    var sprites = [
      spriteManager.createSprite(),
      spriteManager.createSprite(),
    ];
    this.sprites = sprites;
    sprites.forEach(function(sprite, ndx) {
      sprite.uniforms.u_texture = images.half.tex;
      sprite.xScale = ndx ? -1 : 1,
      sprite.x = 640;
      sprite.y = 320;
      sprite.width  = images.half.img.width;
      sprite.height = images.half.img.height;
      sprite.centerX = -1;
    });

    var die = function() {
      sprites.forEach(function(sprite) {
        sprite.visible = false;
      });
      var ndx = faceResolvers.indexOf(this);
      if (ndx >= 0) {
        faceResolvers.splice(ndx, 1);
      }
      freeFaceResolvers.push(this);
    }.bind(this);


    function init(fi) {
      faceInfo = fi;
      checked = fi.bad ? true : false;
      good = fi.bad ? false : (fi.good ? 0.1 : false);
      bad = fi.bad;
      sprites.forEach(function(sprite, ndx) {
        var sign = (ndx ? -1 : 1);
        sprite.uniforms.u_hsvaAdjust[0]  = hues[faceInfo.faceNdx];
        sprite.uniforms.u_hsvaAdjust[1]  = 0;
        sprite.x = 640;
        sprite.y = 320;
        sprite.xScale = sign;
        sprite.yScale = 1;
        sprite.rotation = 0;
      });
    };

    function isGood(faceNdx, time) {
      var elapsedTime = time - faceInfo.time;
      var lerp = elapsedTime / duration;
      var sameFace = faceInfo.faceNdx == faceNdx;
      var goodTiming = Math.abs(elapsedTime) < globals.checkDuration;
      var goodResult = sameFace && goodTiming;
      if (!checked && goodResult) {
        checked = true;
        good = lerp + 0.01;
      }
      return goodResult;
    }

    function process(time) {
      var elapsedTime = time - faceInfo.time;
      var lerp = elapsedTime / duration;
      var team = teams[faceInfo.faceNdx];
      //if (!checked && elapsedTime < globals.checkDuration) {
      //  var power = 0;
      //  teams.forEach(function(team, ndx) {
      //    power += team.power * (faceInfo.faceNdx == ndx ? 1 : 0);
      //  });
      //  if (power > 0.5) {
      //    checked = true;
      //    good = lerp + 0.01;
//    //      var sound = notes[faceInfo.faceNdx];
//    //      audioManager.playSound(sound);
      //  }
      //}
      if (lerp > 1) {
        if (good) {
          globals.tempo = Math.min(globals.tempo + 12, globals.maxTempo);
        } else {
          globals.tempo = Math.max(globals.tempo - 3, globals.minTempo);
          team.score = Math.min(globals.maxScore, Math.max(0, team.score + -1));
        }
        var goodTex = images.maru.tex;
        teams.forEach(function(team, ndx) {
          var g;
          if (ndx === faceInfo.faceNdx) {
            g = team.power > 0.5;
          } else {
            g = team.power < 0.2;
          }
          team.resultTimer = time;
          team.resultSprite.uniforms.u_texture = g ? images.maru.tex : images.batsu.tex;
          team.resultSprite.uniforms.u_hsvaAdjust[2] = g ? -0.2 : -1;
        });
        return die();
      }
      sprites.forEach(function(sprite, ndx) {
        var sign = (ndx ? -1 : 1);
        sprite.visible = lerp >= 0;
        sprite.uniforms.u_hsvaAdjust[3] = good ? 1 : -lerp;
        var s = 1 - lerp * 0.5; //1 + lerp * 1.5;
        var goodLerp = lerp - good;
        sprite.xScale = (good ? (1 + goodLerp) : s) * sign
        sprite.yScale = good ? (1 + goodLerp) : s;
        var timeToCenter = faceInfo.timeToCenter || 0;
        sprite.x = 640 + (640 * timeToCenter + (good ? 0 : lerp * 200)) * -sign;
        sprite.y = 320 + (good ? (goodLerp * -400) : (lerp * 300));
        sprite.rotation = good ? 0 : -lerp * sign;
        sprite.uniforms.u_hsvaAdjust[1] = good ? -lerp : 0;
      });
    }

    this.init = init;
    this.process = process;
    this.isGood = isGood;
  }

  function addFaceResolver(faceInfo) {
    var resolver = freeFaceResolvers.pop();
    if (!resolver) {
      resolver = new FaceResolver();
    }
    resolver.init(faceInfo);
    faceResolvers.push(resolver);
  }

  function render() {
    var time = audioManager.getTime();
    if (g.soundsLoaded) {
      addNotes(time);
    }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(1,1,1,1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    if (!g.imagesLoaded) {
      return;
    }

    var scale = gl.canvas.height / 720;
    globals.bgSprite.x = gl.canvas.width  / 2;
    globals.bgSprite.y = gl.canvas.height / 2;
    globals.bgSprite.xScale = scale;
    globals.bgSprite.yScale = scale;

    globals.sunSprites.forEach(function(sprite, ndx) {
      sprite.rotation = time * (ndx ? 0.1 : -0.1);
      sprite.uniforms.u_hsvaAdjust[0] = Math.sin(time * 10) * 0.05 + 0.05;
      sprite.uniforms.u_hsvaAdjust[1] = -0.6 + Math.sin(time * 0.1) * -0.2;
      sprite.xScale = (1.2 + Math.sin(time) * 0.1) * (ndx ? 1 : -1);
      sprite.yScale = 1.2 + Math.sin(time) * 0.1;
    });

    var faces = globals.faces;
    for (var ii = 0; ii < faces.length; ++ii) {
      var face = faces[faces.length - ii - 1];
      var sprites = face.sprites;
      sprites.forEach(function(sprite) {
        var faceInfo = faceQueue[ii];
        if (faceInfo) {
          var timeToCenter = faceInfo.time - time;
          sprite.x = 640 + 640 * timeToCenter * -sprite.xScale;
          sprite.uniforms.u_hsvaAdjust[0] = hues[faceInfo.faceNdx];
          sprite.visible = true;
        } else {
          sprite.visible = false;
        }
      });
    }

    while (faceQueue.length && faceQueue[0].time < time) {
//      globals.particleEffectManager.spawnConfetti(globals, 640, 360);
      addFaceResolver(faceQueue.splice(0, 1)[0]);
    }

    var totalScore = 0;
    teams.forEach(function(team, ndx) {
      totalScore += team.score;
      var taps = 0;
      team.players.forEach(function(player) {
        taps += player.getTapPower();
      });
      team.oldPower = team.power;
      team.power = taps / (team.players.length || 1);
      team.powerSprite.xScale = 0.1 + team.power;
      team.powerSprite.yScale = 0.1 + team.power;

      if (team.power > 0.5 && team.oldPower <= 0.5) {
        var good = false;
        faceResolvers.forEach(function(resolver) {
          if (resolver.isGood(ndx, time)) {
            //console.log("good resolver");
            good = true;
          }
        });
        if (!good) {
          var bad = [];
          faceQueue.forEach(function(faceInfo) {
            if (good || bad.length) {
              return;
            }
            var elapsedTime = time - faceInfo.time;
            var sameFace = faceInfo.faceNdx == ndx;
            var goodTiming = Math.abs(elapsedTime) < globals.checkDuration;
            var goodResult = sameFace && goodTiming;
            if (goodResult) {
  //            console.log("good faceQ");
              faceInfo.good = true;
              good = true;
            } else if (sameFace) {
              var timeToCenter = faceInfo.time - time;
              var xPos = 640 * timeToCenter;
              var onScreen = Math.abs(xPos) < 600;
  //console.log("sf:", sameFace, "timeToCenter:", timeToCenter, "xp:", xPos, "onSc:", onScreen);
              if (onScreen) {
                faceInfo.bad = true;
                faceInfo.timeToCenter = timeToCenter;
                faceInfo.time = time;
                bad.push(faceInfo);
              }
            }
          });
          while (bad.length) {
            var qNdx = faceQueue.indexOf(bad.pop());
  //console.log(qNdx, " addFaceR");
            addFaceResolver(faceQueue.splice(qNdx, 1)[0]);
          }
        }
        var sound = good ? notes[ndx] : "wrong";
        if (!globals.win) {
          audioManager.playSound(sound);
        }
        if (good) {
          team.score = Math.min(globals.maxScore, Math.max(0, team.score + (good ? 1 : -1)));
        }
      }

      if (team.resultTimer) {
        var elapsedTime = time - team.resultTime;
        var lerp = elapsedTime / 0.5;
        if (lerp > 1) {
          team.resultSprite.visible = false;
        } else {
          team.resultSprite.visible = (time * 30 | 0) % 2;
        }
      }

      // HIDE THIS!!!
//      team.powerSprite.visible = false;
      team.resultSprite.visible = false;

      team.scoreSprite.yScale = team.score / globals.maxScore;

      if (totalScore == globals.maxScore * teams.length) {
        if (!globals.win) {
          audioManager.playSound("win");
          globals.win = true;
        }
      }

    });

    faceResolvers.forEach(function(resolver) {
      resolver.process(time);
    });

    var maxTotalScore = globals.maxScore * teams.length;
    var t = totalScore / maxTotalScore;

    globals.godFaceSprite.forEach(function(sprite) {
      sprite.uniforms.u_hsvaAdjust[0] = (time * 10) % 1;
      sprite.uniforms.u_hsvaAdjust[1] = -1 + Math.pow(t, 3);
      sprite.uniforms.u_hsvaAdjust[2] = -0.5 + Math.pow(t, 3);
    });

//    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
//    teams.forEach(function(team) {
//      var taps = 0;
//      team.players.forEach(function(player) {
//        taps += player.getTapPower();
//      });
//      var power = taps / (team.players.length || 1);
//      var x = ctx.canvas.width  / 2 * team.pos[0];
//      var y = ctx.canvas.height / 2 * team.pos[1];
//      ctx.save();
//      ctx.translate(x, y);
//      ctx.fillStyle = "hsla(" + team.hue + ",100%," + (10 + power * 50 | 0) + "%,1)";
//      ctx.fillRect(0, 0, ctx.canvas.width / 2, ctx.canvas.height / 2);
//      ctx.save();
//      ctx.translate(ctx.canvas.width / 4, ctx.canvas.height / 4);
//      ctx.fillStyle = "white";
//      ctx.font = "50px sans-serif";
//      ctx.textAlign = "center";
//      ctx.textBaseline = "middle";
//      ctx.fillText("[" + team.players.length + "] " + power.toFixed(2), 0, 0);
//      ctx.restore();
//      ctx.restore();
//    });

    if (globals.win) {
      globals.winSprites.forEach(function(sprite, ndx) {
        var lerp = (time + sprite.rand + (ndx / 2 | 0) / (globals.winSprites.length/ 2)) % 1;
        var r = 640;
        var c = Math.cos(sprite.rand * Math.PI * 2);
        var s = Math.sin(sprite.rand * Math.PI * 2);
        sprite.visible = true;
        sprite.uniforms.u_hsvaAdjust[1] = -Math.sin(time * 20 + ndx) * 0.3;
        sprite.x = 640 + c * lerp * r;
        sprite.y = 320 + s * lerp * r;
      });
    }

    spriteManager.draw();
    globals.particleSystemManager.drawParticleSystemInFrontOfPlayer({x:0,y:0});
  };

  window.addEventListener('click', function() {
     globals.tempo = globals.tempo ? 0 : 60;
  });
  window.addEventListener('keypress', function() {
     globals.keyPressTime = audioManager.getTime();
  });

  GameSupport.run(globals, render);
});


