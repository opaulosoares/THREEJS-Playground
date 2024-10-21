import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ArcballControls } from 'three/addons/controls/ArcballControls.js';
import './App.css';

function App() {
  const containerRef = useRef(null);
  let scene, camera, renderer, controls;
  let gizmoScene, gizmoRenderer;
  let raycaster = new THREE.Raycaster();
  let mouse = new THREE.Vector2();
  let intersectedFace = null; // Track the intersected face for highlighting
  let currentSideRef = useRef(null); // Using useRef instead of useState

  useEffect(() => {
    // --- Main Scene Setup ---
    scene = new THREE.Scene();
    
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const size = 5; // Control zoom level for orthographic view

    // Create Orthographic Camera
    camera = new THREE.OrthographicCamera(
      -size * aspect, // left
      size * aspect,  // right
      size,           // top
      -size,          // bottom
      0.1,            // near
      1000            // far
    );
    camera.position.set(0, 3, 5);
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 1, 0); // Ensure camera's up vector is aligned with Y-axis

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(new THREE.Color(0x333333));
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    const materials = [
      new THREE.MeshBasicMaterial({ color: 0xff0000 }), // Right face (red)
      new THREE.MeshBasicMaterial({ color: 0x00ff00 }), // Left face (green)
      new THREE.MeshBasicMaterial({ color: 0x0000ff }), // Top face (blue)
      new THREE.MeshBasicMaterial({ color: 0xffff00 }), // Bottom face (yellow)
      new THREE.MeshBasicMaterial({ color: 0xff00ff }), // Front face (magenta)
      new THREE.MeshBasicMaterial({ color: 0x00ffff })  // Back face (cyan)
    ];

    // --- Add Cube and Grid Helper ---
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const cube = new THREE.Mesh(geometry, materials);
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
    controls.target.copy(cube.position); // Ensure the target is the cube's position

    // --- Gizmo Group in the Corner ---
    const gizmoCube = new THREE.Group(); // Use a group to hold multiple objects

    // Create the cube and add to the group
    const gizmoCubeGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const gizmoMaterials = [
      new THREE.MeshBasicMaterial({ color: 0xff0000, map: createLabelTexture('Right') }), // Right face
      new THREE.MeshBasicMaterial({ color: 0x00ff00, map: createLabelTexture('Left') }), // Left face
      new THREE.MeshBasicMaterial({ color: 0x0000ff, map: createLabelTexture('Top') }),  // Top face
      new THREE.MeshBasicMaterial({ color: 0xffff00, map: createLabelTexture('Bottom') }),// Bottom face
      new THREE.MeshBasicMaterial({ color: 0xff00ff, map: createLabelTexture('Front') }),// Front face
      new THREE.MeshBasicMaterial({ color: 0x00ffff, map: createLabelTexture('Back') })  // Back face
    ];
    const cubeMesh = new THREE.Mesh(gizmoCubeGeometry, gizmoMaterials);
    gizmoCube.add(cubeMesh); // Add the cube mesh to the group

    // Add Axes Helper to the gizmoCube group
    const thickAxes = createThickAxes(1.2, 0.1); // Adjust size and thickness as needed
    gizmoCube.add(thickAxes); // Add thick axes to gizmo group

    // Create Gizmo Scene
    gizmoScene = new THREE.Scene();
    gizmoScene.add(gizmoCube); // Add group to the gizmo scene

    gizmoRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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

    // --- Raycasting and Highlighting Logic ---
    const onMouseMove = (event) => {
      const rect = gizmoRenderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, gizmoCamera);

      // Raycast for gizmo group children
      const intersects = raycaster.intersectObjects(gizmoCube.children);

      if (intersects.length > 0) {
        const faceIndex = intersects[0].face.materialIndex;

        if (intersectedFace !== faceIndex) {
          // Reset previous face color
          if (intersectedFace !== null) {
            gizmoCube.children[0].material[intersectedFace].color.setHex(gizmoCube.children[0].material[intersectedFace].userData.originalColor);
          }
          
          // Highlight new face
          intersectedFace = faceIndex;
          const highlightColor = 0xffffff; // White for highlight
          gizmoCube.children[0].material[faceIndex].userData.originalColor = gizmoCube.children[0].material[faceIndex].color.getHex(); // Store original color
          gizmoCube.children[0].material[faceIndex].color.setHex(highlightColor);
        }
      } else if (intersectedFace !== null) {
        // Reset previously highlighted face if no intersection
        gizmoCube.children[0].material[intersectedFace].color.setHex(gizmoCube.children[0].material[intersectedFace].userData.originalColor);
        intersectedFace = null;
      }
    };

    const onClick = () => {
      if (intersectedFace !== null) {
        const faceNames = ['Right', 'Left', 'Top', 'Bottom', 'Front', 'Back'];
        const clickedFace = faceNames[intersectedFace];
    
        // Verifique se a face atual é a mesma clicada
        if (currentSideRef.current === clickedFace) {
          // Alternar para a face oposta
          let oppositeFacePosition;
    
          switch (clickedFace) {
            case 'Right':
              oppositeFacePosition = { x: -5, y: 0, z: 0 };
              currentSideRef.current = 'Left';
              break;
            case 'Left':
              oppositeFacePosition = { x: 5, y: 0, z: 0 };
              currentSideRef.current = 'Right';
              break;
            case 'Top':
              oppositeFacePosition = { x: 0, y: -5, z: 0 };
              currentSideRef.current = 'Bottom';
              break;
            case 'Bottom':
              oppositeFacePosition = { x: 0, y: 5, z: 0 };
              currentSideRef.current = 'Top';
              break;
            case 'Front':
              oppositeFacePosition = { x: 0, y: 0, z: -5 };
              currentSideRef.current = 'Back';
              break;
            case 'Back':
              oppositeFacePosition = { x: 0, y: 0, z: 5 };
              currentSideRef.current = 'Front';
              break;
            default:
              return;
          }
    
          // Alinhar a câmera com a face oposta
          realignCube();
          snapToView(oppositeFacePosition);
        } else {
          // Se não for a mesma face, mova para a face clicada
          let facePosition;
    
          switch (clickedFace) {
            case 'Right':
              facePosition = { x: 5, y: 0, z: 0 };
              break;
            case 'Left':
              facePosition = { x: -5, y: 0, z: 0 };
              break;
            case 'Top':
              facePosition = { x: 0, y: 5, z: 0 };
              break;
            case 'Bottom':
              facePosition = { x: 0, y: -5, z: 0 };
              break;
            case 'Front':
              facePosition = { x: 0, y: 0, z: 5 };
              break;
            case 'Back':
              facePosition = { x: 0, y: 0, z: -5 };
              break;
            default:
              return;
          }
    
          currentSideRef.current = clickedFace;
          realignCube();
          snapToView(facePosition);
        }
      }
    };

    gizmoRenderer.domElement.addEventListener('mousemove', onMouseMove);
    gizmoRenderer.domElement.addEventListener('click', onClick);

    // --- Snap to View Functions ---
    const snapToView = (position) => {
      const duration = 0.2; // Adjust duration for smoothness
      const clock = new THREE.Clock();
      
      const startPosition = camera.position.clone();
      const startUp = camera.up.clone();
      const endPosition = new THREE.Vector3(position.x, position.y, position.z);
      const endUp = new THREE.Vector3(0, 1, 0); // Always align 'up' vector to Y-axis

      function animate() {
        const elapsed = clock.getElapsedTime();
        const t = Math.min(elapsed / duration, 1); // Interpolate based on time
        camera.position.lerpVectors(startPosition, endPosition, t);
        camera.up.lerpVectors(startUp, endUp, t);
        camera.lookAt(controls.target); // Make the camera look at the cube's position
        camera.updateProjectionMatrix();
        controls.update();
        
        if (t < 1) {
          requestAnimationFrame(animate);
        }
      }
      
      clock.start();
      animate();
    };

    // --- Realign Function to Center Cube ---
    const realignCube = () => {
      const currentZoom = camera.zoom;
      controls.target.set(0, 0, 0); // Reset the arcball target to the cube's new position
      controls.reset(); // Reset the controls to apply the new target and camera position
      camera.zoom = currentZoom;
      camera.lookAt(cube.position); // Ensure the camera is looking at the cube
      camera.updateProjectionMatrix();
      controls.update();
    };

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
      const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      const size = 5; // Adjust size for zoom level

      // Resize the orthographic camera
      camera.left = -size * aspect;
      camera.right = size * aspect;
      camera.top = size;
      camera.bottom = -size;
      camera.updateProjectionMatrix();

      // Resize main renderer
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
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
      document.querySelectorAll('button').forEach(button => button.remove()); // Remove buttons on unmount
    };

    // Create Label Texture for Gizmo Faces
    function createLabelTexture(label) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext('2d');
      context.fillStyle = '#333';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#fff';
      context.font = 'bold 48px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(label, canvas.width / 2, canvas.height / 2);
      return new THREE.CanvasTexture(canvas);
    }
  }, []);

  function createThickAxes(size = 5, thickness = 0.05, labels = { x: "X", y: "Y", z: "Z" }) {
    const axesGroup = new THREE.Group();
  
    // Define colors for X, Y, Z axes
    const axisColors = {
      x: 0xff0000, // Red
      y: 0x00ff00, // Green
      z: 0x0000ff  // Blue
    };
  
    // Create cylinders for each axis
    const axisGeometry = new THREE.CylinderGeometry(thickness, thickness, size, 32);
  
    // X Axis (Red)
    const xAxisMaterial = new THREE.MeshBasicMaterial({ color: axisColors.x });
    const xAxis = new THREE.Mesh(axisGeometry, xAxisMaterial);
    xAxis.rotation.z = Math.PI / 2; // Rotate the cylinder to lie on the X-axis
    xAxis.position.x = size / 2; // Position it along the X-axis
    axesGroup.add(xAxis);
  
    // Y Axis (Green)
    const yAxisMaterial = new THREE.MeshBasicMaterial({ color: axisColors.y });
    const yAxis = new THREE.Mesh(axisGeometry, yAxisMaterial);
    yAxis.position.y = size / 2; // Position it along the Y-axis
    axesGroup.add(yAxis);
  
    // Z Axis (Blue)
    const zAxisMaterial = new THREE.MeshBasicMaterial({ color: axisColors.z });
    const zAxis = new THREE.Mesh(axisGeometry, zAxisMaterial);
    zAxis.rotation.x = Math.PI / 2; // Rotate the cylinder to lie on the Z-axis
    zAxis.position.z = size / 2; // Position it along the Z-axis
    axesGroup.add(zAxis);
  
    // Function to create a label as a Sprite
    const createLabel = (text) => {
      const canvas = document.createElement('canvas');
      const size = 128; // Size of the canvas
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      context.fillStyle = 'rgba(255, 255, 255, 1.0)';
      context.font = '48px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, size / 2, size / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(0.5, 0.5, 1); // Adjust label size
      return sprite;
    };
  
    // Add labels to the ends of the axes if provided
    if (labels.x) {
      const xLabel = createLabel(labels.x);
      xLabel.position.set(size + 0.5, 0, 0); // Position it slightly beyond the end of the X-axis
      axesGroup.add(xLabel);
    }
  
    if (labels.y) {
      const yLabel = createLabel(labels.y);
      yLabel.position.set(0, size + 0.5, 0); // Position it slightly beyond the end of the Y-axis
      axesGroup.add(yLabel);
    }
  
    if (labels.z) {
      const zLabel = createLabel(labels.z);
      zLabel.position.set(0, 0, size + 0.5); // Position it slightly beyond the end of the Z-axis
      axesGroup.add(zLabel);
    }
  
    return axesGroup;
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
  );
}

export default App;
