import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155/build/three.module.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.155/examples/jsm/webxr/ARButton.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.155/examples/jsm/loaders/GLTFLoader.js";

let scene, camera, renderer;
let controller;
let reticle;
let modelPlaced = false;

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(
    ARButton.createButton(renderer, {
      requiredFeatures: ["hit-test"]
    })
  );

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0, 1, 0);
  scene.add(light);

  controller = renderer.xr.getController(0);
  controller.addEventListener("select", onSelect);
  scene.add(controller);

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.1, 32),
    new THREE.MeshBasicMaterial({ color: 0x00ffcc })
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.visible = false;
  scene.add(reticle);
}

function onSelect() {
  if (reticle.visible && !modelPlaced) {
    const loader = new GLTFLoader();
    loader.load("assets/environment.glb", (gltf) => {
      const model = gltf.scene;
      model.position.setFromMatrixPosition(reticle.matrix);
      model.scale.set(1, 1, 1);
      scene.add(model);
      modelPlaced = true;
    });
  }
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if (!renderer.hitTestSourceRequested) {
      session.requestReferenceSpace("viewer").then((space) => {
        session.requestHitTestSource({ space }).then((source) => {
          renderer.hitTestSource = source;
        });
      });

      session.addEventListener("end", () => {
        renderer.hitTestSourceRequested = false;
        renderer.hitTestSource = null;
      });

      renderer.hitTestSourceRequested = true;
    }

    if (renderer.hitTestSource) {
      const hitTestResults = frame.getHitTestResults(renderer.hitTestSource);

      if (hitTestResults.length) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
}
