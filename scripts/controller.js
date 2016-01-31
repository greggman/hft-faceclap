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

// Start the main app logic.
requirejs([
    '../bower_components/hft-utils/dist/imageloader',
    '../bower_components/hft-utils/dist/imageutils',
    'hft/commonui',
    'hft/gameclient',
    'hft/misc/input',
    'hft/misc/misc',
    'hft/misc/mobilehacks',
    'hft/syncedclock',
    'hft/misc/touch',
  ], function(
    ImageLoader,
    ImageUtils,
    CommonUI,
    GameClient,
    Input,
    Misc,
    MobileHacks,
    SyncedClock,
    Touch) {

  var globals = {
    debug: false,
  };
  Misc.applyUrlSettings(globals);
  MobileHacks.fixHeightHack();
  var clock = SyncedClock.createClock(true);

  var score = 0;
  var loaded;
  var hue;
  var inputElem = document.getElementById("inputarea");
  var colorElem = document.getElementById("display");
  var client = new GameClient();

  CommonUI.setupStandardControllerUI(client, globals);

  var images = {
    half:   { url: "images/REDFACE.png", },
  };
  ImageLoader.loadImages(images, checkImages);

  function checkImages() {
    loaded = true;
    processImages();
  }

  function processImages() {
    if (hue !== undefined && loaded) {
      var ctx = document.createElement("canvas").getContext("2d");
      ctx.canvas.width  = images.half.img.width;
      ctx.canvas.height = images.half.img.height;
      var canvas = ImageUtils.adjustHSV(images.half.img, hue / 360, 0, 0);
      var ctx2 = document.createElement("canvas").getContext("2d");
      ctx2.canvas.width  = images.half.img.width * 2;
      ctx2.canvas.height = images.half.img.height;
      ctx2.drawImage(canvas, 0, 0);
      ctx2.scale(-1, 1);
//      ctx2.translate(images.half.img.width, 0);
      ctx2.drawImage(canvas, -images.half.img.width * 2, 0);
      document.getElementById("c").appendChild(ctx2.canvas);
    }
  }

  var randInt = function(range) {
    return Math.floor(Math.random() * range);
  };

  // Send a message to the game when the screen is touched
  inputElem.addEventListener('pointerdown', function(event) {
    client.sendCmd('tap', {
      time: clock.getTime(),
    });
    event.preventDefault();
  });

  // Update our score when the game tells us.
  client.addEventListener('setColor', function(data) {
    colorElem.style.backgroundColor = data.color;
    hue = data.hue;
    processImages();
  });
});

