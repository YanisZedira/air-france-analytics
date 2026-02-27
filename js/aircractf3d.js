/**
 * ============================================================================
 * AIR FRANCE ANALYTICS — 3D Aircraft Viewer (Three.js)
 * Modèle procédural d'avion avec livrée Air France
 * ============================================================================
 */

class Aircraft3DViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.aircraft = null;
        this.mouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetRotY = 0.5;
        this.targetRotX = 0.15;
        this.currentRotY = 0.5;
        this.currentRotX = 0.15;
        this.autoRotate = true;

        this.init();
        this.createAircraft('a350');
        this.animate();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();

        // Camera
        const w = this.container.clientWidth || 600;
        const h = this.container.clientHeight || 480;
        this.camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 1000);
        this.camera.position.set(30, 12, 30);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 0.9);
        mainLight.position.set(20, 30, 20);
        mainLight.castShadow = true;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x6BAADB, 0.3);
        fillLight.position.set(-15, 10, -10);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xC4A265, 0.2);
        rimLight.position.set(0, -5, -20);
        this.scene.add(rimLight);

        // Ground shadow plane
        const groundGeo = new THREE.PlaneGeometry(80, 80);
        const groundMat = new THREE.ShadowMaterial({ opacity: 0.15 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -6;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Mouse interaction
        this.container.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.autoRotate = false;
        });
        window.addEventListener('mouseup', () => { this.mouseDown = false; });
        window.addEventListener('mousemove', (e) => {
            if (!this.mouseDown) return;
            const dx = e.clientX - this.mouseX;
            const dy = e.clientY - this.mouseY;
            this.targetRotY += dx * 0.005;
            this.targetRotX += dy * 0.003;
            this.targetRotX = Math.max(-0.5, Math.min(0.5, this.targetRotX));
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        // Touch
        this.container.addEventListener('touchstart', (e) => {
            this.mouseDown = true;
            this.mouseX = e.touches[0].clientX;
            this.mouseY = e.touches[0].clientY;
            this.autoRotate = false;
        });
        window.addEventListener('touchend', () => { this.mouseDown = false; });
        window.addEventListener('touchmove', (e) => {
            if (!this.mouseDown) return;
            const dx = e.touches[0].clientX - this.mouseX;
            const dy = e.touches[0].clientY - this.mouseY;
            this.targetRotY += dx * 0.005;
            this.targetRotX += dy * 0.003;
            this.targetRotX = Math.max(-0.5, Math.min(0.5, this.targetRotX));
            this.mouseX = e.touches[0].clientX;
            this.mouseY = e.touches[0].clientY;
        });

        // Resize
        window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    createAircraft(type) {
        // Remove previous
        if (this.aircraft) {
            this.scene.remove(this.aircraft);
        }

        this.aircraft = new THREE.Group();

        const specs = {
            a350: { fuselageLen: 20, fuselageRad: 1.8, wingSpan: 22, wingChord: 4, wingPos: -1, tailH: 5.5, name: 'A350-900' },
            b777: { fuselageLen: 24, fuselageRad: 2.0, wingSpan: 24, wingChord: 5, wingPos: -2, tailH: 6, name: '777-300ER' },
            a320: { fuselageLen: 13, fuselageRad: 1.3, wingSpan: 12, wingChord: 3, wingPos: -0.5, tailH: 4, name: 'A320' },
            b787: { fuselageLen: 19, fuselageRad: 1.8, wingSpan: 21, wingChord: 4, wingPos: -1, tailH: 5, name: '787-9' },
            a330: { fuselageLen: 19, fuselageRad: 1.85, wingSpan: 21, wingChord: 4.5, wingPos: -1.5, tailH: 5.5, name: 'A330-200' },
        };

        const s = specs[type] || specs.a350;

        // ── FUSELAGE ──
        // White body
        const fuselageGeo = new THREE.CylinderGeometry(s.fuselageRad, s.fuselageRad, s.fuselageLen, 32, 1, false);
        fuselageGeo.rotateZ(Math.PI / 2);
        const fuselageMat = new THREE.MeshPhysicalMaterial({
            color: 0xf5f5f5,
            metalness: 0.1,
            roughness: 0.3,
            clearcoat: 0.4,
        });
        const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
        fuselage.castShadow = true;
        this.aircraft.add(fuselage);

        // Nose cone
        const noseGeo = new THREE.SphereGeometry(s.fuselageRad, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        noseGeo.rotateZ(-Math.PI / 2);
        const noseMat = new THREE.MeshPhysicalMaterial({
            color: 0x1a1a2e,
            metalness: 0.3,
            roughness: 0.4,
        });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.x = s.fuselageLen / 2;
        this.aircraft.add(nose);

        // Tail cone
        const tailConeGeo = new THREE.ConeGeometry(s.fuselageRad, s.fuselageLen * 0.2, 32);
        tailConeGeo.rotateZ(Math.PI / 2);
        const tailConeMat = new THREE.MeshPhysicalMaterial({
            color: 0xf5f5f5,
            metalness: 0.1,
            roughness: 0.3,
        });
        const tailCone = new THREE.Mesh(tailConeGeo, tailConeMat);
        tailCone.position.x = -s.fuselageLen / 2 - s.fuselageLen * 0.1;
        this.aircraft.add(tailCone);

        // ── RED STRIPE (Air France signature) ──
        const stripeGeo = new THREE.CylinderGeometry(s.fuselageRad + 0.02, s.fuselageRad + 0.02, s.fuselageLen, 32, 1, true, 1.4, 0.25);
        stripeGeo.rotateZ(Math.PI / 2);
        const stripeMat = new THREE.MeshPhysicalMaterial({
            color: 0xE4002B,
            metalness: 0.2,
            roughness: 0.3,
            side: THREE.DoubleSide,
        });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        this.aircraft.add(stripe);

        // ── NAVY BLUE TAIL ──
        const tailGeo = new THREE.CylinderGeometry(s.fuselageRad + 0.01, s.fuselageRad + 0.01, s.fuselageLen * 0.22, 32, 1, true);
        tailGeo.rotateZ(Math.PI / 2);
        const tailMat = new THREE.MeshPhysicalMaterial({
            color: 0x002157,
            metalness: 0.2,
            roughness: 0.25,
            clearcoat: 0.3,
        });
        const tailSection = new THREE.Mesh(tailGeo, tailMat);
        tailSection.position.x = -s.fuselageLen / 2 + s.fuselageLen * 0.05;
        this.aircraft.add(tailSection);

        // ── VERTICAL STABILIZER (Tail fin) ──
        const finShape = new THREE.Shape();
        finShape.moveTo(0, 0);
        finShape.lineTo(-3, s.tailH);
        finShape.lineTo(-5, s.tailH);
        finShape.lineTo(-2, 0);
        finShape.closePath();

        const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.15, bevelEnabled: false });
        const finMat = new THREE.MeshPhysicalMaterial({
            color: 0x002157,
            metalness: 0.2,
            roughness: 0.25,
            clearcoat: 0.5,
            side: THREE.DoubleSide,
        });
        const fin = new THREE.Mesh(finGeo, finMat);
        fin.position.set(-s.fuselageLen / 2 + 2, s.fuselageRad * 0.4, -0.075);
        this.aircraft.add(fin);

        // ── HORIZONTAL STABILIZERS ──
        const hStabShape = new THREE.Shape();
        hStabShape.moveTo(0, 0);
        hStabShape.lineTo(-1.5, 5);
        hStabShape.lineTo(-3, 5);
        hStabShape.lineTo(-1, 0);
        hStabShape.closePath();

        const hStabGeo = new THREE.ExtrudeGeometry(hStabShape, { depth: 0.12, bevelEnabled: false });
        const hStabMat = new THREE.MeshPhysicalMaterial({
            color: 0xeaeaea,
            metalness: 0.1,
            roughness: 0.35,
            side: THREE.DoubleSide,
        });

        // Right stabilizer
        const hStabR = new THREE.Mesh(hStabGeo, hStabMat);
        hStabR.rotation.x = -Math.PI / 2;
        hStabR.position.set(-s.fuselageLen / 2 + 1, 0, -0.06);
        this.aircraft.add(hStabR);

        // Left stabilizer (mirrored)
        const hStabL = new THREE.Mesh(hStabGeo, hStabMat);
        hStabL.rotation.x = Math.PI / 2;
        hStabL.position.set(-s.fuselageLen / 2 + 1, 0, 0.06);
        this.aircraft.add(hStabL);

        // ── WINGS ──
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(s.wingChord * 0.3, s.wingSpan / 2);
        wingShape.lineTo(s.wingChord * 0.3 - s.wingChord * 0.6, s.wingSpan / 2);
        wingShape.lineTo(-s.wingChord, 0);
        wingShape.closePath();

        const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 });
        const wingMat = new THREE.MeshPhysicalMaterial({
            color: 0xe8e8e8,
            metalness: 0.15,
            roughness: 0.3,
            clearcoat: 0.2,
            side: THREE.DoubleSide,
        });

        // Right wing
        const wingR = new THREE.Mesh(wingGeo, wingMat);
        wingR.rotation.x = -Math.PI / 2;
        wingR.position.set(s.wingPos, -s.fuselageRad * 0.3, -0.15);
        wingR.castShadow = true;
        this.aircraft.add(wingR);

        // Left wing
        const wingL = new THREE.Mesh(wingGeo, wingMat);
        wingL.rotation.x = Math.PI / 2;
        wingL.position.set(s.wingPos, -s.fuselageRad * 0.3, 0.15);
        wingL.castShadow = true;
        this.aircraft.add(wingL);

        // ── ENGINES ──
        const engineGeo = new THREE.CylinderGeometry(s.fuselageRad * 0.35, s.fuselageRad * 0.4, s.fuselageLen * 0.16, 24);
        engineGeo.rotateZ(Math.PI / 2);
        const engineMat = new THREE.MeshPhysicalMaterial({
            color: 0x555566,
            metalness: 0.6,
            roughness: 0.2,
        });

        // Engine intake rings
        const intakeGeo = new THREE.TorusGeometry(s.fuselageRad * 0.37, 0.06, 8, 32);
        const intakeMat = new THREE.MeshPhysicalMaterial({
            color: 0x888899,
            metalness: 0.7,
            roughness: 0.15,
        });

        const enginePositions = [
            { x: s.wingPos + 1, y: -s.fuselageRad * 0.5, z: s.wingSpan * 0.22 },
            { x: s.wingPos + 1, y: -s.fuselageRad * 0.5, z: -s.wingSpan * 0.22 },
        ];

        // 777 has larger engines
        if (type === 'b777') {
            enginePositions.forEach(p => { p.z *= 1.1; });
        }

        enginePositions.forEach(pos => {
            const engine = new THREE.Mesh(engineGeo, engineMat);
            engine.position.set(pos.x, pos.y, pos.z);
            engine.castShadow = true;
            this.aircraft.add(engine);

            const intake = new THREE.Mesh(intakeGeo, intakeMat);
            intake.rotation.y = Math.PI / 2;
            intake.position.set(pos.x + s.fuselageLen * 0.08, pos.y, pos.z);
            this.aircraft.add(intake);
        });

        // ── COCKPIT WINDOWS ──
        const windowMat = new THREE.MeshPhysicalMaterial({
            color: 0x0a1628,
            metalness: 0.1,
            roughness: 0.1,
            clearcoat: 1.0,
            opacity: 0.9,
            transparent: true,
        });

        for (let i = 0; i < 2; i++) {
            const windowGeo = new THREE.PlaneGeometry(0.6, 0.35);
            const windowMesh = new THREE.Mesh(windowGeo, windowMat);
            const angle = (i === 0 ? 0.3 : -0.3);
            windowMesh.position.set(
                s.fuselageLen / 2 - 0.3,
                s.fuselageRad * 0.6,
                angle
            );
            windowMesh.rotation.y = (i === 0 ? 0.1 : -0.1);
            windowMesh.rotation.x = -0.3;
            this.aircraft.add(windowMesh);
        }

        // Position the whole aircraft
        this.aircraft.position.y = 0;
        this.scene.add(this.aircraft);

        // Reset rotation
        this.targetRotY = 0.5;
        this.targetRotX = 0.15;
        this.autoRotate = true;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.autoRotate) {
            this.targetRotY += 0.003;
        }

        // Smooth interpolation
        this.currentRotY += (this.targetRotY - this.currentRotY) * 0.05;
        this.currentRotX += (this.targetRotX - this.currentRotX) * 0.05;

        if (this.aircraft) {
            this.aircraft.rotation.y = this.currentRotY;
            this.aircraft.rotation.x = this.currentRotX;
        }

        this.renderer.render(this.scene, this.camera);
    }

    switchAircraft(type) {
        this.createAircraft(type);
    }
}
