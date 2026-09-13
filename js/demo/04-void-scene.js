/* ============================================================
   TERMINAL: SHATTERED — void scene
   ------------------------------------------------------------
   Hand-written WebGL: the empty space, the door, the pylons, the thing that walks.

   Part 4/13 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const VoidScene = (function () {

        /* ---------- minimal 4x4 matrix helpers (column-major) ------ */
        function mIdent() {
            return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
        }
        function mMul(a, b) {
            const o = new Float32Array(16);
            for (let c = 0; c < 4; c++) {
                for (let r = 0; r < 4; r++) {
                    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1]
                                 + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
                }
            }
            return o;
        }
        function mPerspective(fovy, aspect, near, far) {
            const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
            return new Float32Array([
                f / aspect, 0, 0, 0,
                0, f, 0, 0,
                0, 0, (far + near) * nf, -1,
                0, 0, 2 * far * near * nf, 0
            ]);
        }
        function mTranslate(x, y, z) {
            const m = mIdent(); m[12] = x; m[13] = y; m[14] = z; return m;
        }
        function mScale(x, y, z) {
            const m = mIdent(); m[0] = x; m[5] = y; m[10] = z; return m;
        }
        function mRotX(a) {
            const c = Math.cos(a), s = Math.sin(a), m = mIdent();
            m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m;
        }
        /* Cables hang from the lip and swing in the x-y plane, which needs
           a Z rotation — the file had only X and Y. Column-major, matching
           everything else here: column 0 = (c, s, 0, 0). */
        function mRotZ(a) {
            const c = Math.cos(a), s = Math.sin(a), m = mIdent();
            m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m;
        }

        function mRotY(a) {
            const c = Math.cos(a), s = Math.sin(a), m = mIdent();
            m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m;
        }
        /* first-person view matrix: rotX(-pitch) · rotY(-yaw) · T(-eye) */
        function mView(eye, yaw, pitch) {
            return mMul(mMul(mRotX(-pitch), mRotY(-yaw)),
                        mTranslate(-eye[0], -eye[1], -eye[2]));
        }

        /* ---------- GLSL ------------------------------------------- */
        const PRECISION = [
            "#ifdef GL_FRAGMENT_PRECISION_HIGH",
            "precision highp float;",
            "#else",
            "precision mediump float;",
            "#endif"
        ].join("\n");

        const NOISE = [
            "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }",
            "float noise(vec2 p){",
            "  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);",
            "  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),",
            "             mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x), f.y);",
            "}"
        ].join("\n");

        const VS_SCENE = [
            "attribute vec3 aPos;",
            "attribute vec2 aUV;",
            "uniform mat4 uProj, uView, uModel;",
            "varying vec2 vUV;",
            "varying vec3 vWorld;",
            "void main(){",
            "  vec4 w = uModel * vec4(aPos, 1.0);",
            "  vWorld = w.xyz;",
            "  vUV = aUV;",
            "  gl_Position = uProj * uView * w;",
            "}"
        ].join("\n");

        const FS_SCENE = [
            PRECISION,
            "varying vec2 vUV;",
            "varying vec3 vWorld;",
            "uniform int   uKind;",
            "uniform sampler2D uScreen;",
            "uniform float uHasScreen, uFogD, uCorrupt;",
            "uniform vec3  uL0, uL1, uL2;",              // lamp positions
            "uniform float uI0, uI1, uI2;",              // lamp intensities
            "uniform float uDoorMode;",                  // 0 loop · 1 halted · 2 open
            "uniform float uDrift, uLoopRush;",          // player-made anomalies         // 0 floor · 1 solid · 2 portal · 3 screen
            "uniform float uFloorEdgeZ;",                // the floor stops here. past it, nothing
            "uniform float uTime, uGlitch, uWake;",
            "uniform vec3  uColor, uCam, uLampA, uLampB;",
            NOISE,
            "void main(){",
            "  float dist = length(vWorld - uCam);",
            "  float fog  = exp(-dist * uFogD);",
            "  vec3 col = vec3(0.0);",
            "  float a = 1.0;",

            /* ---- floor: grid lit by the two lamps -------------- */
            "  if (uKind == 0) {",
            "    vec2 g = vWorld.xz;",
            /*   The sector break. The floor quad is 120x120, so it used to
                 run 36 metres PAST the doorway — the player looked through
                 an open door at unbroken, lit, grid-ruled floor and then
                 fell through it. That is what a missing collider looks
                 like, and it is the whole reason the ending read as a bug.

                 The tear is displaced by the noise already compiled into
                 this shader so it reads as torn plating rather than as a
                 clipping plane. The amplitudes are load-bearing: maximum
                 deviation is 0.28 + 0.08 = 0.36, and with uFloorEdgeZ at
                 zN + 0.15 the most southern the tear can reach is
                 zN + 0.51 — still 0.19 m north of the walk clamp at
                 zN + 0.7 (step(), `-rm2.d + 3.1`). The player therefore
                 can never stand on floor that is not drawn. Change either
                 number and that inequality has to be re-checked. */
            "    float tear = uFloorEdgeZ",
            "              + (noise(vec2(vWorld.x * 0.42,  5.1)) - 0.5) * 0.56",
            "              + (noise(vec2(vWorld.x * 1.90, 17.3)) - 0.5) * 0.16;",
            "    if (vWorld.z < tear) discard;",
            /*   bad-compare anomaly: the grid shears against itself, as if
                 two versions of the floor disagree about where they are */
            "    if (uDrift > 0.5) {",
            "      g.x += sin(vWorld.z * 0.35 + uTime * 0.9) * 0.55;",
            "      g.y += cos(vWorld.x * 0.28 - uTime * 0.7) * 0.55;",
            "    }",
            "    float lw = 0.018 + dist * 0.0042;",
            "    vec2 f2 = abs(fract(g + 0.5) - 0.5);",
            "    float line = 1.0 - smoothstep(0.0, lw, min(f2.x, f2.y));",
            "    vec2 f3 = abs(fract(g * 0.2 + 0.5) - 0.5) / 0.2;",
            "    float major = 1.0 - smoothstep(0.0, lw * 1.6, min(f3.x, f3.y));",
            "    float d0 = length(vWorld.xz - uL0.xz);",
            "    float d1 = length(vWorld.xz - uL1.xz);",
            "    float d2 = length(vWorld.xz - uL2.xz);",
            "    float dB = length(vWorld.xz - uLampB.xz);",
            "    float l0 = uI0 / (1.0 + 0.30 * d0 * d0);",
            "    float l1 = uI1 / (1.0 + 0.26 * d1 * d1);",
            "    float l2 = uI2 / (1.0 + 0.26 * d2 * d2);",
            "    float lA = l0 + l1 + l2;",
            /*   1.35 saturated the tile directly under the threshold — the
                 third of the three layers that made the finale a white
                 card. With the floor now torn off there, what is left is
                 the lip, and it wants a rim of light, not a pool. */
            "    float doorGlow = (uDoorMode > 1.5 ? 0.42 : (uDoorMode > 0.5 ? 0.12 : 0.55));",
            "    float lB = doorGlow / (1.0 + 0.55 * dB * dB);",
            "    vec3 doorCol = uDoorMode > 1.5 ? vec3(0.55, 1.0, 0.92) : vec3(1.0, 0.28, 0.30);",
            "    vec3 lit = vec3(0.55, 0.92, 1.0) * lA * 2.6 + doorCol * lB * 1.5;",
            "    col = (vec3(0.10, 0.16, 0.20) * line + vec3(0.16, 0.32, 0.38) * major) * (0.35 + lA * 6.0);",
            "    col += lit * (0.06 + 0.55 * line);",
            /*   a wet-floor smear of the terminal's reflection */
            "    float smear = exp(-abs(vWorld.x - uL0.x) * 1.4) * exp(-abs(vWorld.z - uL0.z) * 0.10);",
            "    col += vec3(0.35, 0.85, 1.0) * smear * 0.30;",
            /*   the lip: shadowed underside, metal still hot where it tore */
            "    float lip = 1.0 - smoothstep(0.0, 0.70, vWorld.z - tear);",
            "    col = mix(col, col * 0.35, lip * 0.80);",
            "    col += vec3(1.00, 0.40, 0.14) * pow(lip,  2.0) * 0.35;",
            "    col += vec3(0.55, 1.00, 0.95) * pow(lip, 12.0) * 1.10;",
            "  }",

            /* ---- solid: matte body lit by the terminal --------- */
            "  else if (uKind == 1) {",
            "    float lA = uI0 / (1.0 + 0.22 * pow(length(vWorld - uL0), 2.0))",
            "             + uI1 / (1.0 + 0.20 * pow(length(vWorld - uL1), 2.0))",
            "             + uI2 / (1.0 + 0.20 * pow(length(vWorld - uL2), 2.0));",
            "    col = uColor * (0.16 + lA * 3.2);",
            "    col += vec3(0.30, 0.75, 0.95) * lA * 0.55;",
            "  }",

            /* ---- portal: the door that keeps failing to load --- */
            "  else if (uKind == 2) {",
            "    vec2 uv = vUV;",
            "    float band = floor(uv.y * 24.0);",
            "    float rush = 1.0 + uLoopRush * 5.0;",   /* runaway retry loop */
            "    float live = step(0.62, hash(vec2(band, floor(uTime * 6.0 * rush))));",
            "    float jit  = (hash(vec2(band, floor(uTime * 13.0 * rush))) - 0.5);",
            "    uv.x += jit * 0.22 * live * uGlitch;",
            "    float n  = noise(vec2(uv.x * 7.0, uv.y * 22.0 - uTime * 1.7));",
            "    float n2 = noise(vec2(uv.x * 31.0 + uTime, uv.y * 60.0));",
            "    vec3 base = mix(vec3(0.03, 0.10, 0.13), vec3(0.20, 0.85, 0.95), n * 0.75);",
            "    base += vec3(0.9, 0.15, 0.2) * step(0.86, n2) * uGlitch;",
            /*   edge halo so the frame reads as a doorway */
            "    vec2 e = abs(uv - 0.5) * 2.0;",
            "    float edge = smoothstep(0.72, 1.0, max(e.x, e.y));",
            "    base += vec3(0.35, 0.95, 1.0) * edge * 0.85;",
            /*   the whole thing drops out for a frame now and then */
            "    float alive = step(0.06, hash(vec2(floor(uTime * 9.0), 17.0)));",
            "    if (uDoorMode > 1.5) {",           /* open: a hole, not a slab.
                   The doorway has to read as an ABSENCE. It used to be a
                   near-white plane at alpha 0.95 — and the portal branch is
                   exempt from fog, so it never dimmed with distance either.
                   Everything past it is drawn opaque earlier in the frame,
                   so the only job left here is a rim bright enough to say
                   "this is the way out" and a centre transparent enough to
                   let the break show through. */
            "      float rim = smoothstep(0.80, 1.0, max(e.x, e.y));",
            "      vec3 core = vec3(0.006, 0.012, 0.016) + vec3(0.02, 0.05, 0.06) * n * 0.5;",
            "      col = core + vec3(0.30, 1.00, 0.92) * rim * 1.60;",
            "      a   = clamp(0.10 + rim * 0.92, 0.0, 1.0);",
            "    } else if (uDoorMode > 0.5) {",    /* halted: dead slab */
            "      col = vec3(0.04, 0.05, 0.06) + vec3(0.10, 0.16, 0.18) * edge;",
            "      a = 0.92;",
            "    } else {",
            "      col = base * (0.35 + 0.65 * alive);",
            "      a = (0.62 + 0.38 * alive) * (1.0 - edge * 0.15);",
            "    }",
            "  }",

            /* ---- screen: the CRT face, seen from the outside --- */
            /* ---- 5: the Void under the broken sector -------------
                 With the floor discarded past the tear the doorway would
                 otherwise show clearColor black, which is indistinguishable
                 from a rendering hole. This is black that MOVES, so it
                 reads as depth instead of as nothing. */
            "  else if (uKind == 5) {",
            "    vec2 p5 = vWorld.xz * 0.055;",
            "    float a1 = noise(p5 + vec2(uTime *  0.035, uTime * -0.021));",
            "    float a2 = noise(p5 * 2.7 - vec2(uTime * 0.052, uTime * 0.030));",
            "    float churn = pow(a1 * 0.65 + a2 * 0.35, 2.2);",
            "    col  = vec3(0.010, 0.014, 0.022) + vec3(0.030, 0.055, 0.085) * churn;",
            "    col += vec3(0.10, 0.26, 0.34) * pow(churn, 6.0) * 0.9;",
            "  }",
            /* ---- 6: a slab of the old floor, still falling --------
                 uKind 1 will not do: its lighting collapses to ~0 that far
                 from the lamps, so a solid slab would render at 16% of its
                 colour and be invisible. The grid is computed from world xz
                 so it visibly does not line up with the floor it fell off. */
            "  else if (uKind == 6) {",
            "    vec2 f6 = abs(fract(vWorld.xz + 0.5) - 0.5);",
            "    float lw6 = 0.030 + dist * 0.0040;",
            "    float line6 = 1.0 - smoothstep(0.0, lw6, min(f6.x, f6.y));",
            "    col = uColor * 0.55 + vec3(0.09, 0.15, 0.19) * line6;",
            "    float rim6 = 1.0 - smoothstep(0.0, 0.10,",
            "                  min(min(vUV.x, 1.0 - vUV.x), min(vUV.y, 1.0 - vUV.y)));",
            "    col += vec3(0.55, 0.95, 1.00) * rim6 * 0.22;",
            "    col *= 0.35 + 0.65 * exp(-max(0.0, -vWorld.y) * 0.045);",
            "  }",
            /* ---- 7: a conduit torn out of the lip, still live -----
                 The spark is a hash flicker keyed off floor(uTime * N): one
                 hash() per fragment, no particle system, no buffer, no
                 per-frame state. uColor.r carries the per-cable seed. */
            "  else if (uKind == 7) {",
            "    float seg = floor(vUV.y * 9.0);",
            "    float sp  = hash(vec2(seg, floor(uTime * 11.0 + uColor.r * 31.0)));",
            "    float arc = step(0.90, sp);",
            "    float hot = smoothstep(0.35, 1.0, vUV.y);",
            "    col  = vec3(0.05, 0.05, 0.06);",
            "    col += vec3(0.30, 0.85, 1.00) * hot * 0.25;",
            "    col += vec3(1.00, 0.92, 0.70) * arc * (0.5 + hot * 2.5);",
            "  }",
            /* ---- 8: the plate that used to hang beside the door ---
                 There is no font system in this project and the room is read
                 in four locales, so a plate with words would be wrong in
                 three of them and a real one would need a glyph atlas — a
                 new texture, which the no-allocation rule forbids. So it
                 says it in SHAPE: hazard chevrons, a bang in a triangle, and
                 two rows of type scorched past reading. */
            "  else if (uKind == 8) {",
            "    vec2 uv8 = vUV;",
            "    vec2 e8 = abs(uv8 - 0.5) * 2.0;",
            "    float border = step(0.78, max(e8.x, e8.y));",
            "    float stripe = step(0.5, fract((uv8.x + uv8.y) * 9.0));",
            "    vec3 plate = mix(vec3(0.09, 0.09, 0.08),",
            "                     mix(vec3(0.03, 0.03, 0.03), vec3(0.75, 0.62, 0.10), stripe),",
            "                     border);",
            "    vec2 c8 = (uv8 - vec2(0.5, 0.58)) / 0.30;",
            "    float w8 = 0.92 * clamp((1.0 - c8.y) / 1.75, 0.0, 1.0);",
            "    float tri   = step(-0.75, c8.y) * step(c8.y, 1.00) * step(abs(c8.x), w8);",
            "    float triIn = step(-0.60, c8.y) * step(c8.y, 0.80) * step(abs(c8.x), w8 - 0.20);",
            "    float ring  = tri - triIn;",
            "    float bar   = step(abs(c8.x), 0.11) * step(-0.18, c8.y) * step(c8.y, 0.52);",
            "    float dotm  = step(length(c8 - vec2(0.0, -0.38)), 0.13);",
            "    plate = mix(plate, vec3(0.86, 0.72, 0.07), max(ring, max(bar, dotm)));",
            "    float row8   = floor((uv8.y - 0.06) * 22.0);",
            "    float inRows = step(0.055, uv8.y) * step(uv8.y, 0.20)",
            "                 * step(0.16, uv8.x) * step(uv8.x, 0.84);",
            "    float glyph  = step(0.42, hash(vec2(floor(uv8.x * 34.0), row8)));",
            "    plate = mix(plate, vec3(0.55, 0.56, 0.52), glyph * inRows);",
            "    plate *= mix(1.0, 0.28, smoothstep(0.35, 0.95, noise(uv8 * 4.2 + 9.0)));",
            "    float lp = uI0 / (1.0 + 0.22 * pow(length(vWorld - uL0), 2.0))",
            "             + uI1 / (1.0 + 0.20 * pow(length(vWorld - uL1), 2.0))",
            "             + uI2 / (1.0 + 0.20 * pow(length(vWorld - uL2), 2.0));",
            "    col = plate * (0.20 + 2.40 * lp) + vec3(0.30, 0.95, 1.00) * 0.06;",
            "  }",
            "  else if (uKind == 4) {",           /* entity billboard */
            "    vec2 p = vUV - 0.5;",
            "    float body = smoothstep(0.5, 0.12, length(p * vec2(1.7, 1.0)));",
            "    float head = smoothstep(0.16, 0.02, length((p - vec2(0.0, 0.30)) * vec2(1.6, 1.0)));",
            "    float m = max(body * step(p.y, 0.26), head);",
            "    float tear = step(0.5, hash(vec2(floor(vUV.y * 40.0), floor(uTime * 14.0))));",
            "    m *= mix(1.0, tear, 0.35 * uGlitch);",
            "    col = mix(vec3(0.02, 0.0, 0.0), vec3(0.65, 0.05, 0.08), m);",
            "    col += vec3(1.0, 0.2, 0.2) * head * 0.8;",
            "    a = m * (0.55 + 0.45 * uCorrupt);",
            "  }",
            "  else {",
            "    vec2 uv = vUV;",
            "    float rows = 20.0;",
            "    float row  = floor(uv.y * rows + uTime * 1.6);",
            "    float len  = 0.25 + 0.7 * hash(vec2(row, 4.0));",
            "    float ink  = step(uv.x, len) * step(0.34, hash(vec2(floor(uv.x * 44.0), row)));",
            "    float scan = 0.55 + 0.45 * sin(uv.y * 190.0);",
            "    col = vec3(0.05, 0.30, 0.38);",
            "    col += vec3(0.45, 1.0, 1.0) * ink * 0.85;",
            "    col *= scan;",
            /*   cursor block on the current line */
            "    float cur = step(abs(uv.x - len - 0.02), 0.012)",
            "              * step(abs(fract(uv.y * rows) - 0.5), 0.34)",
            "              * step(0.5, fract(uTime * 1.6));",
            "    col += vec3(0.6, 1.0, 1.0) * cur;",
            "    col += vec3(0.10, 0.45, 0.60);",           // ambient face glow
            "    if (uHasScreen > 0.5) {",
            /*     the monitor really does show the session: sample the
                   2D canvas the shell renders its last activity onto */
            "      vec3 shot = texture2D(uScreen, vec2(uv.x, 1.0 - uv.y)).rgb;",
            "      col = shot * scan + vec3(0.02, 0.10, 0.13);",
            "    }",
            "  }",

            "  if (uKind != 2) col *= fog;",
            "  col *= mix(0.25, 1.0, uWake);",              // dim while the eyes adjust
            "  col = mix(col, vec3(col.r * 1.35, col.g * 0.45, col.b * 0.5), uCorrupt * 0.75);",
            "  gl_FragColor = vec4(col, a);",
            "}"
        ].join("\n");

        /* additive camera-facing billboard, used for light bloom */
        const VS_GLOW = [
            "attribute vec3 aPos;",
            "attribute vec2 aUV;",
            "uniform mat4 uProj, uView;",
            "uniform vec3 uCenter;",
            "uniform vec2 uSize;",
            "varying vec2 vUV;",
            "void main(){",
            "  vec3 r = vec3(uView[0][0], uView[1][0], uView[2][0]);",
            "  vec3 u = vec3(uView[0][1], uView[1][1], uView[2][1]);",
            "  vec3 w = uCenter + r * (aPos.x * uSize.x) + u * (aPos.y * uSize.y);",
            "  vUV = aUV;",
            "  gl_Position = uProj * uView * vec4(w, 1.0);",
            "}"
        ].join("\n");

        const FS_GLOW = [
            PRECISION,
            "varying vec2 vUV;",
            "uniform vec3  uColor;",
            "uniform float uIntensity;",
            "void main(){",
            "  float d = length(vUV - 0.5) * 2.0;",
            "  float f = pow(max(0.0, 1.0 - d), 2.4);",
            "  gl_FragColor = vec4(uColor * f * uIntensity, f);",
            "}"
        ].join("\n");

        const VS_DUST = [
            "attribute vec3 aPos;",
            "uniform mat4 uProj, uView;",
            "uniform vec3 uCam;",
            "uniform float uTime;",
            "varying float vFade;",
            "void main(){",
            /* motes drift and wrap in a 44-unit box that follows the camera,
               so you are always inside the dust instead of walking out of it */
            "  vec3 p = aPos;",
            "  p.y += sin(uTime * 0.35 + aPos.x * 3.1) * 0.55;",
            "  p.x += cos(uTime * 0.22 + aPos.z * 2.3) * 0.45;",
            "  vec3 rel = p - uCam;",
            "  rel = mod(rel + 22.0, 44.0) - 22.0;",
            "  vec3 w = uCam + rel;",
            "  vec4 clip = uProj * uView * vec4(w, 1.0);",
            "  float d = length(rel);",
            "  vFade = exp(-d * 0.075) * 0.55;",
            "  gl_PointSize = clamp(46.0 / max(d, 0.8), 1.0, 3.5);",
            "  gl_Position = clip;",
            "}"
        ].join("\n");

        const FS_DUST = [
            PRECISION,
            "varying float vFade;",
            "void main(){",
            "  vec2 c = gl_PointCoord - 0.5;",
            "  float f = max(0.0, 1.0 - length(c) * 2.0);",
            "  gl_FragColor = vec4(vec3(0.55, 0.92, 1.0) * f * vFade, f * vFade);",
            "}"
        ].join("\n");

        const VS_POST = [
            "attribute vec3 aPos;",
            "attribute vec2 aUV;",
            "varying vec2 vUV;",
            "void main(){ vUV = aUV; gl_Position = vec4(aPos.xy * 2.0, 0.0, 1.0); }"
        ].join("\n");

        const FS_POST = [
            PRECISION,
            "varying vec2 vUV;",
            "uniform sampler2D uTex;",
            "uniform float uTime, uGlitch, uWake, uScan, uVig, uFlash, uFade;",
            NOISE,
            "void main(){",
            /* barrel warp — the void is being watched through a tube */
            "  vec2 uv = vUV - 0.5;",
            "  float r2 = dot(uv, uv);",
            "  uv *= 1.0 + r2 * 0.11;",
            "  uv += 0.5;",
            /* horizontal tear bands */
            "  float tear = step(0.985 - uGlitch * 0.03, hash(vec2(floor(uv.y * 55.0), floor(uTime * 12.0))));",
            "  uv.x += (hash(vec2(floor(uv.y * 55.0), floor(uTime * 12.0) + 1.0)) - 0.5) * 0.06 * tear * uGlitch;",
            "  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0,0.0,0.0,1.0); return; }",
            /* chromatic split, stronger at the edges and while waking */
            "  float split = (0.0016 + r2 * 0.010) * (0.6 + uGlitch) + (1.0 - uWake) * 0.012;",
            "  vec3 col;",
            "  col.r = texture2D(uTex, uv + vec2(split, 0.0)).r;",
            "  col.g = texture2D(uTex, uv).g;",
            "  col.b = texture2D(uTex, uv - vec2(split, 0.0)).b;",
            /* scanlines + a slow rolling bright bar */
            "  float sl = 0.86 + 0.14 * sin(uv.y * 900.0);",
            "  col *= mix(1.0, sl, uScan);",
            "  col += 0.035 * uScan * smoothstep(0.0, 1.0, sin(uv.y * 6.0 - uTime * 0.8));",
            /* vignette */
            "  float vig = 1.0 - smoothstep(0.35, 0.95, length(vUV - 0.5) * 1.35);",
            "  col *= mix(1.0, vig, uVig);",
            /* film grain + interact flash */
            "  col += (hash(uv * 640.0 + fract(uTime)) - 0.5) * 0.045;",
            "  col += uFlash;",
            "  col *= (1.0 - uFade);",          /* the cutscene closes on black */
            "  gl_FragColor = vec4(col, 1.0);",
            "}"
        ].join("\n");

        /* ---------- GL plumbing ------------------------------------ */
        function compile(gl, type, src) {
            const sh = gl.createShader(type);
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                throw new Error("shader: " + gl.getShaderInfoLog(sh));
            }
            return sh;
        }
        function link(gl, vsSrc, fsSrc, attrs) {
            const p = gl.createProgram();
            gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsSrc));
            gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
            gl.linkProgram(p);
            if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
                throw new Error("link: " + gl.getProgramInfoLog(p));
            }
            const o = { p: p, a: {}, u: {} };
            (attrs || []).forEach(function (n) { o.a[n] = gl.getAttribLocation(p, n); });
            const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
            for (let i = 0; i < n; i++) {
                const info = gl.getActiveUniform(p, i);
                o.u[info.name] = gl.getUniformLocation(p, info.name);
            }
            return o;
        }
        function buffer(gl, data) {
            const b = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, b);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
            return b;
        }

        /* interleaved pos(3) + uv(2) */
        const QUAD_XY = [
            -0.5, -0.5, 0,  0, 0,   0.5, -0.5, 0,  1, 0,   0.5, 0.5, 0,  1, 1,
            -0.5, -0.5, 0,  0, 0,   0.5,  0.5, 0,  1, 1,  -0.5, 0.5, 0,  0, 1
        ];
        const QUAD_XZ = [
            -0.5, 0, -0.5,  0, 0,   0.5, 0, -0.5,  1, 0,   0.5, 0, 0.5,  1, 1,
            -0.5, 0, -0.5,  0, 0,   0.5, 0,  0.5,  1, 1,  -0.5, 0, 0.5,  0, 1
        ];
        function makeCube() {
            const f = [
                [[-0.5,-0.5, 0.5],[0.5,-0.5, 0.5],[0.5,0.5, 0.5],[-0.5,0.5, 0.5]],
                [[ 0.5,-0.5,-0.5],[-0.5,-0.5,-0.5],[-0.5,0.5,-0.5],[ 0.5,0.5,-0.5]],
                [[-0.5,-0.5,-0.5],[-0.5,-0.5, 0.5],[-0.5,0.5, 0.5],[-0.5,0.5,-0.5]],
                [[ 0.5,-0.5, 0.5],[ 0.5,-0.5,-0.5],[ 0.5,0.5,-0.5],[ 0.5,0.5, 0.5]],
                [[-0.5, 0.5, 0.5],[ 0.5, 0.5, 0.5],[ 0.5,0.5,-0.5],[-0.5,0.5,-0.5]],
                [[-0.5,-0.5,-0.5],[ 0.5,-0.5,-0.5],[ 0.5,-0.5,0.5],[-0.5,-0.5,0.5]]
            ];
            const uv = [[0,0],[1,0],[1,1],[0,1]], out = [];
            f.forEach(function (q) {
                [0, 1, 2, 0, 2, 3].forEach(function (i) {
                    out.push(q[i][0], q[i][1], q[i][2], uv[i][0], uv[i][1]);
                });
            });
            return out;
        }

        /* ---------- scene constants -------------------------------- */
        const TERMINAL = [2.35, 0, -7.4];      // ahead and to the right, as briefed
        /* The door is set into the north wall, so its z tracks the room
           depth — move the wall in the config and the door moves with it. */
        const DOOR     = [0.0, 0, -23.6];
        /* The two pylons /dev/lamp1 and /dev/lamp2 are standing out there
           in the dark from the first frame — unlit, unmentioned, and
           invisible until the player finds the service that owns them. */
        const PYLON1   = [-4.6, 0, -13.2];
        const PYLON2   = [ 4.8, 0, -19.4];
        /* Two instruments bolted to the side walls. They exist so the
           interlock puzzle cannot be solved from the chair: the numbers
           they carry are generated per run and written down nowhere else,
           so the only way to learn them is to stand up and walk over.
           Both sit well south of the barrier plane (z = -17.9) — they have
           to be readable while the partition is still up, because reading
           them is what lowers it. */
        const GAUGE1   = [-7.55, 0, -11.0];   // west wall: pressure dial
        const GAUGE2   = [ 7.55, 0, -15.0];   // east wall: vent rating plate
        const SEAT     = [2.47, 1.34, -6.42]; // eye pose when working the desk
        const EYE_H    = 1.62;
        const REACH    = 2.15;                 // interact radius

        /* Everything in the void the player can walk up to and press E on.
           `gate` is consulted by the demo — a pylon that is switched off is
           just a cold pole in the dark and offers nothing. */
        const TARGETS = [
            { id: "terminal", pos: TERMINAL, reach: 2.15 },
            { id: "pylon1",   pos: PYLON1,   reach: 2.60 },
            { id: "pylon2",   pos: PYLON2,   reach: 2.60 },
            { id: "gauge1",   pos: GAUGE1,   reach: 2.40 },
            { id: "gauge2",   pos: GAUGE2,   reach: 2.40 },
            { id: "door",     pos: DOOR,     reach: 3.20 }
        ];
        let enabled = {
            terminal: true, pylon1: false, pylon2: false,
            gauge1: false, gauge2: false, door: false
        };
        const BLOCK    = 1.15;                 // you stop in front of the desk
        const SEAT_TIME = 0.55;                // seconds to sit down / stand up
        const DUST_N   = 260;

        /* Solid things on the floor plan, as circles. The radius is the
           drawn footprint's half-diagonal plus a body radius, so the player
           stops in FRONT of a pylon instead of putting his eye through the
           post. Until now only the desk pushed at all — the pylons and the
           wall instruments were drawn solid and walked straight through.

           The door is deliberately not in this list: the ending walks the
           camera through it (stepCutscene), and a collider there would stop
           the last beat of the episode dead. */
        const BODY_R = 0.42;
        const SOLIDS = [
            { p: TERMINAL, r: BLOCK + BODY_R },   // desk, tower and bezel
            { p: PYLON1,   r: 0.55 + BODY_R },    // 0.78 base plate
            { p: PYLON2,   r: 0.55 + BODY_R },
            { p: GAUGE1,   r: 0.31 + BODY_R },    // housing is 0.62 deep
            { p: GAUGE2,   r: 0.31 + BODY_R }
        ];

        /* Push a point out of every solid it is inside. Safe when the point
           is ALREADY deep inside one, which is the case the old code got
           wrong: `(nx - TERMINAL[0]) / (dTerm || 1)` is not an escape, it is
           a snap to the collider's own centre. Here the escape direction is
           the way he came in (the seed is last frame's position), and if even
           that is degenerate it is due south — a fixed fallback, because a
           direction picked per frame would buzz the camera between two
           answers instead of resolving. */
        function pushOut(px, pz, seedX, seedZ) {
            for (let i = 0; i < SOLIDS.length; i++) {
                const s = SOLIDS[i];
                const ox = px - s.p[0], oz = pz - s.p[2];
                const d = Math.hypot(ox, oz);
                if (d >= s.r) continue;
                let ux, uz;
                if (d > 1e-4) { ux = ox / d; uz = oz / d; }
                else {
                    const bx = seedX - s.p[0], bz = seedZ - s.p[2];
                    const bl = Math.hypot(bx, bz);
                    if (bl > 1e-4) { ux = bx / bl; uz = bz / bl; }
                    else { ux = 0; uz = 1; }        // due south, always
                }
                px = s.p[0] + ux * s.r;
                pz = s.p[2] + uz * s.r;
            }
            return [px, pz];
        }

        /* ---------- module state ----------------------------------- */
        let gl = null, canvas = null, raf = 0, running = false;
        let progScene, progGlow, progDust, progPost;
        let bufQuadXY, bufQuadXZ, bufCube, bufDust;
        let fbo = null, fboTex = null, fboDepth = null, fboW = 0, fboH = 0;
        let cbLost = null, cbRestore = null;

        const cam = { x: 0, y: EYE_H, z: 0, yaw: 0, pitch: 0, bob: 0 };
        const input = { f: 0, s: 0, look: [0, 0], keys: Object.create(null) };
        let opts = {};
        let t0 = 0, tNow = 0, wake = 0, flash = 0, arrived = false, locked = false;
        let walked = 0;                  // metres covered on foot, for the report

        /* mirror of VoidOS.world — the scene never writes to it, it only
           renders whatever the operating system currently believes */
        let wstate = {
            fog: 0.11, corruption: 0, door: "loop", alice: false,
            lamps: { lamp0: true, lamp1: false, lamp2: false },
            /* anomalies written into the room by the player's own code */
            glitches: { dup: 0, loop: 0, flicker: 0, ghost: 0, drift: 0 },
            /* The architecture itself, driven from /etc/void.conf. These
               defaults have to match VoidOS's fresh world: the player is
               standing in the room a good while before the OS boots and
               starts pushing updates, and the barrier is part of what he
               is meant to see when he opens his eyes. */
            room: { w: 16, d: 26, h: 5, barrier: 4 }
        };

        /* Fixed offsets, not random per frame — a duplicate door has to
           stay where it appeared, or it reads as flicker instead of as a
           second door. Deterministic, and exactly as long as the caps. */
        const DUP_OFFSETS = [
            [ 3.9, 0,  1.6, -0.22], [-4.4, 0,  2.4,  0.31],
            [ 1.8, 0, -3.1,  0.12], [-2.2, 0, -4.0, -0.40],
            [ 6.2, 0, -1.2,  0.55]
        ];
        /* ---------- what is on the other side ----------------------
           The sector past the north wall is gone: the floor tore off at the
           threshold and what is left of it is still falling. Same rule as
           the anomalies (docs/ARCHITECTURE.md, "Аномалии мира") — nothing
           here allocates a buffer, every draw is bufCube / bufQuadXZ /
           bufQuadXY with another matrix. Fixed tables, not per-frame
           randomness, so the drop is the same place every time you look.
           [dx, y, dz relative to the wall plane, rotY, rotX, sx, sy, sz] */
        const SLABS = [
            [ -2.30,  -3.10,  -3.4,  0.42, -0.28,  4.2, 0.34, 3.6],
            [  3.60,  -1.40,  -5.9, -0.31,  0.19,  3.4, 0.30, 4.4],
            [ -5.90,  -7.80,  -9.2,  0.88,  0.34,  5.0, 0.36, 3.2],
            [  6.40,  -5.20, -12.6, -0.72, -0.22,  3.8, 0.28, 4.8],
            [ -0.90, -12.40, -16.8,  0.24,  0.46,  6.2, 0.40, 4.0],
            [  8.20, -16.90, -21.4,  1.12, -0.35,  4.6, 0.32, 5.2],
            [ -7.40, -21.60, -27.0, -0.55,  0.27,  5.4, 0.38, 4.4]
        ];
        /* torn conduit hanging out of the lip. [dx, ytop, dz, rotZ, len, seed] */
        const CABLES = [
            [-1.42, -0.05, -0.35,  0.22, 2.8, 0.13],
            [ 1.28, -0.02, -0.55, -0.34, 3.6, 0.57],
            [-0.35, -0.10, -1.30,  0.51, 4.9, 0.81],
            [ 1.95, -0.06, -2.10, -0.18, 3.1, 0.35]
        ];

        const GHOST_OFFSETS = [
            [ 5.6, 0, -11.0], [-7.8, 0,  -9.2],
            [ 2.9, 0, -20.4], [-3.4, 0, -13.7]
        ];
        let seated = 0, seatTarget = 0, standPose = null;
        let screenSrc = null, screenTex = null, screenDirty = false;
        /* the thing the anomaly count summons */
        const ent = { alive: false, x: DOOR[0], z: DOOR[2], t: 0 };

        /* The scripted ending. While `active`, the player has no input and
           the camera follows this timeline instead. Everything is driven
           off one clock so the beats cannot drift apart. */
        const cut = {
            active: false, t: 0, fade: 0, onBeat: null, onDone: null,
            from: null, faceYaw: 0, beats: {}
        };
        const CUT_END = 7.6;

        function playCutscene(opts) {
            opts = opts || {};
            cut.active = true;
            cut.t = 0;
            cut.fade = 0;
            cut.beats = {};
            cut.onBeat = opts.onBeat || null;
            cut.onDone = opts.onDone || null;
            cut.from = { x: cam.x, y: cam.y, z: cam.z, yaw: cam.yaw, pitch: cam.pitch };
            /* One yaw for the whole scene. The fall used to re-derive it from
               cut.from.yaw, which snapped the view back to wherever the player
               happened to be looking when he pressed E — a hard jump on the
               most dramatic beat if he approached the door from the side. */
            cut.faceYaw = Math.atan2(-(DOOR[0] - cam.x), -((DOOR[2] + 1.15) - cam.z));
            /* exitPointerLock does not drop the lock synchronously, so the
               mouse keeps banking look until pointerlockchange fires — and
               step() has already handed the camera to stepCutscene. */
            resetInput();
            try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) {}
        }

        function beat(name) {
            if (cut.beats[name]) return;
            cut.beats[name] = true;
            if (cut.onBeat) { try { cut.onBeat(name); } catch (e) {} }
        }

        /* smoothstep so the walk starts and stops without a snap */
        function ss(a, b, x) {
            const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
            return k * k * (3 - 2 * k);
        }

        function stepCutscene(dt) {
            cut.t += dt;
            const t = cut.t, f = cut.from;
            const wantYaw = cut.faceYaw;

            /* --- 0.0 → 1.85 : he walks up to the frame and STOPS ---
               He stops short now. The old timeline walked him straight
               through in one motion, so the drop arrived before the player
               had ever seen the edge — which, with 36 metres of lit floor
               visible through the doorway, is exactly why the fall read as a
               hole in the collision instead of as the end of the floor. */
            if (t < 1.85) {
                const k = ss(0, 1.85, t);
                const tx = DOOR[0], tz = DOOR[2] + 1.15;
                cam.x = f.x + (tx - f.x) * k;
                cam.z = f.z + (tz - f.z) * k;
                cam.y = f.y + (1.62 - f.y) * k + Math.sin(t * 6.2) * 0.045 * k;
                cam.yaw   = f.yaw + (wantYaw - f.yaw) * k;
                cam.pitch = f.pitch * (1 - k);
                if (t > 0.15) beat("walk");
                if (t > 1.55) beat("threshold");
            }
            /* --- 1.85 → 2.95 : he looks down. this is the whole fix ---
               1.1 seconds of nothing but the torn lip and what is under it.
               The player gets to know before he does. */
            else if (t < 2.95) {
                const k = ss(1.85, 2.95, t);
                cam.x = DOOR[0];
                cam.z = (DOOR[2] + 1.15) - k * 0.42;
                cam.y = 1.62 - k * 0.05;
                cam.yaw   = wantYaw;
                cam.pitch = -0.82 * k;
                if (t > 2.05) beat("edge");
            }
            /* --- 2.95 → 3.45 : he lifts his eyes and steps anyway --- */
            else if (t < 3.45) {
                const k = ss(2.95, 3.45, t);
                cam.z = (DOOR[2] + 0.73) - k * 1.35;
                cam.y = 1.57 - 0.10 * k - 0.10 * k * k;
                cam.yaw   = wantYaw;
                cam.pitch = -0.82 * (1 - k) - 0.10 * k;
                beat("cry");                       // Alice sees it before he does
            }
            /* --- 3.45 → 6.4 : the fall --- */
            else if (t < 6.4) {
                const k = t - 3.45;
                cam.z = (DOOR[2] - 0.62) - k * 0.55;
                cam.y = 1.37 - 4.9 * k * k;        // gravity, more or less
                /* he tumbles: the plating he was standing on swings overhead */
                cam.pitch = -0.10 + Math.min(1.10, k * 0.90);
                cam.yaw   = wantYaw + Math.sin(k * 2.3) * 0.35;
                beat("fall");
            }
            /* --- 6.4 → 7.6 : out --- */
            else {
                cut.fade = Math.min(1, (t - 6.4) / 1.0);
                beat("black");
            }

            if (t >= CUT_END) {
                cut.active = false;
                /* Put the camera back somewhere legal before anyone else gets
                   a frame. The fall ends 48 m under the floor, and the only
                   reason that has never been seen is that onDone happens to
                   stop the render loop — ordering luck, not design. */
                cam.x = f.x; cam.y = EYE_H; cam.z = f.z;
                cam.pitch = 0;
                resetInput();
                const done = cut.onDone;
                cut.onDone = null;
                if (done) { try { done(); } catch (e) {} }
            }
        }

        function ctxAttribs() {
            return {
                alpha: false, antialias: false, depth: true, stencil: false,
                premultipliedAlpha: false, preserveDrawingBuffer: false,
                powerPreference: "high-performance", failIfMajorPerformanceCaveat: false
            };
        }

        function init(cv) {
            canvas = cv;
            gl = cv.getContext("webgl", ctxAttribs()) || cv.getContext("experimental-webgl", ctxAttribs());
            if (!gl) return false;

            progScene = link(gl, VS_SCENE, FS_SCENE, ["aPos", "aUV"]);
            progGlow  = link(gl, VS_GLOW,  FS_GLOW,  ["aPos", "aUV"]);
            progDust  = link(gl, VS_DUST,  FS_DUST,  ["aPos"]);
            progPost  = link(gl, VS_POST,  FS_POST,  ["aPos", "aUV"]);

            bufQuadXY = buffer(gl, QUAD_XY);
            bufQuadXZ = buffer(gl, QUAD_XZ);
            bufCube   = buffer(gl, makeCube());

            const dust = [];
            for (let i = 0; i < DUST_N; i++) {
                dust.push((Math.random() - 0.5) * 44, Math.random() * 7.5 - 0.6, (Math.random() - 0.5) * 44);
            }
            bufDust = buffer(gl, dust);

            screenTex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, screenTex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                          new Uint8Array([0, 0, 0, 255]));
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
            gl.clearColor(0, 0, 0, 1);
            return true;
        }

        function ensureFbo(w, h) {
            if (fbo && fboW === w && fboH === h) return;
            if (fbo) { gl.deleteFramebuffer(fbo); gl.deleteTexture(fboTex); gl.deleteRenderbuffer(fboDepth); }
            fboW = w; fboH = h;
            fboTex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, fboTex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            fboDepth = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, fboDepth);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
            fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, fboDepth);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        function resize() {
            if (!canvas || !gl) return;
            /* phones lose more to fill-rate than they gain in sharpness —
               cap the backing store and let the browser upscale */
            const cap = (window.innerWidth <= 820) ? 1.35 : 1.75;
            const dpr = Math.min(window.devicePixelRatio || 1, cap);
            const w = Math.max(1, Math.round(canvas.clientWidth  * dpr));
            const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w; canvas.height = h;
            }
            ensureFbo(w, h);
        }

        function bindGeom(prog, buf) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.enableVertexAttribArray(prog.a.aPos);
            gl.vertexAttribPointer(prog.a.aPos, 3, gl.FLOAT, false, 20, 0);
            if (prog.a.aUV >= 0) {
                gl.enableVertexAttribArray(prog.a.aUV);
                gl.vertexAttribPointer(prog.a.aUV, 2, gl.FLOAT, false, 20, 12);
            }
        }

        function drawSolid(model, kind, color, buf, count) {
            gl.uniformMatrix4fv(progScene.u.uModel, false, model);
            gl.uniform1i(progScene.u.uKind, kind);
            if (color) gl.uniform3fv(progScene.u.uColor, color);
            bindGeom(progScene, buf);
            gl.drawArrays(gl.TRIANGLES, 0, count);
        }

        function glow(view, proj, center, size, color, intensity) {
            gl.useProgram(progGlow.p);
            gl.uniformMatrix4fv(progGlow.u.uProj, false, proj);
            gl.uniformMatrix4fv(progGlow.u.uView, false, view);
            gl.uniform3fv(progGlow.u.uCenter, center);
            gl.uniform2fv(progGlow.u.uSize, size);
            gl.uniform3fv(progGlow.u.uColor, color);
            gl.uniform1f(progGlow.u.uIntensity, intensity);
            bindGeom(progGlow, bufQuadXY);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        /* ---------- per-frame -------------------------------------- */
        function frame(now) {
            if (!running) return;
            raf = requestAnimationFrame(frame);
            if (!t0) t0 = now;
            const dt = Math.min(0.05, (now - tNow) / 1000 || 0.016);
            tNow = now;
            const t = (now - t0) / 1000;

            step(dt, t);
            render(t);
        }

        /* wake-up curve: 0 → eyes shut, 1 → fully alert. The camera lifts
           off the floor and the head levels out along the same ramp. */
        function wakeCurve(t) {
            if (t < 1.5) return 0;
            return Math.min(1, (t - 1.5) / 1.9);
        }

        function step(dt, t) {
            wake = wakeCurve(t);
            const ease = wake * wake * (3 - 2 * wake);

            /* Drain the look delta EVERY frame, before anyone decides
               whether they are allowed to spend it.

               This is the tailspin fix. `input.look` used to be emptied in
               exactly one place — inside the walk block, which sits behind
               `arrived`, behind `seated`, and behind `cut.active`. So it kept
               growing through the wake-up, through the whole desk session and
               through the ending, with nobody consuming it, and then landed on
               the camera in a single frame the moment the walk block came
               back: `cam.yaw -= 80` is twelve revolutions in one frame, and
               the pitch went straight into its clamp — nose in the floor.

               A delta produced while the player did not own the camera is not
               a delta he gets to spend later. */
            const lookX = input.look[0], lookY = input.look[1];
            input.look[0] = input.look[1] = 0;

            /* the wake-up drives the camera until the player takes over */
            const standing = t > 3.4;
            if (!standing) {
                cam.y     = 0.34 + (EYE_H - 0.34) * ease;
                cam.pitch = -0.92 + 0.80 * ease;
                cam.yaw   = -0.30 + 0.30 * ease;
            }
            if (opts.onWake) opts.onWake(t, wake);

            /* the ending owns the camera outright */
            if (cut.active) { stepCutscene(dt); return; }

            /* --- sitting down at / getting up from the desk ---
               A fixed-length ramp, not an exponential. `seated` now reaches
               exactly 0 and exactly 1, so there is never a frame where the
               chair and the legs both write the camera.

               The old `seated += (seatTarget - seated) * dt * 3.4` never
               reached zero. It crossed the walk block's 0.02 gate 39 frames
               before it cleared the chair's own 0.002 gate, and for those
               0.65s the chair overwrote cam.x/y/z/yaw/pitch at the top of the
               frame and the walk block moved the result at the bottom — so
               after every Escape the player could neither turn nor step while
               the camera alternated between two poses and `walked` climbed by
               two metres he never covered. */
            seated = Math.max(0, Math.min(1,
                seated + (seatTarget > 0 ? 1 : -1) * (dt / SEAT_TIME)));
            if (seated === 0) standPose = null;
            if (seated > 0 && standPose) {
                const k = seated * seated * (3 - 2 * seated);
                cam.x = standPose.x + (SEAT[0] - standPose.x) * k;
                cam.y = standPose.y + (SEAT[1] - standPose.y) * k;
                cam.z = standPose.z + (SEAT[2] - standPose.z) * k;
                cam.yaw = standPose.yaw + (0 - standPose.yaw) * k;
                cam.pitch = standPose.pitch + (-0.22 - standPose.pitch) * k;
            }

            /* --- the anomaly walks --- */
            const cor = wstate.corruption / 100;
            if (!ent.alive && wstate.corruption > 34) {
                ent.alive = true; ent.t = 0;
                ent.x = DOOR[0] + (Math.random() - 0.5) * 6;
                ent.z = DOOR[2] + 4;
                if (opts.onEntity) opts.onEntity("spawn");
            }
            if (ent.alive) {
                ent.t += dt;
                if (wstate.corruption < 12) {
                    ent.alive = false;
                    if (opts.onEntity) opts.onEntity("leave");
                } else {
                    const tx = TERMINAL[0], tz = TERMINAL[2] + 3.2;
                    const dx = tx - ent.x, dz = tz - ent.z;
                    const d = Math.hypot(dx, dz) || 1;
                    if (d > 2.2) {
                        const sp = 0.25 + cor * 1.15;
                        ent.x += (dx / d) * sp * dt;
                        ent.z += (dz / d) * sp * dt;
                    }
                    /* it drifts sideways so it never reads as a sprite on rails */
                    ent.x += Math.sin(ent.t * 0.7) * dt * 0.35;
                }
            }

            /* Exactly one system owns the camera per frame: while the chair
               ramp is running at all, the legs do not get a vote. */
            if (seated > 0) {
                if (flash > 0) flash = Math.max(0, flash - dt * 1.6);
                return;
            }

            if (standing && !arrived) {
                /* look — spending the delta drained at the top of the frame */
                cam.yaw   -= lookX;
                cam.pitch -= lookY;
                cam.pitch = Math.max(-1.2, Math.min(1.0, cam.pitch));

                /* walk */
                const k = input.keys;
                let f = input.f, s = input.s;
                if (k.KeyW || k.ArrowUp)    f += 1;
                if (k.KeyS || k.ArrowDown)  f -= 1;
                if (k.KeyD || k.ArrowRight) s += 1;
                if (k.KeyA || k.ArrowLeft)  s -= 1;
                const mag = Math.hypot(f, s);
                if (mag > 1) { f /= mag; s /= mag; }

                const speed = 3.05;
                const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
                let nx = cam.x + (-sy * f + cy * s) * speed * dt;
                let nz = cam.z + (-cy * f - sy * s) * speed * dt;

                /* The desk, the pylons and the wall instruments are solid,
                   and the void is not infinite. Until now only the desk
                   pushed — you could walk through a pylon — and its push-out
                   divided by `(dTerm || 1)`, which does not escape a player
                   who is already inside: it snaps him to the collider's exact
                   centre. pushOut() handles both. */
                let res = pushOut(nx, nz, cam.x, cam.z);
                nx = res[0]; nz = res[1];

                const rm2 = wstate.room;
                const lim = rm2.w / 2 - 0.6;
                nx = Math.max(-lim, Math.min(lim, nx));
                nz = Math.max(-rm2.d + 3.1, Math.min(1.8, nz));

                /* Second pass. The walls have the last word on staying in the
                   room, but running them AFTER the solids let a narrowed room
                   park the player inside the desk's circle without a word —
                   push out to the east edge, clamp back to the wall, repeat
                   every frame, standing in the furniture. Resolving again and
                   re-clamping slides him along the wall instead. */
                res = pushOut(nx, nz, cam.x, cam.z);
                nx = Math.max(-lim, Math.min(lim, res[0]));
                nz = Math.max(-rm2.d + 3.1, Math.min(1.8, res[1]));

                if (rm2.barrier > 0) {
                    /* Stand-off in front of the panels. The comparison has to
                       be `>=`: the first step clamps the camera to exactly
                       `stop`, and with a strict `>` the very next step no
                       longer counts the player as being on this side — he
                       walks straight through the wall he was just stopped by.
                       Only forward crossing is blocked, so anyone who raises
                       the barrier from the console while standing behind it
                       can still walk back to the desk instead of softlocking. */
                    const stop = (-rm2.d + 2.4) + 5.2 + 0.5;
                    if (cam.z >= stop && nz < stop) nz = stop;
                }
                /* Distance actually covered, after the clamps — walking into
                   a wall must not count, and neither must a wall walking into
                   you: shrinking the room from the console clamps the camera
                   by tens of metres in one frame, and that is the room moving,
                   not the player. The end-of-run report turns this into paces;
                   it is the only honest measure of how much of the room the
                   player really used. */
                const stepLen = Math.hypot(nx - cam.x, nz - cam.z);
                if (stepLen <= speed * dt * 1.5) walked += stepLen;
                cam.x = nx; cam.z = nz;

                /* head bob while actually moving, breathing while still */
                const moving = mag > 0.05;
                cam.bob += dt * (moving ? 9.5 : 1.6);
                cam.y = EYE_H + (moving ? Math.sin(cam.bob) * 0.035 : Math.sin(cam.bob) * 0.012);
                /* The room is the room. Nothing in here should be able to put
                   the eye through the ceiling slab or under the grid — today
                   that holds only because the bob amplitude happens to be
                   small and the minimum ceiling happens to be generous. */
                cam.y = Math.max(0.30, Math.min(wstate.room.h - 0.35, cam.y));

                if (opts.onMove) {
                    const g = guidePos();
                    opts.onMove(Math.hypot(cam.x - g[0], cam.z - g[2]), bearing(), nearestTarget());
                }
            }

            if (flash > 0) flash = Math.max(0, flash - dt * 1.6);
        }

        /* signed angle from where you are looking to the terminal,
           so the HUD chevron can point at it */
        /* Where the HUD chevron points. Defaults to the desk, but the
           demo can aim it at whatever the current objective is. */
        let guideId = "terminal";
        function setGuide(id) { guideId = id || "terminal"; }
        function guidePos() {
            for (let i = 0; i < TARGETS.length; i++) {
                if (TARGETS[i].id === guideId) return TARGETS[i].pos;
            }
            return TERMINAL;
        }

        function bearing() {
            const g = guidePos();
            const dx = g[0] - cam.x, dz = g[2] - cam.z;
            let a = Math.atan2(-dx, -dz) - cam.yaw;
            while (a > Math.PI)  a -= Math.PI * 2;
            while (a < -Math.PI) a += Math.PI * 2;
            return a;
        }

        function render(t) {
            resize();
            const w = canvas.width, h = canvas.height;
            const proj = mPerspective(1.15, w / h, 0.05, 90);
            const view = mView([cam.x, cam.y, cam.z], cam.yaw, cam.pitch);
            const gAmt = opts.glitch != null ? opts.glitch : 0.6;

            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.viewport(0, 0, w, h);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            gl.useProgram(progScene.p);
            gl.uniformMatrix4fv(progScene.u.uProj, false, proj);
            gl.uniformMatrix4fv(progScene.u.uView, false, view);
            gl.uniform1f(progScene.u.uTime, t);
            gl.uniform1f(progScene.u.uGlitch, gAmt);
            gl.uniform1f(progScene.u.uWake, 0.25 + 0.75 * wake);
            gl.uniform3f(progScene.u.uCam, cam.x, cam.y, cam.z);
            gl.uniform3f(progScene.u.uLampA, TERMINAL[0], 1.15, TERMINAL[2]);
            gl.uniform3f(progScene.u.uLampB, DOOR[0], 1.6, DOOR[2]);
            gl.uniform1f(progScene.u.uFogD, wstate.fog);
            gl.uniform1f(progScene.u.uCorrupt, Math.min(1, wstate.corruption / 100));
            gl.uniform3f(progScene.u.uL0, TERMINAL[0], 1.15, TERMINAL[2]);
            gl.uniform3f(progScene.u.uL1, PYLON1[0], 2.6, PYLON1[2]);
            gl.uniform3f(progScene.u.uL2, PYLON2[0], 2.6, PYLON2[2]);
            /* null-deref anomaly: the lamps reach for something that is
               not there. Each one drops out on its own rhythm, so it reads
               as failing hardware rather than as a global dimmer. */
            const gl_ = wstate.glitches;
            const flick = function (seed) {
                if (!gl_.flicker) return 1;
                const n = Math.sin(t * (7.3 + seed * 2.1)) * Math.sin(t * (3.1 + seed));
                return n > -0.35 ? 1 : 0.05;
            };
            gl.uniform1f(progScene.u.uI0, (wstate.lamps.lamp0 ? 1 : 0) * flick(0));
            gl.uniform1f(progScene.u.uI1, (wstate.lamps.lamp1 ? 0.85 : 0) * flick(1));
            gl.uniform1f(progScene.u.uI2, (wstate.lamps.lamp2 ? 0.85 : 0) * flick(2));
            /* bad-compare anomaly: the floor stops agreeing with itself */
            gl.uniform1f(progScene.u.uDrift, gl_.drift ? 1 : 0);
            /* runaway loop: the door's own animation clock races */
            gl.uniform1f(progScene.u.uLoopRush, gl_.loop ? 1 : 0);
            gl.uniform1f(progScene.u.uDoorMode,
                wstate.door === "open" ? 2 : (wstate.door === "halted" ? 1 : 0));

            /* the monitor really is showing the session */
            if (screenSrc && screenDirty && progScene.u.uScreen) {
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, screenTex);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                try {
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, screenSrc);
                    screenDirty = false;
                } catch (e) { screenDirty = false; }
                gl.activeTexture(gl.TEXTURE0);
            }
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, screenTex);
            gl.activeTexture(gl.TEXTURE0);
            if (progScene.u.uScreen)    gl.uniform1i(progScene.u.uScreen, 1);
            if (progScene.u.uHasScreen) gl.uniform1f(progScene.u.uHasScreen, screenSrc ? 1 : 0);

            gl.disable(gl.BLEND);

            /* --- the room itself ---------------------------------------
               Floor stays oversized so the grid still runs off into fog
               beyond the walls; the walls are what make it a place. */
            const rm = wstate.room;
            const hw = rm.w / 2, zN = -rm.d + 2.4, zS = 2.4, hh = rm.h;

            /* Anchored to the wall plane, not to DOOR[2]: the walk clamp in
               step() is derived from rm.d too, so tying both to zN is what
               makes "the player can never stand on floor that is not drawn"
               structurally true instead of arithmetically lucky. */
            const edgeZ = zN + 0.15;
            gl.uniform1f(progScene.u.uFloorEdgeZ, edgeZ);

            drawSolid(mMul(mTranslate(0, 0, 0), mScale(120, 1, 120)), 0, null, bufQuadXZ, 6);

            const wallC = [0.085, 0.10, 0.115];
            /* side walls, as flat boxes so they catch the lamp light */
            drawSolid(mMul(mTranslate(-hw, hh / 2, (zN + zS) / 2), mScale(0.3, hh, rm.d)), 1,
                      wallC, bufCube, 36);
            drawSolid(mMul(mTranslate( hw, hh / 2, (zN + zS) / 2), mScale(0.3, hh, rm.d)), 1,
                      wallC, bufCube, 36);
            /* south wall, behind the player where they woke up */
            drawSolid(mMul(mTranslate(0, hh / 2, zS), mScale(rm.w, hh, 0.3)), 1, wallC, bufCube, 36);
            /* ceiling — low enough to feel closed, dark enough to forget */
            drawSolid(mMul(mTranslate(0, hh, (zN + zS) / 2), mScale(rm.w, 0.3, rm.d)), 1,
                      [0.05, 0.06, 0.07], bufCube, 36);

            /* north wall, split around the doorway so the door reads as a
               hole in a wall rather than a slab standing in the dark */
            const gap = 3.0;
            const side = (rm.w - gap) / 2;
            drawSolid(mMul(mTranslate(-(gap / 2 + side / 2), hh / 2, zN), mScale(side, hh, 0.3)), 1,
                      wallC, bufCube, 36);
            drawSolid(mMul(mTranslate( (gap / 2 + side / 2), hh / 2, zN), mScale(side, hh, 0.3)), 1,
                      wallC, bufCube, 36);
            drawSolid(mMul(mTranslate(0, hh - 0.6, zN), mScale(gap, 1.2, 0.3)), 1, wallC, bufCube, 36);

            /* the barrier: panels the player raises or lowers from code.
               `barrier` is how many segments are up, 0..4 — a wall across
               the room that has to come down before the door is reachable. */
            for (let i = 0; i < Math.min(rm.barrier, 4); i++) {
                const seg = rm.w / 4;
                const cx = -hw + seg * (i + 0.5);
                drawSolid(mMul(mTranslate(cx, 1.1, zN + 5.2), mScale(seg * 0.92, 2.2, 0.22)), 1,
                          [0.20, 0.07, 0.08], bufCube, 36);
            }

            /* terminal: desk, tower, bezel, then the glowing face */
            const deskC = [0.09, 0.11, 0.13];
            drawSolid(mMul(mTranslate(TERMINAL[0], 0.38, TERMINAL[2]), mScale(1.6, 0.76, 0.85)), 1, deskC, bufCube, 36);
            drawSolid(mMul(mTranslate(TERMINAL[0] - 0.62, 0.99, TERMINAL[2] - 0.1), mScale(0.30, 0.46, 0.52)), 1, deskC, bufCube, 36);
            drawSolid(mMul(mTranslate(TERMINAL[0] + 0.12, 1.16, TERMINAL[2]), mScale(0.92, 0.72, 0.62)), 1, [0.12, 0.14, 0.16], bufCube, 36);
            drawSolid(mMul(mTranslate(TERMINAL[0] + 0.12, 1.16, TERMINAL[2] + 0.315), mScale(0.78, 0.56, 1)), 3, null, bufQuadXY, 6);

            /* the two pylons — always physically there, dark until started */
            [[PYLON1, wstate.lamps.lamp1], [PYLON2, wstate.lamps.lamp2]].forEach(function (p) {
                const pos = p[0], on = p[1];
                drawSolid(mMul(mTranslate(pos[0], 1.30, pos[2]), mScale(0.26, 2.60, 0.26)), 1,
                          [0.10, 0.12, 0.14], bufCube, 36);
                drawSolid(mMul(mTranslate(pos[0], 0.06, pos[2]), mScale(0.78, 0.12, 0.78)), 1,
                          [0.08, 0.10, 0.11], bufCube, 36);
                if (on) {
                    drawSolid(mMul(mTranslate(pos[0], 2.66, pos[2]), mScale(0.42, 0.42, 0.42)), 3,
                              null, bufCube, 36);
                }
            });

            /* The two wall instruments. Deliberately small and unlit until
               there is light in the room: they are meant to be *found*, not
               signposted. Each is a housing bolted to the wall plus a face
               that reads as glass, and the face only lights once lamp1 is
               up — an unpowered dial is a dark disc you have to walk right
               up to before it says anything. */
            [[GAUGE1, -1], [GAUGE2, 1]].forEach(function (p) {
                const pos = p[0], side = p[1];   // side: which wall it hangs on
                drawSolid(mMul(mTranslate(pos[0], 1.45, pos[2]), mScale(0.16, 0.62, 0.62)), 1,
                          [0.11, 0.13, 0.15], bufCube, 36);
                drawSolid(mMul(mTranslate(pos[0] - side * 0.10, 1.45, pos[2]), mScale(0.06, 0.42, 0.42)), 1,
                          wstate.lamps.lamp1 ? [0.30, 0.52, 0.50] : [0.07, 0.08, 0.09],
                          bufCube, 36);
            });

            /* overflow anomaly: pylons standing where nothing was built.
               Same two boxes as a real pylon, drawn at wrong coordinates. */
            for (let i = 0; i < Math.min(gl_.ghost, GHOST_OFFSETS.length); i++) {
                const o = GHOST_OFFSETS[i];
                drawSolid(mMul(mTranslate(o[0], 1.30, o[2]), mScale(0.26, 2.60, 0.26)), 1,
                          [0.16, 0.06, 0.07], bufCube, 36);
                drawSolid(mMul(mTranslate(o[0], 2.66, o[2]), mScale(0.36, 0.36, 0.36)), 3,
                          null, bufCube, 36);
            }

            /* the door: frame bars around a portal that keeps dropping out */
            const frameC = [0.14, 0.17, 0.19];
            const dx = DOOR[0], dz = DOOR[2];
            drawSolid(mMul(mTranslate(dx - 1.30, 1.60, dz), mScale(0.22, 3.30, 0.30)), 1, frameC, bufCube, 36);
            drawSolid(mMul(mTranslate(dx + 1.30, 1.60, dz), mScale(0.22, 3.30, 0.30)), 1, frameC, bufCube, 36);
            drawSolid(mMul(mTranslate(dx, 3.32, dz), mScale(2.82, 0.24, 0.30)), 1, frameC, bufCube, 36);

            /* ---------- the other side of the threshold ----------------
               Until now nothing at all was drawn past the north wall, so an
               open door showed 36 metres of unbroken floor and then black.
               This is the sector break the ending is about: the void below,
               the plating that tore off and is still going down, live
               conduit hanging out of the lip, and the warning plate that
               came off its bracket.

               Gated on proximity so it costs nothing for the first two
               thirds of the episode — the doorway cannot be on screen from
               the desk end of the room anyway. Deliberately NOT gated on
               the door being open: the tear and the plate are the clue, and
               they have to exist before the door does. Through the failing
               portal (alpha 0.62..1.0) the player catches flickers of the
               break long before he can reach it. That is free foreshadowing.

               +14 draw calls here, all from bufCube / bufQuadXZ / bufQuadXY
               with a different matrix. Zero buffers, textures or programs
               allocated — same rule as the anomalies. */
            if (cam.z < zN + 9.0) {
                /* The void itself: the same floor quad, far below, tracking
                   the camera down so the fall never reaches a bottom. A fixed
                   y would put the plane in his face at t = 5.6 s, because
                   cam.y = 1.37 - 4.9k^2 crosses -26 well before the fade. */
                drawSolid(mMul(mTranslate(0, Math.min(-24, cam.y - 26), zN - 40),
                               mScale(150, 1, 150)), 5, null, bufQuadXZ, 6);

                const slabC = [0.075, 0.088, 0.10];
                for (let i = 0; i < SLABS.length; i++) {
                    const sl = SLABS[i];
                    /* they turn, each at its own rate. The motion is in the
                       matrix, never in a buffer — same trick as the dup doors. */
                    drawSolid(
                        mMul(mMul(mTranslate(sl[0], sl[1] + Math.sin(t * 0.21 + i) * 0.22, zN + sl[2]),
                                  mMul(mRotY(sl[3] + t * (0.035 + i * 0.012)),
                                       mRotX(sl[4] + Math.sin(t * 0.17 + i) * 0.05))),
                             mScale(sl[5], sl[6], sl[7])),
                        6, slabC, bufCube, 36);
                }

                for (let i = 0; i < CABLES.length; i++) {
                    const cb = CABLES[i];
                    /* anchored at the lip, free end swinging:
                       T(anchor) . Rz . T(0, -len/2, 0) . S */
                    drawSolid(
                        mMul(mMul(mTranslate(dx + cb[0], cb[1], zN + cb[2]),
                                  mRotZ(cb[3] + Math.sin(t * 0.6 + i) * 0.06)),
                             mMul(mTranslate(0, -cb[4] * 0.5, 0), mScale(0.07, cb[4], 0.07))),
                        7, [cb[5], 0, 0], bufCube, 36);
                }

                /* Knocked off its bracket and leaning on the west jamb. x is
                   2.10 out so it sits clear of the 3.0 m doorway gap and the
                   player never walks through it. */
                drawSolid(mMul(mMul(mTranslate(dx - 2.10, 0.46, zN + 1.15),
                                    mMul(mMul(mRotY(0.62), mRotX(-0.42)), mRotZ(-0.26))),
                               mScale(0.95, 0.68, 1)), 8, null, bufQuadXY, 6);
                /* the snapped bracket, still on the jamb */
                drawSolid(mMul(mMul(mTranslate(dx - 1.44, 1.98, zN + 0.20), mRotZ(0.34)),
                               mScale(0.06, 0.42, 0.06)), 1, frameC, bufCube, 36);
            }

            /* leak anomaly: the room kept copies of a door it was told to
               forget. Same three bars and the same portal, moved and
               turned — capped at the length of DUP_OFFSETS. */
            for (let i = 0; i < Math.min(gl_.dup, DUP_OFFSETS.length); i++) {
                const o = DUP_OFFSETS[i];
                const bx = dx + o[0], bz = dz + o[2], ry = o[3];
                const place = function (px, py, pz, sx, sy, sz) {
                    return mMul(mMul(mTranslate(bx, py, bz), mRotY(ry)),
                                mMul(mTranslate(px, 0, pz), mScale(sx, sy, sz)));
                };
                drawSolid(place(-1.30, 1.60, 0, 0.22, 3.30, 0.30), 1, frameC, bufCube, 36);
                drawSolid(place( 1.30, 1.60, 0, 0.22, 3.30, 0.30), 1, frameC, bufCube, 36);
                drawSolid(place( 0.00, 3.32, 0, 2.82, 0.24, 0.30), 1, frameC, bufCube, 36);
            }

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.depthMask(false);
            gl.useProgram(progScene.p);
            drawSolid(mMul(mTranslate(dx, 1.60, dz + 0.02), mScale(2.50, 3.10, 1)), 2, null, bufQuadXY, 6);
            for (let i = 0; i < Math.min(gl_.dup, DUP_OFFSETS.length); i++) {
                const o = DUP_OFFSETS[i];
                drawSolid(mMul(mMul(mTranslate(dx + o[0], 1.60, dz + o[2]), mRotY(o[3])),
                               mScale(2.50, 3.10, 1)), 2, null, bufQuadXY, 6);
            }

            /* additive light bloom + dust */
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
            glow(view, proj, [TERMINAL[0] + 0.12, 1.16, TERMINAL[2] + 0.34], [3.4, 3.0], [0.35, 0.85, 1.0], 0.55 * (0.35 + 0.65 * wake));
            glow(view, proj, [TERMINAL[0] + 0.12, 1.16, TERMINAL[2] + 0.34], [1.5, 1.3], [0.65, 1.0, 1.0], 0.85 * (0.35 + 0.65 * wake));
            if (wstate.lamps.lamp1) {
                glow(view, proj, [PYLON1[0], 2.66, PYLON1[2]], [3.0, 3.0], [0.45, 0.9, 1.0], 0.55);
            }
            if (wstate.lamps.lamp2) {
                glow(view, proj, [PYLON2[0], 2.66, PYLON2[2]], [3.0, 3.0], [0.45, 0.9, 1.0], 0.55);
            }
            const doorOpen = wstate.door === "open";
            /* An additive billboard 5.2 x 6.4 metres across is a floodlight
               once you are standing in it: at half a metre it covers the
               frame several times over and adds 0.85 of its own colour to
               every pixel. That is what turned the last seconds of the
               episode into a white card. So fade it as the camera closes,
               and put what is left on the JAMBS — the doorway has to go dark
               exactly when the player needs to see through it. */
            const dDoor = Math.hypot(cam.x - dx, cam.z - dz);
            const nearD = Math.min(1, Math.max(0, (dDoor - 1.0) / 3.6));
            if (doorOpen) {
                glow(view, proj, [dx - 1.32, 1.60, dz + 0.06], [0.85, 3.5], [0.40, 1.0, 0.92], 0.55 * nearD);
                glow(view, proj, [dx + 1.32, 1.60, dz + 0.06], [0.85, 3.5], [0.40, 1.0, 0.92], 0.55 * nearD);
                glow(view, proj, [dx, 3.28, dz + 0.06],        [2.90, 0.75], [0.40, 1.0, 0.92], 0.45 * nearD);
            } else {
                glow(view, proj, [dx, 1.60, dz + 0.05], [5.2, 6.4], [0.25, 0.75, 0.9],
                     wstate.door === "halted" ? 0.08
                       : (0.30 + 0.20 * Math.sin(t * 3.1)) * (0.5 + gAmt * 0.5));
            }

            /* the anomaly: a camera-facing slab, drawn before the additive
               passes so the light bleeds around it rather than through it */
            if (ent.alive) {
                gl.useProgram(progScene.p);
                const ex = ent.x - cam.x, ez = ent.z - cam.z;
                const eyaw = Math.atan2(ex, ez);
                drawSolid(mMul(mMul(mTranslate(ent.x, 1.05, ent.z), mRotY(eyaw)),
                               mScale(1.05, 2.10, 1)), 4, null, bufQuadXY, 6);
            }

            gl.useProgram(progDust.p);
            gl.uniformMatrix4fv(progDust.u.uProj, false, proj);
            gl.uniformMatrix4fv(progDust.u.uView, false, view);
            gl.uniform3f(progDust.u.uCam, cam.x, cam.y, cam.z);
            gl.uniform1f(progDust.u.uTime, t);
            gl.bindBuffer(gl.ARRAY_BUFFER, bufDust);
            gl.enableVertexAttribArray(progDust.a.aPos);
            gl.vertexAttribPointer(progDust.a.aPos, 3, gl.FLOAT, false, 12, 0);
            gl.drawArrays(gl.POINTS, 0, DUST_N);

            gl.depthMask(true);
            gl.disable(gl.BLEND);

            /* ---- post ---- */
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, w, h);
            gl.useProgram(progPost.p);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, fboTex);
            gl.uniform1i(progPost.u.uTex, 0);
            gl.uniform1f(progPost.u.uTime, t);
            gl.uniform1f(progPost.u.uGlitch, gAmt);
            gl.uniform1f(progPost.u.uWake, wake);
            gl.uniform1f(progPost.u.uScan, opts.scan != null ? opts.scan : 1);
            gl.uniform1f(progPost.u.uVig, opts.vignette != null ? opts.vignette : 1);
            gl.uniform1f(progPost.u.uFlash, flash);
            gl.uniform1f(progPost.u.uFade, cut.fade);
            bindGeom(progPost, bufQuadXY);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }

        /* ---------- input ------------------------------------------ */
        /* The scene listens on window, so it sees keystrokes meant for the
           shell. Movement keys are preventDefault()ed — which would quietly
           swallow the space bar and every W/A/S/D the player types into a
           command. Bail out whenever the keys are not ours. */
        function keysAreOurs(e) {
            if (seated > 0 || seatTarget > 0) return false;   // sitting at the desk
            const t = e.target;
            if (t && (t.isContentEditable
                || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return false;
            return true;
        }

        function onKeyDown(e) {
            if (!running || !keysAreOurs(e)) return;
            input.keys[e.code] = true;
            if (e.code === "KeyE" || e.code === "Enter" || e.code === "Space") {
                e.preventDefault();
                tryInteract();
            }
            if (/^(KeyW|KeyA|KeyS|KeyD|Arrow)/.test(e.code)) e.preventDefault();
        }
        function onKeyUp(e) { input.keys[e.code] = false; }

        /* Pointer Lock hands out garbage on the frames it engages and
           releases: the browser reports the jump between the cursor's real
           screen position and the locked origin as one movementX/Y. A human
           hand does not travel 220px between two mousemove events at 60Hz,
           let alone at 1000Hz — anything that big is the browser talking,
           not the player. */
        const LOOK_SPIKE_PX = 220;
        let lookPrimed = false;       // drop the first move after (re)locking

        function onMouseMove(e) {
            if (!running || !locked) return;
            if (!lookPrimed) { lookPrimed = true; return; }
            const mx = e.movementX || 0, my = e.movementY || 0;
            if (Math.abs(mx) > LOOK_SPIKE_PX || Math.abs(my) > LOOK_SPIKE_PX) return;
            input.look[0] += mx * 0.0026;
            input.look[1] += my * 0.0026;
        }
        let dragging = false, lastX = 0, lastY = 0;

        /* ---------- one place that gives the camera back ----------------
           Everything that takes the camera away from the player or hands it
           back — pointer lock lost or gained, sitting down, standing up, the
           ending, start, stop — comes through here. A delta that arrived
           while nobody was draining input.look is not a delta the player
           asked for: it is a mouse sweep across the OS window, or the jump
           the browser reports when it takes the cursor back. Spending it
           later is what sent the camera into a tailspin on the first frame
           after Escape. */
        function resetLook() {
            input.look[0] = input.look[1] = 0;
            dragging = false;
            lastX = lastY = 0;
            lookPrimed = false;
            cam.pitch = Math.max(-1.2, Math.min(1.0, cam.pitch));
        }
        function resetInput() {
            resetLook();
            input.f = input.s = 0;
            input.keys = Object.create(null);
        }

        function onDown(e) {
            if (!running || seated > 0 || seatTarget > 0 || cut.active) return;
            if (canvas.requestPointerLock && !locked) {
                /* Chrome returns a promise here and rejects it when the lock
                   is refused (Escape cooldown, unfocused document). A
                   try/catch cannot see an async rejection, so swallow it
                   explicitly and let the drag fallback carry the look. */
                try {
                    const p = canvas.requestPointerLock();
                    if (p && typeof p.catch === "function") p.catch(function () {});
                } catch (err) { /* fall through to drag */ }
            }
            dragging = true; lastX = e.clientX; lastY = e.clientY;
        }
        function onMove(e) {
            /* Anchored to the last event we actually saw, so a lock that
               swallowed a run of moves cannot leave a screen-wide stale delta
               waiting for the frame the lock drops. */
            if (locked) { lastX = e.clientX; lastY = e.clientY; return; }
            if (!running || !dragging) return;
            if (e.buttons === 0) { dragging = false; return; }  // the mouseup we never saw
            input.look[0] += (e.clientX - lastX) * 0.004;
            input.look[1] += (e.clientY - lastY) * 0.004;
            lastX = e.clientX; lastY = e.clientY;
        }
        function onUp() { dragging = false; }
        function onLockChange() {
            const was = locked;
            locked = (document.pointerLockElement === canvas);
            /* Both edges matter. Losing the lock leaves whatever the browser
               buffered in input.look; gaining it makes the next event a
               teleport and leaves lastX/lastY pointing at wherever the cursor
               happened to be before. */
            if (locked !== was) resetLook();
            if (opts.onLock) opts.onLock(locked);
        }

        /* What pressing E would act on: the closest enabled target inside
           its own reach — except that the current objective wins a tie.
           Getting up from the desk leaves you standing inside the desk's
           own radius, and without this the prompt would offer to sit you
           back down while the objective points across the room. */
        function nearestTarget() {
            let best = null, bd = Infinity, guided = null;
            for (let i = 0; i < TARGETS.length; i++) {
                const t = TARGETS[i];
                if (!enabled[t.id]) continue;
                const d = Math.hypot(cam.x - t.pos[0], cam.z - t.pos[2]);
                if (d > t.reach) continue;
                if (t.id === guideId) guided = { id: t.id, dist: d };
                if (d < bd) { bd = d; best = { id: t.id, dist: d }; }
            }
            return guided || best;
        }

        function tryInteract() {
            const hit = nearestTarget();
            if (!hit) return;
            /* The desk is one-shot per visit — the OS should not re-boot
               because the player brushed past it. Everything else in the
               room can be examined as often as they like. */
            if (hit.id === "terminal") {
                if (arrived) return;
                arrived = true;
                flash = 1.2;
                try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) {}
                if (opts.onArrive) opts.onArrive();
                return;
            }
            if (opts.onInteract) opts.onInteract(hit.id, hit.dist);
        }

        /* the demo turns targets on as the story makes them meaningful */
        function setInteractable(id, on) { enabled[id] = !!on; }

        /* ---------- public ----------------------------------------- */
        function start(cv, options) {
            opts = options || {};
            if (!gl) { if (!init(cv)) return false; }
            cam.x = 0; cam.z = 0; cam.y = 0.34;
            cam.yaw = -0.30; cam.pitch = -0.92; cam.bob = 0;
            resetInput();
            arrived = false; locked = false; flash = 0; wake = 0; walked = 0;
            /* The chair is module state that outlives a run: closing the demo
               from the desk never routes through sit(false), so a second run
               used to open with seated ~1 and a standPose from the previous
               session — the player woke up in the chair and then slid across
               the room to a position that no longer existed. */
            seated = 0; seatTarget = 0; standPose = null;
            enabled = {
                terminal: true, pylon1: false, pylon2: false,
                gauge1: false, gauge2: false, door: false
            };
            guideId = "terminal";
            cut.active = false; cut.fade = 0; cut.t = 0; cut.beats = {};
            t0 = 0; tNow = performance.now();

            window.addEventListener("keydown", onKeyDown);
            window.addEventListener("keyup", onKeyUp);
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("pointerlockchange", onLockChange);
            /* A refused lock (Chrome's ~1.25s Escape cooldown) fires this and
               nothing else — without it `locked` and `dragging` disagree. */
            document.addEventListener("pointerlockerror", onLockChange);
            canvas.addEventListener("mousedown", onDown);
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
            cbLost = function (e) { e.preventDefault(); stop(); };
            canvas.addEventListener("webglcontextlost", cbLost);

            running = true;
            resize();
            raf = requestAnimationFrame(frame);
            return true;
        }

        function stop() {
            running = false;
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("pointerlockchange", onLockChange);
            document.removeEventListener("pointerlockerror", onLockChange);
            if (canvas) {
                canvas.removeEventListener("mousedown", onDown);
                if (cbLost) canvas.removeEventListener("webglcontextlost", cbLost);
            }
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            try { if (locked && document.exitPointerLock) document.exitPointerLock(); } catch (e) {}
            locked = false;
            resetInput();
        }

        /* touch / virtual stick feed */
        /* Arrival is one-shot so the OS does not re-boot every time the
           player brushes past the desk — but standing up has to re-arm it,
           or they can never sit back down. */
        function rearm() { arrived = false; resetLook(); }

        function setMove(f, s) { input.f = f; input.s = s; }
        /* Same gate as the mouse: a delta produced while the desk, the ending
           or the wake-up owns the camera is not the player's to spend. The
           touch pad's listeners are attached once and never removed — it is
           quiet at the desk only because CSS hides it, which is a stylesheet
           holding up a game invariant. */
        function addLook(dx, dy) {
            if (!running || cut.active || arrived || seated > 0 || seatTarget > 0) return;
            input.look[0] += dx; input.look[1] += dy;
        }

        /* VoidOS pushes its world here whenever anything changes */
        function setWorld(w) {
            if (!w) return;
            if (typeof w.fog === "number") wstate.fog = w.fog;
            if (typeof w.corruption === "number") wstate.corruption = w.corruption;
            if (w.door) wstate.door = w.door;
            if (w.lamps) wstate.lamps = {
                lamp0: !!w.lamps.lamp0, lamp1: !!w.lamps.lamp1, lamp2: !!w.lamps.lamp2
            };
            if (w.room) {
                wstate.room = {
                    w: w.room.w, d: w.room.d, h: w.room.h,
                    barrier: w.room.barrier | 0
                };
            }
            if (w.glitches) {
                wstate.glitches = {
                    dup:     w.glitches.dup     | 0,
                    loop:    w.glitches.loop    | 0,
                    flicker: w.glitches.flicker | 0,
                    ghost:   w.glitches.ghost   | 0,
                    drift:   w.glitches.drift   | 0
                };
            }
            wstate.alice = !!w.alice;
        }
        /* the 2D canvas the shell paints its last activity onto */
        function setScreen(cv) { screenSrc = cv; screenDirty = true; }
        function refreshScreen() { screenDirty = true; }
        function sit(on) {
            /* Capture where he was standing at the moment he sat, not at the
               moment the ramp happens to notice. Sitting again while a
               previous stand-up was still unwinding used to reuse a pose from
               the visit before that, because the old capture in step() was
               gated on `!standPose`. Only capture from a genuine standing
               frame — a mid-ramp pose can be inside the desk's own radius. */
            if (on && seated === 0) {
                standPose = { x: cam.x, y: cam.y, z: cam.z, yaw: cam.yaw, pitch: cam.pitch };
            }
            seatTarget = on ? 1 : 0;
            resetInput();
            if (on) { try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) {} }
        }
        function entityDistance() {
            return Math.hypot(ent.x - TERMINAL[0], ent.z - TERMINAL[2]);
        }

        function supported() {
            try {
                const c = document.createElement("canvas");
                return !!(window.WebGLRenderingContext
                    && (c.getContext("webgl") || c.getContext("experimental-webgl")));
            } catch (e) { return false; }
        }

        return {
            start: start, stop: stop, supported: supported,
            setMove: setMove, addLook: addLook, interact: tryInteract,
            setWorld: setWorld, setScreen: setScreen, refreshScreen: refreshScreen,
            rearm: rearm,
            setInteractable: setInteractable, setGuide: setGuide,
            playCutscene: playCutscene,
            inCutscene: function () { return cut.active; },
            nearestTarget: nearestTarget,
            sit: sit, entityDistance: entityDistance,
            walked: function () { return walked; },
            reach: REACH
        };
    })();

    /* ============================================================
       VOID OS  —  the operating system the demo is actually played in
       ------------------------------------------------------------
       The old demo was a scripted prompt that accepted eleven magic
       words. This is a small real machine instead: a filesystem, a
       service manager, devices, and a shell over the top of them.

       Three rules hold the design together.

       1. THE FILESYSTEM IS THE LEVEL.  Every file describes the space
          the player is standing in. /etc/void.conf is not flavour
          text — it *is* the fog and the lamps, and writing to it moves
          them. /dev holds the door and the pylons. /var/log records
          what the player has already broken.

       2. NOTHING IS ANNOUNCED.  There is no quest marker. The player
          reads, guesses, tries, and watches the room answer. `svc list`
          shows a dead lamp; starting it lights a corner of the void
          that was never mentioned anywhere.

       3. MISTAKES ARE PHYSICAL.  Corruption is a number this module
          owns, and VoidScene reads it every frame: fog thickens, the
          world reddens, things start walking toward the desk.

       Shell output and file contents are in English on purpose — that
       is what a machine looks like in any country, and it keeps the
       four locales to the human-facing chrome. Alice speaks localised.
       ============================================================ */
    /* ============================================================
       OS TEXT  —  everything inside the machine that a player reads
       ------------------------------------------------------------
       The filesystem is the level, which means the filesystem is also
       the script. Leaving it in English made the demo unplayable for
       anyone reading in Russian or Tajik, so every readable byte lives
       here and VoidOS pulls it through ot() when it builds the volume.

       Commands, paths and device numbers stay English — those are the
       machine's own vocabulary and a player types them literally.
       Everything a human is meant to *understand* is translated.
       ============================================================ */
