/**
 * ============================================================================
 * AIR FRANCE — Globe 3D avec routes aériennes
 * Three.js
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
        this.flightDots = [];

        this.mouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetRotY = 0;
        this.targetRotX = 0.2;
        this.currentRotY = 0;
        this.currentRotX = 0.2;
        this.autoRotate = true;

        this.GLOBE_RADIUS = 5;

        this.init();
        this.createStars();
        this.createGlobe();
        this.createAtmosphere();
        this.createAirports();
        this.createRoutes();
        this.animate();
    }

    init() {
        const w = this.container.clientWidth || 800;
        const h = this.container.clientHeight || 500;

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
        this.camera.position.set(0, 3, 15);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404050, 0.5);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(10, 8, 5);
        this.scene.add(sunLight);

        // Mouse events
        this.setupMouse();

        // Resize
        window.addEventListener('resize', () => this.onResize());
    }

    setupMouse() {
        const el = this.renderer.domElement;

        el.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.autoRotate = false;
        });

        window.addEventListener('mouseup', () => {
            this.mouseDown = false;
            setTimeout(() => { this.autoRotate = true; }, 3000);
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.mouseDown) return;
            const dx = e.clientX - this.mouseX;
            const dy = e.clientY - this.mouseY;
            this.targetRotY += dx * 0.005;
            this.targetRotX += dy * 0.003;
            this.targetRotX = Math.max(-1, Math.min(1, this.targetRotX));
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        // Touch
        el.addEventListener('touchstart', (e) => {
            this.mouseDown = true;
            this.mouseX = e.touches[0].clientX;
            this.mouseY = e.touches[0].clientY;
            this.autoRotate = false;
        });

        window.addEventListener('touchend', () => {
            this.mouseDown = false;
            setTimeout(() => { this.autoRotate = true; }, 3000);
        });

        window.addEventListener('touchmove', (e) => {
            if (!this.mouseDown) return;
            const dx = e.touches[0].clientX - this.mouseX;
            const dy = e.touches[0].clientY - this.mouseY;
            this.targetRotY += dx * 0.005;
            this.targetRotX += dy * 0.003;
            this.targetRotX = Math.max(-1, Math.min(1, this.targetRotX));
            this.mouseX = e.touches[0].clientX;
            this.mouseY = e.touches[0].clientY;
        });

        // Zoom
        el.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.camera.position.z = Math.max(8, Math.min(25, this.camera.position.z + e.deltaY * 0.01));
        }, { passive: false        });
    }

    onResize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    createStars() {
        const starsGeo = new THREE.BufferGeometry();
        const positions = [];

        for (let i = 0; i < 1500; i++) {
            const r = 80 + Math.random() * 80;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
        }

        starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const starsMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.2,
            transparent: true,
            opacity: 0.7,
        });

        this.scene.add(new THREE.Points(starsGeo, starsMat));
    }

    createGlobe() {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

        // Globe sphere avec texture procédurale
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Océan
        ctx.fillStyle = isDark ? '#0d1a2d' : '#b8d4e8';
        ctx.fillRect(0, 0, 2048, 1024);

        // Continents simplifiés
        ctx.fillStyle = isDark ? '#1a2f45' : '#c8d8c0';
        
        // Europe
        this.drawContinent(ctx, 1000, 180, 150, 120);
        // Afrique
        this.drawContinent(ctx, 1020, 350, 140, 200);
        // Asie
        this.drawContinent(ctx, 1200, 150, 380, 220);
        // Amérique du Nord
        this.drawContinent(ctx, 300, 130, 320, 200);
        // Amérique du Sud
        this.drawContinent(ctx, 520, 380, 150, 250);
        // Australie
        this.drawContinent(ctx, 1580, 480, 150, 120);
        // Groenland
        this.drawContinent(ctx, 620, 80, 100, 70);

        // Grille
        ctx.strokeStyle = isDark ? 'rgba(107, 170, 219, 0.06)' : 'rgba(0, 33, 87, 0.05)';
        ctx.lineWidth = 0.5;

        for (let lat = -80; lat <= 80; lat += 20) {
            const y = (90 - lat) / 180 * 1024;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(2048, y);
            ctx.stroke();
        }

        for (let lon = -180; lon <= 180; lon += 30) {
            const x = (lon + 180) / 360 * 2048;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 1024);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);

        const globeGeo = new THREE.SphereGeometry(this.GLOBE_RADIUS, 64, 64);
        const globeMat = new THREE.MeshPhongMaterial({
            map: texture,
            specular: new THREE.Color(0x222233),
            shininess: 15,
        });

        this.globe = new THREE.Mesh(globeGeo, globeMat);
        this.scene.add(this.globe);
    }

    drawContinent(ctx, x, y, w, h) {
        ctx.beginPath();
        ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI * 2);
        ctx.fill();
    }

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
                float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                gl_FragColor = vec4(0.4, 0.65, 0.9, 1.0) * intensity * 0.5;
            }
        `;

        const atmosphereGeo = new THREE.SphereGeometry(this.GLOBE_RADIUS * 1.12, 32, 32);
        const atmosphereMat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true,
        });

        this.scene.add(new THREE.Mesh(atmosphereGeo, atmosphereMat));
    }

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

    createAirports() {
        this.airportGroup = new THREE.Group();

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

            const pos = this.latLonToVec3(lat, lon, 0.03);
            const isHub = airport.type_aeroport === 'Hub';
            const size = isHub ? 0.1 : 0.05;
            const color = continentColors[airport.continent] || 0x002157;

            const geo = new THREE.SphereGeometry(size, 12, 12);
            const mat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.9,
            });

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            this.airportGroup.add(mesh);

            // Halo pour les hubs
            if (isHub) {
                const haloGeo = new THREE.RingGeometry(0.12, 0.2, 32);
                const haloMat = new THREE.MeshBasicMaterial({
                    color: 0xE4002B,
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide,
                });
                const halo = new THREE.Mesh(haloGeo, haloMat);
                halo.position.copy(pos);
                halo.lookAt(0, 0, 0);
                this.airportGroup.add(halo);
            }
        });

        this.scene.add(this.airportGroup);
    }

    createRoutes() {
        this.routeGroup = new THREE.Group();
        this.flightDots = [];

        const airportMap = {};
        this.airports.forEach(a => {
            airportMap[a.code_iata] = a;
        });

        const maxCount = Math.max(...this.routes.map(r => r.count || 1), 1);

        this.routes.forEach((route, idx) => {
            const a1 = airportMap[route.dep];
            const a2 = airportMap[route.arr];
            if (!a1 || !a2) return;

            const lat1 = parseFloat(a1.latitude);
            const lon1 = parseFloat(a1.longitude);
            const lat2 = parseFloat(a2.latitude);
            const lon2 = parseFloat(a2.longitude);
            if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return;

            const intensity = (route.count || 1) / maxCount;
            const points = this.computeArc(lat1, lon1, lat2, lon2, 50, intensity);

            const curve = new THREE.CatmullRomCurve3(points);
            const curvePoints = curve.getPoints(50);

            const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
            const material = new THREE.LineBasicMaterial({
                color: new THREE.Color().setHSL(0.6 - intensity * 0.1, 0.7, 0.45 + intensity * 0.25),
                transparent: true,
                opacity: 0.2 + intensity * 0.5,
            });

            this.routeGroup.add(new THREE.Line(geometry, material));

            // Points volants (seulement pour les routes importantes)
            if (idx < 15) {
                const dotGeo = new THREE.SphereGeometry(0.04, 8, 8);
                const dotMat = new THREE.MeshBasicMaterial({
                    color: 0xE4002B,
                    transparent: true,
                    opacity: 0.9,
                });
                const dot = new THREE.Mesh(dotGeo, dotMat);
                this.scene.add(dot);

                this.flightDots.push({
                    dot,
                    curve,
                    progress: Math.random(),
                    speed: 0.001 + Math.random() * 0.002,
                });
            }
        });

        this.scene.add(this.routeGroup);
    }

    computeArc(lat1, lon1, lat2, lon2, segments, intensity) {
        const points = [];
        const maxAlt = 0.2 + intensity * 0.5;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;

            // Interpolation sphérique simple
            let lat = lat1 + (lat2 - lat1) * t;
            let lon = lon1 + (lon2 - lon1) * t;

            // Gestion du passage par la ligne de date
            const dLon = lon2 - lon1;
            if (Math.abs(dLon) > 180) {
                const adjustedDLon = dLon > 0 ? dLon - 360 : dLon + 360;
                lon = lon1 + adjustedDLon * t;
                if (lon > 180) lon -= 360;
                if (lon < -180) lon += 360;
            }

            // Arc parabolique
            const alt = Math.sin(t * Math.PI) * maxAlt;

            points.push(this.latLonToVec3(lat, lon, alt));
        }

        return points;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.autoRotate) {
            this.targetRotY += 0.002;
        }

        this.currentRotY += (this.targetRotY - this.currentRotY) * 0.05;
        this.currentRotX += (this.targetRotX - this.currentRotX) * 0.05;

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

        // Animer les points volants
        this.flightDots.forEach(fd => {
            fd.progress += fd.speed;
            if (fd.progress > 1) fd.progress = 0;

            const point = fd.curve.getPoint(fd.progress);
            const euler = new THREE.Euler(this.currentRotX, this.currentRotY, 0, 'XYZ');
            point.applyEuler(euler);
            fd.dot.position.copy(point);
        });

        this.renderer.render(this.scene, this.camera);
    }

    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
    }
}
