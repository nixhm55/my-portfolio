'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useCertificateStore } from '../stores/certificate';

export default function CertificateModal() {
  const { isOpen, closeCertificate } =
    useCertificateStore();

  const containerRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) {
      return;
    }

    const container =
      containerRef.current;

    const REDUCED =
      window.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      ).matches ?? false;

    const clamp = (
      value: number,
      min: number,
      max: number
    ) =>
      Math.max(
        min,
        Math.min(max, value)
      );

    /* =========================================================
       RENDERER
    ========================================================= */

    const canvas =
      document.createElement('canvas');

    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '3';
    canvas.style.pointerEvents = 'none';

    container.appendChild(canvas);

    const renderer =
      new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        2
      )
    );

    const SRGB =
      (THREE as any).SRGBColorSpace;

    if (SRGB) {
      renderer.outputColorSpace = SRGB;
    }

    renderer.toneMapping =
      THREE.NoToneMapping;

    /* =========================================================
       SCENE
    ========================================================= */

    const scene =
      new THREE.Scene();

    const camera =
      new THREE.PerspectiveCamera(
        24,
        1,
        0.1,
        100
      );

    camera.position.set(
      0,
      0,
      8.2
    );

    /* =========================================================
       ENVIRONMENT
    ========================================================= */

    function createEnvironment() {
      const width = 1024;
      const height = 512;

      const canvas =
        document.createElement('canvas');

      canvas.width = width;
      canvas.height = height;

      const ctx =
        canvas.getContext('2d')!;

      const gradient =
        ctx.createLinearGradient(
          0,
          0,
          0,
          height
        );

      gradient.addColorStop(
        0,
        '#3a3d47'
      );

      gradient.addColorStop(
        0.46,
        '#171820'
      );

      gradient.addColorStop(
        1,
        '#08080a'
      );

      ctx.fillStyle = gradient;

      ctx.fillRect(
        0,
        0,
        width,
        height
      );

      function blob(
        cx: number,
        cy: number,
        radiusX: number,
        radiusY: number,
        color: string
      ) {
        const g =
          ctx.createRadialGradient(
            cx,
            cy,
            0,
            cx,
            cy,
            Math.max(
              radiusX,
              radiusY
            )
          );

        g.addColorStop(
          0,
          color
        );

        g.addColorStop(
          1,
          'rgba(0,0,0,0)'
        );

        ctx.save();

        ctx.translate(
          cx,
          cy
        );

        ctx.scale(
          1,
          radiusY /
            radiusX
        );

        ctx.translate(
          -cx,
          -cy
        );

        ctx.fillStyle = g;

        ctx.beginPath();

        ctx.arc(
          cx,
          cy,
          radiusX,
          0,
          Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
      }

      blob(
        width * 0.30,
        height * 0.24,
        330,
        240,
        'rgba(255,252,246,1)'
      );

      blob(
        width * 0.74,
        height * 0.34,
        240,
        200,
        'rgba(150,175,235,.42)'
      );

      blob(
        width * 0.52,
        height * 0.86,
        420,
        190,
        'rgba(255,170,120,.10)'
      );

      const texture =
        new THREE.CanvasTexture(
          canvas
        );

      texture.mapping =
        THREE.EquirectangularReflectionMapping;

      if (SRGB) {
        texture.colorSpace =
          SRGB;
      }

      return texture;
    }

    const pmrem =
      new THREE.PMREMGenerator(
        renderer
      );

    pmrem.compileEquirectangularShader();

    const environment =
      createEnvironment();

    scene.environment =
      pmrem.fromEquirectangular(
        environment
      ).texture;

    /* =========================================================
       LIGHTING
    ========================================================= */

    const key =
      new THREE.DirectionalLight(
        0xfff6ec,
        1.42
      );

    key.position.set(
      -3.3,
      2.1,
      2
    );

    const fill =
      new THREE.DirectionalLight(
        0x9fb6ff,
        0.13
      );

    fill.position.set(
      3.6,
      -1.8,
      1.6
    );

    const rim =
      new THREE.DirectionalLight(
        0xffffff,
        0.1
      );

    rim.position.set(
      1.6,
      1.2,
      -2.6
    );

    const ambient =
      new THREE.AmbientLight(
        0xffffff,
        0.16
      );

    scene.add(
      key,
      fill,
      rim,
      ambient
    );

    const touchLight =
      new THREE.PointLight(
        0xdfe8ff,
        0,
        7.5,
        1.35
      );

    touchLight.position.set(
      0,
      0,
      1.7
    );

    scene.add(touchLight);

    /* =========================================================
       CERTIFICATE SIZE
    ========================================================= */

    const SW = 2.30;
    const SH = 3.23;

    const geometry =
      new THREE.PlaneGeometry(
        SW,
        SH,
        72,
        96
      );

    /* =========================================================
       SHADER UNIFORMS
    ========================================================= */

    const uniforms = {
      uTime: {
        value: 0,
      },

      uAmp: {
        value: 1.18,
      },

      uFreq: {
        value: 4.7,
      },

      uTwist: {
        value: 1.3,
      },

      uSize: {
        value: new THREE.Vector2(
          SW,
          SH
        ),
      },

      uFlutter: {
        value: 0,
      },

      uPhase: {
        value: 0,
      },

      uRim: {
        value: 0.62,
      },

      uRimA: {
        value: 0.88,
      },

      uSpecA: {
        value: 0.14,
      },

      uRimCol: {
        value: new THREE.Color(
          0xeaf2ff
        ),
      },

      /*
       * 0 = collapsed
       * 1 = completely released
       */
      uGenie: {
        value: REDUCED
          ? 1
          : 0,
      },
    };

    /* =========================================================
       WAVE + GENIE GLSL
    ========================================================= */

    const WAVE = `
      uniform float uTime;
      uniform float uAmp;
      uniform float uFlutter;
      uniform float uPhase;
      uniform float uFreq;
      uniform float uTwist;
      uniform float uGenie;

      uniform vec2 uSize;

      float sAmp(
        float u,
        float v
      ) {
        return
          uAmp *
          (
            0.10 +
            pow(u, 1.35)
          ) *
          (
            0.50 +
            0.64 * v
          );
      }

      float sAmpV(
        float u
      ) {
        return
          uAmp *
          (
            0.10 +
            pow(u, 1.35)
          ) *
          0.64;
      }

      float sTheta(
        float u,
        float v
      ) {
        float a =
          sAmp(u, v);

        float ph =
          uFreq * u +
          uTwist * v +
          uTime * 0.40 +
          uPhase;

        return
          a * sin(ph) +
          uFlutter *
          a *
          0.60 *
          sin(
            ph * 2.35 +
            uTime * 2.0
          );
      }

      float sThetaV(
        float u,
        float v
      ) {
        float a =
          sAmp(u, v);

        float da =
          sAmpV(u);

        float ph =
          uFreq * u +
          uTwist * v +
          uTime * 0.40 +
          uPhase;

        float f =
          ph * 2.35 +
          uTime * 2.0;

        return
          da * sin(ph) +
          a * cos(ph) *
          uTwist +
          uFlutter *
          0.60 *
          (
            da * sin(f) +
            a * cos(f) *
            uTwist *
            2.35
          );
      }

      float sYoff(
        float u,
        float v
      ) {
        float w =
          1.0 -
          0.55 * v;

        return
          0.021 *
          uSize.y *
          sin(
            2.05 * u +
            uTime * 0.47 +
            uPhase
          )
          +
          0.013 *
          uSize.y *
          sin(
            3.35 * u -
            1.55 * v +
            uTime * 0.63 +
            uPhase
          ) *
          w;
      }

      float sYdU(
        float u,
        float v
      ) {
        float w =
          1.0 -
          0.55 * v;

        return
          0.0431 *
          uSize.y *
          cos(
            2.05 * u +
            uTime * 0.47 +
            uPhase
          )
          +
          0.0436 *
          uSize.y *
          cos(
            3.35 * u -
            1.55 * v +
            uTime * 0.63 +
            uPhase
          ) *
          w;
      }

      float sYdV(
        float u,
        float v
      ) {
        float ph =
          3.35 * u -
          1.55 * v +
          uTime * 0.63 +
          uPhase;

        return
          0.013 *
          uSize.y *
          (
            -1.55 *
            cos(ph) *
            (
              1.0 -
              0.55 * v
            )
            -
            0.55 *
            sin(ph)
          );
      }

      void sheetPoint(
        vec2 q,
        out vec3 P,
        out vec3 NN
      ) {

        float u = q.x;
        float v = q.y;

        float x = 0.0;
        float z = 0.0;

        float xe = 0.0;
        float ze = 0.0;

        float dxv = 0.0;
        float dzv = 0.0;

        float dxe = 0.0;
        float dze = 0.0;

        const int NS = 20;

        float h =
          1.0 /
          float(NS);

        for (
          int i = 0;
          i < NS;
          i++
        ) {

          float uu =
            (
              float(i) +
              0.5
            ) *
            h;

          float w =
            clamp(
              (
                u -
                (
                  uu -
                  0.5 * h
                )
              ) / h,
              0.0,
              1.0
            );

          float th =
            sTheta(
              uu,
              v
            );

          float dt =
            sThetaV(
              uu,
              v
            );

          float c =
            cos(th);

          float sn =
            sin(th);

          xe += c * h;
          ze += sn * h;

          dxe +=
            -sn *
            dt *
            h;

          dze +=
            c *
            dt *
            h;

          x +=
            c *
            h *
            w;

          z +=
            sn *
            h *
            w;

          dxv +=
            -sn *
            dt *
            h *
            w;

          dzv +=
            c *
            dt *
            h *
            w;
        }

        float W =
          uSize.x;

        float H =
          uSize.y;

        float th0 =
          sTheta(
            u,
            v
          );

        vec3 baseP =
          vec3(
            (
              x -
              xe * 0.5
            ) * W,

            (
              v -
              0.5
            ) * H +
            sYoff(u, v),

            (
              z -
              ze * 0.5
            ) * W
          );

        vec3 Tu =
          vec3(
            W * cos(th0),
            sYdU(u, v),
            W * sin(th0)
          );

        vec3 Tv =
          vec3(
            (
              dxv -
              dxe * 0.5
            ) * W,

            H +
            sYdV(u, v),

            (
              dzv -
              dze * 0.5
            ) * W
          );

        vec3 baseNormal =
          normalize(
            cross(
              Tu,
              Tv
            )
          );

        /* =====================================================
           GENIE
        ===================================================== */

        float progress =
          clamp(
            uGenie,
            0.0,
            1.0
          );

        /*
         * Genie shape.
         *
         * The bottom is compressed strongly.
         * The top stays wide.
         */
        float heightFactor =
          smoothstep(
            0.0,
            1.0,
            v
          );

        float genieWidth =
          pow(
            heightFactor,
            0.72
          );

        genieWidth =
          max(
            genieWidth,
            0.012
          );

        /*
         * Organic bulge during transition.
         */
        float bulge =
          sin(
            progress *
            3.14159265
          );

        genieWidth +=
          bulge *
          0.08 *
          heightFactor;

        genieWidth =
          clamp(
            genieWidth,
            0.008,
            1.0
          );

        /*
         * Bottom-left origin.
         */
        float originX =
          -W * 0.5;

        float originY =
          -H * 0.5;

        /*
         * Compress toward origin.
         */
        float genieX =
          originX +
          (
            baseP.x -
            originX
          ) *
          genieWidth;

        float genieY =
          originY +
          (
            baseP.y -
            originY
          ) *
          progress;

        float genieZ =
          baseP.z *
          mix(
            0.20,
            1.0,
            progress
          );

        /*
         * Small curved sweep.
         */
        float curve =
          sin(
            heightFactor *
            3.14159265
          ) *
          bulge *
          0.16;

        genieX +=
          curve *
          (
            0.5 +
            heightFactor
          );

        vec3 genieP =
          vec3(
            genieX,
            genieY,
            genieZ
          );

        /*
         * =====================================================
         * RELEASE
         *
         * This is the important part.
         *
         * The last part of the opening animation returns
         * completely to baseP.
         *
         * Therefore when uGenie = 1:
         *
         * P = baseP
         *
         * The paper is completely released.
         * =====================================================
         */

        float release =
          smoothstep(
            0.68,
            1.0,
            progress
          );

        P =
          mix(
            genieP,
            baseP,
            release
          );

        /*
         * Normal paper lighting after release.
         */
        NN =
          normalize(
            mix(
              vec3(
                0.0,
                0.0,
                1.0
              ),
              baseNormal,
              release
            )
          );
      }
    `;

    /* =========================================================
       TEXTURE
    ========================================================= */

    const textureLoader =
      new THREE.TextureLoader();

    const certificateTexture =
      textureLoader.load(
        '/my-certificate.jpg',
        () => {
          if (SRGB) {
            certificateTexture.colorSpace =
              SRGB;
          }

          certificateTexture.anisotropy = 8;
          certificateTexture.needsUpdate = true;
        }
      );

    /* =========================================================
       MATERIAL
    ========================================================= */

    const material =
      new THREE.MeshPhysicalMaterial({
        map: certificateTexture,

        color:
          new THREE.Color(
            0xffffff
          ),

        side:
          THREE.DoubleSide,

        metalness: 0,

        roughness: 0.1,

        clearcoat: 1,

        clearcoatRoughness:
          0.05,

        iridescence:
          0.08,

        iridescenceIOR:
          1.35,

        iridescenceThicknessRange:
          [120, 420],

        envMapIntensity:
          1.15,

        specularIntensity:
          1,

        ior: 1.5,

        transparent: true,

        alphaTest:
          0.012,

        opacity: 1,
      });

    /* =========================================================
       SHADER INJECTION
    ========================================================= */

    material.onBeforeCompile =
      (shader) => {
        Object.assign(
          shader.uniforms,
          uniforms
        );

        /*
         * IMPORTANT:
         *
         * WAVE is inserted INSIDE a template
         * string. This prevents TypeScript from
         * interpreting GLSL as TypeScript.
         */

        shader.vertexShader =
          shader.vertexShader

            .replace(
              '#include <common>',
              `
              #include <common>

              ${WAVE}
              `
            )

            .replace(
              '#include <beginnormal_vertex>',
              `
              vec3 sheetP;
              vec3 objectNormal;

              sheetPoint(
                uv,
                sheetP,
                objectNormal
              );

              objectNormal =
                normalize(
                  objectNormal
                );

              #ifdef USE_TANGENT

              vec3 objectTangent =
                vec3(
                  tangent.xyz
                );

              #endif
              `
            )

            .replace(
              '#include <begin_vertex>',
              `
              vec3 transformed =
                sheetP;
              `
            );

        shader.fragmentShader =
          shader.fragmentShader

            .replace(
              '#include <common>',
              `
              #include <common>

              uniform float uRim;
              uniform float uRimA;
              uniform float uSpecA;
              uniform vec3 uRimCol;
              `
            )

            .replace(
              '#include <alphatest_fragment>',
              `
              if (
                diffuseColor.a /
                max(
                  opacity,
                  1e-4
                )
                <
                alphaTest
              ) {
                discard;
              }
              `
            )

            .replace(
              '#include <output_fragment>',
              `
              float fres =
                pow(
                  1.0 -
                  clamp(
                    abs(
                      dot(
                        geometry.normal,
                        geometry.viewDir
                      )
                    ),
                    0.0,
                    1.0
                  ),
                  3.2
                );

              outgoingLight +=
                fres *
                uRim *
                uRimCol;

              float baseA =
                diffuseColor.a /
                max(
                  opacity,
                  1e-4
                );

              float outA =
                clamp(
                  baseA +
                  fres *
                  uRimA +
                  uSpecA *
                  dot(
                    outgoingLight,
                    vec3(
                      0.3333
                    )
                  ),
                  0.0,
                  1.0
                ) *
                opacity;

              gl_FragColor =
                vec4(
                  outgoingLight,
                  outA
                );
              `
            );
      };

    /* =========================================================
       GROUP
    ========================================================= */

    const mesh =
      new THREE.Mesh(
        geometry,
        material
      );

    const group =
      new THREE.Group();

    group.add(mesh);

    scene.add(group);

    /* =========================================================
       HALO
    ========================================================= */

    const haloCanvas =
      document.createElement(
        'canvas'
      );

    haloCanvas.width = 256;
    haloCanvas.height = 256;

    const haloContext =
      haloCanvas.getContext(
        '2d'
      )!;

    const haloGradient =
      haloContext.createRadialGradient(
        128,
        128,
        0,
        128,
        128,
        128
      );

    haloGradient.addColorStop(
      0,
      'rgba(0,0,0,.55)'
    );

    haloGradient.addColorStop(
      0.45,
      'rgba(0,0,0,.28)'
    );

    haloGradient.addColorStop(
      1,
      'rgba(0,0,0,0)'
    );

    haloContext.fillStyle =
      haloGradient;

    haloContext.fillRect(
      0,
      0,
      256,
      256
    );

    const haloTexture =
      new THREE.CanvasTexture(
        haloCanvas
      );

    const haloMaterial =
      new THREE.MeshBasicMaterial({
        map: haloTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.3,
      });

    const halo =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          3.9,
          4.9
        ),
        haloMaterial
      );

    halo.position.z =
      -0.62;

    group.add(halo);

    /* =========================================================
       INTERACTION
    ========================================================= */

    let dragging = false;

    let dragYaw = 0;
    let dragPitch = 0;

    let previousYaw = 0;
    let previousPitch = 0;

    let velocityYaw = 0;
    let velocityPitch = 0;

    let releaseTimer = 0;

    let lastPointerX = 0;
    let lastPointerY = 0;

    let hover = 0;
    let hoverTarget = 0;

    let overSheet = false;

    let cursorState =
      'default';

    const mouse = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
    };

    const tempVector =
      new THREE.Vector3();

    let quad:
      [number, number][] | null =
      null;

    /* =========================================================
       CORNER POINT
    ========================================================= */

    function getCornerPoint(
      u: number,
      v: number
    ) {
      const time =
        uniforms.uTime.value;

      const phase =
        uniforms.uPhase.value;

      const amp =
        uniforms.uAmp.value;

      const freq =
        uniforms.uFreq.value;

      const twist =
        uniforms.uTwist.value;

      function theta(
        uu: number
      ) {
        return (
          amp *
          (
            0.1 +
            Math.pow(
              uu,
              1.35
            )
          ) *
          (
            0.5 +
            0.64 * v
          ) *
          Math.sin(
            freq * uu +
            twist * v +
            time * 0.4 +
            phase
          )
        );
      }

      let x = 0;
      let z = 0;

      let totalX = 0;
      let totalZ = 0;

      const segments = 20;
      const step =
        1 / segments;

      for (
        let i = 0;
        i < segments;
        i++
      ) {
        const uu =
          (i + 0.5) *
          step;

        const weight =
          clamp(
            (
              u -
              (
                uu -
                0.5 * step
              )
            ) /
              step,
            0,
            1
          );

        const angle =
          theta(uu);

        const c =
          Math.cos(angle);

        const s =
          Math.sin(angle);

        totalX +=
          c * step;

        totalZ +=
          s * step;

        x +=
          c *
          step *
          weight;

        z +=
          s *
          step *
          weight;
      }

      const yOffset =
        0.021 *
        SH *
        Math.sin(
          2.05 * u +
          time * 0.47 +
          phase
        )
        +
        0.013 *
        SH *
        Math.sin(
          3.35 * u -
          1.55 * v +
          time * 0.63 +
          phase
        ) *
        (
          1 -
          0.55 * v
        );

      return tempVector.set(
        (
          x -
          totalX * 0.5
        ) * SW,

        (
          v -
          0.5
        ) * SH +
        yOffset,

        (
          z -
          totalZ * 0.5
        ) * SW
      );
    }

    /* =========================================================
       BUILD HIT QUAD
    ========================================================= */

    function buildQuad() {
      const points:
        [number, number][] =
        [];

      const corners = [
        [0, 1],
        [1, 1],
        [1, 0],
        [0, 0],
      ];

      for (
        const corner of corners
      ) {
        const point =
          getCornerPoint(
            corner[0],
            corner[1]
          )
            .clone()
            .applyMatrix4(
              group.matrixWorld
            )
            .project(camera);

        points.push([
          (
            point.x *
            0.5 +
            0.5
          ) *
            container.clientWidth,

          (
            -point.y *
            0.5 +
            0.5
          ) *
            container.clientHeight,
        ]);
      }

      const centerX =
        points.reduce(
          (sum, p) =>
            sum + p[0],
          0
        ) / 4;

      const centerY =
        points.reduce(
          (sum, p) =>
            sum + p[1],
          0
        ) / 4;

      quad =
        points.map(
          ([x, y]) => [
            centerX +
              (
                x -
                centerX
              ) *
                1.07,

            centerY +
              (
                y -
                centerY
              ) *
                1.07,
          ]
        );
    }

    /* =========================================================
       POINT IN QUAD
    ========================================================= */

    function pointInQuad(
      px: number,
      py: number
    ) {
      if (!quad) {
        return false;
      }

      let sign = 0;

      for (
        let i = 0;
        i < 4;
        i++
      ) {
        const [
          ax,
          ay,
        ] = quad[i];

        const [
          bx,
          by,
        ] =
          quad[
            (i + 1) % 4
          ];

        const cross =
          (
            bx - ax
          ) *
          (
            py - ay
          ) -
          (
            by - ay
          ) *
          (
            px - ax
          );

        if (
          cross !== 0
        ) {
          const currentSign =
            cross > 0
              ? 1
              : -1;

          if (
            sign === 0
          ) {
            sign =
              currentSign;
          } else if (
            sign !==
            currentSign
          ) {
            return false;
          }
        }
      }

      return true;
    }

    /* =========================================================
       POINTER MOVE
    ========================================================= */

    function handlePointerMove(
      event: PointerEvent
    ) {
      const rect =
        container.getBoundingClientRect();

      const x =
        event.clientX -
        rect.left;

      const y =
        event.clientY -
        rect.top;

      mouse.targetX =
        (
          x /
          rect.width -
          0.5
        ) * 2;

      mouse.targetY =
        (
          y /
          rect.height -
          0.5
        ) * 2;

      if (dragging) {
        const dx =
          event.clientX -
          lastPointerX;

        const dy =
          event.clientY -
          lastPointerY;

        lastPointerX =
          event.clientX;

        lastPointerY =
          event.clientY;

        dragYaw +=
          dx * 0.006;

        dragPitch =
          clamp(
            dragPitch -
              dy * 0.0045,
            -0.6,
            0.6
          );

        return;
      }

      overSheet =
        pointInQuad(
          x,
          y
        );

      hoverTarget =
        overSheet
          ? 1
          : 0;
    }

    /* =========================================================
       POINTER DOWN
    ========================================================= */

    function handlePointerDown(
      event: PointerEvent
    ) {
      /*
       * Do not drag during Genie.
       */
      if (
        uniforms.uGenie.value <
        0.98
      ) {
        return;
      }

      const rect =
        container.getBoundingClientRect();

      const x =
        event.clientX -
        rect.left;

      const y =
        event.clientY -
        rect.top;

      if (
        pointInQuad(
          x,
          y
        )
      ) {
        dragging = true;

        lastPointerX =
          event.clientX;

        lastPointerY =
          event.clientY;

        velocityYaw = 0;
        velocityPitch = 0;

        previousYaw =
          dragYaw;

        previousPitch =
          dragPitch;
      }
    }

    function handlePointerUp() {
      if (!dragging) {
        return;
      }

      dragging = false;

      releaseTimer = 0.6;
    }

    container.addEventListener(
      'pointermove',
      handlePointerMove,
      {
        passive: true,
      }
    );

    container.addEventListener(
      'pointerdown',
      handlePointerDown
    );

    window.addEventListener(
      'pointerup',
      handlePointerUp
    );

    /* =========================================================
       RESIZE
    ========================================================= */

    function resize() {
      const width =
        container.clientWidth;

      const height =
        container.clientHeight;

      if (
        width <= 0 ||
        height <= 0
      ) {
        return;
      }

      renderer.setSize(
        width,
        height,
        false
      );

      camera.aspect =
        width / height;

      camera.updateProjectionMatrix();

      const visibleHeight =
        2 *
        camera.position.z *
        Math.tan(
          THREE.MathUtils.degToRad(
            camera.fov
          ) / 2
        );

      const visibleWidth =
        visibleHeight *
        camera.aspect;

      const widthCap =
        Math.min(
          0.88,
          0.6 +
            Math.max(
              0,
              1.45 -
                camera.aspect
            ) *
              0.45
        );

      group.scale.setScalar(
        Math.min(
          (
            visibleHeight *
            0.735
          ) / SH,

          (
            visibleWidth *
            widthCap
          ) / SW
        )
      );
    }

    window.addEventListener(
      'resize',
      resize
    );

    resize();

    /* =========================================================
       ANIMATION STATE
    ========================================================= */

    const clock =
      new THREE.Clock();

    let animationId = 0;

    let intro =
      REDUCED ? 1 : 0;

    let closing = false;

    let closeFinished = false;

    /*
     * 0 -> 1
     *
     * Opening:
     * collapsed -> released
     *
     * Closing:
     * released -> collapsed
     */
    const GENIE_SPEED =
      2.45;

    /* =========================================================
       CLOSE FUNCTION
    ========================================================= */

    function requestClose() {
      if (closing) {
        return;
      }

      if (REDUCED) {
        closeCertificate();
        return;
      }

      closing = true;

      closeFinished = false;

      dragging = false;

      hoverTarget = 0;
    }

    (
      container as HTMLDivElement & {
        __genieClose?: () => void;
      }
    ).__genieClose =
      requestClose;

    /* =========================================================
       FRAME
    ========================================================= */

    function animate() {
      animationId =
        requestAnimationFrame(
          animate
        );

      const delta =
        Math.min(
          clock.getDelta(),
          0.05
        );

      const time =
        clock.elapsedTime;

      uniforms.uTime.value =
        REDUCED
          ? 2.4
          : time;

      /* =====================================================
         OPENING
      ===================================================== */

      if (
        !closing
      ) {
        if (
          uniforms.uGenie.value <
          1
        ) {
          uniforms.uGenie.value =
            Math.min(
              1,
              uniforms.uGenie.value +
                delta *
                  GENIE_SPEED
            );
        }

        intro +=
          (
            1 -
            intro
          ) *
          Math.min(
            1,
            delta * 3.5
          );
      }

      /* =====================================================
         CLOSING
      ===================================================== */

      if (
        closing &&
        !closeFinished
      ) {
        uniforms.uGenie.value =
          Math.max(
            0,
            uniforms.uGenie.value -
              delta *
                GENIE_SPEED
          );

        /*
         * Once fully collapsed,
         * close the React modal.
         */
        if (
          uniforms.uGenie.value <=
          0.001
        ) {
          closeFinished =
            true;

          /*
           * One final rendered frame.
           */
          requestAnimationFrame(
            () => {
              closeCertificate();
            }
          );

          return;
        }
      }

      /* =====================================================
         INTRO / OPACITY
      ===================================================== */

      material.opacity =
        clamp(
          intro,
          0,
          1
        );

      /*
       * Fade halo during Genie.
       */
      const genie =
        uniforms.uGenie.value;

      halo.material.opacity =
        intro *
        0.3 *
        Math.min(
          1,
          genie * 1.5
        );

      /* =====================================================
         DRAG
      ===================================================== */

      if (
        dragging
      ) {
        const k =
          Math.min(
            1,
            delta * 14
          );

        velocityYaw +=
          (
            (
              dragYaw -
              previousYaw
            ) /
              Math.max(
                delta,
                0.001
              ) -
            velocityYaw
          ) * k;

        velocityPitch +=
          (
            (
              dragPitch -
              previousPitch
            ) /
              Math.max(
                delta,
                0.001
              ) -
            velocityPitch
          ) * k;

        velocityYaw =
          clamp(
            velocityYaw,
            -7,
            7
          );

        velocityPitch =
          clamp(
            velocityPitch,
            -4,
            4
          );
      } else {
        /*
         * Release inertia.
         */
        dragYaw +=
          velocityYaw *
          delta;

        dragPitch =
          clamp(
            dragPitch +
              velocityPitch *
                delta,
            -0.6,
            0.6
          );

        const decay =
          Math.pow(
            0.018,
            delta
          );

        velocityYaw *=
          decay;

        velocityPitch *=
          decay;

        releaseTimer =
          Math.max(
            0,
            releaseTimer -
              delta
          );

        /*
         * Return to natural position.
         */
        if (
          releaseTimer <= 0 &&
          genie >= 0.98
        ) {
          const targetYaw =
            Math.round(
              dragYaw /
                (
                  Math.PI * 2
                )
            ) *
            Math.PI *
            2;

          const k =
            Math.min(
              1,
              delta * 0.55
            );

          dragYaw +=
            (
              targetYaw -
              dragYaw
            ) * k;

          dragPitch -=
            dragPitch *
            k;
        }
      }

      previousYaw =
        dragYaw;

      previousPitch =
        dragPitch;

      /* =====================================================
         MOUSE
      ===================================================== */

      mouse.x +=
        (
          mouse.targetX -
          mouse.x
        ) *
        Math.min(
          1,
          delta * 3
        );

      mouse.y +=
        (
          mouse.targetY -
          mouse.y
        ) *
        Math.min(
          1,
          delta * 3
        );

      /*
       * Only activate normal floating after
       * the Genie is completely released.
       */
      const normalState =
        genie >= 0.98 &&
        !closing
          ? 1
          : 0;

      /* =====================================================
         NORMAL FLOATING ROTATION
      ===================================================== */

      const rotationAmount =
        genie < 0.98
          ? genie / 0.98
          : 1;

      group.rotation.y =
        (
          dragYaw +
          mouse.x * 0.16 +
          Math.sin(
            time * 0.23
          ) *
            0.045 *
            normalState
        ) *
        rotationAmount;

      group.rotation.x =
        (
          dragPitch -
          mouse.y * 0.11 +
          Math.sin(
            time * 0.19
          ) *
            0.026 *
            normalState
        ) *
        rotationAmount;

      group.rotation.z =
        Math.sin(
          time * 0.27
        ) *
        0.018 *
        normalState;

      /* =====================================================
         NORMAL FLOATING POSITION
      ===================================================== */

      group.position.y =
        Math.sin(
          time * 0.36
        ) *
          0.06 *
          normalState;

      group.position.x =
        Math.sin(
          time * 0.21
        ) *
          0.05 *
          normalState +
        mouse.x *
          0.1 *
          normalState;

      /*
       * During Genie, slowly remove the normal floating
       * movement so the certificate stays attached to
       * the Genie origin.
       */
      if (
        genie < 0.98
      ) {
        const genieFactor =
          genie;

        group.position.y *=
          genieFactor;

        group.position.x *=
          genieFactor;
      }

      group.updateMatrixWorld();

      /* =====================================================
         HOVER
      ===================================================== */

      hover +=
        (
          hoverTarget -
          hover
        ) *
        Math.min(
          1,
          delta * 4.5
        );

      touchLight.intensity =
        hover *
        2.6 *
        intro *
        normalState;

      if (
        hover > 0.002 &&
        normalState
      ) {
        const lightDirection =
          new THREE.Vector3(
            mouse.x,
            -mouse.y,
            0.5
          )
            .unproject(
              camera
            )
            .sub(
              camera.position
            )
            .normalize();

        touchLight.position
          .copy(
            camera.position
          )
          .addScaledVector(
            lightDirection,
            (
              1.75 -
              camera.position.z
            ) /
              lightDirection.z
          );
      }

      /* =====================================================
         HIT TEST
      ===================================================== */

      if (
        normalState
      ) {
        buildQuad();
      }

      const desiredCursor =
        dragging
          ? 'grabbing'
          : overSheet &&
            normalState
          ? 'grab'
          : 'default';

      if (
        desiredCursor !==
        cursorState
      ) {
        cursorState =
          desiredCursor;

        container.style.cursor =
          desiredCursor;
      }

      /* =====================================================
         RENDER
      ===================================================== */

      renderer.render(
        scene,
        camera
      );
    }

    animate();

    /* =========================================================
       CLEANUP
    ========================================================= */

    return () => {
      cancelAnimationFrame(
        animationId
      );

      container.removeEventListener(
        'pointermove',
        handlePointerMove
      );

      container.removeEventListener(
        'pointerdown',
        handlePointerDown
      );

      window.removeEventListener(
        'pointerup',
        handlePointerUp
      );

      window.removeEventListener(
        'resize',
        resize
      );

      (
        container as HTMLDivElement & {
          __genieClose?: () => void;
        }
      ).__genieClose =
        undefined;

      renderer.dispose();

      geometry.dispose();

      material.dispose();

      certificateTexture.dispose();

      halo.geometry.dispose();

      haloMaterial.dispose();

      haloTexture.dispose();

      environment.dispose();

      pmrem.dispose();

      scene.clear();

      if (
        canvas.parentNode ===
        container
      ) {
        container.removeChild(
          canvas
        );
      }
    };
  }, [
    isOpen,
    closeCertificate,
  ]);

  /* =========================================================
     MODAL
  ========================================================= */

  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,

        background:
          'rgba(8,8,10,.40)',

        backdropFilter:
          'blur(8px)',

        WebkitBackdropFilter:
          'blur(8px)',

        display: 'flex',

        alignItems:
          'center',

        justifyContent:
          'center',
      }}
    >
      {/* =====================================================
          CLOSE BUTTON
      ===================================================== */}

      <button
        onClick={() => {
          const handler =
            (
              containerRef.current as
                | (HTMLDivElement & {
                    __genieClose?: () => void;
                  })
                | null
            )?.__genieClose;

          if (handler) {
            handler();
          } else {
            closeCertificate();
          }
        }}
        style={{
          position: 'fixed',

          top: 28,
          left: 28,

          zIndex: 100,

          background:
            'rgba(255,255,255,.08)',

          border:
            '1px solid rgba(255,255,255,.18)',

          color: '#fff',

          padding:
            '8px 18px',

          borderRadius:
            20,

          fontSize:
            12,

          letterSpacing:
            '.05em',

          cursor:
            'pointer',

          backdropFilter:
            'blur(8px)',

          WebkitBackdropFilter:
            'blur(8px)',

          transition:
            'all .2s ease',
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background =
            'rgba(255,255,255,.20)';
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background =
            'rgba(255,255,255,.08)';
        }}
      >
        ✕ Close
      </button>

      {/* =====================================================
          THREE.JS
      ===================================================== */}

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      />

      {/* =====================================================
          INSTRUCTIONS
      ===================================================== */}

      <div
        style={{
          position: 'fixed',

          left: 0,
          right: 0,

          bottom: 32,

          zIndex: 10,

          pointerEvents:
            'none',

          textAlign:
            'center',

          fontSize: 11,

          letterSpacing:
            '.22em',

          textTransform:
            'uppercase',

          color:
            'rgba(242,242,240,.4)',
        }}
      >
        <b
          style={{
            color:
              'rgba(242,242,240,.8)',
          }}
        >
          Drag
        </b>

        {' '}to turn it

        &nbsp;·&nbsp;

        <b
          style={{
            color:
              'rgba(242,242,240,.8)',
          }}
        >
          Hover
        </b>

        {' '}to light it
      </div>
    </div>
  );
}