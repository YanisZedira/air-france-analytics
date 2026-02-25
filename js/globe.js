/**
 * ============================================================================
 * AIR FRANCE ANALYTICS — Globe 3D Interactif
 * Globe terrestre avec routes aériennes animées
 * Utilise Three.js — Rendu dans un conteneur dédié
 * ============================================================================
 */

class GlobeViewer {
    constructor(containerId, airports, routes) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('Globe container not found:', containerId);
            return;
        }

        this.airports = airports || [];
        this.routes = routes || [];

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.globe = null;
        this.routeGroup = null;
        this.airportGroup = null;
        this.cloudMesh = null;

        this.mouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetRotY = 0;
        this.targetRotX = 0.3;
        this.currentRotY = 0;
        this.currentRotX = 0.3;
        this.autoRotate = true;
        this.autoRotateSpeed = 0.001;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredAirport = null;
        this.tooltipEl = null;

        this.GLOBE_RADIUS = 5;
        this.ROUTE_ALTITUDE = 0.15;

        this.init();
        this.createGlobe();
        this.createAtmosphere();
        this.createStars();
        this.createAirports();
        this.createRoutes();
        this.createTooltip();
        this.animate();
    }

    // ================================================================
    // INITIALIZATION
    // ================================================================
    init() {
        const w = this.container.clientWidth || 800;
        const h = this.container.clientHeight || 500;

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
        this.camera.position.set(0, 2, 14);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(10, 8, 5);
        this.scene.add(sunLight);

        const blueLight = new THREE.PointLight(0x6BAADB, 0.5, 50);
        blueLight.position.set(-8, 3, -5);
        this.scene.add(blueLight);

        // Interaction
        this.setupInteraction();

        // Resize
        window.addEventListener('resize', () => this.onResize());
    }

    // ================================================================
    // INTERACTION
    // ================================================================
    setupInteraction() {
        const el = this.renderer.domElement;

        el.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.autoRotate = false;
            el.style.cursor = 'grabbing';
        });

        window.addEventListener('mouseup', () => {
            this.mouseDown = false;
            el.style.cursor = 'grab';
            // Resume auto-rotate after 3 seconds
            clearTimeout(this._autoRotateTimeout);
            this._autoRotateTimeout = setTimeout(() => {
                this.autoRotate = true;
            }, 3000);
        });

        window.addEventListener('mousemove', (e) => {
            if (this.mouseDown) {
                const dx = e.clientX - this.mouseX;
                const dy = e.clientY - this.mouseY;
                this.targetRotY += dx * 0.004;
                this.targetRotX += dy * 0.003;
                this.targetRotX = Math.max(-1.2, Math.min(1.2, this.targetRotX));
                this.mouseX = e.clientX;
                this.mouseY = e.clientY;
            }

            // Hover detection
            const rect = el.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        });

        // Touch support
        el.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.mouseDown = true;
            this.mouseX = e.touches[0].clientX;
            this.mouseY = e.touches[0].clientY;
            this.autoRotate = false;
        }, { passive: false });

        window.addEventListener('touchend', () => {
            this.mouseDown = false;
            clearTimeout(this._autoRotateTimeout);
            this._autoRotateTimeout = setTimeout(() => {
                this.autoRotate = true;
            }, 3000);
        });

        window.addEventListener('touchmove', (e) => {
            if (!this.mouseDown) return;
            const dx = e.touches[0].clientX - this.mouseX;
            const dy = e.touches[0].clientY - this.mouseY;
            this.targetRotY += dx * 0.004;
            this.targetRotX += dy * 0.003;
            this.targetRotX = Math.max(-1.2, Math.min(1.2, this.targetRotX));
            this.mouseX = e.touches[0].clientX;
            this.mouseY = e.touches[0].clientY;
        }, { passive: false });

        // Scroll zoom
        el.addEventListener('wheel', (e) => {
            e.preventDefault();
            const z = this.camera.position.z;
            this.camera.position.z = Math.max(8, Math.min(25, z + e.deltaY * 0.01));
        }, { passive: false });

        el.style.cursor = 'grab';
    }

    // ================================================================
    // GLOBE
    // ================================================================
    createGlobe() {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

        // Globe sphere
        const geometry = new THREE.SphereGeometry(this.GLOBE_RADIUS, 64, 64);

        // Procedural globe texture
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Ocean
        ctx.fillStyle = isDark ? '#0a1628' : '#c8ddf0';
        ctx.fillRect(0, 0, 2048, 1024);

        // Simple land masses (approximate)
        ctx.fillStyle = isDark ? '#1a2a40' : '#d4dcc8';
        this.drawSimplifiedContinents(ctx);

        // Grid lines
        ctx.strokeStyle = isDark ? 'rgba(107, 170, 219, 0.08)' : 'rgba(0, 33, 87, 0.06)';
        ctx.lineWidth = 0.5;

        // Latitude lines
        for (let lat = -80; lat <= 80; lat += 20) {
            const y = (90 - lat) / 180 * 1024;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(2048, y);
            ctx.stroke();
        }

        // Longitude lines
        for (let lon = -180; lon <= 180; lon += 30) {
            const x = (lon + 180) / 360 * 2048;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 1024);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;

        const material = new THREE.MeshPhongMaterial({
            map: texture,
            specular: new THREE.Color(isDark ? 0x111122 : 0x555566),
            shininess: 15,
            transparent: false,
        });

        this.globe = new THREE.Mesh(geometry, material);
        this.scene.add(this.globe);

        // Countries border wireframe
        const wireGeo = new THREE.SphereGeometry(this.GLOBE_RADIUS + 0.005, 48, 48);
        const wireMat = new THREE.MeshBasicMaterial({
            color: isDark ? 0x1a3050 : 0x8899aa,
            wireframe: true,
            transparent: true,
            opacity: 0.04,
        });
        const wireframe = new THREE.Mesh(wireGeo, wireMat);
        this.scene.add(wireframe);
    }

    drawSimplifiedContinents(ctx) {
        // Simplified land polygons (approximate coordinates mapped to canvas)
        const landAreas = [
            // Europe
            { x: 1024, y: 200, w: 120, h: 100 },
            { x: 1000, y: 180, w: 80, h: 60 },
            // Africa
            { x: 1020, y: 330, w: 130, h: 200 },
            { x: 1050, y: 380, w: 90, h: 150 },
            // Asia
            { x: 1150, y: 150, w: 350, h: 200 },
            { x: 1200, y: 250, w: 200, h: 120 },
            { x: 1400, y: 300, w: 100, h: 80 },
            // North America
            { x: 350, y: 150, w: 280, h: 180 },
            { x: 300, y: 180, w: 200, h: 100 },
            // South America
            { x: 550, y: 400, w: 130, h: 220 },
            { x: 530, y: 350, w: 100, h: 150 },
            // Australia
            { x: 1550, y: 470, w: 130, h: 100 },
            // Greenland
            { x: 630, y: 100, w: 80, h: 60 },
        ];

        landAreas.forEach(area => {
            // Rounded rectangles with some randomness for natural look
            ctx.beginPath();
            const cx = area.x + area.w / 2;
            const cy = area.y + area.h / 2;
            const rx = area.w / 2;
            const ry = area.h / 2;
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // ================================================================
    // ATMOSPHERE GLOW
    // ================================================================
    createAtmosphere() {
        const vertexShader = `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                gl_FragColor = vec4(0.42, 0.67, 0.86, 1.0) * intensity * 0.6;
            }
        `;

        const atmosphereGeo = new THREE.SphereGeometry(this.GLOBE_RADIUS * 1.15, 32, 32);
        const atmosphereMat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true,
        });

        const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
        this.scene.add(atmosphere);
    }

    // ================================================================
    // STARS
    // ================================================================
    createStars() {
        const starsGeo = new THREE.BufferGeometry();
        const positions = [];
        const sizes = [];

        for (let i = 0; i < 2000; i++) {
            const r = 50 + Math.random() * 100;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
            sizes.push(0.3 + Math.random() * 1.2);
        }

        starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        starsGeo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

        const starsMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.15,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true,
        });

        this.scene.add(new THREE.Points(starsGeo, starsMat));
    }

    // ================================================================
    // CONVERT LAT/LON TO 3D COORDINATES
    // ================================================================
    latLonToVec3(lat, lon, altitude = 0) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        const r = this.GLOBE_RADIUS + altitude;
        return new THREE.Vector3(
            -r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta)
        );
    }

    // ================================================================
    // AIRPORTS
    // ================================================================
    createAirports() {
        this.airportGroup = new THREE.Group();
        this.airportMeshes = [];

        const continentColors = {
            'Europe': 0x002157,
            'Amérique du Nord': 0xE4002B,
            'Amérique du Sud': 0xC4A265,
            'Afrique': 0x10b981,
            'Asie': 0x6BAADB,
            'Moyen-Orient': 0xa78bfa,
            'Océan Indien': 0x14b8a6,
            'Caraïbes': 0xf97316,
        };

        this.airports.forEach((airport) => {
            const lat = parseFloat(airport.latitude);
            const lon = parseFloat(airport.longitude);
            if (isNaN(lat) || isNaN(lon)) return;

            const pos = this.latLonToVec3(lat, lon, 0.02);
            const isHub = airport.type_aeroport === 'Hub';
            const size = isHub ? 0.08 : 0.04;

            const geo = new THREE.SphereGeometry(size, 12, 12);
            const color = continentColors[airport.continent] || 0x002157;
            const mat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.9,
            });

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            mesh.userData = {
                code: airport.code_iata,
                name: airport.nom,
                city: airport.ville,
                country: airport.pays,
                continent: airport.continent,
            };

            this.airportGroup.add(mesh);
            this.airportMeshes.push(mesh);

            // Glow ring for hubs
            if (isHub) {
                const ringGeo = new THREE.RingGeometry(0.1, 0.16, 32);
                const ringMat = new THREE.MeshBasicMaterial({
                    color: 0xE4002B,
                    transparent: true,
                    opacity: 0.4,
                    side: THREE.DoubleSide,
                });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.copy(pos);
                ring.lookAt(0, 0, 0);
                this.airportGroup.add(ring);
            }
        });

        this.scene.add(this.airportGroup);
    }

    // ================================================================
    // ROUTES — Great circle arcs
    // ================================================================
    createRoutes() {
        this.routeGroup = new THREE.Group();

        const airportMap = {};
        this.airports.forEach(a => {
            airportMap[a.code_iata] = a;
        });

        const maxCount = Math.max(...this.routes.map(r => r.count || 1), 1);

        this.routes.forEach((route) => {
            const a1 = airportMap[route.dep];
            const a2 = airportMap[route.arr];
            if (!a1 || !a2) return;

            const lat1 = parseFloat(a1.latitude);
            const lon1 = parseFloat(a1.longitude);
            const lat2 = parseFloat(a2.latitude);
            const lon2 = parseFloat(a2.longitude);
            if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return;

            const intensity = (route.count || 1) / maxCount;
            const arcPoints = this.computeGreatCircleArc(lat1, lon1, lat2, lon2, 64, intensity);

            const curve = new THREE.CatmullRomCurve3(arcPoints);
            const curvePoints = curve.getPoints(64);

            const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
            const material = new THREE.LineBasicMaterial({
                color: new THREE.Color().setHSL(0.6 - intensity * 0.15, 0.8, 0.4 + intensity * 0.3),
                transparent: true,
                opacity: 0.15 + intensity * 0.55,
                linewidth: 1,
            });

            const line = new THREE.Line(geometry, material);
            this.routeGroup.add(line);
        });

        this.scene.add(this.routeGroup);

        // Animated flight dots
        this.createFlightDots();
    }

    computeGreatCircleArc(lat1, lon1, lat2, lon2, segments, intensity) {
        const points = [];
        const maxAlt = this.ROUTE_ALTITUDE + intensity * 0.6;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;

            // Spherical interpolation
            const lat = lat1 + (lat2 - lat1) * t;
            const lon = lon1 + (lon2 - lon1) * t;

            // Handle date line crossing
            let lonInterp = lon;
            const dLon = lon2 - lon1;
            if (Math.abs(dLon) > 180) {
                const adjustedDLon = dLon > 0 ? dLon - 360 : dLon + 360;
                lonInterp = lon1 + adjustedDLon * t;
                if (lonInterp > 180) lonInterp -= 360;
                if (lonInterp < -180) lonInterp += 360;
            }

            // Altitude curve (parabolic arc)
            const alt = Math.sin(t * Math.PI) * maxAlt;

            points.push(this.latLonToVec3(lat, lonInterp, alt));
        }

        return points;
    }

    // ================================================================
    // ANIMATED FLIGHT DOTS
    // ================================================================
    createFlightDots() {
        this.flightDots = [];

        // Pick some routes for animated dots
        const selectedRoutes = this.routes
            .sort((a, b) => (b.count || 0) - (a.count || 0))
            .slice(0, Math.min(20, this.routes.length));

        const airportMap = {};
        this.airports.forEach(a => { airportMap[a.code_iata] = a; });

        selectedRoutes.forEach((route) => {
            const a1 = airportMap[route.dep];
            const a2 = airportMap[route.arr];
            if (!a1 || !a2) return;

            const lat1 = parseFloat(a1.latitude);
            const lon1 = parseFloat(a1.longitude);
            const lat2 = parseFloat(a2.latitude);
            const lon2 = parseFloat(a2.longitude);
            if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return;

            const intensity = (route.count || 1) / Math.max(...this.routes.map(r => r.count || 1), 1);
            const arcPoints = this.computeGreatCircleArc(lat1, lon1, lat2, lon2, 128, intensity);
            const curve = new THREE.CatmullRomCurve3(arcPoints);

            // Dot
            const dotGeo = new THREE.SphereGeometry(0.03, 8, 8);
            const dotMat = new THREE.MeshBasicMaterial({
                color: 0xE4002B,
                transparent: true,
                opacity: 0.9,
            });
            const dot = new THREE.Mesh(dotGeo, dotMat);
            this.scene.add(dot);

            // Glow
            const glowGeo = new THREE.SphereGeometry(0.06, 8, 8);
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0xE4002B,
                transparent: true,
                opacity: 0.3,
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            this.scene.add(glow);

            this.flightDots.push({
                dot,
                glow,
                curve,
                progress: Math.random(), // Random start position
                speed: 0.0008 + Math.random() * 0.0012,
            });
        });
    }

    // ================================================================
    // TOOLTIP
    // ================================================================
    createTooltip() {
        this.tooltipEl = document.createElement('div');
        this.tooltipEl.className = 'globe-tooltip';
        this.tooltipEl.style.cssText = `
            position: absolute;
            background: rgba(10, 14, 26, 0.92);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(107, 170, 219, 0.2);
            border-radius: 10px;
            padding: 10px 14px;
            color: #f0f2f8;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
            z-index: 100;
            max-width: 220px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        `;
        this.container.style.position = 'relative';
        this.container.appendChild(this.tooltipEl);
    }

    updateTooltip(airport, x, y) {
        if (airport) {
            this.tooltipEl.innerHTML = `
                <div style="font-weight: 700; font-size: 14px; color: #6BAADB; margin-bottom: 4px;">
                    ${airport.code} — ${airport.city}
                </div>
                <div style="color: #8892a8; margin-bottom: 2px;">${airport.name}</div>
                <div style="color: #C4A265; font-size: 11px;">${airport.country} • ${airport.continent}</div>
            `;
            this.tooltipEl.style.opacity = '1';
            this.tooltipEl.style.left = `${x + 15}px`;
            this.tooltipEl.style.top = `${y - 10}px`;
        } else {
            this.tooltipEl.style.opacity = '0';
        }
    }

    // ================================================================
    // RESIZE
    // ================================================================
    onResize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    // ================================================================
    // ANIMATION LOOP
    // ================================================================
    animate() {
        requestAnimationFrame(() => this.animate());

        // Auto-rotation
        if (this.autoRotate) {
            this.targetRotY += this.autoRotateSpeed;
        }

        // Smooth interpolation
        this.currentRotY += (this.targetRotY - this.currentRotY) * 0.05;
        this.currentRotX += (this.targetRotX - this.currentRotX) * 0.05;

        // Rotate everything together
        if (this.globe) {
            this.globe.rotation.y = this.currentRotY;
            this.globe.rotation.x = this.currentRotX;
        }
        if (this.airportGroup) {
            this.airportGroup.rotation.y = this.currentRotY;
            this.airportGroup.rotation.x = this.currentRotX;
        }
        if (this.routeGroup) {
            this.routeGroup.rotation.y = this.currentRotY;
            this.routeGroup.rotation.x = this.currentRotX;
        }

        // Animate flight dots
        if (this.flightDots) {
            this.flightDots.forEach(fd => {
                fd.progress += fd.speed;
                if (fd.progress > 1) fd.progress = 0;

                const point = fd.curve.getPoint(fd.progress);
                // Apply same rotation
                const euler = new THREE.Euler(this.currentRotX, this.currentRotY, 0, 'XYZ');
                point.applyEuler(euler);

                fd.dot.position.copy(point);
                fd.glow.position.copy(point);

                // Pulse glow
                fd.glow.material.opacity = 0.2 + Math.sin(Date.now() * 0.005 + fd.progress * 10) * 0.15;
            });
        }

        // Raycasting for hover
        this.raycaster.setFromCamera(this.mouse, this.camera);
        if (this.airportMeshes && this.airportMeshes.length > 0) {
            const intersects = this.raycaster.intersectObjects(this.airportMeshes);
            if (intersects.length > 0) {
                const airport = intersects[0].object.userData;
                if (this.hoveredAirport !== airport.code) {
                    this.hoveredAirport = airport.code;
                    // Scale up
                    intersects[0].object.scale.setScalar(1.8);

                    const rect = this.container.getBoundingClientRect();
                    const screenPos = intersects[0].point.clone().project(this.camera);
                    const x = (screenPos.x + 1) / 2 * rect.width;
                    const y = (-screenPos.y + 1) / 2 * rect.height;

                    this.updateTooltip(airport, x, y);
                }
            } else {
                if (this.hoveredAirport) {
                    // Reset scales
                    this.airportMeshes.forEach(m => m.scale.setScalar(1));
                    this.hoveredAirport = null;
                    this.updateTooltip(null);
                }
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    // ================================================================
    // UPDATE DATA
    // ================================================================
    updateRoutes(newRoutes) {
        this.routes = newRoutes;
        // Remove old routes
        if (this.routeGroup) {
            this.scene.remove(this.routeGroup);
        }
        // Remove old flight dots
        if (this.flightDots) {
            this.flightDots.forEach(fd => {
                this.scene.remove(fd.dot);
                this.scene.remove(fd.glow);
            });
        }
        // Recreate
        this.createRoutes();
    }

    // ================================================================
    // DESTROY
    // ================================================================
    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
        if (this.tooltipEl && this.tooltipEl.parentNode) {
            this.tooltipEl.parentNode.removeChild(this.tooltipEl);
        }
    }
}