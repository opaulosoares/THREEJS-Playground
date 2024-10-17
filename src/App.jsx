import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ArcballControls } from 'three/addons/controls/ArcballControls.js';
import './App.css';

function App() {
  const containerRef = useRef(null);
  let scene, camera, renderer, controls;
  let gizmoScene, gizmoRenderer;

  useEffect(() => {
    // --- Main Scene Setup ---
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 3, 5);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.setClearColor(new THREE.Color(0x333333));
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // --- Add Cube and Grid Helper ---
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.7,
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Add Grid and Axis Helpers
    const axesHelper = new THREE.AxesHelper(15);
    scene.add(axesHelper);
    scene.add(new THREE.GridHelper(10, 10, '#666666', '#222222'));

    // --- Add Lights ---
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    // --- Controls for Main Camera ---
    controls = new ArcballControls(camera, renderer.domElement, scene);
    controls.dampingFactor = 10000;

    const materials = [
      new THREE.MeshBasicMaterial({ color: 0xff0000 }), // Right face (red)
      new THREE.MeshBasicMaterial({ color: 0x00ff00 }), // Left face (green)
      new THREE.MeshBasicMaterial({ color: 0x0000ff }), // Top face (blue)
      new THREE.MeshBasicMaterial({ color: 0xffff00 }), // Bottom face (yellow)
      new THREE.MeshBasicMaterial({ color: 0xff00ff }), // Front face (magenta)
      new THREE.MeshBasicMaterial({ color: 0x00ffff })  // Back face (cyan)
   ];

    // --- Gizmo Cube in the Corner ---
    const gizmoCubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const gizmoCubeMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
    });
    const gizmoCube = new THREE.Mesh(gizmoCubeGeometry, materials);

    gizmoScene = new THREE.Scene();
    gizmoScene.add(gizmoCube);

    gizmoRenderer = new THREE.WebGLRenderer({antialias: true, alpha: true });
    gizmoRenderer.setSize(150, 150); // Keep Gizmo fixed size
    gizmoRenderer.setClearColor(0x000000, 0); // Transparent background

    // Create a small camera for the gizmo scene
    const gizmoCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 10);
    gizmoCamera.position.set(0, 0, 2);

    // Add Gizmo Cube to a Fixed Container in the Corner
    const gizmoContainer = document.createElement('div');
    gizmoContainer.style.position = 'absolute';
    gizmoContainer.style.bottom = '10px';
    gizmoContainer.style.left = '10px';
    gizmoContainer.style.width = '150px';
    gizmoContainer.style.height = '150px';
    gizmoContainer.style.zIndex = '1000'; // Ensure it's above the main canvas
    gizmoContainer.appendChild(gizmoRenderer.domElement);
    containerRef.current.appendChild(gizmoContainer);

    // --- Animation Loop ---
    function animate() {
      requestAnimationFrame(animate);

      // Update controls and render the main scene
      controls.update();
      renderer.render(scene, camera);

      // Sync the gizmo cube's rotation with the main camera
      gizmoCube.quaternion.copy(camera.quaternion).invert(); // Only rotate the gizmo cube

      // Render the Gizmo Cube
      gizmoRenderer.render(gizmoScene, gizmoCamera);
    }
    animate();

    // --- Handle Window Resize ---
    const handleResize = () => {
      // Resize main scene
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
      gizmoRenderer.dispose();
      containerRef.current.removeChild(renderer.domElement);
      containerRef.current.removeChild(gizmoContainer);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
  );
}

export default App;
