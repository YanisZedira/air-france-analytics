/**
 * ============================================================================
 * AIR FRANCE — Modèle 3D Avion avec Three.js
 * Livrée Air France authentique
 * ============================================================================
 */

class Aircraft3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('Container aircraft3d non trouvé');
            return;
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.aircraft = null;
        this.animationId = null;

        this.isDragging = false;
        this.prevMouseX = 0;
        this.prevMouseY = 0;
        this.rotationY = 0.5;
        this.rotationX = 0.1;
        this.targetRotY = 0.5;
        this.targetRotX = 0.1;
        this.autoRotate = true;

        this.init();
        this.createAircraft('a350');
        this.animate();
        this.setupEvents();
    }

    init() {
        const w = this.container.clientWidth || 600;
        const h = this.container.clientHeight || 450;

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 1000);
        this.camera.position.set(28, 12, 28);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(20, 30, 20);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x6BAADB, 0.3);
        fillLight.position.set(-15, 10, -10);
        this.scene.add(fillLight);

        const backLight = new THREE.DirectionalLight(0xC4A265, 0.2);
        backLight.position.set(0, -5, -20);
        this.scene.add(backLight);

        // Ground shadow
        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.ShadowMaterial({ opacity: 0.15 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -6;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    setupEvents() {
        const el = this.renderer.domElement;

        // Mouse
        el.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.prevMouseX = e.clientX;
            this.prevMouseY = e.clientY;
            this.autoRotate = false;
            el.style.cursor = 'grabbing';
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            el.style.cursor = 'grab';
            setTimeout(() => this.autoRotate = true, 2500);
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.prevMouseX;
            const dy = e.clientY - this.prevMouseY;
            this.targetRotY += dx * 0.008;
            this.targetRotX = Math.max(-0.5, Math.min(0.5, this.targetRotX + dy * 0.004));
            this.prevMouseX = e.clientX;
            this.prevMouseY = e.clientY;
        });

        // Touch
        el.addEventListener('touchstart', (e) => {
            this.isDragging = true;
            this.prevMouseX = e.touches[0].clientX;
            this.prevMouseY = e.touches[0].clientY;
            this.autoRotate = false;
        }, { passive: true });

        window.addEventListener('touchend', () => {
            this.isDragging = false;
            setTimeout(() => this.autoRotate = true, 2500);
        });

        window.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            const dx = e.touches[0].clientX - this.prevMouseX;
            const dy = e.touches[0].clientY - this.prevMouseY;
            this.targetRotY += dx * 0.008;
            this.targetRotX = Math.max(-0.5, Math.min(0.5, this.targetRotX + dy * 0.004));
            this.prevMouseX = e.touches[0].clientX;
            this.prevMouseY = e.touches[0].clientY;
        }, { passive: true });

        // Resize
        window.addEventListener('resize', () => this.onResize());
        
        el.style.cursor = 'grab';
    }

    onResize() {
        if (!this.container) return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        if (w && h) {
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        }
    }

    createAircraft(type) {
        // Remove old aircraft
        if (this.aircraft) {
            this.scene.remove(this.aircraft);
            this.aircraft.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }

        this.aircraft = new THREE.Group();

        // Specs per type
        const specs = {
            a350: { len: 22, rad: 1.9, wing: 23, tail: 6, name: 'A350-900' },
            b777: { len: 26, rad: 2.1, wing: 25, tail: 7, name: '777-300ER' },
            a320: { len: 14, rad: 1.4, wing: 14, tail: 4.5, name: 'A320' },
            b787: { len: 20, rad: 1.8, wing: 21, tail: 5.5, name: '787-9' },
        };
        const s = specs[type] || specs.a350;

        // Materials
        const whiteMat = new THREE.MeshPhongMaterial({ color: 0xf5f5f5, shininess: 80 });
        const navyMat = new THREE.MeshPhongMaterial({ color: 0x002157, shininess: 100 });
        const redMat = new THREE.MeshPhongMaterial({ color: 0xE4002B, shininess: 80 });
        const darkMat = new THREE.MeshPhongMaterial({ color: 0x1a1a28, shininess: 60 });
        const grayMat = new THREE.MeshPhongMaterial({ color: 0x555566, metalness: 0.7 });
        const windowMat = new THREE.MeshPhongMaterial({ 
            color: 0x0a1525, 
            shininess: 100, 
            opacity: 0.9, 
            transparent: true 
        });

        // ═══════════════════════════════════════════════════════
        // FUSELAGE
        // ═══════════════════════════════════════════════════════
        const fuselageGeo = new THREE.CylinderGeometry(s.rad, s.rad, s.len, 32);
        fuselageGeo.rotateZ(Math.PI / 2);
        const fuselage = new THREE.Mesh(fuselageGeo, whiteMat);
        fuselage.castShadow = true;
        this.aircraft.add(fuselage);

        // Nose cone (dark)
        const noseGeo = new THREE.SphereGeometry(s.rad, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        noseGeo.rotateZ(-Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, darkMat);
        nose.position.x = s.len / 2;
        this.aircraft.add(nose);

        // Tail cone
        const tailConeGeo = new THREE.ConeGeometry(s.rad, s.len * 0.2, 32);
        tailConeGeo.rotateZ(Math.PI / 2);
        const tailCone = new THREE.Mesh(tailConeGeo, whiteMat);
        tailCone.position.x = -s.len / 2 - s.len * 0.1;
        this.aircraft.add(tailCone);

        // ═══════════════════════════════════════════════════════
        // RED STRIPE (Air France signature)
        // ═══════════════════════════════════════════════════════
        const stripeGeo = new THREE.CylinderGeometry(
            s.rad + 0.02, s.rad + 0.02, s.len, 32, 1, true, 
            Math.PI * 1.38, Math.PI * 0.22
        );
        stripeGeo.rotateZ(Math.PI / 2);
        const stripe = new THREE.Mesh(stripeGeo, redMat);
        this.aircraft.add(stripe);

        // Second red stripe (bottom accent)
        const stripe2Geo = new THREE.CylinderGeometry(
            s.rad + 0.02, s.rad + 0.02, s.len, 32, 1, true,
            Math.PI * 0.38, Math.PI * 0.22
        );
        stripe2Geo.rotateZ(Math.PI / 2);
        const stripe2 = new THREE.Mesh(stripe2Geo, redMat);
        this.aircraft.add(stripe2);

        // ═══════════════════════════════════════════════════════
        // NAVY BLUE TAIL SECTION
        // ═══════════════════════════════════════════════════════
        const tailSecGeo = new THREE.CylinderGeometry(
            s.rad + 0.01, s.rad + 0.01, s.len * 0.24, 32, 1, true
        );
        tailSecGeo.rotateZ(Math.PI / 2);
        const tailSec = new THREE.Mesh(tailSecGeo, navyMat);
        tailSec.position.x = -s.len / 2 + s.len * 0.07;
        this.aircraft.add(tailSec);

        // ═══════════════════════════════════════════════════════
        // VERTICAL FIN (Empennage)
        // ═══════════════════════════════════════════════════════
        const finShape = new THREE.Shape();
        finShape.moveTo(0, 0);
        finShape.lineTo(-2.2, s.tail);
        finShape.lineTo(-4.8, s.tail);
        finShape.lineTo(-1.8, 0);
        finShape.closePath();

        const finGeo = new THREE.ExtrudeGeometry(finShape, { 
            depth: 0.2, 
            bevelEnabled: true,
            bevelThickness: 0.03,
            bevelSize: 0.03,
        });
        const fin = new THREE.Mesh(finGeo, navyMat);
        fin.position.set(-s.len / 2 + 1.8, s.rad * 0.35, -0.1);
        fin.castShadow = true;
        this.aircraft.add(fin);

        // ═══════════════════════════════════════════════════════
        // HORIZONTAL STABILIZERS
        // ═══════════════════════════════════════════════════════
        const hStabShape = new THREE.Shape();
        hStabShape.moveTo(0, 0);
        hStabShape.lineTo(-1.2, s.wing * 0.17);
        hStabShape.lineTo(-2.5, s.wing * 0.17);
        hStabShape.lineTo(-0.7, 0);
        hStabShape.closePath();

        const hStabGeo = new THREE.ExtrudeGeometry(hStabShape, { depth: 0.12, bevelEnabled: false });

        const hStabR = new THREE.Mesh(hStabGeo, whiteMat);
        hStabR.rotation.x = -Math.PI / 2;
        hStabR.position.set(-s.len / 2 + 1.2, 0, 0);
        hStabR.castShadow = true;
        this.aircraft.add(hStabR);

        const hStabL = new THREE.Mesh(hStabGeo.clone(), whiteMat);
        hStabL.rotation.x = Math.PI / 2;
        hStabL.position.set(-s.len / 2 + 1.2, 0, 0);
        hStabL.castShadow = true;
        this.aircraft.add(hStabL);

        // ═══════════════════════════════════════════════════════
        // WINGS
        // ═══════════════════════════════════════════════════════
        const halfSpan = s.wing / 2;
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(2.2, halfSpan);
        wingShape.lineTo(-2, halfSpan);
        wingShape.lineTo(-4.2, 0);
        wingShape.closePath();

        const wingGeo = new THREE.ExtrudeGeometry(wingShape, { 
            depth: 0.38, 
            bevelEnabled: true, 
            bevelThickness: 0.12, 
            bevelSize: 0.12 
        });

        const wingR = new THREE.Mesh(wingGeo, whiteMat);
        wingR.rotation.x = -Math.PI / 2;
        wingR.position.set(-1, -s.rad * 0.38, -0.19);
        wingR.castShadow = true;
        this.aircraft.add(wingR);

        const wingL = new THREE.Mesh(wingGeo.clone(), whiteMat);
        wingL.rotation.x = Math.PI / 2;
        wingL.position.set(-1, -s.rad * 0.38, 0.19);
        wingL.castShadow = true;
        this.aircraft.add(wingL);

        // Winglets
        const wingletShape = new THREE.Shape();
        wingletShape.moveTo(0, 0);
        wingletShape.lineTo(0.3, 1.6);
        wingletShape.lineTo(-0.4, 1.6);
        wingletShape.lineTo(-0.5, 0);
        wingletShape.closePath();

        const wingletGeo = new THREE.ExtrudeGeometry(wingletShape, { depth: 0.08, bevelEnabled: false });

        const wingletR = new THREE.Mesh(wingletGeo, whiteMat);
        wingletR.position.set(-1 + 1.8, -s.rad * 0.38, halfSpan - 0.1);
        wingletR.rotation.x = -Math.PI / 2;
        wingletR.rotation.z = 0.15;
        this.aircraft.add(wingletR);

        const wingletL = new THREE.Mesh(wingletGeo.clone(), whiteMat);
        wingletL.position.set(-1 + 1.8, -s.rad * 0.38, -halfSpan + 0.1);
        wingletL.rotation.x = Math.PI / 2;
        wingletL.rotation.z = 0.15;
        this.aircraft.add(wingletL);

        // ═══════════════════════════════════════════════════════
        // ENGINES
        // ═══════════════════════════════════════════════════════
        const engineRad = s.rad * 0.42;
        const engineLen = s.len * 0.16;

        const engineGeo = new THREE.CylinderGeometry(engineRad, engineRad * 1.1, engineLen, 24);
        engineGeo.rotateZ(Math.PI / 2);

        const intakeGeo = new THREE.TorusGeometry(engineRad * 1.03, 0.07, 8, 24);
        const fanGeo = new THREE.CircleGeometry(engineRad * 0.85, 24);
        const fanMat = new THREE.MeshPhongMaterial({ color: 0x333340, shininess: 60 });

        const enginePositions = [
            { x: 0, y: -s.rad * 0.58, z: halfSpan * 0.4 },
            { x: 0, y: -s.rad * 0.58, z: -halfSpan * 0.4 },
        ];

        enginePositions.forEach(pos => {
            // Engine body
            const engine = new THREE.Mesh(engineGeo, grayMat);
            engine.position.set(pos.x, pos.y, pos.z);
            engine.castShadow = true;
            this.aircraft.add(engine);

            // Intake ring
            const intake = new THREE.Mesh(intakeGeo, grayMat);
            intake.rotation.y = Math.PI / 2;
            intake.position.set(pos.x + engineLen / 2, pos.y, pos.z);
            this.aircraft.add(intake);

            // Fan
            const fan = new THREE.Mesh(fanGeo, fanMat);
            fan.rotation.y = Math.PI / 2;
            fan.position.set(pos.x + engineLen / 2 - 0.03, pos.y, pos.z);
            this.aircraft.add(fan);

            // Pylon
            const pylonGeo = new THREE.BoxGeometry(engineLen * 0.65, 0.28, 0.55);
            const pylon = new THREE.Mesh(pylonGeo, whiteMat);
            pylon.position.set(pos.x, pos.y + engineRad * 0.78, pos.z);
            this.aircraft.add(pylon);
        });

        // ═══════════════════════════════════════════════════════
        // COCKPIT WINDOWS
        // ═══════════════════════════════════════════════════════
        for (let i = 0; i < 2; i++) {
            const winGeo = new THREE.PlaneGeometry(0.75, 0.42);
            const win = new THREE.Mesh(winGeo, windowMat);
            win.position.set(
                s.len / 2 - 0.45,
                s.rad * 0.52,
                i === 0 ? 0.35 : -0.35
            );
            win.rotation.y = i === 0 ? 0.13 : -0.13;
            win.rotation.x = -0.22;
            this.aircraft.add(win);
        }

        // Side cockpit windows
        for (let i = 0; i < 2; i++) {
            const sideWinGeo = new THREE.PlaneGeometry(0.45, 0.32);
            const sideWin = new THREE.Mesh(sideWinGeo, windowMat);
            sideWin.position.set(
                s.len / 2 - 1.3,
                s.rad * 0.68,
                i === 0 ? s.rad * 0.88 : -s.rad * 0.88
            );
            sideWin.rotation.y = i === 0 ? Math.PI / 2 : -Math.PI / 2;
            this.aircraft.add(sideWin);
        }

        // ═══════════════════════════════════════════════════════
        // PASSENGER WINDOWS (Hublots)
        // ═══════════════════════════════════════════════════════
        const numWindows = Math.floor(s.len * 1.7);
        const windowStart = s.len / 2 - 2.8;
        const windowEnd = -s.len / 2 + 4.2;
        const windowStep = (windowStart - windowEnd) / numWindows;

        for (let i = 0; i < numWindows; i++) {
            const x = windowStart - i * windowStep;
            
            // Right side
            const wR = new THREE.Mesh(
                new THREE.CircleGeometry(0.13, 12), 
                windowMat
            );
            wR.position.set(x, s.rad * 0.38, s.rad + 0.01);
            wR.rotation.y = Math.PI / 2;
            this.aircraft.add(wR);

            // Left side
            const wL = new THREE.Mesh(
                new THREE.CircleGeometry(0.13, 12), 
                windowMat
            );
            wL.position.set(x, s.rad * 0.38, -s.rad - 0.01);
            wL.rotation.y = -Math.PI / 2;
            this.aircraft.add(wL);
        }

        // ═══════════════════════════════════════════════════════
        // AIR FRANCE TEXT ON FUSELAGE
        // ═══════════════════════════════════════════════════════
        const textCanvas = document.createElement('canvas');
        textCanvas.width = 512;
        textCanvas.height = 64;
        const ctx = textCanvas.getContext('2d');
        ctx.fillStyle = '#002157';
        ctx.font = 'bold 48px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AIR FRANCE', 256, 48);

        const textTexture = new THREE.CanvasTexture(textCanvas);
        const textMaterial = new THREE.MeshBasicMaterial({ 
            map: textTexture, 
            transparent: true,
            side: THREE.DoubleSide 
        });
        const textGeo = new THREE.PlaneGeometry(s.len * 0.48, s.len * 0.055);

        const textR = new THREE.Mesh(textGeo, textMaterial);
        textR.position.set(2, s.rad * 0.72, s.rad + 0.02);
        textR.rotation.y = Math.PI / 2;
        this.aircraft.add(textR);

        const textL = new THREE.Mesh(textGeo.clone(), textMaterial);
        textL.position.set(2, s.rad * 0.72, -s.rad - 0.02);
        textL.rotation.y = -Math.PI / 2;
        this.aircraft.add(textL);

        // ═══════════════════════════════════════════════════════
        // LANDING GEAR
        // ═══════════════════════════════════════════════════════
        const gearMat = new THREE.MeshPhongMaterial({ color: 0x333340, shininess: 60 });
        const tireMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 20 });

        // Nose gear
        const noseLeg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 2.2, 12),
            gearMat
        );
        noseLeg.position.set(s.len / 2 - 3.2, -s.rad - 1.1, 0);
        this.aircraft.add(noseLeg);

        const noseTire = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.12, 10, 20),
            tireMat
        );
        noseTire.position.set(s.len / 2 - 3.2, -s.rad - 2.2, 0);
        noseTire.rotation.y = Math.PI / 2;
        this.aircraft.add(noseTire);

        // Main gear
        [-1, 1].forEach(side => {
            const mainLeg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.12, 2.6, 12),
                gearMat
            );
            mainLeg.position.set(-2.2, -s.rad - 1.3, side * s.rad * 1.25);
            this.aircraft.add(mainLeg);

            // 2 tires per side
            for (let t = 0; t < 2; t++) {
                const mainTire = new THREE.Mesh(
                    new THREE.TorusGeometry(0.32, 0.14, 10, 20),
                    tireMat
                );
                mainTire.position.set(-2.2 + (t - 0.5) * 0.65, -s.rad - 2.6, side * s.rad * 1.25);
                mainTire.rotation.y = Math.PI / 2;
                this.aircraft.add(mainTire);
            }
        });

        // Position aircraft
        this.aircraft.position.y = 1.5;
        this.scene.add(this.aircraft);

        // Reset rotation
        this.targetRotY = 0.5;
        this.rotationY = 0.5;
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        if (this.autoRotate) {
            this.targetRotY += 0.004;
        }

        // Smooth interpolation
        this.rotationY += (this.targetRotY - this.rotationY) * 0.06;
        this.rotationX += (this.targetRotX - this.rotationX) * 0.06;

        if (this.aircraft) {
            this.aircraft.rotation.y = this.rotationY;
            this.aircraft.rotation.x = this.rotationX;
            // Subtle floating effect
            this.aircraft.position.y = 1.5 + Math.sin(Date.now() * 0.001) * 0.12;
        }

        this.renderer.render(this.scene, this.camera);
    }

    switchModel(type) {
        this.createAircraft(type);
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
    }
}

// Global instance
let aircraft3DInstance = null;

function initAircraft3D() {
    if (aircraft3DInstance) return;
    const container = document.getElementById('aircraft3d');
    if (container) {
        aircraft3DInstance = new Aircraft3D('aircraft3d');
    }
}
