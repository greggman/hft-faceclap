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

define([
    './sprite',
  ], function(
    SpriteRenderer) {

  var s_spriteRenderer;

  var Sprite = function(uniforms) {
    this.visible  = true;
    this.uniforms = uniforms;
    this.x        = 0;
    this.y        = 0;
    this.centerX  = -0.5; // 0 = left, 0.5 = center; 1 = right
    this.centerY  = -0.5; // 0 = bottom, 0.5 = center; 1 = top
    this.width    = 0;
    this.height   = 0;
    this.rotation = 0;
    this.xScale   = 1;
    this.yScale   = 1;
  };

  var SpriteManager = function() {
    if (!s_spriteRenderer) {
      s_spriteRenderer = new SpriteRenderer();
    }
    this.sprites = [];
  };

  SpriteManager.prototype.createSprite = function() {
    var sprite = new Sprite(s_spriteRenderer.getUniforms());
    this.sprites.push(sprite);
    return sprite;
  };

  SpriteManager.prototype.deleteSprite = function(sprite) {
    var ndx = this.sprites.indexOf(sprite);
    if (ndx >= 0) {
      this.sprites.splice(ndx, 1);
    }
  };

  SpriteManager.prototype.draw = function() {
    s_spriteRenderer.drawPrep();
    for (var ii = 0; ii < this.sprites.length; ++ii) {
      var sprite = this.sprites[ii];
      if (sprite.visible) {
        s_spriteRenderer.draw(
            sprite.uniforms,
            sprite.x,
            sprite.y,
            sprite.width,
            sprite.height,
            sprite.rotation,
            sprite.xScale,
            sprite.yScale,
            sprite.centerX,
            sprite.centerY);
      }
    }
  };

  return SpriteManager;
});


