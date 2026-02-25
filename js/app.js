/**
 * ============================================================================
 * AIR FRANCE ANALYTICS — Main Application Controller
 * Navigation, filtres, animations, orchestration
 * ============================================================================
 */

(function () {
    'use strict';

    // ================================================================
    // STATE
    // ================================================================
    const State = {
        currentPage: 'overview',
        filters: {
            year: 'all',
            courrier: 'all',
        },
        aircraft3D: null,
        initialized: false,
    };

    // ================================================================
    // PAGE TITLES & BREADCRUMBS
    // ================================================================
    const PAGE_META = {
        overview: {
            title: 'Vue d\'ensemble',
            breadcrumb: 'Tableau de bord › Vue d\'ensemble',
            icon: 'fa-th-large',
        },
        network: {
            title: 'Réseau & Routes',
            breadcrumb: 'Tableau de bord › Réseau mondial',
            icon: 'fa-globe-europe',
        },
        fleet: {
            title: 'Flotte & Avion 3D',
            breadcrumb: 'Opérations › Flotte aérienne',
            icon: 'fa-plane-departure',
        },
        operations: {
            title: 'Ponctualité',
            breadcrumb: 'Opérations › Performance opérationnelle',
            icon: 'fa-clock',
        },
        revenue: {
            title: 'Revenus & Yield',
            breadcrumb: 'Business › Analyse financière',
            icon: 'fa-chart-line',
        },
        satisfaction: {
            title: 'Satisfaction Client',
            breadcrumb: 'Business › Expérience passagers',
            icon: 'fa-star',
        },
        environment: {
            title: 'Empreinte Carbone',
            breadcrumb: 'Durabilité › Impact environnemental',
            icon: 'fa-leaf',
        },
    };

    // ================================================================
    // INITIALIZATION
    // ================================================================
    async function init() {
        console.log('✈️ Air France Analytics — Initializing...');

        // Show loader
        updateLoader(0, 'Initialisation...');

        // Load data
        await DataStore.loadAll((progress, status) => {
            updateLoader(progress, status);
        });

        // Small delay for smooth transition
        await sleep(400);

        // Hide loader
        document.getElementById('loader').classList.add('hidden');

        // Setup UI
        setupNavigation();
        setupFilters();
        setupThemeToggle();
        setupSidebarToggle();
        setupAircraftSelector();

        // Render initial page
        renderPage('overview');

        // Animate KPI counters
        animateCounters();

        State.initialized = true;
        console.log('✅ Air France Analytics — Ready!');
    }

    // ================================================================
    // LOADER
    // ================================================================
    function updateLoader(progress, status) {
        const bar = document.getElementById('loaderBar');
        const text = document.getElementById('loaderStatus');
        if (bar) bar.style.width = `${Math.min(progress, 100)}%`;
        if (text) text.textContent = status;
    }

    // ================================================================
    // NAVIGATION
    // ================================================================
    function setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                if (page && page !== State.currentPage) {
                    navigateTo(page);
                }

                // Close sidebar on mobile
                if (window.innerWidth <= 768) {
                    document.getElementById('sidebar').classList.remove('open');
                }
            });
        });
    }

    function navigateTo(page) {
        // Update active nav
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

        // Update pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) {
            pageEl.classList.add('active');
            // Re-trigger animation
            pageEl.style.animation = 'none';
            pageEl.offsetHeight; // trigger reflow
            pageEl.style.animation = '';
        }

        // Update topbar
        const meta = PAGE_META[page];
        if (meta) {
            document.getElementById('pageTitle').textContent = meta.title;
            document.getElementById('pageBreadcrumb').textContent = meta.breadcrumb;
        }

        State.currentPage = page;

        // Render page content
        renderPage(page);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ================================================================
    // FILTERS
    // ================================================================
    function setupFilters() {
        const yearSelect = document.getElementById('filterYear');
        const courrierSelect = document.getElementById('filterCourrier');

        yearSelect.addEventListener('change', () => {
            State.filters.year = yearSelect.value;
            renderPage(State.currentPage);
        });

        courrierSelect.addEventListener('change', () => {
            State.filters.courrier = courrierSelect.value;
            renderPage(State.currentPage);
        });
    }

    // ================================================================
    // THEME TOGGLE
    // ================================================================
    function setupThemeToggle() {
        const toggle = document.getElementById('themeToggle');
        const html = document.documentElement;

        // Check saved preference
        const savedTheme = localStorage.getItem('af-theme') || 'dark';
        html.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);

        toggle.addEventListener('click', () => {
            const current = html.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', next);
            localStorage.setItem('af-theme', next);
            updateThemeIcon(next);

            // Re-render current page to update chart themes
            setTimeout(() => renderPage(State.currentPage), 100);
        });
    }

    function updateThemeIcon(theme) {
        const toggle = document.getElementById('themeToggle');
        if (theme === 'dark') {
            toggle.innerHTML = '<i class="fas fa-moon"></i><span>Mode sombre</span>';
        } else {
            toggle.innerHTML = '<i class="fas fa-sun"></i><span>Mode clair</span>';
        }
    }

    // ================================================================
    // SIDEBAR TOGGLE (Mobile)
    // ================================================================
    function setupSidebarToggle() {
        const btn = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');

        btn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close on outside click
        document.getElementById('mainContent').addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    }

    // ================================================================
    // AIRCRAFT SELECTOR
    // ================================================================
    function setupAircraftSelector() {
        const select = document.getElementById('aircraftSelect');
        if (!select) return;

        const AIRCRAFT_SPECS = {
            a350: { range: '15 000 km', seats: '324', engine: 'Trent XWB', count: '18', name: 'Airbus A350-900' },
            b777: { range: '13 650 km', seats: '468', engine: 'GE90-115B', count: '15', name: 'Boeing 777-300ER' },
            a320: { range: '6 150 km', seats: '178', engine: 'CFM56-5B', count: '20', name: 'Airbus A320' },
            b787: { range: '14 140 km', seats: '276', engine: 'GEnx-1B', count: '10', name: 'Boeing 787-9' },
            a330: { range: '13 450 km', seats: '224', engine: 'CF6-80E1', count: '10', name: 'Airbus A330-200' },
        };

        select.addEventListener('change', () => {
            const type = select.value;
            const spec = AIRCRAFT_SPECS[type];

            if (spec) {
                document.getElementById('spec-range').textContent = spec.range;
                document.getElementById('spec-seats').textContent = spec.seats;
                document.getElementById('spec-engine').textContent = spec.engine;
                document.getElementById('spec-count').textContent = spec.count;
            }

            // Update 3D model
            if (State.aircraft3D) {
                State.aircraft3D.switchAircraft(type);
            }
        });
    }

    // ================================================================
    // PAGE RENDERING
    // ================================================================
    function renderPage(page) {
        if (!DataStore.loaded) return;

        const flights = DataStore.getFilteredFlights(State.filters.year, State.filters.courrier);
        const satisfaction = DataStore.getFilteredSatisfaction(State.filters.year, State.filters.courrier);
        const airports = DataStore.airports;
        const fleet = DataStore.fleet;

        switch (page) {
            case 'overview':
                renderOverview(flights);
                break;
            case 'network':
                renderNetwork(flights, airports);
                break;
            case 'fleet':
                renderFleet(flights, fleet);
                break;
            case 'operations':
                renderOperations(flights);
                break;
            case 'revenue':
                renderRevenue(flights);
                break;
            case 'satisfaction':
                renderSatisfaction(satisfaction);
                break;
            case 'environment':
                renderEnvironment(flights);
                break;
        }
    }

    function renderOverview(flights) {
        Charts.renderOverviewKPIs(flights);
        Charts.renderMonthlyTrend(flights);
        Charts.renderCourrierDonut(flights);
        Charts.renderTopDestinations(flights);
        Charts.renderContinentPerf(flights);
        Charts.renderHeatmapFlights(flights);
        Charts.renderLoadFactorTrend(flights);
    }

    function renderNetwork(flights, airports) {
        Charts.renderNetworkKPIs(flights, airports);
        Charts.renderWorldMap(flights, airports);
        Charts.renderTrafficContinent(flights);
        Charts.renderDistanceDistribution(flights);
    }

    function renderFleet(flights, fleet) {
        Charts.renderFleetKPIs(fleet);
        Charts.renderFleetComposition(fleet);
        Charts.renderFleetAge(fleet);
        Charts.renderFleetUtilization(flights);
        Charts.renderFleetFamily(fleet);

        // Initialize 3D viewer only once
        if (!State.aircraft3D) {
            setTimeout(() => {
                State.aircraft3D = new Aircraft3DViewer('aircraft3d');
            }, 300);
        }
    }

    function renderOperations(flights) {
        Charts.renderOpsKPIs(flights);
        Charts.renderOTPMonthly(flights);
        Charts.renderDelayCauses(flights);
        Charts.renderDelayDistribution(flights);
        Charts.renderOTPByAircraft(flights);
        Charts.renderDelayHeatmap(flights);
    }

    function renderRevenue(flights) {
        Charts.renderRevenueKPIs(flights);
        Charts.renderRevenueMonthly(flights);
        Charts.renderRevenueCourrier(flights);
        Charts.renderYieldContinent(flights);
        Charts.renderRevenueScatter(flights);
        Charts.renderTopRoutesRevenue(flights);
    }

    function renderSatisfaction(satisfaction) {
        Charts.renderSatisfactionKPIs(satisfaction);
        Charts.renderSatisfactionRadar(satisfaction);
        Charts.renderNPSDistribution(satisfaction);
        Charts.renderSatisfactionByClass(satisfaction);
        Charts.renderSatisfactionByFidelity(satisfaction);
        Charts.renderSatisfactionTrend(satisfaction);
        Charts.renderSatisfactionByTraveler(satisfaction);
    }

    function renderEnvironment(flights) {
        Charts.renderEnvironmentKPIs(flights);
        Charts.renderCO2Monthly(flights);
        Charts.renderCO2ByAircraft(flights);
        Charts.renderFuelCourrier(flights);
        Charts.renderCO2Scatter(flights);
    }

    // ================================================================
    // ANIMATIONS
    // ================================================================
    function animateCounters() {
        document.querySelectorAll('.kpi-value[data-counter]').forEach(el => {
            const target = parseInt(el.getAttribute('data-counter'));
            if (isNaN(target) || target === 0) return;
            animateValue(el, 0, target, 1500);
        });
    }

    function animateValue(el, start, end, duration) {
        const startTime = performance.now();
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutExpo(progress);
            const current = Math.round(start + (end - start) * eased);
            el.textContent = formatNumberAnim(current);
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        requestAnimationFrame(update);
    }

    function easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function formatNumberAnim(n) {
        if (n >= 1e6) return (n / 1e6).toFixed(1) + ' M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + ' k';
        return n.toLocaleString('fr-FR');
    }

    // ================================================================
    // UTILITIES
    // ================================================================
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ================================================================
    // RESIZE HANDLING
    // ================================================================
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Resize all Plotly charts
            document.querySelectorAll('.chart-body').forEach(el => {
                if (el.data) {
                    Plotly.Plots.resize(el);
                }
            });
        }, 250);
    });

    // ================================================================
    // KEYBOARD SHORTCUTS
    // ================================================================
    document.addEventListener('keydown', (e) => {
        // 1-7 to switch pages
        const pages = ['overview', 'network', 'fleet', 'operations', 'revenue', 'satisfaction', 'environment'];
        const num = parseInt(e.key);
        if (num >= 1 && num <= 7 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;
            navigateTo(pages[num - 1]);
        }

        // T for theme toggle
        if (e.key === 't' || e.key === 'T') {
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;
            document.getElementById('themeToggle').click();
        }
    });

    // ================================================================
    // INTERSECTION OBSERVER for lazy chart rendering
    // ================================================================
    function setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.chart-card, .kpi-card').forEach(card => {
            observer.observe(card);
        });
    }

    // ================================================================
    // TOOLTIP for KPI Cards
    // ================================================================
    function setupTooltips() {
        document.querySelectorAll('.kpi-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-4px)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        });
    }

    // ================================================================
    // GSAP Scroll Animations
    // ================================================================
    function setupScrollAnimations() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

        gsap.registerPlugin(ScrollTrigger);

        // Animate cards on scroll
        gsap.utils.toArray('.chart-card').forEach((card, i) => {
            gsap.from(card, {
                scrollTrigger: {
                    trigger: card,
                    start: 'top 90%',
                    toggleActions: 'play none none none',
                },
                y: 30,
                opacity: 0,
                duration: 0.6,
                delay: (i % 3) * 0.1,
                ease: 'power2.out',
            });
        });

        gsap.utils.toArray('.kpi-card').forEach((card, i) => {
            gsap.from(card, {
                scrollTrigger: {
                    trigger: card,
                    start: 'top 95%',
                    toggleActions: 'play none none none',
                },
                y: 20,
                opacity: 0,
                duration: 0.5,
                delay: i * 0.08,
                ease: 'power2.out',
            });
        });
    }

    // ================================================================
    // PARTICLE BACKGROUND (subtle)
    // ================================================================
    function createParticleBackground() {
        const canvas = document.createElement('canvas');
        canvas.id = 'particleBg';
        canvas.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: -1; opacity: 0.3;
        `;
        document.body.prepend(canvas);

        const ctx = canvas.getContext('2d');
        let particles = [];
        const count = 30;

        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.3 + 0.1,
            });
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            const color = isDark ? '107, 170, 219' : '0, 33, 87';

            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${color}, ${p.opacity})`;
                ctx.fill();
            });

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(${color}, ${0.05 * (1 - dist / 150)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(animate);
        }
        animate();
    }

    // ================================================================
    // BOOT
    // ================================================================
    document.addEventListener('DOMContentLoaded', () => {
        createParticleBackground();
        init().then(() => {
            setupTooltips();
            setupScrollAnimations();
            setupIntersectionObserver();
        });
    });

})();