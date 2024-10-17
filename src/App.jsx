import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ArcballControls } from 'three/addons/controls/ArcballControls.js';
import './App.css';
import { ViewHelper } from './ViewHelper.js';

function App() {
  const containerRef = useRef(null);
  let scene, camera, renderer, controls, helper;
  useEffect(() => {
    // Basic Scene Setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 3;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.setClearColor(new THREE.Color(0x333333));
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Add cube to the scene
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.7,
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    helper = new ViewHelper(camera, renderer, 'bottom-left');
    helper.setControls(controls);
    // helper.controls.center = controls.target;

    // Add controls to the camera
    controls = new ArcballControls(camera, renderer.domElement, scene);
    controls.dampingFactor = 10000;

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // directional light
    var light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(2, 2, 0);
    scene.add(light);

    // axes Helper
    const axesHelper = new THREE.AxesHelper(15);
    scene.add(axesHelper);

    scene.add(new THREE.GridHelper(10, 10, '#666666', '#222222'));

    // Handle Window Resize
    const handleResize = () => {
      camera.aspect =
        containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
    };
    window.addEventListener('resize', handleResize);

    // Clean-up function to remove the renderer on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      containerRef.current.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {}, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
  );
}

export default App;
